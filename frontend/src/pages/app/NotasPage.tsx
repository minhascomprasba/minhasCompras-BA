import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleNotchIcon as LoaderCircle, PlusIcon as Plus, FunnelIcon as Funnel, XIcon as X, ReceiptIcon as Receipt, UploadSimpleIcon as UploadSimple, ArrowRightIcon as ArrowRight, CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight } from '@phosphor-icons/react';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { DateRangePicker } from '../../components/ui/date-picker';
import { Label } from '../../components/ui/label';
import { useNotas } from '../../features/notas/hooks/useNotasQueries';
import { useAuth } from '../../features/auth/AuthContext';

const pageSize = 10;
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function NotasPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { user } = useAuth();
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
    <div className="page-layout">
      <header className="page-header">
        <h1 className="page-title">Minhas Notas Fiscais</h1>
        <Button type="button" className="text-white" onClick={() => navigate('/importar')}>
          <Plus aria-hidden="true" /> Nova Importação
        </Button>
      </header>

      <Card>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); }} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid w-full min-w-0 gap-2 sm:w-80">
              <Label htmlFor="notas-date-range">Período da compra:</Label>
              <DateRangePicker id="notas-date-range" label="Período da compra" value={{ from: dateFrom, to: dateTo }} onChange={({ from, to }) => { setDateFrom(from); setDateTo(to); setPage(1); }} />
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
            <div className="grid gap-6 lg:grid-cols-2">
              {data.data.map((nota) => {
                return (
                  <Card key={nota.id} className="transition-shadow hover:ring-primary/30">
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Receipt className="size-5" aria-hidden="true" />
                          </span>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">
                              {nota.data_compra ? new Date(nota.data_compra).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data indisponível'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {nota.data_compra ? `Compra às ${new Date(nota.data_compra).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Nota fiscal importada'}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 sm:text-right">
                          <span className="text-xs text-muted-foreground">Total da compra</span>
                          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{currency.format(nota.valor_total_nota ?? 0)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_2fr] gap-4 border-t border-border pt-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">Itens</span>
                          <span className="font-medium text-foreground">{nota.itens_count ?? 0} {nota.itens_count === 1 ? 'item' : 'itens'}</span>
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="text-xs text-muted-foreground">Pagamento</span>
                          <span className="break-words font-medium text-foreground">{nota.meio_pagamento || 'Não informado'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border pt-3">
                        <details className="min-w-0 flex-1 self-center text-xs text-muted-foreground">
                          <summary className="cursor-pointer rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-ring">Chave de acesso</summary>
                          <span className="mt-2 block font-mono break-all text-foreground select-text">{nota.codigo_acesso || 'Indisponível'}</span>
                        </details>
                        <Button variant="ghost" className="shrink-0 bg-transparent text-primary hover:bg-primary/10 hover:text-primary" render={<Link to={`/notas/${nota.id}`} />} nativeButton={false}>Ver detalhes <ArrowRight aria-hidden="true" /></Button>
                      </div>
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
