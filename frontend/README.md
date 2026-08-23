# Frontend — minhasCompras-BA

SPA em React + Vite para autenticação, importação de NFC-e (via QR code / foto / chave manual), consulta de notas fiscais, dashboard de gastos e mapa de compras.

## Stack Tecnológica

| Camada | Biblioteca |
|---|---|
| UI | React 19 (apenas componentes função) |
| Build | Vite 8 |
| Linguagem | TypeScript ~6.0 |
| Rotas | React Router v7 (data APIs do `createBrowserRouter`) |
| Estado de servidor | TanStack React Query v5 |
| Cliente HTTP | Axios (instância única compartilhada) |
| Formulários | react-hook-form + zod (`@hookform/resolvers`) |
| Gráficos | Recharts 3 |
| Leitura de QR code | html5-qrcode |
| Mapas | Leaflet 1.9.4 — **carregado via CDN no `index.html`**, consumido como `window.L` (não é dependência npm) |
| Estilização | CSS global puro (`src/index.css`, design tokens como custom properties) |

## Scripts

```bash
npm run dev      # servidor de desenvolvimento local (proxy de /api para o backend de produção)
npm run build    # tsc -b && vite build
npm run preview  # preview local do build de produção
npm run lint     # eslint
```

Ainda não há test runner configurado.

## Ambiente e Configuração

- **`VITE_API_BASE_URL`** — URL base da API incluindo o prefixo `/api/v1`.
  - Exemplo local: `http://localhost:10000/api/v1`
  - Fallback fixado em `src/shared/api/client.ts` caso não seja definida.
- `vite.config.ts` faz proxy de `/api` → `https://minhascompras-api.onrender.com` durante o desenvolvimento.
- O backend deve permitir CORS para a origem do frontend publicado (ex.: `https://minhas-compras-ba.vercel.app`).
- O `vercel.json` reescreve todos os caminhos para `/index.html` para que o client-side routing funcione ao recarregar a página.

---

# Visão Geral da Arquitetura

A aplicação segue uma arquitetura **feature-first** com uma camada compartilhada enxuta. Os dados sempre fluem em uma única direção:

```
Componente de página
   │  chama
   ▼
Hook tipado (wrapper do React Query)            src/features/<dominio>/hooks/
   │  chama
   ▼
Serviço da feature (módulo objeto literal)      src/features/<dominio>/services/
   │  chama
   ▼
apiClient compartilhado (Axios + interceptors)  src/shared/api/client.ts
   │  HTTP
   ▼
API REST em VITE_API_BASE_URL
```

Todo erro de requisição é normalizado em um `AppError { code, message, details, status }` antes de chegar aos hooks ou páginas, de modo que a UI ramifique sobre códigos de erro estáveis em vez de erros brutos do axios.

### Organização de arquivos

```
frontend/
├── index.html                  # HTML de entrada; carrega Leaflet CSS/JS via CDN (com SRI)
├── vercel.json                 # Fallback de rewrite para SPA
├── vite.config.ts              # Plugin React + proxy /api em desenvolvimento
└── src/
    ├── main.tsx                # Ponto de entrada (Providers + AppRouter)
    ├── index.css               # Folha de estilos global única (~3k linhas), tema escuro
    ├── app/                    # Configuração da aplicação
    │   ├── providers.tsx       # QueryClientProvider com opções padrão
    │   └── router.tsx          # Tabela de rotas + guarda PrivateRoute
    ├── components/             # Componentes compartilhados entre features
    │   ├── AuthenticatedLayout.tsx   # Navbar + <Outlet /> das páginas protegidas
    │   └── ImportActionIcons.tsx     # Componentes de ícones SVG inline
    ├── features/               # Lógica de domínio agrupada por feature
    │   ├── auth/               # AuthContext.tsx + authService.ts
    │   ├── dashboard/          # components/, hooks/, services/, types.ts, mockDashboardData.ts
    │   ├── imports/            # components/, hooks/, services/, types.ts, utils/
    │   ├── mapa/               # mapaService.ts (serviço + DTOs no mesmo arquivo)
    │   └── notas/              # hooks/, services/, types.ts
    ├── pages/                  # Um arquivo plano por rota: XxxPage.tsx
    └── shared/api/
        ├── client.ts           # Instância Axios ("apiClient") + interceptors
        └── errors.ts           # Classe AppError + parseApiError()
```

**Convenções**

- Componentes/páginas: `PascalCase.tsx`; hooks: `useXxx.ts` (nomes no plural como `useImportMutations.ts` quando vários hooks relacionados compartilham o arquivo).
- Cada feature possui seu `types.ts` com DTOs snake_case espelhando o backend (`access_key`, `valor_total_nota`); estado da UI fica em camelCase.
- Pastas de feature podem conter `components/`, `hooks/`, `services/`, `utils/`.
- Classes CSS em kebab-case com modificadores estilo BEM (`.nav-link--active`, `.btn-primary`).

### Gerenciamento de estado

Não há Redux/Zustand. Apenas três camadas:

1. **Estado de servidor — TanStack Query.** Um único `QueryClient` criado uma vez em `Providers({ children })` (`src/app/providers.tsx`) com padrões: `staleTime` de 1 minuto, `refetchOnWindowFocus: false`, `retry: 1`.
2. **Estado de sessão/auth — React Context** (ver [Autenticação](#autenticação)).
3. **Estado local de UI — `useState`/`useRef`** por página (paginação, filtros, blob do captcha, acordeões).

---

# Autenticação

Baseada em JWT. O token fica no `localStorage` sob a chave **`auth_token`** e é anexado a cada requisição pelo request interceptor do axios. Três peças cooperam:

### 1. Sessão — `src/features/auth/AuthContext.tsx`

```ts
interface AuthContextType {
  user: User | null;          // usuário autenticado ({ id, email })
  isAuthenticated: boolean;   // derivado de !!user
  isLoading: boolean;         // true durante a restauração da sessão inicial
  login(token: string, userData: User): void;
  logout(): void;
}

function AuthProvider({ children }: { children: ReactNode }): JSX.Element;
function useAuth(): AuthContextType; // lança erro se usado fora do AuthProvider
```

Comportamento:

- **Restauração de sessão**: na montagem, se existir um token persistido, valida-o via `authService.getMe()` (`GET /auth/me`); token inválido/expirado dispara `logout()`. Só então `isLoading` vira `false`.
- **`login`**: persiste o token no `localStorage`, define o usuário e executa `queryClient.clear()` — dados em cache nunca são compartilhados entre sessões.
- **`logout`**: remove o token, limpa o usuário e limpa o cache.
- **Logout global**: escuta o evento de window `'auth_unauthorized'` (disparado pelo interceptor do axios em qualquer resposta 401) e encerra a sessão automaticamente.

### 2. Rotas protegidas — `src/app/router.tsx`

```tsx
function PrivateRoute({ children }: { children: React.ReactNode }): JSX.Element;
// Renderiza os filhos quando autenticado, um spinner centralizado enquanto isLoading,
// ou <Navigate to="/login" /> caso contrário.

function AppRouter(): JSX.Element;
// Monta <RouterProvider> com a tabela de rotas abaixo.
```

Tabela de rotas:

| Rota | Página | Protegida? |
|---|---|---|
| `/` | HomePage | Não |
| `/login` | LoginPage | Não |
| `/register` | RegisterPage | Não |
| `/confirmar-email` | ConfirmEmailPage | Não |
| `/esqueci-senha` | ForgotPasswordPage | Não |
| `/redefinir-senha` | ResetPasswordPage | Não |
| `/dashboard` | DashboardPage | Sim |
| `/importar` | ImportPage | Sim |
| `/importacoes/:importId` | ImportStatusPage | Sim |
| `/notas` | NotasPage | Sim |
| `/notas/:notaId` | NotaDetailPage | Sim |
| `/mapa` | MapPage | Sim |
| `*` | NotFoundPage | Não |

As rotas protegidas são filhas de uma rota sem path cujo elemento é `<PrivateRoute><AuthenticatedLayout /></PrivateRoute>` — guarda *e* layout aplicados a todos os filhos de uma vez. O `AuthenticatedLayout` renderiza navbar fixa, menu hambúrguer mobile e rodapé ao redor de um `<Outlet />`.

### 3. Fluxos de auth — `src/features/auth/authService.ts`

```ts
interface User { id: number; email: string }
interface AuthResponse { access_token: string; token_type: string; user: User }

const authService = {
  register(data: { email: string; password: string }): Promise<{ message: string }>;
  verifyEmail(data: { email: string; code: string }): Promise<AuthResponse>;
  resendCode(data: { email: string }): Promise<{ message: string }>;
  login(data: Record<string, string>): Promise<AuthResponse>;
  getMe(): Promise<User>;
  requestPasswordReset(data: { email: string }): Promise<{ message: string }>;
  resetPassword(data: { token: string; password: string }): Promise<{ message: string }>;
};
```

Fluxos ponta a ponta:

- **Cadastro** (`RegisterPage.tsx`) → navega para `/confirmar-email` passando o e-mail via `location.state`.
- **Confirmação de e-mail** (`ConfirmEmailPage.tsx`) → `verifyEmail()` retorna o JWT → `login(token, user)` → redireciona para `/notas`.
- **Login** (`LoginPage.tsx`) → `login(response.access_token, response.user)` → redireciona para `/dashboard`.
- **Esqueci/redefinir senha** — token de reset lido do parâmetro de busca `?token=` (`ResetPasswordPage.tsx`), depois redireciona de volta para `/login` com mensagem de sucesso em `location.state.message`.

---

# Serviços

Os serviços são módulos objetos literais de funções assíncronas tipadas — sem classes, sem estado. Eles só conhecem o `apiClient` e seus DTOs; páginas nunca os importam diretamente (apenas hooks, com duas exceções citadas abaixo).

### Cliente API compartilhado — `src/shared/api/client.ts`

```ts
const apiClient: AxiosInstance;
// Criado com baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1'
// e header 'Content-Type: application/json'.
//
// request interceptor: injeta Authorization: Bearer <token> lido de localStorage('auth_token').
// response interceptor: em status 401 dispara window event 'auth_unauthorized'
//                       (consumido pelo AuthProvider) e lança parseApiError(error).
```

### Normalização de erros — `src/shared/api/errors.ts`

```ts
class AppError extends Error {
  code: string;                    // ex.: 'INVALID_CAPTCHA', 'NETWORK_ERROR', 'INTERNAL_ERROR'
  details?: ApiErrorDetails;       // detalhes estruturados do backend (ex.: regra de senha violada)
  status?: number;                 // HTTP status, quando houver
}

function parseApiError(error: unknown): AppError;
// Converte erros axios (resposta com corpo {code,message,details}, falha de rede, etc.)
// e erros desconhecidos em AppError.
```

As páginas ramificam sobre os códigos, ex.: `INVALID_CAPTCHA` / `CAPTCHA_EXPIRED` em `ImportPage.tsx`, ou `INVALID_PASSWORD` com `details.rule` em `RegisterPage.tsx`.

### Serviços por feature

```ts
// src/features/auth/authService.ts — ver seção Autenticação
// Endpoints: /auth/register, /auth/verify-email, /auth/resend-code,
//            /auth/login, /auth/me, /auth/forgot-password, /auth/reset-password

// src/features/dashboard/services/dashboardService.ts
const dashboardService = {
  getDashboard(): Promise<GetDashboardResponse>; // GET /dashboard
};

// src/features/imports/services/importsService.ts
const importsService = {
  startImport(data: StartImportRequest): Promise<StartImportResponse>;          // POST /imports/nfce
  submitCaptcha(importId: string, data: SubmitCaptchaRequest): Promise<SubmitCaptchaResponse>; // POST /imports/nfce/{id}/captcha
  getImportStatus(importId: string): Promise<GetImportStatusResponse>;          // GET /imports/nfce/{id}
  getCaptchaImageBlob(importId: string): Promise<Blob>;                         // GET /imports/nfce/{id}/captcha-image (responseType: 'blob')
};

// src/features/notas/services/notasService.ts
const notasService = {
  getNotas(params: GetNotasParams): Promise<PaginatedNotasResponse>;            // GET /notas (paginado)
  getNotaById(notaId: number): Promise<Nota>;                                   // GET /notas/{id}
  getNotaItens(notaId: number, params: GetNotaItensParams): Promise<PaginatedItensResponse>; // GET /notas/{id}/itens (paginado)
};

// src/features/mapa/mapaService.ts (DTOs co-localizados no mesmo arquivo)
const mapaService = {
  getMapa(): Promise<MapaPonto[]>; // GET /mapa
};
```

Duas exceções chamam APIs fora do padrão hook→service, por design:

- `HomePage.tsx` busca o endpoint público `GET /stats` diretamente via `apiClient`.
- `MapPage.tsx` geocodifica CEPs com `fetch` puro contra serviços externos gratuitos (BrasilAPI → Nominatim → ViaCEP), com cache versionado em localStorage (`geocep:v2:<cep>`). O Leaflet em si vem do CDN carregado no `index.html`.

---

# Hooks

Hooks personalizados vivem na pasta `hooks/` de cada feature e são adaptadores finos sobre o React Query. Convenções usadas consistentemente:

- Todo hook de query/mutation é **tipado**: `useQuery<TData, AppError>`.
- Toda query key começa com o nome do recurso e inclui o **`userId`**, de modo que o cache seja delimitado por sessão e nunca misturado entre usuários.
- As queries são controladas com `enabled: !!userId` para que nada dispare antes da auth resolver.
- Listas paginadas usam `placeholderData: keepPreviousData` para manter a página anterior visível enquanto a próxima é buscada.

### Assinaturas e comportamento

```ts
// src/features/auth/AuthContext.tsx
useAuth(): { user: User | null; isAuthenticated: boolean; isLoading: boolean; login(token: string, userData: User): void; logout(): void };
// Consumidor do contexto de sessão; lança erro fora do AuthProvider.

// src/features/dashboard/hooks/useDashboard.ts
useDashboard(userId: number | null): UseQueryResult<GetDashboardResponse, AppError>;
// Busca as agregações do dashboard. Key ['dashboard', userId].

// src/features/imports/hooks/useImportMutations.ts
useStartImport(): UseMutationResult<StartImportResponse, AppError, StartImportRequest>;
// Inicia a importação de uma NFC-e (POST /imports/nfce).

useSubmitCaptcha(importId: string): UseMutationResult<SubmitCaptchaResponse, AppError, SubmitCaptchaRequest>;
// Submete a resposta do captcha da SEFAZ para a importação indicada.

// src/features/imports/hooks/useImportQueries.ts
useImportStatusPolling(importId: string, userId: number | null): UseQueryResult<GetImportStatusResponse, AppError>;
// Faz polling do status a cada 3 s (key ['importStatus', userId, importId]).
// Para sozinho quando o status atinge COMPLETED, FAILED ou EXPIRED; retry: 1.

// src/features/notas/hooks/useNotasQueries.ts
useNotas(userId: number | null, params: GetNotasParams): UseQueryResult<PaginatedNotasResponse, Error>;
// Lista paginada de notas. Key ['notas', userId, params]; keepPreviousData.

useNota(userId: number | null, notaId: number): UseQueryResult<Nota, Error>;
// Busca uma nota por id. Desabilitada se notaId for inválido (!isNaN).

useNotaItens(userId: number | null, notaId: number, params: GetNotaItensParams): UseQueryResult<PaginatedItensResponse, Error>;
// Itens paginados de uma nota. Key ['nota-itens', userId, notaId, params]; keepPreviousData.
```

Uso típico em uma página — o estado de servidor nunca toca o estado do componente:

```tsx
const { user } = useAuth();
const [page, setPage] = useState(1);
const { data, isLoading, isError, error } = useNotas(user?.id ?? null, { page });
// error é um AppError: ramifique sobre error.code quando necessário
```

---

# Padrões React Frequentes

Padrões que se repetem neste codebase:

### 1. Context + hook consumidor com guarda de erro
`src/features/auth/AuthContext.tsx` — contexto criado com valor inicial `undefined`; o `useAuth()` lança um erro claro quando usado fora do provider.

### 2. Layout route com `<Outlet />`
`src/components/AuthenticatedLayout.tsx` — shell de navbar/rodapé ao redor do `<Outlet />`, para que as páginas protegidas não repitam o layout. Combinado à rota sem path em `router.tsx`, o layout *e* a guarda se aplicam a todos os filhos de uma vez.

### 3. Componentes wrapper/guarda
`PrivateRoute` em `src/app/router.tsx` — decide entre renderizar os filhos, um spinner durante `isLoading` ou `<Navigate to="/login" />`. Mesma ideia de um HOC, mas como componente comum que recebe `children`.

### 4. Hooks como adaptadores finos do React Query
Toda busca de dados passa por hooks personalizados; os componentes consomem `data/isLoading/isError/error` sem nunca importar axios ou serviços diretamente.

### 5. Espelhamento de callbacks em refs (evitando closures obsoletas)
`src/features/imports/components/QrCodeScanner.tsx` — mantém as props mais recentes (`onScan`, `onClose`) em refs atualizadas num effect, para que o effect de longa duração da câmera não precise reiniciar quando o pai passa callbacks inline novos.

### 6. Recurso singleton em nível de módulo
`src/features/imports/utils/scanQrFromFile.ts` — cria preguiçosamente uma única div âncora oculta de `Html5Qrcode`, reutilizada entre leituras, em vez de montar/desmontar nós de DOM.

### 7. Formulários: react-hook-form + zod, mutations imperativas
Todo formulário usa RHF com schema zod (`zodResolver`), ex.: política de senha com checklist ao vivo em `RegisterPage.tsx`. Os submits chamam mutations imperativamente via `mutate(data, { onSuccess, onError })` e ramificam sobre códigos de erro do backend (`INVALID_CAPTCHA`, `CAPTCHA_EXPIRED`, `INVALID_PASSWORD` + `details.rule`).

### 8. Elevação de callback via props
Componentes filhos reportam interações às páginas via props de callback:
- `PriceEvolutionChart` recebe `onProductSelect`; `DashboardPage` exibe a seleção como subtítulo do card.
- `QrCodeScanner` recebe `isOpen/onClose/onScan` de `ImportPage`.
- Tooltips customizados do Recharts são injetados como `content={<CustomTooltip />}` nos dois gráficos do dashboard (render-callback em componente de terceiros).

### 9. Comunicação cross-cutting via eventos de window
O evento `'auth_unauthorized'` conecta a camada axios (fora do React) ao `AuthProvider` sem prop drilling nem imports circulares. De forma similar, `AuthenticatedLayout.tsx` alterna a classe `menu-open` em `document.body` para o menu mobile.

### 10. Ícone como componente
`src/components/ImportActionIcons.tsx` — pequenos componentes de função SVG (`QrCodeIcon`, `ImageUploadIcon`) compartilhando um objeto `iconProps` espalhado.

**Não utilizado:** HOCs, componentes com render props, compound components, class components, limites de Suspense/ErrorBoundary.

---

# Fluxo Principal do Domínio: Importação de NFC-e

A funcionalidade principal amarra a maioria dos padrões (`ImportPage.tsx` → `ImportStatusPage.tsx`):

1. Obtenha a chave de acesso de 44 dígitos por **leitura de QR** (câmera via `html5-qrcode` com heurística de ranking de câmera traseira em `utils/pickBackCamera.ts`), **upload de foto** (`utils/scanQrFromFile.ts`) ou **digitação manual** (validada por `utils/extractAccessKey.ts`).
2. Mutation `useStartImport` → `POST /imports/nfce`.
3. Imagem do captcha da SEFAZ buscada como **blob autenticado** (`getCaptchaImageBlob`) e renderizada via `URL.createObjectURL`.
4. Mutation `useSubmitCaptcha` trata as retentativas de `INVALID_CAPTCHA` / `CAPTCHA_EXPIRED`.
5. `useImportStatusPolling` faz polling a cada 3 s até `COMPLETED/FAILED/EXPIRED`, então linka para a página de detalhe da nota.

# Estilização

CSS global puro em `src/index.css` — sem Tailwind/CSS Modules/styled-components:

- Design tokens como CSS custom properties no `:root`: cores de marca (`--brand-green`, `--brand-blue`), superfícies escuras (`--bg-main: #0A0F1A`), tipografia Inter, raios, transições e safe-area insets.
- Classes de componente escritas à mão (`.card`, `.glass-panel`, `.btn-primary`, `.form-input`, `.table`, `.spinner`, `.container-*`) além de utilitários pequenos (`.mb-6`, `.sr-only`).
- Seções por página e media queries responsivas/mobile-first abundantes (alvos de toque com min-height 44px).
- Overrides de tema escuro para popups/controles do Leaflet.
