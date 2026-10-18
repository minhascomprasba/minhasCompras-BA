import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../features/auth/authService';
import { AppError } from '../../shared/api/errors';
import { AuthHeader } from '../../features/auth/components/AuthHeader';
import { AuthCard, AuthCardFooter } from '../../features/auth/components/AuthCard';
import { AuthFields } from '../../features/auth/components/AuthFields';
import { PasswordChecklist } from '../../features/auth/components/PasswordChecklist';
import './styles.css';

const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .max(128, 'A senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
    .regex(/\d/, 'A senha deve conter ao menos um número')
    .regex(/[^A-Za-z0-9]/, 'A senha deve conter ao menos um caractere especial'),
  password_confirm: z.string()
}).refine((data) => data.password === data.password_confirm, {
  message: "As senhas não coincidem",
  path: ["password_confirm"]
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password') ?? '';

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await authService.register({ email: data.email, password: data.password });
      navigate('/confirmar-email', { state: { email: data.email } });
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
        setError('Ocorreu um erro ao criar a conta. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-scope="auth" className="auth-page">
      <AuthHeader />

      <AuthCard title="Crie sua conta" subtitle={<> Comece a organizar suas compras gratuitamente </>}>

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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
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

          <div className="mb-4 grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <AuthFields>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <Input
                type={showPassword ? 'text' : 'password'}
                aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className="pl-10 pr-12"
                placeholder="Digite uma senha"
                id="password"
                autoComplete="new-password"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost" size="icon" className="auth-password-toggle absolute right-1 top-1"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </Button>
            </AuthFields>
            {errors.password && <span id="password-error" className="text-sm text-destructive" role="alert">{errors.password.message}</span>}
            <PasswordChecklist password={passwordValue} />
          </div>

          <div className="mb-6 grid gap-2">
            <Label htmlFor="password_confirm">Confirmar Senha</Label>
            <AuthFields>
              <span className="input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <Input
                type={showConfirm ? 'text' : 'password'}
                aria-invalid={!!errors.password_confirm} aria-describedby={errors.password_confirm ? "password_confirm-error" : undefined} className="pl-10 pr-12"
                placeholder="Repita a senha"
                id="password_confirm"
                autoComplete="new-password"
                {...register('password_confirm')}
              />
              <Button
                type="button"
                variant="ghost" size="icon" className="auth-password-toggle absolute right-1 top-1"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </Button>
            </AuthFields>
            {errors.password_confirm && <span id="password_confirm-error" className="text-sm text-destructive" role="alert">{errors.password_confirm.message}</span>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? 'Enviando código...' : 'Criar Conta'}
          </Button>
        </form>

        <AuthCardFooter>
          Já tem conta? <Link to="/login" className="font-semibold">Fazer login</Link>
        </AuthCardFooter>
      </AuthCard>
    </div>
  );
}
