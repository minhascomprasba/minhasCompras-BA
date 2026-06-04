import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const SCANNER_CONFIG = {
  fps: 10,
  qrbox: { width: 250, height: 250 },
} as const;

type QrCodeScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
};

export function QrCodeScanner({ isOpen, onClose, onScan }: QrCodeScannerProps) {
  const readerId = useId().replace(/:/g, '');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

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
      const scanner = new Html5Qrcode(readerId, false);
      scannerRef.current = scanner;

      const onSuccess = (decodedText: string) => {
        if (hasScannedRef.current) {
          return;
        }
        hasScannedRef.current = true;
        onScan(decodedText);
        void stopScanner().then(onClose);
      };

      try {
        await scanner.start(
          { facingMode: 'environment' },
          SCANNER_CONFIG,
          onSuccess,
          () => {
            // erros de leitura entre frames são esperados; ignorar
          },
        );
      } catch {
        try {
          await scanner.start(
            { facingMode: 'user' },
            SCANNER_CONFIG,
            onSuccess,
            () => undefined,
          );
        } catch {
          if (!cancelled) {
            setError(
              'Não foi possível acessar a câmera. Verifique as permissões ou use o envio de imagem.',
            );
          }
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
  }, [isOpen, readerId, onClose, onScan, stopScanner]);

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
          Aponte a câmera para o QR Code impresso na nota fiscal.
        </p>

        <div
          id={readerId}
          className="qr-scanner-viewport"
          style={{ minHeight: isStarting ? '240px' : undefined }}
        />

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
