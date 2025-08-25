import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';
import { secureDeepgramTokenClient } from '@/services/universal-assistant/SecureDeepgramTokenClient';
import { ClientServiceContainer } from '@/services/universal-assistant/ClientServiceContainer';

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(public url: string, public protocols?: string | string[]) {
    // Simulate connection establishment
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: any) {
    // Mock send functionality
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Test close' }));
    }
  }
}

// Mock fetch for token requests
const mockFetch = jest.fn();
global.fetch = mockFetch;
global.WebSocket = MockWebSocket as any;

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-firebase-token'),
      uid: 'test-user',
    },
  })),
}));

describe('Secure Deepgram Integration', () => {
  let deepgramService: DeepgramSTT;
  let serviceContainer: ClientServiceContainer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Setup mock token response
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        token: 'secure-test-token-' + Date.now(),
        expiresIn: 30,
        timestamp: new Date().toISOString(),
      }),
    });

    serviceContainer = ClientServiceContainer.getInstance();
    deepgramService = serviceContainer.getDeepgramSTT();
  });

  afterEach(() => {
    // Cleanup any active connections
    if (deepgramService) {
      deepgramService.stopLiveTranscription().catch(() => {});
    }
    secureDeepgramTokenClient.clearToken();
  });

  describe('Secure Connection Establishment', () => {
    test('should establish secure WebSocket connection using token provider', async () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      // Spy on WebSocket constructor to verify secure token usage
      const webSocketSpy = jest.spyOn(global, 'WebSocket' as any);
      
      await deepgramService.startLiveTranscriptionSecure(tokenProvider, {
        model: 'nova-2',
        language: 'en-US',
      });

      // Verify WebSocket was created with secure token
      expect(webSocketSpy).toHaveBeenCalledWith(
        expect.stringContaining('wss://api.deepgram.com/v1/listen'),
        expect.arrayContaining(['token', expect.stringMatching(/^secure-test-token-/)])
      );
      
      // Verify token was fetched from secure endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/universal-assistant/deepgram-token',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-firebase-token',
          }),
        })
      );

      webSocketSpy.mockRestore();
    });

    test('should use correct WebSocket URL parameters for secure connection', async () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      const webSocketSpy = jest.spyOn(global, 'WebSocket' as any);
      
      await deepgramService.startLiveTranscriptionSecure(tokenProvider, {
        model: 'nova-3',
        language: 'en-CA',
        diarize: true,
        punctuate: false,
        smart_format: true,
        utterances: true,
      });

      const [url] = webSocketSpy.mock.calls[0];
      const urlObj = new URL(url);

      expect(urlObj.searchParams.get('model')).toBe('nova-3');
      expect(urlObj.searchParams.get('language')).toBe('en-CA');
      expect(urlObj.searchParams.get('diarize')).toBe('true');
      expect(urlObj.searchParams.get('punctuate')).toBe('false');
      expect(urlObj.searchParams.get('smart_format')).toBe('true');
      expect(urlObj.searchParams.get('utterances')).toBe('true');
      expect(urlObj.searchParams.get('interim_results')).toBe('true');

      webSocketSpy.mockRestore();
    });

    test('should handle token refresh during connection lifecycle', async () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      // First connection
      await deepgramService.startLiveTranscriptionSecure(tokenProvider);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Stop and restart - should reuse cached token
      await deepgramService.stopLiveTranscription();
      await deepgramService.startLiveTranscriptionSecure(tokenProvider);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only one call

      // Clear token cache to force refresh
      secureDeepgramTokenClient.clearToken();
      
      // New connection should fetch new token
      await deepgramService.startLiveTranscription();
      await deepgramService.startLiveTranscriptionSecure(tokenProvider);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Now two calls
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle token fetch failure gracefully', async () => {
      // Mock token fetch failure
      mockFetch.mockRejectedValueOnce(new Error('Token service unavailable'));
      
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      await expect(
        deepgramService.startLiveTranscriptionSecure(tokenProvider)
      ).rejects.toThrow('Token service unavailable');
    });

    test('should handle WebSocket connection errors', async () => {
      // Mock WebSocket that immediately errors
      class FailingMockWebSocket extends MockWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 5);
        }
      }

      global.WebSocket = FailingMockWebSocket as any;
      
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      await expect(
        deepgramService.startLiveTranscriptionSecure(tokenProvider)
      ).rejects.toThrow();

      // Restore original mock
      global.WebSocket = MockWebSocket as any;
    });

    test('should handle invalid token response', async () => {
      // Mock invalid token response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: false, // Invalid response
        }),
      });

      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      await expect(
        deepgramService.startLiveTranscriptionSecure(tokenProvider)
      ).rejects.toThrow('Invalid token response from server');
    });
  });

  describe('Connection Lifecycle', () => {
    test('should properly cleanup secure connections', async () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      // Start secure connection
      await deepgramService.startLiveTranscriptionSecure(tokenProvider);
      
      // Verify connection is active
      expect(deepgramService.isConnected()).toBe(true);
      
      // Stop connection
      await deepgramService.stopLiveTranscription();
      
      // Verify connection is stopped
      expect(deepgramService.isConnected()).toBe(false);
    });

    test('should handle multiple concurrent secure connections', async () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      // Create multiple service instances
      const service1 = new DeepgramSTT('placeholder-1');
      const service2 = new DeepgramSTT('placeholder-2');
      
      try {
        // Start both connections concurrently
        await Promise.all([
          service1.startLiveTranscriptionSecure(tokenProvider, { model: 'nova-2' }),
          service2.startLiveTranscriptionSecure(tokenProvider, { model: 'nova-3' }),
        ]);

        // Both should be connected
        expect(service1.isConnected()).toBe(true);
        expect(service2.isConnected()).toBe(true);

        // Should have reused the same cached token (only one fetch)
        expect(mockFetch).toHaveBeenCalledTimes(1);

      } finally {
        // Cleanup
        await Promise.all([
          service1.stopLiveTranscription().catch(() => {}),
          service2.stopLiveTranscription().catch(() => {}),
        ]);
      }
    });
  });

  describe('Service Container Integration', () => {
    test('should provide secure token provider through service container', () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      expect(typeof tokenProvider).toBe('function');
      expect(tokenProvider).toBeDefined();
    });

    test('should maintain singleton behavior for secure client', () => {
      const container1 = ClientServiceContainer.getInstance();
      const container2 = ClientServiceContainer.getInstance();
      
      expect(container1).toBe(container2);
      
      const provider1 = container1.getDeepgramTokenProvider();
      const provider2 = container2.getDeepgramTokenProvider();
      
      // Should be the same function reference
      expect(provider1.toString()).toBe(provider2.toString());
    });

    test('should handle secure connections through service container', async () => {
      const container = ClientServiceContainer.getInstance();
      const deepgram = container.getDeepgramSTT();
      const tokenProvider = container.getDeepgramTokenProvider();
      
      await deepgram.startLiveTranscriptionSecure(tokenProvider);
      
      expect(deepgram.isConnected()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/universal-assistant/deepgram-token',
        expect.any(Object)
      );
      
      await deepgram.stopLiveTranscription();
    });
  });

  describe('Performance and Caching', () => {
    test('should cache tokens effectively to avoid repeated API calls', async () => {
      const tokenProvider = serviceContainer.getDeepgramTokenProvider();
      
      // Make multiple token requests in quick succession
      const token1Promise = tokenProvider();
      const token2Promise = tokenProvider();
      const token3Promise = tokenProvider();
      
      const [token1, token2, token3] = await Promise.all([
        token1Promise,
        token2Promise,
        token3Promise,
      ]);

      // All should return the same token
      expect(token1).toBe(token2);
      expect(token2).toBe(token3);
      
      // Should only have made one API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle token expiry correctly', async () => {
      const originalDateNow = Date.now;
      const baseTime = 1000000;
      Date.now = jest.fn().mockReturnValue(baseTime);

      try {
        const tokenProvider = serviceContainer.getDeepgramTokenProvider();
        
        // Get initial token
        const token1 = await tokenProvider();
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Advance time to near token expiry
        Date.now = jest.fn().mockReturnValue(
          baseTime + (30 * 1000) - 2000 // 2 seconds before expiry
        );

        // Mock new token response
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            success: true,
            token: 'refreshed-token',
            expiresIn: 30,
            timestamp: new Date().toISOString(),
          }),
        });

        // Get token again - should refresh due to impending expiry
        const token2 = await tokenProvider();
        
        expect(token1).not.toBe(token2);
        expect(token2).toBe('refreshed-token');
        expect(mockFetch).toHaveBeenCalledTimes(2);

      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});