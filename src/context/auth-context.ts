import { createContext, useContext } from 'react';

import type { User } from '@services';

/**
 * Estado de la sesión:
 * - checking: validando al arrancar la app (aún no se sabe si hay sesión).
 * - authenticated: sesión confirmada por el backend.
 * - unauthenticated: sin sesión o sesión inválida.
 */
export type SessionStatus = 'checking' | 'authenticated' | 'unauthenticated';

export type AuthProviderKind = 'password' | 'microsoft';

export interface AuthContextType {
  user: User | null;
  status: SessionStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<User>;
  loginWithMicrosoft: () => Promise<User>;
  logout: () => Promise<void>;

  updateProfile: (
    data: Partial<Omit<User, 'id' | 'rol' | 'createdAt'>>
  ) => Promise<void>;

  /** Revalida la sesión actual contra el backend. */
  validate: () => Promise<boolean>;

  getAccessToken: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }

  return context;
};
