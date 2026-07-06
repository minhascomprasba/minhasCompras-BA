import { apiClient } from '../../../shared/api/client';
import type { DashboardData } from '../types';

export const dashboardService = {
  async getDashboard(): Promise<DashboardData[]> {
    const response = await apiClient.get<DashboardData[]>('/dashboard');
    return response.data;
  },
};
