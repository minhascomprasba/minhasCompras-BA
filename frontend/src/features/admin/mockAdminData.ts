import type { AdminDashboardData } from './types';

export const mockAdminData: AdminDashboardData = {
  mesAno: 'Julho 2026',
  kpis: [
    {
      id: 'citizens',
      icon: 'citizens',
      label: 'Cidadãos Cadastrados',
      value: '12.450',
      trendLabel: '+845 no mês',
      trendDirection: 'up',
    },
    {
      id: 'receipts',
      icon: 'receipts',
      label: 'Notas Importadas',
      value: '145.2K',
      trendLabel: '+12.3K no mês',
      trendDirection: 'up',
    },
    {
      id: 'items',
      icon: 'items',
      label: 'Itens Digitalizados',
      value: '8.4M',
      trendLabel: '+450K no mês',
      trendDirection: 'up',
    },
    {
      id: 'volume',
      icon: 'volume',
      label: 'Volume Rastreado',
      value: 'R$ 45.2M',
      trendLabel: '+R$ 2.1M',
      trendDirection: 'up',
    },
    {
      id: 'stability',
      icon: 'stability',
      label: 'Estabilidade Scraper',
      value: '98.4%',
      trendLabel: '-0.2%',
      trendDirection: 'down',
    },
  ],
  crescimentoAdesao: [
    { semana: 'S1', usuarios: 8200 },
    { semana: 'S2', usuarios: 9400 },
    { semana: 'S3', usuarios: 11200 },
    { semana: 'S4', usuarios: 10000 },
    { semana: 'S5', usuarios: 12450 },
  ],
  performanceScraper: [
    { dia: 'Seg', taxa: 80 },
    { dia: 'Ter', taxa: 60 },
    { dia: 'Qua', taxa: 90 },
    { dia: 'Qui', taxa: 40 },
    { dia: 'Sex', taxa: 75 },
    { dia: 'Sáb', taxa: 85 },
    { dia: 'Dom', taxa: 100 },
  ],
  topProdutos: [
    { nome: 'Leite Integral 1L', precoMedio: 5.4, variacaoPercentual: 2.1 },
    { nome: 'Arroz Branco 5kg', precoMedio: 28.9, variacaoPercentual: -1.5 },
    { nome: 'Óleo de Soja 900ml', precoMedio: 6.2, variacaoPercentual: 0 },
  ],
  alcanceGeografico: {
    totalCidades: 417,
    redesMonitoradas: 12,
    nota: 'Mapa de calor de redes comerciais (Placeholder)',
  },
  telemetria: {
    canaisImportacao: [
      { label: 'QR Code', percentual: 58, color: 'var(--brand-green)' },
      { label: 'Foto / Câmera', percentual: 27, color: 'var(--brand-blue-light)' },
      { label: 'Chave Manual', percentual: 15, color: 'var(--warning)' },
    ],
    meiosPagamento: [
      { label: 'Pix', percentual: 64, color: 'var(--brand-blue-light)' },
      { label: 'Cartão', percentual: 26, color: '#ec4899' },
      { label: 'Dinheiro', percentual: 10, color: 'var(--brand-green)' },
    ],
    qualidadeCatalogo: { ncmValido: 92, incompleto: 8 },
  },
  logs: [
    {
      dataHora: '2026-07-15 14:32:01',
      idNota: 'NFe-292307...8432',
      tentativas: 3,
      erro: 'Timeout SEFAZ response',
      status: 'scraper_falha',
    },
    {
      dataHora: '2026-07-15 14:28:45',
      idNota: 'NFe-292307...1190',
      tentativas: 1,
      erro: 'QR Code inválido ou ilegível',
      status: 'camera_erro',
    },
    {
      dataHora: '2026-07-15 14:15:22',
      idNota: 'NFe-292307...5541',
      tentativas: 5,
      erro: 'Captcha block - Rate limit',
      status: 'bloqueio_ip',
    },
  ],
};