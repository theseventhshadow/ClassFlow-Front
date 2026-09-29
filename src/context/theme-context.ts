import { createContext, useContext } from 'react';

/**
 * Tipo de tema
 */
export type ThemeType = 'light' | 'dark';

/**
 * Interfaz del contexto de tema
 */
export interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

/**
 * Contexto de tema
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook personalizado para usar el contexto de tema
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');
  }
  return context;
};
