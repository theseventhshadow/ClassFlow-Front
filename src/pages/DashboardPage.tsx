import React from 'react';
import { useAuth } from '@context';

/**
 * Página de dashboard
 */
export const DashboardPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="page">
        <p>Por favor inicia sesión para ver el dashboard.</p>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <h1>Dashboard</h1>
      <p>Bienvenido, {user?.name}!</p>
    </div>
  );
};

export default DashboardPage;
