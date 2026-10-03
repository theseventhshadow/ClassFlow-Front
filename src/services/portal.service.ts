import { apiService } from './api.service';
import { User } from './user.service';
import {
  DashboardAnnotation,
  DashboardAnnouncement,
  DashboardAttendance,
  DashboardCourse,
  DashboardEvaluation,
  DashboardGrade,
  DashboardMessage,
  DashboardSubject,
} from './dashboard.service';

/** Datos del portal de un estudiante (lo usa el propio estudiante o su apoderado). */
export interface PortalData {
  student: User;
  course: DashboardCourse | null;
  subjects: DashboardSubject[];
  evaluations: DashboardEvaluation[];
  grades: DashboardGrade[];
  attendances: DashboardAttendance[];
  annotations: DashboardAnnotation[];
  announcements: DashboardAnnouncement[];
  /** Mensajes recibidos por el usuario conectado (estudiante o apoderado). */
  messages: DashboardMessage[];
}

/** Algunas consultas pueden fallar por permisos; el portal muestra lo que sí llegó. */
async function listOrEmpty<T>(request: Promise<T[]>): Promise<T[]> {
  try {
    return await request;
  } catch {
    return [];
  }
}

class PortalService {
  /**
   * Junta los datos del estudiante consultando cada microservicio por separado.
   * No usa /bff/dashboard porque el BFF solo permite pedir el propio perfil, y el
   * apoderado necesita los datos de su pupilo.
   */
  async getStudentData(student: User, viewerId: string): Promise<PortalData> {
    const [courses, grades, attendances, annotations, announcements, messages] = await Promise.all([
      listOrEmpty(apiService.get<DashboardCourse[]>('/courses')),
      listOrEmpty(apiService.get<DashboardGrade[]>(`/grades/student/${student.id}`)),
      listOrEmpty(apiService.get<DashboardAttendance[]>(`/attendance/student/${student.id}`)),
      listOrEmpty(apiService.get<DashboardAnnotation[]>(`/annotations/student/${student.id}`)),
      listOrEmpty(apiService.get<DashboardAnnouncement[]>('/announcements/active')),
      listOrEmpty(apiService.get<DashboardMessage[]>(`/messages/receiver/${viewerId}`)),
    ]);

    // El usuario guarda el nombre del curso ("2° Medio"); la asistencia trae el id como respaldo.
    const course =
      courses.find((c) => c.name === student.subject) ??
      courses.find((c) => c.id === attendances[0]?.courseId) ??
      null;

    const subjects = course
      ? await listOrEmpty(apiService.get<DashboardSubject[]>(`/subjects/course/${course.id}`))
      : [];
    const evaluations = (
      await Promise.all(
        subjects.map((s) => listOrEmpty(apiService.get<DashboardEvaluation[]>(`/evaluations/subject/${s.id}`)))
      )
    ).flat();

    return {
      student,
      course,
      subjects,
      evaluations,
      grades,
      attendances,
      // ms-assistance borra anotaciones de forma lógica (active=false) pero las sigue devolviendo.
      annotations: annotations.filter((a) => a.active !== false),
      // Avisos generales (sin curso) y los del curso del estudiante.
      announcements: announcements.filter((a) => a.courseId == null || a.courseId === course?.id),
      messages,
    };
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await apiService.put(`/messages/${messageId}/read`, {});
  }
}

export const portalService = new PortalService();
