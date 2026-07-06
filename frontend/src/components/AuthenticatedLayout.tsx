import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-navbar">
        <div className="navbar-container">
          <NavLink to="/dashboard" className="navbar-logo">
            <img src="/icon.png" alt="" className="brand-icon" />
            <span className="logo-text">MinhasCompras.app</span>
          </NavLink>
          
          <nav className="navbar-nav">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/notas"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Notas
            </NavLink>
            <NavLink
              to="/mapa"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Mapa
            </NavLink>
            <NavLink
              to="/importar"
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              Importar
            </NavLink>
          </nav>

          <div className="navbar-user">
            <span className="user-email" title={user?.email || ''}>
              {user?.email ? (user.email.length > 20 ? `${user.email.substring(0, 17)}...` : user.email) : ''}
            </span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: '1 0 auto' }}>
        <Outlet />
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '1.5rem', 
        color: 'var(--text-muted)', 
        fontSize: '0.85rem',
        borderTop: '1px solid var(--border-color)',
        marginTop: 'auto'
      }}>
        &copy; {new Date().getFullYear()} Minhas Compras BA. Todos os direitos reservados.
      </footer>
    </div>
  );
}
