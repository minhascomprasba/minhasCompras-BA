export type TrendDirection = 'up' | 'down';

export type KpiIconKey = 'citizens' | 'receipts' | 'items' | 'volume' | 'stability';

export interface AdminKpi {
  id: string;
  icon: KpiIconKey;
  label: string;
  value: string;
  trendLabel: string;
  trendDirection: TrendDirection;
}

export interface AdesaoPonto {
  semana: string;
  usuarios: number;
}

export interface ScraperDia {
  dia: string;
  taxa: number;
}

export interface TopProduto {
  nome: string;
  precoMedio: number;
  variacaoPercentual: number;
}

export interface AlcanceGeografico {
  totalCidades: number;
  redesMonitoradas: number;
  nota: string;
}

export interface TelemetriaSlice {
  label: string;
  percentual: number;
  color: string;
}

export interface QualidadeCatalogo {
  ncmValido: number;
  incompleto: number;
}

export interface AdminTelemetria {
  canaisImportacao: TelemetriaSlice[];
  meiosPagamento: TelemetriaSlice[];
  qualidadeCatalogo: QualidadeCatalogo;
}

export type LogStatus = 'scraper_falha' | 'camera_erro' | 'bloqueio_ip';

export interface AdminLog {
  dataHora: string;
  idNota: string;
  tentativas: number;
  erro: string;
  status: LogStatus;
}

export interface AdminDashboardData {
  mesAno: string;
  kpis: AdminKpi[];
  crescimentoAdesao: AdesaoPonto[];
  performanceScraper: ScraperDia[];
  topProdutos: TopProduto[];
  alcanceGeografico: AlcanceGeografico;
  telemetria: AdminTelemetria;
  logs: AdminLog[];
}