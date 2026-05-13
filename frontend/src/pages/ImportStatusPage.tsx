import { useParams, Link } from 'react-router-dom';
import { useImportStatusPolling } from '../features/imports/hooks/useImportQueries';

export function ImportStatusPage() {
  const { importId } = useParams<{ importId: string }>();
  const { data, isLoading, isError, error } = useImportStatusPolling(importId || '');

  if (!importId) {
    return <div>ID da importação não fornecido.</div>;
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Carregando status...</h2>
        <p>Conectando com o servidor.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
        <h2 style={{ color: '#991b1b' }}>Erro ao buscar status</h2>
        <p style={{ color: '#b91c1c' }}>{error.message}</p>
        <Link to="/importar" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.75rem 1.5rem', backgroundColor: '#991b1b', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          Tentar Nova Importação
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1>Status da Importação</h1>
      
      <div style={{ padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '1.5rem', textAlign: 'center' }}>
        
        {data.status === 'PROCESSING' && (
          <div>
            <div style={{ display: 'inline-block', width: '50px', height: '50px', border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
            <h2 style={{ color: '#2563eb' }}>Processando sua nota...</h2>
            <p style={{ color: '#64748b' }}>A SEFAZ está sendo consultada. Isso pode levar alguns segundos, por favor aguarde.</p>
          </div>
        )}

        {data.status === 'COMPLETED' && (
          <div>
            <div style={{ fontSize: '4rem', color: '#16a34a', marginBottom: '1rem' }}>✓</div>
            <h2 style={{ color: '#16a34a' }}>Importação Concluída!</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              Foram importados <strong>{data.items_count} itens</strong> com sucesso.
            </p>
            <Link to={`/notas/${data.nota_id}`} style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#16a34a', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              Ver Detalhes da Nota
            </Link>
          </div>
        )}

        {data.status === 'FAILED' && (
          <div>
            <div style={{ fontSize: '4rem', color: '#dc2626', marginBottom: '1rem' }}>✕</div>
            <h2 style={{ color: '#dc2626' }}>Falha na Importação</h2>
            <p style={{ color: '#64748b', marginBottom: '1rem' }}>
              Não foi possível concluir a importação da sua nota.
            </p>
            {data.error_message && (
              <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <strong>Motivo: </strong> {data.error_message}
              </div>
            )}
            <Link to="/importar" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              Tentar Nova Importação
            </Link>
          </div>
        )}

        {data.status === 'EXPIRED' && (
          <div>
            <div style={{ fontSize: '4rem', color: '#ea580c', marginBottom: '1rem' }}>⏱</div>
            <h2 style={{ color: '#ea580c' }}>Tempo Esgotado</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              O tempo limite para resolução do captcha expirou ou muitas tentativas foram feitas.
            </p>
            <Link to="/importar" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              Iniciar Nova Importação
            </Link>
          </div>
        )}
        
        {data.status === 'WAITING_CAPTCHA' && (
          <div>
            <div style={{ fontSize: '4rem', color: '#eab308', marginBottom: '1rem' }}>🛡️</div>
            <h2 style={{ color: '#eab308' }}>Aguardando Captcha</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              Esta importação ainda está aguardando a resolução do captcha de segurança.
            </p>
            <Link to="/importar" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
              Voltar
            </Link>
          </div>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#94a3b8' }}>
          ID: {data.import_id} <br/>
          Iniciada em: {new Date(data.created_at).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}
