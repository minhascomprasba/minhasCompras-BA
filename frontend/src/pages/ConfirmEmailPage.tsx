import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../features/auth/AuthContext';
import { authService } from '../features/auth/authService';
import { AppError } from '../shared/api/errors';

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
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="auth-logo">
          <img src="/icon.png" alt="" className="brand-icon" />
          <span>MinhasCompras.app</span>
        </Link>
        <Link to="/register" className="auth-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Voltar</span>
        </Link>
      </header>

      <div className="auth-card">
        <div className="auth-card-icon">
          <img src="/icon.png" alt="Minhas Compras BA" />
        </div>
        <h1 className="auth-title">Confirme seu e-mail</h1>
        <p className="auth-subtitle">
          Enviamos um código de confirmação para{' '}
          <strong>{email || 'seu e-mail'}</strong>. Insira-o abaixo para concluir o cadastro.
        </p>

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

        <div className="auth-footer-link">
          Não recebeu o código?{' '}
          <button
            type="button"
            className="link-button font-semibold"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Reenviando...' : 'Reenviar código'}
          </button>
        </div>
      </div>
    </div>
  );
}
