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

export function DatePicker({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dateKey(new Date());
  const selectDate = (date: string) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) setMonth(value ? parseDate(value) : new Date());
      setOpen(nextOpen);
    }}>
      <PopoverTrigger render={<Button type="button" variant="outline" className="h-10 w-full justify-between bg-background aria-expanded:bg-background" />} id={id} aria-label={`${label}: ${value ? parseDate(value).toLocaleDateString('pt-BR') : 'Selecionar data'}`}>
        <span>{value ? parseDate(value).toLocaleDateString('pt-BR') : 'Selecionar data'}</span>
        <CalendarBlankIcon aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent aria-label={`Calendário: ${label}`}>
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
            return (
              <Button key={key} type="button" variant={key === value ? 'default' : 'ghost'} className={`h-9 w-full p-0 ${key === value ? '' : 'bg-transparent'}`} aria-label={date.toLocaleDateString('pt-BR', { dateStyle: 'full' })} aria-pressed={key === value} aria-current={key === today ? 'date' : undefined} onClick={() => selectDate(key)}>
                {index + 1}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between border-t border-border pt-3">
          <Button type="button" variant="ghost" className="bg-transparent" onClick={() => selectDate('')}>Limpar</Button>
          <Button type="button" variant="outline" className="bg-transparent" onClick={() => selectDate(today)}>Hoje</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
