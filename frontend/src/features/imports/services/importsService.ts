import { apiClient } from '../../../shared/api/client';
import type { StartImportRequest, StartImportResponse, SubmitCaptchaRequest, SubmitCaptchaResponse } from '../types';

export const importsService = {
  async startImport(data: StartImportRequest): Promise<StartImportResponse> {
    const response = await apiClient.post<StartImportResponse>('/imports/nfce', data);
    return response.data;
  },

  async submitCaptcha(importId: string, data: SubmitCaptchaRequest): Promise<SubmitCaptchaResponse> {
    const response = await apiClient.post<SubmitCaptchaResponse>(`/imports/nfce/${importId}/captcha`, data);
    return response.data;
  },
  
  // Helper to build the captcha image URL correctly pointing to our API
  getCaptchaImageUrl(importId: string): string {
    const baseURL = apiClient.defaults.baseURL || '';
    return `${baseURL}/imports/nfce/${importId}/captcha-image`;
  }
};
