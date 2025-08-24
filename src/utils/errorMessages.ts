/**
 * User-friendly error message utilities
 * 
 * Provides consistent, accessible error messaging across the application
 * with user-friendly messages while preserving technical details for debugging.
 */

export interface UserError {
  /** User-friendly message to display */
  userMessage: string;
  /** Technical details for debugging (logged to console) */
  technicalDetails?: string;
  /** Error category for analytics and handling */
  category: 'network' | 'permission' | 'audio' | 'storage' | 'validation' | 'system' | 'firebase-permission' | 'firebase-network' | 'firebase-quota';
  /** Action the user can take to resolve the issue */
  actionHint?: string;
}

/**
 * Common error messages with user-friendly alternatives
 */
export const ERROR_MESSAGES = {
  // Audio/Microphone errors
  MICROPHONE_ACCESS_DENIED: {
    userMessage: "We need microphone access to record your voice.",
    category: 'permission' as const,
    actionHint: "Please allow microphone access in your browser settings and try again."
  },
  
  MICROPHONE_NOT_FOUND: {
    userMessage: "No microphone was found on your device.",
    category: 'audio' as const,
    actionHint: "Please connect a microphone and refresh the page."
  },
  
  RECORDING_FAILED: {
    userMessage: "Recording couldn't be started.",
    category: 'audio' as const,
    actionHint: "Please check your microphone connection and try again."
  },
  
  PLAYBACK_FAILED: {
    userMessage: "Audio playback isn't working.",
    category: 'audio' as const,
    actionHint: "Please check your speakers or headphones and try again."
  },
  
  // Network errors
  NETWORK_ERROR: {
    userMessage: "Connection issue detected.",
    category: 'network' as const,
    actionHint: "Please check your internet connection and try again."
  },
  
  SERVER_ERROR: {
    userMessage: "Our servers are experiencing issues.",
    category: 'network' as const,
    actionHint: "Please try again in a few moments."
  },
  
  // Storage errors
  STORAGE_FULL: {
    userMessage: "Not enough storage space available.",
    category: 'storage' as const,
    actionHint: "Please free up some space and try again."
  },
  
  UPLOAD_FAILED: {
    userMessage: "File upload didn't complete.",
    category: 'storage' as const,
    actionHint: "Please check your connection and try uploading again."
  },
  
  // Validation errors
  INVALID_INPUT: {
    userMessage: "Please check the information you entered.",
    category: 'validation' as const,
    actionHint: "Make sure all required fields are filled out correctly."
  },
  
  // System errors
  SYSTEM_ERROR: {
    userMessage: "Something unexpected happened.",
    category: 'system' as const,
    actionHint: "Please refresh the page and try again."
  },
  
  // Voice identification specific
  VOICE_PROCESSING_FAILED: {
    userMessage: "Voice processing encountered an issue.",
    category: 'system' as const,
    actionHint: "Please try recording a new sample."
  },
  
  PROFILE_LOAD_FAILED: {
    userMessage: "Voice profiles couldn't be loaded.",
    category: 'network' as const,
    actionHint: "Please refresh the page to try again."
  },
  
  // Firebase-specific errors (secure, no internal details exposed)
  FIREBASE_PERMISSION_DENIED: {
    userMessage: "You don't have permission to access this feature.",
    category: 'firebase-permission' as const,
    actionHint: "Please sign in with an account that has the required permissions."
  },
  
  FIREBASE_QUOTA_EXCEEDED: {
    userMessage: "Service is temporarily busy.",
    category: 'firebase-quota' as const,
    actionHint: "Please try again in a few minutes."
  },
  
  FIREBASE_NETWORK_ERROR: {
    userMessage: "Unable to connect to our services.",
    category: 'firebase-network' as const,
    actionHint: "Check your internet connection and try again."
  },
  
  FIREBASE_DOCUMENT_NOT_FOUND: {
    userMessage: "The requested information could not be found.",
    category: 'firebase-network' as const,
    actionHint: "The data may have been moved or deleted. Please refresh and try again."
  },
  
  FIREBASE_OPERATION_FAILED: {
    userMessage: "Unable to complete the operation.",
    category: 'firebase-network' as const,
    actionHint: "Please check your internet connection and try again."
  }
} as const;

/**
 * Creates a user-friendly error from a technical error
 */
export function createUserError(
  errorKey: keyof typeof ERROR_MESSAGES,
  technicalDetails?: string | Error
): UserError {
  const baseError = ERROR_MESSAGES[errorKey];
  
  return {
    ...baseError,
    technicalDetails: technicalDetails instanceof Error 
      ? `${technicalDetails.name}: ${technicalDetails.message}`
      : technicalDetails || undefined
  };
}

/**
 * Logs error details while returning user-friendly message
 */
export function handleError(
  errorKey: keyof typeof ERROR_MESSAGES,
  technicalError?: string | Error,
  context?: string
): string {
  const userError = createUserError(errorKey, technicalError);
  
  // Log technical details for debugging
  console.error(`[${userError.category.toUpperCase()}] ${context || 'Error'}:`, {
    userMessage: userError.userMessage,
    technicalDetails: userError.technicalDetails,
    actionHint: userError.actionHint,
    timestamp: new Date().toISOString()
  });
  
  return userError.userMessage;
}

/**
 * Enhanced error component props
 */
export interface ErrorDisplayProps {
  error: UserError | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showActionHint?: boolean;
  className?: string;
}

/**
 * Maps common error patterns to user-friendly messages
 */
export function mapTechnicalError(error: Error | string): keyof typeof ERROR_MESSAGES {
  const errorStr = error instanceof Error ? error.message.toLowerCase() : error.toLowerCase();
  
  // Firebase-specific error detection (safe patterns only)
  // Firebase permission errors
  if (errorStr.includes('permission-denied') || errorStr.includes('missing or insufficient permissions')) {
    return 'FIREBASE_PERMISSION_DENIED';
  }
  
  // Firebase quota errors
  if (errorStr.includes('quota exceeded') || errorStr.includes('quota-exceeded')) {
    return 'FIREBASE_QUOTA_EXCEEDED';
  }
  
  // Firebase network/connection errors
  if (errorStr.includes('failed to get document') || 
      errorStr.includes('firestore unavailable') ||
      errorStr.includes('firestore') && (errorStr.includes('network') || errorStr.includes('connection'))) {
    return 'FIREBASE_NETWORK_ERROR';
  }
  
  // Firebase document not found
  if (errorStr.includes('document not found') || errorStr.includes('no document to update')) {
    return 'FIREBASE_DOCUMENT_NOT_FOUND';
  }
  
  // Generic Firebase operation failures
  if (errorStr.includes('firestore') || errorStr.includes('firebase')) {
    return 'FIREBASE_OPERATION_FAILED';
  }
  
  // Non-Firebase permission errors (existing logic)
  if (errorStr.includes('permission') || errorStr.includes('denied') || errorStr.includes('notallowed')) {
    return 'MICROPHONE_ACCESS_DENIED';
  }
  
  // Network errors
  if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('connection')) {
    return 'NETWORK_ERROR';
  }
  
  // Audio errors
  if (errorStr.includes('microphone') || errorStr.includes('audio') || errorStr.includes('media')) {
    if (errorStr.includes('not found') || errorStr.includes('no device')) {
      return 'MICROPHONE_NOT_FOUND';
    }
    return 'RECORDING_FAILED';
  }
  
  // Storage errors
  if (errorStr.includes('storage') || errorStr.includes('quota') || errorStr.includes('space')) {
    return 'STORAGE_FULL';
  }
  
  // Default to system error
  return 'SYSTEM_ERROR';
}

/**
 * Type-safe error processor for unknown catch block errors
 * Preserves Error objects for better debugging while ensuring type safety
 * 
 * @param error - Unknown error from catch block
 * @returns Processed Error object with preserved stack trace when possible
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   const processedError = processCatchError(err);
 *   setError(friendlyError(processedError, 'Operation context'));
 * }
 * ```
 */
export function processCatchError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  // Handle null, undefined, objects, etc.
  return new Error(`Unexpected error: ${String(error)}`);
}

/**
 * Enhanced friendlyError that safely processes unknown error types
 * 
 * @param error - Unknown error from catch block (any type)
 * @param context - Optional context for debugging (max 100 chars, sanitized)
 * @returns User-friendly error message string
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   setError(safeFriendlyError(err, 'Operation context'));
 * }
 * ```
 */
export function safeFriendlyError(error: unknown, context?: string): string {
  const processedError = processCatchError(error);
  // Sanitize context to prevent potential injection and limit length
  const sanitizedContext = context?.replace(/[<>]/g, '').substring(0, 100);
  return friendlyError(processedError, sanitizedContext);
}

/**
 * Convenience function for common error handling pattern
 */
export function friendlyError(error: Error | string, context?: string): string {
  const errorKey = mapTechnicalError(error);
  return handleError(errorKey, error, context);
}

/**
 * Firebase error detection utility (secure - no internal code exposure)
 * 
 * @param error - Error object to check
 * @returns boolean indicating if this is a Firebase error
 */
export function isFirebaseError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('permission-denied') ||
    message.includes('missing or insufficient permissions') ||
    message.includes('quota exceeded') ||
    message.includes('failed to get document') ||
    message.includes('firestore') ||
    message.includes('firebase')
  );
}

/**
 * Check if error is a Firebase permission error specifically
 * 
 * @param error - Error object to check
 * @returns boolean indicating if this is a Firebase permission error
 */
export function isFirebasePermissionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('permission-denied') ||
    message.includes('missing or insufficient permissions')
  );
}

/**
 * Check if error should trigger an automatic retry
 * 
 * @param error - Error object to check
 * @returns boolean indicating if this error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('unavailable') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('failed to fetch')
  );
}