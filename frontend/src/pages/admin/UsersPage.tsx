import { AccountDeletionHistory } from '../../features/admin/components/AccountDeletionHistory';
import { ArrowLeftIcon as ArrowLeft, CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight, TrashIcon as Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminUsuarios, useDeleteUsuario, useUpdateUsuarioRole } from '../../features/admin/hooks/useAdminData';
import { AdminUsersTable } from '../../features/admin/components/AdminUsersTable';
import { InfoTooltip } from '../../features/admin/components/InfoTooltip';
import type { AdminUsuario } from '../../features/admin/types';
import type { UserRole } from '../../features/auth/authService';
import { ROLE_LABELS } from '../../features/auth/authService';
import { useAuth } from '../../features/auth/AuthContext';

import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const PAGE_SIZE = 20;

const ROLES_TOOLTIP =
  'Usuário acessa apenas os próprios dados. Gestor acessa os relatórios e indicadores sem poder excluir ou alterar usuários. Administrador tem acesso total, incluindo a gestão de equipe e exclusões.';

const ROLE_FILTERS: { value: '' | UserRole; label: string }[] = [
  { value: '', label: 'Todos os perfis' },
  { value: 'USER', label: 'Usuários' },
  { value: 'ADMIN', label: 'Gestores' },
  { value: 'SUPER_ADMIN', label: 'Administradores' },
];

export function UsersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const deleteUsuario = useDeleteUsuario();
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<AdminUsuario | null>(null);

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

  const handleDeleteRequest = (usuario: AdminUsuario) => {
    setFeedback(null);
    setUsuarioParaExcluir(usuario);
  };

  const handleDeleteConfirm = () => {
    if (!usuarioParaExcluir) return;
    const alvo = usuarioParaExcluir;

    deleteUsuario.mutate(
      { usuarioId: alvo.id },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', message: `${alvo.email}: exclusão agendada para daqui a 7 dias. O titular receberá um link para cancelar.` });
          setUsuarioParaExcluir(null);
        },
        onError: (mutationError) => {
          setFeedback({ type: 'error', message: mutationError.message });
          setUsuarioParaExcluir(null);
        },
      }
    );
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resumo = data?.resumo_perfis;

  return (
    <div data-scope="admin" className="page-layout">
      <header className="page-header">
        <div className="page-heading">
          <div className="flex items-center gap-2">
            <h1 className="page-title">Perfis de Acesso</h1>
            <InfoTooltip content={ROLES_TOOLTIP} />
          </div>
          <div className="page-description">
            Governança de permissões da equipe do projeto de extensão
            {resumo ? ` — ${resumo.SUPER_ADMIN ?? 0} administradores, ${resumo.ADMIN ?? 0} gestores e ${resumo.USER ?? 0} usuários` : ''}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => navigate('/admin')}><ArrowLeft aria-hidden="true" /> Voltar à gestão</Button>
      </header>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="admin-user-search">Buscar por e-mail</Label>
              <Input id="admin-user-search" type="search" placeholder="Buscar por e-mail" value={searchInput} onChange={event => setSearchInput(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-user-role">Perfil de acesso</Label>
              <Select items={ROLE_FILTERS} value={roleFilter} onValueChange={(value: '' | UserRole | null) => { if (value !== null) { setRoleFilter(value); setPage(1); } }}>
                <SelectTrigger id="admin-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_FILTERS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {feedback && <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'} className={feedback.type === 'success' ? 'border-primary/30 bg-primary/10 text-primary' : undefined}>{feedback.message}</Alert>}
          {isLoading ? <div role="status" className="py-12 text-center text-muted-foreground">Carregando usuários...</div> : isError ? (
            <Alert variant="destructive">{error?.message || 'Não foi possível carregar os usuários.'}</Alert>
          ) : (
            <>
              <AdminUsersTable usuarios={data?.data ?? []} currentUserId={user?.id} pendingUsuarioId={updateRole.isPending ? updateRole.variables?.usuarioId ?? null : null} onRoleChange={handleRoleChange} onDelete={handleDeleteRequest} />
              {totalPages > 1 && <nav aria-label="Paginação de usuários" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Button type="button" variant="outline" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}><CaretLeft aria-hidden="true" /> Anterior</Button>
                <span className="text-sm text-muted-foreground">Página {page} de {totalPages} • {total} usuários</span>
                <Button type="button" variant="outline" disabled={page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>Próxima <CaretRight aria-hidden="true" /></Button>
              </nav>}
            </>
          )}
        </CardContent>
      </Card>
      <AccountDeletionHistory />
      <Dialog open={!!usuarioParaExcluir} onOpenChange={(open: boolean) => { if (!open && !deleteUsuario.isPending) setUsuarioParaExcluir(null); }}>
        <DialogContent className="app-shell-theme space-y-5">
          <DialogHeader>
            <DialogTitle>Agendar exclusão do usuário</DialogTitle>
            <DialogDescription>
              {usuarioParaExcluir && <>Tem certeza que deseja excluir <strong>{usuarioParaExcluir.email}</strong> ({ROLE_LABELS[usuarioParaExcluir.role]})? A conta ficará bloqueada e os dados serão preservados por 7 dias. O titular receberá um link para cancelar. Após o prazo, a exclusão será definitiva.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={deleteUsuario.isPending} onClick={() => setUsuarioParaExcluir(null)}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={deleteUsuario.isPending} onClick={handleDeleteConfirm}><Trash aria-hidden="true" /> {deleteUsuario.isPending ? 'Agendando...' : 'Agendar exclusão'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
