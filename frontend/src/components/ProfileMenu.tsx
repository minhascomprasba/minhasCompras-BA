import { Link } from 'react-router-dom';
import { SignOutIcon as LogOut, UserCircleIcon as UserCircle } from '@phosphor-icons/react';
import BoringAvatar from 'boring-avatars';

import { useAuth } from '../features/auth/AuthContext';
import { RoleBadge } from './RoleBadge';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';

const avatarColors = [
  // Beam needs hex values to calculate contrasting eyes and mouth colors.
  // These match the brand and supporting colors in styles/tokens.css.
  '#17c85f',
  '#033876',
  '#3a8fe0',
  '#17233A',
  '#F4F8FC',
];

export function ProfileMenu({ onLogout, inline = false }: { onLogout: () => void; inline?: boolean }) {
  const { user, role } = useAuth();

  if (inline) {
    return (
      <section aria-label="Meu perfil" className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-11 shrink-0" aria-hidden="true">
            <BoringAvatar 
              className="block size-full" 
              size={44} 
              name={user ? String(user.id) : 'guest'} 
              variant="beam" 
              colors={avatarColors} 
            />
          </Avatar>
          {role && <RoleBadge role={role} />}
        </div>
        <p className="text-sm text-muted-foreground break-words">{user?.email}</p>
        <Button 
          variant="outline" 
          size="sm" 
          render={<Link to="/perfil" />} 
          nativeButton={false} 
          className="w-full justify-start gap-2"
        >
          <UserCircle size={16} aria-hidden="true" /> Gerenciar perfil
        </Button>
      </section>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        openOnHover 
        delay={150} 
        closeDelay={200} 
        render={<Button variant="ghost" size="icon" className="profile-trigger size-11 rounded-full" />} 
        aria-label="Abrir perfil"
      >
        <Avatar className="size-11" aria-hidden="true">
          <BoringAvatar
            className="block size-full"
            size={44}
            name={user ? String(user.id) : 'guest'}
            variant="beam"
            colors={avatarColors}
          />
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
        <DropdownMenuItem render={<Link to="/perfil" />} className="cursor-pointer min-h-11 px-3">
          <UserCircle aria-hidden="true" size={18} /> Gerenciar perfil
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} variant="destructive" className="profile-logout min-h-11 px-3">
          <LogOut aria-hidden="true" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}