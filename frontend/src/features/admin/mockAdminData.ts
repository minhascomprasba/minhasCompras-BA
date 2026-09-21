import type { AdminDashboardData, AdminPeriod } from './types';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function getMockAdminData(
  period: AdminPeriod,
  selectedMonth: string = '2026-10',
  selectedYear: string = '2026'
): AdminDashboardData {
  // 1. ÚLTIMOS 7 DIAS
  if (period === '7d') {
    return {
      periodo: '7d',
      periodoLabel: 'Últimos 7 dias',
      mesAno: 'Outubro 2026',
      janelaLabel: '24/10 a 30/10/2026',
      bucketLabel: 'Dia',
      kpis: [
        {
          id: 'citizens',
          icon: 'citizens',
          label: 'Usuários Cadastrados',
          value: '1.240',
          trendLabel: '+42 nos 7 dias',
          trendDirection: 'up',
          description: 'Total de usuários cadastrados e novas contas criadas no período.',
        },
        {
          id: 'receipts',
          icon: 'receipts',
          label: 'Notas Fiscais Importadas',
          value: '8.430',
          trendLabel: '+235 nos 7 dias',
          trendDirection: 'up',
          description: 'Total de notas fiscais e cupons de compra importados na plataforma.',
        },
        {
          id: 'items',
          icon: 'items',
          label: 'Itens Digitalizados',
          value: '42.890',
          trendLabel: '+1.180 nos 7 dias',
          trendDirection: 'up',
          description: 'Quantidade de produtos individuais registrados a partir das notas.',
        },
        {
          id: 'volume',
          icon: 'volume',
          label: 'Volume Financeiro Rastreado',
          value: 'R$ 485.620,00',
          trendLabel: '+R$ 14.200,00 nos 7 dias',
          trendDirection: 'up',
          description: 'Soma do valor financeiro total de todas as compras registradas.',
        },
        {
          id: 'stability',
          icon: 'stability',
          label: 'Desempenho da Coleta',
          value: '96.5%',
          trendLabel: '+2.1% vs semana anterior',
          trendDirection: 'up',
          extraMetric: { label: 'Tempo Médio', value: '4.2s' },
          description: 'Percentual de sucesso e tempo médio para consultar e importar notas na SEFAZ.',
        },
      ],
      crescimentoAdesao: [
        { semana: 'Seg', usuarios: 1205, notas: 8210 },
        { semana: 'Ter', usuarios: 1212, notas: 8255 },
        { semana: 'Qua', usuarios: 1220, notas: 8300 },
        { semana: 'Qui', usuarios: 1228, notas: 8345 },
        { semana: 'Sex', usuarios: 1234, notas: 8390 },
        { semana: 'Sáb', usuarios: 1238, notas: 8415 },
        { semana: 'Dom', usuarios: 1240, notas: 8430 },
      ],
      performanceScraper: [
        { dia: 'Seg', completed: 34, expired: 2, failed: 1 },
        { dia: 'Ter', completed: 38, expired: 1, failed: 1 },
        { dia: 'Qua', completed: 42, expired: 2, failed: 0 },
        { dia: 'Qui', completed: 40, expired: 1, failed: 1 },
        { dia: 'Sex', completed: 46, expired: 3, failed: 1 },
        { dia: 'Sáb', completed: 22, expired: 1, failed: 0 },
        { dia: 'Dom', completed: 18, expired: 1, failed: 0 },
      ],
      topProdutos: [
        { nome: 'Leite Integral 1L', precoMedio: 5.29, variacaoPercentual: 0.5, ocorrencias: 85 },
        { nome: 'Pão Francês kg', precoMedio: 14.90, variacaoPercentual: 0.0, ocorrencias: 78 },
        { nome: 'Café Moído 500g', precoMedio: 19.80, variacaoPercentual: 1.2, ocorrencias: 64 },
        { nome: 'Manteiga 200g', precoMedio: 11.50, variacaoPercentual: -1.0, ocorrencias: 59 },
        { nome: 'Queijo Mussarela 200g', precoMedio: 13.90, variacaoPercentual: 0.8, ocorrencias: 52 },
      ],
      alcanceGeografico: {
        totalCidades: 8,
        redesMonitoradas: 24,
        redesLideres: ['Atacadão', 'Assaí', 'GBarbosa'],
        nota: 'Feira de Santana lidera a semana com 145 notas cadastradas',
      },
      telemetria: {
        canaisImportacao: [
          { label: 'QR Code', percentual: 75, color: 'var(--brand-green)' },
          { label: 'Foto / Arquivo', percentual: 16, color: 'var(--brand-blue-light)' },
          { label: 'Chave Digitada', percentual: 9, color: 'var(--warning)' },
        ],
        meiosPagamento: [
          { label: 'Pix', percentual: 50, color: 'var(--brand-blue-light)' },
          { label: 'Cartões', percentual: 35, color: '#ec4899' },
          { label: 'Dinheiro', percentual: 15, color: 'var(--brand-green)' },
        ],
        qualidadeCatalogo: { comGtin: 85, semGtin: 15, produtosCatalogados: 1180 },
      },
      logs: [
        {
          importId: 'imp_7d_01',
          dataHora: '28/10/2026 14:32',
          idNota: 'NFC-e 292408...4102',
          tentativas: 2,
          erro: 'Instabilidade momentânea no portal da SEFAZ',
          status: 'timeout_sefaz',
        },
      ],
    };
  }

  // 2. MÊS A MÊS (Subtítulo enxuto e dados proporcionais ao mês selecionado)
  if (period === 'mes') {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10) || 2026;
    const monthIndex = (parseInt(monthStr, 10) || 10) - 1;
    const monthName = MONTH_NAMES[monthIndex];

    // Simula números proporcionais dependendo do mês escolhido
    const factor = (monthIndex + 1) / 10;
    const usuariosMes = Math.round(900 + 340 * factor);
    const notasMes = Math.round(5200 + 3230 * factor);
    const itensMes = Math.round(26000 + 16890 * factor);
    const volumeMes = Math.round(280000 + 205620 * factor);

    return {
      periodo: 'mes',
      periodoLabel: 'Mês a Mês',
      mesAno: `${monthName} ${year}`,
      janelaLabel: `${monthName}/${year}`, // Subtítulo curto e limpo
      bucketLabel: 'Semana',
      kpis: [
        {
          id: 'citizens',
          icon: 'citizens',
          label: 'Usuários Cadastrados',
          value: usuariosMes.toLocaleString('pt-BR'),
          trendLabel: '+140 no mês',
          trendDirection: 'up',
          description: 'Total de usuários cadastrados e novas contas criadas no período.',
        },
        {
          id: 'receipts',
          icon: 'receipts',
          label: 'Notas Fiscais Importadas',
          value: notasMes.toLocaleString('pt-BR'),
          trendLabel: '+880 no mês',
          trendDirection: 'up',
          description: 'Total de notas fiscais e cupons de compra importados na plataforma.',
        },
        {
          id: 'items',
          icon: 'items',
          label: 'Itens Digitalizados',
          value: itensMes.toLocaleString('pt-BR'),
          trendLabel: '+3.950 no mês',
          trendDirection: 'up',
          description: 'Quantidade de produtos individuais registrados a partir das notas.',
        },
        {
          id: 'volume',
          icon: 'volume',
          label: 'Volume Financeiro Rastreado',
          value: `R$ ${volumeMes.toLocaleString('pt-BR')},00`,
          trendLabel: '+R$ 51.200,00 no mês',
          trendDirection: 'up',
          description: 'Soma do valor financeiro total de todas as compras registradas.',
        },
        {
          id: 'stability',
          icon: 'stability',
          label: 'Desempenho da Coleta',
          value: '94.5%',
          trendLabel: '+1.5% vs mês anterior',
          trendDirection: 'up',
          extraMetric: { label: 'Tempo Médio', value: '4.7s' },
          description: 'Percentual de sucesso e tempo médio para consultar e importar notas na SEFAZ.',
        },
      ],
      crescimentoAdesao: [
        { semana: 'Semana 1', usuarios: usuariosMes - 160, notas: notasMes - 830 },
        { semana: 'Semana 2', usuarios: usuariosMes - 110, notas: notasMes - 530 },
        { semana: 'Semana 3', usuarios: usuariosMes - 50, notas: notasMes - 230 },
        { semana: 'Semana 4', usuarios: usuariosMes, notas: notasMes },
      ],
      performanceScraper: [
        { dia: 'Semana 1', completed: 210, expired: 12, failed: 8 },
        { dia: 'Semana 2', completed: 270, expired: 14, failed: 9 },
        { dia: 'Semana 3', completed: 295, expired: 10, failed: 6 },
        { dia: 'Semana 4', completed: 330, expired: 15, failed: 7 },
      ],
      topProdutos: [
        { nome: 'Leite Integral 1L', precoMedio: 5.25, variacaoPercentual: 1.8, ocorrencias: 395 },
        { nome: 'Arroz Tipo 1 5kg', precoMedio: 28.40, variacaoPercentual: -0.8, ocorrencias: 360 },
        { nome: 'Café Moído 500g', precoMedio: 19.50, variacaoPercentual: 3.2, ocorrencias: 300 },
        { nome: 'Óleo de Soja 900ml', precoMedio: 6.90, variacaoPercentual: 0.0, ocorrencias: 280 },
        { nome: 'Feijão Carioca 1kg', precoMedio: 7.55, variacaoPercentual: -2.1, ocorrencias: 260 },
      ],
      alcanceGeografico: {
        totalCidades: 14,
        redesMonitoradas: 46,
        redesLideres: ['Atacadão', 'Assaí', 'GBarbosa', 'RedeMix'],
        nota: `Feira de Santana lidera em ${monthName}/${year} com 3.980 notas cadastradas`,
      },
      telemetria: {
        canaisImportacao: [
          { label: 'QR Code', percentual: 71, color: 'var(--brand-green)' },
          { label: 'Foto / Arquivo', percentual: 19, color: 'var(--brand-blue-light)' },
          { label: 'Chave Digitada', percentual: 10, color: 'var(--warning)' },
        ],
        meiosPagamento: [
          { label: 'Pix', percentual: 47, color: 'var(--brand-blue-light)' },
          { label: 'Cartões', percentual: 37, color: '#ec4899' },
          { label: 'Dinheiro', percentual: 16, color: 'var(--brand-green)' },
        ],
        qualidadeCatalogo: { comGtin: 83, semGtin: 17, produtosCatalogados: 3950 },
      },
      logs: [
        {
          importId: 'imp_mes_01',
          dataHora: `28/${monthStr}/${year} 14:32`,
          idNota: 'NFC-e 292408...4102',
          tentativas: 2,
          erro: 'Instabilidade momentânea no portal da SEFAZ',
          status: 'timeout_sefaz',
        },
      ],
    };
  }

  // 3. ANO A ANO
  if (period === 'ano') {
    const year = parseInt(selectedYear, 10) || 2026;
    const is2025 = year === 2025;

    return {
      periodo: 'ano',
      periodoLabel: 'Ano a Ano',
      mesAno: `Ano ${year}`,
      janelaLabel: `Ano ${year} (vs ${year - 1})`,
      bucketLabel: 'Mês',
      kpis: [
        {
          id: 'citizens',
          icon: 'citizens',
          label: 'Usuários Cadastrados',
          value: is2025 ? '780' : '1.240',
          trendLabel: is2025 ? '+420 no ano' : '+680 no ano',
          trendDirection: 'up',
          description: 'Total de usuários cadastrados e novas contas criadas no período.',
        },
        {
          id: 'receipts',
          icon: 'receipts',
          label: 'Notas Fiscais Importadas',
          value: is2025 ? '4.800' : '8.430',
          trendLabel: is2025 ? '+2.100 no ano' : '+3.630 no ano',
          trendDirection: 'up',
          description: 'Total de notas fiscais e cupons de compra importados na plataforma.',
        },
        {
          id: 'items',
          icon: 'items',
          label: 'Itens Digitalizados',
          value: is2025 ? '24.500' : '42.890',
          trendLabel: is2025 ? '+11.200 no ano' : '+18.390 no ano',
          trendDirection: 'up',
          description: 'Quantidade de produtos individuais registrados a partir das notas.',
        },
        {
          id: 'volume',
          icon: 'volume',
          label: 'Volume Financeiro Rastreado',
          value: is2025 ? 'R$ 290.000,00' : 'R$ 485.620,00',
          trendLabel: is2025 ? '+R$ 130.000,00' : '+R$ 195.620,00',
          trendDirection: 'up',
          description: 'Soma do valor financeiro total de todas as compras registradas.',
        },
        {
          id: 'stability',
          icon: 'stability',
          label: 'Desempenho da Coleta',
          value: is2025 ? '89.4%' : '93.8%',
          trendLabel: '+4.4% vs ano anterior',
          trendDirection: 'up',
          extraMetric: { label: 'Tempo Médio', value: '4.5s' },
          description: 'Percentual de sucesso e tempo médio para consultar e importar notas na SEFAZ.',
        },
      ],
      crescimentoAdesao: [
        { semana: 'Jan', usuarios: is2025 ? 380 : 810, notas: is2025 ? 2200 : 5100 },
        { semana: 'Fev', usuarios: is2025 ? 410 : 850, notas: is2025 ? 2450 : 5400 },
        { semana: 'Mar', usuarios: is2025 ? 450 : 900, notas: is2025 ? 2700 : 5800 },
        { semana: 'Abr', usuarios: is2025 ? 490 : 945, notas: is2025 ? 2950 : 6150 },
        { semana: 'Mai', usuarios: is2025 ? 530 : 990, notas: is2025 ? 3200 : 6500 },
        { semana: 'Jun', usuarios: is2025 ? 570 : 1035, notas: is2025 ? 3500 : 6900 },
        { semana: 'Jul', usuarios: is2025 ? 610 : 1080, notas: is2025 ? 3800 : 7300 },
        { semana: 'Ago', usuarios: is2025 ? 650 : 1130, notas: is2025 ? 4100 : 7700 },
        { semana: 'Set', usuarios: is2025 ? 700 : 1180, notas: is2025 ? 4400 : 8050 },
        { semana: 'Out', usuarios: is2025 ? 740 : 1240, notas: is2025 ? 4650 : 8430 },
        { semana: 'Nov', usuarios: is2025 ? 760 : 1240, notas: is2025 ? 4720 : 8430 },
        { semana: 'Dez', usuarios: is2025 ? 780 : 1240, notas: is2025 ? 4800 : 8430 },
      ],
      performanceScraper: [
        { dia: 'Jan', completed: 210, expired: 20, failed: 12 },
        { dia: 'Fev', completed: 230, expired: 18, failed: 10 },
        { dia: 'Mar', completed: 260, expired: 22, failed: 14 },
        { dia: 'Abr', completed: 280, expired: 19, failed: 11 },
        { dia: 'Mai', completed: 310, expired: 25, failed: 15 },
        { dia: 'Jun', completed: 340, expired: 22, failed: 13 },
        { dia: 'Jul', completed: 370, expired: 26, failed: 16 },
        { dia: 'Ago', completed: 400, expired: 24, failed: 14 },
        { dia: 'Set', completed: 420, expired: 21, failed: 12 },
        { dia: 'Out', completed: 460, expired: 28, failed: 15 },
        { dia: 'Nov', completed: 380, expired: 20, failed: 10 },
        { dia: 'Dez', completed: 350, expired: 18, failed: 8 },
      ],
      topProdutos: [
        { nome: 'Leite Integral 1L', precoMedio: 5.10, variacaoPercentual: 8.5, ocorrencias: 3850 },
        { nome: 'Arroz Tipo 1 5kg', precoMedio: 27.80, variacaoPercentual: 6.1, ocorrencias: 3420 },
        { nome: 'Café Moído 500g', precoMedio: 18.90, variacaoPercentual: 14.2, ocorrencias: 2950 },
        { nome: 'Óleo de Soja 900ml', precoMedio: 6.70, variacaoPercentual: -3.5, ocorrencias: 2700 },
        { nome: 'Feijão Carioca 1kg', precoMedio: 7.60, variacaoPercentual: 5.8, ocorrencias: 2550 },
      ],
      alcanceGeografico: {
        totalCidades: 26,
        redesMonitoradas: 78,
        redesLideres: ['Atacadão', 'Assaí', 'GBarbosa', 'RedeMix', 'Cencosud'],
        nota: `Salvador e Feira de Santana concentram 65% de todas as compras de ${year}`,
      },
      telemetria: {
        canaisImportacao: [
          { label: 'QR Code', percentual: 69, color: 'var(--brand-green)' },
          { label: 'Foto / Arquivo', percentual: 20, color: 'var(--brand-blue-light)' },
          { label: 'Chave Digitada', percentual: 11, color: 'var(--warning)' },
        ],
        meiosPagamento: [
          { label: 'Pix', percentual: 45, color: 'var(--brand-blue-light)' },
          { label: 'Cartões', percentual: 39, color: '#ec4899' },
          { label: 'Dinheiro', percentual: 16, color: 'var(--brand-green)' },
        ],
        qualidadeCatalogo: { comGtin: 80, semGtin: 20, produtosCatalogados: 42890 },
      },
      logs: [
        {
          importId: 'imp_ano_01',
          dataHora: `28/10/${year} 14:32`,
          idNota: 'NFC-e 292408...4102',
          tentativas: 2,
          erro: 'Instabilidade momentânea no portal da SEFAZ',
          status: 'timeout_sefaz',
        },
      ],
    };
  }

  // 4. GERAL / TODO O HISTÓRICO (Subtítulo enxuto e números consolidados)
  if (period === 'geral') {
    return {
      periodo: 'geral',
      periodoLabel: 'Geral (Todo o Histórico)',
      mesAno: 'Todo o Histórico',
      janelaLabel: 'Desde 2023', // Subtítulo curto e limpo!
      bucketLabel: 'Ano',
      kpis: [
        {
          id: 'citizens',
          icon: 'citizens',
          label: 'Usuários Cadastrados',
          value: '1.240',
          trendLabel: 'Total acumulado',
          trendDirection: 'up',
          description: 'Total de usuários cadastrados e novas contas criadas no período.',
        },
        {
          id: 'receipts',
          icon: 'receipts',
          label: 'Notas Fiscais Importadas',
          value: '8.430',
          trendLabel: 'Total acumulado',
          trendDirection: 'up',
          description: 'Total de notas fiscais e cupons de compra importados na plataforma.',
        },
        {
          id: 'items',
          icon: 'items',
          label: 'Itens Digitalizados',
          value: '42.890',
          trendLabel: 'Total acumulado',
          trendDirection: 'up',
          description: 'Quantidade de produtos individuais registrados a partir das notas.',
        },
        {
          id: 'volume',
          icon: 'volume',
          label: 'Volume Financeiro Rastreado',
          value: 'R$ 485.620,00',
          trendLabel: 'Total acumulado',
          trendDirection: 'up',
          description: 'Soma do valor financeiro total de todas as compras registradas.',
        },
        {
          id: 'stability',
          icon: 'stability',
          label: 'Desempenho da Coleta',
          value: '91.8%',
          trendLabel: 'Média histórica',
          trendDirection: 'up',
          extraMetric: { label: 'Tempo Médio', value: '4.6s' },
          description: 'Percentual de sucesso e tempo médio para consultar e importar notas na SEFAZ.',
        },
      ],
      crescimentoAdesao: [
        { semana: '2023', usuarios: 350, notas: 1900 },
        { semana: '2024', usuarios: 680, notas: 4100 },
        { semana: '2025', usuarios: 980, notas: 6500 },
        { semana: '2026', usuarios: 1240, notas: 8430 },
      ],
      performanceScraper: [
        { dia: '2023', completed: 1720, expired: 130, failed: 50 },
        { dia: '2024', completed: 3750, expired: 240, failed: 110 },
        { dia: '2025', completed: 5900, expired: 310, failed: 140 },
        { dia: '2026', completed: 7950, expired: 330, failed: 150 },
      ],
      topProdutos: [
        { nome: 'Leite Integral 1L', precoMedio: 4.85, variacaoPercentual: 14.5, ocorrencias: 5200 },
        { nome: 'Arroz Tipo 1 5kg', precoMedio: 25.90, variacaoPercentual: 18.2, ocorrencias: 4600 },
        { nome: 'Café Moído 500g', precoMedio: 17.50, variacaoPercentual: 24.1, ocorrencias: 4100 },
        { nome: 'Óleo de Soja 900ml', precoMedio: 6.40, variacaoPercentual: 5.0, ocorrencias: 3800 },
        { nome: 'Feijão Carioca 1kg', precoMedio: 7.10, variacaoPercentual: 12.0, ocorrencias: 3500 },
      ],
      alcanceGeografico: {
        totalCidades: 34,
        redesMonitoradas: 92,
        redesLideres: ['Atacadão', 'Assaí', 'GBarbosa', 'RedeMix', 'Cencosud'],
        nota: 'Projeto presente em 34 municípios do estado da Bahia',
      },
      telemetria: {
        canaisImportacao: [
          { label: 'QR Code', percentual: 65, color: 'var(--brand-green)' },
          { label: 'Foto / Arquivo', percentual: 22, color: 'var(--brand-blue-light)' },
          { label: 'Chave Digitada', percentual: 13, color: 'var(--warning)' },
        ],
        meiosPagamento: [
          { label: 'Pix', percentual: 42, color: 'var(--brand-blue-light)' },
          { label: 'Cartões', percentual: 41, color: '#ec4899' },
          { label: 'Dinheiro', percentual: 17, color: 'var(--brand-green)' },
        ],
        qualidadeCatalogo: { comGtin: 78, semGtin: 22, produtosCatalogados: 42890 },
      },
      logs: [
        {
          importId: 'imp_geral_01',
          dataHora: '28/10/2026 14:32',
          idNota: 'NFC-e 292408...4102',
          tentativas: 2,
          erro: 'Instabilidade momentânea no portal da SEFAZ',
          status: 'timeout_sefaz',
        },
      ],
    };
  }

  // 5. PADRÃO: ÚLTIMOS 30 DIAS
  return {
    periodo: '30d',
    periodoLabel: 'Últimos 30 dias',
    mesAno: 'Outubro 2026',
    janelaLabel: '01/10 a 30/10/2026',
    bucketLabel: 'Semana',
    kpis: [
      {
        id: 'citizens',
        icon: 'citizens',
        label: 'Usuários Cadastrados',
        value: '1.240',
        trendLabel: '+180 no período',
        trendDirection: 'up',
        description: 'Total de usuários cadastrados e novas contas criadas no período.',
      },
      {
        id: 'receipts',
        icon: 'receipts',
        label: 'Notas Fiscais Importadas',
        value: '8.430',
        trendLabel: '+920 no período',
        trendDirection: 'up',
        description: 'Total de notas fiscais e cupons de compra importados na plataforma.',
      },
      {
        id: 'items',
        icon: 'items',
        label: 'Itens Digitalizados',
        value: '42.890',
        trendLabel: '+4.210 no período',
        trendDirection: 'up',
        description: 'Quantidade de produtos individuais registrados a partir das notas.',
      },
      {
        id: 'volume',
        icon: 'volume',
        label: 'Volume Financeiro Rastreado',
        value: 'R$ 485.620,00',
        trendLabel: '+R$ 54.300,00 no período',
        trendDirection: 'up',
        description: 'Soma do valor financeiro total de todas as compras registradas.',
      },
      {
        id: 'stability',
        icon: 'stability',
        label: 'Desempenho da Coleta',
        value: '94.2%',
        trendLabel: '+1.8% vs período anterior',
        trendDirection: 'up',
        extraMetric: { label: 'Tempo Médio', value: '4.8s' },
        description: 'Percentual de sucesso e tempo médio para consultar e importar notas na SEFAZ.',
      },
    ],
    crescimentoAdesao: [
      { semana: 'Semana 1', usuarios: 1060, notas: 7510 },
      { semana: 'Semana 2', usuarios: 1110, notas: 7800 },
      { semana: 'Semana 3', usuarios: 1180, notas: 8120 },
      { semana: 'Semana 4', usuarios: 1240, notas: 8430 },
    ],
    performanceScraper: [
      { dia: 'Semana 1', completed: 210, expired: 12, failed: 8 },
      { dia: 'Semana 2', completed: 280, expired: 15, failed: 10 },
      { dia: 'Semana 3', completed: 310, expired: 9, failed: 7 },
      { dia: 'Semana 4', completed: 340, expired: 14, failed: 6 },
    ],
    topProdutos: [
      { nome: 'Leite Integral 1L', precoMedio: 5.29, variacaoPercentual: 2.1, ocorrencias: 412 },
      { nome: 'Arroz Tipo 1 5kg', precoMedio: 28.50, variacaoPercentual: -1.2, ocorrencias: 380 },
      { nome: 'Café Moído 500g', precoMedio: 19.80, variacaoPercentual: 4.5, ocorrencias: 315 },
      { nome: 'Óleo de Soja 900ml', precoMedio: 6.89, variacaoPercentual: 0.0, ocorrencias: 290 },
      { nome: 'Feijão Carioca 1kg', precoMedio: 7.49, variacaoPercentual: -3.4, ocorrencias: 275 },
    ],
    alcanceGeografico: {
      totalCidades: 14,
      redesMonitoradas: 48,
      redesLideres: ['Atacadão', 'Assaí', 'GBarbosa', 'RedeMix'],
      nota: 'Feira de Santana lidera no período com 4.120 notas cadastradas',
    },
    telemetria: {
      canaisImportacao: [
        { label: 'QR Code', percentual: 72, color: 'var(--brand-green)' },
        { label: 'Foto / Arquivo', percentual: 18, color: 'var(--brand-blue-light)' },
        { label: 'Chave Digitada', percentual: 10, color: 'var(--warning)' },
      ],
      meiosPagamento: [
        { label: 'Pix', percentual: 46, color: 'var(--brand-blue-light)' },
        { label: 'Cartões', percentual: 38, color: '#ec4899' },
        { label: 'Dinheiro', percentual: 16, color: 'var(--brand-green)' },
      ],
      qualidadeCatalogo: { comGtin: 82, semGtin: 18, produtosCatalogados: 42890 },
    },
    logs: [
      {
        importId: 'imp_30d_01',
        dataHora: '28/10/2026 14:32',
        idNota: 'NFC-e 292408...4102',
        tentativas: 2,
        erro: 'Instabilidade momentânea no portal da SEFAZ',
        status: 'timeout_sefaz',
      },
    ],
  };
}