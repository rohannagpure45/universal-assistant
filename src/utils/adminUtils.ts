/**
 * SECURITY-CRITICAL: Client-Side Admin Utility Functions
 * 
 * IMPORTANT: These functions are for UI convenience only and should NEVER be trusted
 * for actual security decisions. All admin validation must be performed server-side.
 * 
 * OWASP Reference: Never trust client-side data (A03:2021 - Injection)
 */

import { 
  AdminUser, 
  AdminValidationResponse, 
  AdminValidationError, 
  AdminValidationState,
  ClientAdminUser,
  AdminValidationOptions,
  AdminLevel,
  AdminValidationErrorCode,
  ADMIN_VALIDATION_TIMEOUT,
  MAX_ADMIN_VALIDATION_RETRIES,
  isClientAdminUser
} from '@/types/admin';

/**
 * CLIENT-SIDE ONLY: Check if a user has admin privileges
 * WARNING: This is for UI display only. All security decisions must be server-side validated.
 */
export function isAdminUser(user: ClientAdminUser | null | undefined): boolean {
  if (!user) return false;
  
  // Check Firebase custom claims (primary method)
  const customClaims = user.customClaims;
  if (customClaims?.admin === true) {
    return true;
  }
  
  // Check isAdmin field from user object (fallback method)
  if ((user as any).isAdmin === true) {
    return true;
  }
  
  // Check admin emails as final fallback for client-side UI
  const adminEmails = ['ribt2218@gmail.com', 'rohan@linkstudio.ai'];
  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * CLIENT-SIDE ONLY: Get admin status for a user
 * WARNING: For UI display only. Server-side validation required for security decisions.
 */
export function getAdminStatus(user: ClientAdminUser | null | undefined): {
  isAdmin: boolean;
  adminLevel?: string;
  email: string | null;
} {
  const email = user?.email || null;
  const customClaims = user?.customClaims;
  
  return {
    isAdmin: isAdminUser(user),
    adminLevel: customClaims?.adminLevel,
    email
  };
}

/**
 * CLIENT-SIDE ONLY: Admin access check for UI components
 * WARNING: This should NEVER be used for actual security enforcement
 */
export function requireAdminAccess(user: ClientAdminUser | null | undefined): void {
  if (!isAdminUser(user)) {
    throw new Error('Admin access required for this UI component. Note: Security validation must be performed server-side.');
  }
}

/**
 * CLIENT-SIDE ONLY: Filter navigation items for admin-only features
 * WARNING: This is for UI convenience only. API endpoints must validate admin access independently.
 */
export function filterAdminNavigation<T extends { adminOnly?: boolean }>(
  items: T[],
  user: ClientAdminUser | null | undefined
): T[] {
  const isAdmin = isAdminUser(user);
  return items.filter(item => !item.adminOnly || isAdmin);
}

/**
 * CLIENT-SIDE ONLY: Check if user has specific admin level
 * WARNING: For UI display only. Critical for server-side validation.
 */
export function hasAdminLevel(
  user: ClientAdminUser | null | undefined,
  requiredLevel: AdminLevel
): boolean {
  if (!isAdminUser(user)) return false;
  
  const userLevel = user?.customClaims?.adminLevel;
  if (requiredLevel === 'standard') {
    return userLevel === 'standard' || userLevel === 'super';
  }
  
  return userLevel === 'super';
}

/**
 * SECURITY-CRITICAL: Server-side admin validation function with timeout and retry logic
 * This function makes an API call to validate admin status server-side
 */
export async function validateAdminAccessServerSide(
  idToken: string, 
  options: AdminValidationOptions = {}
): Promise<AdminValidationResponse> {
  const {
    timeout = ADMIN_VALIDATION_TIMEOUT,
    retryOnFailure = true,
    maxRetries = MAX_ADMIN_VALIDATION_RETRIES,
    requireLevel,
    requiredPermissions
  } = options;

  const startTime = Date.now();
  let lastError: AdminValidationError | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch('/api/admin/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          idToken,
          requireLevel,
          requiredPermissions
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      const validationDuration = Date.now() - startTime;
      
      if (!response.ok) {
        const errorCode = getErrorCodeFromResponse(response.status, data.error);
        const error: AdminValidationError = {
          code: errorCode,
          message: data.error || 'Server-side validation failed',
          details: data.details || {},
          retryable: isRetryableError(errorCode),
          timestamp: new Date().toISOString()
        };

        if (!error.retryable || !retryOnFailure || attempt === maxRetries) {
          return {
            isValid: false,
            error,
            securityContext: {
              timestamp: new Date().toISOString(),
              requestId: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            validationDuration
          };
        }
        
        lastError = error;
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        continue;
      }

      // Validate response structure
      if (!data.isValid || !data.user) {
        const error: AdminValidationError = {
          code: 'INVALID_TOKEN',
          message: 'Invalid response structure from validation service',
          details: { responseData: data },
          retryable: false,
          timestamp: new Date().toISOString()
        };

        return {
          isValid: false,
          error,
          securityContext: {
            timestamp: new Date().toISOString(),
            requestId: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
          validationDuration
        };
      }

      // Type-safe user validation
      const adminUser: AdminUser = {
        ...data.user,
        isAdmin: true as const,
        adminLevel: data.user.adminLevel || 'standard'
      };

      return {
        isValid: true,
        user: adminUser,
        securityContext: {
          timestamp: new Date().toISOString(),
          requestId: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          validatedAt: new Date().toISOString()
        },
        validationDuration
      };

    } catch (error) {
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      const errorCode: AdminValidationErrorCode = isAbortError ? 'VALIDATION_TIMEOUT' : 'NETWORK_ERROR';
      
      const validationError: AdminValidationError = {
        code: errorCode,
        message: isAbortError ? 'Admin validation timeout' : 'Network error during admin validation',
        details: { 
          attempt, 
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        retryable: !isAbortError && retryOnFailure,
        timestamp: new Date().toISOString()
      };

      if (!validationError.retryable || attempt === maxRetries) {
        return {
          isValid: false,
          error: validationError,
          securityContext: {
            timestamp: new Date().toISOString(),
            requestId: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          },
          validationDuration: Date.now() - startTime
        };
      }

      lastError = validationError;
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    isValid: false,
    error: lastError || {
      code: 'UNKNOWN_ERROR',
      message: 'Maximum retries exceeded',
      details: {},
      retryable: false,
      timestamp: new Date().toISOString()
    },
    securityContext: {
      timestamp: new Date().toISOString(),
      requestId: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },
    validationDuration: Date.now() - startTime
  };
}

/**
 * Create a validation state manager for admin operations
 */
export function createAdminValidationState(): AdminValidationState {
  return {
    isValidating: false,
    isValid: null,
    user: null,
    error: null,
    lastValidated: undefined,
    validationTimeout: undefined
  };
}

/**
 * Utility function to determine error code from HTTP response
 */
function getErrorCodeFromResponse(status: number, errorMessage?: string): AdminValidationErrorCode {
  switch (status) {
    case 401:
      return errorMessage?.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    case 403:
      return 'INSUFFICIENT_PRIVILEGES';
    case 408:
      return 'VALIDATION_TIMEOUT';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Utility function to determine if an error is retryable
 */
function isRetryableError(code: AdminValidationErrorCode): boolean {
  return ['NETWORK_ERROR', 'SERVICE_UNAVAILABLE', 'VALIDATION_TIMEOUT'].includes(code);
}