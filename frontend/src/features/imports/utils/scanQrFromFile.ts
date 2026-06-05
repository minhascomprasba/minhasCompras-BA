import { Html5Qrcode } from 'html5-qrcode';

const FILE_SCANNER_ELEMENT_ID = 'qr-file-scanner-anchor';

let fileScanner: Html5Qrcode | null = null;

function getFileScanner(): Html5Qrcode {
  if (!fileScanner) {
    let anchor = document.getElementById(FILE_SCANNER_ELEMENT_ID);
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.id = FILE_SCANNER_ELEMENT_ID;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
    }
    fileScanner = new Html5Qrcode(FILE_SCANNER_ELEMENT_ID, false);
  }
  return fileScanner;
}

export async function scanQrCodeFromFile(file: File): Promise<string> {
  const scanner = getFileScanner();
  if (scanner.isScanning) {
    await scanner.stop();
  }
  return scanner.scanFile(file, false);
}
