import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { User, apiService, authService, userService } from '@services';
import {
  acquireApiAccessToken,
  entraLoginRequest,
  getActiveMsalAccount,
  isEntraAuthEnabled,
  msalInstance,
  POPUP_BLOCKED_ERROR_CODES,
  redirectUri,
} from '@config/msal';
import { LOCAL_STORAGE_KEYS } from '@constants';
import { getErrorMessage } from '@utils';

import {
  AuthContext,
  AuthContextType,
  AuthProviderKind,
  SessionStatus,
} from './auth-context';

const getAuthProvider = (): AuthProviderKind | null =>
  localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_PROVIDER) as AuthProviderKind | null;

const clearStoredSession = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_DATA);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_TOKEN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_PROVIDER);
};

const PASSWORD_LOGIN_DISABLED_MESSAGE =
  'El ingreso con correo y contraseña no está habilitado en el servidor. Usa "Continuar con Microsoft".';

const getLoginErrorMessage = (err: unknown): string => {
  const apiError = err as { status?: number; details?: unknown } | undefined;
  const status = apiError?.status;
  const backendMessage = (apiError?.details as { message?: string } | undefined)?.message;

  // El backend local responde 400 "Bad credentials" (o 401) ante credenciales inválidas.
  if (backendMessage === 'Bad credentials' || (status === 401 && backendMessage)) {
    return 'Correo o contraseña incorrectos.';
  }
  // Un backend con solo el perfil `entra` bloquea el endpoint: 401/403 sin cuerpo.
  if (status === 403 || (status === 401 && isEntraAuthEnabled)) {
    return PASSWORD_LOGIN_DISABLED_MESSAGE;
  }
  if (status === 401) {
    return 'Correo o contraseña incorrectos.';
  }
  return getErrorMessage(err, 'Error al iniciar sesión');
};

const getMicrosoftLoginErrorMessage = (err: unknown): string => {
  const errorCode = (err as { errorCode?: string } | undefined)?.errorCode;

  if (errorCode && POPUP_BLOCKED_ERROR_CODES.includes(errorCode)) {
    return 'El navegador bloqueó la ventana de Microsoft. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.';
  }
  if (errorCode === 'user_cancelled') {
    return 'Se cerró la ventana de Microsoft antes de completar el inicio de sesión.';
  }
  if (errorCode === 'interaction_in_progress') {
    return 'Ya hay un inicio de sesión con Microsoft en curso. Cierra la otra ventana e inténtalo de nuevo.';
  }
  return getErrorMessage(err, 'Error al iniciar sesión con Microsoft');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bootstrapped = useRef(false);

  const startSession = useCallback((provider: AuthProviderKind, profile: User): void => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_PROVIDER, provider);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
    setUser(profile);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback((): void => {
    clearStoredSession();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  /**
   * Obtiene el perfil interno de ClassFlow (incluido el rol) para la cuenta de
   * Microsoft activa. El interceptor de Axios envía el access token de Entra.
   */
  const loadMicrosoftUser = useCallback(async (): Promise<User> => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_PROVIDER, 'microsoft');
    const profile = await authService.getCurrentUser();
    startSession('microsoft', profile);
    return profile;
  }, [startSession]);

  /**
   * Determina si existe una sesión válida (contraseña o Microsoft) y sincroniza el estado.
   */
  const validate = useCallback(async (): Promise<boolean> => {
    try {
      if (getAuthProvider() === 'password') {
        const token = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_TOKEN);
        if (token) {
          startSession('password', await authService.validateToken(token));
          return true;
        }
      } else if (getAuthProvider() === 'microsoft' && getActiveMsalAccount()) {
        // Solo se restaura Microsoft si esa fue la última forma de ingreso: con login
        // híbrido, una cuenta de Microsoft en caché no debe iniciar sesión por su cuenta.
        await loadMicrosoftUser();
        return true;
      }
    } catch {
      // Sesión inválida o expirada: se limpia abajo.
    }

    endSession();
    return false;
  }, [startSession, endSession, loadMicrosoftUser]);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER_TOKEN, response.token);
      startSession('password', response.user);
      return response.user;
    } catch (err) {
      setError(getLoginErrorMessage(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [startSession]);

  const loginWithMicrosoft = useCallback(async (): Promise<User> => {
    if (!isEntraAuthEnabled) {
      const message = 'Microsoft Entra no está configurado.';
      setError(message);
      throw new Error(message);
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await msalInstance.loginPopup(entraLoginRequest);
      msalInstance.setActiveAccount(result.account);
    } catch (err) {
      setError(getMicrosoftLoginErrorMessage(err));
      setIsLoading(false);
      throw err;
    }

    try {
      return await loadMicrosoftUser();
    } catch (err) {
      endSession();
      // El backend explica el motivo (cuenta no habilitada, desactivada, etc.) cuando lo informa.
      const backendMessage = ((err as { details?: { message?: string } } | undefined)?.details)?.message;
      setError(backendMessage || 'Tu cuenta de Microsoft no está habilitada en ClassFlow. Contacta al administrador.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadMicrosoftUser, endSession]);

  /**
   * Cierra la sesión de ClassFlow y, si corresponde, la de Microsoft Entra.
   */
  const logout = useCallback(async (): Promise<void> => {
    const provider = getAuthProvider();
    const account = getActiveMsalAccount();

    setError(null);
    endSession();

    if (provider === 'microsoft' && account) {
      try {
        await msalInstance.logoutPopup({ account, postLogoutRedirectUri: redirectUri });
      } catch (err) {
        // La sesión local ya se cerró; un popup bloqueado no debe romper el flujo.
        console.warn('No se pudo cerrar la sesión de Microsoft:', err);
      }
    }
  }, [endSession]);

  const updateProfile = useCallback(
    async (data: Partial<Omit<User, 'id' | 'rol' | 'createdAt'>>): Promise<void> => {
      if (!user) return;

      setIsLoading(true);

      try {
        const response = await userService.updateProfile(user.id, data);
        setUser(response.data);
        localStorage.setItem(LOCAL_STORAGE_KEYS.USER_DATA, JSON.stringify(response.data));
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  // Un 401 en cualquier endpoint protegido invalida la sesión local.
  useEffect(() => {
    apiService.setUnauthorizedHandler(endSession);
    return () => apiService.setUnauthorizedHandler(null);
  }, [endSession]);

  // Valida la sesión una sola vez al arrancar (también bajo StrictMode).
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void validate();
  }, [validate]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading,
    error,
    login,
    loginWithMicrosoft,
    logout,
    updateProfile,
    validate,
    getAccessToken: acquireApiAccessToken,
  }), [user, status, isLoading, error, login, loginWithMicrosoft, logout, updateProfile, validate]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
