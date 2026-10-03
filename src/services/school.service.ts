import { apiService } from './api.service';
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

export interface NewEvaluation {
  name: string;
  description?: string;
  percentage: number;
  date: string;
  subjectId: number;
}

export interface NewAnnotation {
  studentId: number;
  teacherId: number;
  type: 'POSITIVE' | 'NEGATIVE';
  description: string;
}

export interface AttendanceEntry {
  studentId: number;
  courseId: number;
  date: string;
  present: boolean;
  justification?: string | null;
}

/**
 * Operaciones académicas, de asistencia y de mensajería para docentes y administradores.
 * El backend fija el autor (anotaciones, mensajes, avisos) con el usuario autenticado.
 */
class SchoolService {
  getCourses(): Promise<DashboardCourse[]> {
    return apiService.get('/courses');
  }

  getSubjects(courseId: number): Promise<DashboardSubject[]> {
    return apiService.get(`/subjects/course/${courseId}`);
  }

  getAllSubjects(): Promise<DashboardSubject[]> {
    return apiService.get('/subjects');
  }

  getAllEvaluations(): Promise<DashboardEvaluation[]> {
    return apiService.get('/evaluations');
  }

  /** Todas las notas (solo docentes y administradores). */
  getAllGrades(): Promise<DashboardGrade[]> {
    return apiService.get('/grades');
  }

  createSubject(subject: { name: string; description?: string; courseId: number }): Promise<DashboardSubject> {
    return apiService.post('/subjects', { ...subject, active: true });
  }

  getEvaluations(subjectId: number): Promise<DashboardEvaluation[]> {
    return apiService.get(`/evaluations/subject/${subjectId}`);
  }

  createEvaluation(evaluation: NewEvaluation): Promise<DashboardEvaluation> {
    return apiService.post('/evaluations', { ...evaluation, maxScore: 7 });
  }

  getGradesByEvaluation(evaluationId: number): Promise<DashboardGrade[]> {
    return apiService.get(`/grades/evaluation/${evaluationId}`);
  }

  getGradesByStudent(studentId: number): Promise<DashboardGrade[]> {
    return apiService.get(`/grades/student/${studentId}`);
  }

  /** Crea la nota o, si el estudiante ya tiene una en esa evaluación, la actualiza. */
  saveGrade(grade: { id?: number; studentId: number; evaluationId: number; score: number; observations?: string }): Promise<DashboardGrade> {
    const body = {
      studentId: grade.studentId,
      evaluationId: grade.evaluationId,
      score: grade.score,
      observations: grade.observations ?? null,
    };
    return grade.id
      ? apiService.put<DashboardGrade>(`/grades/${grade.id}`, body)
      : apiService.post<DashboardGrade>('/grades', body);
  }

  getAttendanceByCourseAndDate(courseId: number, date: string): Promise<DashboardAttendance[]> {
    return apiService.get(`/attendance/course/${courseId}/date/${date}`);
  }

  getAllAttendance(): Promise<DashboardAttendance[]> {
    return apiService.get('/attendance');
  }

  /** El backend rechaza registrar dos veces el mismo día: los registros existentes se actualizan. */
  saveAttendance(entry: AttendanceEntry, existingId?: number): Promise<DashboardAttendance> {
    return existingId
      ? apiService.put(`/attendance/${existingId}`, entry)
      : apiService.post('/attendance/register', entry);
  }

  /** Solo anotaciones vigentes: el borrado de ms-assistance es lógico (active=false). */
  async getAnnotationsByStudent(studentId: number): Promise<DashboardAnnotation[]> {
    const annotations = await apiService.get<DashboardAnnotation[]>(`/annotations/student/${studentId}`);
    return annotations.filter((a) => a.active !== false);
  }

  createAnnotation(annotation: NewAnnotation): Promise<DashboardAnnotation> {
    return apiService.post('/annotations', annotation);
  }

  getInbox(userId: string): Promise<DashboardMessage[]> {
    return apiService.get(`/messages/receiver/${userId}`);
  }

  getSent(userId: string): Promise<DashboardMessage[]> {
    return apiService.get(`/messages/sender/${userId}`);
  }

  sendMessage(message: { senderId: string; receiverId: string; subject: string; body: string }): Promise<DashboardMessage> {
    return apiService.post<DashboardMessage>('/messages/send', {
      ...message,
      senderId: Number(message.senderId),
      receiverId: Number(message.receiverId),
    });
  }

  markMessageAsRead(messageId: number): Promise<DashboardMessage> {
    return apiService.put(`/messages/${messageId}/read`, {});
  }

  getActiveAnnouncements(): Promise<DashboardAnnouncement[]> {
    return apiService.get('/announcements/active');
  }

  publishAnnouncement(announcement: { title: string; content: string; courseId: number | null; senderId: string }): Promise<DashboardAnnouncement> {
    return apiService.post<DashboardAnnouncement>('/announcements', {
      ...announcement,
      senderId: Number(announcement.senderId),
    });
  }
}

export const schoolService = new SchoolService();
