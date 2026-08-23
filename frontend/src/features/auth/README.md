# Feature: auth

Autenticação da aplicação: contexto de sessão em React + serviço de endpoints `/auth/*`. É a única feature sem pasta `hooks/` — o hook público (`useAuth`) é exportado diretamente do arquivo de contexto.

## Estrutura

```
auth/
├── AuthContext.tsx   # AuthProvider + useAuth() — estado de sessão global
├── authService.ts    # Chamadas aos endpoints /auth/* via apiClient
└── README.md
```

## API pública

### `AuthContext.tsx`

```ts
interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;          // usuário autenticado atual
  isAuthenticated: boolean;   // derivado de !!user
  isLoading: boolean;         // true durante a restauração inicial da sessão
  login(token: string, userData: User): void;
  logout(): void;
}

function AuthProvider({ children }: { children: ReactNode }): JSX.Element;
function useAuth(): AuthContextType;
// useAuth lança erro se usado fora de <AuthProvider>.
```

Comportamento:

- **Token**: persistido no `localStorage` sob a chave `auth_token`.
- **`login`**: grava o token, define o usuário e executa `queryClient.clear()` — o cache do React Query nunca é compartilhado entre sessões.
- **`logout`**: remove o token, limpa o usuário e o cache.
- **Restauração de sessão** (effect de montagem): se houver token salvo, valida-o com `authService.getMe()`; falha ⇒ `logout()`. Ao final, `isLoading = false` (consumido por `PrivateRoute` para exibir spinner em vez de redirecionar cedo demais).
- **Logout automático**: escuta o evento global `'auth_unauthorized'`, disparado pelo response interceptor do `apiClient` em qualquer resposta 401.

### `authService.ts`

```ts
interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

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

| Método | Endpoint | Uso |
|---|---|---|
| `register` | `POST /auth/register` | Cadastro (`RegisterPage`); dispara envio do código de confirmação |
| `verifyEmail` | `POST /auth/verify-email` | Confirmação do código de 6 dígitos; **retorna o JWT** (`ConfirmEmailPage`) |
| `resendCode` | `POST /auth/resend-code` | Reenvio do código (`ConfirmEmailPage`) |
| `login` | `POST /auth/login` | Login (`LoginPage`) |
| `getMe` | `GET /auth/me` | Validação/obtenção do usuário da sessão (`AuthProvider`, restauração) |
| `requestPasswordReset` | `POST /auth/forgot-password` | Solicita e-mail de reset (`ForgotPasswordPage`) |
| `resetPassword` | `POST /auth/reset-password` | Define nova senha com token do e-mail (`ResetPasswordPage`) |

## Fluxos

- **Cadastro → confirmação**: `RegisterPage` → `register()` → navega para `/confirmar-email` com o e-mail em `location.state` → `verifyEmail()` → `login(token, user)` → `/notas`.
- **Login**: `LoginPage` → `login()` → `login(access_token, user)` → `/dashboard`.
- **Recuperação de senha**: `ForgotPasswordPage` → e-mail → `ResetPasswordPage` (token via `?token=`) → volta a `/login` com mensagem em `location.state.message`.

## Consumidores

- `PrivateRoute` (`src/app/router.tsx`) usa `isAuthenticated`/`isLoading` para proteger as rotas privadas.
- Todas as páginas autenticadas usam `useAuth().user.id` como parte das query keys.
- `src/shared/api/client.ts` lê o mesmo `localStorage('auth_token')` para montar o header `Authorization`.
