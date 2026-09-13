import type { AdminDashboardData } from '../types';
import { mockAdminData } from '../mockAdminData';

const MOCK_DELAY_MS = 300;

export const adminService = {
  async getAdminData(): Promise<AdminDashboardData> {
    // Endpoint real ainda não disponível — retorna o mock após latência simulada.
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return mockAdminData;
  },
};