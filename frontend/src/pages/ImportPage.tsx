import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStartImport, useSubmitCaptcha } from '../features/imports/hooks/useImportMutations';
import { importsService } from '../features/imports/services/importsService';

// Zod schemas for validation
const accessKeySchema = z.object({
  access_key: z
    .string()
    .length(44, 'A chave de acesso deve conter exatamente 44 dígitos.')
    .regex(/^\d+$/, 'A chave de acesso deve conter apenas números.'),
});

const captchaSchema = z.object({
  captcha_code: z.string().min(1, 'O código do captcha é obrigatório.'),
});

type AccessKeyFormData = z.infer<typeof accessKeySchema>;
type CaptchaFormData = z.infer<typeof captchaSchema>;

export function ImportPage() {
  const navigate = useNavigate();
  
  // Local state to track which step we are in
  const [importId, setImportId] = useState<string | null>(null);
  // We use a counter to force browser to reload the image if captcha fails
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);

  // Mutations
  const startImportMutation = useStartImport();
  const submitCaptchaMutation = useSubmitCaptcha(importId || '');

  // Form 1: Access Key
  const keyForm = useForm<AccessKeyFormData>({
    resolver: zodResolver(accessKeySchema),
    defaultValues: { access_key: '' },
  });

  // Form 2: Captcha
  const captchaForm = useForm<CaptchaFormData>({
    resolver: zodResolver(captchaSchema),
    defaultValues: { captcha_code: '' },
  });

  // Handlers
  const onKeySubmit = (data: AccessKeyFormData) => {
    startImportMutation.mutate(data, {
      onSuccess: (response) => {
        setImportId(response.import_id);
      },
    });
  };

  const onCaptchaSubmit = (data: CaptchaFormData) => {
    if (!importId) return;

    submitCaptchaMutation.mutate(data, {
      onSuccess: () => {
        // Redireciona para a tela de status da importação
        navigate(`/importacoes/${importId}`);
      },
      onError: (error) => {
        // Se o captcha for inválido, limpa o campo e recarrega a imagem
        if (error.code === 'INVALID_CAPTCHA') {
          captchaForm.reset();
          setCaptchaRefreshKey(prev => prev + 1);
        } else if (error.code === 'CAPTCHA_EXPIRED' || error.code === 'MAX_CAPTCHA_ATTEMPTS_REACHED') {
          // Volta para o inicio
          setImportId(null);
          keyForm.reset();
        }
      }
    });
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}>
      <h1>Nova Importação</h1>

      {!importId ? (
        // Passo 1: Informar Chave
        <div style={{ padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '1.5rem' }}>
          <h2>1. Informe a chave de acesso</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Digite a chave de 44 dígitos numéricos presente na sua nota fiscal.
          </p>

          <form onSubmit={keyForm.handleSubmit(onKeySubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <input
                type="text"
                placeholder="Ex: 29210112345678901234550010001234561000123456"
                {...keyForm.register('access_key')}
                maxLength={44}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: keyForm.formState.errors.access_key ? '1px solid red' : '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
              {keyForm.formState.errors.access_key && (
                <span style={{ color: 'red', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  {keyForm.formState.errors.access_key.message}
                </span>
              )}
            </div>

            {startImportMutation.isError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                {startImportMutation.error.message}
              </div>
            )}

            <button
              type="submit"
              disabled={startImportMutation.isPending}
              style={{
                padding: '0.75rem',
                backgroundColor: startImportMutation.isPending ? '#94a3b8' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: startImportMutation.isPending ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {startImportMutation.isPending ? 'Validando...' : 'Avançar'}
            </button>
          </form>
        </div>
      ) : (
        // Passo 2: Captcha
        <div style={{ padding: '2rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '1.5rem' }}>
          <h2>2. Validação de Segurança</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Resolva o captcha para autorizar a consulta da nota.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '4px' }}>
            <img 
              src={`${importsService.getCaptchaImageUrl(importId)}?t=${captchaRefreshKey}`} 
              alt="Captcha" 
              style={{ maxHeight: '100px', objectFit: 'contain' }}
            />
          </div>

          <form onSubmit={captchaForm.handleSubmit(onCaptchaSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <input
                type="text"
                placeholder="Digite os caracteres da imagem"
                {...captchaForm.register('captcha_code')}
                autoComplete="off"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: captchaForm.formState.errors.captcha_code ? '1px solid red' : '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />
              {captchaForm.formState.errors.captcha_code && (
                <span style={{ color: 'red', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                  {captchaForm.formState.errors.captcha_code.message}
                </span>
              )}
            </div>

            {submitCaptchaMutation.isError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                {submitCaptchaMutation.error.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setImportId(null);
                  keyForm.reset();
                  startImportMutation.reset();
                }}
                disabled={submitCaptchaMutation.isPending}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'transparent',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Voltar
              </button>

              <button
                type="submit"
                disabled={submitCaptchaMutation.isPending}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  backgroundColor: submitCaptchaMutation.isPending ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submitCaptchaMutation.isPending ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {submitCaptchaMutation.isPending ? 'Enviando...' : 'Confirmar Captcha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
