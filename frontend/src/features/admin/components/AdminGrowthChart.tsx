import { AdminChartTooltip } from './AdminChartTooltip';
import { Card } from '../../../components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Label,
} from 'recharts';
import type { AdesaoSemana } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP_INFO =
  'Evolução comparativa entre a chegada de novos usuários e o total de notas adicionadas à plataforma.';

const USUARIOS_COLOR = '#17c85f';
const NOTAS_COLOR = '#3a8fe0';

interface AdminGrowthChartProps {
  pontos: AdesaoSemana[];
  bucketLabel: string;
}

export function AdminGrowthChart({ pontos, bucketLabel }: AdminGrowthChartProps) {
  return (
    <Card className="min-w-0 gap-4 px-4">
      <MetricHead
        title="Crescimento de Usuários e Notas"
        tooltip={TOOLTIP_INFO}
      />

      <div className="flex flex-wrap gap-4">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: USUARIOS_COLOR }} />
          Usuários
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ background: NOTAS_COLOR }} />
          Notas Importadas
        </span>
      </div>

      {pontos.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">Sem histórico suficiente para o período.</div>
      ) : (
        <div style={{ width: '100%', height: '270px', marginTop: 'auto' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pontos} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
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

              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="semana"
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
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              >
                <Label
                  value="Total Acumulado"
                  angle={-90}
                  position="insideLeft"
                  offset={-2}
                  fill="var(--muted-foreground)"
                  fontSize={11}
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>

              <Tooltip content={props => <AdminChartTooltip {...props} bucketLabel={bucketLabel} />} />

              <Area
                type="monotone"
                dataKey="usuarios"
                name="Usuários"
                stroke={USUARIOS_COLOR}
                strokeWidth={2.5}
                fill="url(#colorUsuarios)"
                dot={{ r: 3, fill: USUARIOS_COLOR, stroke: 'var(--background)', strokeWidth: 1 }}
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
                dot={{ r: 3, fill: NOTAS_COLOR, stroke: 'var(--background)', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: NOTAS_COLOR }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}