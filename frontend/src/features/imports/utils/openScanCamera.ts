type ZoomCapability = {
  min: number;
  max: number;
  step?: number;
};

type ExtendedCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  zoom?: ZoomCapability;
};

type ExtendedSettings = MediaTrackSettings & {
  zoom?: number;
};

function getCapabilities(track: MediaStreamTrack | undefined): ExtendedCapabilities | undefined {
  return track?.getCapabilities?.() as ExtendedCapabilities | undefined;
}

function getSettings(track: MediaStreamTrack | undefined): ExtendedSettings | undefined {
  return track?.getSettings?.() as ExtendedSettings | undefined;
}

function highResolutionConstraints(deviceId?: string | null, facingMode?: 'environment' | 'user'): MediaTrackConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  if (deviceId) {
    video.deviceId = { exact: deviceId };
    return video;
  }

  video.facingMode = { ideal: facingMode ?? 'environment' };
  return video;
}

export function getTrackZoomRange(stream: MediaStream | null | undefined): ZoomCapability | null {
  const zoom = getCapabilities(stream?.getVideoTracks()[0])?.zoom;
  if (!zoom || !(zoom.max > zoom.min)) {
    return null;
  }
  return zoom;
}

export function getTrackZoom(stream: MediaStream | null | undefined): number | null {
  const value = getSettings(stream?.getVideoTracks()[0])?.zoom;
  return typeof value === 'number' ? value : null;
}

/** Aplica zoom ótico/digital quando o aparelho expõe a API. */
export async function setTrackZoom(stream: MediaStream | null | undefined, zoom: number): Promise<number | null> {
  const track = stream?.getVideoTracks()[0];
  const range = getCapabilities(track)?.zoom;
  if (!track || !range) {
    return null;
  }

  const step = range.step && range.step > 0 ? range.step : 0.1;
  const clamped = Math.min(range.max, Math.max(range.min, zoom));
  const stepped = Math.round(clamped / step) * step;

  try {
    await track.applyConstraints({
      advanced: [{ zoom: stepped } as unknown as MediaTrackConstraintSet],
    });
    return getTrackZoom(stream) ?? stepped;
  } catch {
    try {
      await track.applyConstraints({ zoom: stepped } as unknown as MediaTrackConstraints);
      return getTrackZoom(stream) ?? stepped;
    } catch {
      return null;
    }
  }
}

async function enableContinuousFocus(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const capabilities = getCapabilities(track);
  if (!track || !capabilities?.focusMode?.includes('continuous')) {
    return;
  }

  try {
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
    });
  } catch {
    // foco contínuo é opcional
  }
}

/** Zoom inicial ~2x (ou o máximo disponível abaixo disso) para o QR da nota. */
async function applyPreferredZoom(stream: MediaStream) {
  const range = getTrackZoomRange(stream);
  if (!range) {
    return;
  }
  const preferred = Math.min(range.max, Math.max(range.min, 2));
  await setTrackZoom(stream, preferred);
}

type OpenScanCameraOptions = {
  deviceId?: string | null;
  facingMode?: 'environment' | 'user';
  /** Stream anterior: no celular precisa parar antes de abrir outra lente. */
  previousStream?: MediaStream | null;
};

/** Abre a câmera em alta resolução. Sem `deviceId`, usa facingMode (traseira por padrão). */
export async function openScanCamera(options: OpenScanCameraOptions = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Câmera indisponível neste navegador.');
  }

  const { deviceId, facingMode = 'environment', previousStream } = options;
  stopScanStream(previousStream);

  // Alguns aparelhos só liberam a próxima lente depois de soltar a atual.
  await new Promise((resolve) => window.setTimeout(resolve, 120));

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: highResolutionConstraints(deviceId, facingMode),
    });
  } catch (error) {
    if (deviceId) {
      // Fallback: troca só pelo facingMode (comum no Safari iOS).
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: highResolutionConstraints(null, facingMode),
      });
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode,
          },
        });
      } catch {
        throw error;
      }
    }
  }

  await enableContinuousFocus(stream);
  // Zoom ótico/digital quando existir; no iOS costuma não haver API de zoom.
  await applyPreferredZoom(stream);
  return stream;
}

export function stopScanStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}
