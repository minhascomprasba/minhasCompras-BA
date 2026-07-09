import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNota, useNotaItens } from '../features/notas/hooks/useNotasQueries';
import { useAuth } from '../features/auth/AuthContext';

export function NotaDetailPage() {
  const { notaId } = useParams<{ notaId: string }>();
  const id = Number(notaId);
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const { data: nota, isLoading: isNotaLoading, isError: isNotaError, error: notaError } = useNota(user?.id ?? null, id);
  const { data: itensData, isLoading: isItensLoading, isError: isItensError, error: itensError } = useNotaItens(user?.id ?? null, id, { page, page_size: pageSize });

  if (isNaN(id)) {
    return <div className="container" style={{ textAlign: 'center' }}>ID da nota inválido.</div>;
  }

  return (
    <div className="container container-large">
      <div className="back-btn-container">
        <Link to="/notas" className="btn-back">
          &larr; Voltar para Notas
        </Link>
      </div>

      {isNotaError && (
        <div className="alert alert-error">
          <strong>Erro ao carregar nota:</strong> {notaError.message}
        </div>
      )}

      {isNotaLoading ? (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : nota ? (
        <div className="glass-panel detail-header-panel">
          <h1 className="detail-title">
            Nota #{nota.id}
            {nota.valor_total_nota !== undefined && (
              <span className="detail-value-badge">
                {nota.valor_total_nota.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            )}
          </h1>
          <p className="detail-text-highlight">
            <strong className="text-primary">Chave de Acesso:</strong> <span style={{ fontFamily: 'var(--mono)' }}>{nota.codigo_acesso}</span>
          </p>
          {nota.data_compra ? (
            <p>
              <strong className="text-primary">Compra em:</strong>{' '}
              {new Date(nota.data_compra).toLocaleString('pt-BR')}
            </p>
          ) : (
            <p className="detail-text-muted">
              <strong className="text-primary">Compra em:</strong> não capturada nesta importação
            </p>
          )}
          <p className="detail-text-muted">
            <strong>Importada em:</strong> {new Date(nota.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
      ) : null}

      <div className="flex-between-wrap">
        <h2 style={{ margin: 0 }}>Itens da Nota</h2>
        {itensData && (
          <span className="badge badge-primary">{itensData.total} produtos encontrados</span>
        )}
      </div>

      {isItensError && (
        <div className="alert alert-error">
          <strong>Erro ao carregar itens:</strong> {itensError.message}
        </div>
      )}

      {isItensLoading && !itensData ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          <div className="spinner spinner-large"></div>
        </div>
      ) : itensData ? (
        <>
          {itensData.data.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem' }}>
              Nenhum item encontrado nesta nota.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'center' }}>Qtd</th>
                    <th style={{ textAlign: 'center' }}>UN</th>
                    <th style={{ textAlign: 'right' }}>Total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {itensData.data.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="table-item-title-row">
                          {item.descricao}
                          {item.sem_gtin && (
                            <span className="badge badge-warning-outline">
                              Sem GTIN
                            </span>
                          )}
                        </div>
                        {item.codigo_ean_comercial && (
                          <div className="table-item-ean">EAN: {item.codigo_ean_comercial}</div>
                        )}
                        {item.codigo_NCM_comercial && (
                          <div className="table-item-ncm">NCM: {item.codigo_NCM_comercial}</div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.quantidade}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{item.unidade_comercial}</td>
                      <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--success)' }}>
                        {item.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {itensData.total > 0 && (
            <div className="pagination-container">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Página <strong style={{ color: 'var(--text-primary)' }}>{itensData.page}</strong>
              </span>
              <div className="pagination-buttons">
                <button 
                  className="btn btn-secondary"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </button>
                <button 
                  className="btn btn-secondary"
                  disabled={page * pageSize >= itensData.total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
