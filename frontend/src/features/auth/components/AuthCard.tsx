import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import './AuthCard.css';

export function AuthCard({ title, subtitle, children }: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="auth-card w-full max-w-[420px] shadow-lg [--card-spacing:--spacing(6)]">
      <CardHeader className="gap-2 text-center">
        <img src="/icon.png" alt="" className="mx-auto mb-2 size-12" />
        <CardTitle><h1 className="!mb-0 !text-2xl !text-foreground">{title}</h1></CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AuthCardFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 text-center text-sm text-muted-foreground">{children}</div>;
}
