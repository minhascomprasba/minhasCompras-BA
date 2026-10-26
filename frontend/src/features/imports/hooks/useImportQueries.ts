import { useQuery } from '@tanstack/react-query';
import { importsService } from '../services/importsService';
import type { GetImportStatusResponse } from '../types';
import type { AppError } from '../../../shared/api/errors';

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'EXPIRED'] as const;

export function useImportStatusPolling(importId: string, userId: number | null) {
  return useQuery<GetImportStatusResponse, AppError>({
    queryKey: ['importStatus', userId, importId],
    queryFn: () => importsService.getImportStatus(importId),
    // Continua polling enquanto não houver status terminal da API.
    refetchInterval: (query) => {
      if (!importId) return false;
      const data = query.state.data;
      if (data && TERMINAL_STATUSES.includes(data.status as (typeof TERMINAL_STATUSES)[number])) {
        return false;
      }
      return 3000;
    },
    // Em VM lenta/rede instável, falhas transitórias não devem parar a espera.
    retry: (failureCount, error) => {
      if (error.code === 'NETWORK_ERROR' || error.code === 'UNKNOWN_ERROR') {
        return failureCount < 30;
      }
      return failureCount < 2;
    },
    retryDelay: 3000,
    refetchOnWindowFocus: true,
    enabled: !!importId && !!userId,
  });
}
