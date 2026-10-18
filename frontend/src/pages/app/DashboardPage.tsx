import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useDashboard } from '../../features/dashboard/hooks/useDashboard';
import { CategoryDonutChart } from '../../features/dashboard/components/CategoryDonutChart';
import { PriceEvolutionChart } from '../../features/dashboard/components/PriceEvolutionChart';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { LoaderCircle } from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, isError } = useDashboard(user?.id || null);

  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedProductName, setSelectedProductName] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (isLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
          <span className="text-muted-foreground">Carregando dados do painel...</span>
        </div>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div data-scope="dashboard" className="container flex min-h-[60vh] items-center justify-center">
        <Alert variant="destructive" className="max-w-md text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2>Erro ao carregar dados</h2>
          <p>
            Ocorreu um erro ao carregar as informações do dashboard. Por favor, tente novamente mais tarde.
          </p>
        </Alert>
      </div>
    );
  }

  if (dashboardData.length === 0) {
    return (
      <div data-scope="dashboard" className="container flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-lg p-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="15" y2="17"></line>
            </svg>
          </div>
          <h2 className="mb-0 text-2xl">Seu Painel está Vazio</h2>
          <p className="mb-0 text-sm text-muted-foreground">
            Nenhuma nota fiscal ou compra foi encontrada na sua conta. Importe suas NFCes para ter uma visão geral detalhada e gráficos de seus gastos.
          </p>
          <Link to="/importar" className={buttonVariants()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Importar Nota Fiscal
          </Link>
        </Card>
      </div>
    );
  }

  // Se o monthIndex for maior ou igual ao tamanho do array (por segurança), fixa no último
  const activeMonthIndex = monthIndex >= dashboardData.length ? dashboardData.length - 1 : monthIndex;
  const currentData = dashboardData[activeMonthIndex];

  const handlePrevMonth = () => {
    if (activeMonthIndex < dashboardData.length - 1) {
      setMonthIndex(activeMonthIndex + 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonthIndex > 0) {
      setMonthIndex(activeMonthIndex - 1);
    }
  };

  return (
      <div data-scope="dashboard" className="container space-y-6">
      {/* Header com Seletor de Período */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="[&_h1]:mb-1 [&_h1]:text-3xl [&_p]:mb-0 [&_p]:text-sm [&_p]:text-muted-foreground">
          <h1>Painel de Controle</h1>
          <p>Visão geral de seus hábitos e comportamento de gastos</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          <Button 
            onClick={handlePrevMonth} 
            variant="ghost" size="icon"
            disabled={activeMonthIndex === dashboardData.length - 1}
            aria-label="Mês anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{currentData.mesAno}</span>
          <Button 
            onClick={handleNextMonth} 
            variant="ghost" size="icon"
            disabled={activeMonthIndex === 0}
            aria-label="Próximo mês"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </Button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* KPI 1: Gasto Mensal */}
        <Card className="flex-row items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
              <path d="M17 9h-2.5a1.5 1.5 0 0 0 0 3h3a1.5 1.5 0 0 1 0 3H12"></path>
            </svg>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-muted-foreground">Total Gasto no Mês</span>
            <span className="text-2xl font-semibold tabular-nums">{formatCurrency(currentData.mediaGastosMensal)}</span>
          </div>
        </Card>

        {/* KPI 2: Notas Lidas */}
        <Card className="flex-row items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-muted-foreground">Notas Lidas no Mês</span>
            <span className="text-2xl font-semibold tabular-nums">{currentData.quantidadeNotas} {currentData.quantidadeNotas === 1 ? 'nota' : 'notas'}</span>
          </div>
        </Card>

        {/* KPI 3: Ticket Médio */}
        <Card className="flex-row items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-muted-foreground">Ticket Médio por Nota</span>
            <span className="text-2xl font-semibold tabular-nums">{formatCurrency(currentData.ticketMedio)}</span>
          </div>
        </Card>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Gráfico de Rosca */}
        <Card className="min-w-0 overflow-visible">
          <CardHeader className="">
            <CardTitle>Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <CategoryDonutChart data={currentData.gastosPorCategoria} />
          </CardContent>
        </Card>

        {/* Gráfico de Evolução de Preço */}
        <Card className="min-w-0 overflow-visible">
          <CardHeader className="">
            <CardTitle>Evolução de Preço por Produto</CardTitle>
            {selectedProductName && (
              <span className="text-sm text-muted-foreground">
                Produto: {selectedProductName}
              </span>
            )}
          </CardHeader>
          <CardContent className="min-h-64 min-w-0">
            <PriceEvolutionChart data={currentData.produtosFrequentes} onProductSelect={setSelectedProductName} />
          </CardContent>
        </Card>
      </div>

      {currentData.gruposNcmSemGtin && currentData.gruposNcmSemGtin.length > 0 && (
        <Card className="min-w-0 overflow-visible">
          <CardHeader className="">
            <CardTitle>Produtos sem GTIN agrupados por NCM</CardTitle>
            <p className="mb-0 text-sm text-muted-foreground">
              Itens identificados com EAN &quot;SEM GTIN&quot;, agrupados pelo código NCM
            </p>
          </CardHeader>
          <div className="overflow-x-auto px-4">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição / NCM</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead style={{ textAlign: 'center' }}>Produtos</TableHead>
                  <TableHead style={{ textAlign: 'right' }}>Total (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.gruposNcmSemGtin.map((grupo) => (
                  <TableRow key={grupo.ncm}>
                    <TableCell>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {grupo.produto_nome || 'Produto sem nome'}
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        NCM: {grupo.ncm}
                      </div>
                    </TableCell>
                    <TableCell>{grupo.categoria}</TableCell>
                    <TableCell style={{ textAlign: 'center' }}>{grupo.quantidade_produtos}</TableCell>
                    <TableCell style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                      {formatCurrency(grupo.valor_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

