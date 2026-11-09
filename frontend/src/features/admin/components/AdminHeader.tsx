import { UsersIcon as Users } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
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
  const navigate = useNavigate();
  return (
    <div className="page-header">
      <div className="page-heading">
        <h1 className="page-title">Painel de Gestão</h1>
        <div className="page-description">
          Acompanhamento de uso, compras e adesão ao projeto
          {janelaLabel ? ` — ${janelaLabel}` : ''}
          {isRefreshing ? ' • atualizando...' : ''}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showUsersLink && (
          <Button type="button" variant="outline" onClick={() => navigate('/admin/usuarios')}>
            <Users aria-hidden="true" /> Gerenciar usuários
          </Button>
        )}

        <div className="flex items-center gap-2">
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
