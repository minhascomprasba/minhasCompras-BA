import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminUsuarios, useUpdateUsuarioRole } from '../features/admin/hooks/useAdminData';
import { AdminUsersTable } from '../features/admin/components/AdminUsersTable';
import { InfoTooltip } from '../features/admin/components/InfoTooltip';
import type { AdminUsuario } from '../features/admin/types';
import type { UserRole } from '../features/auth/authService';
import { ROLE_LABELS } from '../features/auth/authService';
import { useAuth } from '../features/auth/AuthContext';

const PAGE_SIZE = 20;

const ROLES_TOOLTIP =
  'Usuário acessa apenas os próprios dados. Admin enxerga o painel de indicadores do projeto. Super Admin também administra os perfis de acesso da equipe.';

const ROLE_FILTERS: { value: '' | UserRole; label: string }[] = [
  { value: '', label: 'Todos os perfis' },
  { value: 'USER', label: 'Usuários' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'SUPER_ADMIN', label: 'Super Admins' },
];

export function AdminUsersPage() {
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useAdminUsuarios({
    page,
    page_size: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
  });

  const updateRole = useUpdateUsuarioRole();

  const handleRoleChange = (usuario: AdminUsuario, role: UserRole) => {
    setFeedback(null);
    updateRole.mutate(
      { usuarioId: usuario.id, role },
      {
        onSuccess: (atualizado) => {
          setFeedback({
            type: 'success',
            message: `${atualizado.email} agora tem perfil ${ROLE_LABELS[atualizado.role]}.`,
          });
        },
        onError: (mutationError) => {
          setFeedback({ type: 'error', message: mutationError.message });
        },
      }
    );
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resumo = data?.resumo_perfis;

  return (
    <div className="container admin-container">
      <div className="admin-header">
        <div>
          <div className="admin-logs-title-row">
            <h1 className="admin-title">Perfis de Acesso</h1>
            <InfoTooltip content={ROLES_TOOLTIP} />
          </div>
          <p className="admin-subtitle">
            Governança de permissões da equipe do projeto de extensão
            {resumo
              ? ` — ${resumo.SUPER_ADMIN ?? 0} super admins, ${resumo.ADMIN ?? 0} admins e ${resumo.USER ?? 0} usuários`
              : ''}
          </p>
        </div>
        <Link to="/admin" className="btn btn-secondary btn-sm">
          Voltar ao painel
        </Link>
      </div>

      <div className="card admin-logs-card">
        <div className="admin-users-filters">
          <input
            type="search"
            className="form-input"
            placeholder="Buscar por e-mail"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <select
            className="form-input admin-role-select"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as '' | UserRole);
              setPage(1);
            }}
          >
            {ROLE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {feedback && (
          <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success-custom'}`}>
            <span style={{ fontSize: '1.2rem' }}>{feedback.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{feedback.message}</span>
          </div>
        )}

        {isLoading ? (
          <div className="admin-chart-placeholder">Carregando usuários...</div>
        ) : isError ? (
          <div className="alert alert-error">
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>{error?.message || 'Não foi possível carregar os usuários.'}</span>
          </div>
        ) : (
          <>
            <AdminUsersTable
              usuarios={data?.data ?? []}
              currentUserId={user?.id}
              pendingUsuarioId={updateRole.isPending ? updateRole.variables?.usuarioId ?? null : null}
              onRoleChange={handleRoleChange}
            />

            {totalPages > 1 && (
              <div className="admin-users-pagination">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <span>
                  Página {page} de {totalPages} • {total} usuários
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
