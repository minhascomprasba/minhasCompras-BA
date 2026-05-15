import { useMutation } from '@tanstack/react-query';
import { importsService } from '../services/importsService';
import type { StartImportRequest, StartImportResponse, SubmitCaptchaRequest, SubmitCaptchaResponse } from '../types';
import type { AppError } from '../../../shared/api/errors';

export function useStartImport() {
  return useMutation<StartImportResponse, AppError, StartImportRequest>({
    mutationFn: (data) => importsService.startImport(data),
  });
}

export function useSubmitCaptcha(importId: string) {
  return useMutation<SubmitCaptchaResponse, AppError, SubmitCaptchaRequest>({
    mutationFn: (data) => importsService.submitCaptcha(importId, data),
  });
}
