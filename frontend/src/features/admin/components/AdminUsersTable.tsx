import type { UserRole } from '../../auth/authService';
import { ROLE_LABELS } from '../../auth/authService';
import type { AdminUsuario } from '../types';

const ROLE_OPTIONS: UserRole[] = ['USER', 'ADMIN', 'SUPER_ADMIN'];

interface AdminUsersTableProps {
  usuarios: AdminUsuario[];
  currentUserId?: number;
  pendingUsuarioId: number | null;
  onRoleChange: (usuario: AdminUsuario, role: UserRole) => void;
  onDelete: (usuario: AdminUsuario) => void;
}

const formatDate = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function AdminUsersTable({
  usuarios,
  currentUserId,
  pendingUsuarioId,
  onRoleChange,
  onDelete,
}: AdminUsersTableProps) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Perfil</th>
            <th style={{ textAlign: 'right' }}>Notas</th>
            <th style={{ textAlign: 'right' }}>Itens</th>
            <th>Cadastro</th>
            <th>Última nota</th>
            <th style={{ textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhum usuário encontrado com os filtros atuais.
              </td>
            </tr>
          ) : (
            usuarios.map((usuario) => {
              const isSelf = usuario.id === currentUserId;
              const isRowPending = pendingUsuarioId === usuario.id;

              return (
                <tr key={usuario.id}>
                  <td>
                    {usuario.email}
                    {isSelf && <span className="badge badge-outline admin-self-badge">você</span>}
                  </td>
                  <td>
                    <select
                      className="form-input admin-role-select"
                      value={usuario.role}
                      disabled={isSelf || isRowPending}
                      title={
                        isSelf
                          ? 'Você não pode alterar o seu próprio perfil de acesso.'
                          : 'Alterar perfil de acesso'
                      }
                      onChange={(event) => onRoleChange(usuario, event.target.value as UserRole)}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ textAlign: 'right' }}>{usuario.notas_count}</td>
                  <td style={{ textAlign: 'right' }}>{usuario.itens_count}</td>
                  <td>{formatDate(usuario.created_at)}</td>
                  <td>{formatDate(usuario.ultima_atividade)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={isSelf || isRowPending}
                      title={
                        isSelf
                          ? 'Você não pode apagar o seu próprio usuário.'
                          : 'Apagar usuário'
                      }
                      onClick={() => onDelete(usuario)}
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}