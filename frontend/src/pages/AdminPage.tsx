import { useState } from 'react';
import { useAdminData } from '../features/admin/hooks/useAdminData';
import { AdminHeader } from '../features/admin/components/AdminHeader';
import { AdminKpiGrid } from '../features/admin/components/AdminKpiGrid';
import { AdminGrowthChart } from '../features/admin/components/AdminGrowthChart';
import { AdminScraperChart } from '../features/admin/components/AdminScraperChart';
import { AdminTopProducts } from '../features/admin/components/AdminTopProducts';
import { AdminMapPlaceholder } from '../features/admin/components/AdminMapPlaceholder';
import { AdminTelemetryGrid } from '../features/admin/components/AdminTelemetryGrid';
import { AdminLogsTable } from '../features/admin/components/AdminLogsTable';
import type { AdminPeriod } from '../features/admin/types';
import { useAuth } from '../features/auth/AuthContext';

export function AdminPage() {
  const [period, setPeriod] = useState<AdminPeriod>('30d');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  const { isSuperAdmin } = useAuth();
  const { data, isLoading, isError, error, isFetching } = useAdminData(
    period,
    selectedMonth,
    selectedYear
  );

  if (isLoading) {
    return (
      <div className="container dashboard-loading-container">
        <div className="dashboard-spinner-wrap">
          <div className="dashboard-spinner"></div>
          <span style={{ color: 'var(--text-secondary)' }}>Carregando indicadores...</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container dashboard-error-container">
        <div className="dashboard-error-card">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: '12px' }}
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2>Erro ao carregar indicadores</h2>
          <p>{error?.message || 'Ocorreu um erro ao carregar os dados administrativos. Tente novamente mais tarde.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container admin-container">
      <AdminHeader
        period={period}
        onPeriodChange={setPeriod}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        janelaLabel={data.janelaLabel}
        isRefreshing={isFetching}
        showUsersLink={isSuperAdmin}
      />

      <AdminKpiGrid kpis={data.kpis} />

      <div className="admin-charts-grid">
        <AdminGrowthChart pontos={data.crescimentoAdesao} bucketLabel={data.bucketLabel} />
        <AdminScraperChart dias={data.performanceScraper} bucketLabel={data.bucketLabel} />
      </div>

      <div className="admin-charts-grid">
        <AdminTopProducts produtos={data.topProdutos} />
        <AdminMapPlaceholder alcance={data.alcanceGeografico} />
      </div>

      <AdminTelemetryGrid telemetria={data.telemetria} />

      <AdminLogsTable logs={data.logs} />
    </div>
  );
}