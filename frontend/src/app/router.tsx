import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { ImportStatusPage } from '../pages/ImportStatusPage';
import { NotasPage } from '../pages/NotasPage';
import { NotaDetailPage } from '../pages/NotaDetailPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ConfirmEmailPage } from '../pages/auth/ConfirmEmailPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { DashboardPage as UserDashboardPage } from '../pages/DashboardPage';
import { DashboardPage as AdminDashboardPage } from '../pages/admin/DashboardPage';
import { UsersPage } from '../pages/admin/UsersPage';
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
    children: [{ index: true, element: <AdminDashboardPage /> }],
  },
  {
    path: '/admin/usuarios',
    element: <AdminRoute requireSuperAdmin />,
    children: [{ index: true, element: <UsersPage /> }],
  },
  {
    element: <PrivateRoute><AuthenticatedLayout /></PrivateRoute>,
    children: [
      {
        path: '/dashboard',
        element: <UserDashboardPage />,
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
