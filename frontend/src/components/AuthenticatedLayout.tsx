import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ROLE_LABELS } from '../features/auth/authService';

export function AuthenticatedLayout() {
  const { user, logout, role, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link ${isActive ? 'nav-link--active' : ''}`;

  return (
    <div className="app-layout-wrapper">
      <header className="app-navbar">
        <div className="navbar-container">
          <NavLink to="/dashboard" className="navbar-logo" onClick={closeMenu}>
            <img src="/icon.png" alt="" className="brand-icon" />
            <span className="logo-text">MinhasCompras.app</span>
          </NavLink>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          <div className={`navbar-menu ${menuOpen ? 'navbar-menu--open' : ''}`}>
            <nav className="navbar-nav">
              <NavLink to="/dashboard" className={navLinkClass} onClick={closeMenu}>
                Dashboard
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass} onClick={closeMenu} end>
                  Admin
                </NavLink>
              )}
              {isSuperAdmin && (
                <NavLink to="/admin/usuarios" className={navLinkClass} onClick={closeMenu}>
                  Usuários
                </NavLink>
              )}
              <NavLink to="/notas" className={navLinkClass} onClick={closeMenu}>
                Notas
              </NavLink>
              <NavLink to="/mapa" className={navLinkClass} onClick={closeMenu}>
                Mapa
              </NavLink>
              <NavLink to="/importar" className={navLinkClass} onClick={closeMenu}>
                Importar
              </NavLink>
            </nav>

            <div className="navbar-user">
              <span className="user-email" title={user?.email || ''}>
                {user?.email ? (user.email.length > 24 ? `${user.email.substring(0, 21)}...` : user.email) : ''}
              </span>
              {role && role !== 'USER' && (
                <span className={`role-badge role-badge--${role.toLowerCase()}`}>{ROLE_LABELS[role]}</span>
              )}
              <button onClick={handleLogout} className="btn btn-secondary btn-sm btn-logout">
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} Minhas Compras BA. Todos os direitos reservados.
      </footer>
    </div>
  );
}
