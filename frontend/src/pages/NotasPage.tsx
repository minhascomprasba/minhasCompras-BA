import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotas } from '../features/notas/hooks/useNotasQueries';

export function NotasPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // We only pass valid date strings
  const queryParams = {
    page,
    page_size: pageSize,
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  };

  const { data, isLoading, isError, error } = useNotas(queryParams);

  const handleDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Minhas Notas Fiscais</h1>
        <Link to="/importar" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          Nova Importação
        </Link>
      </div>

      <div style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '2rem' }}>
        <form onSubmit={handleDateFilter} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>De (Data da importação):</label>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Até:</label>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.6rem 1rem', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Filtrar
          </button>
          {(dateFrom || dateTo) && (
            <button type="button" onClick={clearFilters} style={{ padding: '0.6rem 1rem', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}>
              Limpar
            </button>
          )}
        </form>
      </div>

      {isError && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '2rem' }}>
          <strong>Erro:</strong> {error.message}
        </div>
      )}

      {isLoading && !data && (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando notas...</div>
      )}

      {data && (
        <>
          {data.data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Nenhuma nota encontrada no período.</p>
              <Link to="/importar" style={{ color: '#2563eb' }}>Clique aqui para importar sua primeira nota</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.data.map((nota) => (
                <div key={nota.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Nota #{nota.id}</h3>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                      Chave: {nota.codigo_acesso}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                      <span>Importada em: {new Date(nota.created_at).toLocaleDateString('pt-BR')}</span>
                      <span>Itens: {nota.itens_count || 0}</span>
                    </div>
                  </div>
                  <Link to={`/notas/${nota.id}`} style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', color: '#0f172a', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', border: '1px solid #cbd5e1' }}>
                    Ver Itens
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', padding: '1rem 0', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Mostrando página {data.page} (Total: {data.total} itens)
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
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: page * pageSize >= data.total ? '#f1f5f9' : 'white', cursor: page * pageSize >= data.total ? 'not-allowed' : 'pointer' }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
