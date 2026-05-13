import axios from 'axios';
import { parseApiError } from './errors';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to transform errors into our standardized AppError
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    throw parseApiError(error);
  }
);
