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
import './ConfirmEmailPage.css';

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
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group auth-form-group-spaced">
            <label className="form-label">Código de confirmação</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`form-input ${errors.code ? 'error' : ''}`}
              placeholder="000000"
              {...register('code')}
            />
            {errors.code && <span className="form-error-text">{errors.code.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
            {isLoading ? 'Confirmando...' : 'Confirmar e criar conta'}
          </button>
        </form>

        <AuthCardFooter>
          Não recebeu o código?{' '}
          <button
            type="button"
            className="link-button font-semibold"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Reenviando...' : 'Reenviar código'}
          </button>
        </AuthCardFooter>
      </AuthCard>
    </div>
  );
}
