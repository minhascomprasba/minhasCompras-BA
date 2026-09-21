import { getMockAdminData } from '../mockAdminData';
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
  async getAdminData(
    period: AdminPeriod,
    selectedMonth?: string,
    selectedYear?: string
  ): Promise<AdminDashboardData> {
    return getMockAdminData(period, selectedMonth, selectedYear);
  },

  async listUsuarios(_params: ListUsuariosParams = {}): Promise<PaginatedAdminUsuarios> {
    return {
      data: [],
      page: 1,
      page_size: 20,
      total: 0,
      resumo_perfis: { USER: 10, ADMIN: 2, SUPER_ADMIN: 1 },
    };
  },

  async updateUsuarioRole(usuarioId: number, role: UserRole): Promise<AdminUsuario> {
    return {
      id: usuarioId,
      email: 'mock@admin.com',
      role,
      created_at: new Date().toISOString(),
      notas_count: 5,
      itens_count: 20,
      ultima_atividade: new Date().toISOString(),
    };
  },
};