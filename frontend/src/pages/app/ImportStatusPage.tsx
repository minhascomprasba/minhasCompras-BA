import { CheckIcon as Check, XIcon as X, TimerIcon as Timer, ShieldIcon as Shield } from '@phosphor-icons/react';
import './ImportStatusPage.css';
import { buttonVariants } from '../../components/ui/button';
import { useParams, Link } from 'react-router-dom';
import { useImportStatusPolling } from '../../features/imports/hooks/useImportQueries';
import { useAuth } from '../../features/auth/AuthContext';

export function ImportStatusPage() {
  const { importId } = useParams<{ importId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useImportStatusPolling(importId || '', user?.id ?? null);

  if (!importId) {
    return <div className="page-layout page-state text-center">ID da importação não fornecido.</div>;
  }

  if (isLoading && !data) {
    return (
      <div className="page-layout page-state flex-col text-center" role="status">
        <div className="spinner spinner-large" aria-hidden="true" />
        <h2 className="mb-0 mt-4">Carregando status...</h2>
      </div>
    );
  }

  const isHardApiError =
    isError &&
    !!error &&
    error.code !== 'NETWORK_ERROR' &&
    error.code !== 'UNKNOWN_ERROR' &&
    !data;

  if (isHardApiError) {
    return (
      <div className="page-layout page-state flex-col text-center gap-4">
        <h2 className="mb-0 text-error">Erro ao buscar status</h2>
        <p className="mb-0 text-muted-foreground">{error.message}</p>
        <Link to="/importar" className={buttonVariants()}>
          Tentar Nova Importação
        </Link>
      </div>
    );
  }

  if (!data || data.status === 'PROCESSING') {
    return (
      <div className="page-layout page-state flex-col text-center" role="status">
        <div className="spinner spinner-xl" aria-hidden="true" />
        <h2 className="mb-0 mt-4 text-success">Processando sua nota...</h2>
      </div>
    );
  }

  return (
    <div className="page-layout page-state flex-col text-center">
      {data.status === 'COMPLETED' && (
        <>
          <div className="status-icon text-success"><Check size="1em" className="mx-auto" aria-hidden="true" /></div>
          <h2 className="mb-2 text-success">Importação Concluída!</h2>
          <p className="mb-6 text-muted-foreground">
            Foram importados <strong className="text-foreground">{data.items_count} itens</strong> com sucesso.
          </p>
          <Link to={`/notas/${data.nota_id}`} className={buttonVariants()}>
            Ver Detalhes da Nota
          </Link>
        </>
      )}

      {data.status === 'FAILED' && (
        <>
          <div className="status-icon text-error"><X size="1em" className="mx-auto" aria-hidden="true" /></div>
          <h2 className="mb-2 text-error">Falha na Importação</h2>
          {data.error_message ? (
            <p className="mb-6 text-muted-foreground">{data.error_message}</p>
          ) : (
            <p className="mb-6 text-muted-foreground">Não foi possível concluir a importação da sua nota.</p>
          )}
          <Link to="/importar" className={buttonVariants()}>
            Tentar Nova Importação
          </Link>
        </>
      )}

      {data.status === 'EXPIRED' && (
        <>
          <div className="status-icon text-warning"><Timer size="1em" className="mx-auto" aria-hidden="true" /></div>
          <h2 className="mb-2 text-warning">Tempo Esgotado</h2>
          <p className="mb-6 text-muted-foreground">O tempo limite para resolução do captcha expirou.</p>
          <Link to="/importar" className={buttonVariants()}>
            Iniciar Nova Importação
          </Link>
        </>
      )}

      {data.status === 'WAITING_CAPTCHA' && (
        <>
          <div className="status-icon text-warning"><Shield size="1em" className="mx-auto" aria-hidden="true" /></div>
          <h2 className="mb-2 text-warning">Aguardando Captcha</h2>
          <p className="mb-6 text-muted-foreground">Esta importação ainda aguarda a resolução do captcha.</p>
          <Link to="/importar" className={buttonVariants()}>
            Voltar para Importação
          </Link>
        </>
      )}
    </div>
  );
}
