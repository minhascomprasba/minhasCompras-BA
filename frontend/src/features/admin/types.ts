import type { UserRole } from '../auth/authService';

export type TrendDirection = 'up' | 'down';

export type KpiIconKey = 'citizens' | 'receipts' | 'items' | 'volume' | 'stability';

export type AdminPeriod = '7d' | '30d' | 'mes' | 'ano' | 'geral';

export interface KpiExtraMetric {
  label: string;
  value: string;
}

export interface AdminKpi {
  id: string;
  icon: KpiIconKey;
  label: string;
  value: string;
  trendLabel: string;
  trendDirection: TrendDirection;
  description: string;
  extraMetric?: KpiExtraMetric;
}

export interface AdesaoSemana {
  semana: string;
  usuarios: number;
  notas: number;
}

export interface ScraperDia {
  dia: string;
  completed: number;
  expired: number;
  failed: number;
}

export interface TopProduto {
  nome: string;
  precoMedio: number;
  variacaoPercentual: number;
  ocorrencias: number;
}

export interface AlcanceGeografico {
  totalCidades: number;
  redesMonitoradas: number;
  redesLideres: string[];
  nota: string;
}

export interface TelemetriaSlice {
  label: string;
  percentual: number;
  color: string;
}

export interface QualidadeCatalogo {
  comGtin: number;
  semGtin: number;
  produtosCatalogados: number;
}

export interface AdminTelemetria {
  canaisImportacao: TelemetriaSlice[];
  meiosPagamento: TelemetriaSlice[];
  qualidadeCatalogo: QualidadeCatalogo;
}

export type LogStatus = 'scraper_falha' | 'captcha_expirado' | 'limite_captcha' | 'timeout_sefaz';

export interface AdminLog {
  importId: string;
  dataHora: string;
  idNota: string;
  tentativas: number;
  erro: string;
  status: LogStatus;
}

export interface AdminDashboardData {
  periodo: AdminPeriod;
  periodoLabel: string;
  mesAno: string;
  janelaLabel: string;
  bucketLabel: string;
  kpis: AdminKpi[];
  crescimentoAdesao: AdesaoSemana[];
  performanceScraper: ScraperDia[];
  topProdutos: TopProduto[];
  alcanceGeografico: AlcanceGeografico;
  telemetria: AdminTelemetria;
  logs: AdminLog[];
}

export interface AdminUsuario {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
  notas_count: number;
  itens_count: number;
  ultima_atividade: string | null;
}

export interface PaginatedAdminUsuarios {
  data: AdminUsuario[];
  page: number;
  page_size: number;
  total: number;
  resumo_perfis: Record<string, number>;
}
