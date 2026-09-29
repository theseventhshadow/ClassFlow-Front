import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@components/layout';
import { Loading } from '@components/common/Loading';
import { ProtectedRoute } from '@components/common/ProtectedRoute';
import { useAuth } from '@context';
import { ROUTES, getDashboardRouteByRole } from '@constants';

// Cada página se descarga solo cuando se visita, para aligerar la carga inicial.
const LoginPage = lazy(() => import('@pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import('@pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() =>
  import('@pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const AccessDeniedPage = lazy(() =>
  import('@pages/AccessDeniedPage').then((m) => ({ default: m.AccessDeniedPage })));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AdminDashboard = lazy(() =>
  import('@pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const TeacherAccountPage = lazy(() =>
  import('@pages/TeacherAccountPage').then((m) => ({ default: m.TeacherAccountPage })));
const StudentDashboardPage = lazy(() =>
  import('@pages/StudentDashboardPage').then((m) => ({ default: m.StudentDashboardPage })));
const GuardianDashboardPage = lazy(() =>
  import('@pages/GuardianDashboardPage').then((m) => ({ default: m.GuardianDashboardPage })));

/** Redirects /dashboard to the correct role-specific dashboard */
const DashboardRedirect: React.FC = () => {
  const { user, status } = useAuth();

  if (status === 'checking') {
    return <Loading />;
  }

  return <Navigate to={getDashboardRouteByRole(user?.rol)} replace />;
};

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          <Route path={ROUTES.ACCESS_DENIED} element={<AccessDeniedPage />} />

          <Route
            path={ROUTES.DASHBOARD_ADMIN}
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DASHBOARD_TEACHER}
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <TeacherAccountPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DASHBOARD_STUDENT}
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path={ROUTES.DASHBOARD_GUARDIAN}
            element={
              <ProtectedRoute allowedRoles={['GUARDIAN']}>
                <GuardianDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path={ROUTES.DASHBOARD} element={<DashboardRedirect />} />

          <Route element={<Layout />}>
            <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
