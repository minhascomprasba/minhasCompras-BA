import { UsersIcon as Users, FileTextIcon as FileText, TableIcon as Table, CurrencyDollarIcon as CurrencyDollar, MagnifyingGlassMinusIcon as MagnifyingGlassMinus, TrendUpIcon as TrendUp, TrendDownIcon as TrendDown } from '@phosphor-icons/react';
import { Card } from '../../../components/ui/card';
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
      <Users size={22} aria-hidden="true" />
    ),
  },
  receipts: {
    tone: 'green',
    icon: (
      <FileText size={22} aria-hidden="true" />
    ),
  },
  items: {
    tone: 'amber',
    icon: (
      <Table size={22} aria-hidden="true" />
    ),
  },
  volume: {
    tone: 'pink',
    icon: (
      <CurrencyDollar size={22} aria-hidden="true" />
    ),
  },
  stability: {
    tone: 'red',
    icon: (
      <MagnifyingGlassMinus size={22} aria-hidden="true" />
    ),
  },
};

const toneClass: Record<string, string> = {
  blue: 'bg-blue-400/10 text-blue-300',
  green: 'bg-primary/10 text-primary',
  amber: 'bg-amber-400/10 text-amber-300',
  pink: 'bg-pink-400/10 text-pink-300',
  red: 'bg-red-400/10 text-red-300',
};

export function AdminKpiGrid({ kpis }: AdminKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => {
        const visual = kpiVisuals[kpi.icon];
        return (
          <Card key={kpi.id} className="row-span-4 grid min-w-0 grid-rows-subgrid gap-2 px-4">
            <div className="flex items-start gap-2">
              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4 ${toneClass[visual.tone] ?? ''}`}>
                {visual.icon}
              </div>
              <div className="min-w-0 flex-1 self-center text-xs font-medium text-muted-foreground">{kpi.label}</div>
              <InfoTooltip content={kpi.description} />
            </div>
            <div className="min-w-0 text-xl font-bold break-words text-foreground tabular-nums">{kpi.value}</div>
            <div className="min-w-0 text-xs break-words text-muted-foreground">
              {kpi.extraMetric && <>{kpi.extraMetric.label}: {kpi.extraMetric.value}</>}
            </div>
              <div className={`m-0 flex min-w-0 items-start gap-1 text-xs ${kpi.trendDirection === 'up' ? 'text-primary' : 'text-red-300'}`}>
                {kpi.trendDirection === 'up' ? <TrendUp size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <TrendDown size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
                <span className="min-w-0 break-words">{kpi.trendLabel}</span>
              </div>
          </Card>
        );
      })}
    </div>
  );
}
