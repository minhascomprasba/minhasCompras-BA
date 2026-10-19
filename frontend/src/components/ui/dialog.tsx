import type { ComponentProps } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';

export function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

export function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal keepMounted>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[closed]:hidden" />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn('fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl outline-none data-[closed]:hidden', className)}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn('m-0 text-lg font-semibold text-foreground', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description render={<div />} className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
