import { AdminChartTooltip } from './AdminChartTooltip';
import { Card } from '../../../components/ui/card';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Label,
} from 'recharts';
import type { ScraperDia } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP_INFO =
  'Resultado das importações: concluídas com sucesso, canceladas por tempo limite ou com falha na consulta.';

interface AdminScraperChartProps {
  dias: ScraperDia[];
  bucketLabel: string;
}

export function AdminScraperChart({ dias, bucketLabel }: AdminScraperChartProps) {
  const totalImportacoes = dias.reduce(
    (total, dia) => total + dia.completed + dia.expired + dia.failed,
    0
  );

  return (
    <Card className="min-w-0 gap-4 px-4">
      <MetricHead title="Desempenho das Importações" tooltip={TOOLTIP_INFO} />

      <div className="flex flex-wrap gap-4">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-sm bg-primary" />
          Concluídas
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-sm bg-amber-400" />
          Tempo Esgotado
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-sm bg-red-400" />
          Falhas
        </span>
      </div>

      {totalImportacoes === 0 ? (
        <div className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
          Nenhuma importação registrada no período selecionado.
        </div>
      ) : (
        <div style={{ width: '100%', height: '270px', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dias} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="dia"
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              >
                <Label
                  value={bucketLabel}
                  position="insideBottom"
                  offset={-12}
                  fill="var(--muted-foreground)"
                  fontSize={11}
                />
              </XAxis>

              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              >
                <Label
                  value="Qtd. Importações"
                  angle={-90}
                  position="insideLeft"
                  offset={-2}
                  fill="var(--muted-foreground)"
                  fontSize={11}
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>

              <Tooltip content={props => <AdminChartTooltip {...props} bucketLabel={bucketLabel} />} />

              <Bar
                dataKey="completed"
                name="Concluídas"
                stackId="scraper"
                fill="#17c85f"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="expired"
                name="Tempo Esgotado"
                stackId="scraper"
                fill="#f59e0b"
              />
              <Bar
                dataKey="failed"
                name="Falhas"
                stackId="scraper"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
