export interface ApiErrorDetails {
  [key: string]: string[] | string | undefined;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: ApiErrorDetails;
}

export class AppError extends Error {
  public code: string;
  public details?: ApiErrorDetails;
  public status?: number;

  constructor(message: string, code: string, details?: ApiErrorDetails, status?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export const parseApiError = (error: unknown): AppError => {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }

  // Handle Axios errors (assuming axios is used in apiClient)
  if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
    const axiosError = error as any;
    
    if (axiosError.response) {
      const data = axiosError.response.data as Partial<ApiErrorResponse>;
      return new AppError(
        data.message || 'Ocorreu um erro no servidor.',
        data.code || 'INTERNAL_ERROR',
        data.details,
        axiosError.response.status
      );
    }

    if (axiosError.request) {
      return new AppError('Não foi possível conectar ao servidor. Verifique sua conexão.', 'NETWORK_ERROR');
    }
  }

  return new AppError('Ocorreu um erro inesperado.', 'UNKNOWN_ERROR');
};
