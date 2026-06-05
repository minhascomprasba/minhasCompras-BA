import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { pickDefaultCameraId } from '../utils/pickBackCamera';
import { QR_SCANNER_CONFIG } from '../utils/qrScannerConfig';

type QrCodeScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
};

const noopFrameError = () => undefined;

export function QrCodeScanner({ isOpen, onClose, onScan }: QrCodeScannerProps) {
  const readerId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onClose, onScan]);

  const onScanSuccess = useCallback((decodedText: string) => {
    if (hasScannedRef.current) {
      return;
    }
    hasScannedRef.current = true;
    onScanRef.current(decodedText);

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

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      setError('');
      void stopScanner();
      return;
    }

    let cancelled = false;
    hasScannedRef.current = false;
    setError('');
    setIsStarting(true);

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
          setError(
            'Não foi possível acessar a câmera. Verifique as permissões ou use o envio de imagem.',
          );
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
      void stopScanner();
    };
  }, [isOpen, readerId, onScanSuccess, stopScanner]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="qr-scanner-overlay" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
      <div className="qr-scanner-panel card">
        <h2 id="qr-scanner-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          Ler QR Code da nota
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          Aponte a câmera traseira principal para o QR Code impresso na nota fiscal.
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

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '1.25rem' }}
          onClick={() => {
            void stopScanner().then(onClose);
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
