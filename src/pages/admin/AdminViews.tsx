import React, { useEffect, useMemo, useState } from 'react';
import {
  DashboardAttendance,
  DashboardCourse,
  DashboardEvaluation,
  DashboardGrade,
  DashboardSubject,
  User,
  UserRole,
  schoolService,
} from '@services';
import { isEntraAuthEnabled } from '@/config/msal';
import { formatDate, formatScore, parseDate } from '@components/school/format';
import { downloadCsv } from '@components/school/csv';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMINISTRATOR: 'Administrador',
  TEACHER: 'Docente',
  GUARDIAN: 'Apoderado',
  STUDENT: 'Estudiante',
};

const ROLE_CLASS: Record<UserRole, string> = {
  ADMINISTRATOR: 'badge--administrador',
  TEACHER: 'badge--docente',
  GUARDIAN: 'badge--apoderado',
  STUDENT: 'badge--estudiante',
};

const Card: React.FC<{ title: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ title, extra, children }) => (
  <section className="admin-card">
    <div className="admin-card-header">
      <h2 className="admin-card-title">{title}</h2>
      {extra}
    </div>
    {children}
  </section>
);

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Datos académicos completos (cursos, asignaturas, evaluaciones, notas) para informes y rendimiento. */
interface AcademicData {
  courses: DashboardCourse[];
  subjects: DashboardSubject[];
  evaluations: DashboardEvaluation[];
  grades: DashboardGrade[];
}

function useAcademicData(): { data: AcademicData | null; error: string | null } {
  const [data, setData] = useState<AcademicData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      schoolService.getCourses(),
      schoolService.getAllSubjects(),
      schoolService.getAllEvaluations(),
      schoolService.getAllGrades(),
    ])
      .then(([courses, subjects, evaluations, grades]) => setData({ courses, subjects, evaluations, grades }))
      .catch(() => setError('No se pudieron cargar los datos académicos.'));
  }, []);

  return { data, error };
}

// ── Usuarios ───────────────────────────────────────────────────────────────────

export const AdminUsersView: React.FC<{
  users: User[];
  currentUserId?: string;
  onToggleActive: (user: User) => Promise<void>;
}> = ({ users, currentUserId, onToggleActive }) => {
  const [role, setRole] = useState<UserRole | ''>('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        (!role || u.rol === role) &&
        (!term || u.nombre.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
    );
  }, [users, role, search]);

  const toggle = async (u: User): Promise<void> => {
    setBusyId(u.id);
    setError(null);
    try {
      await onToggleActive(u);
    } catch {
      setError(`No se pudo ${u.activo ? 'desactivar' : 'activar'} a ${u.nombre}.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card title="Usuarios" extra={<span className="admin-table-muted">{filtered.length} de {users.length}</span>}>
      <div className="school-filters">
        <label className="school-inline">
          Rol
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole | '')}>
            <option value="">Todos</option>
            {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </label>
        <label className="school-inline">
          Buscar
          <input placeholder="Nombre o correo" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      {error && <p className="school-notice school-notice--error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Curso</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td className="admin-table-muted">{u.email}</td>
              <td><span className={`admin-badge ${ROLE_CLASS[u.rol]}`}>{ROLE_LABEL[u.rol]}</span></td>
              <td className="admin-table-muted">{u.subject ?? '—'}</td>
              <td>
                <span className={`admin-badge ${u.activo ? 'badge--activo' : 'badge--inactivo'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td>
                {u.id !== currentUserId && (
                  <button className="admin-approve-btn" onClick={() => toggle(u)} disabled={busyId === u.id}>
                    {busyId === u.id ? '...' : u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="admin-table-muted">No hay usuarios que coincidan.</td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
};

// ── Gestión académica ──────────────────────────────────────────────────────────

export const AdminAcademicView: React.FC<{ reloadKey: number }> = ({ reloadKey }) => {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [subjects, setSubjects] = useState<DashboardSubject[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const load = async (): Promise<void> => {
    const [courseList, subjectList] = await Promise.all([schoolService.getCourses(), schoolService.getAllSubjects()]);
    setCourses(courseList);
    setSubjects(subjectList);
    setCourseId((current) => current ?? courseList[0]?.id ?? null);
  };

  useEffect(() => {
    load().catch(() => setNotice({ type: 'error', text: 'No se pudieron cargar los cursos.' }));
  }, [reloadKey]);

  const course = courses.find((c) => c.id === courseId);
  const courseSubjects = subjects.filter((s) => s.courseId === courseId);

  const addSubject = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (courseId == null) return;
    setNotice(null);
    try {
      await schoolService.createSubject({ name: form.name.trim(), description: form.description.trim() || undefined, courseId });
      setForm({ name: '', description: '' });
      setNotice({ type: 'ok', text: 'Asignatura agregada.' });
      await load();
    } catch {
      setNotice({ type: 'error', text: 'No se pudo agregar la asignatura.' });
    }
  };

  return (
    <div className="admin-mid-row">
      <Card title="Cursos" extra={<span className="admin-table-muted">{courses.length} cursos</span>}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Año</th>
              <th>Asignaturas</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr
                key={c.id}
                className={`admin-row-selectable${c.id === courseId ? ' admin-row-selected' : ''}`}
                onClick={() => setCourseId(c.id)}
              >
                <td>{c.name}</td>
                <td className="admin-table-muted">{c.academicYear ?? '—'}</td>
                <td className="admin-table-muted">{subjects.filter((s) => s.courseId === c.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title={course ? `Asignaturas — ${course.name}` : 'Asignaturas'}>
        {courseSubjects.length === 0 ? (
          <p className="admin-table-muted">El curso no tiene asignaturas.</p>
        ) : (
          <ul className="admin-plain-list">
            {courseSubjects.map((s) => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                {s.description && <span className="admin-table-muted"> — {s.description}</span>}
              </li>
            ))}
          </ul>
        )}
        {course && (
          <form className="school-form" onSubmit={addSubject}>
            <label className="school-field">
              Nueva asignatura
              <input required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="school-field">
              Descripción
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            {notice && <p className={`school-notice school-notice--${notice.type}`}>{notice.text}</p>}
            <div className="school-actions">
              <button type="submit" className="admin-btn admin-btn--primary">Agregar asignatura</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

// ── Asistencia ─────────────────────────────────────────────────────────────────

export const AdminAttendanceView: React.FC<{ users: User[] }> = ({ users }) => {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [records, setRecords] = useState<DashboardAttendance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([schoolService.getCourses(), schoolService.getAllAttendance()])
      .then(([courseList, attendance]) => {
        setCourses(courseList);
        setRecords(attendance);
      })
      .catch(() => setError('No se pudo cargar la asistencia.'));
  }, []);

  const names = useMemo(() => new Map(users.map((u) => [u.id, u.nombre])), [users]);
  const courseNames = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);
  const absences = records
    .filter((r) => !r.present)
    .sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0))
    .slice(0, 15);

  if (error) return <p className="school-notice school-notice--error">{error}</p>;

  return (
    <div className="admin-mid-row">
      <Card title="Asistencia por curso">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Curso</th>
              <th>Registros</th>
              <th>Ausencias</th>
              <th>Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => {
              const ofCourse = records.filter((r) => r.courseId === c.id);
              const present = ofCourse.filter((r) => r.present).length;
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="admin-table-muted">{ofCourse.length}</td>
                  <td className="admin-table-muted">{ofCourse.length - present}</td>
                  <td>{ofCourse.length ? `${pct(present, ofCourse.length)}%` : 'Sin registros'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title="Inasistencias recientes">
        {absences.length === 0 ? (
          <p className="admin-table-muted">No hay inasistencias registradas.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estudiante</th>
                <th>Curso</th>
                <th>Justificación</th>
              </tr>
            </thead>
            <tbody>
              {absences.map((r) => (
                <tr key={r.id}>
                  <td className="admin-table-muted">{formatDate(r.date)}</td>
                  <td>{names.get(String(r.studentId)) ?? `Estudiante ${r.studentId}`}</td>
                  <td className="admin-table-muted">{courseNames.get(r.courseId) ?? '—'}</td>
                  <td className="admin-table-muted">{r.justification || 'Sin justificar'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

// ── Rendimiento ────────────────────────────────────────────────────────────────

export const AdminPerformanceView: React.FC<{ users: User[] }> = ({ users }) => {
  const { data, error } = useAcademicData();
  const [courseId, setCourseId] = useState<number | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    const subjectById = new Map(data.subjects.map((s) => [s.id, s]));
    const evaluationById = new Map(data.evaluations.map((e) => [e.id, e]));
    return data.grades
      .filter((g) => g.score != null)
      .map((g) => {
        const evaluation = g.evaluationId != null ? evaluationById.get(g.evaluationId) : undefined;
        const subject = evaluation?.subjectId != null ? subjectById.get(evaluation.subjectId) : undefined;
        return { grade: g, subject, courseId: subject?.courseId ?? null };
      });
  }, [data]);

  if (error) return <p className="school-notice school-notice--error">{error}</p>;
  if (!data) return <p className="admin-table-muted">Cargando rendimiento...</p>;

  const names = new Map(users.map((u) => [u.id, u.nombre]));
  const selected = courseId ?? data.courses[0]?.id ?? null;
  const ofCourse = rows.filter((r) => r.courseId === selected);
  const bySubject = new Map<string, number[]>();
  ofCourse.forEach((r) => {
    const key = r.subject?.name ?? 'Sin asignatura';
    bySubject.set(key, [...(bySubject.get(key) ?? []), r.grade.score as number]);
  });

  const byStudent = new Map<number, number[]>();
  rows.forEach((r) => byStudent.set(r.grade.studentId, [...(byStudent.get(r.grade.studentId) ?? []), r.grade.score as number]));
  const atRisk = [...byStudent.entries()]
    .map(([studentId, scores]) => ({ studentId, avg: average(scores) as number }))
    .filter((s) => s.avg < 4)
    .sort((a, b) => a.avg - b.avg);

  return (
    <>
      <div className="admin-mid-row">
        <Card title="Promedio por curso">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Notas</th>
                <th>Promedio</th>
                <th>Bajo 4.0</th>
              </tr>
            </thead>
            <tbody>
              {data.courses.map((c) => {
                const scores = rows.filter((r) => r.courseId === c.id).map((r) => r.grade.score as number);
                return (
                  <tr
                    key={c.id}
                    className={`admin-row-selectable${c.id === selected ? ' admin-row-selected' : ''}`}
                    onClick={() => setCourseId(c.id)}
                  >
                    <td>{c.name}</td>
                    <td className="admin-table-muted">{scores.length}</td>
                    <td>{formatScore(average(scores))}</td>
                    <td className="admin-table-muted">{scores.filter((s) => s < 4).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title={`Por asignatura — ${data.courses.find((c) => c.id === selected)?.name ?? ''}`}>
          {bySubject.size === 0 ? (
            <p className="admin-table-muted">El curso no tiene notas registradas.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Asignatura</th>
                  <th>Notas</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {[...bySubject.entries()].map(([subject, scores]) => (
                  <tr key={subject}>
                    <td>{subject}</td>
                    <td className="admin-table-muted">{scores.length}</td>
                    <td>{formatScore(average(scores))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Estudiantes con promedio bajo 4.0">
        {atRisk.length === 0 ? (
          <p className="admin-table-muted">Ningún estudiante tiene promedio bajo 4.0.</p>
        ) : (
          <ul className="admin-plain-list">
            {atRisk.map((s) => (
              <li key={s.studentId}>
                {names.get(String(s.studentId)) ?? `Estudiante ${s.studentId}`} — promedio {formatScore(s.avg)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
};

// ── Informes ───────────────────────────────────────────────────────────────────

export const AdminReportsView: React.FC<{ users: User[] }> = ({ users }) => {
  const { data, error } = useAcademicData();
  const [attendance, setAttendance] = useState<DashboardAttendance[] | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    schoolService.getAllAttendance().then(setAttendance).catch(() => setAttendance([]));
  }, []);

  const names = new Map(users.map((u) => [u.id, u.nombre]));
  const courseNames = new Map((data?.courses ?? []).map((c) => [c.id, c.name]));

  const exportUsers = (): void =>
    downloadCsv(
      `classflow-usuarios-${today}.csv`,
      ['ID', 'Nombre', 'Correo', 'Rol', 'Curso', 'Estado'],
      users.map((u) => [u.id, u.nombre, u.email, ROLE_LABEL[u.rol], u.subject, u.activo ? 'Activo' : 'Inactivo'])
    );

  const exportAttendance = (): void =>
    downloadCsv(
      `classflow-asistencia-${today}.csv`,
      ['Fecha', 'Estudiante', 'Curso', 'Estado', 'Justificación'],
      (attendance ?? []).map((r) => [
        r.date,
        names.get(String(r.studentId)) ?? r.studentId,
        courseNames.get(r.courseId) ?? r.courseId,
        r.present ? 'Presente' : 'Ausente',
        r.justification,
      ])
    );

  const exportGrades = (): void => {
    if (!data) return;
    const subjectById = new Map(data.subjects.map((s) => [s.id, s]));
    const evaluationById = new Map(data.evaluations.map((e) => [e.id, e]));
    downloadCsv(
      `classflow-notas-${today}.csv`,
      ['Estudiante', 'Curso', 'Asignatura', 'Evaluación', 'Fecha', 'Ponderación %', 'Nota', 'Observaciones'],
      data.grades.map((g) => {
        const evaluation = g.evaluationId != null ? evaluationById.get(g.evaluationId) : undefined;
        const subject = evaluation?.subjectId != null ? subjectById.get(evaluation.subjectId) : undefined;
        return [
          names.get(String(g.studentId)) ?? g.studentId,
          subject?.courseId != null ? courseNames.get(subject.courseId) : '',
          subject?.name,
          evaluation?.name,
          evaluation?.date,
          evaluation?.percentage,
          g.score != null ? g.score.toFixed(1).replace('.', ',') : '',
          g.observations,
        ];
      })
    );
  };

  return (
    <Card title="Informes descargables (CSV)">
      {error && <p className="school-notice school-notice--error">{error}</p>}
      <ul className="admin-report-list">
        <li>
          <div>
            <strong>Usuarios</strong>
            <p className="admin-table-muted">{users.length} usuarios con rol, curso y estado.</p>
          </div>
          <button className="admin-btn admin-btn--secondary" onClick={exportUsers}>⬇ Descargar</button>
        </li>
        <li>
          <div>
            <strong>Asistencia</strong>
            <p className="admin-table-muted">{attendance ? `${attendance.length} registros` : 'Cargando...'} con estudiante, curso y justificación.</p>
          </div>
          <button className="admin-btn admin-btn--secondary" onClick={exportAttendance} disabled={!attendance}>⬇ Descargar</button>
        </li>
        <li>
          <div>
            <strong>Notas</strong>
            <p className="admin-table-muted">{data ? `${data.grades.length} notas` : 'Cargando...'} con asignatura, evaluación y ponderación.</p>
          </div>
          <button className="admin-btn admin-btn--secondary" onClick={exportGrades} disabled={!data}>⬇ Descargar</button>
        </li>
      </ul>
    </Card>
  );
};

// ── Configuración ──────────────────────────────────────────────────────────────

export const AdminSettingsView: React.FC<{ user: User | null }> = ({ user }) => (
  <div className="admin-mid-row">
    <Card title="Mi cuenta">
      <dl className="admin-definition-list">
        <dt>Nombre</dt>
        <dd>{user?.nombre ?? '—'}</dd>
        <dt>Correo</dt>
        <dd>{user?.email ?? '—'}</dd>
        <dt>Rol</dt>
        <dd>{user ? ROLE_LABEL[user.rol] : '—'}</dd>
      </dl>
    </Card>
    <Card title="Sistema">
      <dl className="admin-definition-list">
        <dt>Inicio de sesión</dt>
        <dd>{isEntraAuthEnabled ? 'Correo y contraseña o Microsoft Entra ID' : 'Correo y contraseña'}</dd>
        <dt>API</dt>
        <dd>{import.meta.env.VITE_API_BASE_URL || '/api'}</dd>
        <dt>Versión</dt>
        <dd>{import.meta.env.VITE_APP_VERSION || '—'}</dd>
      </dl>
    </Card>
  </div>
);
