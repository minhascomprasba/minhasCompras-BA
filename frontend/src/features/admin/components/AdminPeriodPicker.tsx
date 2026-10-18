import { ArrowLeftIcon as ArrowLeft, ArrowRightIcon as ArrowRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { CalendarDotsIcon as CalendarDays } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { NativeSelect } from '../../../components/ui/native-select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import type { AdminPeriod } from '../types';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
interface AdminPeriodPickerProps {
  period: AdminPeriod;
  onPeriodChange: (period: AdminPeriod) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
}
export function AdminPeriodPicker({ period, onPeriodChange, selectedMonth, onMonthChange, selectedYear, onYearChange }: AdminPeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [pickerYear, setPickerYear] = useState(() => Number(selectedMonth.split('-')[0]) || currentYear);
  const [mode, setMode] = useState<'quick' | 'month' | 'year'>('quick');
  const years = Array.from(new Set([currentYear, currentYear - 1, currentYear - 2, currentYear - 3, Number(selectedYear), pickerYear])).filter(Number.isFinite).sort((a, b) => b - a);
  const label = period === 'mes' ? `${MONTHS[Number(selectedMonth.split('-')[1]) - 1]} ${selectedMonth.split('-')[0]}` : period === 'ano' ? `Ano ${selectedYear}` : period === 'geral' ? 'Todo o Histórico' : period === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias';
  const selectPeriod = (value: AdminPeriod) => { onPeriodChange(value); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={(next) => { if (next) setMode(period === 'mes' ? 'month' : period === 'ano' ? 'year' : 'quick'); setOpen(next); }}>
      <PopoverTrigger render={<Button type="button" variant="outline" />}><CalendarDays aria-hidden="true" />{label}</PopoverTrigger>
      <PopoverContent align="end" className="space-y-4">
        <div className="flex gap-1" role="group" aria-label="Tipo de período">
          {([['quick', 'Rápidos'], ['month', 'Mês a Mês'], ['year', 'Por Ano']] as const).map(([value, text]) => <Button key={value} type="button" size="sm" variant={mode === value ? 'secondary' : 'ghost'} aria-pressed={mode === value} onClick={() => setMode(value)}>{text}</Button>)}
        </div>
        {mode === 'quick' && <div className="grid gap-2">
          <Button type="button" variant="outline" onClick={() => selectPeriod('7d')}>Últimos 7 dias (por dia)</Button>
          <Button type="button" variant="outline" onClick={() => selectPeriod('30d')}>Últimos 30 dias (por semana)</Button>
          <Button type="button" variant="outline" onClick={() => { onYearChange(String(currentYear)); selectPeriod('ano'); }}>Ano Atual ({currentYear} completo)</Button>
          <Button type="button" variant="outline" onClick={() => selectPeriod('geral')}>Todo o Histórico (desde 2023)</Button>
        </div>}
        {mode === 'month' && <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" aria-label="Ano anterior" onClick={() => setPickerYear(y => y - 1)}><ArrowLeft aria-hidden="true" /></Button>
            <span className="font-medium">{pickerYear}</span>
            <Button type="button" variant="outline" aria-label="Próximo ano" onClick={() => setPickerYear(y => y + 1)}><ArrowRight aria-hidden="true" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-2">{MONTHS.map((month, index) => {
            const value = `${pickerYear}-${String(index + 1).padStart(2, '0')}`;
            return <Button key={month} type="button" variant={period === 'mes' && selectedMonth === value ? 'secondary' : 'outline'} aria-pressed={period === 'mes' && selectedMonth === value} onClick={() => { onMonthChange(value); selectPeriod('mes'); }}>{month.slice(0, 3)}</Button>;
          })}</div>
        </div>}
        {mode === 'year' && <div className="grid gap-2">
          <Label htmlFor="admin-period-year">Ano</Label>
          <NativeSelect id="admin-period-year" value={selectedYear} onChange={event => { onYearChange(event.target.value); selectPeriod('ano'); }}>{years.map(year => <option key={year} value={year}>{year}</option>)}</NativeSelect>
          <Button type="button" variant="outline" onClick={() => selectPeriod('ano')}>Ver ano {selectedYear}</Button>
        </div>}
      </PopoverContent>
    </Popover>
  );
}
