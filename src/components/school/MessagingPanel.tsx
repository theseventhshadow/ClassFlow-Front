import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardCourse, DashboardMessage, User, schoolService } from '@services';
import { formatDate, parseDate } from './format';

interface MessagingPanelProps {
  currentUserId: string;
  /** Usuarios a los que se puede escribir. */
  recipients: User[];
  /** Cursos para dirigir un aviso; sin cursos no se muestra la pestaña de avisos. */
  courses?: DashboardCourse[];
}

type Tab = 'inbox' | 'sent' | 'compose' | 'announce';

const ROLE_LABEL: Record<User['rol'], string> = {
  ADMINISTRATOR: 'Administrador',
  TEACHER: 'Docente',
  GUARDIAN: 'Apoderado',
  STUDENT: 'Estudiante',
};

/** Bandeja de entrada, enviados, redactar mensaje y publicar avisos. */
export const MessagingPanel: React.FC<MessagingPanelProps> = ({ currentUserId, recipients, courses }) => {
  const [tab, setTab] = useState<Tab>('inbox');
  const [inbox, setInbox] = useState<DashboardMessage[]>([]);
  const [sent, setSent] = useState<DashboardMessage[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({ receiverId: '', subject: '', body: '' });
  const [announcement, setAnnouncement] = useState({ title: '', content: '', courseId: '' });
  const [sending, setSending] = useState(false);

  const namesById = useMemo(() => new Map(recipients.map((u) => [u.id, u.nombre])), [recipients]);
  const sortedRecipients = useMemo(
    () => [...recipients].filter((u) => u.id !== currentUserId).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [recipients, currentUserId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [received, sentMessages] = await Promise.all([
        schoolService.getInbox(currentUserId),
        schoolService.getSent(currentUserId),
      ]);
      const byDate = (a: DashboardMessage, b: DashboardMessage): number =>
        (parseDate(b.sentAt)?.getTime() ?? 0) - (parseDate(a.sentAt)?.getTime() ?? 0);
      setInbox([...received].sort(byDate));
      setSent([...sentMessages].sort(byDate));
    } catch {
      setNotice({ type: 'error', text: 'No se pudieron cargar los mensajes.' });
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const openMessage = async (message: DashboardMessage): Promise<void> => {
    setOpenId((current) => (current === message.id ? null : message.id));
    if (tab !== 'inbox' || message.read) return;
    setInbox((list) => list.map((m) => (m.id === message.id ? { ...m, read: true } : m)));
    schoolService.markMessageAsRead(message.id).catch(() => undefined);
  };

  const send = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSending(true);
    setNotice(null);
    try {
      await schoolService.sendMessage({ senderId: currentUserId, ...form });
      setForm({ receiverId: '', subject: '', body: '' });
      setNotice({ type: 'ok', text: 'Mensaje enviado.' });
      await load();
      setTab('sent');
    } catch {
      setNotice({ type: 'error', text: 'No se pudo enviar el mensaje.' });
    } finally {
      setSending(false);
    }
  };

  const publish = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSending(true);
    setNotice(null);
    try {
      await schoolService.publishAnnouncement({
        title: announcement.title,
        content: announcement.content,
        courseId: announcement.courseId ? Number(announcement.courseId) : null,
        senderId: currentUserId,
      });
      setAnnouncement({ title: '', content: '', courseId: '' });
      setNotice({ type: 'ok', text: 'Aviso publicado.' });
    } catch {
      setNotice({ type: 'error', text: 'No se pudo publicar el aviso.' });
    } finally {
      setSending(false);
    }
  };

  const unread = inbox.filter((m) => !m.read).length;
  const list = tab === 'inbox' ? inbox : sent;

  return (
    <div className="tp-card">
      <div className="school-tabs">
        <button className={`school-tab${tab === 'inbox' ? ' school-tab--active' : ''}`} onClick={() => setTab('inbox')}>
          Recibidos{unread > 0 ? ` (${unread})` : ''}
        </button>
        <button className={`school-tab${tab === 'sent' ? ' school-tab--active' : ''}`} onClick={() => setTab('sent')}>
          Enviados
        </button>
        <button className={`school-tab${tab === 'compose' ? ' school-tab--active' : ''}`} onClick={() => setTab('compose')}>
          Redactar
        </button>
        {courses && (
          <button className={`school-tab${tab === 'announce' ? ' school-tab--active' : ''}`} onClick={() => setTab('announce')}>
            Publicar aviso
          </button>
        )}
      </div>

      {notice && <p className={`school-notice school-notice--${notice.type}`}>{notice.text}</p>}

      {(tab === 'inbox' || tab === 'sent') &&
        (loading ? (
          <p className="school-empty">Cargando mensajes...</p>
        ) : list.length === 0 ? (
          <p className="school-empty">{tab === 'inbox' ? 'No tienes mensajes recibidos.' : 'No has enviado mensajes.'}</p>
        ) : (
          <div className="school-messages">
            {list.map((m) => {
              const otherId = String(tab === 'inbox' ? m.senderId : m.receiverId);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`school-message${tab === 'inbox' && !m.read ? ' school-message--unread' : ''}`}
                  onClick={() => openMessage(m)}
                >
                  <span className="school-message-top">
                    <span className="school-message-subject">{m.subject}</span>
                    <span className="school-muted">{formatDate(m.sentAt)}</span>
                  </span>
                  <span className="school-muted">
                    {tab === 'inbox' ? 'De' : 'Para'}: {namesById.get(otherId) ?? `Usuario ${otherId}`}
                  </span>
                  {openId === m.id && <span className="school-message-body">{m.body}</span>}
                </button>
              );
            })}
          </div>
        ))}

      {tab === 'compose' && (
        <form className="school-form" onSubmit={send}>
          <label className="school-field">
            Para
            <select
              required
              value={form.receiverId}
              onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
            >
              <option value="">Selecciona un destinatario</option>
              {sortedRecipients.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} — {ROLE_LABEL[u.rol]}{u.subject ? ` (${u.subject})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="school-field">
            Asunto
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="school-field">
            Mensaje
            <textarea required rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </label>
          <div className="school-actions">
            <button type="submit" className="tp-btn tp-btn--primary" disabled={sending}>
              {sending ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </div>
        </form>
      )}

      {tab === 'announce' && courses && (
        <form className="school-form" onSubmit={publish}>
          <label className="school-field">
            Dirigido a
            <select
              value={announcement.courseId}
              onChange={(e) => setAnnouncement({ ...announcement, courseId: e.target.value })}
            >
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="school-field">
            Título
            <input
              required
              value={announcement.title}
              onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            />
          </label>
          <label className="school-field">
            Contenido
            <textarea
              required
              rows={4}
              value={announcement.content}
              onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
            />
          </label>
          <div className="school-actions">
            <button type="submit" className="tp-btn tp-btn--primary" disabled={sending}>
              {sending ? 'Publicando...' : 'Publicar aviso'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
