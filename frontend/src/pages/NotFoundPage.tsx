import { ShoppingBag } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import './NotFoundPage.css';

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div data-scope="not-found" className="not-found-container">
      <Card className="not-found-content">
        {/* Ilustração temática: Sacola de compras com uma Lupa */}
        <div className="not-found-illustration-wrapper">
          <ShoppingBag size={120} className="not-found-illustration" aria-hidden="true" />
        </div>

        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Página não encontrada</h2>
        <p className="not-found-text">
          A página que você procura não existe ou foi removida.
        </p>

        <div className="not-found-actions">
          <Button
            render={<Link to={isAuthenticated ? '/dashboard' : '/'} />}
            nativeButton={false}
            className="btn btn-primary btn-neon"
          >
            {isAuthenticated ? 'Ir para o Dashboard' : 'Ir para a Página Inicial'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
