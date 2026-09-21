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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title" style={{ marginBottom: '0.35rem' }}>
            {bucketLabel}: {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              style={{
                margin: 0,
                fontSize: '0.8rem',
                color: entry.color,
                fontWeight: 500,
              }}
            >
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card admin-chart-card">
      <MetricHead title="Desempenho das Importações" tooltip={TOOLTIP_INFO} />

      <div className="admin-chart-legend">
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--completed" />
          Concluídas
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--expired" />
          Tempo Esgotado
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--failed" />
          Falhas
        </span>
      </div>

      {totalImportacoes === 0 ? (
        <div className="admin-chart-placeholder">
          Nenhuma importação registrada no período selecionado.
        </div>
      ) : (
        <div style={{ width: '100%', height: '270px', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dias} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="dia"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              >
                <Label
                  value={bucketLabel}
                  position="insideBottom"
                  offset={-12}
                  fill="var(--text-muted)"
                  fontSize={11}
                />
              </XAxis>

              <YAxis
                stroke="var(--text-muted)"
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
                  fill="var(--text-muted)"
                  fontSize={11}
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>

              <Tooltip content={<CustomTooltip />} />

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
    </div>
  );
}