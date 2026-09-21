import { apiClient } from '../../shared/api/client';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Usuário',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

export interface User {
  id: number;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export const authService = {
  async register(data: { email: string; password: string }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/register', data);
    return response.data;
  },

  async verifyEmail(data: { email: string; code: string }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/verify-email', data);
    return response.data;
  },

  async resendCode(data: { email: string }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/resend-code', data);
    return response.data;
  },

  async login(data: Record<string, string>): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async requestPasswordReset(data: { email: string }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', data);
    return response.data;
  },

  async resetPassword(data: { token: string; password: string }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', data);
    return response.data;
  },
};
