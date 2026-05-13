import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStartImport, useSubmitCaptcha } from '../features/imports/hooks/useImportMutations';
import { importsService } from '../features/imports/services/importsService';

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
  const [importId, setImportId] = useState<string | null>(null);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);

  const startImportMutation = useStartImport();
  const submitCaptchaMutation = useSubmitCaptcha(importId || '');

  const keyForm = useForm<AccessKeyFormData>({
    resolver: zodResolver(accessKeySchema),
    defaultValues: { access_key: '' },
  });

  const captchaForm = useForm<CaptchaFormData>({
    resolver: zodResolver(captchaSchema),
    defaultValues: { captcha_code: '' },
  });

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
      onSuccess: () => navigate(`/importacoes/${importId}`),
      onError: (error) => {
        if (error.code === 'INVALID_CAPTCHA') {
          captchaForm.reset();
          setCaptchaRefreshKey(prev => prev + 1);
        } else if (error.code === 'CAPTCHA_EXPIRED' || error.code === 'MAX_CAPTCHA_ATTEMPTS_REACHED') {
          setImportId(null);
          keyForm.reset();
        }
      }
    });
  };

  return (
    <div className="container" style={{ maxWidth: '600px', marginTop: '2rem' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Nova Importação</h1>

      {!importId ? (
        <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <h2 style={{ fontSize: '1.25rem' }}>1. Informe a chave de acesso</h2>
          <p>Digite a chave de 44 dígitos numéricos presente na sua nota fiscal.</p>

          <form onSubmit={keyForm.handleSubmit(onKeySubmit)}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Ex: 29210112345678901234550010001234561000123456"
                className={`form-input ${keyForm.formState.errors.access_key ? 'error' : ''}`}
                maxLength={44}
                {...keyForm.register('access_key')}
              />
              {keyForm.formState.errors.access_key && (
                <span className="form-error-text">{keyForm.formState.errors.access_key.message}</span>
              )}
            </div>

            {startImportMutation.isError && (
              <div className="alert alert-error">
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>{startImportMutation.error.message}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={startImportMutation.isPending}>
              {startImportMutation.isPending ? 'Validando chave...' : 'Avançar'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <h2 style={{ fontSize: '1.25rem' }}>2. Validação de Segurança</h2>
          <p>Resolva o captcha para autorizar a consulta da nota na SEFAZ.</p>

          <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <img 
              src={`${importsService.getCaptchaImageUrl(importId)}?t=${captchaRefreshKey}`} 
              alt="Captcha" 
              style={{ maxHeight: '80px', objectFit: 'contain', filter: 'invert(1) hue-rotate(180deg) brightness(1.2)' }}
            />
          </div>

          <form onSubmit={captchaForm.handleSubmit(onCaptchaSubmit)}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Digite os caracteres da imagem"
                className={`form-input ${captchaForm.formState.errors.captcha_code ? 'error' : ''}`}
                autoComplete="off"
                {...captchaForm.register('captcha_code')}
              />
              {captchaForm.formState.errors.captcha_code && (
                <span className="form-error-text">{captchaForm.formState.errors.captcha_code.message}</span>
              )}
            </div>

            {submitCaptchaMutation.isError && (
              <div className="alert alert-error">
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>{submitCaptchaMutation.error.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setImportId(null); keyForm.reset(); startImportMutation.reset(); }} disabled={submitCaptchaMutation.isPending}>
                Voltar
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitCaptchaMutation.isPending}>
                {submitCaptchaMutation.isPending ? 'Enviando...' : 'Confirmar Captcha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
