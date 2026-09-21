import { Link } from 'react-router-dom';
import type { AdminLog, LogStatus } from '../types';
import { InfoTooltip } from './InfoTooltip';

const TOOLTIP =
  'Histórico das ocorrências de erro ou tempo limite durante as consultas de notas na SEFAZ.';

interface AdminLogsTableProps {
  logs: AdminLog[];
}

const statusConfig: Record<LogStatus, { badgeClass: string; label: string }> = {
  scraper_falha: { badgeClass: 'badge-error', label: 'Falha na Consulta' },
  captcha_expirado: { badgeClass: 'badge-warning', label: 'Tempo Esgotado' },
  limite_captcha: { badgeClass: 'badge-error', label: 'Tentativas Excedidas' },
  timeout_sefaz: { badgeClass: 'badge-error', label: 'Sem Resposta SEFAZ' },
};

const fallbackStatus = { badgeClass: 'badge-outline', label: 'Indefinido' };

export function AdminLogsTable({ logs }: AdminLogsTableProps) {
  return (
    <div className="card admin-logs-card">
      <div className="admin-logs-header">
        <div className="admin-logs-title-block">
          <div className="admin-logs-title-row">
            <h3 className="admin-logs-title">Registro de Ocorrências</h3>
            <InfoTooltip content={TOOLTIP} />
          </div>
          <p className="admin-logs-subtitle">Últimas tentativas de importação que não puderam ser concluídas</p>
        </div>
        <Link to="/notas" className="admin-logs-link">
          Ver todas as notas
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
              <th>Nota Fiscal</th>
              <th>Tentativas</th>
              <th>Motivo / Ocorrência</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Nenhuma ocorrência registrada no período. Todas as importações foram concluídas com sucesso.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const status = statusConfig[log.status] ?? fallbackStatus;
                return (
                  <tr key={log.importId}>
                    <td className="admin-mono">{log.dataHora}</td>
                    <td className="admin-mono">{log.idNota}</td>
                    <td>{log.tentativas}</td>
                    <td>{log.erro}</td>
                    <td>
                      <span className={`badge ${status.badgeClass}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}