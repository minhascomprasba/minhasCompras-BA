import { apiClient } from '../../../shared/api/client';
import type { StartImportRequest, StartImportResponse, SubmitCaptchaRequest, SubmitCaptchaResponse, GetImportStatusResponse } from '../types';

export const importsService = {
  async startImport(data: StartImportRequest): Promise<StartImportResponse> {
    const response = await apiClient.post<StartImportResponse>('/imports/nfce', data);
    return response.data;
  },

  async submitCaptcha(importId: string, data: SubmitCaptchaRequest): Promise<SubmitCaptchaResponse> {
    const response = await apiClient.post<SubmitCaptchaResponse>(`/imports/nfce/${importId}/captcha`, data);
    return response.data;
  },

  async getImportStatus(importId: string): Promise<GetImportStatusResponse> {
    const response = await apiClient.get<GetImportStatusResponse>(`/imports/nfce/${importId}`);
    return response.data;
  },
  async getCaptchaImageBlob(importId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/imports/nfce/${importId}/captcha-image`, {
      responseType: 'blob',
    });
    return response.data;
  }
};
