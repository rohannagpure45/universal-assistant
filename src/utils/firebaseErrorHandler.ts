/**
 * Secure Firebase Error Handler
 * 
 * Provides secure, user-friendly Firebase error handling that builds on
 * the existing processCatchError utility from Issue #4 fix.
 * 
 * Security Features:
 * - No internal Firebase codes exposed to client
 * - No stack traces in user messages
 * - Server-side error reporting only
 * - Safe error categorization
 */

import { 
  processCatchError, 
  friendlyError, 
  isFirebaseError, 
  isFirebasePermissionError,
  isRetryableError 
} from './errorMessages';

/**
 * Secure Firebase error processing - no internal code exposure
 * Builds on Issue #4's processCatchError for type safety
 * 
 * @param error - Unknown error from catch block
 * @param context - Optional context for debugging (safe for logging)
 * @returns User-friendly error message string
 * 
 * @example
 * ```typescript
 * try {
 *   await firestoreOperation();
 * } catch (err) {
 *   const userMessage = handleFirebaseError(err, 'User profile update');
 *   setError(userMessage);
 * }
 * ```
 */
export function handleFirebaseError(error: unknown, context?: string): string {
  // Use our proven Issue #4 type-safe error processing
  const processedError = processCatchError(error);
  
  // Add Firebase context without exposing internals
  const enhancedContext = isFirebaseError(processedError) 
    ? `Firebase ${context || 'operation'}`
    : context;
  
  // Use existing secure error mapping
  return friendlyError(processedError, enhancedContext);
}

/**
 * Check if Firebase error should trigger reauth flow
 * 
 * @param error - Unknown error to check
 * @returns boolean indicating if user should be redirected to sign in
 */
export function shouldTriggerReauth(error: unknown): boolean {
  const processedError = processCatchError(error);
  return isFirebasePermissionError(processedError);
}

/**
 * Check if Firebase error should be automatically retried
 * 
 * @param error - Unknown error to check
 * @returns boolean indicating if operation should be retried
 */
export function shouldRetryOperation(error: unknown): boolean {
  const processedError = processCatchError(error);
  return isRetryableError(processedError);
}

/**
 * Server-side error reporting (security-safe)
 * Only logs non-sensitive information for monitoring
 * 
 * @param error - Error to report
 * @param context - Operation context
 * @param userId - Optional user ID for correlation
 */
export function reportFirebaseError(error: Error, context: string, userId?: string): void {
  // Only log non-sensitive information
  const safeErrorReport = {
    message: error.message,
    context,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
    isFirebaseError: isFirebaseError(error),
    isPermissionError: isFirebasePermissionError(error),
    isRetryable: isRetryableError(error),
    // NO stack traces, internal codes, or system details exposed
  };
  
  // Client-side: Send to server-side logging endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/error-reporting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeErrorReport)
    }).catch(() => {
      // Silent fail for error reporting - don't cascade errors
      console.warn('Failed to report error to server');
    });
  } else {
    // Server-side: Log directly (in API routes, etc.)
    console.error('Firebase Error Report:', safeErrorReport);
  }
}

/**
 * Enhanced error handling with automatic recovery suggestions
 * 
 * @param error - Unknown error to handle
 * @param context - Operation context
 * @param options - Recovery options
 * @returns Object with user message and suggested recovery action
 */
export function handleFirebaseErrorWithRecovery(
  error: unknown, 
  context?: string,
  options: {
    enableRetry?: boolean;
    enableReauth?: boolean;
    maxRetries?: number;
  } = {}
) {
  const processedError = processCatchError(error);
  const userMessage = handleFirebaseError(error, context);
  
  // Determine recovery strategy based on error type
  let recoveryAction: 'none' | 'retry' | 'reauth' | 'refresh' = 'none';
  
  if (options.enableReauth && shouldTriggerReauth(error)) {
    recoveryAction = 'reauth';
  } else if (options.enableRetry && shouldRetryOperation(error)) {
    recoveryAction = 'retry';
  } else if (isFirebaseError(processedError)) {
    recoveryAction = 'refresh';
  }
  
  return {
    userMessage,
    recoveryAction,
    isFirebaseError: isFirebaseError(processedError),
    isRetryable: shouldRetryOperation(error)
  };
}

/**
 * Firebase operation wrapper with built-in error handling
 * Provides consistent error handling pattern for Firebase operations
 * 
 * @param operation - Async Firebase operation to execute
 * @param context - Operation context for error reporting
 * @param options - Error handling options
 * @returns Promise with the operation result or throws user-friendly error
 * 
 * @example
 * ```typescript
 * const result = await withFirebaseErrorHandling(
 *   () => getDoc(userDocRef),
 *   'Get user profile',
 *   { enableRetry: true, maxRetries: 3 }
 * );
 * ```
 */
export async function withFirebaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  options: {
    enableRetry?: boolean;
    maxRetries?: number;
    userId?: string;
  } = {}
): Promise<T> {
  const { enableRetry = false, maxRetries = 3, userId } = options;
  let lastError: unknown;
  
  for (let attempt = 0; attempt < (enableRetry ? maxRetries : 1); attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      const processedError = processCatchError(err);
      
      // Report error for monitoring
      reportFirebaseError(processedError, context, userId);
      
      // Only retry if it's a retryable error and we haven't exceeded max attempts
      if (enableRetry && shouldRetryOperation(err) && attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  // All attempts failed, throw user-friendly error
  throw new Error(handleFirebaseError(lastError, context));
}

/**
 * Delay utility for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}