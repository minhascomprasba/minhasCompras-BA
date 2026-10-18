import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../features/auth/AuthContext';
import { authService } from '../../features/auth/authService';
import { AppError } from '../../shared/api/errors';
import { AuthHeader } from '../../features/auth/components/AuthHeader';
import { AuthCard, AuthCardFooter } from '../../features/auth/components/AuthCard';
import './styles.css';

const confirmEmailSchema = z.object({
  code: z.string()
    .length(6, 'O código deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'O código deve conter apenas números'),
});

type ConfirmEmailFormData = z.infer<typeof confirmEmailSchema>;

export function ConfirmEmailPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ConfirmEmailFormData>({
    resolver: zodResolver(confirmEmailSchema),
  });

  useEffect(() => {
    if (!email) {
      navigate('/register', { replace: true });
    }
  }, [email, navigate]);

  const onSubmit = async (data: ConfirmEmailFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await authService.verifyEmail({ email, code: data.code });
      login(response.access_token, response.user);
      navigate('/notas');
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao confirmar o código. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setSuccess('');
    try {
      const response = await authService.resendCode({ email });
      setSuccess(response.message);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao reenviar o código. Tente novamente.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div data-scope="auth" className="auth-page">
      <AuthHeader backTo="/register" backLabel="Voltar" />

      <AuthCard title="Confirme seu e-mail" subtitle={<> Enviamos um código de confirmação para{' '}
          <strong>{email || 'seu e-mail'}</strong>. Insira-o abaixo para concluir o cadastro. </>}>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6 grid gap-2">
            <Label htmlFor="code">Código de confirmação</Label>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={!!errors.code} aria-describedby={errors.code ? "code-error" : undefined}
              placeholder="000000"
              id="code"
                
                {...register('code')}
            />
            {errors.code && <span id="code-error" className="text-sm text-destructive" role="alert">{errors.code.message}</span>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Confirmando...' : 'Confirmar e criar conta'}
          </Button>
        </form>

        <AuthCardFooter>
          Não recebeu o código?{' '}
          <Button
            type="button"
            variant="link" className="h-auto p-0 font-semibold"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Reenviando...' : 'Reenviar código'}
          </Button>
        </AuthCardFooter>
      </AuthCard>
    </div>
  );
}
