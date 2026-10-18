import { SignOutIcon as LogOut } from '@phosphor-icons/react';
import { useAuth } from '../features/auth/AuthContext';
import { RoleBadge } from './RoleBadge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

export function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const { user, role } = useAuth();
  const initials = (user?.email?.[0] ?? 'U').toLocaleUpperCase('pt-BR');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger openOnHover delay={150} closeDelay={200} render={<Button variant="ghost" size="icon" className="profile-trigger size-11 rounded-full" />} aria-label="Abrir perfil">
        <Avatar className="size-11">
          <AvatarFallback className="profile-initial font-bold">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="app-shell-theme profile-dropdown w-80 max-w-[calc(100vw-2rem)]" aria-label="Meu perfil">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="profile-heading text-sm">Meu perfil</DropdownMenuLabel>
          <dl className="profile-details text-sm">
            <div>
            <dt className="text-xs text-muted-foreground">Perfil de acesso</dt>
            <dd className="m-0">{role && <RoleBadge role={role} />}</dd>
            </div>
            <div>
            <dt className="text-xs text-muted-foreground">E-mail</dt>
            <dd className="m-0 break-words">{user?.email}</dd>
            </div>
          </dl>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} variant="destructive" className="profile-logout min-h-11 px-3">
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
