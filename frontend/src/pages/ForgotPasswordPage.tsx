import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../features/auth/authService';
import { AppError } from '../shared/api/errors';

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await authService.requestPasswordReset({ email: data.email });
      setSuccess(response.message);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao solicitar a redefinição. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container auth-container-narrow">
      <div className="card auth-card-inner">
        <h1 className="auth-title-centered">Esqueci minha senha</h1>
        <p className="auth-subtitle-centered">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
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

        {!success && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group auth-form-group-spaced">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && <span className="form-error-text">{errors.email.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <div className="auth-footer-centered">
          <Link to="/login" className="font-semibold">Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}
