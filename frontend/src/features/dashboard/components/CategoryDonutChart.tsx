import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { GastoPorCategoria } from '../types';
import { formatCurrency } from '../format';

interface CategoryDonutChartProps {
  data: GastoPorCategoria[];
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Mercado': 'var(--primary)',      // Brand green
  'Alimentação': 'var(--chart-2)',  // Brand blue
  'Combustível': 'var(--chart-3)',  // Amber
  'Farmácia': 'var(--chart-4)',     // Pink
  'Vestuário': 'var(--chart-5)',    // Teal
  'Outros': 'var(--muted-foreground)',       // Slate
};

const DEFAULT_COLOR = 'var(--muted-foreground)';

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  // Calcular total para exibir no centro do gráfico
  const total = data.reduce((acc, curr) => acc + curr.valor, 0);

  if (total === 0) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">Nenhum gasto por categoria neste mês.</div>;
  }

  return (
    <div data-scope="category-donut" className="flex min-h-64 w-full flex-col items-center gap-4 sm:flex-row">
      {/* Container do Gráfico */}
      <div className="relative h-56 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              dataKey="valor"
              nameKey="categoria"
            >
              {data.map((entry, index) => (
                <Cell
                   key={`cell-${index}`}
                   fill={CATEGORY_COLORS[entry.categoria] || DEFAULT_COLOR}
                   stroke="var(--card)"
                   strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--popover-foreground)' }} itemStyle={{ color: 'var(--popover-foreground)' }} formatter={(value, name) => [formatCurrency(Number(value)), name]} wrapperStyle={{ zIndex: 10 }} />
          </PieChart>
        </ResponsiveContainer>

        {/* Label Central */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">
            Total Gasto
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legenda Customizada */}
      <div className="flex w-full min-w-0 flex-col gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[item.categoria] || DEFAULT_COLOR }}
              />
              <span>{item.categoria}</span>
            </div>
            <div className="font-medium tabular-nums">
              <span>{formatCurrency(item.valor)}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground">{item.percentual}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
