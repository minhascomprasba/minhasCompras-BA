import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { ImportStatusPage } from '../pages/ImportStatusPage';
import { NotasPage } from '../pages/NotasPage';
import { NotaDetailPage } from '../pages/NotaDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MapPage } from '../pages/MapPage';
import { AuthenticatedLayout } from '../components/AuthenticatedLayout';
import { useAuth } from '../features/auth/AuthContext';
import { NotFoundPage } from '../pages/NotFoundPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}><div className="spinner"></div></div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
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
    path: '/esqueci-senha',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/redefinir-senha',
    element: <ResetPasswordPage />,
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
