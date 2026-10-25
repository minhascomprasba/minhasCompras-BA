# Controles de conta e privacidade

Implementação na branch `feature/user-profile-lgpd`; este documento não constitui uma declaração de conformidade integral com a LGPD.

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
| Usuários | E-mail, hash da senha, perfil, versão das credenciais, data de criação; acesso à conta | Até a exclusão definitiva após o prazo de cancelamento de sete dias |
| Notas fiscais/itens | Chave da nota, datas, forma de pagamento, preços, quantidades, referências ao catálogo; histórico e análise de compras | Até a exclusão definitiva após o prazo de cancelamento de sete dias |
| Produtos/estabelecimentos | Descrições compartilhadas, identificadores comerciais, endereços, coordenadas | Catálogo compartilhado; preservado na exclusão da conta |
| Importações | Chave da nota, status/origem, tentativas/datas, referência à nota, caminho temporário do CAPTCHA | Metadados até a exclusão da conta; imagem removida na conclusão ou expiração |
| Desafios de cadastro/recuperação/alteração | Hash do PIN/token, hash da senha quando aplicável, operação, versão, expiração, tentativas | Mantidos por 24 horas após o uso ou a expiração e, depois, removidos pela limpeza horária |
| Limites de requisições | Hashes das chaves dos agrupamentos por usuário/IP e contadores | Removidos após 24 horas |
| Eventos de exclusão | Protocolo aleatório, dia em UTC e origem (autoatendimento/administração); sem vínculo com conta, autor ou e-mail | `ACCOUNT_DELETION_AUDIT_DAYS`, padrão de 90 dias, sujeito à revisão do responsável |
| Exclusão pendente | Vínculo com a conta, hash do token de cancelamento, datas de solicitação e prazo, origem | Sete dias, seguidos da finalização; removida imediatamente em caso de cancelamento |
| Exportações | JSON versionado com campos explicitamente permitidos, gerado em memória | Sem arquivo de exportação persistente; `Cache-Control: no-store` |
| Backups | Cópias específicas de cada implantação | Definido pelo responsável antes da publicação |

Os fornecedores de SMTP e da SEFAZ tratam os dados necessários ao envio de mensagens e à importação de notas fiscais. A integração de geocodificação também consulta fornecedores públicos de endereços para obter as coordenadas dos estabelecimentos; inventarie os fornecedores efetivamente configurados antes da publicação. Os logs da aplicação não devem capturar corpos de requisição, cabeçalhos Authorization, parâmetros de consulta com tokens de recuperação, URLs de notas fiscais, PINs ou conteúdo de mensagens SMTP. Configure o proxy reverso e o monitoramento de acesso e erros com ocultação equivalente desses dados. Logs históricos e o antigo arquivo `data/debug/last_nfce_page.html` já podem conter dados pessoais: inventarie e remova esses dados conforme um procedimento aprovado pelo responsável antes da publicação. Esta alteração interrompe a geração de novas cópias de páginas de notas fiscais para depuração.

## Credenciais e revogação

A declaração `cv` do JWT deve corresponder à `credential_version` do usuário atual, verificada pela dependência compartilhada de autenticação. Declarações ausentes são consideradas zero, preservando sessões antigas até sua expiração ou a próxima alteração de credenciais. Alterações bem-sucedidas de e-mail/senha e a recuperação de senha incrementam a versão e invalidam tokens de recuperação e desafios de conta ainda pendentes. As alterações de perfil retornam um `TokenResponse` substituto; o navegador substitui o token e o usuário armazenados por meio do AuthContext. As demais sessões recebem 401. Uma senha de confirmação incorreta gera um erro de campo 422, portanto não aciona a saída global da conta.

Cada desafio de alteração fica vinculado ao usuário, à operação, à versão das credenciais e ao novo e-mail ou hash da nova senha. Os PINs usam HMAC com chave e incorporam o ID do desafio. A expiração ocorre em 15 minutos; cinco tentativas esgotam um desafio; uma nova solicitação invalida o desafio anterior da mesma operação. Contadores no banco de dados impõem o limite de três solicitações por usuário e por IP da conexão direta por minuto. Quando for necessário obter os IPs dos clientes remotos, execute a aplicação atrás de um proxy confiável e corretamente configurado; a aplicação intencionalmente não confia em cabeçalhos `X-Forwarded-For` arbitrários.

Bloqueios de escrita no SQLite e atualizações de linhas no PostgreSQL serializam a confirmação de credenciais, a exclusão de contas, a criação de importações e a persistência de notas fiscais. A proteção do último SUPER_ADMIN compartilha o bloqueio administrativo com as alterações de perfil. Importações em WAITING_CAPTCHA/PROCESSING impedem a exclusão, mesmo que o prazo de processamento tenha passado. Uma tarefa PROCESSING que tenha falhado deve ser investigada e explicitamente marcada como FAILED pelo operador somente após confirmar que seu worker parou; expirar automaticamente um worker em execução poderia permitir que ele persistisse dados após a exclusão. Nenhum worker deve ser abandonado sem essa conciliação operacional.

As adições ao esquema usam o `create_all` existente e atualizações ALTER na inicialização. Os registros existentes são preservados; as versões de credenciais são preenchidas com zero. Um índice único em `lower(email)` impede duplicatas que diferem apenas entre maiúsculas e minúsculas, inclusive em cadastros ou alterações simultâneos. Se houver duplicatas históricas desse tipo, a inicialização falha de forma segura ao criar o índice: resolva a titularidade dessas contas antes da migração; a migração nunca descarta nem mescla contas automaticamente. Faça um backup antes de aplicar atualizações de esquema. Há suporte às sintaxes de SQLite e PostgreSQL; o SQLite é coberto pela suíte automatizada. Antes da publicação, valide em homologação com a versão de PostgreSQL usada na implantação.

## Limpeza agendada

Execute a partir do diretório de trabalho do repositório, com o mesmo DATABASE_URL, ambiente e volume de armazenamento da API:

```sh
.venv/bin/python -m src.api.services.retention_service
```

O comando é idempotente. Instale os exemplos de serviço e temporizador do systemd em `docs/operations/` após substituir os caminhos e escolher um usuário de serviço adequado. Como alternativa, agende a execução a cada hora, direcionando stdout/stderr para logs operacionais com acesso restrito:

```cron
0 * * * * cd /srv/minhas-compras && /srv/minhas-compras/.venv/bin/python -m src.api.services.retention_service
```

Não copie credenciais de desenvolvimento para o agendador. Monitore falhas do comando e o uso de disco; garanta que o agendador tenha acesso ao volume de CAPTCHA de cada instância da API. A limpeza na inicialização é uma alternativa de contingência; o agendamento horário continua obrigatório mesmo quando a API não recebe requisições. Imagens de importações encerradas ou expiradas e sessões locais do navegador são liberadas; arquivos de CAPTCHA sem referência com mais de 24 horas são removidos. Os recursos de navegadores em execução são locais ao processo; o processo da API gerencia seu ciclo de vida. Use um único worker responsável pelas importações ou adicione roteamento entre workers antes de escalar o processamento de importações existente em memória.

## Exclusão de conta

A exclusão exige a senha atual e a confirmação EXCLUIR na interface. Primeiro, agenda um prazo de exatamente sete dias, revoga sessões, tokens de recuperação e desafios e bloqueia o acesso protegido e novas importações. O SMTP deve aceitar o aviso de cancelamento antes da confirmação da transação; uma falha no envio mantém a conta inalterada. Contas com exclusão pendente não podem entrar nem usar a recuperação de senha até o cancelamento. O e-mail contém um segredo aleatório de cancelamento em um fragmento da URL (não na URL enviada por HTTP); somente seu hash é armazenado. Abrir a página de cancelamento não restaura a conta automaticamente: o usuário deve enviar a confirmação, que consome o token, restaura o acesso sem emitir uma sessão de login e revoga novamente as credenciais anteriores. Uma tentativa de cancelamento no prazo final ou após ele é rejeitada. Nenhuma ação do responsável ou administrador ignora o período de carência. O único SUPER_ADMIN ativo não pode agendar a exclusão; administradores com exclusão agendada não satisfazem a proteção do último administrador ativo.

A limpeza horária finaliza as contas cujo prazo venceu (a limpeza na inicialização é uma alternativa de contingência); execuções não realizadas atrasam a exclusão, nunca a antecipam. A finalização e o cancelamento usam os mesmos bloqueios de banco de dados para evitar condições de corrida. Até a finalização, os dados da conta permanecem identificáveis e a tabela administrativa de usuários mostra explicitamente PENDING_DELETION e o prazo final. Não há anonimização imediata durante o período de espera. Na finalização, são removidos o usuário, suas notas fiscais e itens, importações, tokens de recuperação, registros de verificação do e-mail da conta e desafios de alteração da conta. Produtos e estabelecimentos compartilhados permanecem. O único SUPER_ADMIN não pode excluir a própria conta. Uma caixa de entrada para solicitações de privacidade não faz parte deste escopo. A página de gestão de usuários do superadministrador mostra eventos mínimos de exclusão, sem registros identificáveis das contas excluídas. Os eventos são inseridos na mesma transação da exclusão da conta, nunca são reconstruídos retroativamente e expiram após `ACCOUNT_DELETION_AUDIT_DAYS` (padrão de 90 dias). Trata-se de uma proposta de política operacional, não de uma exigência legal de retenção. Revise a finalidade e a duração antes da publicação e mantenha `/privacidade` consistente com a configuração. Os metadados de dia, origem e protocolo ainda podem ser correlacionados com logs externos; a ausência de identificadores diretos não garante anonimização irreversível. A revogação de credenciais ou sessões não equivale à suspensão da conta, e a interface não identifica contas ativas como revogadas. Se um banco de desenvolvimento contiver tabelas do protótipo anterior de caixa de entrada, a exclusão também remove os casos e as mensagens legados dessa conta, sem criar essas tabelas em bancos novos.

## Expiração de backups e procedimento de restauração

Antes da publicação, preencha o fornecedor, os responsáveis pela criptografia e pelo acesso, a frequência, o prazo de expiração e quem verifica a expiração. A exclusão no ambiente ativo não modifica snapshots de backup já criados. Restrinja o acesso aos snapshots até a expiração automática e garanta que bancos exportados e cópias de logs sigam o mesmo cronograma aprovado.

Restaure em um ambiente isolado, com o envio de e-mails e os workers de importação desabilitados. Concilie todas as exclusões de contas, exclusões agendadas, cancelamentos e revogações de credenciais desde o snapshot, usando o processo de conciliação de exclusão e restauração do operador, com acesso restrito e prazo de retenção definido. Nunca restaure dados excluídos no serviço público sem reaplicar essas ações. Execute as atualizações de esquema e a limpeza, verifique se os usuários excluídos continuam ausentes e se os tokens antigos são rejeitados e, então, aprove a reconexão. Este repositório não fornece um serviço de backup nem um registro externo de exclusões: o responsável deve fornecer esse mecanismo operacional e seu prazo de retenção antes da implantação. Documente a evidência da verificação de restauração sem reter informações pessoais desnecessárias.

## Validação

Execute `python -m unittest discover -s tests -v`, `npm run build --prefix frontend` e `npm run lint --prefix frontend`. O lint geral do repositório atualmente apresenta erros preexistentes em AuthContext (exportações de hooks e componentes no mesmo arquivo), ImportPage (estado em um efeito), MapPage e shared/api/errors (uso explícito de any). O lint direcionado ao novo código de perfil, serviços e roteamento não apresenta erros. A suíte de contas cobre substituição de credenciais, sessões antigas, expiração, reutilização, tentativas, titularidade e isolamento de operações dos desafios, limites de requisições e falhas de envio; confirmações simultâneas; exclusão em cascata dos dados da conta e exclusões de campos na exportação; limites de prazo e idempotência da limpeza; carência de sete dias, cancelamento e reutilização de tokens, bloqueio de acesso a contas pendentes, reversão da transação em caso de falha de SMTP e finalização.

Antes da publicação, use um serviço SMTP de teste e duas sessões separadas de navegador: altere o e-mail e a senha, verifique se a sessão antiga é rejeitada, teste a recuperação, baixe o JSON, agende a exclusão e cancele pelo link do e-mail. Depois, agende novamente e valide a finalização no prazo final em um banco de testes isolado; nunca altere datas e horários de produção para simular a expiração. Confirme que uma falha de SMTP exibe um erro em vez de informar que o PIN foi enviado. Teste separadamente o ciclo de vida do CAPTCHA com a SEFAZ e repita os testes de concorrência no PostgreSQL. A implementação não configura automaticamente o agendamento, o SMTP ou os backups de produção.
