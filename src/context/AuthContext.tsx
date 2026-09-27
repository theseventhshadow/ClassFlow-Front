import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

import { User, userService, authService } from '@services';
import { entraLoginRequest, isEntraAuthEnabled } from '@config/msal';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<User>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;

  updateProfile: (
    data: Partial<Omit<User, 'id' | 'rol' | 'createdAt'>>
  ) => Promise<void>;

  validate: () => Promise<boolean>;

  getAccessToken: () => Promise<string | null>;
}

export const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { instance, accounts } = useMsal();

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user_data');
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convierte inicialmente la cuenta de Microsoft Entra
   * al modelo User utilizado por ClassFlow.
   *
   * El rol definitivo se conectará después con los grupos
   * Teachers / Students de Entra.
   */
  const createUserFromAccount = useCallback((account: any): User => {
    return {
      id: account.localAccountId || account.homeAccountId,
      nombre: account.name || account.username || 'Usuario',
      email: account.username || '',
      rol: 'STUDENT',
      activo: true,
      createdAt: new Date().toISOString(),
      subject: account.idTokenClaims?.sub,
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      localStorage.setItem('auth_provider', 'password');
      localStorage.setItem('user_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      return response.user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithMicrosoft = useCallback(async (): Promise<void> => {
    if (!isEntraAuthEnabled) {
      setError('Microsoft Entra no está configurado.');
      throw new Error('Microsoft Entra no está configurado.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await instance.loginPopup(entraLoginRequest);
      instance.setActiveAccount(response.account);

      const entraUser = createUserFromAccount(response.account);
      setUser(entraUser);
      localStorage.setItem('auth_provider', 'microsoft');
      localStorage.setItem('user_data', JSON.stringify(entraUser));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Microsoft';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [instance, createUserFromAccount]);

  /**
   * Obtiene un Access Token para ClassFlow-Backend.
   */
  const getAccessToken =
    useCallback(async (): Promise<string | null> => {
      const account =
        instance.getActiveAccount() || accounts[0];

      if (!account) {
        return null;
      }

      try {
        const response = await instance.acquireTokenSilent({
          ...entraLoginRequest,
          account,
        });

        return response.accessToken;
      } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
          const response = await instance.acquireTokenPopup({
            ...entraLoginRequest,
            account,
          });

          return response.accessToken;
        }

        throw err;
      }
    }, [instance, accounts]);

  /**
   * Cierra la sesión de ClassFlow y Microsoft Entra.
   */
  const logout = useCallback(async (): Promise<void> => {
    setUser(null);
    setError(null);

    localStorage.removeItem('user_data');
    localStorage.removeItem('user_token');
    localStorage.removeItem('auth_provider');

    const account =
      instance.getActiveAccount() || accounts[0];

    if (account) {
      await instance.logoutPopup({
        account,
        postLogoutRedirectUri: 'http://localhost:3001/',
      });
    }
  }, [instance, accounts]);

  /**
   * Comprueba si existe una sesión válida de Microsoft.
   */
  const validate = useCallback(async (): Promise<boolean> => {
    const account =
      instance.getActiveAccount() || accounts[0];
    const authProvider = localStorage.getItem('auth_provider');

    if (authProvider === 'password' || (!account && authProvider !== 'microsoft')) {
      const token = localStorage.getItem('user_token');
      if (!token) {
        setUser(null);
        return false;
      }

      try {
        const validatedUser = await authService.validateToken(token);
        setUser(validatedUser);
        localStorage.setItem('user_data', JSON.stringify(validatedUser));
        return true;
      } catch {
        setUser(null);
        return false;
      }
    }

    if (!isEntraAuthEnabled || !account) {
      setUser(null);
      return false;
    }

    try {
      const token = await getAccessToken();

      if (!token) {
        setUser(null);
        return false;
      }

      const entraUser = createUserFromAccount(account);

      setUser(entraUser);

      localStorage.setItem(
        'user_data',
        JSON.stringify(entraUser),
      );

      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, [
    instance,
    accounts,
    getAccessToken,
    createUserFromAccount,
  ]);

  const updateProfile = useCallback(
    async (
      data: Partial<Omit<User, 'id' | 'rol' | 'createdAt'>>
    ): Promise<void> => {
      if (!user) return;

      setIsLoading(true);

      try {
        const response =
          await userService.updateProfile(user.id, data);

        setUser(response.data);

        localStorage.setItem(
          'user_data',
          JSON.stringify(response.data),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  /**
   * Recupera automáticamente la sesión después de recargar.
   */
  useEffect(() => {
    const account =
      instance.getActiveAccount() || accounts[0];

    if (isEntraAuthEnabled && account && !user && localStorage.getItem('auth_provider') !== 'password') {
      instance.setActiveAccount(account);

      const entraUser = createUserFromAccount(account);

      setUser(entraUser);

      localStorage.setItem(
        'user_data',
        JSON.stringify(entraUser),
      );
      localStorage.setItem('auth_provider', 'microsoft');
    }
  }, [
    instance,
    accounts,
    user,
    createUserFromAccount,
  ]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        loginWithMicrosoft,
        logout,
        updateProfile,
        validate,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth debe ser usado dentro de AuthProvider',
    );
  }

  return context;
};