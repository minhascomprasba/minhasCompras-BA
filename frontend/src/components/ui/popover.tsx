import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from 'cn';

export function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}
export function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger {...props} />;
}
export function PopoverContent({ className, align = 'start', ...props }: PopoverPrimitive.Popup.Props & Pick<PopoverPrimitive.Positioner.Props, 'align'>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner sideOffset={8} align={align} className="z-50 max-w-[calc(100vw-2rem)]">
        <PopoverPrimitive.Popup data-slot="popover-content" className={cn('app-shell-theme max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-none', className)} {...props} />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
