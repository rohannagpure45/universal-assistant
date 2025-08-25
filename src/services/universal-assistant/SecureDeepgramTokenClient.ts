/**
 * SecureDeepgramTokenClient - Manages secure Deepgram tokens
 * 
 * Fetches temporary tokens from the secure API endpoint instead of using
 * exposed NEXT_PUBLIC_DEEPGRAM_API_KEY. Tokens have 30-second TTL for security.
 */

import { getAuth } from 'firebase/auth';
import { ErrorTracker } from '@/services/monitoring/ErrorTracker';
import { 
  DEEPGRAM_TOKEN_CONFIG, 
  API_ENDPOINTS, 
  SECURITY_HEADERS,
  SECURITY_ERROR_TYPES,
  type SecurityErrorType 
} from '@/config/securityConfig';

interface DeepgramTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
  timestamp: string;
}

export class SecureDeepgramTokenClient {
  private currentToken: string | null = null;
  private tokenExpiry: number | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;

  /**
   * Get a valid Deepgram token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.currentToken && this.tokenExpiry && 
        Date.now() < this.tokenExpiry - DEEPGRAM_TOKEN_CONFIG.TOKEN_REFRESH_BUFFER_MS) {
      return this.currentToken;
    }

    // If a refresh is already in progress, wait for it
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    // Start a new token refresh
    this.tokenRefreshPromise = this.fetchNewToken();
    
    try {
      const token = await this.tokenRefreshPromise;
      this.tokenRefreshPromise = null;
      return token;
    } catch (error) {
      this.tokenRefreshPromise = null;
      throw error;
    }
  }

  /**
   * Fetch a new token from the secure API endpoint
   */
  private async fetchNewToken(): Promise<string> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      const error = new Error('User must be authenticated to get Deepgram token');
      ErrorTracker.logError(
        'SecureDeepgramTokenClient',
        'Authentication required',
        error,
        { 
          category: 'authentication',
          severity: 'medium',
          errorType: SECURITY_ERROR_TYPES.CONNECTION_UNAUTHORIZED
        }
      );
      throw error;
    }

    try {
      // Get Firebase ID token
      const idToken = await user.getIdToken();
      
      // Fetch secure token from API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        DEEPGRAM_TOKEN_CONFIG.TOKEN_REQUEST_TIMEOUT_MS
      );
      
      const response = await fetch(API_ENDPOINTS.DEEPGRAM_TOKEN, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': SECURITY_HEADERS.CONTENT_TYPE,
          'User-Agent': SECURITY_HEADERS.USER_AGENT,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorType = response.status === 401 ? 
          SECURITY_ERROR_TYPES.TOKEN_INVALID : 
          SECURITY_ERROR_TYPES.TOKEN_REFRESH_FAILED;
          
        const error = new Error(
          errorData.error || `Token request failed: ${response.status} ${response.statusText}`
        );
        
        ErrorTracker.logError(
          'SecureDeepgramTokenClient',
          'Token request failed',
          error,
          {
            category: 'authentication',
            severity: response.status === 401 ? 'high' : 'medium',
            errorType,
            metadata: { 
              status: response.status,
              statusText: response.statusText,
              responseData: errorData
            }
          }
        );
        
        throw error;
      }

      const data: DeepgramTokenResponse = await response.json();
      
      if (!data.success || !data.token) {
        const error = new Error('Invalid token response from server');
        ErrorTracker.logError(
          'SecureDeepgramTokenClient',
          'Invalid token response',
          error,
          {
            category: 'network',
            severity: 'high',
            errorType: SECURITY_ERROR_TYPES.TOKEN_REFRESH_FAILED,
            metadata: { responseData: data }
          }
        );
        throw error;
      }

      // Store token with expiry
      this.currentToken = data.token;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);

      return data.token;

    } catch (error) {
      ErrorTracker.logError(
        'SecureDeepgramTokenClient',
        'Token fetch operation failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          category: 'network',
          severity: 'high',
          errorType: SECURITY_ERROR_TYPES.TOKEN_REFRESH_FAILED
        }
      );
      
      // Clear cached token on error
      this.currentToken = null;
      this.tokenExpiry = null;
      
      throw error;
    }
  }

  /**
   * Clear cached token (useful for logout or token refresh)
   */
  clearToken(): void {
    this.currentToken = null;
    this.tokenExpiry = null;
    this.tokenRefreshPromise = null;
  }

  /**
   * Check if current token is valid
   */
  hasValidToken(): boolean {
    return !!(this.currentToken && this.tokenExpiry && 
      Date.now() < this.tokenExpiry - DEEPGRAM_TOKEN_CONFIG.TOKEN_REFRESH_BUFFER_MS);
  }
}

// Singleton instance for app-wide use
export const secureDeepgramTokenClient = new SecureDeepgramTokenClient();