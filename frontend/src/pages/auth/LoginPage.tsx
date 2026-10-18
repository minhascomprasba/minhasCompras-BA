import { Envelope, Lock, EyeSlash, Eye } from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../features/auth/AuthContext';
import { authService } from '../../features/auth/authService';
import { AppError } from '../../shared/api/errors';
import { AuthHeader } from '../../features/auth/components/AuthHeader';
import { AuthCard, AuthCardFooter } from '../../features/auth/components/AuthCard';
import { AuthFields } from '../../features/auth/components/AuthFields';
import './styles.css';

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
  const [showPassword, setShowPassword] = useState(false);

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
        setError('Ocorreu um erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-scope="auth" className="auth-page">
      <AuthHeader />

      <AuthCard title="Bem-vindo de volta" subtitle={<> Entre para acessar seu painel de compras </>}>

        {successMessage && (
          <Alert className="mb-4">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4 grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <AuthFields>
              <span className="input-icon">
                <Envelope size={18} aria-hidden="true" />
              </span>
              <Input
                type="email"
                aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className="pl-10"
                placeholder="seu@email.com"
                id="email"
                autoComplete="email"
                {...register('email')}
              />
            </AuthFields>
            {errors.email && <span id="email-error" className="text-sm text-destructive" role="alert">{errors.email.message}</span>}
          </div>

          <div className="mb-6 grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <AuthFields>
              <span className="input-icon">
                <Lock size={18} aria-hidden="true" />
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className="pl-10 pr-12"
                placeholder="Digite sua senha"
                id="password"
                autoComplete="current-password"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost" size="icon" className="auth-password-toggle absolute right-1 top-1"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeSlash size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </Button>
            </AuthFields>
            {errors.password && <span id="password-error" className="text-sm text-destructive" role="alert">{errors.password.message}</span>}
            <div className="auth-forgot-password-wrap">
              <Link to="/esqueci-senha" className="auth-forgot-password-link">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <AuthCardFooter>
          Ainda não tem conta? <Link to="/register" className="font-semibold">Criar conta</Link>
        </AuthCardFooter>
      </AuthCard>
    </div>
  );
}
