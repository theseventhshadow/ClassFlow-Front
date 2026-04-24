import React from 'react';
import { useTheme } from '@context';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Componente Layout principal
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme } = useTheme();

  return (
    <div className={`layout layout-${theme}`}>
      <Header />
      <main className="main-content">{children}</main>
      <Footer />
    </div>
  );
};

/**
 * Componente Header
 */
const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">ClassFlow</div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
};

/**
 * Componente Footer
 */
const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <p>&copy; 2026 ClassFlow. Todos los derechos reservados.</p>
    </footer>
  );
};

export default Layout;
