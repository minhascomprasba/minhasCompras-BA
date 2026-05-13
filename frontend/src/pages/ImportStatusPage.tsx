import { useParams, Link } from 'react-router-dom';
import { useImportStatusPolling } from '../features/imports/hooks/useImportQueries';

export function ImportStatusPage() {
  const { importId } = useParams<{ importId: string }>();
  const { data, isLoading, isError, error } = useImportStatusPolling(importId || '');

  if (!importId) {
    return <div className="container" style={{ textAlign: 'center' }}>ID da importação não fornecido.</div>;
  }

  if (isLoading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <div className="spinner" style={{ marginBottom: '1.5rem', width: '3rem', height: '3rem' }}></div>
        <h2>Carregando status...</h2>
        <p>Conectando com o servidor.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--error)' }}>
          <h2 style={{ color: 'var(--error)' }}>Erro ao buscar status</h2>
          <p>{error.message}</p>
          <Link to="/importar" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            Tentar Nova Importação
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '2rem' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Status da Importação</h1>
      
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        
        {data.status === 'PROCESSING' && (
          <div>
            <div className="spinner" style={{ width: '4rem', height: '4rem', borderWidth: '4px', marginBottom: '1.5rem' }}></div>
            <h2 style={{ color: 'var(--primary)' }}>Processando sua nota...</h2>
            <p>A SEFAZ está sendo consultada. Isso pode levar alguns segundos, por favor aguarde.</p>
          </div>
        )}

        {data.status === 'COMPLETED' && (
          <div>
            <div style={{ fontSize: '5rem', color: 'var(--success)', marginBottom: '1rem', lineHeight: '1' }}>✓</div>
            <h2 style={{ color: 'var(--success)' }}>Importação Concluída!</h2>
            <p style={{ marginBottom: '2rem' }}>
              Foram importados <strong style={{ color: 'var(--text-primary)' }}>{data.items_count} itens</strong> com sucesso.
            </p>
            <Link to={`/notas/${data.nota_id}`} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
              Ver Detalhes da Nota
            </Link>
          </div>
        )}

        {data.status === 'FAILED' && (
          <div>
            <div style={{ fontSize: '5rem', color: 'var(--error)', marginBottom: '1rem', lineHeight: '1' }}>✕</div>
            <h2 style={{ color: 'var(--error)' }}>Falha na Importação</h2>
            <p style={{ marginBottom: '1.5rem' }}>Não foi possível concluir a importação da sua nota.</p>
            {data.error_message && (
              <div className="alert alert-error" style={{ textAlign: 'left', marginBottom: '2rem' }}>
                <strong>Motivo: </strong> {data.error_message}
              </div>
            )}
            <Link to="/importar" className="btn btn-primary">
              Tentar Nova Importação
            </Link>
          </div>
        )}

        {data.status === 'EXPIRED' && (
          <div>
            <div style={{ fontSize: '5rem', color: 'var(--warning)', marginBottom: '1rem', lineHeight: '1' }}>⏱</div>
            <h2 style={{ color: 'var(--warning)' }}>Tempo Esgotado</h2>
            <p style={{ marginBottom: '2rem' }}>O tempo limite para resolução do captcha expirou ou muitas tentativas foram feitas.</p>
            <Link to="/importar" className="btn btn-primary">
              Iniciar Nova Importação
            </Link>
          </div>
        )}
        
        {data.status === 'WAITING_CAPTCHA' && (
          <div>
            <div style={{ fontSize: '5rem', color: 'var(--warning)', marginBottom: '1rem', lineHeight: '1' }}>🛡️</div>
            <h2 style={{ color: 'var(--warning)' }}>Aguardando Captcha</h2>
            <p style={{ marginBottom: '2rem' }}>Esta importação ainda está aguardando a resolução do captcha de segurança.</p>
            <Link to="/importar" className="btn btn-primary">
              Voltar para Importação
            </Link>
          </div>
        )}

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ fontFamily: 'var(--mono)', marginBottom: '0.25rem' }}>ID: {data.import_id}</div>
          <div>Iniciada em: {new Date(data.created_at).toLocaleString('pt-BR')}</div>
        </div>
      </div>
    </div>
  );
}
