import { Info } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';

interface InfoTooltipProps {
  content: string;
  title?: string;
  align?: 'left' | 'right';
}

export function InfoTooltip({ content, title, align }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" className="shrink-0 bg-transparent text-muted-foreground hover:bg-accent" />} aria-label={title ? `Mais informações: ${title}` : 'Mais informações'}>
        <Info className="size-4" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent align={align === 'right' ? 'end' : 'start'}>
        {title && <strong className="mb-1 block text-foreground">{title}</strong>}
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
