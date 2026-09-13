import { Link } from 'react-router-dom';

export function AdminPage() {
  return (
    <div className="container admin-container">
      {/* Header */}
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
          <span className="period-label">Julho 2026</span>
          <button type="button" className="period-btn" aria-label="Próximo mês">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* 1. KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="card admin-kpi-card">
          <div className="admin-kpi-icon-wrap admin-kpi-icon--blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="admin-kpi-content">
            <p className="admin-kpi-label">Cidadãos Cadastrados</p>
            <p className="admin-kpi-value">12.450</p>
            <p className="admin-kpi-trend admin-kpi-trend--up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +845 no mês
            </p>
          </div>
        </div>

        <div className="card admin-kpi-card">
          <div className="admin-kpi-icon-wrap admin-kpi-icon--green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="admin-kpi-content">
            <p className="admin-kpi-label">Notas Importadas</p>
            <p className="admin-kpi-value">145.2K</p>
            <p className="admin-kpi-trend admin-kpi-trend--up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +12.3K no mês
            </p>
          </div>
        </div>

        <div className="card admin-kpi-card">
          <div className="admin-kpi-icon-wrap admin-kpi-icon--amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
              <line x1="17" y1="17" x2="22" y2="17" />
            </svg>
          </div>
          <div className="admin-kpi-content">
            <p className="admin-kpi-label">Itens Digitalizados</p>
            <p className="admin-kpi-value">8.4M</p>
            <p className="admin-kpi-trend admin-kpi-trend--up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +450K no mês
            </p>
          </div>
        </div>

        <div className="card admin-kpi-card">
          <div className="admin-kpi-icon-wrap admin-kpi-icon--pink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="admin-kpi-content">
            <p className="admin-kpi-label">Volume Rastreado</p>
            <p className="admin-kpi-value">R$ 45.2M</p>
            <p className="admin-kpi-trend admin-kpi-trend--up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              +R$ 2.1M
            </p>
          </div>
        </div>

        <div className="card admin-kpi-card">
          <div className="admin-kpi-icon-wrap admin-kpi-icon--red">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <div className="admin-kpi-content">
            <p className="admin-kpi-label">Estabilidade Scraper</p>
            <p className="admin-kpi-value">98.4%</p>
            <p className="admin-kpi-trend admin-kpi-trend--down">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
              -0.2%
            </p>
          </div>
        </div>
      </div>

      {/* 2. Operations & Growth */}
      <div className="admin-charts-grid">
        <div className="card admin-chart-card">
          <h3 className="admin-chart-title">Crescimento de Adesão</h3>
          <div className="admin-chart-placeholder">
            <svg className="admin-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <path d="M0,80 C20,70 40,90 60,40 C80,10 100,20 100,20" fill="none" stroke="#17c85f" strokeWidth="2" />
              <circle cx="60" cy="40" fill="var(--bg-main)" r="1.5" stroke="#17c85f" strokeWidth="1" />
              <circle cx="100" cy="20" fill="var(--bg-main)" r="1.5" stroke="#17c85f" strokeWidth="1" />
            </svg>
          </div>
        </div>

        <div className="card admin-chart-card">
          <h3 className="admin-chart-title">Performance do Scraper</h3>
          <div className="admin-bar-chart">
            <div className="admin-bar" style={{ height: '80%', background: 'rgba(58,143,224,0.8)' }} />
            <div className="admin-bar" style={{ height: '60%', background: 'rgba(58,143,224,0.8)' }} />
            <div className="admin-bar" style={{ height: '90%', background: 'rgba(58,143,224,0.8)' }} />
            <div className="admin-bar" style={{ height: '40%', background: 'rgba(245,158,11,0.8)' }} />
            <div className="admin-bar" style={{ height: '75%', background: 'rgba(58,143,224,0.8)' }} />
            <div className="admin-bar" style={{ height: '85%', background: 'rgba(58,143,224,0.8)' }} />
            <div className="admin-bar" style={{ height: '100%', background: 'rgba(23,200,95,0.8)' }} />
          </div>
        </div>
      </div>

      {/* 3. Market Intelligence */}
      <div className="admin-charts-grid">
        <div className="card admin-chart-card">
          <h3 className="admin-chart-title">Top Produtos (Inteligência)</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th style={{ textAlign: 'right' }}>Preço Médio</th>
                  <th style={{ textAlign: 'right' }}>Variação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Leite Integral 1L</td>
                  <td style={{ textAlign: 'right' }}>R$ 5,40</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="admin-variation admin-variation--up">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                      2.1%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Arroz Branco 5kg</td>
                  <td style={{ textAlign: 'right' }}>R$ 28,90</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="admin-variation admin-variation--down">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <polyline points="19 12 12 19 5 12" />
                      </svg>
                      1.5%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Óleo de Soja 900ml</td>
                  <td style={{ textAlign: 'right' }}>R$ 6,20</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="admin-variation admin-variation--neutral">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      0.0%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card admin-chart-card">
          <h3 className="admin-chart-title">Alcance Geográfico</h3>
          <div className="admin-map-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <p>Mapa de calor de redes comerciais (Placeholder)</p>
          </div>
        </div>
      </div>

      {/* 4. Telemetry & Usability */}
      <div className="admin-telemetry-grid">
        <div className="card admin-telemetry-card">
          <h3 className="admin-telemetry-title">Canais de Importação</h3>
          <div className="admin-donut-wrapper">
            <div className="admin-donut admin-donut--channels" />
          </div>
        </div>

        <div className="card admin-telemetry-card">
          <h3 className="admin-telemetry-title">Meios de Pagamento</h3>
          <div className="admin-donut-wrapper">
            <div className="admin-donut admin-donut--payments" />
          </div>
        </div>

        <div className="card admin-telemetry-card">
          <h3 className="admin-telemetry-title">Qualidade do Catálogo</h3>
          <div className="admin-catalog-layout">
            <div className="admin-donut-wrapper">
              <div className="admin-donut admin-donut--catalog" />
            </div>
            <div className="admin-catalog-stats">
              <div className="admin-catalog-stat">
                <p className="admin-catalog-stat-value admin-catalog-stat-value--success">92%</p>
                <p className="admin-catalog-stat-label">NCM Válido</p>
              </div>
              <div className="admin-catalog-stat">
                <p className="admin-catalog-stat-value admin-catalog-stat-value--warning">8%</p>
                <p className="admin-catalog-stat-label">Incompleto</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Real-time Monitoring */}
      <div className="card admin-logs-card">
        <div className="admin-logs-header">
          <div>
            <h3 className="admin-logs-title">Logs de Monitoramento</h3>
            <p className="admin-logs-subtitle">Últimas falhas e expirações de importação</p>
          </div>
          <Link to="/notas" className="admin-logs-link">
            Ver todos
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>ID da Nota</th>
                <th>Tentativas</th>
                <th>Erro Reportado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="admin-mono">2026-07-15 14:32:01</td>
                <td className="admin-mono">NFe-292307...8432</td>
                <td>3</td>
                <td>Timeout SEFAZ response</td>
                <td><span className="badge badge-error">Falha Scraper</span></td>
              </tr>
              <tr>
                <td className="admin-mono">2026-07-15 14:28:45</td>
                <td className="admin-mono">NFe-292307...1190</td>
                <td>1</td>
                <td>QR Code inválido ou ilegível</td>
                <td><span className="badge badge-warning">Erro Câmera</span></td>
              </tr>
              <tr>
                <td className="admin-mono">2026-07-15 14:15:22</td>
                <td className="admin-mono">NFe-292307...5541</td>
                <td>5</td>
                <td>Captcha block - Rate limit</td>
                <td><span className="badge badge-error">Bloqueio IP</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
