import type { AdesaoSemana } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP =
  'Cruza a entrada de novos usuários com a produtividade da plataforma: revela se o crescimento do banco de dados é puxado por muitos usuários novos ou pela alta frequência dos antigos (retenção).';

interface AdminGrowthChartProps {
  pontos: AdesaoSemana[];
}

interface ChartPoint {
  x: number;
  y: number;
}

function normalizeValues(values: number[]): ChartPoint[] {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  return values.map((v, i) => ({
    x: n === 1 ? 50 : (i / (n - 1)) * 100,
    y: 88 - ((v - min) / spread) * 76,
  }));
}

function buildSmoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y} L ${points[0].x},${points[0].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x},${points[i].y} ${midX},${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x},${last.y}`;
  return d;
}

const USUARIOS_COLOR = '#17c85f';
const NOTAS_COLOR = '#3a8fe0';

export function AdminGrowthChart({ pontos }: AdminGrowthChartProps) {
  const usuariosPts = normalizeValues(pontos.map((p) => p.usuarios));
  const notasPts = normalizeValues(pontos.map((p) => p.notas));
  const usuariosPath = buildSmoothPath(usuariosPts);
  const notasPath = buildSmoothPath(notasPts);

  return (
    <div className="card admin-chart-card">
      <MetricHead
        title="Crescimento e Adesão (Usuários x Notas)"
        tooltip={TOOLTIP}
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
      <div className="admin-chart-placeholder">
        <svg className="admin-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <path d={usuariosPath} fill="none" stroke={USUARIOS_COLOR} strokeWidth="2" />
          <path
            d={notasPath}
            fill="none"
            stroke={NOTAS_COLOR}
            strokeWidth="2"
            strokeDasharray="3 2"
          />
          {usuariosPts.map((p, i) => (
            <circle key={`u-${i}`} cx={p.x} cy={p.y} fill="var(--bg-main)" r="1.5" stroke={USUARIOS_COLOR} strokeWidth="1" />
          ))}
          {notasPts.map((p, i) => (
            <circle key={`n-${i}`} cx={p.x} cy={p.y} fill="var(--bg-main)" r="1.5" stroke={NOTAS_COLOR} strokeWidth="1" />
          ))}
        </svg>
      </div>
    </div>
  );
}