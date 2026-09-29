import React, { ReactNode, useState, useCallback, useEffect } from 'react';

import { ThemeContext, ThemeType } from './theme-context';

/**
 * Proveedor de tema
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(
    () => (localStorage.getItem('theme') as ThemeType) || 'light'
  );

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // El HTML fija data-theme="light" de forma estatica; sincroniza el atributo real
  // con el tema persistido apenas monta, para que un tema oscuro guardado se aplique
  // de entrada en vez de quedar desfasado hasta el proximo toggle.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
