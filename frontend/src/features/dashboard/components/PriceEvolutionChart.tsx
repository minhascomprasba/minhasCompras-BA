import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { ProdutoFrequente } from '../types';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '../format';

interface PriceEvolutionChartProps {
  data: ProdutoFrequente[];
  onProductSelect?: (productName: string) => void;
}

export function PriceEvolutionChart({ data, onProductSelect }: PriceEvolutionChartProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProdutoFrequente | null>(null);
  const activeProduct = data.find((product) => product === selectedProduct) ?? data[0];

  useEffect(() => {
    onProductSelect?.(activeProduct?.nome ?? '');
  }, [activeProduct, onProductSelect]);

  if (data.length === 0) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">Nenhum produto frequente encontrado.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dashboard-product">Pesquisar produto</Label>
        <Combobox items={data} value={activeProduct} onValueChange={setSelectedProduct} itemToStringLabel={(product) => product.nome}>
          <ComboboxInput id="dashboard-product" placeholder="Pesquisar produto..." />
          <ComboboxContent>
            <ComboboxEmpty>Nenhum produto encontrado.</ComboboxEmpty>
            <ComboboxList>
              {(product: ProdutoFrequente) => <ComboboxItem key={data.indexOf(product)} value={product}>{product.nome}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {/* Gráfico de Linha */}
      <div className="h-64 w-full min-w-0">
        {activeProduct && activeProduct.historico && activeProduct.historico.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart accessibilityLayer
              data={activeProduct.historico}
              margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="data"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                width={85}
                tickFormatter={formatCurrency}
              />
              <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--popover-foreground)' }} formatter={(value) => [formatCurrency(Number(value)), 'Preço']} labelFormatter={(label) => `Data: ${label}`} />
              <Line
                type="monotone"
                dataKey="preco"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={{ r: 4, stroke: 'var(--primary)', strokeWidth: 1, fill: 'var(--card)' }}
                activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2, fill: 'var(--primary)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Nenhum histórico de preço para este produto.
          </div>
        )}
      </div>
    </div>
  );
}
