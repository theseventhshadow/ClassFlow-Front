import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextType } from '@context';
import type { User } from '@services';
import { ProtectedRoute, type AccessDeniedState } from '../ProtectedRoute';

const auth = vi.hoisted(() => ({ current: {} as Partial<AuthContextType> }));

vi.mock('@context', () => ({ useAuth: () => auth.current }));

const teacher: User = {
  id: '7',
  nombre: 'Profe',
  email: 'profe@classflow.cl',
  rol: 'TEACHER',
  activo: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const AccessDeniedProbe: React.FC = () => {
  const state = useLocation().state as AccessDeniedState | null;
  return <p>denegado:{state?.reason}</p>;
};

const renderRoute = (allowedRoles?: User['rol'][]): void => {
  render(
    <MemoryRouter initialEntries={['/privado']}>
      <Routes>
        <Route
          path="/privado"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <p>contenido privado</p>
            </ProtectedRoute>
          }
        />
        <Route path="/access-denied" element={<AccessDeniedProbe />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    auth.current = { status: 'unauthenticated', user: null };
  });

  it('muestra la carga mientras se valida la sesión', () => {
    auth.current = { status: 'checking', user: null };
    renderRoute();

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
  });

  it('redirige a acceso denegado si no hay sesión', () => {
    renderRoute();
    expect(screen.getByText('denegado:NOT_AUTHENTICATED')).toBeInTheDocument();
  });

  it('redirige por permisos si el rol no está permitido', () => {
    auth.current = { status: 'authenticated', user: teacher };
    renderRoute(['ADMINISTRATOR']);

    expect(screen.getByText('denegado:INSUFFICIENT_PERMISSIONS')).toBeInTheDocument();
  });

  it('muestra el contenido si el rol está permitido', () => {
    auth.current = { status: 'authenticated', user: teacher };
    renderRoute(['TEACHER']);

    expect(screen.getByText('contenido privado')).toBeInTheDocument();
  });

  it('muestra el contenido a cualquier usuario autenticado si no se restringen roles', () => {
    auth.current = { status: 'authenticated', user: teacher };
    renderRoute();

    expect(screen.getByText('contenido privado')).toBeInTheDocument();
  });

  it('no valida contra el backend en cada navegación', () => {
    const validate = vi.fn();
    auth.current = { status: 'authenticated', user: teacher, validate };
    renderRoute(['TEACHER']);

    expect(validate).not.toHaveBeenCalled();
  });
});
