import type { TTSRequest, TTSResponse } from '@/app/api/universal-assistant/tts/route';

export interface TTSClientOptions {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface TTSPlaybackOptions {
  autoPlay?: boolean;
  volume?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export class TTSApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private activeRequests: Map<string, AbortController> = new Map();

  constructor(options: TTSClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.timeout = options.timeout || 30000; // 30 seconds
    this.retryAttempts = options.retryAttempts || 2;
    this.retryDelay = options.retryDelay || 1000; // 1 second
  }

  /**
   * Generate speech from text using the TTS API
   */
  async generateSpeech(
    text: string,
    options: Omit<TTSRequest, 'text'> = {},
    requestId?: string
  ): Promise<TTSResponse> {
    const id = requestId || `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Cancel any existing request with the same ID
    this.cancelRequest(id);

    const controller = new AbortController();
    this.activeRequests.set(id, controller);

    try {
      const response = await this.makeRequest({
        text,
        ...options,
      }, controller.signal);

      this.activeRequests.delete(id);
      return response;
    } catch (error) {
      this.activeRequests.delete(id);
      throw error;
    }
  }

  /**
   * Generate and immediately play speech
   */
  async generateAndPlaySpeech(
    text: string,
    ttsOptions: Omit<TTSRequest, 'text'> = {},
    playbackOptions: TTSPlaybackOptions = {},
    requestId?: string
  ): Promise<HTMLAudioElement> {
    try {
      playbackOptions.onLoadStart?.();
      
      const response = await this.generateSpeech(text, ttsOptions, requestId);
      
      if (!response.success || !response.audioUrl) {
        throw new Error(response.error || 'Failed to generate speech');
      }

      playbackOptions.onLoadEnd?.();

      // Create audio element
      const audio = new Audio(response.audioUrl);
      audio.volume = playbackOptions.volume ?? 1.0;

      // Set up event listeners
      if (playbackOptions.onPlay) {
        audio.addEventListener('play', playbackOptions.onPlay);
      }
      if (playbackOptions.onPause) {
        audio.addEventListener('pause', playbackOptions.onPause);
      }
      if (playbackOptions.onEnd) {
        audio.addEventListener('ended', playbackOptions.onEnd);
      }
      if (playbackOptions.onError) {
        audio.addEventListener('error', (e) => {
          playbackOptions.onError!(new Error('Audio playback failed'));
        });
      }

      // Auto-play if requested
      if (playbackOptions.autoPlay !== false) {
        await audio.play();
      }

      return audio;
    } catch (error) {
      playbackOptions.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Check if a cached version exists for the given parameters
   */
  async checkCache(
    text: string,
    options: Omit<TTSRequest, 'text'> = {}
  ): Promise<{ cached: boolean; audioUrl?: string }> {
    try {
      const response = await this.generateSpeech(text, {
        ...options,
        options: {
          ...options.options,
          useCache: true,
        },
      });

      return {
        cached: response.cached || false,
        audioUrl: response.success ? response.audioUrl : undefined,
      };
    } catch (error) {
      console.error('Error checking cache:', error);
      return { cached: false };
    }
  }

  /**
   * Cancel a specific TTS request
   */
  cancelRequest(requestId: string): void {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel all active TTS requests
   */
  cancelAllRequests(): void {
    this.activeRequests.forEach((controller) => controller.abort());
    this.activeRequests.clear();
  }

  /**
   * Get the number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Make the actual HTTP request with retry logic
   */
  private async makeRequest(
    body: TTSRequest,
    signal: AbortSignal,
    attempt: number = 1
  ): Promise<TTSResponse> {
    try {
      const authToken = await this.getAuthToken();
      
      const response = await fetch(`${this.baseUrl}/api/universal-assistant/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TTSResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'TTS generation failed');
      }

      return data;
    } catch (error) {
      // Handle abort
      if (signal.aborted) {
        throw new Error('Request was cancelled');
      }

      // Handle network/timeout errors with retry
      if (attempt < this.retryAttempts && this.shouldRetry(error as Error)) {
        console.warn(`TTS request attempt ${attempt} failed, retrying:`, error);
        await this.delay(this.retryDelay * attempt);
        return this.makeRequest(body, signal, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Get authentication token from Firebase Auth
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Only available in browser environment
      if (typeof window === 'undefined') {
        return null;
      }

      // Dynamic import to avoid SSR issues
      const { auth } = await import('@/lib/firebase/client');
      const { onAuthStateChanged } = await import('firebase/auth');
      
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          unsubscribe();
          if (user) {
            try {
              const token = await user.getIdToken();
              resolve(token);
            } catch (error) {
              console.error('Error getting ID token:', error);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'Network request failed',
      'fetch failed',
      'timeout',
      'NETWORK_ERROR',
      'TIMEOUT',
    ];

    return retryableErrors.some((retryable) =>
      error.message.toLowerCase().includes(retryable.toLowerCase())
    );
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Default instance for convenience
export const ttsApiClient = new TTSApiClient();

// Convenience functions
export async function generateSpeech(
  text: string,
  options?: Omit<TTSRequest, 'text'>
): Promise<TTSResponse> {
  return ttsApiClient.generateSpeech(text, options);
}

export async function speakText(
  text: string,
  ttsOptions?: Omit<TTSRequest, 'text'>,
  playbackOptions?: TTSPlaybackOptions
): Promise<HTMLAudioElement> {
  return ttsApiClient.generateAndPlaySpeech(text, ttsOptions, playbackOptions);
}

export function cancelAllTTS(): void {
  ttsApiClient.cancelAllRequests();
}

// Integration with existing AudioManager
export function integrateWithAudioManager(audioManager: any): {
  playTTS: (text: string, options?: any) => Promise<void>;
  stopTTS: () => void;
} {
  return {
    async playTTS(text: string, options: any = {}) {
      try {
        const response = await generateSpeech(text, {
          voiceId: options.voiceId,
          voiceProfileId: options.voiceProfileId,
          options: {
            modelId: options.modelId,
            stability: options.stability,
            similarityBoost: options.similarityBoost,
            speed: options.speed,
            useCache: options.useCache,
          },
        });

        if (response.success && response.audioUrl) {
          // Use AudioManager's play method for consistency
          await audioManager.play(response.audioUrl, options.speakerId);
        } else {
          throw new Error(response.error || 'Failed to generate speech');
        }
      } catch (error) {
        console.error('TTS playback error:', error);
        throw error;
      }
    },

    stopTTS() {
      audioManager.stopAllAudio();
      cancelAllTTS();
    },
  };
}