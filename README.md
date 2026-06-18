# minhasCompras-BA

Aplicacao web para importacao de NFC-e da SEFAZ BA com captcha manual, autenticacao de usuarios e historico privado de notas fiscais.

## Visao geral

- Backend em FastAPI expoe API REST em `/api/v1`.
- Frontend em React + Vite consome a API com JWT e cache via React Query.
- Banco principal e PostgreSQL (Neon em producao).
- Fluxo principal: usuario autentica, inicia importacao por chave de 44 digitos, resolve captcha, acompanha processamento e consulta notas/importacoes.

## Arquitetura

### 1) Backend (FastAPI)

Arquivos principais

- `src/api/app.py`: bootstrap da aplicacao, registro de rotas e handlers de erro.
- `src/api/routers.py`: endpoints de health, importacao, notas e itens.
- `src/api/auth.py`: cadastro, login e `/auth/me`.
- `src/api/security.py`: hash de senha (Argon2 via `pwdlib`) e JWT.
- `src/api/services/import_service.py`: orquestracao do fluxo de importacao NFC-e.

Pipeline de importacao (servico):

1. `POST /imports/nfce` valida chave e abre sessao Selenium.
2. Captura captcha e retorna `import_id`.
3. Front envia captcha em `POST /imports/nfce/{import_id}/captcha`.
4. Servico autentica no portal, navega para produtos, faz parsing e persiste dados.
5. Front acompanha status em `GET /imports/nfce/{import_id}`.

Modulos de scraping usados pela API:

- `src/phase1/auth_flow.py`
- `src/phase2/navigation.py`
- `src/phase3/parser.py`
- `src/phase4/db_loader.py`

Observacao: a versao CLI antiga foi removida. O projeto roda somente no modo API/web.

### 2) Frontend (React + Vite)

Arquivos principais:

- `frontend/src/app/router.tsx`: rotas publicas e privadas.
- `frontend/src/features/auth/AuthContext.tsx`: sessao, login/logout e limpeza de cache por usuario.
- `frontend/src/shared/api/client.ts`: cliente Axios com `Authorization: Bearer`.
- `frontend/src/features/notas/hooks/useNotasQueries.ts`: queries com `queryKey` escopado por `userId`.
- `frontend/src/pages/ImportPage.tsx`: fluxo de captcha com fetch autenticado em blob.

Principios atuais do front:

- Toda chamada autenticada usa JWT do `localStorage`.
- Cache do React Query e isolado por usuario para evitar vazamento visual entre sessoes.
- Captcha e carregado via request autenticada (`blob`), nao por `<img src>` direto em endpoint protegido.

### 3) Banco de dados (PostgreSQL)

Conexao:

- Configurada em `src/database/connection.py` via `DATABASE_URL`.

Modelos principais (`src/database/models.py`):

- `usuarios`
  - `id`, `email` (unico), `password_hash`, `created_at`.
- `notas_fiscais`
  - `id`, `usuario_id` (FK), `codigo_acesso`, `valor_total_nota`, `created_at`.
  - Constraint importante: `UNIQUE(usuario_id, codigo_acesso)`.
- `produtos_extraidos`
  - itens vinculados por `id_nota_fiscal`.
- `nfce_imports`
  - rastreia status da importacao (`WAITING_CAPTCHA`, `PROCESSING`, `COMPLETED`, `FAILED`, `EXPIRED`).

## API principal

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

Importacao NFC-e:

- `POST /api/v1/imports/nfce`
- `GET /api/v1/imports/nfce/{import_id}/captcha-image`
- `POST /api/v1/imports/nfce/{import_id}/captcha`
- `GET /api/v1/imports/nfce/{import_id}`
- `GET /api/v1/imports/nfce`

Notas:

- `GET /api/v1/notas`
- `GET /api/v1/notas/{nota_id}`
- `GET /api/v1/notas/{nota_id}/itens`

Infra:

- `GET /api/v1/health`
- `GET /api/v1/ready`

## Variaveis de ambiente

Base (`.env.example`):

- `DATABASE_URL` (PostgreSQL em producao)
- `JWT_SECRET`
- `JWT_EXPIRATION_HOURS`
- `SEFAZ_URL`
- `PAGE_TIMEOUT_SECONDS`
- `MAX_CAPTCHA_ATTEMPTS`
- `CAPTCHA_TTL_SECONDS`
- `HEADLESS`
- `IMPORT_RATE_LIMIT_PER_MIN`
- `CORS_ALLOWED_ORIGINS` (lista separada por virgula; ex.: `http://localhost:5173,https://minhas-compras-ba.vercel.app`)

Frontend:

- `VITE_API_BASE_URL` (ex.: `https://seu-backend.onrender.com/api/v1`)

## Execucao local

### Backend

```bash
pip install -r requirements.txt
uvicorn src.api.app:app --host 0.0.0.0 --port 10000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deploy

- O deploy da API e feito por container usando o `Dockerfile` da raiz.
- A imagem instala Chromium/Chromedriver para o fluxo Selenium.
- Comandos principais:
  - `docker build -t <usuario>/minhascompras-api:latest .`
  - `docker push <usuario>/minhascompras-api:latest`
- No Render, usar `Deploy latest image`.

## Observacoes operacionais

- Captcha exige intervencao manual do usuario final.
- Erros de regra retornam codigos de dominio (ex.: `INVALID_PASSWORD`, `INVALID_CAPTCHA`).
- Em autenticacao, senha valida entre 8 e 128 caracteres.
