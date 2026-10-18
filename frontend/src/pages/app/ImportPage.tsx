import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStartImport, useSubmitCaptcha } from '../../features/imports/hooks/useImportMutations';
import { importsService } from '../../features/imports/services/importsService';
import { QrCodeScanner } from '../../features/imports/components/QrCodeScanner';
import { extractAccessKeyFromQrContent, validateAccessKey } from '../../features/imports/utils/extractAccessKey';
import { scanQrCodeFromFile } from '../../features/imports/utils/scanQrFromFile';
import { consumeQuickScan } from '../../features/imports/utils/quickScanStorage';
import { ImageUploadIcon, QrCodeIcon } from '../../components/ImportActionIcons';
import type { ImportSource } from '../../features/imports/types';
import { CircleNotch as LoaderCircle } from '@phosphor-icons/react';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

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
    <div className="mx-auto w-full max-w-xl space-y-6 px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <h1 className="mb-0 text-2xl font-semibold text-foreground">Nova Importação</h1>

      <QrCodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(decodedText) => handleQrDecodedText(decodedText, 'QR_CODE')}
        onFile={(decodedText) => handleQrDecodedText(decodedText, 'PHOTO')}
      />

      {!importId ? (
        <Card>
          <CardHeader>
            <h2 className="m-0 text-lg font-semibold text-foreground">Informe a chave de acesso</h2>
            <CardDescription>Use o QR Code da nota, envie uma foto ou digite a chave de 44 dígitos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={isBusy}
                onClick={() => { setQrFeedback(null); setIsScannerOpen(true); }}
              >
                <QrCodeIcon /> Ler QR Code
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={isBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {isFileScanning ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ImageUploadIcon />}
                {isFileScanning ? 'Lendo imagem...' : 'Enviar imagem'}
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" aria-hidden="true" tabIndex={-1} onChange={handleFileSelected} />

            {qrFeedback && (
              <Alert
                variant={qrFeedback.type === 'error' ? 'destructive' : 'default'}
                className={qrFeedback.type === 'success' ? 'border-primary/30 bg-primary/10 text-primary' : undefined}
              >
                {qrFeedback.message}
              </Alert>
            )}

            <form onSubmit={keyForm.handleSubmit(onKeySubmit)} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="access_key">Chave de acesso (44 dígitos)</Label>
                <Input
                  id="access_key"
                  type="text"
                  inputMode="numeric"
                  placeholder="Digite a chave de 44 dígitos"
                  className="font-mono text-foreground"
                  maxLength={44}
                  aria-invalid={!!keyForm.formState.errors.access_key}
                  aria-describedby={keyForm.formState.errors.access_key ? 'access-key-error' : undefined}
                  {...keyForm.register('access_key', {
                    onChange: () => { setQrFeedback(null); setSource('MANUAL'); },
                  })}
                />
                {keyForm.formState.errors.access_key && (
                  <span id="access-key-error" role="alert" className="text-sm text-destructive">{keyForm.formState.errors.access_key.message}</span>
                )}
              </div>
              {startImportMutation.isError && <Alert variant="destructive">{startImportMutation.error.message}</Alert>}
              <Button type="submit" className="min-h-11 w-full text-white" disabled={isBusy}>
                {startImportMutation.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                {startImportMutation.isPending ? 'Validando chave...' : 'Avançar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="m-0 text-lg font-semibold text-foreground">Validação de Segurança</h2>
            <CardDescription>Resolva o captcha para autorizar a consulta da nota na SEFAZ.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex min-h-28 items-center justify-center rounded-lg border border-border bg-background p-4">
              {isCaptchaLoading ? (
                <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Carregando captcha...
                </div>
              ) : captchaImageSrc ? (
                <img src={captchaImageSrc} alt="Captcha" className="max-h-20 object-contain" />
              ) : (
                <Alert variant="destructive">{captchaImageError || 'Captcha indisponível.'}</Alert>
              )}
            </div>
            <form onSubmit={captchaForm.handleSubmit(onCaptchaSubmit)} className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="captcha_code">Caracteres da imagem</Label>
                <Input
                  id="captcha_code"
                  type="text"
                  placeholder="Digite os caracteres da imagem"
                  autoComplete="off"
                  aria-invalid={!!captchaForm.formState.errors.captcha_code}
                  aria-describedby={captchaForm.formState.errors.captcha_code ? 'captcha-code-error' : undefined}
                  {...captchaForm.register('captcha_code')}
                />
                {captchaForm.formState.errors.captcha_code && (
                  <span id="captcha-code-error" role="alert" className="text-sm text-destructive">{captchaForm.formState.errors.captcha_code.message}</span>
                )}
              </div>
              {submitCaptchaMutation.isError && <Alert variant="destructive">{submitCaptchaMutation.error.message}</Alert>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button type="button" variant="outline" className="min-h-11 sm:flex-1" onClick={resetImport} disabled={submitCaptchaMutation.isPending}>Voltar</Button>
                <Button type="submit" className="min-h-11 text-white sm:flex-2" disabled={submitCaptchaMutation.isPending}>
                  {submitCaptchaMutation.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
                  {submitCaptchaMutation.isPending ? 'Enviando...' : 'Confirmar Captcha'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
