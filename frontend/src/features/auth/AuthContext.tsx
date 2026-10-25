import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from './authService';
import type { User, UserRole } from './authService';
import { AppError } from '../../shared/api/errors';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const login = (token: string, userData: User) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
    queryClient.clear();
  };

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('auth_token');
    const isCurrentSession = () => active && localStorage.getItem('auth_token') === token;
    const initAuth = async () => {
      if (token) {
        try {
          const cached: unknown = JSON.parse(localStorage.getItem('auth_user') ?? 'null');
          if (cached && typeof cached === 'object' &&
              'id' in cached && typeof cached.id === 'number' &&
              'email' in cached && typeof cached.email === 'string' &&
              'role' in cached &&
              (cached.role === 'USER' || cached.role === 'ADMIN' || cached.role === 'SUPER_ADMIN')) {
            setUser(cached as User);
          }
        } catch {
          localStorage.removeItem('auth_user');
        }
        try {
          const userData = await authService.getMe();
          if (isCurrentSession()) {
            localStorage.setItem('auth_user', JSON.stringify(userData));
            setUser(userData);
          }
        } catch (error) {
          if (isCurrentSession() && error instanceof AppError &&
              (error.status === 401 || error.status === 404)) {
            logout();
          }
        }
      }
      if (active) setIsLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('auth_unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const role = user?.role ?? null;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        role,
        isAdmin,
        isSuperAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}