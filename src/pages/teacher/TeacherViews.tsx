import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DashboardAnnotation,
  DashboardCourse,
  DashboardEvaluation,
  DashboardSubject,
  User,
  schoolService,
} from '@services';
import { formatDate, initials, parseDate, todayIso } from '@components/school/format';

interface CourseViewProps {
  course: DashboardCourse;
  students: User[];
  /** Todos los apoderados, para mostrar el de cada estudiante. */
  guardians: User[];
}

type Notice = { type: 'ok' | 'error'; text: string } | null;

const NoticeBox: React.FC<{ notice: Notice }> = ({ notice }) =>
  notice ? <p className={`school-notice school-notice--${notice.type}`}>{notice.text}</p> : null;

const NoStudents: React.FC<{ course: DashboardCourse }> = ({ course }) => (
  <p className="school-empty">{course.name} no tiene estudiantes registrados.</p>
);

// ── Mis cursos ─────────────────────────────────────────────────────────────────

export const CourseRosterView: React.FC<CourseViewProps> = ({ course, students, guardians }) => {
  const [subjects, setSubjects] = useState<DashboardSubject[]>([]);
  const guardianName = useMemo(() => new Map(guardians.map((g) => [g.id, g.nombre])), [guardians]);

  useEffect(() => {
    schoolService.getSubjects(course.id).then(setSubjects).catch(() => setSubjects([]));
  }, [course.id]);

  return (
    <div className="tp-grid-2">
      <div className="tp-card">
        <div className="tp-card-header">
          <h3>Estudiantes — {course.name}</h3>
          <span className="school-muted">{students.length} estudiantes</span>
        </div>
        {students.length === 0 ? (
          <NoStudents course={course} />
        ) : (
          <div className="tp-list">
            {students.map((s) => (
              <div key={s.id} className="tp-list-item">
                <div className="tp-avatar tp-avatar--sm">{initials(s.nombre)}</div>
                <div className="school-stack">
                  <span className="tp-list-name">{s.nombre}</span>
                  <span className="school-muted">
                    Apoderado: {s.guardianId ? guardianName.get(s.guardianId) ?? '—' : 'sin asignar'}
                  </span>
                </div>
                {!s.activo && <span className="tp-badge tp-badge--absent">Inactivo</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tp-card">
        <div className="tp-card-header">
          <h3>Asignaturas</h3>
          <span className="school-muted">{course.academicYear ?? ''}</span>
        </div>
        {subjects.length === 0 ? (
          <p className="school-empty">El curso no tiene asignaturas.</p>
        ) : (
          <div className="tp-list">
            {subjects.map((s) => (
              <div key={s.id} className="tp-list-item">
                <span className="tp-list-name">{s.name}</span>
                <span className="school-muted">{s.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Asistencia ─────────────────────────────────────────────────────────────────

interface RollEntry {
  present: boolean;
  justification: string;
  existingId?: number;
}

export const AttendanceTakingView: React.FC<CourseViewProps> = ({ course, students }) => {
  const [date, setDate] = useState(todayIso());
  const [roll, setRoll] = useState<Record<string, RollEntry>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const records = await schoolService.getAttendanceByCourseAndDate(course.id, date);
      const byStudent = new Map(records.map((r) => [String(r.studentId), r]));
      setRoll(
        Object.fromEntries(
          students.map((s) => {
            const record = byStudent.get(s.id);
            // Sin registro previo, se asume presente: el docente marca solo las ausencias.
            return [s.id, { present: record?.present ?? true, justification: record?.justification ?? '', existingId: record?.id }];
          })
        )
      );
    } catch {
      setNotice({ type: 'error', text: 'No se pudo cargar la asistencia de esa fecha.' });
    } finally {
      setLoading(false);
    }
  }, [course.id, date, students]);

  useEffect(() => {
    load();
  }, [load]);

  // El aviso de "guardado" se mantiene tras la recarga posterior al guardar; se limpia al cambiar de lista.
  useEffect(() => {
    setNotice(null);
  }, [course.id, date]);

  const update = (studentId: string, patch: Partial<RollEntry>): void =>
    setRoll((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));

  const save = async (): Promise<void> => {
    setSaving(true);
    setNotice(null);
    const results = await Promise.allSettled(
      students.map((s) => {
        const entry = roll[s.id];
        return schoolService.saveAttendance(
          {
            studentId: Number(s.id),
            courseId: course.id,
            date,
            present: entry.present,
            justification: entry.present ? null : entry.justification || null,
          },
          entry.existingId
        );
      })
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    setNotice(
      failed === 0
        ? { type: 'ok', text: `Asistencia del ${formatDate(date)} guardada.` }
        : { type: 'error', text: `No se pudo guardar la asistencia de ${failed} estudiante(s).` }
    );
    setSaving(false);
    await load();
  };

  const presentCount = students.filter((s) => roll[s.id]?.present).length;
  const alreadyTaken = students.some((s) => roll[s.id]?.existingId);

  return (
    <div className="tp-card">
      <div className="tp-card-header">
        <h3>Pasar lista — {course.name}</h3>
        <label className="school-inline">
          Fecha
          <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <NoticeBox notice={notice} />
      {students.length === 0 ? (
        <NoStudents course={course} />
      ) : loading ? (
        <p className="school-empty">Cargando...</p>
      ) : (
        <>
          <p className="school-muted">
            {alreadyTaken ? 'Lista ya registrada para esta fecha: puedes corregirla.' : 'Lista sin registrar para esta fecha.'}{' '}
            Presentes: {presentCount} de {students.length}.
          </p>
          <table className="school-table">
            <thead>
              <tr>
                <th>ESTUDIANTE</th>
                <th>ASISTENCIA</th>
                <th>JUSTIFICACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const entry = roll[s.id];
                if (!entry) return null;
                return (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td>
                      <button
                        type="button"
                        className={`tp-badge ${entry.present ? 'tp-badge--present' : 'tp-badge--absent'} school-toggle`}
                        onClick={() => update(s.id, { present: !entry.present })}
                      >
                        {entry.present ? 'Presente' : 'Ausente'}
                      </button>
                    </td>
                    <td>
                      <input
                        className="school-input"
                        disabled={entry.present}
                        placeholder={entry.present ? '' : 'Motivo (opcional)'}
                        value={entry.justification}
                        onChange={(e) => update(s.id, { justification: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="school-actions">
            <button className="tp-btn tp-btn--primary" onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar asistencia'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Calificaciones ─────────────────────────────────────────────────────────────

interface GradeEntry {
  score: string;
  observations: string;
  existingId?: number;
}

export const GradebookView: React.FC<CourseViewProps> = ({ course, students }) => {
  const [subjects, setSubjects] = useState<DashboardSubject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [evaluations, setEvaluations] = useState<DashboardEvaluation[]>([]);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [grades, setGrades] = useState<Record<string, GradeEntry>>({});
  const [showNew, setShowNew] = useState(false);
  const [newEval, setNewEval] = useState({ name: '', percentage: '', date: todayIso() });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setSubjectId(null);
    setEvaluations([]);
    setEvaluationId(null);
    schoolService
      .getSubjects(course.id)
      .then((list) => {
        setSubjects(list);
        setSubjectId(list[0]?.id ?? null);
      })
      .catch(() => setSubjects([]));
  }, [course.id]);

  const loadEvaluations = useCallback(async (id: number) => {
    const list = await schoolService.getEvaluations(id).catch(() => []);
    list.sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0));
    setEvaluations(list);
    return list;
  }, []);

  useEffect(() => {
    if (subjectId == null) return;
    setEvaluationId(null);
    loadEvaluations(subjectId).then((list) => setEvaluationId(list[0]?.id ?? null));
  }, [subjectId, loadEvaluations]);

  const loadGrades = useCallback(async () => {
    if (evaluationId == null) return;
    const existing = await schoolService.getGradesByEvaluation(evaluationId).catch(() => []);
    const byStudent = new Map(existing.map((g) => [String(g.studentId), g]));
    setGrades(
      Object.fromEntries(
        students.map((s) => {
          const grade = byStudent.get(s.id);
          return [s.id, { score: grade?.score != null ? String(grade.score) : '', observations: grade?.observations ?? '', existingId: grade?.id }];
        })
      )
    );
  }, [evaluationId, students]);

  useEffect(() => {
    setNotice(null);
    loadGrades();
  }, [loadGrades]);

  const createEvaluation = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (subjectId == null) return;
    try {
      const created = await schoolService.createEvaluation({
        name: newEval.name,
        percentage: Number(newEval.percentage),
        date: newEval.date,
        subjectId,
      });
      await loadEvaluations(subjectId);
      setEvaluationId(created.id);
      setShowNew(false);
      setNewEval({ name: '', percentage: '', date: todayIso() });
      setNotice({ type: 'ok', text: `Evaluación "${created.name}" creada.` });
    } catch {
      setNotice({ type: 'error', text: 'No se pudo crear la evaluación.' });
    }
  };

  const saveGrades = async (): Promise<void> => {
    if (evaluationId == null) return;
    const toSave = students.filter((s) => grades[s.id]?.score.trim());
    const invalid = toSave.filter((s) => {
      const score = Number(grades[s.id].score.replace(',', '.'));
      return Number.isNaN(score) || score < 1 || score > 7;
    });
    if (invalid.length > 0) {
      setNotice({ type: 'error', text: `Notas fuera de rango (1.0 a 7.0): ${invalid.map((s) => s.nombre).join(', ')}.` });
      return;
    }

    setSaving(true);
    setNotice(null);
    const results = await Promise.allSettled(
      toSave.map((s) =>
        schoolService.saveGrade({
          id: grades[s.id].existingId,
          studentId: Number(s.id),
          evaluationId,
          score: Number(grades[s.id].score.replace(',', '.')),
          observations: grades[s.id].observations || undefined,
        })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    setNotice(
      failed === 0
        ? { type: 'ok', text: `${toSave.length} nota(s) guardada(s).` }
        : { type: 'error', text: `No se pudieron guardar ${failed} nota(s).` }
    );
    setSaving(false);
    await loadGrades();
  };

  const evaluation = evaluations.find((e) => e.id === evaluationId);
  const update = (studentId: string, patch: Partial<GradeEntry>): void =>
    setGrades((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch } }));

  return (
    <div className="tp-card">
      <div className="tp-card-header">
        <h3>Calificaciones — {course.name}</h3>
      </div>
      <div className="school-filters">
        <label className="school-inline">
          Asignatura
          <select value={subjectId ?? ''} onChange={(e) => setSubjectId(Number(e.target.value))}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="school-inline">
          Evaluación
          <select
            value={evaluationId ?? ''}
            onChange={(e) => setEvaluationId(Number(e.target.value))}
            disabled={evaluations.length === 0}
          >
            {evaluations.length === 0 && <option value="">Sin evaluaciones</option>}
            {evaluations.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {formatDate(e.date)}
              </option>
            ))}
          </select>
        </label>
        <button className="tp-btn tp-btn--outline" onClick={() => setShowNew((v) => !v)} disabled={subjectId == null}>
          {showNew ? 'Cancelar' : '+ Nueva evaluación'}
        </button>
      </div>

      {showNew && (
        <form className="school-form school-form--row" onSubmit={createEvaluation}>
          <label className="school-field">
            Nombre
            <input required value={newEval.name} onChange={(e) => setNewEval({ ...newEval, name: e.target.value })} />
          </label>
          <label className="school-field">
            Ponderación (%)
            <input
              required
              type="number"
              min={1}
              max={100}
              value={newEval.percentage}
              onChange={(e) => setNewEval({ ...newEval, percentage: e.target.value })}
            />
          </label>
          <label className="school-field">
            Fecha
            <input required type="date" value={newEval.date} onChange={(e) => setNewEval({ ...newEval, date: e.target.value })} />
          </label>
          <div className="school-actions">
            <button type="submit" className="tp-btn tp-btn--primary">Crear evaluación</button>
          </div>
        </form>
      )}

      <NoticeBox notice={notice} />

      {students.length === 0 ? (
        <NoStudents course={course} />
      ) : !evaluation ? (
        <p className="school-empty">Crea o elige una evaluación para ingresar notas.</p>
      ) : (
        <>
          <p className="school-muted">
            {evaluation.name} · {formatDate(evaluation.date)} · ponderación {evaluation.percentage ?? '—'}% · escala 1.0 a 7.0
          </p>
          <table className="school-table">
            <thead>
              <tr>
                <th>ESTUDIANTE</th>
                <th>NOTA</th>
                <th>OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const entry = grades[s.id];
                if (!entry) return null;
                return (
                  <tr key={s.id}>
                    <td>{s.nombre}</td>
                    <td>
                      <input
                        className="school-input school-input--score"
                        inputMode="decimal"
                        placeholder="—"
                        value={entry.score}
                        onChange={(e) => update(s.id, { score: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="school-input"
                        value={entry.observations}
                        onChange={(e) => update(s.id, { observations: e.target.value })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="school-actions">
            <button className="tp-btn tp-btn--primary" onClick={saveGrades} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar notas'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Anotaciones ────────────────────────────────────────────────────────────────

export const AnnotationsManagerView: React.FC<CourseViewProps & { teacherId: string }> = ({
  course,
  students,
  teacherId,
}) => {
  const [studentId, setStudentId] = useState<string>('');
  const [annotations, setAnnotations] = useState<DashboardAnnotation[]>([]);
  const [form, setForm] = useState<{ type: 'POSITIVE' | 'NEGATIVE'; description: string }>({
    type: 'POSITIVE',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    setStudentId(students[0]?.id ?? '');
  }, [students]);

  const load = useCallback(async () => {
    if (!studentId) {
      setAnnotations([]);
      return;
    }
    const list = await schoolService.getAnnotationsByStudent(Number(studentId)).catch(() => []);
    setAnnotations(list.sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0)));
  }, [studentId]);

  useEffect(() => {
    setNotice(null);
    load();
  }, [load]);

  const create = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await schoolService.createAnnotation({
        studentId: Number(studentId),
        teacherId: Number(teacherId),
        type: form.type,
        description: form.description,
      });
      setForm({ ...form, description: '' });
      setNotice({ type: 'ok', text: 'Anotación registrada.' });
      await load();
    } catch {
      setNotice({ type: 'error', text: 'No se pudo registrar la anotación.' });
    } finally {
      setSaving(false);
    }
  };

  if (students.length === 0) {
    return (
      <div className="tp-card">
        <NoStudents course={course} />
      </div>
    );
  }

  return (
    <div className="tp-grid-2">
      <div className="tp-card">
        <div className="tp-card-header">
          <h3>Nueva anotación</h3>
        </div>
        <form className="school-form" onSubmit={create}>
          <label className="school-field">
            Estudiante
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </label>
          <div className="school-field">
            Tipo
            <div className="school-segmented">
              <button
                type="button"
                className={form.type === 'POSITIVE' ? 'school-segmented--on' : ''}
                onClick={() => setForm({ ...form, type: 'POSITIVE' })}
              >
                ✓ Positiva
              </button>
              <button
                type="button"
                className={form.type === 'NEGATIVE' ? 'school-segmented--on' : ''}
                onClick={() => setForm({ ...form, type: 'NEGATIVE' })}
              >
                ⚠ Negativa
              </button>
            </div>
          </div>
          <label className="school-field">
            Descripción
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <NoticeBox notice={notice} />
          <div className="school-actions">
            <button type="submit" className="tp-btn tp-btn--primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar anotación'}
            </button>
          </div>
        </form>
      </div>

      <div className="tp-card">
        <div className="tp-card-header">
          <h3>Historial del estudiante</h3>
          <span className="school-muted">{annotations.length}</span>
        </div>
        {annotations.length === 0 ? (
          <p className="school-empty">Sin anotaciones.</p>
        ) : (
          <div className="tp-list">
            {annotations.map((a) => (
              <div key={a.id} className="tp-list-item tp-list-item--annotation">
                <div className="tp-annotation-body">
                  <span className="tp-annotation-note">{a.description}</span>
                  <span className="tp-annotation-time">{formatDate(a.date)}</span>
                </div>
                <span className={a.type === 'POSITIVE' ? 'tp-icon--positive' : 'tp-icon--negative'}>
                  {a.type === 'POSITIVE' ? '✓' : '⚠'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
