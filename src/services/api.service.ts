import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@config';
import { acquireApiAccessToken } from '@config/msal';
import { LOCAL_STORAGE_KEYS } from '@constants';
import { ApiError } from '@types';

const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/forgot-password', '/auth/reset-password'];

const isPublicEndpoint = (url?: string): boolean =>
  PUBLIC_ENDPOINTS.some((endpoint) => url?.includes(endpoint));

/**
 * Instancia de Axios configurada
 * Centraliza la lógica de comunicación con la API
 */
class ApiService {
  private instance: AxiosInstance;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: config.api.baseURL,
      timeout: config.api.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Registra qué hacer cuando la API rechaza la sesión (401) en un endpoint protegido.
   * AuthProvider lo usa para cerrar la sesión local.
   */
  setUnauthorizedHandler(handler: (() => void) | null): void {
    this.unauthorizedHandler = handler;
  }

  /**
   * Configura interceptores para manejo global de errores y tokens
   */
  private setupInterceptors(): void {
    // Interceptor de respuesta
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message,
          status: error.response?.status || 500,
          details: error.response?.data,
        };

        if (apiError.status === 401 && !isPublicEndpoint(error.config?.url)) {
          this.unauthorizedHandler?.();
        }

        console.error('API Error:', apiError);

        return Promise.reject(apiError);
      }
    );

    // Interceptor de solicitud: agrega el Bearer token salvo en endpoints públicos
    // o cuando la llamada ya trae su propio Authorization.
    this.instance.interceptors.request.use(async (config) => {
      if (isPublicEndpoint(config.url) || config.headers.Authorization) {
        return config;
      }

      const token =
        localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_PROVIDER) === 'microsoft'
          ? await acquireApiAccessToken()
          : localStorage.getItem(LOCAL_STORAGE_KEYS.USER_TOKEN);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Método GET genérico
   */
  async get<T = unknown>(url: string, config?: Record<string, unknown>): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  /**
   * Método POST genérico
   */
  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.post<T>(url, data);
    return response.data;
  }

  /**
   * Método PUT genérico
   */
  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.put<T>(url, data);
    return response.data;
  }

  /**
   * Método PATCH genérico
   */
  async patch<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.instance.patch<T>(url, data);
    return response.data;
  }

  /**
   * Método DELETE genérico
   */
  async delete<T = unknown>(url: string): Promise<T> {
    const response = await this.instance.delete<T>(url);
    return response.data;
  }
}

// Exportar instancia única
export const apiService = new ApiService();

export default apiService;
