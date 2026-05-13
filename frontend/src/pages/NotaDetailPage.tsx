import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNota, useNotaItens } from '../features/notas/hooks/useNotasQueries';

export function NotaDetailPage() {
  const { notaId } = useParams<{ notaId: string }>();
  const id = Number(notaId);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50); // Mapped out in contract to default 50 for items

  // Fetch Nota Details
  const { 
    data: nota, 
    isLoading: isNotaLoading, 
    isError: isNotaError, 
    error: notaError 
  } = useNota(id);

  // Fetch Nota Items with Pagination
  const { 
    data: itensData, 
    isLoading: isItensLoading, 
    isError: isItensError, 
    error: itensError 
  } = useNotaItens(id, { page, page_size: pageSize });

  if (isNaN(id)) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>ID da nota inválido.</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/notas" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>
          &larr; Voltar para Notas
        </Link>
      </div>

      {isNotaError && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '2rem' }}>
          <strong>Erro ao carregar nota:</strong> {notaError.message}
        </div>
      )}

      {isNotaLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>Carregando dados da nota...</div>
      ) : nota ? (
        <div style={{ padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '2rem', background: 'white' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#0f172a' }}>Nota #{nota.id}</h1>
          <div style={{ color: '#475569', fontSize: '0.95rem', wordBreak: 'break-all' }}>
            <strong>Chave de Acesso:</strong> {nota.codigo_acesso}
          </div>
          <div style={{ color: '#475569', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            <strong>Importada em:</strong> {new Date(nota.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
      ) : null}

      <h2 style={{ color: '#0f172a', marginBottom: '1rem' }}>Itens da Nota</h2>

      {isItensError && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '2rem' }}>
          <strong>Erro ao carregar itens:</strong> {itensError.message}
        </div>
      )}

      {isItensLoading && !itensData ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>Carregando itens...</div>
      ) : itensData ? (
        <>
          {itensData.data.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
              Nenhum item encontrado nesta nota.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f1f5f9' }}>
                  <tr>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Descrição</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>Qtd</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>UN</th>
                    <th style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>Total (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {itensData.data.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', color: '#0f172a' }}>
                        {item.descricao}
                        {item.codigo_ean_comercial && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>EAN: {item.codigo_ean_comercial}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', color: '#475569' }}>{item.quantidade}</td>
                      <td style={{ padding: '1rem', color: '#475569' }}>{item.unidade_comercial}</td>
                      <td style={{ padding: '1rem', color: '#0f172a', textAlign: 'right', fontWeight: 'bold' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem 0' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Mostrando página {itensData.page} (Total: {itensData.total} itens)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: page === 1 ? '#f1f5f9' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Anterior
                </button>
                <button 
                  disabled={page * pageSize >= itensData.total}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: page * pageSize >= itensData.total ? '#f1f5f9' : 'white', cursor: page * pageSize >= itensData.total ? 'not-allowed' : 'pointer' }}
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
