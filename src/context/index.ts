/**
 * Index de contextos
 * Exporta todos los contextos disponibles
 */

export { ThemeContext, useTheme } from './theme-context';
export type { ThemeType, ThemeContextType } from './theme-context';
export { ThemeProvider } from './ThemeProvider';

export { AuthContext, useAuth } from './auth-context';
export type { AuthContextType, AuthProviderKind, SessionStatus } from './auth-context';
export { AuthProvider } from './AuthProvider';
