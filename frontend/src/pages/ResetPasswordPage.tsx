import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../features/auth/authService';
import { AppError } from '../shared/api/errors';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
  password_confirm: z.string(),
}).refine((data) => data.password === data.password_confirm, {
  message: 'As senhas não coincidem',
  path: ['password_confirm'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Link de redefinição inválido. Solicite um novo link.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await authService.resetPassword({ token, password: data.password });
      navigate('/login', { state: { message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' } });
    } catch (err: unknown) {
      if (err instanceof AppError) {
        if (err.code === 'INVALID_PASSWORD' && err.details?.rule === 'min_length') {
          setError('A senha deve ter no mínimo 8 caracteres.');
        } else if (err.code === 'INVALID_PASSWORD' && err.details?.rule === 'max_length') {
          setError('A senha deve ter no máximo 128 caracteres.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Ocorreu um erro ao redefinir a senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem' }}>Redefinir senha</h1>

        {!token && (
          <div className="alert alert-error">
            Link de redefinição inválido ou incompleto.{' '}
            <Link to="/esqueci-senha">Solicite um novo link</Link>.
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Nova senha</label>
              <input
                type="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Entre 8 e 128 caracteres"
                {...register('password')}
              />
              {errors.password && <span className="form-error-text">{errors.password.message}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Confirmar nova senha</label>
              <input
                type="password"
                className={`form-input ${errors.password_confirm ? 'error' : ''}`}
                placeholder="Repita a senha"
                {...register('password_confirm')}
              />
              {errors.password_confirm && <span className="form-error-text">{errors.password_confirm.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Redefinir senha'}
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
