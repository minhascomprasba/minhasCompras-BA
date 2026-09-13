import { Link } from 'react-router-dom';
import type { AdminLog, LogStatus } from '../types';

interface AdminLogsTableProps {
  logs: AdminLog[];
}

const statusConfig: Record<LogStatus, { badgeClass: string; label: string }> = {
  scraper_falha: { badgeClass: 'badge-error', label: 'Falha Scraper' },
  camera_erro: { badgeClass: 'badge-warning', label: 'Erro Câmera' },
  bloqueio_ip: { badgeClass: 'badge-error', label: 'Bloqueio IP' },
};

export function AdminLogsTable({ logs }: AdminLogsTableProps) {
  return (
    <div className="card admin-logs-card">
      <div className="admin-logs-header">
        <div>
          <h3 className="admin-logs-title">Logs de Monitoramento</h3>
          <p className="admin-logs-subtitle">Últimas falhas e expirações de importação</p>
        </div>
        <Link to="/notas" className="admin-logs-link">
          Ver todos
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>ID da Nota</th>
              <th>Tentativas</th>
              <th>Erro Reportado</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const status = statusConfig[log.status];
              return (
                <tr key={log.idNota}>
                  <td className="admin-mono">{log.dataHora}</td>
                  <td className="admin-mono">{log.idNota}</td>
                  <td>{log.tentativas}</td>
                  <td>{log.erro}</td>
                  <td>
                    <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}