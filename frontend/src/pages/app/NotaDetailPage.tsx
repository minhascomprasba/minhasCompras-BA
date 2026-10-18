import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon as ArrowLeft, CaretLeftIcon as CaretLeft, CaretRightIcon as CaretRight, CircleNotchIcon as LoaderCircle, ReceiptIcon as Receipt } from '@phosphor-icons/react';
import { Alert } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useNota, useNotaItens } from '../../features/notas/hooks/useNotasQueries';
import { useAuth } from '../../features/auth/AuthContext';

const pageSize = 50;
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 });

function LoadingState({ children }: { children: string }) {
  return (
    <Card>
      <CardContent role="status" className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        <span>{children}</span>
      </CardContent>
    </Card>
  );
}

export function NotaDetailPage() {
  const { notaId } = useParams<{ notaId: string }>();
  const id = Number(notaId);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data: nota, isLoading: isNotaLoading, isError: isNotaError, error: notaError } = useNota(user?.id ?? null, id);
  const { data: itensData, isLoading: isItensLoading, isError: isItensError, error: itensError, isPlaceholderData } = useNotaItens(user?.id ?? null, id, { page, page_size: pageSize });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <Button type="button" variant="ghost" className="bg-transparent" onClick={() => navigate('/notas')}>
        <ArrowLeft aria-hidden="true" /> Minhas notas fiscais
      </Button>
      <h1 style={{ margin: 0 }} className="text-2xl font-semibold text-foreground">Detalhes da Nota</h1>

      {isNaN(id) ? <Alert variant="destructive">ID da nota inválido.</Alert> : (
        <>
          {isNotaError && <Alert variant="destructive"><strong>Erro ao carregar nota:</strong> {notaError.message}</Alert>}
          {isNotaLoading ? <LoadingState>Carregando nota…</LoadingState> : nota ? (
            <Card>
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
                    <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{nota.valor_total_nota != null ? currency.format(nota.valor_total_nota) : 'Indisponível'}</span>
                  </div>
                </div>
                <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Pagamento</span>
                    <span className="break-words font-medium">{nota.meio_pagamento || 'Não informado'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Importada em</span>
                    <span className="font-medium">{new Date(nota.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
                <details className="border-t border-border pt-3 text-xs text-muted-foreground">
                  <summary className="cursor-pointer rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-ring">Chave de acesso</summary>
                  <span className="mt-2 block font-mono break-all text-foreground select-text">{nota.codigo_acesso || 'Indisponível'}</span>
                </details>
              </CardContent>
            </Card>
          ) : null}

          <section aria-labelledby="nota-items-title" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="nota-items-title" style={{ margin: 0 }} className="text-xl font-semibold text-foreground">Itens da compra</h2>
              {itensData && <span className="text-sm text-muted-foreground">{itensData.total} {itensData.total === 1 ? 'item' : 'itens'}</span>}
            </div>
            {isItensError && <Alert variant="destructive"><strong>Erro ao carregar itens:</strong> {itensError.message}</Alert>}
            {isItensLoading && !itensData ? <LoadingState>Carregando itens…</LoadingState> : itensData ? (
              <>
                {itensData.data.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum item encontrado nesta nota.</CardContent></Card>
                ) : (
                  <Card>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table aria-label="Itens da nota fiscal">
                          <TableHeader>
                            <TableRow>
                              <TableHead scope="col">Descrição</TableHead>
                              <TableHead scope="col" className="text-center">Qtd</TableHead>
                              <TableHead scope="col" className="text-center">UN</TableHead>
                              <TableHead scope="col" className="text-right whitespace-nowrap">Total (R$)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {itensData.data.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex min-w-40 flex-wrap items-center gap-2 font-medium text-foreground">
                                    {item.descricao}
                                    {item.sem_gtin && <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-300">Sem GTIN</Badge>}
                                  </div>
                                  {item.codigo_ean_comercial && <div className="mt-1 font-mono text-xs break-all text-muted-foreground">EAN: {item.codigo_ean_comercial}</div>}
                                  {item.codigo_NCM_comercial && <div className="mt-1 font-mono text-xs break-all text-muted-foreground">NCM: {item.codigo_NCM_comercial}</div>}
                                </TableCell>
                                <TableCell className="text-center tabular-nums">{item.quantidade}</TableCell>
                                <TableCell className="text-center text-muted-foreground">{item.unidade_comercial}</TableCell>
                                <TableCell className="text-right font-semibold whitespace-nowrap text-foreground tabular-nums">{decimal.format(item.valor_total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {itensData.total > 0 && (
                  <nav aria-label="Paginação de itens" className="flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
                    <span className="text-sm text-muted-foreground">Página <strong className="text-foreground">{itensData.page}</strong></span>
                    <div className="flex w-full gap-2 sm:w-auto">
                      <Button type="button" variant="outline" className="min-h-11 flex-1 sm:min-h-8" disabled={page === 1 || isPlaceholderData} onClick={() => setPage(p => p - 1)}><CaretLeft aria-hidden="true" /> Anterior</Button>
                      <Button type="button" variant="outline" className="min-h-11 flex-1 sm:min-h-8" disabled={page * pageSize >= itensData.total || isPlaceholderData} onClick={() => setPage(p => p + 1)}>Próxima <CaretRight aria-hidden="true" /></Button>
                    </div>
                  </nav>
                )}
              </>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
