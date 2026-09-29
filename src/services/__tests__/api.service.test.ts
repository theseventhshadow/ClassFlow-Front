import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiService } from '../api.service';

const msal = vi.hoisted(() => ({ acquireApiAccessToken: vi.fn() }));

vi.mock('@config/msal', () => ({ acquireApiAccessToken: msal.acquireApiAccessToken }));

/** Adaptador falso: responde con el header Authorization que recibió la petición. */
const echoAuthorization: AxiosAdapter = async (config) => ({
  data: config.headers.Authorization ?? null,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const respondWithStatus = (status: number): AxiosAdapter => async (config) => {
  throw new AxiosError(
    `Request failed with status code ${status}`,
    'ERR_BAD_REQUEST',
    config,
    null,
    {
      data: { message: 'No autorizado' },
      status,
      statusText: '',
      headers: {},
      config: config as InternalAxiosRequestConfig,
    },
  );
};

describe('apiService', () => {
  beforeEach(() => {
    localStorage.clear();
    msal.acquireApiAccessToken.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    apiService.setUnauthorizedHandler(null);
    vi.restoreAllMocks();
  });

  describe('interceptor de autenticación', () => {
    it('envía el token del backend en sesiones con contraseña', async () => {
      localStorage.setItem('auth_provider', 'password');
      localStorage.setItem('user_token', 'backend-token');

      const header = await apiService.get('/dashboard', { adapter: echoAuthorization });

      expect(header).toBe('Bearer backend-token');
      expect(msal.acquireApiAccessToken).not.toHaveBeenCalled();
    });

    it('envía el access token de Entra en sesiones de Microsoft', async () => {
      localStorage.setItem('auth_provider', 'microsoft');
      localStorage.setItem('user_token', 'token-antiguo');
      msal.acquireApiAccessToken.mockResolvedValue('entra-token');

      const header = await apiService.get('/auth/me', { adapter: echoAuthorization });

      expect(header).toBe('Bearer entra-token');
    });

    it('no envía Authorization si no hay sesión', async () => {
      const header = await apiService.get('/dashboard', { adapter: echoAuthorization });
      expect(header).toBeNull();
    });

    it('no envía el token a endpoints públicos', async () => {
      localStorage.setItem('user_token', 'backend-token');

      for (const url of ['/auth/login', '/auth/forgot-password', '/auth/reset-password']) {
        const header = await apiService.get(url, { adapter: echoAuthorization });
        expect(header).toBeNull();
      }
    });

    it('respeta un Authorization explícito de la llamada', async () => {
      localStorage.setItem('user_token', 'backend-token');

      const header = await apiService.get('/auth/validate', {
        adapter: echoAuthorization,
        headers: new AxiosHeaders({ Authorization: 'Bearer explicito' }),
      });

      expect(header).toBe('Bearer explicito');
    });
  });

  describe('manejo de errores', () => {
    it('normaliza el error con status y detalles del backend', async () => {
      await expect(apiService.get('/dashboard', { adapter: respondWithStatus(500) })).rejects.toEqual({
        message: 'Request failed with status code 500',
        status: 500,
        details: { message: 'No autorizado' },
      });
    });

    it('avisa a la sesión cuando un endpoint protegido responde 401', async () => {
      const onUnauthorized = vi.fn();
      apiService.setUnauthorizedHandler(onUnauthorized);

      await expect(apiService.get('/dashboard', { adapter: respondWithStatus(401) })).rejects.toMatchObject({
        status: 401,
      });

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('no cierra la sesión por un 401 del login (credenciales incorrectas)', async () => {
      const onUnauthorized = vi.fn();
      apiService.setUnauthorizedHandler(onUnauthorized);

      await expect(apiService.get('/auth/login', { adapter: respondWithStatus(401) })).rejects.toBeDefined();

      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it('no avisa por errores distintos de 401', async () => {
      const onUnauthorized = vi.fn();
      apiService.setUnauthorizedHandler(onUnauthorized);

      await expect(apiService.get('/dashboard', { adapter: respondWithStatus(403) })).rejects.toBeDefined();

      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });
});
