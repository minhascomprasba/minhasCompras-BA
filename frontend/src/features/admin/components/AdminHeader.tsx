import { useState, useEffect, useRef } from 'react';
import { InfoTooltip } from './InfoTooltip';

const PERIOD_OPTIONS = [
  'Últimos 7 dias',
  'Últimos 30 dias',
  'Mês a Mês',
  'Ano a Ano',
  'Geral (Todo o Histórico)',
];

const PERIOD_TOOLTIP =
  'Curto prazo (7/30 dias) detecta anomalias imediatas do robô ou quedas de conectividade na SEFAZ. Médio e longo prazo (Mês a Mês, Ano a Ano, Geral) alimentam relatórios semestrais e anuais de extensão.';

interface AdminHeaderProps {
  mesAno: string;
}

export function AdminHeader({ mesAno }: AdminHeaderProps) {
  const [period, setPeriod] = useState(PERIOD_OPTIONS[1]);
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

  const displayLabel = period === 'Mês a Mês' ? mesAno : period;

  return (
    <div className="admin-header">
      <div>
        <h1 className="admin-title">Painel de Administração</h1>
        <p className="admin-subtitle">
          Indicadores operacionais, métricas de extensão e inteligência de mercado
        </p>
      </div>
      <div className="period-selector admin-period-selector" ref={rootRef}>
        <button
          type="button"
          className="admin-period-trigger"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="admin-period-value">{displayLabel}</span>
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
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option === period}
                  className={`admin-period-option${option === period ? ' admin-period-option--active' : ''}`}
                  onClick={() => {
                    setPeriod(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}