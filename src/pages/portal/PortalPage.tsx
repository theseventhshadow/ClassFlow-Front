import React, { useState } from 'react';
import '../DashboardPage.css';
import { useAuth } from '@context';
import { Loading, Error as ErrorState, LogoutModal, Icon } from '@components/common';
import { useLogout, usePortalData } from '@hooks';
import { humanizeRole } from '@utils';
import {
  AnnotationsView,
  AnnouncementsView,
  AttendanceView,
  GradesView,
  MessagesView,
  SummaryView,
} from './PortalViews';

type PortalView = 'Resumen' | 'Notas' | 'Asistencia' | 'Anotaciones' | 'Mensajes' | 'Avisos';

interface PortalPageProps {
  /** Título del panel ("Panel Estudiante", "Panel Apoderado"). */
  title: string;
}

/**
 * Portal de estudiantes y apoderados: cada opción del menú muestra los datos reales
 * del estudiante. El apoderado elige a cuál de sus pupilos ver.
 */
export const PortalPage: React.FC<PortalPageProps> = ({ title }) => {
  const [activeNav, setActiveNav] = useState<PortalView>('Resumen');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user } = useAuth();
  const handleLogout = useLogout();
  const { data, loading, error, students, selectedStudentId, selectStudent, refetch } = usePortalData();

  const isGuardian = user?.rol === 'GUARDIAN';
  const initials = user?.nombre
    ? user.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';
  const displayRole = humanizeRole(user?.rol);
  const unreadMessages = data?.messages.filter((m) => !m.read).length ?? 0;

  const navSections: { section: string; items: { label: PortalView; icon: React.ReactNode }[] }[] = [
    {
      section: isGuardian ? 'MI ESTUDIANTE' : 'MI CURSO',
      items: [
        { label: 'Resumen', icon: <Icon.Grid /> },
        { label: 'Notas', icon: <Icon.Book /> },
        { label: 'Asistencia', icon: <Icon.Check /> },
        { label: 'Anotaciones', icon: <Icon.Edit /> },
      ],
    },
    {
      section: 'COMUNICACIÓN',
      items: [
        { label: 'Mensajes', icon: <Icon.Mail /> },
        { label: 'Avisos', icon: <Icon.Bell /> },
      ],
    },
  ];

  const renderView = (): React.ReactNode => {
    // Solo la primera carga reemplaza la vista; las recargas (p. ej. al leer un mensaje) la mantienen.
    if (loading && !data) return <Loading message="Cargando datos..." />;
    if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
    if (!data) return null;

    switch (activeNav) {
      case 'Notas':
        return <GradesView data={data} />;
      case 'Asistencia':
        return <AttendanceView data={data} />;
      case 'Anotaciones':
        return <AnnotationsView data={data} />;
      case 'Mensajes':
        return <MessagesView data={data} onRead={refetch} />;
      case 'Avisos':
        return <AnnouncementsView data={data} />;
      default:
        return <SummaryView data={data} onNavigate={(view) => setActiveNav(view as PortalView)} />;
    }
  };

  return (
    <div className={`dashboard-layout${isGuardian ? ' dashboard-layout--guardian' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-name">
            <div className="sidebar-brand-icon">CF</div>
            ClassFlow
          </div>
          <div className="sidebar-role">{displayRole || 'Usuario'}</div>
          <div className="sidebar-email">{user?.email ?? ''}</div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(({ section, items }) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {items.map((item) => (
                <button
                  key={item.label}
                  className={`sidebar-nav-item${activeNav === item.label ? ' active' : ''}`}
                  onClick={() => setActiveNav(item.label)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.label === 'Mensajes' && unreadMessages > 0 && (
                    <span className="nav-badge">{unreadMessages}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{user?.nombre ?? 'Usuario'}</div>
            <div className="sidebar-user-role">{displayRole || 'Usuario'}</div>
          </div>
          <button
            className="dashboard-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            ⏻
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h1 className="dashboard-title">{activeNav === 'Resumen' ? title : activeNav}</h1>
            <span className="dashboard-subtitle">
              {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} &mdash; Bienvenido, {user?.nombre ? user.nombre.split(' ')[0] : 'Usuario'}
              {data?.course ? ` · ${data.course.name}` : ''}
            </span>
          </div>
          {isGuardian && students.length > 0 && (
            <div className="dashboard-actions">
              <label className="portal-student-select">
                Estudiante
                <select value={selectedStudentId ?? ''} onChange={(event) => selectStudent(event.target.value)}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </header>

        <div className="dashboard-body">{renderView()}</div>
      </div>

      <LogoutModal open={showLogoutModal} onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogout} />
    </div>
  );
};
