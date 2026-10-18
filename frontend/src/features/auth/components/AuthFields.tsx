import type { ReactNode } from 'react';
import './AuthFields.css';

export function AuthFields({ children }: { children: ReactNode }) {
  return <div className="input-icon-wrap">{children}</div>;
}
