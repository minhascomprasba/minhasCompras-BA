import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import type { ListUsuariosParams } from '../services/adminService';
import type { UserRole } from '../../auth/authService';
import type { AdminDashboardData, AdminPeriod, AdminUsuario, PaginatedAdminUsuarios } from '../types';
import type { AppError } from '../../../shared/api/errors';

export function useAdminData(period: AdminPeriod, selectedMonth?: string, selectedYear?: string) {
  return useQuery<AdminDashboardData, AppError>({
    queryKey: ['admin', 'metrics', period, selectedMonth, selectedYear],
    queryFn: () => adminService.getAdminData(period, selectedMonth, selectedYear),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminUsuarios(params: ListUsuariosParams) {
  return useQuery<PaginatedAdminUsuarios, AppError>({
    queryKey: ['admin', 'usuarios', params],
    queryFn: () => adminService.listUsuarios(params),
    staleTime: 60 * 1000,
  });
}

export function useUpdateUsuarioRole() {
  const queryClient = useQueryClient();

  return useMutation<AdminUsuario, AppError, { usuarioId: number; role: UserRole }>({
    mutationFn: ({ usuarioId, role }) => adminService.updateUsuarioRole(usuarioId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'usuarios'] });
    },
  });
}