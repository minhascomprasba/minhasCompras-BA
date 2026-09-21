import { Link } from 'react-router-dom';
import { InfoTooltip } from './InfoTooltip';
import { AdminPeriodPicker } from './AdminPeriodPicker';
import type { AdminPeriod } from '../types';

const PERIOD_TOOLTIP =
  'Selecione o intervalo de tempo para consolidar os indicadores e relatórios do projeto.';

interface AdminHeaderProps {
  period: AdminPeriod;
  onPeriodChange: (period: AdminPeriod) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  janelaLabel?: string;
  isRefreshing?: boolean;
  showUsersLink?: boolean;
}

export function AdminHeader({
  period,
  onPeriodChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
  janelaLabel,
  isRefreshing = false,
  showUsersLink = false,
}: AdminHeaderProps) {
  return (
    <div className="admin-header">
      <div>
        <h1 className="admin-title">Painel de Administração</h1>
        <p className="admin-subtitle">
          Acompanhamento de uso, compras e adesão ao projeto
          {janelaLabel ? ` — ${janelaLabel}` : ''}
          {isRefreshing ? ' • atualizando...' : ''}
        </p>
      </div>

      <div className="admin-header-actions">
        {showUsersLink && (
          <Link to="/admin/usuarios" className="btn btn-secondary btn-sm">
            Gerenciar usuários
          </Link>
        )}

        {/* Componente Modular do Seletor */}
        <div className="period-selector admin-period-selector">
          <AdminPeriodPicker
            period={period}
            onPeriodChange={onPeriodChange}
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
            selectedYear={selectedYear}
            onYearChange={onYearChange}
          />
          <InfoTooltip content={PERIOD_TOOLTIP} />
        </div>
      </div>
    </div>
  );
}