interface AdminHeaderProps {
  mesAno: string;
}

export function AdminHeader({ mesAno }: AdminHeaderProps) {
  return (
    <div className="admin-header">
      <div>
        <h1 className="admin-title">Painel de Administração</h1>
        <p className="admin-subtitle">
          Indicadores operacionais, métricas de extensão e inteligência de mercado
        </p>
      </div>
      <div className="period-selector">
        <button type="button" className="period-btn" aria-label="Mês anterior">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="period-label">{mesAno}</span>
        <button type="button" className="period-btn" aria-label="Próximo mês">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}