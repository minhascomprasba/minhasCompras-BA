import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { GastoPorCategoria } from '../types';

interface CategoryDonutChartProps {
  data: GastoPorCategoria[];
}

const CATEGORY_COLORS: { [key: string]: string } = {
  'Mercado': '#17c85f',      // Brand green
  'Alimentação': '#3a8fe0',  // Brand blue
  'Combustível': '#f59e0b',  // Amber
  'Farmácia': '#ec4899',     // Pink
  'Vestuário': '#14b8a6',    // Teal
  'Outros': '#64748b',       // Slate
};

const DEFAULT_COLOR = '#94a3b8';

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  // Calcular total para exibir no centro do gráfico
  const total = data.reduce((acc, curr) => acc + curr.valor, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-title">
            {item.categoria}
          </p>
          <p className="chart-tooltip-value" style={{ color: CATEGORY_COLORS[item.categoria] || DEFAULT_COLOR }}>
            {formatCurrency(item.valor)} ({item.percentual}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="donut-chart-layout-wrapper">
      {/* Container do Gráfico */}
      <div className="donut-chart-svg-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="valor"
              nameKey="categoria"
            >
              {data.map((entry, index) => (
                <Cell 
                   key={`cell-${index}`} 
                   fill={CATEGORY_COLORS[entry.categoria] || DEFAULT_COLOR} 
                   stroke="rgba(11, 15, 25, 0.5)"
                   strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 10 }} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Label Central */}
        <div className="donut-chart-center-label">
          <span className="label-title">
            Total Gasto
          </span>
          <span className="label-value">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Legenda Customizada */}
      <div className="donut-legend-container">
        {data.map((item, index) => (
          <div key={index} className="donut-legend-item">
            <div className="donut-legend-label">
              <span 
                className="donut-legend-color" 
                style={{ backgroundColor: CATEGORY_COLORS[item.categoria] || DEFAULT_COLOR }}
              />
              <span>{item.categoria}</span>
            </div>
            <div className="donut-legend-values">
              <span>{formatCurrency(item.valor)}</span>
              <span className="donut-legend-percentage">{item.percentual}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
