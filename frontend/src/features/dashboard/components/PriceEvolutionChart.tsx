import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { ProdutoFrequente } from '../types';

interface PriceEvolutionChartProps {
  data: ProdutoFrequente[];
}

export function PriceEvolutionChart({ data }: PriceEvolutionChartProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Resetar seleção se a lista de produtos mudar (ao mudar de mês)
  useEffect(() => {
    setSelectedIdx(0);
  }, [data]);

  const activeProduct = data[selectedIdx];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Data: {item.data}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
            Preço: {formatCurrency(item.preco)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum produto frequente encontrado.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chips Interativos */}
      <div className="product-chips-container">
        {data.map((product, idx) => (
          <button
            key={idx}
            className={`product-chip ${selectedIdx === idx ? 'product-chip--active' : ''}`}
            onClick={() => setSelectedIdx(idx)}
          >
            {product.nome}
          </button>
        ))}
      </div>

      {/* Gráfico de Linha */}
      <div style={{ width: '100%', height: '230px', marginTop: 'auto' }}>
        {activeProduct && activeProduct.historico && activeProduct.historico.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activeProduct.historico}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="data" 
                stroke="var(--text-muted)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                tickFormatter={(val) => `R$${val.toFixed(2)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="preco"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={{ r: 4, stroke: 'var(--primary)', strokeWidth: 1, fill: 'var(--bg-main)' }}
                activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2, fill: 'var(--primary)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Nenhum histórico de preço para este produto.
          </div>
        )}
      </div>
    </div>
  );
}
