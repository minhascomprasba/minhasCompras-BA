import { Button } from './ui/button';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCodeScanner } from '../features/imports/components/QrCodeScanner';
import { extractAccessKeyFromQrContent, validateAccessKey } from '../features/imports/utils/extractAccessKey';
import { storeQuickScan } from '../features/imports/utils/quickScanStorage';
import type { ImportSource } from '../features/imports/types';
import { QrCodeIcon } from './ImportActionIcons';

/**
 * Botão de acesso rápido que abre a câmera (scanning) diretamente de
 * qualquer página autenticada. Após ler o QR Code, o usuário é encaminhado
 * para a importação com a chave preenchida.
 */
export function QuickScan() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleAccessKey = (decodedText: string, source: ImportSource) => {
    const accessKey = extractAccessKeyFromQrContent(decodedText);
    if (!accessKey) {
      return 'QR Code lido, mas não foi possível extrair a chave de 44 dígitos da nota fiscal.';
    }

    const validationError = validateAccessKey(accessKey);
    if (validationError) {
      return validationError;
    }

    storeQuickScan(accessKey, source, true);
    setIsOpen(false);
    navigate('/importar');
    return null;
  };

  return (
    <>
      <Button
        type="button"
        className="fixed right-[calc(1.5rem+var(--safe-right))] bottom-[calc(2rem+var(--safe-bottom))] z-30 size-16 rounded-full text-white shadow-lg hover:shadow-xl"
        aria-label="Escanear nova nota fiscal"
        title="Escanear nova nota fiscal"
        onClick={() => setIsOpen(true)}
      >
        <QrCodeIcon className="size-8" />
      </Button>

      <QrCodeScanner
        presentation="drawer"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onScan={(decodedText) => handleAccessKey(decodedText, 'QR_CODE')}
        onFile={(decodedText) => handleAccessKey(decodedText, 'PHOTO')}
      />
    </>
  );
}
