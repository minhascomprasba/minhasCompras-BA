import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { useDashboard } from '../../features/dashboard/hooks/useDashboard';
import { CategoryDonutChart } from '../../features/dashboard/components/CategoryDonutChart';
import { PriceEvolutionChart } from '../../features/dashboard/components/PriceEvolutionChart';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { CaretLeftIcon as ChevronLeft, CaretRightIcon as ChevronRight, WarningCircleIcon as CircleAlert, CircleNotchIcon as LoaderCircle, ReceiptIcon as Receipt, UploadSimpleIcon as Upload } from '@phosphor-icons/react';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';
import { formatCurrency } from '@/features/dashboard/format';

export function DashboardPage() {
  const { user } = useAuth();
  const { data: dashboardData, isLoading, isError } = useDashboard(user?.id || null);

  const [monthIndex, setMonthIndex] = useState(0);
  const [selectedProductName, setSelectedProductName] = useState('');

  if (isLoading) {
    return (
      <div className="page-layout page-state" role="status">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
          <span className="text-muted-foreground">Carregando dados do painel...</span>
        </div>
      </div>
    );
  }

  if (isError || !dashboardData) {
    return (
      <div data-scope="dashboard" className="page-layout page-state">
        <Alert variant="destructive" className="max-w-md text-center">
          <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
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
      <div data-scope="dashboard" className="page-layout page-state">
        <Card className="max-w-lg p-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="size-5 shrink-0" aria-hidden="true" />
          </div>
          <h2 className="mb-0 text-2xl">Seu Painel está Vazio</h2>
          <p className="mb-0 text-sm text-muted-foreground">
            Nenhuma nota fiscal ou compra foi encontrada na sua conta. Importe suas NFCes para ter uma visão geral detalhada e gráficos de seus gastos.
          </p>
          <Link to="/importar" className={buttonVariants()}>
            <Upload className="size-5 shrink-0" aria-hidden="true" />
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
    <div data-scope="dashboard" className="page-layout">
      {/* Header com Seletor de Período */}
      <div className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Painel de Controle</h1>
          <p className="page-description">Visão geral de seus hábitos e comportamento de gastos</p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
          <Button
            onClick={handlePrevMonth}
            variant="ghost" size="icon"
            disabled={activeMonthIndex === dashboardData.length - 1}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{currentData.mesAno}</span>
          <Button
            onClick={handleNextMonth}
            variant="ghost" size="icon"
            disabled={activeMonthIndex === 0}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-5 shrink-0" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <DashboardMetrics data={currentData} />

      {/* Grid de Gráficos */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Gráfico de Rosca */}
        <Card className="min-w-0 overflow-visible">
          <CardHeader>
            <CardTitle>Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <CategoryDonutChart data={currentData.gastosPorCategoria} />
          </CardContent>
        </Card>

        {/* Gráfico de Evolução de Preço */}
        <Card className="min-w-0 overflow-visible">
          <CardHeader>
            <CardTitle>Evolução de Preço por Produto</CardTitle>
            {selectedProductName && (
              <CardDescription>Produto: {selectedProductName}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="min-h-64 min-w-0">
            <PriceEvolutionChart key={currentData.mesAno} data={currentData.produtosFrequentes} onProductSelect={setSelectedProductName} />
          </CardContent>
        </Card>
      </div>

      {currentData.gruposNcmSemGtin && currentData.gruposNcmSemGtin.length > 0 && (
        <Card className="min-w-0 overflow-visible">
          <CardHeader>
            <CardTitle>Produtos sem GTIN agrupados por NCM</CardTitle>
            <CardDescription>
              Itens identificados com EAN &quot;SEM GTIN&quot;, agrupados pelo código NCM
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto px-4">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição / NCM</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Produtos</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.gruposNcmSemGtin.map((grupo) => (
                  <TableRow key={grupo.ncm}>
                    <TableCell>
                      <div className="mb-0.5 font-medium">
                        {grupo.produto_nome || 'Produto sem nome'}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        NCM: {grupo.ncm}
                      </div>
                    </TableCell>
                    <TableCell>{grupo.categoria}</TableCell>
                    <TableCell className="text-center">{grupo.quantidade_produtos}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
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

