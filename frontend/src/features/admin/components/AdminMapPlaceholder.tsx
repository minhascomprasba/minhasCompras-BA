import type { AlcanceGeografico } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP =
  'Distribuição geográfica das compras por município e principais redes comerciais registradas pelos usuários.';

interface AdminMapPlaceholderProps {
  alcance: AlcanceGeografico;
}

export function AdminMapPlaceholder({ alcance }: AdminMapPlaceholderProps) {
  return (
    <div className="card admin-chart-card">
      <MetricHead title="Alcance Geográfico e Redes" tooltip={TOOLTIP} />
      <div className="admin-map-placeholder">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--border-light)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <p>{alcance.nota}</p>
        <p className="admin-map-placeholder-stats">
          {alcance.totalCidades} municípios &bull; {alcance.redesMonitoradas} redes registradas
        </p>
        <div className="admin-map-redes">
          {alcance.redesLideres.map((rede) => (
            <span key={rede} className="admin-map-redes-chip">
              {rede}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}