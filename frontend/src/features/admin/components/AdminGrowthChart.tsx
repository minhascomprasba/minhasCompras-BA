import type { AdesaoPonto } from '../types';

interface AdminGrowthChartProps {
  pontos: AdesaoPonto[];
}

interface ChartPoint {
  x: number;
  y: number;
}

function normalizePoints(pontos: AdesaoPonto[]): ChartPoint[] {
  const values = pontos.map((p) => p.usuarios);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  const n = pontos.length;

  return pontos.map((p, i) => ({
    x: n === 1 ? 50 : (i / (n - 1)) * 100,
    y: 90 - ((p.usuarios - min) / spread) * 80,
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

export function AdminGrowthChart({ pontos }: AdminGrowthChartProps) {
  const chartPoints = normalizePoints(pontos);
  const path = buildSmoothPath(chartPoints);

  return (
    <div className="card admin-chart-card">
      <h3 className="admin-chart-title">Crescimento de Adesão</h3>
      <div className="admin-chart-placeholder">
        <svg className="admin-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <path d={path} fill="none" stroke="#17c85f" strokeWidth="2" />
          {chartPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} fill="var(--bg-main)" r="1.5" stroke="#17c85f" strokeWidth="1" />
          ))}
        </svg>
      </div>
    </div>
  );
}