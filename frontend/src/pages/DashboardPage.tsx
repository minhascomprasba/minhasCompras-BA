import { useState } from 'react';
import { mockDashboardData } from '../features/dashboard/mockDashboardData';
import { CategoryDonutChart } from '../features/dashboard/components/CategoryDonutChart';
import { PriceEvolutionChart } from '../features/dashboard/components/PriceEvolutionChart';

export function DashboardPage() {
  const [monthIndex, setMonthIndex] = useState(0); // 0 = Junho (mais recente), 1 = Maio, 2 = Abril
  const [selectedProductName, setSelectedProductName] = useState('');

  const currentData = mockDashboardData[monthIndex];

  const handlePrevMonth = () => {
    if (monthIndex < mockDashboardData.length - 1) {
      setMonthIndex(monthIndex + 1);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex > 0) {
      setMonthIndex(monthIndex - 1);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
            disabled={monthIndex === mockDashboardData.length - 1}
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
            disabled={monthIndex === 0}
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
        {/* KPI 1: Média Mensal */}
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
            <span className="kpi-label">Média Mensal de Gastos</span>
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
            <span className="kpi-value">{currentData.quantidadeNotas} notas</span>
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

      {/* Grid de Gráficos (Espaço Reservado para Etapas 3 e 4) */}
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
    </div>
  );
}
