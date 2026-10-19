import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ProfileMenu } from './ProfileMenu';
import { QuickScan } from './QuickScan';
import { ListIcon as Menu, XIcon as X, ChartPieIcon as ChartPie, ReceiptIcon as Receipt, MapPinIcon as MapPin, UploadSimpleIcon as UploadSimple, ShieldCheckIcon as ShieldCheck, SignOutIcon as LogOut } from '@phosphor-icons/react';
import { Button } from './ui/button';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from './ui/navigation-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
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
    { to: '/dashboard', icon: ChartPie, label: 'Dashboard' },
    { to: '/notas', icon: Receipt, label: 'Notas' },
    { to: '/mapa', icon: MapPin, label: 'Mapa' },
    { to: '/importar', icon: UploadSimple, label: 'Importar' },
    ...(isAdmin ? [{ to: '/admin', icon: ShieldCheck, label: 'Gestão' }] : []),
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
              {links.filter(({ to }) => to !== '/admin').map(({ to, label, icon: Icon }) => (
                <NavigationMenuItem key={to}>
                  <NavigationMenuLink
                    render={<NavLink to={to} />}
                    className="h-11 flex-row items-center gap-2 px-3 text-muted-foreground hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <Button variant="ghost" nativeButton={false} render={<NavLink to="/admin" />} className="shell-admin-link h-11 text-muted-foreground">
                <ShieldCheck aria-hidden="true" /> Gestão
              </Button>
            )}
            <div className="shell-desktop-profile">
              <ProfileMenu onLogout={handleLogout} />
            </div>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger render={<Button variant="secondary" size="icon" className="shell-mobile-toggle shell-menu-button size-11" />} aria-label="Abrir menu">
                <Menu aria-hidden="true" />
              </SheetTrigger>
              <SheetContent className="app-shell-theme overflow-y-auto pt-[var(--safe-top)] pb-[var(--safe-bottom)]" showCloseButton={false}>
                <SheetHeader className="pr-16">
                  <SheetTitle>Minhas Compras BA</SheetTitle>
                  <SheetDescription>Navegue pelas suas compras.</SheetDescription>
                </SheetHeader>
                <SheetClose render={<Button variant="secondary" size="icon" className="shell-menu-button absolute right-3 top-[calc(var(--safe-top)+0.75rem)] size-11" />} aria-label="Fechar menu">
                  <X aria-hidden="true" />
                </SheetClose>
                <div className="border-b border-border mx-4 pb-4">
                  <ProfileMenu inline onLogout={handleLogout} />
                </div>
                <nav aria-label="Navegação principal" className="flex flex-col gap-1 px-4">
                  {links.map(({ to, label, icon: Icon }) => (
                    <Button key={to} variant="ghost" nativeButton={false} render={<NavLink to={to} />} onClick={closeMenu} className="h-11 justify-start text-muted-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground">
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </Button>
                  ))}
                </nav>
                <SheetFooter>
                  <Button variant="destructive" onClick={handleLogout} className="min-h-11 justify-start px-3">
                    <LogOut aria-hidden="true" /> Sair
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
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
