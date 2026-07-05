import type { DashboardData } from './types';

export const mockDashboardData: DashboardData[] = [
  {
    mesAno: 'Junho 2026',
    mediaGastosMensal: 1250.50,
    quantidadeNotas: 12,
    ticketMedio: 104.20,
    gastosPorCategoria: [
      { categoria: 'Mercado', valor: 650.30, percentual: 52 },
      { categoria: 'Alimentação', valor: 225.40, percentual: 18 },
      { categoria: 'Combustível', valor: 180.00, percentual: 14.4 },
      { categoria: 'Farmácia', valor: 95.80, percentual: 7.6 },
      { categoria: 'Vestuário', valor: 70.00, percentual: 5.6 },
      { categoria: 'Outros', valor: 29.00, percentual: 2.4 }
    ],
    produtosFrequentes: [
      {
        nome: 'Leite Integral 1L',
        historico: [
          { data: '02/06', preco: 4.89 },
          { data: '08/06', preco: 4.99 },
          { data: '15/06', preco: 5.15 },
          { data: '22/06', preco: 5.29 }
        ]
      },
      {
        nome: 'Arroz Integral 1kg',
        historico: [
          { data: '02/06', preco: 7.20 },
          { data: '12/06', preco: 7.45 },
          { data: '22/06', preco: 7.45 }
        ]
      },
      {
        nome: 'Café Torrado 500g',
        historico: [
          { data: '05/06', preco: 18.90 },
          { data: '18/06', preco: 19.50 }
        ]
      },
      {
        nome: 'Azeite Extra Virgem 500ml',
        historico: [
          { data: '02/06', preco: 38.90 },
          { data: '15/06', preco: 41.20 }
        ]
      },
      {
        nome: 'Pão de Forma 500g',
        historico: [
          { data: '02/06', preco: 8.49 },
          { data: '08/06', preco: 8.59 },
          { data: '18/06', preco: 8.49 },
          { data: '25/06', preco: 8.79 }
        ]
      }
    ],
    gruposNcmSemGtin: [
      { ncm: '21069090', categoria: 'Mercado', quantidade_produtos: 2, valor_total: 45.80 }
    ]
  },
  {
    mesAno: 'Maio 2026',
    mediaGastosMensal: 1180.20,
    quantidadeNotas: 15,
    ticketMedio: 78.68,
    gastosPorCategoria: [
      { categoria: 'Mercado', valor: 590.10, percentual: 50 },
      { categoria: 'Alimentação', valor: 177.03, percentual: 15 },
      { categoria: 'Combustível', valor: 212.44, percentual: 18 },
      { categoria: 'Farmácia', valor: 118.02, percentual: 10 },
      { categoria: 'Vestuário', valor: 59.01, percentual: 5 },
      { categoria: 'Outros', valor: 23.60, percentual: 2 }
    ],
    produtosFrequentes: [
      {
        nome: 'Leite Integral 1L',
        historico: [
          { data: '03/05', preco: 4.69 },
          { data: '10/05', preco: 4.79 },
          { data: '17/05', preco: 4.89 },
          { data: '24/05', preco: 4.85 }
        ]
      },
      {
        nome: 'Arroz Integral 1kg',
        historico: [
          { data: '03/05', preco: 6.95 },
          { data: '15/05', preco: 7.20 }
        ]
      },
      {
        nome: 'Café Torrado 500g',
        historico: [
          { data: '05/05', preco: 18.50 },
          { data: '20/05', preco: 18.90 }
        ]
      },
      {
        nome: 'Azeite Extra Virgem 500ml',
        historico: [
          { data: '03/05', preco: 37.50 },
          { data: '17/05', preco: 38.90 }
        ]
      },
      {
        nome: 'Pão de Forma 500g',
        historico: [
          { data: '03/05', preco: 8.29 },
          { data: '12/05', preco: 8.49 },
          { data: '22/05', preco: 8.49 }
        ]
      }
    ],
    gruposNcmSemGtin: [
      { ncm: '21069090', categoria: 'Mercado', quantidade_produtos: 2, valor_total: 45.80 }
    ]
  },
  {
    mesAno: 'Abril 2026',
    mediaGastosMensal: 1320.00,
    quantidadeNotas: 10,
    ticketMedio: 132.00,
    gastosPorCategoria: [
      { categoria: 'Mercado', valor: 726.00, percentual: 55 },
      { categoria: 'Alimentação', valor: 158.40, percentual: 12 },
      { categoria: 'Combustível', valor: 198.00, percentual: 15 },
      { categoria: 'Farmácia', valor: 66.00, percentual: 5 },
      { categoria: 'Vestuário', valor: 132.00, percentual: 10 },
      { categoria: 'Outros', valor: 39.60, percentual: 3 }
    ],
    produtosFrequentes: [
      {
        nome: 'Leite Integral 1L',
        historico: [
          { data: '02/04', preco: 4.49 },
          { data: '12/04', preco: 4.59 },
          { data: '22/04', preco: 4.65 }
        ]
      },
      {
        nome: 'Arroz Integral 1kg',
        historico: [
          { data: '02/04', preco: 6.80 },
          { data: '15/04', preco: 6.95 }
        ]
      },
      {
        nome: 'Café Torrado 500g',
        historico: [
          { data: '05/04', preco: 17.90 },
          { data: '18/04', preco: 18.50 }
        ]
      },
      {
        nome: 'Azeite Extra Virgem 500ml',
        historico: [
          { data: '02/04', preco: 36.90 },
          { data: '20/04', preco: 37.50 }
        ]
      },
      {
        nome: 'Pão de Forma 500g',
        historico: [
          { data: '02/04', preco: 7.99 },
          { data: '15/04', preco: 8.29 }
        ]
      }
    ]
  }
];
