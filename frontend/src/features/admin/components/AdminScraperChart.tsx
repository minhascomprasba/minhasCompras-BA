import type { ScraperDia } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP =
  'Isola a causa raiz de problemas operacionais. Verde = COMPLETED (operação normal); Amarelo = EXPIRED (desistência do captcha, fricção humana/UX); Vermelho = FAILED (erro de código, bloqueio de IP ou instabilidade da SEFAZ).';

interface AdminScraperChartProps {
  dias: ScraperDia[];
}

export function AdminScraperChart({ dias }: AdminScraperChartProps) {
  return (
    <div className="card admin-chart-card">
      <MetricHead title="Desempenho Diário do Scraper" tooltip={TOOLTIP} />
      <div className="admin-chart-legend">
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--completed" />
          COMPLETED
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--expired" />
          EXPIRED
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--failed" />
          FAILED
        </span>
      </div>
      <div className="admin-bar-chart">
        {dias.map((d) => (
          <div key={d.dia} className="admin-bar-column">
            <div className="admin-bar-stack">
              <div
                className="admin-bar-seg admin-bar-seg--completed"
                style={{ flex: d.completed }}
                title={`COMPLETED ${d.completed}%`}
              />
              <div
                className="admin-bar-seg admin-bar-seg--expired"
                style={{ flex: d.expired }}
                title={`EXPIRED ${d.expired}%`}
              />
              <div
                className="admin-bar-seg admin-bar-seg--failed"
                style={{ flex: d.failed }}
                title={`FAILED ${d.failed}%`}
              />
            </div>
            <span className="admin-bar-label">{d.dia}</span>
          </div>
        ))}
      </div>
    </div>
  );
}