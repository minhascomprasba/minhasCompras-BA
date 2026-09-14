import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { InfoTooltip } from './InfoTooltip';
import type { AdminPeriod } from '../types';

export const PERIOD_OPTIONS: { value: AdminPeriod; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'mes', label: 'Mês a Mês' },
  { value: 'ano', label: 'Ano a Ano' },
  { value: 'geral', label: 'Geral (Todo o Histórico)' },
];

const PERIOD_TOOLTIP =
  'Curto prazo (7/30 dias) detecta anomalias imediatas do robô ou quedas de conectividade na SEFAZ. Médio e longo prazo (Mês a Mês, Ano a Ano, Geral) alimentam relatórios semestrais e anuais de extensão.';

interface AdminHeaderProps {
  period: AdminPeriod;
  onPeriodChange: (period: AdminPeriod) => void;
  janelaLabel?: string;
  isRefreshing?: boolean;
  showUsersLink?: boolean;
}

export function AdminHeader({
  period,
  onPeriodChange,
  janelaLabel,
  isRefreshing = false,
  showUsersLink = false,
}: AdminHeaderProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const selected = PERIOD_OPTIONS.find((option) => option.value === period) ?? PERIOD_OPTIONS[1];

  return (
    <div className="admin-header">
      <div>
        <h1 className="admin-title">Painel de Administração</h1>
        <p className="admin-subtitle">
          Indicadores operacionais, métricas de extensão e inteligência de mercado
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
        <div className="period-selector admin-period-selector" ref={rootRef}>
          <button
            type="button"
            className="admin-period-trigger"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="admin-period-value">{selected.label}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <InfoTooltip content={PERIOD_TOOLTIP} />
          {open && (
            <ul className="admin-period-menu" role="listbox" aria-label="Período">
              {PERIOD_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === period}
                    className={`admin-period-option${option.value === period ? ' admin-period-option--active' : ''}`}
                    onClick={() => {
                      onPeriodChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
