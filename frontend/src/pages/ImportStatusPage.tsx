import { useParams, Link } from 'react-router-dom';
import { useImportStatusPolling } from '../features/imports/hooks/useImportQueries';
import { useAuth } from '../features/auth/AuthContext';

export function ImportStatusPage() {
  const { importId } = useParams<{ importId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useImportStatusPolling(importId || '', user?.id ?? null);

  if (!importId) {
    return <div className="container text-center">ID da importação não fornecido.</div>;
  }

  if (isLoading) {
    return (
      <div className="container text-center mt-16">
        <div className="spinner spinner-large mb-6"></div>
        <h2>Carregando status...</h2>
        <p>Conectando com o servidor.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container container-small mt-16">
        <div className="card text-center border-error">
          <h2 className="text-error">Erro ao buscar status</h2>
          <p>{error.message}</p>
          <Link to="/importar" className="btn btn-primary mt-6">
            Tentar Nova Importação
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container container-small">
      <h1 className="text-center mb-8">Status da Importação</h1>
      
      <div className="card text-center py-12 px-8">
        
        {data.status === 'PROCESSING' && (
          <div>
            <div className="spinner spinner-xl mb-6"></div>
            <h2 className="text-success">Processando sua nota...</h2>
            <p>A SEFAZ está sendo consultada. Isso pode levar alguns segundos, por favor aguarde.</p>
          </div>
        )}

        {data.status === 'COMPLETED' && (
          <div>
            <div className="status-icon text-success">✓</div>
            <h2 className="text-success">Importação Concluída!</h2>
            <p className="mb-8">
              Foram importados <strong style={{ color: 'var(--text-primary)' }}>{data.items_count} itens</strong> com sucesso.
            </p>
            <Link to={`/notas/${data.nota_id}`} className="btn btn-primary py-3 px-8">
              Ver Detalhes da Nota
            </Link>
          </div>
        )}

        {data.status === 'FAILED' && (
          <div>
            <div className="status-icon text-error">✕</div>
            <h2 className="text-error">Falha na Importação</h2>
            <p className="mb-6">Não foi possível concluir a importação da sua nota.</p>
            {data.error_message && (
              <div className="alert alert-error text-left mb-8">
                <strong>Motivo: </strong> {data.error_message}
              </div>
            )}
            <Link to="/importar" className="btn btn-primary btn-full">
              Tentar Nova Importação
            </Link>
          </div>
        )}

        {data.status === 'EXPIRED' && (
          <div>
            <div className="status-icon text-warning">⏱</div>
            <h2 className="text-warning">Tempo Esgotado</h2>
            <p className="mb-8">O tempo limite para resolução do captcha expirou ou muitas tentativas foram feitas.</p>
            <Link to="/importar" className="btn btn-primary btn-full">
              Iniciar Nova Importação
            </Link>
          </div>
        )}
        
        {data.status === 'WAITING_CAPTCHA' && (
          <div>
            <div className="status-icon text-warning">🛡️</div>
            <h2 className="text-warning">Aguardando Captcha</h2>
            <p className="mb-8">Esta importação ainda está aguardando a resolução do captcha de segurança.</p>
            <Link to="/importar" className="btn btn-primary btn-full">
              Voltar para Importação
            </Link>
          </div>
        )}

        <div className="status-footer">
          <div className="mono-font mb-1">ID: {data.import_id}</div>
          <div>Iniciada em: {new Date(data.created_at).toLocaleString('pt-BR')}</div>
        </div>
      </div>
    </div>
  );
}
