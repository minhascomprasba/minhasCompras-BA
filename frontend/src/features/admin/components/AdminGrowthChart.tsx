import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { AdesaoSemana } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP_INFO =
  'Cruza a entrada de novos usuários com a produtividade da plataforma: revela se o crescimento do banco de dados é puxado por muitos usuários novos ou pela alta frequência dos antigos (retenção).';

const USUARIOS_COLOR = '#17c85f';
const NOTAS_COLOR = '#3a8fe0';

interface AdminGrowthChartProps {
  pontos: AdesaoSemana[];
  bucketLabel: string;
}

export function AdminGrowthChart({ pontos, bucketLabel }: AdminGrowthChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title" style={{ marginBottom: '0.25rem' }}>
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
              {entry.name}: {entry.value.toLocaleString('pt-BR')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card admin-chart-card">
      <MetricHead
        title="Crescimento e Adesão (Usuários x Notas)"
        tooltip={TOOLTIP_INFO}
      />

      <div className="admin-chart-legend">
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot" style={{ background: USUARIOS_COLOR }} />
          Usuários
        </span>
        <span className="admin-chart-legend-item">
          <span className="admin-chart-legend-dot" style={{ background: NOTAS_COLOR }} />
          Notas Importadas
        </span>
      </div>

      {pontos.length === 0 ? (
        <div className="admin-chart-placeholder">Sem histórico suficiente para o período.</div>
      ) : (
      <div style={{ width: '100%', height: '260px', marginTop: 'auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pontos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={USUARIOS_COLOR} stopOpacity={0.35} />
                <stop offset="95%" stopColor={USUARIOS_COLOR} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNotas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={NOTAS_COLOR} stopOpacity={0.25} />
                <stop offset="95%" stopColor={NOTAS_COLOR} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="semana"
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
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />

            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="usuarios"
              name="Usuários"
              stroke={USUARIOS_COLOR}
              strokeWidth={2.5}
              fill="url(#colorUsuarios)"
              dot={{ r: 3, fill: USUARIOS_COLOR, stroke: 'var(--bg-main)', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: USUARIOS_COLOR }}
            />
            <Area
              type="monotone"
              dataKey="notas"
              name="Notas Importadas"
              stroke={NOTAS_COLOR}
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#colorNotas)"
              dot={{ r: 3, fill: NOTAS_COLOR, stroke: 'var(--bg-main)', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: NOTAS_COLOR }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}