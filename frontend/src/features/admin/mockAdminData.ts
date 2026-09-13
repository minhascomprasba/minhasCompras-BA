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
      description:
        'Métrica primária de alcance social. Mede a penetração da tecnologia desenvolvida na UEFS junto à sociedade civil.',
    },
    {
      id: 'receipts',
      icon: 'receipts',
      label: 'Notas Fiscais Importadas',
      value: '145.2K',
      trendLabel: '+12.3K no mês',
      trendDirection: 'up',
      description:
        'Mede o engajamento contínuo: um número crescente de notas por usuário comprova que a ferramenta se tornou um hábito real de controle financeiro, e não um uso único descartável.',
    },
    {
      id: 'items',
      icon: 'items',
      label: 'Itens Digitalizados',
      value: '8.4M',
      trendLabel: '+450K no mês',
      trendDirection: 'up',
      description:
        'Representa o tamanho real da base de conhecimento: cada item catalogado alimenta a base estatística de preços da Bahia, tornando a amostra cada vez mais densa e confiável para pesquisas.',
    },
    {
      id: 'volume',
      icon: 'volume',
      label: 'Volume Financeiro Rastreado',
      value: 'R$ 45.2M',
      trendLabel: '+R$ 2.1M',
      trendDirection: 'up',
      description:
        'Demonstra a relevância econômica do projeto: o volume financeiro consolidado traduz o impacto do software em números compreensíveis para fomento, imprensa e comunidade acadêmica.',
    },
    {
      id: 'stability',
      icon: 'stability',
      label: 'Estabilidade do Scraper',
      value: '98.4%',
      trendLabel: '-0.2%',
      trendDirection: 'down',
      extraMetric: { label: 'Tempo Médio', value: '14.2s' },
      description:
        'Observabilidade da infraestrutura: taxa de sucesso e tempo médio do robô que interage com o portal da SEFAZ-BA. Quedas sinalizam a necessidade de manutenção antes que os usuários começem a reclamar.',
    },
  ],
  crescimentoAdesao: [
    { semana: 'S1', usuarios: 6200, notas: 4100 },
    { semana: 'S2', usuarios: 7450, notas: 6400 },
    { semana: 'S3', usuarios: 8900, notas: 9800 },
    { semana: 'S4', usuarios: 10600, notas: 15800 },
    { semana: 'S5', usuarios: 12450, notas: 23100 },
  ],
  performanceScraper: [
    { dia: 'Seg', completed: 78, expired: 12, failed: 10 },
    { dia: 'Ter', completed: 85, expired: 8, failed: 7 },
    { dia: 'Qua', completed: 90, expired: 5, failed: 5 },
    { dia: 'Qui', completed: 62, expired: 18, failed: 20 },
    { dia: 'Sex', completed: 88, expired: 7, failed: 5 },
    { dia: 'Sáb', completed: 95, expired: 3, failed: 2 },
    { dia: 'Dom', completed: 92, expired: 5, failed: 3 },
  ],
  topProdutos: [
    { nome: 'Leite Integral 1L', precoMedio: 5.4, variacaoPercentual: 2.1 },
    { nome: 'Arroz Branco 5kg', precoMedio: 28.9, variacaoPercentual: -1.5 },
    { nome: 'Óleo de Soja 900ml', precoMedio: 6.2, variacaoPercentual: 0 },
    { nome: 'Feijão Carioca 1kg', precoMedio: 7.8, variacaoPercentual: 1.2 },
  ],
  alcanceGeografico: {
    totalCidades: 417,
    redesMonitoradas: 12,
    redesLideres: ['Atacadão', 'Carrefour', 'Hiperideal', 'Mateus', 'TodoDia'],
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
      { label: 'Cartões', percentual: 26, color: '#ec4899' },
      { label: 'Dinheiro', percentual: 10, color: 'var(--brand-green)' },
    ],
    qualidadeCatalogo: { comGtin: 92, semGtin: 8 },
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