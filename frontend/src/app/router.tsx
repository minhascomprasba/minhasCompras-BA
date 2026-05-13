import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { ImportStatusPage } from '../pages/ImportStatusPage';

const NotasPage = () => <div>Notas Page</div>;
const NotaDetailPage = () => <div>Nota Detail Page</div>;

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
