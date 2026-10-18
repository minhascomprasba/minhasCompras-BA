import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ProfileMenu } from './ProfileMenu';
import { QuickScan } from './QuickScan';
import { ListIcon as Menu, XIcon as X } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from './ui/navigation-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import './AppShell.css';

export function AuthenticatedLayout() {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    let previousScrollY = Math.max(0, window.scrollY);

    const handleScroll = () => {
      const scrollY = Math.max(0, window.scrollY);
      if (scrollY <= 70) {
        setHeaderHidden(false);
      } else if (Math.abs(scrollY - previousScrollY) < 8) {
        return;
      } else {
        setHeaderHidden(scrollY > previousScrollY);
      }
      previousScrollY = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/');
  };

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/notas', label: 'Notas' },
    { to: '/mapa', label: 'Mapa' },
    { to: '/importar', label: 'Importar' },
    ...(isAdmin ? [{ to: '/admin', label: 'Gestão' }] : []),
  ];

  return (
    <div data-scope="app-shell" className="app-shell-theme app-layout-wrapper">
      <header className={`app-navbar${headerHidden && !menuOpen ? ' app-navbar--hidden' : ''}`}>
        <div className="navbar-container">
          <NavLink to="/dashboard" className="navbar-logo" aria-label="Minhas Compras BA — Dashboard" title="Minhas Compras BA">
            <img src="/icon.png" alt="" className="brand-icon" />
          </NavLink>

          <NavigationMenu className="shell-desktop-nav" aria-label="Navegação principal">
            <NavigationMenuList className="m-0 p-0 gap-1">
              {links.filter(({ to }) => to !== '/admin').map(({ to, label }) => (
                <NavigationMenuItem key={to}>
                  <NavigationMenuLink
                    render={<NavLink to={to} />}
                    className="h-11 px-3 text-muted-foreground hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
                  >
                    {label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" nativeButton={false} render={<NavLink to="/admin" />} className="shell-admin-link h-11 text-muted-foreground">
                Gestão
              </Button>
            )}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger render={<Button variant="ghost" size="icon" className="shell-mobile-toggle size-11" />} aria-label="Abrir menu">
                <Menu aria-hidden="true" />
              </SheetTrigger>
              <SheetContent className="app-shell-theme overflow-y-auto pt-[var(--safe-top)] pb-[var(--safe-bottom)]" showCloseButton={false}>
                <SheetHeader className="pr-16">
                  <SheetTitle>Minhas Compras BA</SheetTitle>
                  <SheetDescription>Navegue pelas suas compras.</SheetDescription>
                </SheetHeader>
                <SheetClose render={<Button variant="ghost" size="icon" className="absolute right-3 top-[calc(var(--safe-top)+0.75rem)] size-11" />} aria-label="Fechar menu">
                  <X aria-hidden="true" />
                </SheetClose>
                <nav aria-label="Navegação principal" className="flex flex-col gap-1 px-4">
                  {links.map(({ to, label }) => (
                    <Button key={to} variant="ghost" nativeButton={false} render={<NavLink to={to} />} onClick={closeMenu} className="h-11 justify-start text-muted-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground">
                      {label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <ProfileMenu onLogout={handleLogout} />
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <QuickScan />

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} Minhas Compras BA. Todos os direitos reservados.
      </footer>
    </div>
  );
}
