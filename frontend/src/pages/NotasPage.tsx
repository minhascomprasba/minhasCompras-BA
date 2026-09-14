import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotas } from '../features/notas/hooks/useNotasQueries';
import { useAuth } from '../features/auth/AuthContext';

export function NotasPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<Record<number, boolean>>({});
  
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

  const toggleKey = (id: number) => {
    setExpandedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isFiltered = !!(dateFrom || dateTo);

  return (
    <div className="container container-medium">
      <div className="page-header-flex">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Minhas Notas Fiscais</h1>
        </div>
        <div className="flex-wrap-gap">
          <button onClick={handleLogout} className="btn btn-secondary">
            Sair
          </button>
          <Link to="/importar" className="btn btn-primary">
            Nova Importação
          </Link>
        </div>
      </div>

      <div className="card card-filters">
        <form onSubmit={handleDateFilter} className="filters-form-flex">
          <div className="form-group mb-0">
            <label className="form-label">De (Data da compra):</label>
            <input 
              type="date" 
              className="form-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group mb-0">
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
        <div className="text-center py-4">
          <div className="spinner spinner-large"></div>
        </div>
      )}

      {data && (
        <>
          {isFiltered && data.resumo && (
            <div className="glass-panel summary-panel">
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Total Gasto no Período Selecionado</h3>
              </div>
              <div className="summary-value">
                {data.resumo.total_gasto_periodo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          )}

          {data.data.length === 0 ? (
            <div className="card card-empty-state">
              <p style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Nenhuma nota encontrada.</p>
              {!isFiltered && <Link to="/importar" className="btn btn-secondary">Importar primeira nota</Link>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.data.map((nota: any) => {
                const isExpanded = !!expandedKeys[nota.id];
                const key = nota.codigo_acesso || '';
                const displayKey = isExpanded ? key : `${key.substring(0, 6)}...${key.substring(key.length - 6)}`;
                return (
                  <div key={nota.id} className="card card-row-layout">
                    <div>
                      <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="text-success-bold">
                          {(nota.valor_total_nota || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </h3>
                      <div 
                        className="access-key-toggle" 
                        onClick={() => toggleKey(nota.id)}
                        title={isExpanded ? "Clique para encolher" : "Clique para mostrar chave completa"}
                      >
                        <span>Chave: {displayKey}</span>
                        <span className="access-key-toggle-icon">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {nota.data_compra ? (
                          <span className="badge badge-primary">
                            Compra em: {new Date(nota.data_compra).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="badge badge-outline">
                            Data da compra indisponível
                          </span>
                        )}
                        <span className="badge badge-outline">Itens: {nota.itens_count || 0}</span>
                        {nota.meio_pagamento ? (
                          <span className="badge badge-outline">Pagamento: {nota.meio_pagamento}</span>
                        ) : (
                          <span className="badge badge-outline">Pagamento: não capturado</span>
                        )}
                      </div>
                    </div>
                    <Link to={`/notas/${nota.id}`} className="btn btn-secondary">
                      Ver Detalhes
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data.total > 0 && (
            <div className="pagination-container">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Página <strong style={{ color: 'var(--text-primary)' }}>{data.page}</strong> (Total: {data.total} registros)
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
