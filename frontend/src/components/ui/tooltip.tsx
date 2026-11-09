import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from 'cn';

export function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />;
}

export function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger delay={150} {...props} />;
}

export function TooltipContent({ className, align = 'start', ...props }: TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, 'align'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner sideOffset={8} align={align} className="z-50">
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn('app-shell-theme w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-accent p-3 text-sm text-accent-foreground shadow-lg', className)}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
