import { ROLE_LABELS } from '../features/auth/authService';
import type { UserRole } from '../features/auth/authService';
import './RoleBadge.css';

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span data-scope="role-badge" className={`role-badge role-badge--${role.toLowerCase()}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}
