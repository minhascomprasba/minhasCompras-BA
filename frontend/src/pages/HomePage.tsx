import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../shared/api/client';
// import { AppError } from '../shared/api/errors';

export function HomePage() {
  const { data: health, error: healthError, isLoading: loadingHealth } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get('/health');
      return response.data;
    },
  });

  const { data: ready, error: readyError, isLoading: loadingReady } = useQuery({
    queryKey: ['ready'],
    queryFn: async () => {
      const response = await apiClient.get('/ready');
      return response.data;
    },
  });

  return (
    <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
      <h1 style={{ fontSize: '3rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
        Minhas Compras BA
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '3rem' }}>
        Gestão inteligente e automatizada de Notas Fiscais Eletrônicas
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '4rem' }}>
        <Link to="/importar" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Nova Importação
        </Link>
        <Link to="/notas" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Histórico de Notas
        </Link>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Status do Sistema</h2>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1rem' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>API Core (Health):</strong>
          {loadingHealth && <span className="spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }}></span>}
          {healthError && <span className="badge badge-error">Offline</span>}
          {health && <span className="badge badge-success">Online</span>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Database (Ready):</strong>
          {loadingReady && <span className="spinner" style={{ width: '1.2rem', height: '1.2rem', borderWidth: '2px' }}></span>}
          {readyError && <span className="badge badge-error">Offline</span>}
          {ready && <span className="badge badge-success">Conectado</span>}
        </div>
      </div>
    </div>
  );
}
