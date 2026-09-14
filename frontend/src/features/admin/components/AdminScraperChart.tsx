import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { ScraperDia } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP_INFO =
  'Isola a causa raiz de problemas operacionais. Verde = COMPLETED (operação normal); Amarelo = EXPIRED (desistência do captcha, fricção humana/UX); Vermelho = FAILED (erro de código, bloqueio de IP ou instabilidade da SEFAZ).';

interface AdminScraperChartProps {
  dias: ScraperDia[];
}

export function AdminScraperChart({ dias }: AdminScraperChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title" style={{ marginBottom: '0.35rem' }}>
            Dia: {label}
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
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card admin-chart-card">
      <MetricHead title="Desempenho Diário do Scraper" tooltip={TOOLTIP_INFO} />

      <div className="admin-chart-legend">
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--completed" />
          Concluídas
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--expired" />
          Expiradas
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot admin-chart-legend-dot--failed" />
          Falhas
        </span>
      </div>

      <div style={{ width: '100%', height: '260px', marginTop: 'auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="dia"
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />

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
              name="Expiradas"
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
    </div>
  );
}