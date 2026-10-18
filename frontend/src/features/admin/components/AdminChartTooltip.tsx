import type { TooltipContentProps, TooltipValueType } from 'recharts';

export function AdminChartTooltip({ active, payload, label, bucketLabel }: Pick<TooltipContentProps<TooltipValueType, string | number>, 'active' | 'payload' | 'label'> & { bucketLabel: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md">
      <div className="mb-1 font-medium">{bucketLabel}: {label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span className="size-2 shrink-0 rounded-sm" style={{ background: entry.color }} aria-hidden="true" />
          <span>{entry.name}: {entry.value?.toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  );
}
