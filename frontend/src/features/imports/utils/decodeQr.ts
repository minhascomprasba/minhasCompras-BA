import type { ReaderOptions } from 'zxing-wasm/reader';

/** Resolução máxima do quadro enviado ao ZXing na câmera. */
const LIVE_MAX_EDGE = 1920;
/** Foto da nota inteira: mantém o QR denso grande o bastante para ser lido. */
const FILE_MAX_EDGE = 2400;

/**
 * O ZXing reduz sozinho imagens acima de 500 px. No QR da NFC-e isso apaga
 * os módulos, então a leitura fica na resolução capturada.
 */
const READER_OPTIONS: ReaderOptions = {
  formats: ['QRCode'],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: false,
  maxNumberOfSymbols: 1,
  textMode: 'Plain',
};

const FILE_READER_OPTIONS: ReaderOptions = {
  ...READER_OPTIONS,
  tryDenoise: true,
};

type DetectedBarcode = { rawValue?: string };

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

export type QrImageSource = HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement;

type ZxingReader = {
  readBarcodes: typeof import('zxing-wasm/reader').readBarcodes;
};

let readerTask: Promise<ZxingReader> | null = null;
let nativeDetectorTask: Promise<BarcodeDetectorInstance | null> | null = null;
let frameCanvas: HTMLCanvasElement | null = null;

function loadZxingReader(): Promise<ZxingReader> {
  if (!readerTask) {
    readerTask = Promise.all([
      import('zxing-wasm/reader'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]).then(async ([reader, wasm]) => {
      await reader.prepareZXingModule({
        overrides: {
          locateFile(path: string, prefix: string) {
            if (path.endsWith('.wasm')) {
              return wasm.default;
            }
            return prefix + path;
          },
        },
        fireImmediately: true,
      });
      return { readBarcodes: reader.readBarcodes };
    }).catch((error: unknown) => {
      readerTask = null;
      throw error;
    });
  }
  return readerTask;
}

export function prepareQrDecoder(): Promise<void> {
  return loadZxingReader().then(() => undefined);
}

function getNativeDetector(): Promise<BarcodeDetectorInstance | null> {
  if (!nativeDetectorTask) {
    nativeDetectorTask = createNativeDetector();
  }
  return nativeDetectorTask;
}

async function createNativeDetector(): Promise<BarcodeDetectorInstance | null> {
  const detector = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (!detector) {
    return null;
  }

  try {
    if (detector.getSupportedFormats) {
      const formats = await detector.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        return null;
      }
    }
    return new detector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

function sourceSize(source: QrImageSource, width: number, height: number) {
  if (width > 0 && height > 0) {
    return { width, height };
  }
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function toImageData(
  source: QrImageSource,
  width: number,
  height: number,
  maxEdge: number,
  centerCrop = 1,
): ImageData {
  const crop = Math.max(1, centerCrop);
  const srcWidth = Math.max(1, Math.round(width / crop));
  const srcHeight = Math.max(1, Math.round(height / crop));
  const srcX = Math.max(0, Math.round((width - srcWidth) / 2));
  const srcY = Math.max(0, Math.round((height - srcHeight) / 2));

  const longest = Math.max(srcWidth, srcHeight);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));
  const canvas = frameCanvas ?? document.createElement('canvas');
  frameCanvas = canvas;
  if (canvas.width !== targetWidth) {
    canvas.width = targetWidth;
  }
  if (canvas.height !== targetHeight) {
    canvas.height = targetHeight;
  }

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Não foi possível preparar a imagem para leitura.');
  }
  context.drawImage(source, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
  return context.getImageData(0, 0, targetWidth, targetHeight);
}

async function readWithNative(source: QrImageSource): Promise<string | null> {
  const detector = await getNativeDetector();
  if (!detector) {
    return null;
  }

  try {
    const codes = await detector.detect(source);
    const text = codes.find((code) => code.rawValue?.trim())?.rawValue?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function readWithZxing(
  source: QrImageSource,
  width: number,
  height: number,
  maxEdge: number,
  options: ReaderOptions,
  centerCrop = 1,
) {
  const { readBarcodes } = await loadZxingReader();
  const imageData = toImageData(source, width, height, maxEdge, centerCrop);
  const results = await readBarcodes(imageData, options);
  const text = results.find((result) => result.isValid && result.text.trim())?.text.trim();
  return text || null;
}

export async function decodeQrFromVideo(video: HTMLVideoElement, centerCrop = 1): Promise<string | null> {
  // Detector nativo usa o quadro inteiro; com zoom visual, o ZXing lê o centro ampliado.
  if (centerCrop <= 1.05) {
    const native = await readWithNative(video);
    if (native) {
      return native;
    }
  }
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }
  return readWithZxing(video, video.videoWidth, video.videoHeight, LIVE_MAX_EDGE, READER_OPTIONS, centerCrop);
}

export async function decodeQrFromImage(source: QrImageSource, width: number, height: number): Promise<string | null> {
  const size = sourceSize(source, width, height);
  const native = await readWithNative(source);
  if (native) {
    return native;
  }
  if (size.width === 0 || size.height === 0) {
    return null;
  }
  return readWithZxing(source, size.width, size.height, FILE_MAX_EDGE, FILE_READER_OPTIONS);
}
