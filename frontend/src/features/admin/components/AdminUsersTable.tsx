import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
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
    <div className="min-w-0 overflow-x-auto">
      <Table aria-label="Perfis de acesso">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">E-mail</TableHead>
            <TableHead scope="col">Situação</TableHead>
            <TableHead scope="col">Perfil</TableHead>
            <TableHead scope="col" className="text-right tabular-nums">Notas</TableHead>
            <TableHead scope="col" className="text-right tabular-nums">Itens</TableHead>
            <TableHead scope="col">Cadastro</TableHead>
            <TableHead scope="col">Última nota</TableHead>
            <TableHead scope="col" className="text-right tabular-nums">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                Nenhum usuário encontrado com os filtros atuais.
              </TableCell>
            </TableRow>
          ) : (
            usuarios.map((usuario) => {
              const isSelf = usuario.id === currentUserId;
              const isRowPending = pendingUsuarioId === usuario.id;

              return (
                <TableRow key={usuario.id}>
                  <TableCell>
                    {usuario.email}
                    {isSelf && <Badge variant="outline" className="ml-2">você</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={usuario.status === 'PENDING_DELETION' ? 'secondary' : 'outline'}>
                      {usuario.status === 'PENDING_DELETION' ? 'Exclusão agendada' : 'Ativa'}
                    </Badge>
                    {usuario.deletion_scheduled_at && <p className="text-xs text-muted-foreground mt-1">A partir de {new Date(usuario.deletion_scheduled_at + 'Z').toLocaleString('pt-BR')}</p>}
                  </TableCell>
                  <TableCell>
                    <Select
                      items={ROLE_OPTIONS.map(role => ({ value: role, label: ROLE_LABELS[role] }))}
                      value={usuario.role}
                      disabled={isSelf || isRowPending || usuario.status === 'PENDING_DELETION'}
                      onValueChange={role => { if (role !== null) onRoleChange(usuario, role); }}
                    >
                      <SelectTrigger
                        className="min-w-44"
                        aria-label={`Perfil de ${usuario.email}`}
                        title={isSelf ? 'Você não pode alterar o seu próprio perfil de acesso.' : 'Alterar perfil de acesso'}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(role => <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usuario.notas_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{usuario.itens_count}</TableCell>
                  <TableCell>{formatDate(usuario.created_at)}</TableCell>
                  <TableCell>{formatDate(usuario.ultima_atividade)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isSelf || isRowPending || usuario.status === 'PENDING_DELETION'}
                      title={
                        isSelf
                          ? 'Você não pode apagar o seu próprio usuário.'
                          : 'Agendar exclusão do usuário em 7 dias'
                      }
                      onClick={() => onDelete(usuario)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
