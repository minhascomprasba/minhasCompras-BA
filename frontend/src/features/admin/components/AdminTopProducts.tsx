import { ArrowUpIcon as ArrowUp, ArrowDownIcon as ArrowDown, MinusIcon as Minus } from '@phosphor-icons/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Card } from '../../../components/ui/card';
import type { ReactElement } from 'react';
import type { TopProduto } from '../types';
import { MetricHead } from './MetricHead';

const TOOLTIP =
  'Produtos mais comprados pelos usuários no período e seus respectivos preços médios na Bahia.';

interface AdminTopProductsProps {
  produtos: TopProduto[];
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const IconUp = (
  <ArrowUp size={14} aria-hidden="true" />
);

const IconDown = (
  <ArrowDown size={14} aria-hidden="true" />
);

const IconNeutral = (
  <Minus size={14} aria-hidden="true" />
);

const variationVisual = (variacao: number): { className: string; icon: ReactElement } => {
  if (variacao > 0) {
    return { className: 'text-primary', icon: IconUp };
  }
  if (variacao < 0) {
    return { className: 'text-red-300', icon: IconDown };
  }
  return { className: 'text-muted-foreground', icon: IconNeutral };
};

export function AdminTopProducts({ produtos }: AdminTopProductsProps) {
  return (
    <Card className="min-w-0 gap-4 px-4">
      <MetricHead title="Top Produtos na Bahia" tooltip={TOOLTIP} />

      <div className="space-y-2">
        <div className="m-0 text-xs text-muted-foreground">
          Variação do preço médio em relação ao período anterior
        </div>
        <div className="flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-primary">{IconUp}</span>
            Subiu
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-red-300">{IconDown}</span>
            Caiu
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-muted-foreground">{IconNeutral}</span>
            Estável / sem base
          </span>
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <Table aria-label="Produtos mais comprados">
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Produto</TableHead>
              <TableHead scope="col" className="text-right tabular-nums">Compras</TableHead>
              <TableHead scope="col" className="text-right tabular-nums">Preço Médio</TableHead>
              <TableHead scope="col" className="text-right tabular-nums">Variação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhum item catalogado no período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              produtos.map((produto) => {
                const variation = variationVisual(produto.variacaoPercentual);
                const absVariation = `${Math.abs(produto.variacaoPercentual).toFixed(1)}%`;
                return (
                  <TableRow key={produto.nome}>
                    <TableCell>{produto.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{produto.ocorrencias}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(produto.precoMedio)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={`inline-flex items-center justify-end gap-1 whitespace-nowrap ${variation.className}`}>
                        {variation.icon}
                        {absVariation}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
