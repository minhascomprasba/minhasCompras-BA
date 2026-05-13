import { useQuery } from '@tanstack/react-query';
import { importsService } from '../services/importsService';
import type { GetImportStatusResponse } from '../types';
import type { AppError } from '../../../shared/api/errors';

export function useImportStatusPolling(importId: string) {
  return useQuery<GetImportStatusResponse, AppError>({
    queryKey: ['importStatus', importId],
    queryFn: () => importsService.getImportStatus(importId),
    // Polling logic:
    // refetchInterval receives the current data (or undefined initially)
    // If the status is not terminal, we return an interval in ms (e.g., 3000ms).
    // If it is terminal (COMPLETED, FAILED, EXPIRED) or if there's no importId, we return false to stop polling.
    refetchInterval: (query) => {
      if (!importId) return false;
      const data = query.state.data;
      if (!data) return 3000; // Keep polling if we don't have data yet

      const terminalStatuses = ['COMPLETED', 'FAILED', 'EXPIRED'];
      if (terminalStatuses.includes(data.status)) {
        return false; // Stop polling
      }
      
      return 3000; // Poll every 3 seconds while in PROCESSING or WAITING_CAPTCHA
    },
    // Don't retry automatically on error during polling to avoid spam, or retry once.
    retry: 1,
    enabled: !!importId, // Only run if we have an ID
  });
}
