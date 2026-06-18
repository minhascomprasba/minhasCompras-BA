import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../features/auth/AuthContext';
import { authService } from '../features/auth/authService';
import { AppError } from '../shared/api/errors';

const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres'),
  password_confirm: z.string()
}).refine((data) => data.password === data.password_confirm, {
  message: "As senhas não coincidem",
  path: ["password_confirm"]
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.register({ email: data.email, password: data.password });
      login(response.access_token, response.user);
      navigate('/notas');
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
        setError('Ocorreu um erro ao criar a conta. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <header className="auth-header">
        <Link to="/" className="auth-logo">
          Minhas Compras BA
        </Link>
        <Link to="/" className="auth-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span>Voltar para a Home</span>
        </Link>
      </header>

      <div className="container" style={{ maxWidth: '400px', margin: '0 auto', padding: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '2rem' }}>Criar Conta</h1>
          
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

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input 
                type="password" 
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Entre 8 e 128 caracteres"
                {...register('password')}
              />
              {errors.password && <span className="form-error-text">{errors.password.message}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Confirmar Senha</label>
              <input 
                type="password" 
                className={`form-input ${errors.password_confirm ? 'error' : ''}`}
                placeholder="Repita a senha"
                {...register('password_confirm')}
              />
              {errors.password_confirm && <span className="form-error-text">{errors.password_confirm.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Já tem conta? <Link to="/login" style={{ fontWeight: '500' }}>Fazer login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
