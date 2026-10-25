import { apiClient } from '../../shared/api/client';

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Usuário',
  ADMIN: 'Gestor',
  SUPER_ADMIN: 'Administrador',
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
  async requestEmailChange(data: { current_password: string; new_email: string }) {
    return (await apiClient.post<{ challenge_id: string }>('/auth/email-change/request', data)).data;
  },
  async requestPasswordChange(data: { current_password: string; new_password: string }) {
    return (await apiClient.post<{ challenge_id: string }>('/auth/password-change/request', data)).data;
  },
  async verifyChange(operation: 'email' | 'password', challenge_id: string, code: string) {
    return (await apiClient.post<AuthResponse>(`/auth/${operation}-change/verify`, { challenge_id, code })).data;
  },
  async deleteAccount(password: string) {
    return apiClient.delete('/auth/me', { data: { password } });
  },
  async exportAccount(password: string) {
    return (await apiClient.post('/auth/me/export', { password }, { responseType: 'blob' })).data as Blob;
  },
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
