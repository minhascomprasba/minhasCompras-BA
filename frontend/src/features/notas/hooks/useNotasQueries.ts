import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { notasService } from '../services/notasService';
import type { GetNotasParams, GetNotaItensParams } from '../types';
// import type { AppError } from '../../../shared/api/errors';

export function useNotas(userId: number | null, params: GetNotasParams) {
  return useQuery({
    queryKey: ['notas', userId, params],
    queryFn: () => notasService.getNotas(params),
    placeholderData: keepPreviousData, // Keeps old data visible while fetching the next page
    enabled: !!userId,
  });
}

export function useNota(userId: number | null, notaId: number) {
  return useQuery({
    queryKey: ['nota', userId, notaId],
    queryFn: () => notasService.getNotaById(notaId),
    enabled: !!userId && !!notaId && !isNaN(notaId),
  });
}

export function useNotaItens(userId: number | null, notaId: number, params: GetNotaItensParams) {
  return useQuery({
    queryKey: ['nota-itens', userId, notaId, params],
    queryFn: () => notasService.getNotaItens(notaId, params),
    placeholderData: keepPreviousData,
    enabled: !!userId && !!notaId && !isNaN(notaId),
  });
}
