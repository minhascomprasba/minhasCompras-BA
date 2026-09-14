import { useQuery } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import type { AdminDashboardData } from '../types';

export function useAdminData() {
  return useQuery<AdminDashboardData>({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminService.getAdminData(),
    staleTime: 5 * 60 * 1000,
  });
}