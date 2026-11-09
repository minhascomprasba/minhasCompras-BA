import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../shared/api/client';
import { parseApiError } from '../../shared/api/errors';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { AuthHeader } from '../../features/auth/components/AuthHeader';
import { AuthCard } from '../../features/auth/components/AuthCard';
import './styles.css';

export function CancelAccountDeletionPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get('token') ?? '';
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const cancelDeletion = async () => {
    setPending(true); setError('');
    try {
      await apiClient.post('/auth/account-deletion/cancel', { token });
      setDone(true);
      window.history.replaceState(null, '', location.pathname);
    } catch (failure) { setError(parseApiError(failure).message); }
    finally { setPending(false); }
  };
  return <div data-scope="auth" className="auth-page"><AuthHeader />
    <AuthCard title="Cancelar exclusão da conta" subtitle="Você pode cancelar durante os 7 dias anteriores à exclusão definitiva.">
      {done ? <>
        <Alert>Exclusão cancelada. Sua conta e seus dados foram preservados.</Alert>
        <p className="my-4">Entre novamente. Se você não solicitou a exclusão, altere sua senha e revise a segurança do seu e-mail.</p>
        <Link className="underline" to="/login">Ir para o login</Link>
      </> : <>
        <p className="mb-4">Confirme abaixo para manter sua conta. Abrir este link não cancela a exclusão automaticamente.</p>
        {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
        {!token && <Alert variant="destructive" className="mb-4">Link inválido. Abra o link completo recebido no e-mail.</Alert>}
        <Button disabled={!token || pending} onClick={() => void cancelDeletion()}>{pending ? 'Cancelando…' : 'Cancelar exclusão e manter minha conta'}</Button>
      </>}
    </AuthCard>
  </div>;
}
