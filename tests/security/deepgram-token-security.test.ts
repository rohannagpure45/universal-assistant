import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SecureDeepgramTokenClient } from '@/services/universal-assistant/SecureDeepgramTokenClient';
import { ErrorTracker } from '@/services/monitoring/ErrorTracker';
import { getAuth } from 'firebase/auth';
import { DEEPGRAM_TOKEN_CONFIG, SECURITY_ERROR_TYPES } from '@/config/securityConfig';

// Mock dependencies
jest.mock('firebase/auth');
jest.mock('@/services/monitoring/ErrorTracker');

const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockErrorTracker = ErrorTracker as jest.Mocked<typeof ErrorTracker>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortController
class MockAbortController {
  signal = { aborted: false };
  abort = jest.fn(() => {
    this.signal.aborted = true;
  });
}
global.AbortController = MockAbortController as any;

describe('SecureDeepgramTokenClient', () => {
  let client: SecureDeepgramTokenClient;
  let mockUser: any;
  let mockAuth: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockFetch.mockClear();

    // Create new client instance for each test
    client = new SecureDeepgramTokenClient();

    // Setup Firebase Auth mocks
    mockUser = {
      getIdToken: jest.fn().mockResolvedValue('mock-firebase-id-token'),
      uid: 'test-user-id',
    };

    mockAuth = {
      currentUser: mockUser,
    };

    mockGetAuth.mockReturnValue(mockAuth);

    // Setup ErrorTracker mock
    mockErrorTracker.logError = jest.fn();
  });

  afterEach(() => {
    // Clear any stored tokens
    client.clearToken();
  });

  describe('Token Fetching', () => {
    test('should successfully fetch and cache a new token', async () => {
      const mockTokenResponse = {
        success: true,
        token: 'mock-deepgram-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      const token = await client.getToken();

      expect(token).toBe('mock-deepgram-token');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/universal-assistant/deepgram-token',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-firebase-id-token',
            'Content-Type': 'application/json',
          }),
          signal: expect.any(Object),
        })
      );
    });

    test('should return cached token when still valid', async () => {
      // First call to cache the token
      const mockTokenResponse = {
        success: true,
        token: 'cached-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      const firstToken = await client.getToken();
      expect(firstToken).toBe('cached-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should return cached token without additional fetch
      const secondToken = await client.getToken();
      expect(secondToken).toBe('cached-token');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only called once
    });

    test('should refresh token when approaching expiry', async () => {
      // Mock Date.now to simulate token nearing expiry
      const originalDateNow = Date.now;
      const baseTime = 1000000;
      Date.now = jest.fn().mockReturnValue(baseTime);

      // First token fetch
      const firstTokenResponse = {
        success: true,
        token: 'first-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(firstTokenResponse),
      });

      const firstToken = await client.getToken();
      expect(firstToken).toBe('first-token');

      // Advance time to trigger refresh (within buffer period)
      Date.now = jest.fn().mockReturnValue(
        baseTime + (30 * 1000) - (DEEPGRAM_TOKEN_CONFIG.TOKEN_REFRESH_BUFFER_MS / 2)
      );

      // Second token fetch (should refresh)
      const secondTokenResponse = {
        success: true,
        token: 'refreshed-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(secondTokenResponse),
      });

      const refreshedToken = await client.getToken();
      expect(refreshedToken).toBe('refreshed-token');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe('Error Handling', () => {
    test('should throw error when user is not authenticated', async () => {
      mockAuth.currentUser = null;

      await expect(client.getToken()).rejects.toThrow(
        'User must be authenticated to get Deepgram token'
      );

      expect(mockErrorTracker.logError).toHaveBeenCalledWith(
        'SecureDeepgramTokenClient',
        'Authentication required',
        expect.any(Error),
        expect.objectContaining({
          category: 'authentication',
          severity: 'medium',
          errorType: SECURITY_ERROR_TYPES.CONNECTION_UNAUTHORIZED,
        })
      );
    });

    test('should handle API response errors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ error: 'Token invalid' }),
      });

      await expect(client.getToken()).rejects.toThrow('Token invalid');

      expect(mockErrorTracker.logError).toHaveBeenCalledWith(
        'SecureDeepgramTokenClient',
        'Token request failed',
        expect.any(Error),
        expect.objectContaining({
          category: 'authentication',
          severity: 'high',
          errorType: SECURITY_ERROR_TYPES.TOKEN_INVALID,
        })
      );
    });

    test('should handle network errors', async () => {
      const networkError = new Error('Network failure');
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(client.getToken()).rejects.toThrow('Network failure');

      expect(mockErrorTracker.logError).toHaveBeenCalledWith(
        'SecureDeepgramTokenClient',
        'Token fetch operation failed',
        networkError,
        expect.objectContaining({
          category: 'network',
          severity: 'high',
          errorType: SECURITY_ERROR_TYPES.TOKEN_REFRESH_FAILED,
        })
      );
    });

    test('should handle invalid token response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: false }), // Invalid response
      });

      await expect(client.getToken()).rejects.toThrow(
        'Invalid token response from server'
      );

      expect(mockErrorTracker.logError).toHaveBeenCalledWith(
        'SecureDeepgramTokenClient',
        'Invalid token response',
        expect.any(Error),
        expect.objectContaining({
          category: 'network',
          severity: 'high',
          errorType: SECURITY_ERROR_TYPES.TOKEN_REFRESH_FAILED,
        })
      );
    });

    test('should handle request timeout', async () => {
      // Mock fetch to never resolve (simulating timeout)
      mockFetch.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Mock setTimeout to immediately call the callback
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback) => {
        if (typeof callback === 'function') {
          callback();
        }
        return 1 as any;
      });

      await expect(client.getToken()).rejects.toThrow();

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Token Validation', () => {
    test('hasValidToken should return true for valid cached token', async () => {
      const mockTokenResponse = {
        success: true,
        token: 'valid-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      // Fetch token first
      await client.getToken();

      // Should return true for valid token
      expect(client.hasValidToken()).toBe(true);
    });

    test('hasValidToken should return false for no cached token', () => {
      expect(client.hasValidToken()).toBe(false);
    });

    test('hasValidToken should return false for expired token', async () => {
      const originalDateNow = Date.now;
      const baseTime = 1000000;
      Date.now = jest.fn().mockReturnValue(baseTime);

      const mockTokenResponse = {
        success: true,
        token: 'expired-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      // Fetch token
      await client.getToken();

      // Advance time past token expiry
      Date.now = jest.fn().mockReturnValue(
        baseTime + (35 * 1000) // 35 seconds later
      );

      expect(client.hasValidToken()).toBe(false);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe('Token Clearing', () => {
    test('clearToken should remove cached token', async () => {
      // First fetch and cache a token
      const mockTokenResponse = {
        success: true,
        token: 'token-to-clear',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      await client.getToken();
      expect(client.hasValidToken()).toBe(true);

      // Clear the token
      client.clearToken();
      expect(client.hasValidToken()).toBe(false);
    });
  });

  describe('Concurrent Token Requests', () => {
    test('should handle concurrent token requests without duplicate API calls', async () => {
      const mockTokenResponse = {
        success: true,
        token: 'concurrent-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      // Add a small delay to the fetch mock to simulate real network behavior
      mockFetch.mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: jest.fn().mockResolvedValue(mockTokenResponse),
            });
          }, 10);
        })
      );

      // Make multiple concurrent requests
      const promises = [
        client.getToken(),
        client.getToken(),
        client.getToken(),
      ];

      const results = await Promise.all(promises);

      // All should return the same token
      expect(results[0]).toBe('concurrent-token');
      expect(results[1]).toBe('concurrent-token');
      expect(results[2]).toBe('concurrent-token');

      // But only one API call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security Configuration', () => {
    test('should use correct timeout configuration', async () => {
      const mockTokenResponse = {
        success: true,
        token: 'timeout-test-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      await client.getToken();

      // Verify setTimeout was called with correct timeout
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(Object),
        })
      );
    });

    test('should include proper security headers', async () => {
      const mockTokenResponse = {
        success: true,
        token: 'header-test-token',
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      });

      await client.getToken();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/universal-assistant/deepgram-token',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'UniversalAssistant/1.0',
            'Authorization': 'Bearer mock-firebase-id-token',
          }),
        })
      );
    });
  });
});