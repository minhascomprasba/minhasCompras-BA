import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { pickDefaultCameraId } from '../utils/pickBackCamera';
import { QR_SCANNER_CONFIG } from '../utils/qrScannerConfig';
import { scanQrCodeFromFile } from '../utils/scanQrFromFile';
import { ImageUploadIcon } from '../../../components/ImportActionIcons';

type ScanOutcome = void | string | null;

type QrCodeScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Chamado ao ler um QR Code pela câmera.
   * Retornar uma string exibe o erro no scanner e mantém a câmera aberta;
   * retornar null/undefined encerra o scanner com sucesso.
   */
  onScan: (decodedText: string) => ScanOutcome;
  /** Chamado ao ler um QR Code a partir de uma imagem escolhida pelo usuário. */
  onFile?: (decodedText: string) => ScanOutcome;
  /** Tempo (ms) sem leitura antes de sugerir o envio de imagem. */
  galleryHintDelayMs?: number;
};

const noopFrameError = () => undefined;

export function QrCodeScanner({
  isOpen,
  onClose,
  onScan,
  onFile,
  galleryHintDelayMs = 10000,
}: QrCodeScannerProps) {
  const readerId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onScanRef = useRef(onScan);
  const onFileRef = useRef(onFile);
  const onCloseRef = useRef(onClose);

  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [showGalleryHint, setShowGalleryHint] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
    onFileRef.current = onFile;
    onCloseRef.current = onClose;
  }, [onClose, onFile, onScan]);

  const finishSuccess = useCallback(() => {
    const scanner = scannerRef.current;
    if (scanner?.isScanning) {
      void scanner.stop().then(() => {
        scannerRef.current = null;
        onCloseRef.current();
      });
      return;
    }
    scannerRef.current = null;
    onCloseRef.current();
  }, []);

  const onScanSuccess = useCallback((decodedText: string) => {
    if (hasScannedRef.current) {
      return;
    }
    hasScannedRef.current = true;

    const outcome = onScanRef.current(decodedText);
    if (outcome) {
      setError(outcome);
      window.setTimeout(() => {
        hasScannedRef.current = false;
      }, 1800);
      return;
    }

    finishSuccess();
  }, [finishSuccess]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // ignorar falha ao parar
    } finally {
      scannerRef.current = null;
    }
  }, []);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setError('');
    setIsFileScanning(true);

    try {
      const decodedText = await scanQrCodeFromFile(file);
      const handler = onFileRef.current ?? onScanRef.current;
      const outcome = handler(decodedText);
      if (outcome) {
        setError(outcome);
        return;
      }
      hasScannedRef.current = true;
      finishSuccess();
    } catch {
      setError('Não foi possível ler o QR Code na imagem. Tente outra foto com boa iluminação.');
    } finally {
      setIsFileScanning(false);
    }
  }, [finishSuccess]);

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      setError('');
      setShowGalleryHint(false);
      setIsFileScanning(false);
      void stopScanner();
      return;
    }

    let cancelled = false;
    hasScannedRef.current = false;
    setError('');
    setShowGalleryHint(false);
    setIsStarting(true);

    const hintTimer = window.setTimeout(() => {
      if (!cancelled && !hasScannedRef.current) {
        setShowGalleryHint(true);
      }
    }, galleryHintDelayMs);

    const startScanner = async () => {
      const html5QrCode = new Html5Qrcode(readerId, false);
      scannerRef.current = html5QrCode;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) {
          return;
        }

        const cameraId = pickDefaultCameraId(devices);

        if (cameraId) {
          try {
            await html5QrCode.start(cameraId, QR_SCANNER_CONFIG, onScanSuccess, noopFrameError);
          } catch {
            await html5QrCode.start(
              { facingMode: 'environment' },
              QR_SCANNER_CONFIG,
              onScanSuccess,
              noopFrameError,
            );
          }
        } else {
          await html5QrCode.start(
            { facingMode: 'environment' },
            QR_SCANNER_CONFIG,
            onScanSuccess,
            noopFrameError,
          );
        }
      } catch {
        if (!cancelled) {
          setError('Não foi possível acessar a câmera. Verifique as permissões ou envie uma imagem da nota.');
          setShowGalleryHint(true);
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      window.clearTimeout(hintTimer);
      void stopScanner();
    };
  }, [isOpen, readerId, onScanSuccess, stopScanner, galleryHintDelayMs]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="qr-scanner-overlay" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
      <div className="qr-scanner-panel card">
        <h2 id="qr-scanner-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          Escaneie o QR Code da nota
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Aponte a câmera para o QR Code impresso na nota fiscal.
        </p>

        <div id={readerId} className="qr-scanner-viewport" />

        {isStarting && (
          <p style={{ textAlign: 'center', marginTop: '0.75rem', color: 'var(--text-muted)' }}>
            Iniciando câmera...
          </p>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {(showGalleryHint || error) && (
          <button
            type="button"
            className="qr-scanner-gallery-hint"
            disabled={isFileScanning}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="qr-scanner-gallery-hint-icon" aria-hidden="true">
              {isFileScanning ? (
                <span className="spinner btn-icon-only-spinner" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              )}
            </span>
            <span>
              {isFileScanning
                ? 'Lendo imagem...'
                : 'Não consegue escanear? Envie uma foto do QR Code da nota pela galeria.'}
            </span>
          </button>
        )}

        <div className="qr-scanner-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isFileScanning}
            onClick={() => fileInputRef.current?.click()}
          >
            {isFileScanning ? (
              <span className="spinner btn-icon-only-spinner" aria-hidden="true" />
            ) : (
              <ImageUploadIcon />
            )}
            Enviar imagem
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isFileScanning}
            onClick={() => {
              void stopScanner().then(onClose);
            }}
          >
            Cancelar
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
    </div>
  );
}
