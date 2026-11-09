import { PasswordChecklist } from '../../features/auth/components/PasswordChecklist';
import { newPasswordSchema } from '../../features/auth/passwordPolicy';
import { AuthHeader } from '../../features/auth/components/AuthHeader';
import { AuthCard, AuthCardFooter } from '../../features/auth/components/AuthCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../features/auth/authService';
import { AppError } from '../../shared/api/errors';
import './styles.css';

const resetPasswordSchema = z.object({
  password: newPasswordSchema,
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

  const { register, handleSubmit, control, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });

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
    <div data-scope="auth" className="auth-page">
      <AuthHeader backTo="/login" backLabel="Voltar ao login" />
      <AuthCard title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta.">

        {!token && (
          <Alert variant="destructive" className="mb-4">
            Link de redefinição inválido ou incompleto.{' '}
            <Link to="/esqueci-senha">Solicite um novo link</Link>.
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {token && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4 grid gap-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                type="password"
                aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined}
                placeholder="Digite uma senha"
                id="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && <span id="password-error" className="text-sm text-destructive" role="alert">{errors.password.message}</span>}
              <PasswordChecklist password={passwordValue} />
            </div>

            <div className="mb-6 grid gap-2">
              <Label htmlFor="password_confirm">Confirmar nova senha</Label>
              <Input
                type="password"
                aria-invalid={!!errors.password_confirm} aria-describedby={errors.password_confirm ? "password_confirm-error" : undefined}
                placeholder="Repita a senha"
                id="password_confirm"
                autoComplete="new-password"
                {...register('password_confirm')}
              />
              {errors.password_confirm && <span id="password_confirm-error" className="text-sm text-destructive" role="alert">{errors.password_confirm.message}</span>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </form>
        )}

        <AuthCardFooter>
          <Link to="/login" className="font-semibold">Voltar ao login</Link>
        </AuthCardFooter>
      </AuthCard>
    </div>
  );
}
