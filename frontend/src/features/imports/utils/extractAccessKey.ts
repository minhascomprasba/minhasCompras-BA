/**
 * Extrai a chave de acesso (44 dígitos) do conteúdo de um QR Code de NFC-e.
 * Formatos comuns: URL com parâmetro `p=CHAVE|...` ou sequência numérica direta.
 */
export function extractAccessKeyFromQrContent(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{44}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = trimmed.startsWith('http') ? new URL(trimmed) : null;
    if (url) {
      const paramP = url.searchParams.get('p');
      if (paramP) {
        const keyPart = paramP.split('|')[0]?.replace(/\D/g, '') ?? '';
        if (keyPart.length === 44) {
          return keyPart;
        }
      }
    }
  } catch {
    // conteúdo não é URL válida
  }

  const match = trimmed.match(/\d{44}/);
  return match ? match[0] : null;
}

export function validateAccessKey(accessKey: string): string | null {
  if (accessKey.length !== 44) {
    return 'A chave de acesso deve conter exatamente 44 dígitos.';
  }
  if (!/^\d+$/.test(accessKey)) {
    return 'A chave de acesso deve conter apenas números.';
  }
  return null;
}
