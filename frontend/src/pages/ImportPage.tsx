import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStartImport, useSubmitCaptcha } from '../features/imports/hooks/useImportMutations';
import { importsService } from '../features/imports/services/importsService';
import { QrCodeScanner } from '../features/imports/components/QrCodeScanner';
import { extractAccessKeyFromQrContent, validateAccessKey } from '../features/imports/utils/extractAccessKey';
import { scanQrCodeFromFile } from '../features/imports/utils/scanQrFromFile';
import { consumeQuickScan } from '../features/imports/utils/quickScanStorage';
import { ImageUploadIcon, QrCodeIcon } from '../components/ImportActionIcons';
import type { ImportSource } from '../features/imports/types';

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
  const locationKey = useLocation().key;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const [captchaImageSrc, setCaptchaImageSrc] = useState<string | null>(null);
  const [captchaImageError, setCaptchaImageError] = useState<string>('');
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [qrFeedback, setQrFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  // Canal usado para preencher a chave: alimenta a telemetria do painel admin.
  const [source, setSource] = useState<ImportSource>('MANUAL');

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

  const applyAccessKey = (accessKey: string, origin: ImportSource) => {
    keyForm.setValue('access_key', accessKey, { shouldValidate: true, shouldDirty: true });
    keyForm.clearErrors('access_key');
    setSource(origin);
    setQrFeedback({ type: 'success', message: 'Chave de acesso preenchida. Confira os dados e clique em Avançar.' });
  };

  const resetImport = () => {
    setImportId(null);
    setCaptchaImageSrc((prevSrc) => {
      if (prevSrc) {
        URL.revokeObjectURL(prevSrc);
      }
      return null;
    });
    setCaptchaImageError('');
    setCaptchaRefreshKey(0);
    keyForm.reset();
    startImportMutation.reset();
    captchaForm.reset();
  };

  const startImportWithKey = (accessKey: string, source: ImportSource) => {
    startImportMutation.mutate({ access_key: accessKey, source }, {
      onSuccess: (response) => {
        setIsCaptchaLoading(true);
        setCaptchaImageSrc((prevSrc) => {
          if (prevSrc) {
            URL.revokeObjectURL(prevSrc);
          }
          return null;
        });
        setCaptchaImageError('');
        setImportId(response.import_id);
        setCaptchaRefreshKey(0);
      },
    });
  };

  // Consume a chave vinda do scanner rápido (botão de acesso rápido na interface).
  // Roda a cada navegação para /importar para suportar novas leituras sem remontar a página.
  useEffect(() => {
    const pending = consumeQuickScan();
    if (!pending.accessKey) {
      return;
    }

    const validationError = validateAccessKey(pending.accessKey);
    if (validationError) {
      setQrFeedback({ type: 'error', message: validationError });
      return;
    }

    const origin = pending.source ?? 'QR_CODE';
    resetImport();
    applyAccessKey(pending.accessKey, origin);

    if (pending.autoSubmit) {
      startImportWithKey(pending.accessKey, origin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);

  useEffect(() => {
    if (!importId) {
      return;
    }

    let cancelled = false;

    const loadCaptcha = async () => {
      try {
        const blob = await importsService.getCaptchaImageBlob(importId);
        if (cancelled) {
          return;
        }

        const nextSrc = URL.createObjectURL(blob);
        setCaptchaImageSrc((prevSrc) => {
          if (prevSrc) {
            URL.revokeObjectURL(prevSrc);
          }
          return nextSrc;
        });
      } catch {
        if (!cancelled) {
          setCaptchaImageError('Nao foi possivel carregar o captcha. Tente atualizar.');
          setCaptchaImageSrc(null);
        }
      } finally {
        if (!cancelled) {
          setIsCaptchaLoading(false);
        }
      }
    };

    loadCaptcha();

    return () => {
      cancelled = true;
    };
  }, [importId, captchaRefreshKey]);

  useEffect(() => {
    return () => {
      if (captchaImageSrc) {
        URL.revokeObjectURL(captchaImageSrc);
      }
    };
  }, [captchaImageSrc]);

  const handleQrDecodedText = (decodedText: string, origin: ImportSource): string | null => {
    const accessKey = extractAccessKeyFromQrContent(decodedText);
    if (!accessKey) {
      const message = 'QR Code lido, mas não foi possível extrair a chave de 44 dígitos da nota fiscal.';
      setQrFeedback({ type: 'error', message });
      return message;
    }

    const validationError = validateAccessKey(accessKey);
    if (validationError) {
      setQrFeedback({ type: 'error', message: validationError });
      return validationError;
    }

    applyAccessKey(accessKey, origin);
    return null;
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setQrFeedback(null);
    setIsFileScanning(true);

    try {
      const decodedText = await scanQrCodeFromFile(file);
      handleQrDecodedText(decodedText, 'PHOTO');
    } catch {
      setQrFeedback({
        type: 'error',
        message: 'Não foi possível ler o QR Code na imagem. Tente outra foto com boa iluminação.',
      });
    } finally {
      setIsFileScanning(false);
    }
  };

  const onKeySubmit = (data: AccessKeyFormData) => {
    startImportWithKey(data.access_key, source);
  };

  const onCaptchaSubmit = (data: CaptchaFormData) => {
    if (!importId) return;

    submitCaptchaMutation.mutate(data, {
      onSuccess: () => navigate(`/importacoes/${importId}`),
      onError: (error) => {
        if (error.code === 'INVALID_CAPTCHA') {
          setIsCaptchaLoading(true);
          setCaptchaImageError('');
          captchaForm.reset();
          setCaptchaRefreshKey(prev => prev + 1);
        } else if (error.code === 'CAPTCHA_EXPIRED' || error.code === 'MAX_CAPTCHA_ATTEMPTS_REACHED' || error.code === 'SESSION_EXPIRED') {
          setCaptchaImageSrc((prevSrc) => {
            if (prevSrc) {
              URL.revokeObjectURL(prevSrc);
            }
            return null;
          });
          setCaptchaImageError('');
          setImportId(null);
          keyForm.reset();
          setQrFeedback({ type: 'error', message: error.message });
        }
      }
    });
  };

  const isBusy = startImportMutation.isPending || isFileScanning;

  return (
    <div className="container container-small">
      <h1 className="text-center mb-8">Nova Importação</h1>

      <QrCodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(decodedText) => handleQrDecodedText(decodedText, 'QR_CODE')}
        onFile={(decodedText) => handleQrDecodedText(decodedText, 'PHOTO')}
      />

      {!importId ? (
        <div className="card card-animated">
          <h2 style={{ fontSize: '1.25rem' }}>1. Informe a chave de acesso</h2>
          <p>Use o QR Code da nota, envie uma foto ou digite a chave de 44 dígitos.</p>

          <div className="import-actions">
            <div className="import-actions-row">
              <button
                type="button"
                className="btn btn-secondary btn-icon-only"
                disabled={isBusy}
                aria-label="Ler QR Code"
                title="Ler QR Code"
                onClick={() => {
                  setQrFeedback(null);
                  setIsScannerOpen(true);
                }}
              >
                <QrCodeIcon />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon-only"
                disabled={isBusy}
                aria-label={isFileScanning ? 'Lendo imagem...' : 'Enviar imagem da nota'}
                title={isFileScanning ? 'Lendo imagem...' : 'Enviar imagem da nota'}
                onClick={() => fileInputRef.current?.click()}
              >
                {isFileScanning ? (
                  <span
                    className="spinner btn-icon-only-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <ImageUploadIcon />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={handleFileSelected}
            />
          </div>

          {qrFeedback && (
            <div className={`alert ${qrFeedback.type === 'error' ? 'alert-error' : 'alert-success-custom'}`}>
              <span style={{ fontSize: '1.2rem' }}>{qrFeedback.type === 'error' ? '⚠️' : '✓'}</span>
              <span>{qrFeedback.message}</span>
            </div>
          )}

          <form onSubmit={keyForm.handleSubmit(onKeySubmit)}>
            <div className="form-group">
              <label className="form-label" htmlFor="access_key">
                Chave de acesso (44 dígitos)
              </label>
              <input
                id="access_key"
                type="text"
                inputMode="numeric"
                placeholder="Digite a chave de 44 dígitos"
                className={`form-input ${keyForm.formState.errors.access_key ? 'error' : ''}`}
                maxLength={44}
                {...keyForm.register('access_key', {
                  onChange: () => {
                    setQrFeedback(null);
                    setSource('MANUAL');
                  },
                })}
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

            <button type="submit" className="btn btn-primary btn-full" disabled={isBusy}>
              {startImportMutation.isPending ? 'Validando chave...' : 'Avançar'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card card-animated">
          <h2 style={{ fontSize: '1.25rem' }}>2. Validação de Segurança</h2>
          <p>Resolva o captcha para autorizar a consulta da nota na SEFAZ.</p>

          <div className="captcha-image-wrapper">
            {isCaptchaLoading ? (
              <span>Carregando captcha...</span>
            ) : captchaImageSrc ? (
              <img
                src={captchaImageSrc}
                alt="Captcha"
                className="captcha-image"
              />
            ) : (
              <span>{captchaImageError || 'Captcha indisponível.'}</span>
            )}
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

            <div className="captcha-actions-wrapper">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => { setCaptchaImageSrc((prevSrc) => { if (prevSrc) { URL.revokeObjectURL(prevSrc); } return null; }); setCaptchaImageError(''); setImportId(null); setCaptchaRefreshKey(0); keyForm.reset(); startImportMutation.reset(); captchaForm.reset(); }} disabled={submitCaptchaMutation.isPending}>
                Voltar
              </button>
              <button type="submit" className="btn btn-primary flex-2" disabled={submitCaptchaMutation.isPending}>
                {submitCaptchaMutation.isPending ? 'Enviando...' : 'Confirmar Captcha'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
