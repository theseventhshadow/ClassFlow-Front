import React, { createContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { User, userService, authService } from '@services';
import { entraLoginRequest, isEntraAuthEnabled } from '@config/msal';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<Omit<User, 'id' | 'rol' | 'createdAt'>>) => Promise<void>;
  validate: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user_data');
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem('auth_provider');
    setUser(null);
    setError(null);
    if (isEntraAuthEnabled) {
      void instance.logoutPopup({ account: instance.getActiveAccount() ?? accounts[0] });
    }
  }, [accounts, instance]);

  const loginWithMicrosoft = useCallback(async (): Promise<void> => {
    if (!isEntraAuthEnabled) {
      throw new Error('Microsoft Entra no esta configurado.');
    }

    setIsLoading(true);
    setError(null);
    try {
      authService.logout();
      setUser(null);
      localStorage.setItem('auth_provider', 'microsoft');
      await instance.loginRedirect(entraLoginRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Microsoft');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [instance]);

  useEffect(() => {
    if (!isEntraAuthEnabled || user || inProgress !== InteractionStatus.None) return;

    const account = instance.getActiveAccount() ?? accounts[0];
    if (!account) return;

    let cancelled = false;

    const restoreSession = async () => {
      setIsLoading(true);

      try {
        instance.setActiveAccount(account);
        const tokenResult = await instance.acquireTokenSilent({ ...entraLoginRequest, account });
        const currentUser = await authService.getCurrentUser();

        if (cancelled) return;

        localStorage.setItem('auth_provider', 'microsoft');
        localStorage.setItem('user_token', tokenResult.accessToken);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        setUser(currentUser);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al recuperar la sesión de Microsoft');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [accounts, inProgress, instance, user]);

  const updateProfile = useCallback(
    async (data: Partial<Omit<User, 'id' | 'rol' | 'createdAt'>>) => {
      if (!user) return;
      setIsLoading(true);
      try {
        const response = await userService.updateProfile(user.id, data);
        setUser(response.data);
        localStorage.setItem('user_data', JSON.stringify(response.data));
      } finally {
        setIsLoading(false);
      }
    },
    [user],
  );

  const validate = useCallback(async (): Promise<boolean> => {
    const account = instance.getActiveAccount() ?? accounts[0];
    const authProvider = localStorage.getItem('auth_provider');

    if (isEntraAuthEnabled && account && authProvider !== 'password') {
      try {
        instance.setActiveAccount(account);
        const tokenResult = await instance.acquireTokenSilent({ ...entraLoginRequest, account });
        localStorage.setItem('user_token', tokenResult.accessToken);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
        return true;
      } catch {
        logout();
        return false;
      }
    }

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
    } catch (err) {
      // Token is invalid or expired
      logout();
      return false;
    }
  }, [accounts, instance, logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, error, login, loginWithMicrosoft, logout, updateProfile, validate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
