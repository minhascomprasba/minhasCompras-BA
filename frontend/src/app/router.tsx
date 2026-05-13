import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { ImportStatusPage } from '../pages/ImportStatusPage';
import { NotasPage } from '../pages/NotasPage';
import { NotaDetailPage } from '../pages/NotaDetailPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
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
    path: '/notas/:notaId',
    element: <NotaDetailPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
