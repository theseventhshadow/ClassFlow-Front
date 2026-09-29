import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@context';
import { isEntraAuthEnabled } from '@config/msal';
import { ROUTES, getDashboardRouteByRole } from '@constants';
import './LoginPage.css';

type LoginMethod = 'password' | 'microsoft';

/** Logo oficial de Microsoft (cuatro cuadrados). */
const MicrosoftLogo: React.FC = () => (
  <svg className="login-microsoft-logo" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

/**
 * Login híbrido: correo y contraseña como opción principal y, si Microsoft Entra
 * está configurado, "Continuar con Microsoft" como segunda opción.
 */
export const LoginPage: React.FC = () => {
  const { login, loginWithMicrosoft, isLoading, error, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeMethod, setActiveMethod] = useState<LoginMethod | null>(null);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setActiveMethod('password');
    try {
      await login(email, password);
    } catch {
      // el error ya queda en el contexto
    }
  };

  const handleMicrosoftLogin = async (): Promise<void> => {
    setActiveMethod('microsoft');
    try {
      await loginWithMicrosoft();
    } catch {
      // el error ya queda en el contexto
    }
  };

  // Tras cualquier login, lleva a la persona al dashboard de su rol en ClassFlow
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardRouteByRole(user.rol), { replace: true });
    }
  }, [navigate, isAuthenticated, user]);

  const isPasswordLoading = isLoading && activeMethod === 'password';
  const isMicrosoftLoading = isLoading && activeMethod === 'microsoft';

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <p className="login-platform-label">PLATAFORMA ESCOLAR</p>
          <h1 className="login-brand-name">ClassFlow</h1>
          <p className="login-brand-desc">
            Gestión educativa moderna para estudiantes,<br />
            apoderados, docentes y administradores.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-box">
          <h2 className="login-welcome">Bienvenido</h2>
          <p className="login-welcome-sub">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="email">Usuario</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">👤</span>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="usuario@classflow.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isPasswordLoading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          {isEntraAuthEnabled && (
            <>
              <div className="login-or">o</div>
              <button
                type="button"
                className="login-microsoft-btn"
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
              >
                <MicrosoftLogo />
                {isMicrosoftLoading ? 'Conectando con Microsoft...' : 'Continuar con Microsoft'}
              </button>
            </>
          )}

          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="login-recover">
            <span className="login-recover-divider">¿Problemas para ingresar?</span>
            <Link to={ROUTES.FORGOT_PASSWORD} className="login-recover-link">Recuperar contraseña</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
