import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { User } from '@services';
import { AuthProvider } from '../AuthProvider';
import { useAuth } from '../auth-context';

const msal = vi.hoisted(() => ({
  entraEnabled: true,
  account: null as { username: string } | null,
  instance: {
    loginPopup: vi.fn(),
    setActiveAccount: vi.fn(),
    logoutPopup: vi.fn(),
  },
}));

vi.mock('@config/msal', () => ({
  get isEntraAuthEnabled() {
    return msal.entraEnabled;
  },
  getActiveMsalAccount: () => msal.account,
  acquireApiAccessToken: vi.fn(async () => 'entra-access-token'),
  entraLoginRequest: { scopes: ['openid'] },
  redirectUri: 'https://classflow.test',
  msalInstance: msal.instance,
  POPUP_BLOCKED_ERROR_CODES: ['popup_window_error', 'empty_window_error'],
}));

const services = vi.hoisted(() => ({
  authService: {
    login: vi.fn(),
    validateToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  userService: { updateProfile: vi.fn() },
  apiService: { setUnauthorizedHandler: vi.fn() },
}));

vi.mock('@services', () => services);

const { authService, apiService } = services;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  nombre: 'Ana Pérez',
  email: 'ana@classflow.cl',
  rol: 'TEACHER',
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <AuthProvider>{children}</AuthProvider>
);

const renderAuth = async (): Promise<ReturnType<typeof renderHook<ReturnType<typeof useAuth>, unknown>>> => {
  const hook = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(hook.result.current.status).not.toBe('checking'));
  return hook;
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    msal.entraEnabled = true;
    msal.account = null;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validación inicial de la sesión', () => {
    it('queda sin sesión cuando no hay credenciales guardadas', async () => {
      const { result } = await renderAuth();

      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.user).toBeNull();
      expect(authService.validateToken).not.toHaveBeenCalled();
      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('restaura una sesión con contraseña validando el token en el backend', async () => {
      const user = makeUser({ rol: 'STUDENT' });
      localStorage.setItem('auth_provider', 'password');
      localStorage.setItem('user_token', 'backend-token');
      authService.validateToken.mockResolvedValue(user);

      const { result } = await renderAuth();

      expect(authService.validateToken).toHaveBeenCalledWith('backend-token');
      expect(result.current.status).toBe('authenticated');
      expect(result.current.user).toEqual(user);
    });

    it('limpia la sesión guardada si el token ya no es válido', async () => {
      localStorage.setItem('auth_provider', 'password');
      localStorage.setItem('user_token', 'expired-token');
      localStorage.setItem('user_data', '{"id":"1"}');
      authService.validateToken.mockRejectedValue({ status: 401, message: 'Unauthorized' });

      const { result } = await renderAuth();

      expect(result.current.status).toBe('unauthenticated');
      expect(localStorage.getItem('user_token')).toBeNull();
      expect(localStorage.getItem('user_data')).toBeNull();
      expect(localStorage.getItem('auth_provider')).toBeNull();
    });

    it('no inicia sesión solo con una cuenta de Microsoft en caché si no fue el último ingreso', async () => {
      msal.account = { username: 'ana@classflow.cl' };

      const { result } = await renderAuth();

      expect(result.current.status).toBe('unauthenticated');
      expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('restaura una sesión de Microsoft usando el rol devuelto por /auth/me', async () => {
      localStorage.setItem('auth_provider', 'microsoft');
      msal.account = { username: 'ana@classflow.cl' };
      authService.getCurrentUser.mockResolvedValue(makeUser({ rol: 'TEACHER' }));

      const { result } = await renderAuth();

      expect(result.current.status).toBe('authenticated');
      expect(result.current.user?.rol).toBe('TEACHER');
      expect(localStorage.getItem('auth_provider')).toBe('microsoft');
    });

    it('valida contra el backend una sola vez aunque StrictMode duplique los efectos', async () => {
      localStorage.setItem('auth_provider', 'password');
      localStorage.setItem('user_token', 'backend-token');
      authService.validateToken.mockResolvedValue(makeUser());

      const strictWrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
        <React.StrictMode>
          <AuthProvider>{children}</AuthProvider>
        </React.StrictMode>
      );
      const { result } = renderHook(() => useAuth(), { wrapper: strictWrapper });
      await waitFor(() => expect(result.current.status).toBe('authenticated'));

      expect(authService.validateToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('login con contraseña (modo local)', () => {
    beforeEach(() => {
      msal.entraEnabled = false;
    });

    it('guarda el token y autentica al usuario', async () => {
      const user = makeUser({ rol: 'ADMINISTRATOR' });
      authService.login.mockResolvedValue({ token: 'new-token', user });
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.login('ana@classflow.cl', 'secreta');
      });

      expect(authService.login).toHaveBeenCalledWith({ email: 'ana@classflow.cl', password: 'secreta' });
      expect(result.current.status).toBe('authenticated');
      expect(result.current.user).toEqual(user);
      expect(localStorage.getItem('user_token')).toBe('new-token');
      expect(localStorage.getItem('auth_provider')).toBe('password');
    });

    it('muestra un mensaje claro ante credenciales incorrectas', async () => {
      authService.login.mockRejectedValue({ status: 401, message: 'Request failed with status code 401' });
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.login('ana@classflow.cl', 'mala')).rejects.toBeDefined();
      });

      expect(result.current.error).toBe('Correo o contraseña incorrectos.');
      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.isLoading).toBe(false);
    });

    it('usa el mensaje del backend para otros errores', async () => {
      authService.login.mockRejectedValue({ status: 500, message: 'x', details: { message: 'Servicio caído' } });
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.login('a@b.cl', 'x')).rejects.toBeDefined();
      });

      expect(result.current.error).toBe('Servicio caído');
    });

    it('traduce el "Bad credentials" del backend (400) a un mensaje claro', async () => {
      authService.login.mockRejectedValue({
        status: 400,
        message: 'Request failed with status code 400',
        details: { message: 'Bad credentials' },
      });
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.login('a@b.cl', 'mala')).rejects.toBeDefined();
      });

      expect(result.current.error).toBe('Correo o contraseña incorrectos.');
    });
  });

  describe('login con contraseña (modo híbrido, Entra configurado)', () => {
    it('permite ingresar con correo y contraseña', async () => {
      const user = makeUser({ rol: 'GUARDIAN' });
      authService.login.mockResolvedValue({ token: 'tk', user });
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.login('apoderado@classflow.cl', 'secreta');
      });

      expect(result.current.status).toBe('authenticated');
      expect(result.current.user?.rol).toBe('GUARDIAN');
      expect(localStorage.getItem('auth_provider')).toBe('password');
    });

    it('avisa si el servidor solo admite Microsoft (401 sin cuerpo)', async () => {
      authService.login.mockRejectedValue({ status: 401, message: 'Request failed with status code 401' });
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.login('a@b.cl', 'x')).rejects.toBeDefined();
      });

      expect(result.current.error).toMatch(/no está habilitado en el servidor/);
    });
  });

  describe('login con Microsoft', () => {
    it('abre el popup, activa la cuenta y toma el rol de ClassFlow', async () => {
      const account = { username: 'admin@classflow.cl' };
      msal.instance.loginPopup.mockResolvedValue({ account });
      authService.getCurrentUser.mockResolvedValue(makeUser({ rol: 'ADMINISTRATOR' }));
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.loginWithMicrosoft();
      });

      expect(msal.instance.loginPopup).toHaveBeenCalledWith({ scopes: ['openid'] });
      expect(msal.instance.setActiveAccount).toHaveBeenCalledWith(account);
      expect(result.current.status).toBe('authenticated');
      expect(result.current.user?.rol).toBe('ADMINISTRATOR');
      expect(localStorage.getItem('auth_provider')).toBe('microsoft');
    });

    it('rechaza cuentas de Microsoft que no existen en ClassFlow', async () => {
      msal.instance.loginPopup.mockResolvedValue({ account: { username: 'externo@otro.com' } });
      authService.getCurrentUser.mockRejectedValue({ status: 403, message: 'Forbidden' });
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.loginWithMicrosoft()).rejects.toBeDefined();
      });

      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.error).toMatch(/no está habilitada en ClassFlow/);
      expect(localStorage.getItem('auth_provider')).toBeNull();
    });

    it('muestra el motivo informado por el backend al rechazar la cuenta', async () => {
      msal.instance.loginPopup.mockResolvedValue({ account: { username: 'ana@classflow.cl' } });
      authService.getCurrentUser.mockRejectedValue({
        status: 403,
        message: 'Request failed with status code 403',
        details: { message: 'La cuenta ClassFlow está desactivada.' },
      });
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.loginWithMicrosoft()).rejects.toBeDefined();
      });

      expect(result.current.error).toBe('La cuenta ClassFlow está desactivada.');
    });

    it.each([
      ['user_cancelled', /Se cerró la ventana de Microsoft/],
      ['popup_window_error', /bloqueó la ventana de Microsoft/],
      ['empty_window_error', /bloqueó la ventana de Microsoft/],
      ['interaction_in_progress', /inicio de sesión con Microsoft en curso/],
    ])('traduce el error %s de MSAL a un mensaje claro', async (errorCode, expected) => {
      msal.instance.loginPopup.mockRejectedValue(Object.assign(new Error(errorCode), { errorCode }));
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.loginWithMicrosoft()).rejects.toThrow(errorCode);
      });

      expect(authService.getCurrentUser).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(expected);
      expect(result.current.isLoading).toBe(false);
    });

    it('no intenta el login si Entra no está configurado', async () => {
      msal.entraEnabled = false;
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.loginWithMicrosoft()).rejects.toThrow('Microsoft Entra no está configurado.');
      });

      expect(msal.instance.loginPopup).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('cierra también la sesión de Microsoft con la URL configurada', async () => {
      localStorage.setItem('auth_provider', 'microsoft');
      msal.account = { username: 'ana@classflow.cl' };
      authService.getCurrentUser.mockResolvedValue(makeUser());
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.logout();
      });

      expect(msal.instance.logoutPopup).toHaveBeenCalledWith({
        account: msal.account,
        postLogoutRedirectUri: 'https://classflow.test',
      });
      expect(result.current.status).toBe('unauthenticated');
      expect(localStorage.getItem('auth_provider')).toBeNull();
    });

    it('no abre el popup de Microsoft en una sesión con contraseña', async () => {
      msal.entraEnabled = false;
      authService.login.mockResolvedValue({ token: 't', user: makeUser() });
      msal.account = null;
      const { result } = await renderAuth();

      await act(async () => {
        await result.current.login('a@b.cl', 'x');
      });
      await act(async () => {
        await result.current.logout();
      });

      expect(msal.instance.logoutPopup).not.toHaveBeenCalled();
      expect(localStorage.getItem('user_token')).toBeNull();
      expect(result.current.status).toBe('unauthenticated');
    });

    it('cierra la sesión local aunque el popup de Microsoft falle', async () => {
      localStorage.setItem('auth_provider', 'microsoft');
      msal.account = { username: 'ana@classflow.cl' };
      authService.getCurrentUser.mockResolvedValue(makeUser());
      msal.instance.logoutPopup.mockRejectedValue(new Error('popup_window_error'));
      const { result } = await renderAuth();

      await act(async () => {
        await expect(result.current.logout()).resolves.toBeUndefined();
      });

      expect(result.current.status).toBe('unauthenticated');
    });
  });

  it('cierra la sesión cuando la API responde 401', async () => {
    msal.entraEnabled = false;
    authService.login.mockResolvedValue({ token: 't', user: makeUser() });
    const { result } = await renderAuth();

    await act(async () => {
      await result.current.login('a@b.cl', 'x');
    });
    expect(result.current.status).toBe('authenticated');

    const registered = apiService.setUnauthorizedHandler.mock.calls
      .map(([handler]) => handler)
      .filter((handler): handler is () => void => typeof handler === 'function');
    expect(registered).toHaveLength(1);
    act(() => registered[0]());

    expect(result.current.status).toBe('unauthenticated');
    expect(localStorage.getItem('user_token')).toBeNull();
  });
});
