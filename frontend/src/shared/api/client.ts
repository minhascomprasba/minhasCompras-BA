import axios from 'axios';
import { parseApiError } from './errors';

export const apiClient = axios.create({
  baseURL:
    import.meta.env.NEXT_PUBLIC_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:10000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to transform errors into our standardized AppError
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Trigger a global event so the AuthContext can log the user out
      window.dispatchEvent(new Event('auth_unauthorized'));
    }
    throw parseApiError(error);
  }
);
