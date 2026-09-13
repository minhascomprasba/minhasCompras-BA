import type { ScraperDia } from '../types';

interface AdminScraperChartProps {
  dias: ScraperDia[];
}

const BAR_MAX_COLOR = 'rgba(23, 200, 95, 0.8)';
const BAR_MIN_COLOR = 'rgba(245, 158, 11, 0.8)';
const BAR_DEFAULT_COLOR = 'rgba(58, 143, 224, 0.8)';

export function AdminScraperChart({ dias }: AdminScraperChartProps) {
  const maxTaxa = Math.max(...dias.map((d) => d.taxa));
  const minTaxa = Math.min(...dias.map((d) => d.taxa));

  return (
    <div className="card admin-chart-card">
      <h3 className="admin-chart-title">Performance do Scraper</h3>
      <div className="admin-bar-chart">
        {dias.map((d) => {
          const color =
            d.taxa === maxTaxa
              ? BAR_MAX_COLOR
              : d.taxa === minTaxa
                ? BAR_MIN_COLOR
                : BAR_DEFAULT_COLOR;
          return (
            <div key={d.dia} className="admin-bar-column">
              <div className="admin-bar" style={{ height: `${d.taxa}%`, background: color }} />
              <span className="admin-bar-label">{d.dia}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}