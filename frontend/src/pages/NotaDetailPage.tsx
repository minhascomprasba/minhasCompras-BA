import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNota, useNotaItens } from '../features/notas/hooks/useNotasQueries';

export function NotaDetailPage() {
  const { notaId } = useParams<{ notaId: string }>();
  const id = Number(notaId);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const { data: nota, isLoading: isNotaLoading, isError: isNotaError, error: notaError } = useNota(id);
  const { data: itensData, isLoading: isItensLoading, isError: isItensError, error: itensError } = useNotaItens(id, { page, page_size: pageSize });

  if (isNaN(id)) {
    return <div className="container" style={{ textAlign: 'center' }}>ID da nota inválido.</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/notas" className="btn btn-secondary" style={{ border: 'none', paddingLeft: 0 }}>
          &larr; Voltar para Notas
        </Link>
      </div>

      {isNotaError && (
        <div className="alert alert-error">
          <strong>Erro ao carregar nota:</strong> {notaError.message}
        </div>
      )}

      {isNotaLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : nota ? (
        <div className="glass-panel" style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nota #{nota.id}
          </h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Chave de Acesso:</strong> <span style={{ fontFamily: 'var(--mono)' }}>{nota.codigo_acesso}</span>
          </p>
          <p>
            <strong style={{ color: 'var(--text-primary)' }}>Importada em:</strong> {new Date(nota.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
      ) : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
        </div>
      ) : itensData ? (
        <>
          {itensData.data.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
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
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{item.descricao}</div>
                        {item.codigo_ean_comercial && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>EAN: {item.codigo_ean_comercial}</div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Página <strong style={{ color: 'var(--text-primary)' }}>{itensData.page}</strong>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
