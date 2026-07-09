import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { ProdutoFrequente } from '../types';

interface PriceEvolutionChartProps {
  data: ProdutoFrequente[];
  onProductSelect?: (productName: string) => void;
}

export function PriceEvolutionChart({ data, onProductSelect }: PriceEvolutionChartProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resetar seleção se a lista de produtos mudar (ao mudar de mês)
  useEffect(() => {
    setSelectedIdx(0);
    setSearchTerm('');
    setIsDropdownOpen(false);
    if (data && data.length > 0) {
      onProductSelect?.(data[0].nome);
    }
  }, [data, onProductSelect]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeProduct = data[selectedIdx];

  const filteredProducts = data
    .map((p, idx) => ({ ...p, originalIdx: idx }))
    .filter((p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleSelect = (originalIdx: number) => {
    setSelectedIdx(originalIdx);
    setSearchTerm('');
    setIsDropdownOpen(false);
    const product = data[originalIdx];
    if (product) {
      onProductSelect?.(product.nome);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="chart-tooltip">
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
    return <div className="price-chart-empty">Nenhum produto frequente encontrado.</div>;
  }

  return (
    <div className="price-chart-wrapper">
      {/* Barra de Pesquisa com Autocomplete */}
      <div ref={wrapperRef} className="product-search-wrapper">
        <div className="product-search-input-wrapper">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="product-search-icon"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="product-search-input"
            placeholder="Pesquisar produto..."
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
          />
        </div>

        {/* Dropdown de Sugestões */}
        {isDropdownOpen && (
          <div className="product-search-dropdown">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <button
                  key={product.originalIdx}
                  className={`product-search-option ${product.originalIdx === selectedIdx ? 'product-search-option--active' : ''}`}
                  onClick={() => handleSelect(product.originalIdx)}
                >
                  {product.nome}
                </button>
              ))
            ) : (
              <div className="product-search-empty">
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* O indicador de produto ativo agora é exibido como subtítulo do card controlado pelo pai */}

      {/* Gráfico de Linha */}
      <div className="price-evolution-chart-container">
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
