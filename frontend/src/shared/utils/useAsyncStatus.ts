import { useState, useCallback } from 'react';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAsyncStatus() {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const start = useCallback(() => {
    setStatus('loading');
    setError(null);
  }, []);

  const succeed = useCallback(() => {
    setStatus('success');
    setError(null);
  }, []);

  const fail = useCallback((err: Error) => {
    setStatus('error');
    setError(err);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return {
    status,
    error,
    isIdle: status === 'idle',
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    start,
    succeed,
    fail,
    reset,
  };
}
