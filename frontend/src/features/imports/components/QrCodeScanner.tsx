import { CircleNotchIcon as LoaderCircle, CameraRotateIcon as SwitchCamera, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from '@phosphor-icons/react';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../../components/ui/sheet';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { decodeQrFromVideo, prepareQrDecoder } from '../utils/decodeQr';
import {
  getTrackZoom,
  getTrackZoomRange,
  openScanCamera,
  setTrackZoom,
  stopScanStream,
} from '../utils/openScanCamera';
import { listSwitchableCameras, pickDefaultCameraId, scoreCameraLabel } from '../utils/pickBackCamera';
import { scanQrCodeFromFile } from '../utils/scanQrFromFile';
import { ImageUploadIcon } from '../../../components/ImportActionIcons';

type ScanOutcome = void | string | null;

type QrCodeScannerProps = {
  presentation?: 'dialog' | 'drawer';
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

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function QrCodeScanner({
  presentation = 'dialog',
  isOpen,
  onClose,
  onScan,
  onFile,
  galleryHintDelayMs = 10000,
}: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const hasScannedRef = useRef(false);
  const fileScanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onScanRef = useRef(onScan);
  const onFileRef = useRef(onFile);
  const onCloseRef = useRef(onClose);
  const cameraIdsRef = useRef<string[]>([]);
  const activeCameraIdRef = useRef<string | null>(null);
  const isSwitchingRef = useRef(false);
  const decodeCropRef = useRef(1);

  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [showGalleryHint, setShowGalleryHint] = useState(false);
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [hasHardwareZoom, setHasHardwareZoom] = useState(false);
  const [openGeneration, setOpenGeneration] = useState(isOpen);

  if (openGeneration !== isOpen) {
    setOpenGeneration(isOpen);
    setError('');
    setShowGalleryHint(false);
    setCanSwitchCamera(false);
    setIsFileScanning(false);
    setIsSwitching(false);
    setIsStarting(isOpen);
    setZoom(1);
    setZoomMin(1);
    setZoomMax(1);
    setHasHardwareZoom(false);
  }

  useEffect(() => {
    onScanRef.current = onScan;
    onFileRef.current = onFile;
    onCloseRef.current = onClose;
  }, [onClose, onFile, onScan]);

  const stopScanner = useCallback(() => {
    sessionRef.current += 1;
    const stream = streamRef.current;
    streamRef.current = null;
    stopScanStream(stream);
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const finishSuccess = useCallback(() => {
    stopScanner();
    onCloseRef.current();
  }, [stopScanner]);

  const syncZoomFromStream = useCallback((stream: MediaStream) => {
    const range = getTrackZoomRange(stream);
    if (!range) {
      setHasHardwareZoom(false);
      setZoomMin(1);
      setZoomMax(2.4);
      // Sem zoom da câmera: aproximação visual para mirar o QR.
      setZoom(1.8);
      return;
    }
    const current = getTrackZoom(stream) ?? Math.min(range.max, Math.max(range.min, 2));
    setHasHardwareZoom(true);
    setZoomMin(range.min);
    setZoomMax(range.max);
    setZoom(current);
  }, []);

  const handleDecoded = useCallback((decodedText: string) => {
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

  const handleDecodedRef = useRef(handleDecoded);
  useEffect(() => {
    handleDecodedRef.current = handleDecoded;
  }, [handleDecoded]);

  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) {
      throw new Error('Prévia da câmera indisponível.');
    }
    video.srcObject = stream;
    video.muted = true;
    try {
      await video.play();
    } catch {
      // o loop de leitura tenta reproduzir de novo se a prévia ainda estiver oculta
    }
    streamRef.current = stream;
    activeCameraIdRef.current = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
    syncZoomFromStream(stream);
  }, [syncZoomFromStream]);

  const handleFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setError('');
    setIsFileScanning(true);
    fileScanningRef.current = true;

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
      fileScanningRef.current = false;
      setIsFileScanning(false);
    }
  }, [finishSuccess]);

  const applyZoom = useCallback(async (nextZoom: number) => {
    if (!hasHardwareZoom) {
      setZoom(Math.min(2.4, Math.max(1, nextZoom)));
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    const applied = await setTrackZoom(stream, nextZoom);
    if (applied != null) {
      setZoom(applied);
    }
  }, [hasHardwareZoom]);

  const switchCamera = useCallback(async () => {
    const cameraIds = cameraIdsRef.current;
    if (!streamRef.current || isSwitchingRef.current || cameraIds.length < 2) {
      return;
    }

    const session = sessionRef.current;
    const previousId = activeCameraIdRef.current;
    const startIndex = Math.max(0, cameraIds.indexOf(previousId ?? cameraIds[0]));
    isSwitchingRef.current = true;
    setIsSwitching(true);
    setError('');

    try {
      let nextStream: MediaStream | null = null;
      let previous: MediaStream | null = streamRef.current;

      for (let offset = 1; offset <= cameraIds.length; offset += 1) {
        const nextId = cameraIds[(startIndex + offset) % cameraIds.length];
        if (nextId === previousId && offset < cameraIds.length) {
          continue;
        }

        try {
          const candidate = await openScanCamera({
            deviceId: nextId,
            facingMode: 'environment',
            previousStream: previous,
          });
          previous = null;

          if (sessionRef.current !== session) {
            stopScanStream(candidate);
            return;
          }

          // Alguns aparelhos não rotulam a frontal; se o navegador marcar "user", pula.
          if (candidate.getVideoTracks()[0]?.getSettings().facingMode === 'user') {
            stopScanStream(candidate);
            cameraIdsRef.current = cameraIdsRef.current.filter((id) => id !== nextId);
            continue;
          }

          nextStream = candidate;
          break;
        } catch {
          // tenta a próxima lente traseira
        }
      }

      if (!nextStream) {
        throw new Error('Nenhuma câmera traseira disponível');
      }

      streamRef.current = null;
      await attachStream(nextStream);
      setCanSwitchCamera(cameraIdsRef.current.length > 1);
    } catch {
      if (sessionRef.current === session) {
        try {
          const restored = await openScanCamera({
            deviceId: previousId,
            facingMode: 'environment',
            previousStream: streamRef.current,
          });
          if (sessionRef.current !== session) {
            stopScanStream(restored);
            return;
          }
          streamRef.current = null;
          await attachStream(restored);
        } catch {
          setShowGalleryHint(true);
          setCanSwitchCamera(false);
        }
        setError('Não foi possível trocar a câmera. Tente enviar uma imagem da nota.');
        setShowGalleryHint(true);
      }
    } finally {
      isSwitchingRef.current = false;
      setIsSwitching(false);
    }
  }, [attachStream]);

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      fileScanningRef.current = false;
      cameraIdsRef.current = [];
      activeCameraIdRef.current = null;
      stopScanner();
      return;
    }

    const session = sessionRef.current;
    let cancelled = false;
    hasScannedRef.current = false;
    void prepareQrDecoder().catch(() => undefined);

    const hintTimer = window.setTimeout(() => {
      if (!cancelled && !hasScannedRef.current) {
        setShowGalleryHint(true);
      }
    }, galleryHintDelayMs);

    const isCurrent = () => !cancelled && sessionRef.current === session;

    const scanLoop = async () => {
      while (isCurrent()) {
        if (hasScannedRef.current || fileScanningRef.current || isSwitchingRef.current) {
          await wait(150);
          continue;
        }

        const video = videoRef.current;
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
          if (video?.paused) {
            void video.play().catch(() => undefined);
          }
          await wait(80);
          continue;
        }

        try {
          const text = await decodeQrFromVideo(video, decodeCropRef.current);
          if (!isCurrent() || hasScannedRef.current) {
            return;
          }
          if (text) {
            handleDecodedRef.current(text);
          }
        } catch {
          // tenta o próximo quadro
        }

        await wait(40);
      }
    };

    const waitForVideo = async () => {
      for (let attempt = 0; attempt < 30 && isCurrent(); attempt += 1) {
        if (videoRef.current) {
          return videoRef.current;
        }
        await wait(50);
      }
      return videoRef.current;
    };

    const startScanner = async () => {
      try {
        const stream = await openScanCamera({ facingMode: 'environment' });
        if (!isCurrent()) {
          stopScanStream(stream);
          return;
        }
        const video = await waitForVideo();
        if (!isCurrent()) {
          stopScanStream(stream);
          return;
        }
        if (!video) {
          stopScanStream(stream);
          throw new Error('Prévia da câmera indisponível.');
        }
        await attachStream(stream);

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!isCurrent()) {
          return;
        }

        const cameras = devices
          .filter((device) => device.kind === 'videoinput' && device.deviceId)
          .map((device) => ({ id: device.deviceId, label: device.label }));
        const switchable = listSwitchableCameras(cameras);
        cameraIdsRef.current = switchable.map((camera) => camera.id);
        // Só troca entre lentes traseiras; nunca usa a frontal.
        setCanSwitchCamera(switchable.length > 1);

        const currentId = activeCameraIdRef.current;
        const preferredId = pickDefaultCameraId(cameras);
        const preferred = cameras.find((camera) => camera.id === preferredId);
        const shouldPreferRanked = Boolean(
          preferredId
          && currentId
          && preferredId !== currentId
          && preferred?.label.trim()
          && scoreCameraLabel(preferred.label) > 0,
        );

        if (shouldPreferRanked && preferredId) {
          try {
            const preferredStream = await openScanCamera({
              deviceId: preferredId,
              facingMode: 'environment',
              previousStream: streamRef.current,
            });
            if (!isCurrent()) {
              stopScanStream(preferredStream);
              return;
            }
            streamRef.current = null;
            await attachStream(preferredStream);
          } catch {
            // mantém a câmera traseira que o navegador já escolheu
          }
        }

        if (isCurrent()) {
          void scanLoop();
        }
      } catch {
        if (isCurrent()) {
          setError('Não foi possível acessar a câmera. Verifique as permissões ou envie uma imagem da nota.');
          setShowGalleryHint(true);
          setCanSwitchCamera(false);
        }
      } finally {
        if (isCurrent()) {
          setIsStarting(false);
        }
      }
    };

    const startFrame = window.requestAnimationFrame(() => void startScanner());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(startFrame);
      window.clearTimeout(hintTimer);
      stopScanner();
    };
  }, [isOpen, attachStream, stopScanner, galleryHintDelayMs]);

  const closeScanner = () => {
    stopScanner();
    onClose();
  };

  const displayMin = hasHardwareZoom ? zoomMin : 1;
  const displayMax = hasHardwareZoom ? zoomMax : 2.4;
  const zoomStep = Math.max(0.1, (displayMax - displayMin) / 8);
  const previewScale = hasHardwareZoom ? 1 : Math.min(displayMax, Math.max(displayMin, zoom));
  const decodeCrop = hasHardwareZoom ? 1 : previewScale;

  useEffect(() => {
    decodeCropRef.current = decodeCrop;
  }, [decodeCrop]);

  const isDrawer = presentation === 'drawer';
  const Root = isDrawer ? Sheet : Dialog;
  const Content = isDrawer ? SheetContent : DialogContent;
  const Header = isDrawer ? SheetHeader : DialogHeader;
  const Title = isDrawer ? SheetTitle : DialogTitle;
  const Description = isDrawer ? SheetDescription : DialogDescription;

  return (
    <Root open={isOpen} onOpenChange={(open) => { if (!open) closeScanner(); }}>
      <Content
        {...(isDrawer ? { side: 'bottom' as const, showCloseButton: false } : {})}
        className={isDrawer
          ? 'app-shell-theme mx-auto max-h-[90dvh] w-full max-w-lg gap-5 overflow-y-auto rounded-t-2xl p-5 pb-[calc(1.25rem+var(--safe-bottom))]'
          : 'app-shell-theme space-y-5'}
      >
        <Header className="p-0">
          <Title>Escaneie o QR Code da nota</Title>
          <Description>Aponte a câmera para o QR Code impresso na nota fiscal.</Description>
        </Header>

        <div className="relative min-h-48 w-full overflow-hidden rounded-lg border border-border bg-black">
          <video
            ref={videoRef}
            className="aspect-[3/4] max-h-[52dvh] w-full object-cover sm:aspect-video"
            style={{ transform: `scale(${previewScale})`, transformOrigin: 'center center' }}
            muted
            playsInline
            autoPlay
          />
        </div>

        {!isStarting && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={isSwitching || isFileScanning || (hasHardwareZoom ? zoom : previewScale) <= displayMin + 0.001}
                aria-label="Diminuir zoom"
                onClick={() => void applyZoom((hasHardwareZoom ? zoom : previewScale) - zoomStep)}
              >
                <MagnifyingGlassMinusIcon aria-hidden="true" />
              </Button>
              <input
                type="range"
                min={displayMin}
                max={displayMax}
                step={Math.max(0.05, zoomStep / 2)}
                value={hasHardwareZoom ? zoom : previewScale}
                disabled={isSwitching || isFileScanning}
                aria-label="Zoom da câmera"
                className="h-2 w-full accent-primary"
                onChange={(event) => {
                  void applyZoom(Number(event.target.value));
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                disabled={isSwitching || isFileScanning || (hasHardwareZoom ? zoom : previewScale) >= displayMax - 0.001}
                aria-label="Aumentar zoom"
                onClick={() => void applyZoom((hasHardwareZoom ? zoom : previewScale) + zoomStep)}
              >
                <MagnifyingGlassPlusIcon aria-hidden="true" />
              </Button>
            </div>

            {canSwitchCamera && (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full whitespace-normal"
                disabled={isSwitching || isFileScanning}
                onClick={() => void switchCamera()}
              >
                <SwitchCamera aria-hidden="true" />
                {isSwitching ? 'Trocando câmera...' : 'Trocar câmera'}
              </Button>
            )}
          </div>
        )}

        {(isStarting || isSwitching) && (
          <div role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {isSwitching ? 'Trocando câmera...' : 'Iniciando câmera...'}
          </div>
        )}
        {error && <Alert variant="destructive">{error}</Alert>}

        {(showGalleryHint || error) && (
          <Alert>Não consegue escanear? Envie uma foto do QR Code da nota pela galeria.</Alert>
        )}

        <div className="flex flex-col gap-3">
          <Button type="button" className="min-h-11 w-full text-white" disabled={isFileScanning || isSwitching} onClick={() => fileInputRef.current?.click()}>
            {isFileScanning ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ImageUploadIcon />}
            {isFileScanning ? 'Lendo imagem...' : 'Enviar imagem'}
          </Button>
          <Button type="button" variant="destructive" className="min-h-11 w-full" disabled={isFileScanning} onClick={closeScanner}>Cancelar</Button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" aria-hidden="true" tabIndex={-1} onChange={handleFileSelected} />
      </Content>
    </Root>
  );
}
