import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react';
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
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      </header>
  );
}
