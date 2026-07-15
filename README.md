# Minhas Compras BA

Guia completo de manutenção, arquitetura e deploy do projeto **Minhas Compras BA** (Aplicação web para importação de NFC-e da SEFAZ BA com resolução de captcha manual).

---

- Backend em FastAPI expoe API REST em `/api/v1`.
- Frontend em React + Vite consome a API com JWT e cache via React Query.
- Banco principal e PostgreSQL (Neon em producao).
- Fluxo principal: usuario autentica, inicia importacao por chave de 44 digitos, resolve captcha, acompanha processamento e consulta notas/importacoes

O sistema é dividido em três camadas principais:

```
┌────────────────────────┐       Requisições API       ┌───────────────────────────┐
│  FRONTEND (React+Vite) │ ──────────────────────────> │   BACKEND (FastAPI+Docker)│
│  Hospedado na Vercel   │ <────────────────────────── │    Hospedado no Render    │
└────────────────────────┘        Respostas JSON       └───────────────────────────┘
                                                                 │
                                                                 │ Escrita/Leitura SQL
                                                                 ▼
                                                       ┌───────────────────────────┐
                                                       │   BANCO DE DADOS (Postgres)│
                                                       │     Hospedado no Neon     │
                                                       └───────────────────────────┘
```

1. **Frontend (React + Vite)**: Interface do usuário moderna de página única (SPA). Gerencia o fluxo de estados, autenticação JWT local e exibição de dados/gráficos.
2. **Backend (FastAPI + Selenium)**: API REST que expõe os endpoints do sistema. Executa um robô de raspagem (Selenium) que emula o navegador Google Chrome para navegar no portal da SEFAZ BA e capturar captchas.
3. **Banco de Dados (PostgreSQL - Neon)**: Armazena dados de usuários, estabelecimentos, notas fiscais importadas e produtos associados.

---

## ⚠️ Guia de Manutenção e Alteração de URLs (Importante)

Se em algum momento a URL do Frontend (Vercel) ou do Backend (Render) mudar, as seguintes atualizações devem ser feitas manualmente nos painéis de hospedagem:

### 1. Se a URL do Backend (Render) Mudar:
Você deve atualizar o endereço da API no frontend para que ele saiba onde enviar as requisições:
1. Vá no painel da **Vercel** -> Selecione o projeto -> **Project Settings** -> **Environment Variables**.
2. Altere o valor da variável **`VITE_API_BASE_URL`** para a nova URL do Render, mantendo o prefixo `/api/v1` no final (Exemplo: `https://nova-url-do-backend.onrender.com/api/v1`).
3. **CRÍTICO:** Como o Vite injeta variáveis em tempo de compilação, você deve ir na aba **Deployments** da Vercel, selecionar o último deploy e clicar em **Redeploy** para recompilar o código com a nova URL.

### 2. Se a URL do Frontend (Vercel) Mudar:
Você deve atualizar as configurações de segurança no backend para que ele permita conexões vindas do novo endereço (CORS):
1. Vá no painel do **Render** -> Selecione o Web Service -> **Environment**.
2. Altere o valor de **`CORS_ALLOWED_ORIGINS`** adicionando a nova URL da Vercel (separada por vírgula se houver mais de uma). Exemplo: `http://localhost:5173,https://nova-url-do-frontend.vercel.app`.
3. Altere o valor de **`FRONTEND_URL`** para a nova URL da Vercel (Exemplo: `https://nova-url-do-frontend.vercel.app`).
4. Salve as alterações. O Render reiniciará o serviço automaticamente.

---

## ⚙️ Variáveis de Ambiente (.env)

| Variável | Descrição | Onde Configurar | Exemplo de Valor |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String de conexão com o banco de dados PostgreSQL | Render | `postgresql://user:pass@host/db?sslmode=require` |
| `VITE_API_BASE_URL` | Endereço da API backend para o frontend consumir | Vercel | `https://minhascompras-ba.onrender.com/api/v1` |
| `CORS_ALLOWED_ORIGINS`| Domínios permitidos a fazer requisições à API (separados por vírgula) | Render | `http://localhost:5173,https://site.vercel.app` |
| `FRONTEND_URL` | Endereço oficial do frontend para redirecionamentos e e-mails | Render | `https://site.vercel.app` |
| `HEADLESS` | Define se o Selenium roda sem interface visual (`true` em prod) | Render / Local | `true` (Render) / `false` (Local) |
| `JWT_SECRET` | Chave secreta usada para assinar e criptografar tokens JWT | Render | Qualquer string aleatória longa e segura |
| `SMTP_HOST` | Host do servidor de e-mail para recuperação de senha | Render | `smtp-relay.brevo.com` |
| `SMTP_PORT` | Porta de saída SMTP | Render | `587` |
| `SMTP_USER` | Usuário/Login do serviço de SMTP | Render | `exemplo@smtp.com` |
| `SMTP_PASSWORD` | Senha de acesso do SMTP | Render | `sua-senha-smtp` |
| `SMTP_FROM` | Nome e e-mail que aparecerão no remetente das mensagens | Render | `Minhas Compras BA <noreply@gmail.com>` |
| `EMAIL_VERIFICATION_CODE_EXPIRATION_MINUTES` | Validade (minutos) do código de confirmação de cadastro enviado por e-mail | Render | `15` |
| `EMAIL_VERIFICATION_RATE_LIMIT_PER_MIN` | Limite de solicitações de código de confirmação por IP por minuto | Render | `3` |
| `EMAIL_VERIFICATION_MAX_ATTEMPTS` | Máximo de tentativas de digitar o código antes de exigir um novo | Render | `5` |

---

## 🚀 Guia de Deploy (Produção)

### 🐳 Backend (Render)
O backend usa o **Docker** para garantir que as bibliotecas do Linux, o navegador Google Chrome (Chromium) e o motor Chromedriver estejam instalados de forma idêntica à de desenvolvimento.
1. Crie um novo **Web Service** no Render e aponte para o repositório do Fork.
2. Em **Language/Runtime**, escolha **Docker**. (Isso fará o Render ler o `Dockerfile` na raiz do projeto).
3. Na aba **Environment**, insira todas as variáveis de ambiente necessárias listadas na tabela acima.
4. O Render gerará a URL de produção da sua API (ex: `https://nome-da-api.onrender.com`).

### ⚡ Frontend (Vercel)
1. Crie um novo projeto na Vercel a partir do repositório do Fork.
2. **PASSO CRÍTICO:** Em *Configure Project*, configure o **Root Directory** para a pasta **`frontend`** (não deixe a raiz padrão do projeto).
3. Adicione a variável de ambiente `VITE_API_BASE_URL` apontando para a URL da API criada no Render (ex: `https://nome-da-api.onrender.com/api/v1`).
4. Clique em **Deploy**.

---

## 💻 Desenvolvimento Local

### 1. Inicializar o Banco de Dados localmente (SQLite ou Postgres)
O banco de dados é criado de forma 100% automática ao iniciar a API do backend através do SQLAlchemy (`Base.metadata.create_all` no arquivo `src/api/app.py`).

Se você precisar rodar a criação ou atualização de tabelas de forma manual via terminal:
```bash
python -c "from src.database.connection import engine; from src.database.models import Base; Base.metadata.create_all(bind=engine); print('Banco criado com sucesso!')"
```

### 2. Rodar o Backend
```bash
# Crie e ative seu ambiente virtual Python (.venv)
python -m venv .venv
.venv\Scripts\activate # Windows
source .venv/bin/activate # Linux/Mac

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor
uvicorn src.api.app:app --host 0.0.0.0 --port 10000 --reload
```

### 3. Rodar o Frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse o sistema local em `http://localhost:5173`.

---

## 🧠 Lógicas Internas do Sistema

### 1. Fluxo de Importação e Scraping da NFC-e
O scraper foi construído utilizando Selenium e Beautiful Soup 4 devido à complexidade de renderização dinâmica do site da SEFAZ BA e a necessidade de burlar a segurança padrão de consultas automáticas:

1. **Abertura de Sessão (`src/phase1/auth_flow.py`)**:
   * Quando o usuário inicia uma importação, a API dispara um processo Selenium em background, abre o portal da SEFAZ e captura a imagem do Captcha.
   * Essa imagem é convertida em Base64 e enviada ao frontend sob um ID de importação (`import_id`).

2. **Resolução de Captcha**:
   * O usuário digita a resposta do Captcha na interface e envia à API.
   * O Selenium insere o texto no formulário e clica em enviar.

3. **Navegação e Extração (`src/phase2/navigation.py` e `src/phase3/parser.py`)**:
   * Uma vez autenticado, o robô clica nas abas de "Produtos" e "Emitente" para carregar os dados na tela.
   * O HTML renderizado é raspado para obter os detalhes do estabelecimento (CNPJ, Razão Social, Bairro, Cidade) e a lista de itens comprados.

4. **Conversão de Dados e Validação (`src/phase4/db_loader.py`)**:
   * Se o produto for importado sem código de barras (GTIN), o sistema detecta a propriedade `sem_gtin` e o agrupa adequadamente utilizando seu código NCM.

### 2. Inicialização Automática e Updates de Esquema
O projeto não utiliza migrations complexas (como Alembic) para simplificar a entrega acadêmica. A aplicação implementa um helper no arquivo `src/api/app.py` chamado `_ensure_schema_updates()` que roda em conjunto com o `create_all()` no startup da API. Esse helper faz checagens nativas de tabelas existentes no banco e executa comandos `ALTER TABLE` nativos se novas colunas (como `data_compra` ou `sem_gtin`) estiverem ausentes.
