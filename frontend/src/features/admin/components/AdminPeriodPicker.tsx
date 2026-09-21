import { useState, useEffect, useRef } from 'react';
import type { AdminPeriod } from '../types';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

interface AdminPeriodPickerProps {
  period: AdminPeriod;
  onPeriodChange: (period: AdminPeriod) => void;
  selectedMonth: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  selectedYear: string;  // "YYYY"
  onYearChange: (year: string) => void;
}

export function AdminPeriodPicker({
  period,
  onPeriodChange,
  selectedMonth,
  onMonthChange,
  selectedYear,
  onYearChange,
}: AdminPeriodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'rapidos' | 'mes' | 'ano'>('rapidos');

  const [pickerYear, setPickerYear] = useState<number>(() => {
    const y = parseInt(selectedMonth.split('-')[0], 10);
    return isNaN(y) ? 2026 : y;
  });

  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ao abrir o popover, abre na aba correspondente ao período atual
  const handleToggleOpen = () => {
    if (!isOpen) {
      if (period === 'mes') setActiveTab('mes');
      else if (period === 'ano') setActiveTab('ano');
      else setActiveTab('rapidos');
    }
    setIsOpen((prev) => !prev);
  };

  const getDisplayLabel = () => {
    if (period === '7d') return 'Últimos 7 dias';
    if (period === '30d') return 'Últimos 30 dias';
    if (period === 'geral') return 'Todo o Histórico';
    if (period === 'mes') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const monthIdx = (parseInt(monthStr, 10) || 10) - 1;
      return `${MONTH_NAMES[monthIdx] || 'Mês'} ${yearStr}`;
    }
    if (period === 'ano') {
      return `Ano ${selectedYear}`;
    }
    return 'Últimos 30 dias';
  };

  const handleMonthSelect = (monthIdx: number) => {
    const monthStr = String(monthIdx + 1).padStart(2, '0');
    onPeriodChange('mes');
    onMonthChange(`${pickerYear}-${monthStr}`);
    setIsOpen(false);
  };

  const handleYearSelect = (yearStr: string) => {
    onPeriodChange('ano');
    onYearChange(yearStr);
    setIsOpen(false);
  };

  const currentYearNum = 2026;
  const availableYears = [currentYearNum, currentYearNum - 1, currentYearNum - 2, currentYearNum - 3];

  return (
    <div className="admin-period-picker-root" ref={rootRef}>
      {/* Botão com largura fixa e alinhamento estável */}
      <button
        type="button"
        className="admin-period-trigger admin-period-trigger--fixed"
        onClick={handleToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="admin-period-value">{getDisplayLabel()}</span>
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

      {isOpen && (
        <div className="admin-picker-popover" role="dialog" aria-label="Seletor de período">
          <div className="admin-picker-tabs">
            <button
              type="button"
              className={`admin-picker-tab${activeTab === 'rapidos' ? ' admin-picker-tab--active' : ''}`}
              onClick={() => setActiveTab('rapidos')}
            >
              Rápidos
            </button>
            <button
              type="button"
              className={`admin-picker-tab${activeTab === 'mes' ? ' admin-picker-tab--active' : ''}`}
              onClick={() => setActiveTab('mes')}
            >
              Mês a Mês
            </button>
            <button
              type="button"
              className={`admin-picker-tab${activeTab === 'ano' ? ' admin-picker-tab--active' : ''}`}
              onClick={() => setActiveTab('ano')}
            >
              Por Ano
            </button>
          </div>

          {activeTab === 'rapidos' && (
            <div className="admin-picker-content">
              <button
                type="button"
                className={`admin-picker-btn${period === '7d' ? ' admin-picker-btn--active' : ''}`}
                onClick={() => {
                  onPeriodChange('7d');
                  setIsOpen(false);
                }}
              >
                Últimos 7 dias (por dia)
              </button>
              <button
                type="button"
                className={`admin-picker-btn${period === '30d' ? ' admin-picker-btn--active' : ''}`}
                onClick={() => {
                  onPeriodChange('30d');
                  setIsOpen(false);
                }}
              >
                Últimos 30 dias (por semana)
              </button>
              <button
                type="button"
                className={`admin-picker-btn${period === 'ano' && selectedYear === '2026' ? ' admin-picker-btn--active' : ''}`}
                onClick={() => {
                  onPeriodChange('ano');
                  onYearChange('2026');
                  setIsOpen(false);
                }}
              >
                Ano Atual (2026 completo)
              </button>
              <button
                type="button"
                className={`admin-picker-btn${period === 'geral' ? ' admin-picker-btn--active' : ''}`}
                onClick={() => {
                  onPeriodChange('geral');
                  setIsOpen(false);
                }}
              >
                Todo o Histórico (desde 2023)
              </button>
            </div>
          )}

          {activeTab === 'mes' && (
            <div className="admin-picker-content">
              <div className="admin-year-nav">
                <button
                  type="button"
                  className="admin-year-nav-btn"
                  onClick={() => setPickerYear((y) => y - 1)}
                  aria-label="Ano anterior"
                >
                  &larr;
                </button>
                <span className="admin-year-nav-title">{pickerYear}</span>
                <button
                  type="button"
                  className="admin-year-nav-btn"
                  onClick={() => setPickerYear((y) => y + 1)}
                  aria-label="Próximo ano"
                >
                  &rarr;
                </button>
              </div>

              <div className="admin-month-grid">
                {MONTH_ABBR.map((abbr, index) => {
                  const monthStr = String(index + 1).padStart(2, '0');
                  const isSelected = period === 'mes' && selectedMonth === `${pickerYear}-${monthStr}`;
                  return (
                    <button
                      key={abbr}
                      type="button"
                      className={`admin-month-cell${isSelected ? ' admin-month-cell--active' : ''}`}
                      onClick={() => handleMonthSelect(index)}
                    >
                      {abbr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'ano' && (
            <div className="admin-picker-content admin-year-grid">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`admin-picker-btn${period === 'ano' && selectedYear === String(yr) ? ' admin-picker-btn--active' : ''}`}
                  onClick={() => handleYearSelect(String(yr))}
                >
                  Ano {yr} (todos os 12 meses)
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}