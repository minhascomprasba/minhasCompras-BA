import { ROLE_LABELS } from '../features/auth/authService';
import type { UserRole } from '../features/auth/authService';
import { Badge } from '@/components/ui/badge';

const roleClasses: Record<UserRole, string> = {
  USER: 'bg-primary/10 text-primary',
  ADMIN: 'bg-[var(--brand-blue-light)]/15 text-[var(--brand-blue-light)]',
  SUPER_ADMIN: 'bg-amber-400/15 text-amber-300 border border-amber-400/30',
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge variant="secondary" className={`font-semibold tracking-wide uppercase ${roleClasses[role]}`}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}