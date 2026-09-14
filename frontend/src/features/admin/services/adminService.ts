import { apiClient } from '../../../shared/api/client';
import type { UserRole } from '../../auth/authService';
import type {
  AdminDashboardData,
  AdminPeriod,
  AdminUsuario,
  PaginatedAdminUsuarios,
} from '../types';

export interface ListUsuariosParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: UserRole;
}

export const adminService = {
  async getAdminData(period: AdminPeriod): Promise<AdminDashboardData> {
    const response = await apiClient.get<AdminDashboardData>('/admin/metrics', {
      params: { period },
    });
    return response.data;
  },

  async listUsuarios(params: ListUsuariosParams = {}): Promise<PaginatedAdminUsuarios> {
    const response = await apiClient.get<PaginatedAdminUsuarios>('/admin/usuarios', { params });
    return response.data;
  },

  async updateUsuarioRole(usuarioId: number, role: UserRole): Promise<AdminUsuario> {
    const response = await apiClient.patch<AdminUsuario>(`/admin/usuarios/${usuarioId}/role`, {
      role,
    });
    return response.data;
  },
};
