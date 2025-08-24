'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

export interface LoadingStateOptions {
  initialLoading?: boolean;
  timeout?: number;
  retries?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

/**
 * Custom hook for managing loading states with automatic error handling,
 * timeout support, and retry functionality
 */
export const useLoadingState = (options: LoadingStateOptions = {}) => {
  const {
    initialLoading = false,
    timeout = 10000, // 10 seconds default timeout
    retries = 0,
    onError,
    onSuccess,
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    data: null,
  });

  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
    
    if (loading) {
      // Set up timeout
      if (timeout > 0) {
        clearCurrentTimeout();
        timeoutRef.current = setTimeout(() => {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'Operation timed out' 
          }));
          if (abortController.current) {
            abortController.current.abort();
          }
        }, timeout);
      }
    } else {
      clearCurrentTimeout();
    }
  }, [timeout, clearCurrentTimeout]);

  const setError = useCallback((error: string | Error | null) => {
    const errorMessage = error instanceof Error ? error.message : error;
    setState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error: errorMessage 
    }));
    
    if (error && onError) {
      onError(error instanceof Error ? error : new Error(errorMessage || 'Unknown error'));
    }
    
    clearCurrentTimeout();
  }, [onError, clearCurrentTimeout]);

  const setData = useCallback((data: any) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error: null, 
      data 
    }));
    
    if (onSuccess) {
      onSuccess(data);
    }
    
    clearCurrentTimeout();
    setRetryCount(0); // Reset retry count on success
  }, [onSuccess, clearCurrentTimeout]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: initialLoading,
      error: null,
      data: null,
    });
    setRetryCount(0);
    clearCurrentTimeout();
    
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, [initialLoading, clearCurrentTimeout]);

  /**
   * Execute an async operation with automatic loading state management
   */
  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: { retryOnError?: boolean }
  ): Promise<T | null> => {
    const { retryOnError = false } = options || {};
    
    try {
      // Create new abort controller for this operation
      abortController.current = new AbortController();
      
      setLoading(true);
      const result = await operation();
      setData(result);
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is an abort error (user cancelled)
      if (errorObj.name === 'AbortError') {
        setState(prev => ({ ...prev, isLoading: false }));
        return null;
      }
      
      // Retry logic
      if (retryOnError && retryCount < retries) {
        setRetryCount(prev => prev + 1);
        // Exponential backoff: 1s, 2s, 4s, etc.
        const delay = Math.pow(2, retryCount) * 1000;
        
        setTimeout(() => {
          execute(operation, options);
        }, delay);
        
        return null;
      }
      
      setError(errorObj);
      return null;
    }
  }, [setLoading, setData, setError, retryCount, retries]);

  /**
   * Manual retry function
   */
  const retry = useCallback((operation: () => Promise<any>) => {
    if (retryCount < retries) {
      setRetryCount(prev => prev + 1);
      return execute(operation, { retryOnError: true });
    }
    return Promise.resolve(null);
  }, [execute, retryCount, retries]);

  /**
   * Cancel the current operation
   */
  const cancel = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setState(prev => ({ ...prev, isLoading: false }));
    clearCurrentTimeout();
  }, [clearCurrentTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCurrentTimeout();
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [clearCurrentTimeout]);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    data: state.data,
    retryCount,
    canRetry: retryCount < retries,
    
    // Actions
    setLoading,
    setError,
    setData,
    clearError,
    reset,
    execute,
    retry,
    cancel,
    
    // Utilities
    isIdle: !state.isLoading && !state.error && !state.data,
    hasData: !state.isLoading && !state.error && state.data,
    hasError: !state.isLoading && state.error,
  };
};

/**
 * Hook for managing multiple loading states
 */
export const useMultipleLoadingStates = () => {
  const [states, setStates] = useState<Record<string, LoadingState>>({});

  const getState = useCallback((key: string): LoadingState => {
    return states[key] || { isLoading: false, error: null, data: null };
  }, [states]);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: loading }
    }));
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: false, error }
    }));
  }, []);

  const setData = useCallback((key: string, data: any) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: false, error: null, data }
    }));
  }, []);

  const clearError = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: { ...prev[key], error: null }
    }));
  }, []);

  const reset = useCallback((key: string) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);

  const resetAll = useCallback(() => {
    setStates({});
  }, []);

  // Computed states
  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  const hasAnyError = Object.values(states).some(state => state.error);
  const allCompleted = Object.values(states).length > 0 && 
    Object.values(states).every(state => !state.isLoading);

  return {
    // Individual state management
    getState,
    setLoading,
    setError,
    setData,
    clearError,
    reset,
    resetAll,
    
    // Aggregate states
    isAnyLoading,
    hasAnyError,
    allCompleted,
    states,
    
    // Utilities
    getLoadingKeys: () => Object.keys(states).filter(key => states[key].isLoading),
    getErrorKeys: () => Object.keys(states).filter(key => states[key].error),
    getCompletedKeys: () => Object.keys(states).filter(key => !states[key].isLoading && states[key].data),
  };
};

export default useLoadingState;