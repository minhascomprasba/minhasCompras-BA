import type { ImportSource } from '../types';

const PENDING_ACCESS_KEY = 'quickScan.accessKey';
const PENDING_SOURCE = 'quickScan.source';
const PENDING_AUTO_SUBMIT = 'quickScan.autoSubmit';

/** Guarda a chave lida pelo scanner rápido para a página de importação consumir. */
export function storeQuickScan(accessKey: string, source: ImportSource, autoSubmit: boolean): void {
  sessionStorage.setItem(PENDING_ACCESS_KEY, accessKey);
  sessionStorage.setItem(PENDING_SOURCE, source);
  sessionStorage.setItem(PENDING_AUTO_SUBMIT, autoSubmit ? 'true' : 'false');
}

/** Lê e limpa a chave pendente (se houver). */
export function consumeQuickScan(): {
  accessKey?: string;
  source?: ImportSource;
  autoSubmit: boolean;
} {
  const accessKey = sessionStorage.getItem(PENDING_ACCESS_KEY) ?? undefined;
  const rawSource = sessionStorage.getItem(PENDING_SOURCE);
  const autoSubmit = sessionStorage.getItem(PENDING_AUTO_SUBMIT) === 'true';

  sessionStorage.removeItem(PENDING_ACCESS_KEY);
  sessionStorage.removeItem(PENDING_SOURCE);
  sessionStorage.removeItem(PENDING_AUTO_SUBMIT);

  const source: ImportSource | undefined =
    rawSource === 'QR_CODE' || rawSource === 'PHOTO' || rawSource === 'MANUAL' ? rawSource : undefined;

  return { accessKey, source, autoSubmit };
}