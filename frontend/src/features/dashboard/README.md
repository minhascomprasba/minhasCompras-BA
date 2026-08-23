# Feature: dashboard

Agregações de gastos do usuário: KPIs mensais, distribuição por categoria (donut) e evolução de preços de produtos frequentes (linha). Renderizado em `DashboardPage`.

## Estrutura

```
dashboard/
├── components/
│   ├── CategoryDonutChart.tsx   # Gráfico de rosca de gastos por categoria
│   └── PriceEvolutionChart.tsx  # Gráfico de linha de histórico de preços
├── hooks/
│   └── useDashboard.ts          # Hook React Query dos dados agregados
├── services/
│   └── dashboardService.ts      # GET /dashboard via apiClient
├── types.ts                     # DTOs da API (snake_case) e tipos derivados
├── mockDashboardData.ts         # Fixture `mockDashboardData: DashboardData[]` para desenvolvimento/preview
└── README.md
```

## API pública

### Hook — `hooks/useDashboard.ts`

```ts
function useDashboard(userId: number | null): UseQueryResult<DashboardData[], AppError>;
// queryKey: ['dashboard', userId] — cache delimitado por sessão.
// enabled: !!userId — não dispara antes da auth resolver.
```

`DashboardPage` consome a lista retornada (um item por mês, ex.: `"Junho 2026"`) para montar os KPIs e alimentar os dois gráficos.

### Serviço — `services/dashboardService.ts`

```ts
const dashboardService = {
  getDashboard(): Promise<DashboardData[]>; // GET /dashboard
};
```

### Tipos — `types.ts`

```ts
interface GastoPorCategoria { categoria: string; valor: number; percentual: number }
interface HistoricoPreco    { data: string; preco: number }        // data em DD/MM ou YYYY-MM-DD
interface ProdutoFrequente  {
  nome: string;
  historico: HistoricoPreco[];
  codigo_NCM_comercial?: string | null;
  sem_gtin?: boolean;
}
interface GrupoNcmSemGtin   {
  ncm: string;
  categoria: string;
  quantidade_produtos: number;
  valor_total: number;
  produto_nome?: string;
}
interface DashboardData     {
  mesAno: string;                    // ex.: "Junho 2026"
  mediaGastosMensal: number;
  quantidadeNotas: number;
  ticketMedio: number;
  gastosPorCategoria: GastoPorCategoria[];
  produtosFrequentes: ProdutoFrequente[];
  gruposNcmSemGtin?: GrupoNcmSemGtin[];
}
```

## Componentes

```tsx
function CategoryDonutChart({ data }: { data: GastoPorCategoria[] }): JSX.Element;
// Rosca Recharts (Pie com innerRadius) com total central.
// Cores fixas por categoria conhecida (CATEGORY_COLORS) + fallback DEFAULT_COLOR.
// Tooltip customizado injetado como content={<CustomTooltip />} — formato BRL via Intl.NumberFormat('pt-BR').

function PriceEvolutionChart({ data, onProductSelect }: {
  data: ProdutoFrequente[];
  onProductSelect?: (productName: string) => void;
}): JSX.Element;
// Linha Recharts do histórico de preço do produto selecionado.
// Seleção interna via dropdown com busca local (useState + useRef para fechar no clique-externo).
// Elevação de callback: reporta o produto escolhido ao pai (DashboardPage usa como subtítulo do card).
```

Ambos seguem o padrão do projeto de render-callback em componente de terceiros (`Tooltip content={...}`).

## Notas

- Erros chegam tipados como `AppError` (ver `src/shared/api/errors.ts`).
- Os DTOs usam snake_case/nomes do backend (`mesAno`, `codigo_NCM_comercial`); nenhum mapeamento é feito na borda — os componentes consomem os campos diretamente.
