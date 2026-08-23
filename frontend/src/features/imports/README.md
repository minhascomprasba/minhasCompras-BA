# Feature: imports

Importação de notas fiscais de consumidor eletrônicas (NFC-e) a partir da chave de acesso de 44 dígitos. É a feature central do app: obtém a chave por QR code (câmera), foto ou digitação, resolve o captcha da SEFAZ e acompanha o processamento até a nota ficar disponível.

Fluxo de páginas: `ImportPage` → `ImportStatusPage` (`/importacoes/:importId`).

## Estrutura

```
imports/
├── components/
│   └── QrCodeScanner.tsx        # Modal/overlay de leitura de QR pela câmera (html5-qrcode)
├── hooks/
│   ├── useImportMutations.ts    # Mutations: iniciar importação, submeter captcha
│   └── useImportQueries.ts      # Query com polling do status da importação
├── services/
│   └── importsService.ts        # Endpoints /imports/nfce via apiClient
├── types.ts                     # DTOs + union de status
├── utils/
│   ├── extractAccessKey.ts      # Extração/validação da chave de 44 dígitos
│   ├── pickBackCamera.ts        # Heurística para escolher a câmera traseira principal
│   ├── qrScannerConfig.ts       # Constantes de config do html5-qrcode
│   └── scanQrFromFile.ts        # Leitura de QR a partir de arquivo de imagem
└── README.md
```

## API pública

### Hooks

```ts
// hooks/useImportMutations.ts
function useStartImport(): UseMutationResult<StartImportResponse, AppError, StartImportRequest>;
// POST /imports/nfce — inicia a importação com a access_key.
// Resposta traz status inicial (tipicamente WAITING_CAPTCHA) e expires_at.

function useSubmitCaptcha(importId: string): UseMutationResult<SubmitCaptchaResponse, AppError, SubmitCaptchaRequest>;
// POST /imports/nfce/{id}/captcha — envia captcha_code; sucesso ⇒ status PROCESSING.

// hooks/useImportQueries.ts
function useImportStatusPolling(importId: string, userId: number | null): UseQueryResult<GetImportStatusResponse, AppError>;
// GET /imports/nfce/{id} a cada 3 s (queryKey ['importStatus', userId, importId]).
// refetchInterval retorna false quando o status atinge COMPLETED, FAILED ou EXPIRED.
// retry: 1; enabled: !!importId && !!userId.
```

### Serviço — `services/importsService.ts`

```ts
const importsService = {
  startImport(data: StartImportRequest): Promise<StartImportResponse>;            // POST /imports/nfce
  submitCaptcha(importId: string, data: SubmitCaptchaRequest): Promise<SubmitCaptchaResponse>;
                                                                                  // POST /imports/nfce/{id}/captcha
  getImportStatus(importId: string): Promise<GetImportStatusResponse>;            // GET /imports/nfce/{id}
  getCaptchaImageBlob(importId: string): Promise<Blob>;                           // GET /imports/nfce/{id}/captcha-image
};
```

`getCaptchaImageBlob` usa `responseType: 'blob'` porque a imagem do captcha precisa do header `Authorization` — `ImportPage` renderiza o blob via `URL.createObjectURL`.

### Componente — `components/QrCodeScanner.tsx`

```tsx
interface QrCodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void; // recebe o conteúdo bruto decodificado
}
function QrCodeScanner({ isOpen, onClose, onScan }: QrCodeScannerProps): JSX.Element | null;
```

- Monta/desmonta o scanner conforme `isOpen`; usa `QR_SCANNER_CONFIG` (`fps: 10`, `qrbox: 250×250`) e solicita explicitamente a câmera escolhida por `pickDefaultCameraId`.
- Padrão **ref-mirroring**: `onScan`/`onClose` são espelhados em refs para que o effect da câmera não precise reiniciar quando o pai recria os callbacks.

### Utils

```ts
// extractAccessKey.ts
function extractAccessKeyFromQrContent(text: string): string | null;
// Extrai a chave de 44 dígitos de conteúdos comuns de QR de NFC-e:
// numérica pura, URL com parâmetro p=CHAVE|... , ou primeira sequência de 44 dígitos no texto.

function validateAccessKey(accessKey: string): string | null;
// Retorna mensagem de erro em pt-BR se não tiver exatamente 44 dígitos numéricos; null se válida.

// pickBackCamera.ts
type CameraDevice = { id: string; label: string };
function scoreCameraLabel(label: string): number;   // pontua rótulo (frontal = -100; main/rear somam; ultra/tele subtraem)
function rankBackCameras(cameras: CameraDevice[]): CameraDevice[]; // ordena: traseira principal primeiro
function pickDefaultCameraId(cameras: CameraDevice[]): string | null;

// scanQrFromFile.ts
function scanQrCodeFromFile(file: File): Promise<string>;
// Lê o QR de um arquivo de imagem usando um Html5Qrcode singleton
// ancorado numa div oculta reutilizada entre leituras (padrão singleton de módulo).

// qrScannerConfig.ts
const QR_SCANNER_CONFIG: { fps: 10; qrbox: { width: 250; height: 250 } };
```

### Tipos — `types.ts`

```ts
type ImportStatus = 'WAITING_CAPTCHA' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

interface StartImportRequest     { access_key: string }
interface StartImportResponse    { import_id: string; status: ImportStatus; captcha_image_url: string; expires_at: string }
interface SubmitCaptchaRequest   { captcha_code: string }
interface SubmitCaptchaResponse  { import_id: string; status: 'PROCESSING' }
interface GetImportStatusResponse {
  import_id: string;
  status: ImportStatus;
  nota_id?: number;          // presente quando COMPLETED → link para /notas/:notaId
  items_count?: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
}
```

## Fluxo ponta a ponta (ImportPage → ImportStatusPage)

1. Obtenção da chave: QR pela câmera, upload de foto ou digitação manual (`validateAccessKey`).
2. `useStartImport.mutate({ access_key })`.
3. Se `status === 'WAITING_CAPTCHA'`: carrega `getCaptchaImageBlob(importId)` e exibe a imagem; usuário digita o código.
4. `useSubmitCaptcha.mutate({ captcha_code })` — em caso de falha, ramifica sobre `err.code`: `INVALID_CAPTCHA` (mensagem inline), `CAPTCHA_EXPIRED` (recarrega o captcha).
5. Navega para `/importacoes/{import_id}`; `useImportStatusPolling` acompanha até um status terminal.
6. `COMPLETED` → link para `/notas/{nota_id}`; `FAILED`/`EXPIRED` → mensagem com `error_message`.
