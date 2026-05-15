import { apiClient } from '../../../shared/api/client';
import type { PaginatedResponse, Nota, NotaItem, GetNotasParams, GetNotaItensParams } from '../types';

export const notasService = {
  async getNotas(params?: GetNotasParams): Promise<PaginatedResponse<Nota>> {
    const response = await apiClient.get<PaginatedResponse<Nota>>('/notas', { params });
    return response.data;
  },

  async getNotaById(notaId: number): Promise<Nota> {
    const response = await apiClient.get<Nota>(`/notas/${notaId}`);
    return response.data;
  },

  async getNotaItens(notaId: number, params?: GetNotaItensParams): Promise<PaginatedResponse<NotaItem>> {
    const response = await apiClient.get<PaginatedResponse<NotaItem>>(`/notas/${notaId}/itens`, { params });
    return response.data;
  }
};
