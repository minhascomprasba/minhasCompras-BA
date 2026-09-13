import type { ReactElement } from 'react';
import type { AdminKpi, KpiIconKey } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface AdminKpiGridProps {
  kpis: AdminKpi[];
}

const kpiVisuals: Record<KpiIconKey, { tone: string; icon: ReactElement }> = {
  citizens: {
    tone: 'blue',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  receipts: {
    tone: 'green',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  items: {
    tone: 'amber',
    icon: (
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
    ),
  },
  volume: {
    tone: 'pink',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  stability: {
    tone: 'red',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
};

const toneClass: Record<string, string> = {
  blue: 'admin-kpi-icon--blue',
  green: 'admin-kpi-icon--green',
  amber: 'admin-kpi-icon--amber',
  pink: 'admin-kpi-icon--pink',
  red: 'admin-kpi-icon--red',
};

export function AdminKpiGrid({ kpis }: AdminKpiGridProps) {
  return (
    <div className="admin-kpi-grid">
      {kpis.map((kpi) => {
        const visual = kpiVisuals[kpi.icon];
        return (
          <div key={kpi.id} className="card admin-kpi-card">
            <div className={`admin-kpi-icon-wrap ${toneClass[visual.tone] ?? ''}`}>
              {visual.icon}
            </div>
            <div className="admin-kpi-content">
              <div className="admin-kpi-label-row">
                <p className="admin-kpi-label">{kpi.label}</p>
                <InfoTooltip content={kpi.description} />
              </div>
              <p className="admin-kpi-value">{kpi.value}</p>
              {kpi.extraMetric && (
                <p className="admin-kpi-extra">
                  {kpi.extraMetric.label}: {kpi.extraMetric.value}
                </p>
              )}
              <p className={`admin-kpi-trend admin-kpi-trend--${kpi.trendDirection}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {kpi.trendDirection === 'up' ? (
                    <>
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </>
                  ) : (
                    <>
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      <polyline points="17 18 23 18 23 12" />
                    </>
                  )}
                </svg>
                {kpi.trendLabel}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}