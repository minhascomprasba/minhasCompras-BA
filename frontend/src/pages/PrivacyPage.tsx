import { Link } from 'react-router-dom';
export function PrivacyPage() {
  return <main className="mx-auto max-w-3xl p-6 space-y-5">
    <h1 className="text-2xl font-semibold">Privacidade e seus dados</h1>
    <p role="status">Aviso preliminar. Antes da publicação do serviço, o operador deve informar sua identidade, contato de privacidade, bases legais, fornecedores de hospedagem e prazo dos backups. Esses dados ainda estão pendentes.</p>
    <h2 className="text-xl">Dados e finalidades</h2>
    <p>O serviço armazena e-mail, senha protegida por hash, perfil de acesso, datas da conta e dados das notas fiscais que você importa, incluindo chaves de acesso, itens, preços, estabelecimentos e histórico de importações. Esses dados permitem autenticar sua conta, organizar compras e apresentar análises. Códigos temporários confirmam o cadastro e alterações de credenciais.</p>
    <h2 className="text-xl">Destinatários e acesso</h2>
    <p>Importações consultam o portal da SEFAZ. O envio de códigos e notificações usa o provedor de e-mail configurado. A infraestrutura de hospedagem e banco de dados processa os registros. A equipe autorizada administra o serviço; as permissões dependem do perfil de acesso. O enriquecimento de endereços de estabelecimentos também consulta provedores de geocodificação. A identificação desses fornecedores deve ser completada pelo operador.</p>
    <h2 className="text-xl">Controles da conta</h2>
    <p>No perfil você pode alterar e-mail e senha, exportar seus dados em JSON e solicitar a exclusão da conta mediante confirmação de senha. A conta fica bloqueada por 7 dias, com dados preservados e um link por e-mail para cancelar. Sem envio do aviso, o agendamento não é concluído. Cancelar exige confirmar a ação no link, sem login automático. Alterações de credenciais encerram outras sessões.</p>
    <h2 className="text-xl">Exclusão e retenção</h2>
    <p>Após os 7 dias, a limpeza definitiva remove a conta, notas, itens associados, importações e tokens. Até então, a conta e seus dados continuam armazenados para permitir o cancelamento. Importações aguardando CAPTCHA ou em processamento precisam terminar ou expirar antes da exclusão. Produtos e estabelecimentos do catálogo compartilhado são preservados. Um registro operacional da exclusão guarda apenas um protocolo aleatório, o dia e a origem da ação (titular ou administrador), sem e-mail nem vínculo com a conta. O prazo padrão é de 90 dias, sujeito à revisão do operador; alterações desse prazo exigem atualizar este aviso.</p>
    <p>Por padrão, desafios de autenticação usados ou expirados são removidos após 24 horas. Imagens CAPTCHA são removidas ao terminar ou expirar a importação. Esses prazos dependem de revisão do operador antes da ativação em produção. Exportações são geradas em memória. Backups podem conter dados anteriores até seu vencimento: o prazo e o procedimento de restauração ainda precisam ser definidos pelo operador.</p>
    <p>Estes são controles de privacidade implementados. Não constituem declaração de conformidade integral com a LGPD.</p>
    <p><a className="underline" href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares">Orientações da ANPD sobre direitos dos titulares</a></p>
    <Link className="underline" to="/perfil">Acessar meu perfil</Link> · <Link className="underline" to="/">Página inicial</Link>
  </main>;
}
