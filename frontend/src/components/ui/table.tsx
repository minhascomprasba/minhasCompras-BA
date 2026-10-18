import type { ComponentProps } from 'react';
import { cn } from 'cn';

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return <table data-slot="table" className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead data-slot="tableheader" className={cn('[&_tr]:border-b', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody data-slot="tablebody" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr data-slot="tablerow" className={cn('border-b border-border transition-colors hover:bg-muted/50', className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return <th data-slot="tablehead" className={cn('h-10 px-2 text-left align-middle font-medium text-muted-foreground', className)} {...props} />;
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td data-slot="tablecell" className={cn('p-2 align-middle', className)} {...props} />;
}

