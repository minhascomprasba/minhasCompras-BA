import { useState } from 'react';
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

type DateRange = { from: string; to: string };

export function DateRangePicker({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [draft, setDraft] = useState<DateRange>(value);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dateKey(new Date());
  const selectDate = (date: string) => {
    if (!draft.from || draft.to) {
      setDraft({ from: date, to: '' });
      return;
    }
    const range = date < draft.from ? { from: date, to: draft.from } : { from: draft.from, to: date };
    setDraft(range);
    onChange(range);
    setOpen(false);
  };
  const displayValue = value.from && value.to
    ? `${parseDate(value.from).toLocaleDateString('pt-BR')} – ${parseDate(value.to).toLocaleDateString('pt-BR')}`
    : 'Selecionar período';

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setMonth(value.from ? parseDate(value.from) : new Date());
        setDraft(value);
      }
      setOpen(nextOpen);
    }}>
      <PopoverTrigger render={<Button type="button" variant="outline" className="h-10 w-full justify-between bg-background aria-expanded:bg-background" />} id={id} aria-label={`${label}: ${displayValue}`}>
        <span>{displayValue}</span>
        <CalendarBlankIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent aria-label={`Calendário: ${label}`}>
        <p className="mt-0 mb-3 text-sm" aria-live="polite">{draft.from && !draft.to ? `Início: ${parseDate(draft.from).toLocaleDateString('pt-BR')}. Selecione a data final.` : 'Selecione a data inicial e a data final.'}</p>
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="icon" className="bg-transparent" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <CaretLeftIcon aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="font-medium capitalize">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          <Button type="button" variant="ghost" size="icon" className="bg-transparent" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <CaretRightIcon aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map(day => <span key={day} className="py-1 text-center text-xs text-muted-foreground">{day}</span>)}
          {Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
            const key = dateKey(date);
            const isEndpoint = key === draft.from || key === draft.to;
            const isInRange = !!(draft.from && draft.to && key > draft.from && key < draft.to);
            return (
              <Button key={key} type="button" variant={isEndpoint ? 'default' : 'ghost'} className={`h-9 w-full p-0 ${isEndpoint ? '' : isInRange ? 'bg-primary/15' : 'bg-transparent'}`} aria-label={date.toLocaleDateString('pt-BR', { dateStyle: 'full' })} aria-pressed={isEndpoint || isInRange} aria-current={key === today ? 'date' : undefined} onClick={() => selectDate(key)}>
                {index + 1}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <Button type="button" variant="ghost" className="bg-transparent" onClick={() => { onChange({ from: '', to: '' }); setDraft({ from: '', to: '' }); setOpen(false); }}>Limpar</Button>
          <Button type="button" variant="outline" className="bg-transparent" onClick={() => { onChange({ from: today, to: today }); setOpen(false); }}>Hoje</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
