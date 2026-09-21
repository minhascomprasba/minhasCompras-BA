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

const variationVisual = (variacao: number): { className: string; icon: ReactElement } => {
  if (variacao > 0) {
    return {
      className: 'admin-variation--up',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ),
    };
  }
  if (variacao < 0) {
    return {
      className: 'admin-variation--down',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      ),
    };
  }
  return {
    className: 'admin-variation--neutral',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  };
};

export function AdminTopProducts({ produtos }: AdminTopProductsProps) {
  return (
    <div className="card admin-chart-card">
      <MetricHead title="Top Produtos na Bahia" tooltip={TOOLTIP} />
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th style={{ textAlign: 'right' }}>Compras</th>
              <th style={{ textAlign: 'right' }}>Preço Médio</th>
              <th style={{ textAlign: 'right' }}>Variação</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhum item catalogado no período selecionado.
                </td>
              </tr>
            ) : (
              produtos.map((produto) => {
                const variation = variationVisual(produto.variacaoPercentual);
                const absVariation = `${Math.abs(produto.variacaoPercentual).toFixed(1)}%`;
                return (
                  <tr key={produto.nome}>
                    <td>{produto.nome}</td>
                    <td style={{ textAlign: 'right' }}>{produto.ocorrencias}</td>
                    <td style={{ textAlign: 'right' }}>{formatBRL(produto.precoMedio)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`admin-variation ${variation.className}`}>
                        {variation.icon}
                        {absVariation}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}