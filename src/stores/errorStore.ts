/**
 * Centralized Error Store
 * 
 * Provides centralized error state management across the application
 * using Zustand. Integrates with our Firebase error handling and
 * page error boundaries.
 * 
 * Features:
 * - Context-based error storage
 * - Automatic error expiration
 * - Firebase-aware error categorization
 * - Integration with error boundaries
 * - Error severity levels
 * - Recovery action suggestions
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { handleFirebaseError, reportFirebaseError, shouldTriggerReauth } from '@/utils/firebaseErrorHandler';
import { processCatchError, isFirebaseError } from '@/utils/errorMessages';

export interface ErrorInfo {
  id: string;
  message: string;
  context: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  isFirebaseError: boolean;
  requiresAuth: boolean;
  recoveryAction?: 'none' | 'retry' | 'reauth' | 'refresh' | 'navigate';
  recoveryUrl?: string;
  userId?: string;
  expiresAt?: number;
}

export interface ErrorState {
  // Error storage
  errors: Map<string, ErrorInfo>;
  
  // Global error state
  hasErrors: boolean;
  hasCriticalErrors: boolean;
  
  // Actions
  setError: (context: string, error: unknown, options?: Partial<ErrorInfo>) => void;
  clearError: (context: string) => void;
  clearExpiredErrors: () => void;
  clearAllErrors: () => void;
  
  // Getters
  getError: (context: string) => ErrorInfo | undefined;
  getErrorsByContext: (contextPrefix: string) => ErrorInfo[];
  getErrorsBySeverity: (severity: ErrorInfo['severity']) => ErrorInfo[];
  getCriticalErrors: () => ErrorInfo[];
  
  // Recovery actions
  retryError: (context: string, retryFn?: () => Promise<void>) => Promise<void>;
  triggerReauth: () => void;
  navigateToRecovery: (context: string) => void;
}

const ERROR_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes
const CRITICAL_ERROR_EXPIRATION = 15 * 60 * 1000; // 15 minutes

export const useErrorStore = create<ErrorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    errors: new Map(),
    hasErrors: false,
    hasCriticalErrors: false,

    // Set error with comprehensive processing
    setError: (context: string, error: unknown, options: Partial<ErrorInfo> = {}) => {
      const id = `${context}_${Date.now()}`;
      const timestamp = Date.now();
      const processedError = processCatchError(error);
      
      // Determine if this is a Firebase error
      const isFirebaseErr = isFirebaseError(processedError);
      
      // Get user-friendly message
      const message = isFirebaseErr 
        ? handleFirebaseError(error, context)
        : processedError.message;
      
      // Determine severity based on error type and context
      let severity: ErrorInfo['severity'] = 'warning';
      if (context.includes('critical') || context.includes('auth')) {
        severity = 'critical';
      } else if (isFirebaseErr) {
        severity = 'error';
      } else if (context.includes('info')) {
        severity = 'info';
      }
      
      // Determine recovery action
      let recoveryAction: ErrorInfo['recoveryAction'] = 'none';
      if (shouldTriggerReauth(error)) {
        recoveryAction = 'reauth';
      } else if (isFirebaseErr) {
        recoveryAction = 'retry';
      }
      
      // Set expiration time based on severity
      const expiresAt = timestamp + (severity === 'critical' ? CRITICAL_ERROR_EXPIRATION : ERROR_EXPIRATION_TIME);
      
      const errorInfo: ErrorInfo = {
        id,
        message,
        context,
        severity,
        timestamp,
        isFirebaseError: isFirebaseErr,
        requiresAuth: shouldTriggerReauth(error),
        recoveryAction,
        expiresAt,
        ...options // Allow overrides
      };
      
      // Report Firebase errors
      if (isFirebaseErr) {
        reportFirebaseError(processedError, context, options.userId);
      }
      
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.set(context, errorInfo);
        
        return {
          errors: newErrors,
          hasErrors: newErrors.size > 0,
          hasCriticalErrors: Array.from(newErrors.values()).some(e => e.severity === 'critical')
        };
      });
      
      // Auto-clear non-critical errors after expiration
      if (severity !== 'critical') {
        setTimeout(() => {
          get().clearError(context);
        }, ERROR_EXPIRATION_TIME);
      }
    },

    // Clear specific error
    clearError: (context: string) => {
      set(state => {
        const newErrors = new Map(state.errors);
        newErrors.delete(context);
        
        return {
          errors: newErrors,
          hasErrors: newErrors.size > 0,
          hasCriticalErrors: Array.from(newErrors.values()).some(e => e.severity === 'critical')
        };
      });
    },

    // Clear expired errors
    clearExpiredErrors: () => {
      const now = Date.now();
      set(state => {
        const newErrors = new Map();
        
        for (const [context, error] of state.errors) {
          if (!error.expiresAt || error.expiresAt > now) {
            newErrors.set(context, error);
          }
        }
        
        return {
          errors: newErrors,
          hasErrors: newErrors.size > 0,
          hasCriticalErrors: Array.from(newErrors.values()).some(e => e.severity === 'critical')
        };
      });
    },

    // Clear all errors
    clearAllErrors: () => {
      set({
        errors: new Map(),
        hasErrors: false,
        hasCriticalErrors: false
      });
    },

    // Get specific error
    getError: (context: string) => {
      return get().errors.get(context);
    },

    // Get errors by context prefix
    getErrorsByContext: (contextPrefix: string) => {
      const errors = Array.from(get().errors.values());
      return errors.filter(error => error.context.startsWith(contextPrefix));
    },

    // Get errors by severity
    getErrorsBySeverity: (severity: ErrorInfo['severity']) => {
      const errors = Array.from(get().errors.values());
      return errors.filter(error => error.severity === severity);
    },

    // Get critical errors
    getCriticalErrors: () => {
      return get().getErrorsBySeverity('critical');
    },

    // Retry error with optional retry function
    retryError: async (context: string, retryFn?: () => Promise<void>) => {
      const error = get().getError(context);
      if (!error) return;
      
      try {
        if (retryFn) {
          await retryFn();
        }
        // Clear error if retry succeeds
        get().clearError(context);
      } catch (retryError) {
        // Update error with retry failure
        get().setError(`${context} (retry failed)`, retryError, {
          severity: error.severity,
          userId: error.userId
        });
      }
    },

    // Trigger reauth flow
    triggerReauth: () => {
      // This would typically trigger a global auth state update
      // For now, just log the action
      console.info('Reauth triggered from error store');
      
      // Could dispatch a global event or update auth store
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-required'));
      }
    },

    // Navigate to recovery URL
    navigateToRecovery: (context: string) => {
      const error = get().getError(context);
      if (error?.recoveryUrl) {
        if (typeof window !== 'undefined') {
          window.location.href = error.recoveryUrl;
        }
      }
    }
  }))
);

/**
 * Auto-cleanup expired errors every minute
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    useErrorStore.getState().clearExpiredErrors();
  }, 60000);
}

/**
 * Hook for easy error management in components
 */
export function useErrorHandler(context: string) {
  const { setError, clearError, getError, retryError } = useErrorStore();
  
  return {
    setError: (error: unknown, options?: Partial<ErrorInfo>) => 
      setError(context, error, options),
    clearError: () => clearError(context),
    error: getError(context),
    retryError: (retryFn?: () => Promise<void>) => retryError(context, retryFn),
    hasError: !!getError(context)
  };
}

/**
 * Hook for page-level error management
 */
export function usePageErrors(pageName: string) {
  const { getErrorsByContext, clearError } = useErrorStore();
  const pageErrors = getErrorsByContext(pageName.toLowerCase());
  
  return {
    errors: pageErrors,
    hasErrors: pageErrors.length > 0,
    hasCriticalErrors: pageErrors.some(e => e.severity === 'critical'),
    clearPageErrors: () => {
      pageErrors.forEach(error => clearError(error.context));
    }
  };
}

/**
 * Hook for Firebase-specific error handling
 */
export function useFirebaseErrors() {
  const errors = Array.from(useErrorStore(state => state.errors.values()));
  const firebaseErrors = errors.filter(error => error.isFirebaseError);
  
  return {
    errors: firebaseErrors,
    hasFirebaseErrors: firebaseErrors.length > 0,
    authErrors: firebaseErrors.filter(error => error.requiresAuth),
    hasAuthErrors: firebaseErrors.some(error => error.requiresAuth)
  };
}