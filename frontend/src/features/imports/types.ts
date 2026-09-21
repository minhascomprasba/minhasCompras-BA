export type ImportSource = 'QR_CODE' | 'PHOTO' | 'MANUAL';

export interface StartImportRequest {
  access_key: string;
  source?: ImportSource;
}

export interface StartImportResponse {
  import_id: string;
  status: 'WAITING_CAPTCHA' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  captcha_image_url: string;
  expires_at: string;
}

export interface SubmitCaptchaRequest {
  captcha_code: string;
}

export interface SubmitCaptchaResponse {
  import_id: string;
  status: 'PROCESSING';
}

export interface GetImportStatusResponse {
  import_id: string;
  status: 'WAITING_CAPTCHA' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  nota_id?: number;
  items_count?: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  finished_at?: string | null;
}
