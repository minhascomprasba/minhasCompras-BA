import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user, role, logout } = useAuth();
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

  // =========================================================================
  // HANDLERS: FLUXO DE TROCA DE E-MAIL
  // =========================================================================

  const handleRequestEmailPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !emailCurrentPassword) {
      setFeedback({ type: 'error', message: 'Preencha o novo e-mail e sua senha atual.' });
      return;
    }

    // -----------------------------------------------------------------------
    // TODO: Disparar solicitação de envio de PIN para o novo e-mail
    // Payload esperado: { new_email: newEmail, current_password: emailCurrentPassword }
    // Endpoint sugerido: POST /auth/email-change/request
    // -----------------------------------------------------------------------

    setFeedback({
      type: 'success',
      message: `Código PIN enviado para ${newEmail}. Insira o código abaixo para validar.`,
    });
    setEmailStep('pin');
  };

  const handleConfirmEmailChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailPin.trim().length !== 6) {
      setFeedback({ type: 'error', message: 'O PIN deve conter exatamente 6 dígitos.' });
      return;
    }

    // -----------------------------------------------------------------------
    // TODO: Validar o PIN de 6 dígitos e salvar o novo e-mail
    // Payload esperado: { new_email: newEmail, code: emailPin }
    // Endpoint sugerido: POST /auth/email-change/verify ou PATCH /auth/me/email
    // Em caso de sucesso: atualizar o estado local de user ou revalidar via AuthContext
    // -----------------------------------------------------------------------

    setFeedback({ type: 'success', message: 'E-mail atualizado com sucesso!' });
    setActiveTab('none');
    setEmailStep('form');
    setNewEmail('');
    setEmailCurrentPassword('');
    setEmailPin('');
  };

  // =========================================================================
  // HANDLERS: FLUXO DE TROCA DE SENHA
  // =========================================================================

  const handleRequestPasswordPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ type: 'error', message: 'Preencha todos os campos da senha.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'A nova senha e a confirmação não coincidem.' });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'A nova senha deve ter no mínimo 8 caracteres.' });
      return;
    }

    // -----------------------------------------------------------------------
    // TODO: Solicitar PIN de alteração de senha enviado ao e-mail atual do usuário
    // Payload esperado: { current_password: currentPassword, new_password: newPassword }
    // Endpoint sugerido: POST /auth/password-change/request
    // -----------------------------------------------------------------------

    setFeedback({
      type: 'success',
      message: `Código de segurança (PIN) enviado para seu e-mail ${user?.email}.`,
    });
    setPasswordStep('pin');
  };

  const handleConfirmPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordPin.trim().length !== 6) {
      setFeedback({ type: 'error', message: 'O PIN deve conter exatamente 6 dígitos.' });
      return;
    }

    // -----------------------------------------------------------------------
    // TODO: Validar o PIN e persistir a nova senha
    // Payload esperado: { code: passwordPin, new_password: newPassword }
    // Endpoint sugerido: POST /auth/password-change/verify ou PATCH /auth/me/password
    // -----------------------------------------------------------------------

    setFeedback({ type: 'success', message: 'Senha redefinida com sucesso!' });
    setActiveTab('none');
    setPasswordStep('form');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordPin('');
  };

  // =========================================================================
  // HANDLERS: EXCLUSÃO DE CONTA (LGPD - ART. 18, INCISO VI)
  // =========================================================================

  const handleDeleteAccount = () => {
    // -----------------------------------------------------------------------
    // TODO: Chamar endpoint de exclusão definitiva da própria conta
    // Payload esperado: { password: deletePassword }
    // Endpoint sugerido: DELETE /auth/me ou DELETE /usuarios/me
    // Em caso de sucesso:
    //   1. logout() (limpa localStorage e AuthContext)
    //   2. navigate('/') (redireciona para a landing page)
    // -----------------------------------------------------------------------

    setIsDeleteModalOpen(false);
    logout();
    navigate('/');
  };

  const isDeleteConfirmed = deleteConfirmationText.trim().toUpperCase() === 'EXCLUIR';

  return (
    <div data-scope="profile" className="page-layout">
      <header className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Gestão do Perfil</h1>
          <p className="page-description">
            Gerencie suas credenciais de acesso, segurança e privacidade conforme a LGPD.
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
          <span>{feedback.message}</span>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Painel Esquerdo: Resumo do Usuário */}
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
              <span>Seus dados são protegidos e tratados sob as diretrizes da Lei nº 13.709/2018 (LGPD).</span>
            </div>
          </CardContent>
        </Card>

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

              <Button
                type="button"
                variant={activeTab === 'email' ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => {
                  setFeedback(null);
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
                        id="email-current-password"
                        type="password"
                        placeholder="Digite sua senha atual"
                        value={emailCurrentPassword}
                        onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setActiveTab('none')}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" className="text-white gap-2">
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
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEmailStep('form')}
                        className="gap-1.5"
                      >
                        <ArrowLeft className="size-3.5" /> Voltar
                      </Button>
                      <Button type="submit" size="sm" className="text-white">
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

              <Button
                type="button"
                variant={activeTab === 'password' ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => {
                  setFeedback(null);
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
                        id="pwd-new"
                        type="password"
                        placeholder="Mínimo 8 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
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

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setActiveTab('none')}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" className="text-white gap-2">
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
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setPasswordStep('form')}
                        className="gap-1.5"
                      >
                        <ArrowLeft className="size-3.5" /> Voltar
                      </Button>
                      <Button type="submit" size="sm" className="text-white">
                        Atualizar Senha
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            )}
          </Card>

          {/* 3. SEÇÃO: ZONA DE PERIGO (LGPD) */}
          <Card className="border-destructive/30 bg-destructive/5 transition-colors hover:border-destructive/50">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Trash className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-destructive">Zona de Perigo — Exclusão de Conta (LGPD)</h3>
                  <p className="text-sm text-muted-foreground">
                    Eliminação definitiva de dados sob o Art. 18, inciso VI da LGPD.
                  </p>
                </div>
              </div>
              <Button
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
      </div>

      {/* Modal / Dialog de Exclusão LGPD (Apenas Senha + Digitar EXCLUIR, sem PIN) */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="app-shell-theme space-y-5 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <WarningCircle className="size-5" /> Confirmação de Exclusão Definitiva (LGPD)
            </DialogTitle>
            <DialogDescription className="space-y-2 text-left pt-2">
              <p>
                Tem certeza de que deseja excluir permanentemente a conta vinculada a <strong>{user?.email}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                Todas as notas fiscais importadas, histórico de produtos e dados de telemetria serão completamente eliminados. Essa ação não pode ser desfeita.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!isDeleteConfirmed || !deletePassword}
              onClick={handleDeleteAccount}
            >
              <Trash className="size-4" /> Confirmar e Excluir Definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}