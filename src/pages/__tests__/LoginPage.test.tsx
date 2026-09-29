import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextType } from '@context';
import type { User } from '@services';
import { LoginPage } from '../LoginPage';

const state = vi.hoisted(() => ({
  entraEnabled: false,
  auth: {} as Partial<AuthContextType>,
}));

vi.mock('@context', () => ({ useAuth: () => state.auth }));
vi.mock('@config/msal', () => ({
  get isEntraAuthEnabled() {
    return state.entraEnabled;
  },
}));

const makeUser = (rol: User['rol']): User => ({
  id: '1',
  nombre: 'Ana',
  email: 'ana@classflow.cl',
  rol,
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const renderLogin = (): void => {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard/:role" element={<p>dashboard</p>} />
        <Route path="/forgot-password" element={<p>recuperar</p>} />
      </Routes>
    </MemoryRouter>,
  );
};

const typeCredentials = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText('Usuario'), 'ana@classflow.cl');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta');
};

describe('LoginPage', () => {
  beforeEach(() => {
    state.entraEnabled = true;
    state.auth = {
      login: vi.fn().mockResolvedValue(makeUser('STUDENT')),
      loginWithMicrosoft: vi.fn().mockResolvedValue(makeUser('TEACHER')),
      isLoading: false,
      error: null,
      user: null,
      isAuthenticated: false,
    };
  });

  describe('correo y contraseña (opción principal)', () => {
    it('envía las credenciales ingresadas', async () => {
      renderLogin();

      await typeCredentials();
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

      expect(state.auth.login).toHaveBeenCalledWith('ana@classflow.cl', 'secreta');
      expect(state.auth.loginWithMicrosoft).not.toHaveBeenCalled();
    });

    it('está disponible también cuando Microsoft está configurado', () => {
      renderLogin();

      expect(screen.getByLabelText('Usuario')).toBeInTheDocument();
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });

    it('ofrece recuperar la contraseña', async () => {
      renderLogin();

      await userEvent.click(screen.getByRole('link', { name: 'Recuperar contraseña' }));

      expect(screen.getByText('recuperar')).toBeInTheDocument();
    });

    it('muestra el error de autenticación', () => {
      state.auth.error = 'Correo o contraseña incorrectos.';
      renderLogin();

      expect(screen.getByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    });
  });

  describe('Microsoft (segunda opción)', () => {
    it('aparece después del formulario de contraseña', () => {
      renderLogin();

      const passwordButton = screen.getByRole('button', { name: 'Iniciar sesión' });
      const microsoftButton = screen.getByRole('button', { name: 'Continuar con Microsoft' });

      expect(passwordButton.compareDocumentPosition(microsoftButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('inicia el login con Microsoft sin enviar el formulario', async () => {
      renderLogin();

      await userEvent.click(screen.getByRole('button', { name: 'Continuar con Microsoft' }));

      expect(state.auth.loginWithMicrosoft).toHaveBeenCalledTimes(1);
      expect(state.auth.login).not.toHaveBeenCalled();
    });

    it('no aparece si Microsoft Entra no está configurado', () => {
      state.entraEnabled = false;
      renderLogin();

      expect(screen.queryByRole('button', { name: 'Continuar con Microsoft' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });
  });

  describe('estado de carga', () => {
    it('indica en qué botón se está ingresando', async () => {
      const auth = state.auth;
      auth.login = vi.fn(() => new Promise<User>(() => undefined));
      const { rerender } = render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      await typeCredentials();
      await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
      auth.isLoading = true;
      rerender(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      expect(screen.getByRole('button', { name: 'Ingresando...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Continuar con Microsoft' })).toBeDisabled();
    });

    it('indica cuando se está conectando con Microsoft', async () => {
      const auth = state.auth;
      auth.loginWithMicrosoft = vi.fn(() => new Promise<User>(() => undefined));
      const { rerender } = render(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Continuar con Microsoft' }));
      auth.isLoading = true;
      rerender(
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>,
      );

      expect(screen.getByRole('button', { name: 'Conectando con Microsoft...' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
    });
  });

  describe('redirección a la cuenta de la persona', () => {
    it.each([
      ['TEACHER', 'teacher'],
      ['ADMINISTRATOR', 'admin'],
      ['STUDENT', 'student'],
      ['GUARDIAN', 'guardian'],
    ] as const)('lleva a un %s a su dashboard', (rol, path) => {
      state.auth = { ...state.auth, user: makeUser(rol), isAuthenticated: true };
      render(
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path={`/dashboard/${path}`} element={<p>dashboard-{path}</p>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText(`dashboard-${path}`)).toBeInTheDocument();
    });

    it('no redirige con un usuario no validado', () => {
      state.auth = { ...state.auth, user: makeUser('TEACHER'), isAuthenticated: false };
      renderLogin();

      expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
    });
  });
});
