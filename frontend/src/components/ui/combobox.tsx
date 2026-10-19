import { Combobox as Primitive } from '@base-ui/react/combobox';
import { CheckIcon as Check } from '@phosphor-icons/react';
import { cn } from 'cn';

export function Combobox<Value>(props: Primitive.Root.Props<Value, false>) {
  return <Primitive.Root {...props} />;
}
export function ComboboxInput({ className, ...props }: Primitive.Input.Props) {
  return <Primitive.Input data-slot="combobox-input" className={cn('h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50', className)} {...props} />;
}
export function ComboboxContent(props: Primitive.Popup.Props) {
  return <Primitive.Portal><Primitive.Positioner sideOffset={4} className="z-50"><Primitive.Popup data-slot="combobox-content" className="app-shell-theme max-h-(--available-height) w-(--anchor-width) overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none" {...props} /></Primitive.Positioner></Primitive.Portal>;
}
export function ComboboxList(props: Primitive.List.Props) {
  return <Primitive.List data-slot="combobox-list" {...props} />;
}
export function ComboboxItem({ children, ...props }: Primitive.Item.Props) {
  return <Primitive.Item data-slot="combobox-item" className="relative flex cursor-default items-center rounded-md py-2 pr-8 pl-3 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground" {...props}>{children}<Primitive.ItemIndicator className="absolute right-2"><Check className="size-4" aria-hidden="true" /></Primitive.ItemIndicator></Primitive.Item>;
}
export function ComboboxEmpty(props: Primitive.Empty.Props) {
  return <Primitive.Empty className="p-3 text-sm text-muted-foreground empty:hidden" {...props} />;
}
