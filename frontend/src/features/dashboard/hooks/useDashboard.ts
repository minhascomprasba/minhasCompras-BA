import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

export function useDashboard(userId: number | null) {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => dashboardService.getDashboard(),
    enabled: !!userId,
  });
}
