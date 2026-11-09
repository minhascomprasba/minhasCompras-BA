import { InfoTooltip } from './InfoTooltip';

interface MetricHeadProps {
  title: string;
  tooltip: string;
  alignTooltip?: 'left' | 'right';
}
export function MetricHead({ title, tooltip, alignTooltip }: MetricHeadProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="m-0 text-base font-medium text-foreground">{title}</h3>
      <InfoTooltip content={tooltip} align={alignTooltip} />
    </div>
  );
}
