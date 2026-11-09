import type { ReactNode } from 'react';

export function AuthFields({ children }: { children: ReactNode }) {
  return <div className="relative flex items-center [&>.input-icon]:pointer-events-none [&>.input-icon]:absolute [&>.input-icon]:left-3 [&>.input-icon]:flex [&>.input-icon]:text-muted-foreground">{children}</div>;
}
