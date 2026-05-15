import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { ImportStatusPage } from '../pages/ImportStatusPage';
import { NotasPage } from '../pages/NotasPage';
import { NotaDetailPage } from '../pages/NotaDetailPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { useAuth } from '../features/auth/AuthContext';

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
    path: '/importar',
    element: <PrivateRoute><ImportPage /></PrivateRoute>,
  },
  {
    path: '/importacoes/:importId',
    element: <PrivateRoute><ImportStatusPage /></PrivateRoute>,
  },
  {
    path: '/notas',
    element: <PrivateRoute><NotasPage /></PrivateRoute>,
  },
  {
    path: '/notas/:notaId',
    element: <PrivateRoute><NotaDetailPage /></PrivateRoute>,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
