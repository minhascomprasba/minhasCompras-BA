export interface GastoPorCategoria {
  categoria: string;
  valor: number;
  percentual: number;
}

export interface HistoricoPreco {
  data: string; // Formato DD/MM ou YYYY-MM-DD
  preco: number;
}

export interface ProdutoFrequente {
  nome: string;
  historico: HistoricoPreco[];
  codigo_NCM_comercial?: string | null;
  sem_gtin?: boolean;
}

export interface GrupoNcmSemGtin {
  ncm: string;
  categoria: string;
  quantidade_produtos: number;
  valor_total: number;
}

export interface DashboardData {
  mesAno: string; // Ex: "Junho 2026"
  mediaGastosMensal: number;
  quantidadeNotas: number;
  ticketMedio: number;
  gastosPorCategoria: GastoPorCategoria[];
  produtosFrequentes: ProdutoFrequente[];
  gruposNcmSemGtin?: GrupoNcmSemGtin[];
}
