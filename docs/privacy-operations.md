# Controles de conta e privacidade

Implementação nas branches `feature/user-profile-lgpd` e `feat/lgpd-status-exclusao`; este documento não constitui uma declaração de conformidade integral com a LGPD.

## Requisitos para publicação

Não publique o aviso preliminar nem habilite esta política de retenção em produção até que o responsável forneça e revise:

- A identidade do controlador/operador e um contato de privacidade funcional, incluindo um canal para pessoas que não conseguem entrar na conta.
- As finalidades efetivas e as bases legais de cada atividade de tratamento.
- Os fornecedores de hospedagem, banco de dados, SMTP e outros destinatários, suas localizações e eventuais transferências internacionais.
- O prazo de retenção dos backups e os procedimentos de exclusão e restauração.

Substitua o parágrafo que explicita as informações pendentes em `/privacidade` pelas informações revisadas. Referência para a terminologia dos direitos: [orientações da ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares).

## Inventário de dados

| Registros | Conteúdo e finalidade | Prazo de retenção implementado |
| --- | --- | --- |
| Usuários | E-mail, hash da senha, perfil, versão das credenciais, data de criação; acesso à conta | Até a exclusão definitiva pelo job diário, após a carência de sete dias |
| Notas fiscais/itens | Chave da nota, datas, forma de pagamento, preços, quantidades, referências ao catálogo; histórico e análise de compras | Até a exclusão definitiva pelo job diário, após a carência de sete dias |
| Produtos/estabelecimentos | Descrições compartilhadas, identificadores comerciais, endereços, coordenadas | Catálogo compartilhado; preservado na exclusão da conta |
| Importações | Chave da nota, status/origem, tentativas/datas, referência à nota, caminho temporário do CAPTCHA | Metadados até a exclusão da conta; imagem removida na conclusão ou expiração |
| Desafios de cadastro/recuperação/alteração | Hash do PIN/token, hash da senha quando aplicável, operação, versão, expiração, tentativas | Mantidos por 24 horas após o uso ou a expiração e, depois, removidos pelo job diário |
| Limites de requisições | Hashes das chaves dos agrupamentos por usuário/IP e contadores | Removidos após 24 horas |
| Eventos de exclusão | Protocolo aleatório, dia em UTC e origem (autoatendimento/administração); sem vínculo com conta, autor ou e-mail | `ACCOUNT_DELETION_AUDIT_DAYS`, padrão de 90 dias, sujeito à revisão do responsável |
| Exclusão pendente | `usuarios.status`/`deletion_requested_at`; em `pending_account_deletions`, hash do token de cancelamento e origem | Sete dias, seguidos da finalização pelo job diário; removida imediatamente na reativação |
| Exportações | JSON versionado com campos explicitamente permitidos, gerado em memória | Sem arquivo de exportação persistente; `Cache-Control: no-store` |
| Backups | Cópias específicas de cada implantação | Definido pelo responsável antes da publicação |

Os fornecedores de SMTP e da SEFAZ tratam os dados necessários ao envio de mensagens e à importação de notas fiscais. A integração de geocodificação também consulta fornecedores públicos de endereços para obter as coordenadas dos estabelecimentos; inventarie os fornecedores efetivamente configurados antes da publicação. Os logs da aplicação não devem capturar corpos de requisição, cabeçalhos Authorization, parâmetros de consulta com tokens de recuperação, URLs de notas fiscais, PINs ou conteúdo de mensagens SMTP. Configure o proxy reverso e o monitoramento de acesso e erros com ocultação equivalente desses dados. Logs históricos e o antigo arquivo `data/debug/last_nfce_page.html` já podem conter dados pessoais: inventarie e remova esses dados conforme um procedimento aprovado pelo responsável antes da publicação. Esta alteração interrompe a geração de novas cópias de páginas de notas fiscais para depuração.

## Credenciais e revogação

A declaração `cv` do JWT deve corresponder à `credential_version` do usuário atual, verificada pela dependência compartilhada de autenticação. Declarações ausentes são consideradas zero, preservando sessões antigas até sua expiração ou a próxima alteração de credenciais. Alterações bem-sucedidas de e-mail/senha e a recuperação de senha incrementam a versão e invalidam tokens de recuperação e desafios de conta ainda pendentes. As alterações de perfil retornam um `TokenResponse` substituto; o navegador substitui o token e o usuário armazenados por meio do AuthContext. As demais sessões recebem 401. Uma senha de confirmação incorreta gera um erro de campo 422, portanto não aciona a saída global da conta.

Cada desafio de alteração fica vinculado ao usuário, à operação, à versão das credenciais e ao novo e-mail ou hash da nova senha. Os PINs usam HMAC com chave e incorporam o ID do desafio. A expiração ocorre em 15 minutos; cinco tentativas esgotam um desafio; uma nova solicitação invalida o desafio anterior da mesma operação. Contadores no banco de dados impõem o limite de três solicitações por usuário e por IP da conexão direta por minuto. Quando for necessário obter os IPs dos clientes remotos, execute a aplicação atrás de um proxy confiável e corretamente configurado; a aplicação intencionalmente não confia em cabeçalhos `X-Forwarded-For` arbitrários.

Bloqueios de escrita no SQLite e atualizações de linhas no PostgreSQL serializam a confirmação de credenciais, a exclusão de contas, a criação de importações e a persistência de notas fiscais. A proteção do último SUPER_ADMIN compartilha o bloqueio administrativo com as alterações de perfil. Importações em WAITING_CAPTCHA/PROCESSING impedem a exclusão, mesmo que o prazo de processamento tenha passado. Uma tarefa PROCESSING que tenha falhado deve ser investigada e explicitamente marcada como FAILED pelo operador somente após confirmar que seu worker parou; expirar automaticamente um worker em execução poderia permitir que ele persistisse dados após a exclusão. Nenhum worker deve ser abandonado sem essa conciliação operacional.

As adições ao esquema usam o `create_all` existente e atualizações ALTER na inicialização. Os registros existentes são preservados; as versões de credenciais são preenchidas com zero. Um índice único em `lower(email)` impede duplicatas que diferem apenas entre maiúsculas e minúsculas, inclusive em cadastros ou alterações simultâneos. Se houver duplicatas históricas desse tipo, a inicialização falha de forma segura ao criar o índice: resolva a titularidade dessas contas antes da migração; a migração nunca descarta nem mescla contas automaticamente. Faça um backup antes de aplicar atualizações de esquema. Há suporte às sintaxes de SQLite e PostgreSQL; o SQLite é coberto pela suíte automatizada. Antes da publicação, valide em homologação com a versão de PostgreSQL usada na implantação.

## Rotinas de retenção

A limpeza é dividida em duas rotinas idempotentes (`src/api/services/retention_service.py`):

| Rotina | O que faz | Quando roda |
| --- | --- | --- |
| `cleanup_import_sessions` | Expira importações em WAITING_CAPTCHA vencidas, libera navegadores locais e remove imagens de CAPTCHA (encerradas, expiradas ou sem referência há mais de 24 horas) | Na inicialização da API e nas rotas de importação |
| `cleanup_auth_records` + `purge_expired_accounts` | Remove desafios, tokens, códigos e limites de requisição com mais de 24 horas, eventos de exclusão expirados e **exclui definitivamente as contas com carência vencida** | Somente no job diário (APScheduler) |

### Job diário (APScheduler)

O job roda **dentro do processo da API**, com o APScheduler (`src/api/scheduler.py`). Ele é iniciado no startup e encerrado no shutdown do FastAPI. Por padrão dispara todo dia às 03:00 no fuso `America/Bahia`. As variáveis que controlam o job:

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `RETENTION_JOB_ENABLED` | `true` | Liga/desliga o agendador |
| `RETENTION_JOB_CRON` | `0 3 * * *` | Expressão crontab. Para dia da semana use nomes (`mon`, `tue`…): no APScheduler 3 o número 0 é segunda-feira |
| `RETENTION_JOB_TIMEZONE` | `America/Bahia` | Fuso da expressão |

O job usa `coalesce` e `max_instances=1` (nunca roda em paralelo consigo mesmo) e registra no log quantas contas excluiu e quantas adiou. Falhas são logadas e não derrubam o agendador; a próxima execução tenta de novo.

**Limitações:**

- O job só dispara enquanto a API está no ar. Se a instância estiver parada ou hibernada no horário (por exemplo, no plano gratuito do Render), a execução daquele dia é perdida. A execução seguinte processa todas as contas vencidas: a exclusão atrasa, nunca é antecipada. Por isso o serviço da API deve ficar sempre ligado.
- Cada processo da API tem o seu agendador. Use um único worker e uma única réplica, o que já é exigido pelas importações em memória. Execuções duplicadas não causam dano, porque a rotina é idempotente e roda sob bloqueio, mas fazem trabalho repetido.

**Disparo manual.** Para rodar fora do horário, use `POST /api/v1/internal/jobs/retention` com o header `X-Job-Secret: <JOB_SECRET>`. A resposta traz `purged`, `skipped` e `ran_at`. O endpoint não aparece no Swagger e responde 503 enquanto `JOB_SECRET` não estiver configurado. Também é possível rodar pela linha de comando, com o mesmo `DATABASE_URL` e o mesmo volume da API:

```sh
.venv/bin/python -m src.api.services.retention_service
```

Os recursos de navegadores em execução são locais ao processo; o processo da API gerencia seu ciclo de vida. Use um único worker responsável pelas importações ou adicione roteamento entre workers antes de escalar o processamento de importações em memória.

## Exclusão e reativação de conta

O estado da conta fica em `usuarios.status`: `ACTIVE` ou `PENDING_DELETION`. `usuarios.deletion_requested_at` marca o início da carência. O prazo final é `deletion_requested_at + ACCOUNT_DELETION_GRACE_DAYS` (padrão de 7 dias) e não é armazenado: é sempre calculado, o que evita duas fontes de verdade. A tabela `pending_account_deletions` guarda apenas o hash do token do link de cancelamento e a origem do pedido.

**Solicitação.** O titular solicita a exclusão em `DELETE /auth/me` (senha atual e confirmação EXCLUIR na interface). O SUPER_ADMIN pode agendar a exclusão de outra conta em `DELETE /admin/usuarios/{id}`. A solicitação muda o status para PENDING_DELETION, revoga sessões, tokens de recuperação e desafios e bloqueia o acesso protegido e novas importações. O SMTP deve aceitar o aviso antes da confirmação da transação; uma falha no envio mantém a conta inalterada. Contas pendentes não podem usar a recuperação de senha. O único SUPER_ADMIN ativo não pode ter a exclusão agendada, e administradores com exclusão agendada não contam para a proteção do último administrador ativo.

**Reativação.** Até o prazo final, a conta volta para ACTIVE por um destes caminhos:

- **Titular, pelo login:** com a senha correta, `POST /auth/login` responde 409 `ACCOUNT_PENDING_DELETION` com `can_reactivate`, e a tela de login oferece a reativação, que chama `POST /auth/account/reactivate` com e-mail e senha. O endpoint não exige token, pois as sessões foram revogadas; ele tem limite por IP (`ACCOUNT_REACTIVATION_RATE_LIMIT_PER_MIN`, padrão 5/min), responde 401 genérico para credenciais inválidas e devolve uma nova sessão.
- **Titular, pelo link do e-mail:** o segredo de cancelamento vai em um fragmento da URL (não na URL enviada por HTTP) e só o hash é armazenado. Abrir a página não reativa a conta: o usuário precisa confirmar, o que consome o token sem emitir sessão.
- **SUPER_ADMIN:** `POST /admin/usuarios/{id}/reactivate`, pelo botão "Reativar" em Perfis de Acesso.

Toda reativação incrementa a versão das credenciais (as sessões anteriores continuam inválidas) e remove o registro pendente. Reativar no prazo final ou depois dele é rejeitado (`DELETION_DEADLINE_PASSED`).

**Exclusão definitiva.** O job diário seleciona as contas com `status = 'PENDING_DELETION' AND deletion_requested_at <= agora - carência` (coluna `status` indexada) e as exclui uma a uma, sob os mesmos bloqueios usados pela reativação, para evitar condições de corrida. Importações em WAITING_CAPTCHA/PROCESSING adiam a exclusão para a próxima execução. Até a finalização, os dados permanecem identificáveis e a tabela administrativa de usuários mostra PENDING_DELETION e o prazo final; não há anonimização durante a carência. Na finalização, são removidos o usuário, suas notas fiscais e itens, importações, tokens de recuperação, registros de verificação do e-mail e desafios de alteração. Produtos e estabelecimentos compartilhados permanecem.

**Eventos de exclusão.** A página de gestão de usuários mostra eventos mínimos de exclusão, sem registros identificáveis das contas excluídas. Os eventos são inseridos na mesma transação da exclusão, nunca são reconstruídos retroativamente e expiram após `ACCOUNT_DELETION_AUDIT_DAYS` (padrão de 90 dias). Trata-se de uma proposta de política operacional, não de uma exigência legal de retenção: revise a finalidade e a duração antes da publicação e mantenha `/privacidade` consistente com a configuração. Os metadados de dia, origem e protocolo ainda podem ser correlacionados com logs externos, então a ausência de identificadores diretos não garante anonimização irreversível. Se um banco de desenvolvimento contiver tabelas do protótipo anterior de caixa de entrada, a exclusão também remove os casos e as mensagens legados da conta.

**Migração.** Na inicialização, `_ensure_schema_updates()` cria `status` (padrão ACTIVE, com índice) e `deletion_requested_at` e converte exclusões agendadas no modelo anterior, usando o `requested_at` de `pending_account_deletions`. A coluna legada `usuarios.deletion_scheduled_at` deixa de ser usada e é mantida apenas para permitir rollback; remova-a depois que a versão estiver estável.

## Expiração de backups e procedimento de restauração

Antes da publicação, preencha o fornecedor, os responsáveis pela criptografia e pelo acesso, a frequência, o prazo de expiração e quem verifica a expiração. A exclusão no ambiente ativo não modifica snapshots de backup já criados. Restrinja o acesso aos snapshots até a expiração automática e garanta que bancos exportados e cópias de logs sigam o mesmo cronograma aprovado.

Restaure em um ambiente isolado, com o envio de e-mails e os workers de importação desabilitados. Concilie todas as exclusões de contas, exclusões agendadas, cancelamentos e revogações de credenciais desde o snapshot, usando o processo de conciliação de exclusão e restauração do operador, com acesso restrito e prazo de retenção definido. Nunca restaure dados excluídos no serviço público sem reaplicar essas ações. Execute as atualizações de esquema e a limpeza, verifique se os usuários excluídos continuam ausentes e se os tokens antigos são rejeitados e, então, aprove a reconexão. Este repositório não fornece um serviço de backup nem um registro externo de exclusões: o responsável deve fornecer esse mecanismo operacional e seu prazo de retenção antes da implantação. Documente a evidência da verificação de restauração sem reter informações pessoais desnecessárias.

## Validação

Execute `python -m unittest discover -s tests -v`, `npm run build --prefix frontend` e `npm run lint --prefix frontend`. O lint geral do repositório atualmente apresenta erros preexistentes em AuthContext (exportações de hooks e componentes no mesmo arquivo), ImportPage (estado em um efeito), MapPage e shared/api/errors (uso explícito de any). O lint direcionado ao novo código de perfil, serviços e roteamento não apresenta erros. A suíte de contas cobre substituição de credenciais, sessões antigas, expiração, reutilização, tentativas, titularidade e isolamento de operações dos desafios, limites de requisições e falhas de envio; confirmações simultâneas; exclusão em cascata dos dados da conta e exclusões de campos na exportação; limites de prazo e idempotência da limpeza; carência de sete dias, reativação pelo titular (login e link) e pelo administrador, rejeição após o prazo, purge por status, agendamento do job (cron, fuso, flag e falhas), autenticação do disparo manual, migração do modelo anterior, cancelamento e reutilização de tokens, bloqueio de acesso a contas pendentes, reversão da transação em caso de falha de SMTP e finalização.

Antes da publicação, use um serviço SMTP de teste e duas sessões separadas de navegador: altere o e-mail e a senha, verifique se a sessão antiga é rejeitada, teste a recuperação, baixe o JSON, agende a exclusão e reative pelo login, agende de novo e cancele pelo link do e-mail, agende pelo painel de administração e reative por lá. Depois, agende novamente e valide a finalização pelo disparo manual do job no prazo final em um banco de testes isolado; nunca altere datas e horários de produção para simular a expiração. Confirme que uma falha de SMTP exibe um erro em vez de informar que o PIN foi enviado. Teste separadamente o ciclo de vida do CAPTCHA com a SEFAZ e repita os testes de concorrência no PostgreSQL. A implementação não configura automaticamente o SMTP, o `JOB_SECRET` do disparo manual ou os backups de produção.
