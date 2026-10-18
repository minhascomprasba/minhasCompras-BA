import { FileText, Tag, Wallet } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import type { DashboardData } from '../types';
import { formatCurrency } from '../format';

export function DashboardMetrics({ data }: { data: DashboardData }) {
  const metrics = [
    { label: 'Total Gasto no Mês', value: formatCurrency(data.mediaGastosMensal), icon: Wallet },
    { label: 'Notas Lidas no Mês', value: `${data.quantidadeNotas} ${data.quantidadeNotas === 1 ? 'nota' : 'notas'}`, icon: FileText },
    { label: 'Ticket Médio por Nota', value: formatCurrency(data.ticketMedio), icon: Tag },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <CardDescription>{label}</CardDescription>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
