import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../shared/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Alert } from '../../../components/ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';

interface DeletionPage {
  data: { id: string; occurred_on: string; source: 'SELF_SERVICE' | 'ADMIN'; status: 'ERASED' }[];
  total: number;
  retention_days: number;
}

export function AccountDeletionHistory() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'account-deletions', page],
    queryFn: async () => (await apiClient.get<DeletionPage>('/admin/account-deletions', { params: { page, page_size: 20 } })).data,
  });
  return <Card>
    <CardHeader>
      <CardTitle>Histórico de exclusões</CardTitle>
      <CardDescription>A lista acima distingue contas ativas e com exclusão agendada. Este histórico registra apenas exclusões definitivas sem guardar o e-mail ou o identificador da conta. Revogação de sessões não significa suspensão da conta.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Somente exclusões feitas após a ativação deste histórico aparecem aqui.{data && ` Retenção configurada: ${data.retention_days} dias.`}</p>
      <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>Atualizar histórico</Button>
      {isPending ? <p role="status">Carregando exclusões…</p> : isError ? <Alert variant="destructive">Não foi possível carregar o histórico.</Alert> : data?.data.length ? <>
        <Table>
          <TableHeader><TableRow><TableHead>Protocolo da exclusão</TableHead><TableHead>Data (UTC)</TableHead><TableHead>Situação</TableHead><TableHead>Origem</TableHead></TableRow></TableHeader>
          <TableBody>{data.data.map(event => <TableRow key={event.id}>
            <TableCell className="font-mono text-xs">{event.id}</TableCell>
            <TableCell>{event.occurred_on.split('-').reverse().join('/')}</TableCell>
            <TableCell><Badge variant="secondary">Excluída</Badge></TableCell>
            <TableCell>{event.source === 'SELF_SERVICE' ? 'Pelo titular' : 'Pela administração'}</TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </> : <p>Nenhuma exclusão registrada nesta página.</p>}
      {data && (page > 1 || data.total > 20) && <nav aria-label="Paginação de exclusões" className="flex items-center gap-3">
        <Button variant="outline" disabled={page <= 1 || isFetching} onClick={() => setPage(page - 1)}>Anterior</Button>
        <span>Página {page} · {data.total} exclusões</span>
        <Button variant="outline" disabled={page * 20 >= data.total || isFetching} onClick={() => setPage(page + 1)}>Próxima</Button>
      </nav>}
    </CardContent>
  </Card>;
}
