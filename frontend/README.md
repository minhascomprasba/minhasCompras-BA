# Frontend - minhasCompras-BA

Aplicacao React + Vite para autenticacao, importacao de NFC-e e consulta de notas.

## Scripts

- `npm run dev`: ambiente local.
- `npm run build`: build de producao.
- `npm run preview`: preview local do build.
- `npm run lint`: lint.

## Ambiente

- `VITE_API_BASE_URL`: URL base da API com prefixo `/api/v1`.
  - Exemplo local: `http://localhost:10000/api/v1`

## Integracao com backend em producao

- O backend deve permitir CORS para o dominio do frontend publicado.
- Exemplo de origem em producao: `https://minhas-compras-ba.vercel.app`.

## Fluxo de dados

- Login/cadastro retornam JWT.
- Token e enviado automaticamente no `Authorization` via `apiClient`.
- Queries autenticadas usam cache escopado por `userId` para evitar mistura de sessoes.
- Captcha e carregado por fetch autenticado (`blob`) e renderizado no browser com `URL.createObjectURL`.
