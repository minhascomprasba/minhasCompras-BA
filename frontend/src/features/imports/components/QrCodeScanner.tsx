import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { pickDefaultCameraId, rankBackCameras } from '../utils/pickBackCamera';
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
const CAMERA_HINT_DELAY_MS = 5000;

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
  const cameraIdsRef = useRef<string[]>([]);
  const activeCameraIdRef = useRef<string | null>(null);
  const isSwitchingRef = useRef(false);

  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [showGalleryHint, setShowGalleryHint] = useState(false);
  const [showCameraHint, setShowCameraHint] = useState(false);
  const [hasOtherCamera, setHasOtherCamera] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

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
    scannerRef.current = null;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // ignorar falha ao parar
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

  const switchCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    const cameraIds = cameraIdsRef.current;
    if (!scanner?.isScanning || cameraIds.length < 2 || isSwitchingRef.current) {
      return;
    }

    const previousId = activeCameraIdRef.current;
    const currentIndex = cameraIds.indexOf(previousId ?? cameraIds[0]);
    const nextId = cameraIds[(currentIndex + 1) % cameraIds.length];
    isSwitchingRef.current = true;
    setIsSwitching(true);
    setError('');

    try {
      await scanner.stop();
      if (scannerRef.current !== scanner) {
        return;
      }
      await scanner.start(nextId, QR_SCANNER_CONFIG, onScanSuccess, noopFrameError);
      activeCameraIdRef.current = nextId;
    } catch {
      if (scannerRef.current === scanner) {
        try {
          await scanner.start(
            previousId ?? { facingMode: 'environment' },
            QR_SCANNER_CONFIG,
            onScanSuccess,
            noopFrameError,
          );
          activeCameraIdRef.current = previousId;
        } catch {
          setShowGalleryHint(true);
          setHasOtherCamera(false);
        }
        setError('Não foi possível trocar a câmera. Tente enviar uma imagem da nota.');
      }
    } finally {
      isSwitchingRef.current = false;
      setIsSwitching(false);
    }
  }, [onScanSuccess]);

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      setError('');
      setShowGalleryHint(false);
      setShowCameraHint(false);
      setHasOtherCamera(false);
      setIsFileScanning(false);
      cameraIdsRef.current = [];
      activeCameraIdRef.current = null;
      void stopScanner();
      return;
    }

    let cancelled = false;
    hasScannedRef.current = false;
    setError('');
    setShowGalleryHint(false);
    setShowCameraHint(false);
    setHasOtherCamera(false);
    setIsStarting(true);

    const cameraHintTimer = window.setTimeout(() => {
      if (!cancelled && !hasScannedRef.current) {
        setShowCameraHint(true);
      }
    }, Math.min(CAMERA_HINT_DELAY_MS, galleryHintDelayMs / 2));

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
        const rankedCameras = rankBackCameras(devices);
        const rankedIds = new Set(rankedCameras.map((camera) => camera.id));
        cameraIdsRef.current = [
          ...rankedCameras.map((camera) => camera.id),
          ...devices.filter((camera) => !rankedIds.has(camera.id)).map((camera) => camera.id),
        ];
        setHasOtherCamera(cameraIdsRef.current.length > 1);

        if (cameraId) {
          try {
            await html5QrCode.start(cameraId, QR_SCANNER_CONFIG, onScanSuccess, noopFrameError);
            activeCameraIdRef.current = cameraId;
          } catch {
            await html5QrCode.start(
              { facingMode: 'environment' },
              QR_SCANNER_CONFIG,
              onScanSuccess,
              noopFrameError,
            );
            activeCameraIdRef.current = null;
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
          setHasOtherCamera(false);
        }
      } finally {
        if (cancelled) {
          try {
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
            html5QrCode.clear();
          } catch {
            // ignorar falha ao parar uma câmera aberta após fechar o scanner
          }
        }
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      window.clearTimeout(cameraHintTimer);
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

        {(isStarting || isSwitching) && (
          <p style={{ textAlign: 'center', marginTop: '0.75rem', color: 'var(--text-muted)' }}>
            {isSwitching ? 'Trocando câmera...' : 'Iniciando câmera...'}
          </p>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop: '1rem', marginBottom: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {showCameraHint && !isStarting && !error && (
          hasOtherCamera ? (
            <button
              type="button"
              className="qr-scanner-gallery-hint"
              disabled={isSwitching || isFileScanning}
              onClick={() => void switchCamera()}
            >
              O QR Code não está focando? Trocar câmera
            </button>
          ) : (
            <p className="qr-scanner-gallery-hint qr-scanner-camera-info" role="status">
              O QR Code não está focando? Tente trocar de câmera nas configurações do navegador.
              Apenas uma câmera foi detectada agora.
            </p>
          )
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
