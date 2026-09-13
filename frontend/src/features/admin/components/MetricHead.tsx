import { InfoTooltip } from './InfoTooltip';

interface MetricHeadProps {
  title: string;
  tooltip: string;
  alignTooltip?: 'left' | 'right';
}

export function MetricHead({ title, tooltip, alignTooltip }: MetricHeadProps) {
  return (
    <div className="metric-head">
      <h3 className="metric-head-title">{title}</h3>
      <InfoTooltip content={tooltip} align={alignTooltip} />
    </div>
  );
}