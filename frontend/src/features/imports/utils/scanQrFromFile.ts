import { decodeQrFromImage, type QrImageSource } from './decodeQr';

type LoadedImage = {
  source: QrImageSource;
  width: number;
  height: number;
  close: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // alguns formatos só abrem via elemento de imagem
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
      element.src = url;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function scanQrCodeFromFile(file: File): Promise<string> {
  const image = await loadImage(file);
  try {
    const text = await decodeQrFromImage(image.source, image.width, image.height);
    if (!text) {
      throw new Error('QR Code não encontrado');
    }
    return text;
  } finally {
    image.close();
  }
}
