# Feature: notas

Consulta das notas fiscais importadas: lista paginada com filtros de período (`NotasPage`), detalhe da nota e seus itens paginados (`NotaDetailPage`).

## Estrutura

```
notas/
├── hooks/
│   └── useNotasQueries.ts    # Hooks React Query: lista, nota única, itens
├── services/
│   └── notasService.ts       # Endpoints /notas via apiClient
├── types.ts                  # DTOs + envelope de paginação
└── README.md
```

Não há pasta `components/`: a UI é implementada diretamente nas páginas `src/pages/NotasPage.tsx` e `src/pages/NotaDetailPage.tsx`.

## API pública

### Hook — `hooks/useNotasQueries.ts`

```ts
function useNotas(userId: number | null, params: GetNotasParams): UseQueryResult<PaginatedResponse<Nota>, Error>;
// queryKey ['notas', userId, params]; placeholderData: keepPreviousData (página antiga visível durante o fetch);
// enabled: !!userId.

function useNota(userId: number | null, notaId: number): UseQueryResult<Nota, Error>;
// queryKey ['nota', userId, notaId];
// enabled somente com userId válido E notaId numérico (!!notaId && !isNaN(notaId)).

function useNotaItens(userId: number | null, notaId: number, params: GetNotaItensParams): UseQueryResult<PaginatedResponse<NotaItem>, Error>;
// queryKey ['nota-itens', userId, notaId, params]; keepPreviousData; mesmo gating do useNota.
```

Padrão de uso em página — o estado de servidor nunca toca o estado do componente:

```tsx
const { user } = useAuth();
const [page, setPage] = useState(1);
const { data, isLoading, isError, error } = useNotas(user?.id ?? null, { page });
```

### Serviço — `services/notasService.ts`

```ts
const notasService = {
  getNotas(params?: GetNotasParams): Promise<PaginatedResponse<Nota>>;              // GET /notas
  getNotaById(notaId: number): Promise<Nota>;                                       // GET /notas/{id}
  getNotaItens(notaId: number, params?: GetNotaItensParams): Promise<PaginatedResponse<NotaItem>>; // GET /notas/{id}/itens
};
```

Os parâmetros são enviados como query string pelo axios (`{ params }`).

### Tipos — `types.ts`

```ts
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  page_size: number;
  total: number;
  resumo?: { total_gasto_periodo: number }; // presente na listagem de notas
}

interface Nota {
  id: number;                 // usado em /notas/:notaId
  codigo_acesso: string;      // chave de 44 dígitos da NFC-e
  created_at: string;
  data_compra?: string | null;
  itens_count?: number;
  valor_total_nota?: number;
}

interface NotaItem {
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

interface GetNotasParams     { page?: number; page_size?: number; from?: string; to?: string } // datas em YYYY-MM-DD
interface GetNotaItensParams { page?: number; page_size?: number }
```

## Notas

- A feature é read-only: notas só entram no sistema via a feature `imports`.
- O `resumo.total_gasto_periodo` do envelope paginado alimenta o indicador de total gasto no período filtrado de `NotasPage`.
- Erros chegam normalizados como `AppError` pela camada compartilhada (`src/shared/api/errors.ts`).
