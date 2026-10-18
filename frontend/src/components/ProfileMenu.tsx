import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { ROLE_LABELS } from '../features/auth/authService';
import './ProfileMenu.css';

export function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);
  const initials = (user?.email?.[0] ?? 'U').toLocaleUpperCase('pt-BR');

  useEffect(() => {
    if (!open) return;
    logoutRef.current?.focus();
    const handlePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div data-scope="profile-menu" className="profile-menu" ref={containerRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button
        ref={buttonRef}
        type="button"
        className="profile-avatar"
        aria-label={open ? 'Fechar perfil' : 'Abrir perfil'}
        aria-expanded={open}
        aria-controls="profile-popover"
        onClick={() => setOpen((value) => !value)}
      >
        {initials}
      </button>
      {open && (
        <section id="profile-popover" className="profile-popover" aria-label="Meu perfil">
          <h2>Meu perfil</h2>
          <dl className="profile-details">
            <dt>Perfil de acesso</dt>
            <dd>{role && <span className={`role-badge role-badge--${role.toLowerCase()}`}>{ROLE_LABELS[role]}</span>}</dd>
            <dt>E-mail</dt>
            <dd>{user?.email}</dd>
          </dl>
          <button ref={logoutRef} type="button" onClick={onLogout} className="btn btn-secondary profile-logout">
            Sair
          </button>
        </section>
      )}
    </div>
  );
}
