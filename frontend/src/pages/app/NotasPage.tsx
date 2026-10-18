import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleNotchIcon as LoaderCircle, PlusIcon as Plus, FunnelIcon as Funnel, XIcon as X, SignOutIcon as SignOut, ReceiptIcon as Receipt, UploadSimpleIcon as UploadSimple, ArrowRightIcon as ArrowRight, CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight } from '@phosphor-icons/react';
import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { DatePicker } from '../../components/ui/date-picker';
import { Label } from '../../components/ui/label';
import { useNotas } from '../../features/notas/hooks/useNotasQueries';
import { useAuth } from '../../features/auth/AuthContext';

const pageSize = 10;
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function NotasPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, isPlaceholderData } = useNotas(user?.id ?? null, {
    page,
    page_size: pageSize,
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  });

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };
  const isFiltered = !!(dateFrom || dateTo);

  return (
    <div className="container mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="mb-0 text-2xl font-semibold text-foreground">Minhas Notas Fiscais</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { logout(); navigate('/'); }}><SignOut aria-hidden="true" /> Sair</Button>
          <Button type="button" className="text-white" onClick={() => navigate('/importar')}>
            <Plus aria-hidden="true" /> Nova Importação
          </Button>
        </div>
      </header>

      <Card>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); }} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid min-w-0 gap-2 sm:flex-1">
              <Label htmlFor="notas-date-from">De (Data da compra):</Label>
              <DatePicker id="notas-date-from" label="De (Data da compra)" value={dateFrom} onChange={(value) => { setDateFrom(value); setPage(1); }} />
            </div>
            <div className="grid min-w-0 gap-2 sm:flex-1">
              <Label htmlFor="notas-date-to">Até:</Label>
              <DatePicker id="notas-date-to" label="Até" value={dateTo} onChange={(value) => { setDateTo(value); setPage(1); }} />
            </div>
            <Button type="submit" className="h-10 text-white"><Funnel aria-hidden="true" /> Filtrar</Button>
            {isFiltered && <Button type="button" variant="outline" className="h-10" onClick={clearFilters}><X aria-hidden="true" /> Limpar</Button>}
          </form>
        </CardContent>
      </Card>

      {isError && <Alert variant="destructive"><strong>Erro:</strong> {error.message}</Alert>}
      {isLoading && !data && (
        <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
          <span>Carregando notas…</span>
        </div>
      )}

      {data && (
        <>
          {isFiltered && data.resumo && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-muted-foreground">Total Gasto no Período Selecionado</span>
                <span className="text-2xl font-bold text-primary">{currency.format(data.resumo.total_gasto_periodo)}</span>
              </CardContent>
            </Card>
          )}

          {data.data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Receipt className="size-10 text-muted-foreground" aria-hidden="true" />
                <p className="m-0 text-lg text-foreground">Nenhuma nota encontrada.</p>
                {!isFiltered && (
                  <Button variant="outline" render={<Link to="/importar" />} nativeButton={false}><UploadSimple aria-hidden="true" /> Importar primeira nota</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.data.map((nota) => {
                return (
                  <Card key={nota.id}>
                    <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-3">
                        <h2 className="m-0 text-xl font-bold text-primary">{currency.format(nota.valor_total_nota ?? 0)}</h2>
                        <div className="min-w-0 text-sm">
                          <span className="text-muted-foreground">Chave: </span>
                          <span className="font-mono break-all text-foreground select-text">{nota.codigo_acesso || 'Indisponível'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={nota.data_compra ? 'secondary' : 'outline'} className="h-auto whitespace-normal">
                            {nota.data_compra ? `Compra em: ${new Date(nota.data_compra).toLocaleString('pt-BR')}` : 'Data da compra indisponível'}
                          </Badge>
                          <Badge variant="outline">Itens: {nota.itens_count ?? 0}</Badge>
                          <Badge variant="outline" className="h-auto whitespace-normal">Pagamento: {nota.meio_pagamento || 'não capturado'}</Badge>
                        </div>
                      </div>
                      <Button variant="outline" render={<Link to={`/notas/${nota.id}`} />} nativeButton={false}>Ver Detalhes <ArrowRight aria-hidden="true" /></Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {data.total > 0 && (
            <nav aria-label="Paginação de notas" className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
              <span className="text-sm text-muted-foreground">
                Página <strong className="text-foreground">{data.page}</strong> (Total: {data.total} registros)
              </span>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button variant="outline" className="min-h-11 flex-1 sm:min-h-8" disabled={page === 1 || isPlaceholderData} onClick={() => setPage(p => p - 1)}><CaretLeft aria-hidden="true" /> Anterior</Button>
                <Button variant="outline" className="min-h-11 flex-1 sm:min-h-8" disabled={page * pageSize >= data.total || isPlaceholderData} onClick={() => setPage(p => p + 1)}>Próxima <CaretRight aria-hidden="true" /></Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
