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
    <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem' }}>Esqueci minha senha</h1>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && <span className="form-error-text">{errors.email.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <Link to="/login" style={{ fontWeight: '500' }}>Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}
