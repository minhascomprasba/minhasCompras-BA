import { PasswordChecklist } from '../../features/auth/components/PasswordChecklist';
import { newPasswordSchema } from '../../features/auth/passwordPolicy';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EnvelopeIcon as Envelope,
  LockKeyIcon as LockKey,
  TrashIcon as Trash,
  WarningCircleIcon as WarningCircle,
  CheckCircleIcon as CheckCircle,
  ShieldCheckIcon as ShieldCheck,
  ArrowRightIcon as ArrowRight,
  ArrowLeftIcon as ArrowLeft,
  PencilSimpleIcon as PencilSimple,
  XIcon as X
} from '@phosphor-icons/react';
import BoringAvatar from 'boring-avatars';

import { authService } from '../../features/auth/authService';
import { parseApiError } from '../../shared/api/errors';
import { useAuth } from '../../features/auth/AuthContext';
import { RoleBadge } from '../../components/RoleBadge';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';

const avatarColors = [
  '#17c85f',
  '#033876',
  '#3a8fe0',
  '#17233A',
  '#F4F8FC',
];

type ActiveTab = 'none' | 'email' | 'password';

export function ProfilePage() {
  const { user, role, replaceCredentials, logout } = useAuth();
  const navigate = useNavigate();

  // Controle de abas recolhidas
  const [activeTab, setActiveTab] = useState<ActiveTab>('none');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados: Troca de E-mail
  const [emailStep, setEmailStep] = useState<'form' | 'pin'>('form');
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [emailPin, setEmailPin] = useState('');

  // Estados: Troca de Senha
  const [passwordStep, setPasswordStep] = useState<'form' | 'pin'>('form');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordPin, setPasswordPin] = useState('');

  // Estados: Exclusão LGPD (Modal)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const [pending, setPending] = useState(false);
  const [emailChallenge, setEmailChallenge] = useState('');
  const [passwordChallenge, setPasswordChallenge] = useState('');
  const [exportPassword, setExportPassword] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);

  const clearSecrets = () => {
    setEmailCurrentPassword(''); setCurrentPassword(''); setNewPassword('');
    setConfirmPassword(''); setEmailPin(''); setPasswordPin('');
    setDeletePassword(''); setExportPassword('');
  };
  const run = async (action: () => Promise<void>) => {
    if (pending) return;
    setPending(true); setFeedback(null); setFieldError(null);
    try { await action(); }
    catch (error) {
      const parsed = parseApiError(error);
      setFeedback({ type: 'error', message: parsed.message });
      if (typeof parsed.details?.field === 'string') setFieldError({ field: parsed.details.field, message: parsed.message });
    } finally { setPending(false); }
  };
  const handleRequestEmailPin = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const result = await authService.requestEmailChange({ new_email: newEmail, current_password: emailCurrentPassword });
      setEmailChallenge(result.challenge_id); setEmailStep('pin'); setEmailCurrentPassword('');
      setFeedback({ type: 'success', message: 'Código enviado ao novo e-mail. Válido por 15 minutos.' });
    });
  };
  const handleConfirmEmailChange = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const result = await authService.verifyChange('email', emailChallenge, emailPin);
      replaceCredentials(result.access_token, result.user); clearSecrets(); setNewEmail('');
      setActiveTab('none'); setEmailStep('form'); setEmailChallenge('');
      setFeedback({ type: 'success', message: 'E-mail atualizado. Outras sessões foram encerradas.' });
    });
  };
  const handleRequestPasswordPin = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = newPasswordSchema.safeParse(newPassword);
    if (!validation.success) {
      const message = validation.error.issues[0].message;
      setFeedback({ type: 'error', message });
      setFieldError({ field: 'new_password', message });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'A nova senha e a confirmação não coincidem.' }); return;
    }
    void run(async () => {
      const result = await authService.requestPasswordChange({ current_password: currentPassword, new_password: newPassword });
      setPasswordChallenge(result.challenge_id); setPasswordStep('pin'); clearSecrets();
      setFeedback({ type: 'success', message: 'Código enviado ao seu e-mail. Válido por 15 minutos.' });
    });
  };
  const handleConfirmPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const result = await authService.verifyChange('password', passwordChallenge, passwordPin);
      replaceCredentials(result.access_token, result.user); clearSecrets(); setPasswordChallenge('');
      setActiveTab('none'); setPasswordStep('form');
      setFeedback({ type: 'success', message: 'Senha atualizada. Outras sessões foram encerradas.' });
    });
  };
  const handleDeleteAccount = () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'EXCLUIR') return;
    void run(async () => {
      await authService.deleteAccount(deletePassword);
      clearSecrets(); setIsDeleteModalOpen(false); logout(); navigate('/login', { state: { message: 'Exclusão agendada para daqui a 7 dias. Verifique seu e-mail para cancelar caso mude de ideia.' } });
    });
  };
  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const blob = await authService.exportAccount(exportPassword);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url;
      link.download = 'minhas-compras-dados-v1.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); setExportPassword('');
      setFeedback({ type: 'success', message: 'Exportação concluída.' });
    });
  };

  const isDeleteConfirmed = deleteConfirmationText.trim().toUpperCase() === 'EXCLUIR';

  return (
    <div data-scope="profile" className="page-layout">
      <header className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Gestão do Perfil</h1>
          <p className="page-description">
            Gerencie suas credenciais de acesso e seus controles de privacidade.
          </p>
        </div>
      </header>

      {feedback && (
        <Alert
          variant={feedback.type === 'error' ? 'destructive' : 'default'}
          className={feedback.type === 'success' ? 'border-primary/30 bg-primary/10 text-primary' : undefined}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="size-5 shrink-0" aria-hidden="true" />
          ) : (
            <WarningCircle className="size-5 shrink-0" aria-hidden="true" />
          )}
          <span role="status">{feedback.message}</span>
        </Alert>
      )}

      {pending && <p role="status">Processando…</p>}
      <Link to="/privacidade" className="underline">Aviso de privacidade</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Painel Esquerdo: Resumo do Usuário */}
        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-20 items-center justify-center overflow-hidden rounded-full ring-2 ring-border">
                <BoringAvatar
                  size={80}
                  name={user ? String(user.id) : 'guest'}
                  variant="beam"
                  colors={avatarColors}
                />
              </div>
              <CardTitle>{user?.email || 'Usuário'}</CardTitle>
              <CardDescription>Identificador #{user?.id ?? '—'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Perfil de Acesso</span>
                {role && <RoleBadge role={role} />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status da Conta</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                  <span className="size-2 rounded-full bg-primary animate-pulse" /> Ativa
                </span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
                <span>Consulte os controles disponíveis e o aviso de privacidade.</span>
              </div>
            </CardContent>
          </Card>

          {/* Exclusão da conta */}
          <Card className="border-destructive/30 bg-destructive/5 transition-colors hover:border-destructive/50">
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Trash className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-destructive">Excluir conta</h3>
                  <p className="text-sm text-muted-foreground">
                    Agende a exclusão para daqui a 7 dias. Você poderá cancelar por e-mail.
                  </p>
                </div>
              </div>
              <Button className="w-full" disabled={pending}
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setDeleteConfirmationText('');
                  setDeletePassword('');
                  setIsDeleteModalOpen(true);
                }}
              >
                Excluir Conta
              </Button>
            </div>
          </Card>
        </div>

        {/* Painel Direito: Configurações com Caixas Recolhidas */}
        <div className="space-y-4">

          {/* 1. SEÇÃO: E-MAIL */}
          <Card className="overflow-hidden transition-colors hover:border-[var(--border-light)]">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Envelope className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Endereço de E-mail</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Button disabled={pending}
                type="button"
                variant={activeTab === 'email' ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => {
                  setFeedback(null); clearSecrets();
                  setEmailStep('form');
                  setActiveTab(activeTab === 'email' ? 'none' : 'email');
                }}
                className="gap-1.5"
              >
                {activeTab === 'email' ? (
                  <><X className="size-3.5" /> Cancelar</>
                ) : (
                  <><PencilSimple className="size-3.5" /> Alterar</>
                )}
              </Button>
            </div>

            {/* Caixa Expandida: Formulário de E-mail */}
            {activeTab === 'email' && (
              <CardContent className="border-t border-border pt-5">
                {emailStep === 'form' ? (
                  <form onSubmit={handleRequestEmailPin} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-email">Novo endereço de e-mail</Label>
                      <Input
                        id="new-email"
                        type="email"
                        placeholder="novo.email@exemplo.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email-current-password">Senha atual para autorizar</Label>
                      <Input
                        aria-invalid={fieldError?.field === 'current_password'}
                        id="email-current-password"
                        type="password"
                        placeholder="Digite sua senha atual"
                        value={emailCurrentPassword}
                        onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      />
                    </div>

                    {fieldError && <p role="alert" className="text-destructive text-sm">{fieldError.message}</p>}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button disabled={pending}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { clearSecrets(); setActiveTab('none'); }}
                      >
                        Cancelar
                      </Button>
                      <Button disabled={pending} type="submit" size="sm" className="text-white gap-2">
                        Avançar e Enviar PIN <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmEmailChange} className="space-y-4">
                    <div className="rounded-lg bg-primary/10 p-3 text-xs text-primary">
                      Um código PIN de 6 dígitos foi enviado para <strong>{newEmail}</strong>.
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email-pin">Digite o código de 6 dígitos (PIN)</Label>
                      <Input
                        id="email-pin"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="font-mono text-center tracking-widest text-lg"
                        value={emailPin}
                        onChange={(e) => setEmailPin(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button disabled={pending}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEmailStep('form'); setEmailPin(''); }}
                        className="gap-1.5"
                      >
                        <ArrowLeft className="size-3.5" /> Voltar / Reenviar
                      </Button>
                      <Button disabled={pending} type="submit" size="sm" className="text-white">
                        Confirmar Novo E-mail
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            )}
          </Card>

          {/* 2. SEÇÃO: SENHA */}
          <Card className="overflow-hidden transition-colors hover:border-[var(--border-light)]">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[var(--brand-blue-light)]">
                  <LockKey className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Senha de Acesso</h3>
                  <p className="text-sm text-muted-foreground">•••••••••••• (protegida)</p>
                </div>
              </div>

              <Button disabled={pending}
                type="button"
                variant={activeTab === 'password' ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => {
                  setFeedback(null); clearSecrets();
                  setPasswordStep('form');
                  setActiveTab(activeTab === 'password' ? 'none' : 'password');
                }}
                className="gap-1.5"
              >
                {activeTab === 'password' ? (
                  <><X className="size-3.5" /> Cancelar</>
                ) : (
                  <><PencilSimple className="size-3.5" /> Alterar</>
                )}
              </Button>
            </div>

            {/* Caixa Expandida: Formulário de Senha */}
            {activeTab === 'password' && (
              <CardContent className="border-t border-border pt-5">
                {passwordStep === 'form' ? (
                  <form onSubmit={handleRequestPasswordPin} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pwd-current">Senha atual</Label>
                      <Input
                        aria-invalid={fieldError?.field === 'current_password'}
                        id="pwd-current"
                        type="password"
                        placeholder="Digite sua senha atual"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pwd-new">Nova senha</Label>
                      <Input
                        aria-invalid={fieldError?.field === 'new_password'}
                        aria-describedby="new-password-rules"
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                        id="pwd-new"
                        type="password"
                        placeholder="8–128 caracteres, maiúscula, minúscula, número e símbolo"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <div id="new-password-rules"><PasswordChecklist password={newPassword} /></div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
                      <Input
                        id="pwd-confirm"
                        type="password"
                        placeholder="Repita a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>

                    {fieldError && <p role="alert" className="text-destructive text-sm">{fieldError.message}</p>}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button disabled={pending}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { clearSecrets(); setActiveTab('none'); }}
                      >
                        Cancelar
                      </Button>
                      <Button disabled={pending} type="submit" size="sm" className="text-white gap-2">
                        Avançar e Enviar PIN <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmPasswordChange} className="space-y-4">
                    <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-300">
                      Enviamos um código PIN de 6 dígitos para o seu e-mail cadastrado (<strong>{user?.email}</strong>).
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="password-pin">Código de Confirmação (PIN)</Label>
                      <Input
                        id="password-pin"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        className="font-mono text-center tracking-widest text-lg"
                        value={passwordPin}
                        onChange={(e) => setPasswordPin(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button disabled={pending}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setPasswordStep('form'); setPasswordPin(''); }}
                        className="gap-1.5"
                      >
                        <ArrowLeft className="size-3.5" /> Voltar / Reenviar
                      </Button>
                      <Button disabled={pending} type="submit" size="sm" className="text-white">
                        Atualizar Senha
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            )}
          </Card>

          <Card><CardHeader><CardTitle>Exportar meus dados</CardTitle>
            <CardDescription>Baixe um JSON com sua conta, notas e importações.</CardDescription></CardHeader>
            <CardContent><form onSubmit={handleExport} className="space-y-3">
              <Label htmlFor="export-password">Confirme sua senha atual</Label>
              <Input id="export-password" type="password" required value={exportPassword} onChange={e => setExportPassword(e.target.value)} />
              <Button type="submit" disabled={pending || !exportPassword}>Baixar meus dados</Button>
            </form></CardContent></Card>

        </div>
      </div>

      {/* Modal / Dialog de Exclusão LGPD (Apenas Senha + Digitar EXCLUIR, sem PIN) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => { if (!pending) { setIsDeleteModalOpen(open); setDeletePassword(''); setDeleteConfirmationText(''); } }}>
        <DialogContent className="app-shell-theme space-y-5 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <WarningCircle className="size-5" /> Agendar exclusão da conta
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left pt-2">
              Sua conta ficará bloqueada e as sessões serão encerradas. Seus dados serão preservados
              por 7 dias e enviaremos um link por e-mail para cancelar nesse prazo. Se o aviso não
              puder ser enviado, a exclusão não será agendada. Após o prazo, a limpeza definitiva
              removerá sua conta, notas, itens e importações. Produtos e estabelecimentos compartilhados
              permanecem, assim como um registro operacional temporário sem vínculo com sua conta.
              Backups anteriores seguem a política do operador. Aguarde importações ativas antes de solicitar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {feedback?.type === 'error' && <p role="alert" className="text-destructive">{feedback.message}</p>}
            <div className="grid gap-2">
              <Label htmlFor="delete-confirm-text">
                Digite a palavra <strong className="text-foreground">EXCLUIR</strong> para confirmar:
              </Label>
              <Input
                id="delete-confirm-text"
                type="text"
                placeholder="EXCLUIR"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="delete-confirm-password">Sua senha atual para confirmação:</Label>
              <Input
                id="delete-confirm-password"
                type="password"
                placeholder="Digite sua senha"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-2">
            <Button disabled={pending}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setIsDeleteModalOpen(false); setDeletePassword(''); setDeleteConfirmationText(''); }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending || !isDeleteConfirmed || !deletePassword}
              onClick={handleDeleteAccount}
            >
              <Trash className="size-4" /> Agendar exclusão em 7 dias
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
