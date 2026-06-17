import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotas } from '../features/notas/hooks/useNotasQueries';
import { useAuth } from '../features/auth/AuthContext';

export function NotasPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const queryParams = {
    page,
    page_size: pageSize,
    ...(dateFrom && { from: dateFrom }),
    ...(dateTo && { to: dateTo }),
  };

  const { data, isLoading, isError, error } = useNotas(user?.id ?? null, queryParams);

  const handleDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isFiltered = !!(dateFrom || dateTo);

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Minhas Notas Fiscais</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bem-vindo, {user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sair
          </button>
          <Link to="/importar" className="btn btn-primary">
            Nova Importação
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <form onSubmit={handleDateFilter} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">De (Data da compra):</label>
            <input 
              type="date" 
              className="form-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Até:</label>
            <input 
              type="date" 
              className="form-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Filtrar
          </button>
          {isFiltered && (
            <button type="button" onClick={clearFilters} className="btn btn-secondary">
              Limpar
            </button>
          )}
        </form>
      </div>

      {isError && (
        <div className="alert alert-error">
          <strong>Erro:</strong> {error.message}
        </div>
      )}

      {isLoading && !data && (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px' }}></div>
        </div>
      )}

      {data && (
        <>
          {isFiltered && data.resumo && (
            <div className="glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Total Gasto no Período Selecionado</h3>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                {data.resumo.total_gasto_periodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          )}

          {data.data.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Nenhuma nota encontrada.</p>
              {!isFiltered && <Link to="/importar" className="btn btn-secondary">Importar primeira nota</Link>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.data.map((nota: any) => (
                <div key={nota.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s', padding: '1.5rem' }}>
                  <div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      Nota #{nota.id}
                      <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                        {(nota.valor_total_nota || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </h3>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                      Chave: {nota.codigo_acesso}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {nota.data_compra ? (
                        <span className="badge badge-primary">
                          Compra em: {new Date(nota.data_compra).toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          Data da compra indisponível
                        </span>
                      )}
                      <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>Itens: {nota.itens_count || 0}</span>
                    </div>
                  </div>
                  <Link to={`/notas/${nota.id}`} className="btn btn-secondary">
                    Ver Detalhes
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Página <strong style={{ color: 'var(--text-primary)' }}>{data.page}</strong> (Total: {data.total} registros)
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
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage(p => p + 1)}
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
