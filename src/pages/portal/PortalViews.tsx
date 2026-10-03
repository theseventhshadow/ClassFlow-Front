import React, { useState } from 'react';
import { DashboardEvaluation, DashboardGrade, DashboardMessage, PortalData, portalService } from '@services';
import { formatDate, formatScore, parseDate } from '@components/school/format';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Escala chilena 1.0–7.0: bajo 4.0 está reprobado. */
function scoreClass(score?: number | null): string {
  if (score == null) return 'portal-grade';
  return score < 4 ? 'portal-grade portal-grade--low' : 'portal-grade portal-grade--ok';
}

/** Promedio ponderado por el porcentaje de cada evaluación; si no hay porcentajes, promedio simple. */
function weightedAverage(rows: { score?: number | null; weight?: number | null }[]): number | null {
  const graded = rows.filter((r) => r.score != null);
  if (graded.length === 0) return null;
  const totalWeight = graded.reduce((sum, r) => sum + (r.weight ?? 0), 0);
  if (totalWeight > 0) {
    return graded.reduce((sum, r) => sum + (r.score as number) * (r.weight ?? 0), 0) / totalWeight;
  }
  return graded.reduce((sum, r) => sum + (r.score as number), 0) / graded.length;
}

interface GradeRow {
  grade: DashboardGrade;
  evaluation: DashboardEvaluation | undefined;
}

interface SubjectGrades {
  subjectId: number | null;
  subjectName: string;
  rows: GradeRow[];
  average: number | null;
}

function groupGradesBySubject(data: PortalData): SubjectGrades[] {
  const evaluationsById = new Map(data.evaluations.map((e) => [e.id, e]));
  const subjectsById = new Map(data.subjects.map((s) => [s.id, s]));
  const groups = new Map<number | null, GradeRow[]>();

  for (const grade of data.grades) {
    const evaluation = grade.evaluationId != null ? evaluationsById.get(grade.evaluationId) : undefined;
    const subjectId = evaluation?.subjectId ?? null;
    groups.set(subjectId, [...(groups.get(subjectId) ?? []), { grade, evaluation }]);
  }

  return [...groups.entries()]
    .map(([subjectId, rows]) => ({
      subjectId,
      subjectName: subjectId != null ? subjectsById.get(subjectId)?.name ?? `Asignatura ${subjectId}` : 'Otras evaluaciones',
      rows,
      average: weightedAverage(rows.map((r) => ({ score: r.grade.score, weight: r.evaluation?.percentage }))),
    }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

function overallAverage(data: PortalData): number | null {
  return weightedAverage(groupGradesBySubject(data).map((g) => ({ score: g.average, weight: 1 })));
}

function attendanceRate(data: PortalData): number | null {
  if (data.attendances.length === 0) return null;
  return Math.round((data.attendances.filter((a) => a.present).length / data.attendances.length) * 100);
}

const EmptyState: React.FC<{ text: string }> = ({ text }) => <p className="portal-empty">{text}</p>;

// ── Resumen ────────────────────────────────────────────────────────────────────

export const SummaryView: React.FC<{ data: PortalData; onNavigate: (view: string) => void }> = ({ data, onNavigate }) => {
  const average = overallAverage(data);
  const attendance = attendanceRate(data);
  const positives = data.annotations.filter((a) => a.type === 'POSITIVE').length;
  const negatives = data.annotations.length - positives;
  const unread = data.messages.filter((m) => !m.read).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = data.evaluations
    .filter((e) => (parseDate(e.date)?.getTime() ?? 0) >= today.getTime())
    .sort((a, b) => (parseDate(a.date)?.getTime() ?? 0) - (parseDate(b.date)?.getTime() ?? 0))
    .slice(0, 5);
  const subjectsById = new Map(data.subjects.map((s) => [s.id, s.name]));

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Promedio general</span>
            <span className="stat-value">{formatScore(average)}</span>
            <span className={`stat-change ${average != null && average < 4 ? 'warning' : 'neutral'}`}>
              {data.grades.length} notas registradas
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Asistencia</span>
            <span className="stat-value">{attendance == null ? '—' : `${attendance}%`}</span>
            <span className={`stat-change ${attendance != null && attendance < 85 ? 'warning' : 'neutral'}`}>
              {data.attendances.length} clases registradas
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Anotaciones</span>
            <span className="stat-value">{data.annotations.length}</span>
            <span className="stat-change neutral">{positives} positivas · {negatives} negativas</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-left">
            <span className="stat-label">Mensajes sin leer</span>
            <span className="stat-value">{unread}</span>
            <span className="stat-change neutral">{data.messages.length} recibidos</span>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="content-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Próximas evaluaciones</h2>
              <button className="dash-card-link" onClick={() => onNavigate('Notas')}>Ver notas</button>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState text="No hay evaluaciones próximas." />
            ) : (
              <div className="activity-list">
                {upcoming.map((e) => (
                  <div key={e.id} className="activity-item">
                    <div className="activity-content">
                      <span className="activity-text">{e.name} — {subjectsById.get(e.subjectId ?? -1) ?? 'Asignatura'}</span>
                      <span className="activity-time">{formatDate(e.date)}{e.percentage != null ? ` · ${e.percentage}%` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="content-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-card-title">Últimos avisos</h2>
              <button className="dash-card-link" onClick={() => onNavigate('Avisos')}>Ver todos</button>
            </div>
            {data.announcements.length === 0 ? (
              <EmptyState text="No hay avisos." />
            ) : (
              <div className="activity-list">
                {data.announcements.slice(0, 4).map((a) => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-content">
                      <span className="activity-text">{a.title}</span>
                      <span className="activity-time">{formatDate(a.publishedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Notas ──────────────────────────────────────────────────────────────────────

export const GradesView: React.FC<{ data: PortalData }> = ({ data }) => {
  const groups = groupGradesBySubject(data);
  if (groups.length === 0) {
    return <div className="dash-card"><EmptyState text="Aún no hay notas registradas." /></div>;
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.subjectId ?? 'otras'} className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-card-title">{group.subjectName}</h2>
            <span className={scoreClass(group.average)}>Promedio {formatScore(group.average)}</span>
          </div>
          <table className="users-table">
            <thead>
              <tr>
                <th>EVALUACIÓN</th>
                <th>FECHA</th>
                <th>PONDERACIÓN</th>
                <th>NOTA</th>
                <th>OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map(({ grade, evaluation }) => (
                <tr key={grade.id}>
                  <td>{evaluation?.name ?? `Evaluación ${grade.evaluationId ?? ''}`}</td>
                  <td><span className="access-time">{formatDate(evaluation?.date)}</span></td>
                  <td>{evaluation?.percentage != null ? `${evaluation.percentage}%` : '—'}</td>
                  <td><span className={scoreClass(grade.score)}>{formatScore(grade.score)}</span></td>
                  <td><span className="access-time">{grade.observations || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
};

// ── Asistencia ─────────────────────────────────────────────────────────────────

export const AttendanceView: React.FC<{ data: PortalData }> = ({ data }) => {
  const rate = attendanceRate(data);
  const records = [...data.attendances].sort(
    (a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0)
  );

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h2 className="dash-card-title">Asistencia</h2>
        {rate != null && <span className="attendance-pct">{rate}% de asistencia</span>}
      </div>
      {rate != null && (
        <div className="progress-bar-track portal-progress">
          <div
            className={`progress-bar-fill ${rate < 75 ? 'progress-low' : rate < 85 ? 'progress-mid' : 'progress-high'}`}
            style={{ width: `${rate}%` }}
          />
        </div>
      )}
      {records.length === 0 ? (
        <EmptyState text="Aún no hay registros de asistencia." />
      ) : (
        <table className="users-table">
          <thead>
            <tr>
              <th>FECHA</th>
              <th>ESTADO</th>
              <th>JUSTIFICACIÓN</th>
            </tr>
          </thead>
          <tbody>
            {records.map((a) => (
              <tr key={a.id}>
                <td>{formatDate(a.date)}</td>
                <td>
                  <span className={a.present ? 'status-badge status-activo' : 'status-badge status-inactivo'}>
                    {a.present ? 'Presente' : 'Ausente'}
                  </span>
                </td>
                <td><span className="access-time">{a.justification || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ── Anotaciones ────────────────────────────────────────────────────────────────

export const AnnotationsView: React.FC<{ data: PortalData }> = ({ data }) => {
  const annotations = [...data.annotations].sort(
    (a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0)
  );

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h2 className="dash-card-title">Anotaciones</h2>
      </div>
      {annotations.length === 0 ? (
        <EmptyState text="No hay anotaciones registradas." />
      ) : (
        <div className="alerts-list">
          {annotations.map((a) => {
            const positive = a.type === 'POSITIVE';
            return (
              <div key={a.id} className="alert-item">
                <div className={`alert-icon ${positive ? 'alert-info' : 'alert-danger'}`}>{positive ? '+' : '−'}</div>
                <div className="alert-content">
                  <span className="alert-text">{a.description}</span>
                  <span className="alert-detail">
                    {positive ? 'Positiva' : 'Negativa'} · {formatDate(a.date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Mensajes ───────────────────────────────────────────────────────────────────

export const MessagesView: React.FC<{ data: PortalData; onRead: () => void }> = ({ data, onRead }) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const messages = [...data.messages].sort(
    (a, b) => (parseDate(b.sentAt)?.getTime() ?? 0) - (parseDate(a.sentAt)?.getTime() ?? 0)
  );

  const isRead = (m: DashboardMessage): boolean => Boolean(m.read) || readIds.has(m.id);

  const toggle = async (message: DashboardMessage): Promise<void> => {
    setOpenId((current) => (current === message.id ? null : message.id));
    if (isRead(message)) return;
    setReadIds((ids) => new Set(ids).add(message.id));
    try {
      await portalService.markMessageAsRead(message.id);
      onRead();
    } catch {
      // Si falla, el mensaje se vuelve a mostrar como no leído al recargar.
    }
  };

  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <h2 className="dash-card-title">Mensajes recibidos</h2>
      </div>
      {messages.length === 0 ? (
        <EmptyState text="No tienes mensajes." />
      ) : (
        <div className="portal-messages">
          {messages.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`portal-message${isRead(m) ? '' : ' portal-message--unread'}`}
              onClick={() => toggle(m)}
            >
              <span className="portal-message-top">
                <span className="activity-text">{m.subject}</span>
                <span className="activity-time">{formatDate(m.sentAt)}</span>
              </span>
              {openId === m.id && <span className="portal-message-body">{m.body}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Avisos ─────────────────────────────────────────────────────────────────────

export const AnnouncementsView: React.FC<{ data: PortalData }> = ({ data }) => (
  <div className="dash-card">
    <div className="dash-card-header">
      <h2 className="dash-card-title">Avisos</h2>
    </div>
    {data.announcements.length === 0 ? (
      <EmptyState text="No hay avisos." />
    ) : (
      <div className="activity-list">
        {data.announcements.map((a) => (
          <div key={a.id} className="activity-item">
            <div className="activity-content">
              <span className="activity-text">{a.title}</span>
              <span className="portal-message-body">{a.content}</span>
              <span className="activity-time">{formatDate(a.publishedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
