import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { notasService } from '../services/notasService';
import type { GetNotasParams, GetNotaItensParams } from '../types';
import type { AppError } from '../../../shared/api/errors';

export function useNotas(params: GetNotasParams) {
  return useQuery({
    queryKey: ['notas', params],
    queryFn: () => notasService.getNotas(params),
    placeholderData: keepPreviousData, // Keeps old data visible while fetching the next page
  });
}

export function useNota(notaId: number) {
  return useQuery({
    queryKey: ['nota', notaId],
    queryFn: () => notasService.getNotaById(notaId),
    enabled: !!notaId && !isNaN(notaId),
  });
}

export function useNotaItens(notaId: number, params: GetNotaItensParams) {
  return useQuery({
    queryKey: ['nota-itens', notaId, params],
    queryFn: () => notasService.getNotaItens(notaId, params),
    placeholderData: keepPreviousData,
    enabled: !!notaId && !isNaN(notaId),
  });
}
