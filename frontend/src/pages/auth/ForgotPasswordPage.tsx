import { AuthHeader } from '../../features/auth/components/AuthHeader';
import { AuthCard, AuthCardFooter } from '../../features/auth/components/AuthCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '../../features/auth/authService';
import { AppError } from '../../shared/api/errors';
import './styles.css';

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
    <div data-scope="auth" className="auth-page">
      <AuthHeader backTo="/login" backLabel="Voltar ao login" />
      <AuthCard title="Esqueci minha senha" subtitle="Informe seu e-mail e enviaremos um link para redefinir sua senha.">

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            {success}
          </Alert>
        )}

        {!success && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-6 grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                type="email"
                aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined}
                placeholder="seu@email.com"
                id="email"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <span id="email-error" className="text-sm text-destructive" role="alert">{errors.email.message}</span>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar link'}
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
