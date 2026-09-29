import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@context';
import { UserRole } from '@services';
import { ROUTES } from '@constants';
import { Loading } from './Loading';

export type AccessDenialReason = 'NOT_AUTHENTICATED' | 'INSUFFICIENT_PERMISSIONS';

export interface AccessDeniedState {
  reason: AccessDenialReason;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Protege una ruta según la sesión validada por AuthProvider y, opcionalmente, el rol.
 * No consulta al backend: la validación ocurre una vez al arrancar y ante cualquier 401.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { status, user } = useAuth();

  if (status === 'checking') {
    return <Loading />;
  }

  if (status !== 'authenticated' || !user) {
    const state: AccessDeniedState = { reason: 'NOT_AUTHENTICATED' };
    return <Navigate to={ROUTES.ACCESS_DENIED} replace state={state} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    const state: AccessDeniedState = { reason: 'INSUFFICIENT_PERMISSIONS' };
    return <Navigate to={ROUTES.ACCESS_DENIED} replace state={state} />;
  }

  return <>{children}</>;
};
