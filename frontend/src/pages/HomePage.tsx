import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../shared/api/client';
import { AppError } from '../shared/api/errors';

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
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Minhas Compras BA - Frontend v1</h1>
      <p>Sistema de importação de notas fiscais</p>

      <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <Link to="/importar" style={{ 
          display: 'inline-block', 
          backgroundColor: '#2563eb', 
          color: 'white', 
          padding: '0.75rem 1.5rem', 
          textDecoration: 'none', 
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          Nova Importação
        </Link>
      </div>

      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>API Status (Fase 1 Test)</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <strong>/health: </strong>
          {loadingHealth && <span>Carregando...</span>}
          {healthError && <span style={{ color: 'red' }}>Erro: {(healthError as AppError).message}</span>}
          {health && <span style={{ color: 'green' }}>OK ({JSON.stringify(health)})</span>}
        </div>

        <div>
          <strong>/ready: </strong>
          {loadingReady && <span>Carregando...</span>}
          {readyError && <span style={{ color: 'red' }}>Erro: {(readyError as AppError).message}</span>}
          {ready && <span style={{ color: 'green' }}>OK ({JSON.stringify(ready)})</span>}
        </div>
      </div>
    </div>
  );
}
