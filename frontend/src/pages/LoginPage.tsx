import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../features/auth/AuthContext';
import { authService } from '../features/auth/authService';
import { AppError } from '../shared/api/errors';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message ?? '';
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.login(data);
      login(response.access_token, response.user);
      navigate('/dashboard');
    } catch (err: any) {
      if (err instanceof AppError) {
        if (err.code === 'INVALID_PASSWORD' && err.details?.rule === 'min_length') {
          setError('A senha deve ter no mínimo 8 caracteres.');
        } else if (err.code === 'INVALID_PASSWORD' && err.details?.rule === 'max_length') {
          setError('A senha deve ter no máximo 128 caracteres.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Ocorreu um erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem' }}>Entrar</h1>

        {successMessage && (
          <div className="alert alert-success">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input 
              type="email" 
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="seu@email.com"
              {...register('email')}
            />
            {errors.email && <span className="form-error-text">{errors.email.message}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Senha</label>
            <input 
              type="password" 
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Entre 8 e 128 caracteres"
              {...register('password')}
            />
            {errors.password && <span className="form-error-text">{errors.password.message}</span>}
            <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
              <Link to="/esqueci-senha" style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Ainda não tem conta? <Link to="/register" style={{ fontWeight: '500' }}>Criar conta</Link>
        </div>
      </div>
    </div>
  );
}
