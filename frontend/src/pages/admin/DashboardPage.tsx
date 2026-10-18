import { useState } from 'react';
import { useAdminData } from '../../features/admin/hooks/useAdminData';
import { AdminHeader } from '../../features/admin/components/AdminHeader';
import { AdminKpiGrid } from '../../features/admin/components/AdminKpiGrid';
import { AdminGrowthChart } from '../../features/admin/components/AdminGrowthChart';
import { AdminScraperChart } from '../../features/admin/components/AdminScraperChart';
import { AdminTopProducts } from '../../features/admin/components/AdminTopProducts';
import { AdminMap } from '../../features/admin/components/AdminMap';
import { AdminTelemetryGrid } from '../../features/admin/components/AdminTelemetryGrid';
import { AdminLogsTable } from '../../features/admin/components/AdminLogsTable';
import type { AdminPeriod } from '../../features/admin/types';
import { useAuth } from '../../features/auth/AuthContext';

import { Alert } from '../../components/ui/alert';
import { CircleNotchIcon as LoaderCircle } from '@phosphor-icons/react';
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function DashboardPage() {
  const [period, setPeriod] = useState<AdminPeriod>('30d');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));

  const { isSuperAdmin } = useAuth();
  const { data, isLoading, isError, error, isFetching } = useAdminData(
    period,
    selectedMonth,
    selectedYear
  );

  if (isLoading) {
    return <div role="status" className="flex min-h-80 items-center justify-center gap-2 text-muted-foreground"><LoaderCircle className="size-6 animate-spin" aria-hidden="true" />Carregando indicadores...</div>;
  }
  if (isError || !data) {
    return <div className="mx-auto w-full max-w-6xl px-4 py-8"><Alert variant="destructive"><strong>Erro ao carregar indicadores: </strong>{error?.message || 'Ocorreu um erro ao carregar os dados de gestão. Tente novamente mais tarde.'}</Alert></div>;
  }

  return (
    <div data-scope="admin" className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 text-foreground sm:px-6 sm:py-8">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminGrowthChart pontos={data.crescimentoAdesao} bucketLabel={data.bucketLabel} />
        <AdminScraperChart dias={data.performanceScraper} bucketLabel={data.bucketLabel} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminTopProducts produtos={data.topProdutos} />
        <AdminMap alcance={data.alcanceGeografico} />
      </div>

      <AdminTelemetryGrid telemetria={data.telemetria} />

      <AdminLogsTable logs={data.logs} />
    </div>
  );
}
