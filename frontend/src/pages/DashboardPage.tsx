import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useDashboard } from '../features/dashboard/hooks/useDashboard';
import { CategoryDonutChart } from '../features/dashboard/components/CategoryDonutChart';
import { PriceEvolutionChart } from '../features/dashboard/components/PriceEvolutionChart';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, isError } = useDashboard(user?.id || null);

  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedProductName, setSelectedProductName] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (isLoading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(99, 102, 241, 0.1)',
            borderTop: '4px solid #818cf8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ color: 'var(--text-secondary)' }}>Carregando dados do painel...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div className="container" style={{ maxWidth: '1200px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', maxWidth: '400px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2 style={{ color: '#ef4444', marginBottom: '8px', fontSize: '1.25rem' }}>Erro ao carregar dados</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Ocorreu um erro ao carregar as informações do dashboard. Por favor, tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  if (dashboardData.length === 0) {
    return (
      <div className="container" style={{ maxWidth: '1200px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px 24px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '12px' }}>Seu Painel está Vazio</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
            Nenhuma nota fiscal ou compra foi encontrada na sua conta. Importe suas NFCes para ter uma visão geral detalhada e gráficos de seus gastos.
          </p>
          <Link to="/importar" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-color, #6366f1)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#4f46e5'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-color, #6366f1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Importar Nota Fiscal
          </Link>
        </div>
      </div>
    );
  }

  // Se o monthIndex for maior ou igual ao tamanho do array (por segurança), fixa no último
  const activeMonthIndex = monthIndex >= dashboardData.length ? dashboardData.length - 1 : monthIndex;
  const currentData = dashboardData[activeMonthIndex];

  const handlePrevMonth = () => {
    if (activeMonthIndex < dashboardData.length - 1) {
      setMonthIndex(activeMonthIndex + 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonthIndex > 0) {
      setMonthIndex(activeMonthIndex - 1);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      {/* Header com Seletor de Período */}
      <div className="dashboard-header">
        <div className="dashboard-title-wrapper">
          <h1>Painel de Controle</h1>
          <p>Visão geral de seus hábitos e comportamento de gastos</p>
        </div>
        
        <div className="period-selector">
          <button 
            onClick={handlePrevMonth} 
            className="period-btn"
            disabled={activeMonthIndex === dashboardData.length - 1}
            aria-label="Mês anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span className="period-label">{currentData.mesAno}</span>
          <button 
            onClick={handleNextMonth} 
            className="period-btn"
            disabled={activeMonthIndex === 0}
            aria-label="Próximo mês"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="kpi-grid">
        {/* KPI 1: Gasto Mensal */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
              <path d="M17 9h-2.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H12"></path>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Gasto no Mês</span>
            <span className="kpi-value">{formatCurrency(currentData.mediaGastosMensal)}</span>
          </div>
        </div>

        {/* KPI 2: Notas Lidas */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Notas Lidas no Mês</span>
            <span className="kpi-value">{currentData.quantidadeNotas} {currentData.quantidadeNotas === 1 ? 'nota' : 'notas'}</span>
          </div>
        </div>

        {/* KPI 3: Ticket Médio */}
        <div className="kpi-card">
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Ticket Médio por Nota</span>
            <span className="kpi-value">{formatCurrency(currentData.ticketMedio)}</span>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className="charts-grid">
        {/* Gráfico de Rosca */}
        <div className="chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">Distribuição de Gastos</h3>
          </div>
          <div className="chart-container-wrapper" style={{ height: '220px', display: 'flex', alignItems: 'center' }}>
            <CategoryDonutChart data={currentData.gastosPorCategoria} />
          </div>
        </div>

        {/* Gráfico de Evolução de Preço */}
        <div className="chart-card">
          <div className="chart-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h3 className="chart-card-title">Evolução de Preço por Produto</h3>
            {selectedProductName && (
              <span className="chart-card-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                Produto: {selectedProductName}
              </span>
            )}
          </div>
          <div className="chart-container-wrapper" style={{ height: '220px', display: 'flex', flexDirection: 'column' }}>
            <PriceEvolutionChart data={currentData.produtosFrequentes} onProductSelect={setSelectedProductName} />
          </div>
        </div>
      </div>

      {currentData.gruposNcmSemGtin && currentData.gruposNcmSemGtin.length > 0 && (
        <div className="chart-card" style={{ marginTop: '1.5rem' }}>
          <div className="chart-card-header">
            <h3 className="chart-card-title">Produtos sem GTIN agrupados por NCM</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Itens identificados com EAN &quot;SEM GTIN&quot;, agrupados pelo código NCM
            </p>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>NCM</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'center' }}>Produtos</th>
                  <th style={{ textAlign: 'right' }}>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {currentData.gruposNcmSemGtin.map((grupo) => (
                  <tr key={grupo.ncm}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.9rem' }}>{grupo.ncm}</td>
                    <td>{grupo.categoria}</td>
                    <td style={{ textAlign: 'center' }}>{grupo.quantidade_produtos}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      {formatCurrency(grupo.valor_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

