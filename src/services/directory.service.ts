import { apiService } from './api.service';
import { BackendUser, authService } from './auth.service';
import { User, UserRole } from './user.service';

/**
 * Directorio de usuarios de ms-auth: listados por rol/curso, pupilos de un apoderado
 * y activación de cuentas. Separado de userService para reutilizar la normalización
 * de authService sin crear una importación circular.
 */
class DirectoryService {
  private readonly endpoint = '/auth/users';

  /** Lista usuarios filtrados por rol y/o curso (solo docentes y administradores). */
  async listUsers(filters: { role?: UserRole; course?: string } = {}): Promise<User[]> {
    const params: Record<string, string> = {};
    if (filters.role) params.role = filters.role;
    if (filters.course) params.course = filters.course;
    const response = await apiService.get<BackendUser[]>(this.endpoint, { params });
    return response.map((user) => authService.normalizeUser(user));
  }

  /** Estudiantes a cargo de un apoderado (el propio apoderado, docentes o administradores). */
  async getStudentsByGuardian(guardianId: string): Promise<User[]> {
    const response = await apiService.get<BackendUser[]>(`${this.endpoint}/guardian/${guardianId}`);
    return response.map((user) => authService.normalizeUser(user));
  }

  /** Activa o desactiva una cuenta (solo administradores). */
  async setActive(id: string, active: boolean): Promise<User> {
    const response = await apiService.put<BackendUser>(`${this.endpoint}/${id}/active`, { active });
    return authService.normalizeUser(response);
  }
}

export const directoryService = new DirectoryService();
