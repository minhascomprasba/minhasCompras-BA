export interface StartImportRequest {
  access_key: string;
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
