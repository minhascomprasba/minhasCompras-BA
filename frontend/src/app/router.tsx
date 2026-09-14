import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { ImportStatusPage } from '../pages/ImportStatusPage';
import { NotasPage } from '../pages/NotasPage';
import { NotaDetailPage } from '../pages/NotaDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ConfirmEmailPage } from '../pages/ConfirmEmailPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AdminPage } from '../pages/AdminPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { MapPage } from '../pages/MapPage';
import { AuthenticatedLayout } from '../components/AuthenticatedLayout';
import { useAuth } from '../features/auth/AuthContext';
import { NotFoundPage } from '../pages/NotFoundPage';

function RouteSpinner() {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <div className="spinner"></div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteSpinner />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ requireSuperAdmin = false }: { requireSuperAdmin?: boolean }) {
  const { isAuthenticated, isLoading, isAdmin, isSuperAdmin } = useAuth();

  if (isLoading) {
    return <RouteSpinner />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requireSuperAdmin ? !isSuperAdmin : !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthenticatedLayout />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/confirmar-email',
    element: <ConfirmEmailPage />,
  },
  {
    path: '/esqueci-senha',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/redefinir-senha',
    element: <ResetPasswordPage />,
  },
  {
    path: '/admin',
    element: <AdminRoute />,
    children: [{ index: true, element: <AdminPage /> }],
  },
  {
    path: '/admin/usuarios',
    element: <AdminRoute requireSuperAdmin />,
    children: [{ index: true, element: <AdminUsersPage /> }],
  },
  {
    element: <PrivateRoute><AuthenticatedLayout /></PrivateRoute>,
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/importar',
        element: <ImportPage />,
      },
      {
        path: '/importacoes/:importId',
        element: <ImportStatusPage />,
      },
      {
        path: '/notas',
        element: <NotasPage />,
      },
      {
        path: '/mapa',
        element: <MapPage />,
      },
      {
        path: '/notas/:notaId',
        element: <NotaDetailPage />,
      },
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />,
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
