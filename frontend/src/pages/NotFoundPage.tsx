import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        {/* Ilustração temática: Sacola de compras com uma Lupa */}
        <div className="not-found-illustration-wrapper">
          <svg 
            className="not-found-illustration" 
            width="120" 
            height="120" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
            <circle cx="18" cy="18" r="3" stroke="var(--primary)" strokeWidth="2" fill="var(--bg-main)"></circle>
            <line x1="20.1" y1="20.1" x2="22.5" y2="22.5" stroke="var(--primary)" strokeWidth="2.5"></line>
          </svg>
        </div>

        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Página não encontrada</h2>
        <p className="not-found-text">
          A página que você procura não existe ou foi removida.
        </p>

        <div className="not-found-actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary btn-neon">
              Ir para o Dashboard
            </Link>
          ) : (
            <Link to="/" className="btn btn-primary btn-neon">
              Ir para a Página Inicial
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
