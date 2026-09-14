export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  resumo?: {
    total_gasto_periodo: number;
  };
}

export interface Nota {
  id: number;
  codigo_acesso: string;
  created_at: string;
  data_compra?: string | null;
  itens_count?: number;
  valor_total_nota?: number;
  meio_pagamento?: string | null;
}

export interface NotaItem {
  id: number;
  id_nota_fiscal: number;
  descricao: string;
  quantidade: number;
  valor_total: number;
  unidade_comercial: string;
  codigo_ean_comercial?: string;
  codigo_NCM_comercial?: string;
  sem_gtin?: boolean;
}

export interface GetNotasParams {
  page?: number;
  page_size?: number;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

export interface GetNotaItensParams {
  page?: number;
  page_size?: number;
}
