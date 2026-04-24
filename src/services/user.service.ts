/**
 * Ejemplo de servicio específico
 * Patrón para crear servicios de dominio reutilizables
 */

import { apiService } from './api.service';
import { ApiResponse, PaginatedResponse } from '@types';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

class UserService {
  private readonly endpoint = '/users';

  /**
   * Obtiene todos los usuarios
   */
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    return apiService.get(`${this.endpoint}?page=${page}&limit=${limit}`);
  }

  /**
   * Obtiene un usuario por ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return apiService.get(`${this.endpoint}/${id}`);
  }

  /**
   * Crea un nuevo usuario
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<ApiResponse<User>> {
    return apiService.post(this.endpoint, userData);
  }

  /**
   * Actualiza un usuario
   */
  async updateUser(id: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiService.put(`${this.endpoint}/${id}`, userData);
  }

  /**
   * Elimina un usuario
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.endpoint}/${id}`);
  }
}

export const userService = new UserService();

export default userService;
