import type { ReactNode } from 'react';
import './AuthCard.css';

export function AuthCard({ title, subtitle, children }: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="auth-card">
      <div className="auth-card-icon">
        <img src="/icon.png" alt="Minhas Compras BA" />
      </div>
      <h1 className="auth-title">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
      {children}
    </div>
  );
}

export function AuthCardFooter({ children }: { children: ReactNode }) {
  return <div className="auth-footer-link">{children}</div>;
}
