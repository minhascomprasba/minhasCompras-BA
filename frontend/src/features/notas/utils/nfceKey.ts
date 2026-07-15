/**
 * Extrai o número (nNF) e a série da NFC-e a partir da chave de acesso de 44 dígitos.
 *
 * Layout da chave (44 dígitos):
 * cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
 */
export interface NfceIdentificacao {
  numero: string; // nNF sem zeros à esquerda
  serie: string; // série sem zeros à esquerda
}

export function extractNfceIdentificacao(
  codigoAcesso: string | null | undefined,
): NfceIdentificacao | null {
  if (!codigoAcesso) {
    return null;
  }

  const key = codigoAcesso.replace(/\D/g, '');
  if (key.length !== 44) {
    return null;
  }

  const serieNum = Number.parseInt(key.substring(22, 25), 10);
  const numeroNum = Number.parseInt(key.substring(25, 34), 10);

  if (Number.isNaN(numeroNum) || Number.isNaN(serieNum)) {
    return null;
  }

  return { numero: String(numeroNum), serie: String(serieNum) };
}
