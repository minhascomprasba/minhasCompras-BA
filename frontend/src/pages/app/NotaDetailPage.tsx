import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleNotch as LoaderCircle } from '@phosphor-icons/react';
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
    <div className="container container-large space-y-6 text-foreground">
      <Button type="button" variant="outline" onClick={() => navigate('/notas')}>
        <ArrowLeft aria-hidden="true" /> Voltar para Notas
      </Button>

      {isNaN(id) ? <Alert variant="destructive">ID da nota inválido.</Alert> : (
        <>
          {isNotaError && <Alert variant="destructive"><strong>Erro ao carregar nota:</strong> {notaError.message}</Alert>}
          {isNotaLoading ? <LoadingState>Carregando nota…</LoadingState> : nota ? (
            <Card>
              <CardContent className="space-y-6">
                <h1 className="m-0 text-2xl font-semibold text-foreground">Detalhes da Nota</h1>
                {nota.valor_total_nota !== undefined && (
                  <div className="text-3xl font-bold text-primary">{currency.format(nota.valor_total_nota)}</div>
                )}
                <dl className="m-0 grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1 sm:col-span-2">
                    <dt className="text-sm text-muted-foreground">Chave de Acesso</dt>
                    <dd className="m-0 font-mono break-all text-foreground select-text">{nota.codigo_acesso || 'Indisponível'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm text-muted-foreground">Compra em</dt>
                    <dd className="m-0 text-foreground">{nota.data_compra ? new Date(nota.data_compra).toLocaleString('pt-BR') : 'não capturada nesta importação'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm text-muted-foreground">Meio de pagamento</dt>
                    <dd className="m-0 text-foreground">{nota.meio_pagamento || 'não capturado nesta importação'}</dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-sm text-muted-foreground">Importada em</dt>
                    <dd className="m-0 text-foreground">{new Date(nota.created_at).toLocaleString('pt-BR')}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ) : null}

          <section aria-labelledby="nota-items-title" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="nota-items-title" className="m-0 text-xl font-semibold text-foreground">Itens da Nota</h2>
              {itensData && <Badge variant="secondary">{itensData.total} produtos encontrados</Badge>}
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
                                <TableCell className="text-center text-muted-foreground tabular-nums">{item.quantidade}</TableCell>
                                <TableCell className="text-center text-muted-foreground">{item.unidade_comercial}</TableCell>
                                <TableCell className="text-right font-semibold whitespace-nowrap text-primary tabular-nums">{decimal.format(item.valor_total)}</TableCell>
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
                      <Button type="button" variant="outline" className="min-h-11 flex-1 sm:min-h-8" disabled={page === 1 || isPlaceholderData} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                      <Button type="button" variant="outline" className="min-h-11 flex-1 sm:min-h-8" disabled={page * pageSize >= itensData.total || isPlaceholderData} onClick={() => setPage(p => p + 1)}>Próxima</Button>
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
