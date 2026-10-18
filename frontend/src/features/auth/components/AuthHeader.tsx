import { Link } from 'react-router-dom';
import './AuthHeader.css';

export function AuthHeader({ backTo = '/', backLabel = 'Voltar para a Home' }: {
  backTo?: string;
  backLabel?: string;
}) {
  return (
      <header className="auth-header">
        <Link to="/" className="auth-logo">
          <img src="/icon.png" alt="" className="brand-icon" />
          <span>MinhasCompras.app</span>
        </Link>
        <Link to={backTo} className="auth-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>{backLabel}</span>
        </Link>
      </header>
  );
}
