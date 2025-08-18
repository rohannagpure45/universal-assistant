import { ElevenLabsTTS } from './ElevenLabsTTS';
import { TTSApiClient } from './TTSApiClient';
import { EnhancedQueuedMessage } from './EnhancedMessageQueueManager';
import { nanoid } from 'nanoid';

// Streaming TTS configuration
export interface StreamingTTSConfig {
  voiceId: string;
  model: string;
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  outputFormat: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100';
  streamingEnabled: boolean;
  chunkSize: number;
  bufferSize: number;
  latencyOptimization: 'speed' | 'quality' | 'balanced';
  enableSpeechMarks: boolean;
  pronunciationDictionary?: Record<string, string>;
}

// Streaming session management
export interface StreamingSession {
  sessionId: string;
  messageId: string;
  text: string;
  config: StreamingTTSConfig;
  startTime: number;
  endTime?: number;
  status: 'initializing' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  streamUrl?: string;
  audioUrl?: string;
  audioBuffer?: ArrayBuffer;
  chunkCount: number;
  bytesReceived: number;
  estimatedDuration?: number;
  actualDuration?: number;
  quality: 'low' | 'medium' | 'high';
  cacheKey?: string;
  metadata?: {
    voiceProfile?: string;
    emotionalTone?: string;
    speakingRate?: number;
    emphasis?: string[];
  };
}

// Streaming events
export interface StreamingEvents {
  onStreamStart: (session: StreamingSession) => void;
  onStreamChunk: (session: StreamingSession, chunk: ArrayBuffer, progress: number) => void;
  onStreamComplete: (session: StreamingSession, audioUrl: string) => void;
  onStreamError: (session: StreamingSession, error: Error) => void;
  onStreamProgress: (session: StreamingSession, progress: number) => void;
  onQualityChange: (session: StreamingSession, newQuality: StreamingSession['quality']) => void;
  onLatencyUpdate: (session: StreamingSession, latency: number) => void;
  onCacheHit: (session: StreamingSession, cacheKey: string) => void;
  onCacheMiss: (session: StreamingSession, cacheKey: string) => void;
}

// Performance metrics for streaming
export interface StreamingMetrics {
  totalSessions: number;
  activeSessions: number;
  averageLatency: number;
  averageQuality: number;
  cacheHitRate: number;
  throughput: number; // bytes per second
  errorRate: number;
  bandwidthUtilization: number;
  lastMetricsUpdate: number;
  sessionHistory: Array<{
    sessionId: string;
    latency: number;
    quality: StreamingSession['quality'];
    success: boolean;
    timestamp: number;
  }>;
}

// Audio processing configuration
export interface AudioProcessingConfig {
  enableNormalization: boolean;
  enableCompression: boolean;
  enableEQ: boolean;
  enableSpatialAudio: boolean;
  crossfadeDuration: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  volumeBoost: number;
  bassBoost: number;
  trebleBoost: number;
}

// Cache management for streaming
export interface StreamingCache {
  key: string;
  url: string;
  buffer?: ArrayBuffer;
  metadata: {
    voiceId: string;
    textHash: string;
    config: Partial<StreamingTTSConfig>;
    created: number;
    accessed: number;
    size: number;
    quality: StreamingSession['quality'];
  };
  expiresAt: number;
  priority: number;
}

/**
 * Advanced Streaming TTS Service with ElevenLabs integration
 * Provides real-time text-to-speech with sub-500ms latency optimization
 */
export class StreamingTTSService {
  private config: StreamingTTSConfig;
  private eventListeners: Partial<StreamingEvents> = {};
  private activeSessions: Map<string, StreamingSession> = new Map();
  private metrics: StreamingMetrics;
  private metricsTimer: NodeJS.Timeout | null = null;
  private audioProcessingConfig: AudioProcessingConfig;
  
  // Services integration
  private elevenLabsTTS: ElevenLabsTTS;
  private ttsApiClient: TTSApiClient;
  
  // Streaming cache
  private streamingCache: Map<string, StreamingCache> = new Map();
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  
  // Performance optimization
  private connectionPool: Map<string, any> = new Map();
  private preloadedStreams: Map<string, Promise<any>> = new Map();
  private adaptiveQuality: boolean = true;
  private bandwidthMonitor: any = null;
  
  // Audio processing
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;

  constructor(
    config?: Partial<StreamingTTSConfig>,
    audioProcessingConfig?: Partial<AudioProcessingConfig>
  ) {
    // Initialize streaming configuration
    this.config = {
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
      model: 'eleven_multilingual_v2',
      voiceSettings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
      },
      outputFormat: 'mp3_44100_128',
      streamingEnabled: true,
      chunkSize: 1024,
      bufferSize: 8192,
      latencyOptimization: 'speed',
      enableSpeechMarks: false,
      pronunciationDictionary: {},
      ...config,
    };

    // Initialize audio processing configuration
    this.audioProcessingConfig = {
      enableNormalization: true,
      enableCompression: false,
      enableEQ: false,
      enableSpatialAudio: false,
      crossfadeDuration: 100,
      fadeInDuration: 50,
      fadeOutDuration: 100,
      volumeBoost: 1.0,
      bassBoost: 1.0,
      trebleBoost: 1.0,
      ...audioProcessingConfig,
    };

    // Initialize metrics
    this.metrics = {
      totalSessions: 0,
      activeSessions: 0,
      averageLatency: 0,
      averageQuality: 0,
      cacheHitRate: 0,
      throughput: 0,
      errorRate: 0,
      bandwidthUtilization: 0,
      lastMetricsUpdate: Date.now(),
      sessionHistory: [],
    };

    // Initialize services
    this.elevenLabsTTS = new ElevenLabsTTS(process.env.ELEVENLABS_API_KEY || '');
    this.ttsApiClient = new TTSApiClient();

    this.initializeService();
  }

  /**
   * Initialize the streaming TTS service
   */
  private initializeService(): void {
    console.log('StreamingTTSService: Initializing Phase 3 streaming capabilities');

    // Initialize audio context for processing
    this.initializeAudioContext();

    // Start performance monitoring
    this.startMetricsCollection();

    // Initialize cache management
    this.initializeCacheManagement();

    // Set up bandwidth monitoring for adaptive quality
    this.initializeBandwidthMonitoring();

    console.log('StreamingTTSService: Initialization complete');
  }

  /**
   * Initialize Web Audio API context for audio processing
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load audio worklet for real-time processing
      if (this.audioProcessingConfig.enableNormalization || this.audioProcessingConfig.enableEQ) {
        await this.audioContext.audioWorklet.addModule('/audio-processors/streaming-processor.js');
        this.audioWorklet = new AudioWorkletNode(this.audioContext, 'streaming-processor');
      }
      
      console.log('StreamingTTSService: Audio context initialized');
    } catch (error) {
      console.warn('StreamingTTSService: Failed to initialize audio context:', error);
    }
  }

  /**
   * Generate streaming TTS with real-time optimization
   */
  async generateStreamingTTS(
    text: string,
    options?: {
      messageId?: string;
      config?: Partial<StreamingTTSConfig>;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      metadata?: StreamingSession['metadata'];
    }
  ): Promise<StreamingSession> {
    const sessionId = nanoid();
    const messageId = options?.messageId || nanoid();
    const sessionConfig = { ...this.config, ...options?.config };
    
    // Create streaming session
    const session: StreamingSession = {
      sessionId,
      messageId,
      text,
      config: sessionConfig,
      startTime: Date.now(),
      status: 'initializing',
      chunkCount: 0,
      bytesReceived: 0,
      quality: this.determineOptimalQuality(),
      metadata: options?.metadata,
    };

    // Generate cache key
    session.cacheKey = this.generateCacheKey(text, sessionConfig);

    // Check cache first
    const cached = this.streamingCache.get(session.cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      session.streamUrl = cached.url;
      session.audioBuffer = cached.buffer;
      session.status = 'completed';
      session.endTime = Date.now();

      this.eventListeners.onCacheHit?.(session, session.cacheKey);
      this.eventListeners.onStreamComplete?.(session, cached.url);
      
      // Update cache access time
      cached.metadata.accessed = Date.now();
      
      return session;
    }

    this.eventListeners.onCacheMiss?.(session, session.cacheKey);

    // Add to active sessions
    this.activeSessions.set(sessionId, session);
    this.metrics.activeSessions = this.activeSessions.size;

    try {
      // Start streaming generation
      await this.startStreamingGeneration(session);
      
      return session;
    } catch (error) {
      console.error('StreamingTTSService: Failed to generate streaming TTS:', error);
      session.status = 'failed';
      this.eventListeners.onStreamError?.(session, error as Error);
      this.recordSessionMetrics(session, false);
      throw error;
    }
  }

  /**
   * Start streaming TTS generation
   */
  private async startStreamingGeneration(session: StreamingSession): Promise<void> {
    session.status = 'streaming';
    this.eventListeners.onStreamStart?.(session);

    // Use ElevenLabs streaming API for real-time generation
    try {
      const stream = await this.elevenLabsTTS.generateStreamingAudio(
        session.text,
        {
          voiceId: session.config.voiceId,
          model: session.config.model,
          voiceSettings: session.config.voiceSettings,
          outputFormat: session.config.outputFormat,
          optimizeStreamingLatency: session.config.latencyOptimization,
        }
      );

      await this.processAudioStream(session, stream);
    } catch (error) {
      // Enhanced error handling with specific error types
      console.warn('StreamingTTSService: Direct streaming failed, using fallback:', error);
      
      // Update session with error context
      session.metadata = {
        ...session.metadata,
        // Note: fallbackReason not supported in current metadata interface
        // fallbackReason: error instanceof Error ? error.message : 'Unknown error',
        // fallbackAt: Date.now()
      };
      
      try {
        await this.fallbackTTSGeneration(session);
      } catch (fallbackError) {
        // If fallback also fails, mark session as failed
        session.status = 'failed';
        console.error('StreamingTTSService: Both streaming and fallback failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Process streaming audio data
   */
  private async processAudioStream(session: StreamingSession, stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        // Process chunk
        chunks.push(value);
        totalBytes += value.length;
        session.chunkCount++;
        session.bytesReceived = totalBytes;

        // Calculate progress (estimate based on text length)
        const estimatedTotalBytes = session.text.length * 150; // Rough estimate
        const progress = Math.min(totalBytes / estimatedTotalBytes, 0.95);

        // Emit chunk event
        this.eventListeners.onStreamChunk?.(session, value.buffer, progress);
        this.eventListeners.onStreamProgress?.(session, progress);

        // Update latency metrics
        const currentLatency = Date.now() - session.startTime;
        this.eventListeners.onLatencyUpdate?.(session, currentLatency);

        // Apply audio processing if enabled
        if (this.audioProcessingConfig.enableNormalization) {
          await this.applyAudioProcessing(value);
        }
      }

      // Combine chunks into final audio buffer
      const audioBuffer = this.combineAudioChunks(chunks);
      session.audioBuffer = audioBuffer;

      // Generate audio URL (blob URL or cached URL)
      const audioUrl = await this.generateAudioUrl(audioBuffer, session);
      session.streamUrl = audioUrl;

      // Cache the result
      await this.cacheStreamingResult(session, audioBuffer, audioUrl);

      // Mark session as completed
      session.status = 'completed';
      session.endTime = Date.now();
      session.actualDuration = session.endTime - session.startTime;

      this.eventListeners.onStreamComplete?.(session, audioUrl);
      this.recordSessionMetrics(session, true);

      console.log(`StreamingTTSService: Session ${session.sessionId} completed in ${session.actualDuration}ms`);

    } catch (error) {
      session.status = 'failed';
      this.eventListeners.onStreamError?.(session, error as Error);
      this.recordSessionMetrics(session, false);
      throw error;
    } finally {
      reader.releaseLock();
      this.activeSessions.delete(session.sessionId);
      this.metrics.activeSessions = this.activeSessions.size;
    }
  }

  /**
   * Fallback TTS generation using TTSApiClient
   */
  private async fallbackTTSGeneration(session: StreamingSession): Promise<void> {
    console.log('StreamingTTSService: Using fallback TTS generation');

    try {
      const response = await this.ttsApiClient.generateSpeech(session.text, {
        voiceId: session.config.voiceId,
        options: {
          useCache: true
        },
      });

      if (response.success && response.audioUrl) {
        session.streamUrl = response.audioUrl;
        session.status = 'completed';
        session.endTime = Date.now();
        session.actualDuration = session.endTime - session.startTime;

        this.eventListeners.onStreamComplete?.(session, response.audioUrl);
        this.recordSessionMetrics(session, true);
      } else {
        throw new Error('Fallback TTS generation failed');
      }
    } catch (error) {
      session.status = 'failed';
      this.eventListeners.onStreamError?.(session, error as Error);
      this.recordSessionMetrics(session, false);
      throw error;
    }
  }

  /**
   * Apply real-time audio processing
   */
  private async applyAudioProcessing(audioChunk: Uint8Array): Promise<void> {
    if (!this.audioContext || !this.audioWorklet) {
      return;
    }

    try {
      // Process audio chunk through worklet
      this.audioWorklet.port.postMessage({
        type: 'process',
        data: audioChunk,
        config: this.audioProcessingConfig,
      });
    } catch (error) {
      console.warn('StreamingTTSService: Audio processing failed:', error);
    }
  }

  /**
   * Combine audio chunks into single buffer
   */
  private combineAudioChunks(chunks: Uint8Array[]): ArrayBuffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined.buffer;
  }

  /**
   * Generate audio URL from buffer
   */
  private async generateAudioUrl(audioBuffer: ArrayBuffer, session: StreamingSession): Promise<string> {
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  }

  /**
   * Cache streaming result
   */
  private async cacheStreamingResult(
    session: StreamingSession,
    audioBuffer: ArrayBuffer,
    audioUrl: string
  ): Promise<void> {
    if (!session.cacheKey) return;

    const cacheEntry: StreamingCache = {
      key: session.cacheKey,
      url: audioUrl,
      buffer: audioBuffer,
      metadata: {
        voiceId: session.config.voiceId,
        textHash: this.hashString(session.text),
        config: session.config,
        created: Date.now(),
        accessed: Date.now(),
        size: audioBuffer.byteLength,
        quality: session.quality,
      },
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      priority: this.calculateCachePriority(session),
    };

    this.streamingCache.set(session.cacheKey, cacheEntry);
    
    // Trigger cache cleanup if necessary
    if (this.streamingCache.size > 100) {
      this.optimizeCache();
    }
  }

  /**
   * Determine optimal quality based on current conditions
   */
  private determineOptimalQuality(): StreamingSession['quality'] {
    if (!this.adaptiveQuality) {
      return 'high';
    }

    // Base quality decision on current performance metrics
    const avgLatency = this.metrics.averageLatency;
    const bandwidth = this.metrics.bandwidthUtilization;

    if (avgLatency < 200 && bandwidth < 0.5) {
      return 'high';
    } else if (avgLatency < 500 && bandwidth < 0.8) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate cache key for TTS request
   */
  private generateCacheKey(text: string, config: StreamingTTSConfig): string {
    const textHash = this.hashString(text);
    const configHash = this.hashString(JSON.stringify({
      voiceId: config.voiceId,
      model: config.model,
      voiceSettings: config.voiceSettings,
      outputFormat: config.outputFormat,
    }));
    
    return `streaming_${textHash}_${configHash}`;
  }

  /**
   * Calculate cache priority for entry
   */
  private calculateCachePriority(session: StreamingSession): number {
    let priority = 50; // Base priority
    
    // Higher priority for recent sessions
    const age = Date.now() - session.startTime;
    if (age < 300000) priority += 20; // Last 5 minutes
    
    // Higher priority for higher quality
    switch (session.quality) {
      case 'high': priority += 15; break;
      case 'medium': priority += 10; break;
      case 'low': priority += 5; break;
    }
    
    // Higher priority for shorter text (more likely to be reused)
    if (session.text.length < 100) priority += 10;
    
    return priority;
  }

  /**
   * Simple string hashing for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Record session metrics
   */
  private recordSessionMetrics(session: StreamingSession, success: boolean): void {
    this.metrics.totalSessions++;
    
    const latency = session.actualDuration || (Date.now() - session.startTime);
    
    // Add to session history
    this.metrics.sessionHistory.push({
      sessionId: session.sessionId,
      latency,
      quality: session.quality,
      success,
      timestamp: Date.now(),
    });

    // Keep only recent history (last 100 sessions)
    if (this.metrics.sessionHistory.length > 100) {
      this.metrics.sessionHistory.shift();
    }

    // Update average metrics
    const recentSessions = this.metrics.sessionHistory.slice(-20); // Last 20 sessions
    this.metrics.averageLatency = recentSessions.reduce((sum, s) => sum + s.latency, 0) / recentSessions.length;
    this.metrics.errorRate = recentSessions.filter(s => !s.success).length / recentSessions.length;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    
    // Calculate cache hit rate
    const cacheHits = this.metrics.sessionHistory.filter(s => s.latency < 100).length; // Very fast = cache hit
    this.metrics.cacheHitRate = cacheHits / Math.max(this.metrics.sessionHistory.length, 1);
    
    // Calculate throughput
    const recentSessions = this.metrics.sessionHistory.filter(s => now - s.timestamp < 60000); // Last minute
    const totalBytes = recentSessions.length * 50000; // Estimated average size
    this.metrics.throughput = totalBytes / 60; // Bytes per second
    
    this.metrics.lastMetricsUpdate = now;
  }

  /**
   * Initialize cache management
   */
  private initializeCacheManagement(): void {
    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupExpiredCache();
      this.optimizeCache();
    }, 60000); // Clean up every minute
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.streamingCache.entries()) {
      if (entry.expiresAt < now) {
        expiredKeys.push(key);
        // Revoke object URL to free memory
        if (entry.url.startsWith('blob:')) {
          URL.revokeObjectURL(entry.url);
        }
      }
    }
    
    expiredKeys.forEach(key => this.streamingCache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`StreamingTTSService: Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Optimize cache by removing low-priority entries
   */
  private optimizeCache(): void {
    if (this.streamingCache.size <= 50) return; // Don't optimize unless we have many entries
    
    // Sort entries by priority (lowest first)
    const entries = Array.from(this.streamingCache.entries())
      .sort((a, b) => a[1].priority - b[1].priority);
    
    // Remove lowest priority entries until we're under the limit
    const targetSize = 40;
    const toRemove = entries.slice(0, entries.length - targetSize);
    
    toRemove.forEach(([key, entry]) => {
      this.streamingCache.delete(key);
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    });
    
    console.log(`StreamingTTSService: Optimized cache, removed ${toRemove.length} entries`);
  }

  /**
   * Initialize bandwidth monitoring for adaptive quality
   */
  private initializeBandwidthMonitoring(): void {
    // Simple bandwidth estimation based on session performance
    this.bandwidthMonitor = setInterval(() => {
      const recentSessions = this.metrics.sessionHistory.slice(-10);
      const avgLatency = recentSessions.reduce((sum, s) => sum + s.latency, 0) / Math.max(recentSessions.length, 1);
      
      // Estimate bandwidth utilization based on latency
      if (avgLatency > 1000) {
        this.metrics.bandwidthUtilization = 0.9;
      } else if (avgLatency > 500) {
        this.metrics.bandwidthUtilization = 0.7;
      } else {
        this.metrics.bandwidthUtilization = 0.3;
      }
    }, 10000); // Update every 10 seconds
  }

  // Public API methods

  /**
   * Set streaming event listeners
   */
  setEventListeners(listeners: Partial<StreamingEvents>): void {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }

  /**
   * Cancel streaming session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.status = 'cancelled';
    this.activeSessions.delete(sessionId);
    this.metrics.activeSessions = this.activeSessions.size;

    console.log(`StreamingTTSService: Session ${sessionId} cancelled`);
    return true;
  }

  /**
   * Get current metrics
   */
  getMetrics(): StreamingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): StreamingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Update streaming configuration
   */
  updateConfig(config: Partial<StreamingTTSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Update audio processing configuration
   */
  updateAudioProcessingConfig(config: Partial<AudioProcessingConfig>): void {
    this.audioProcessingConfig = { ...this.audioProcessingConfig, ...config };
  }

  /**
   * Enable/disable adaptive quality
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQuality = enabled;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // Revoke all blob URLs
    for (const [key, entry] of this.streamingCache.entries()) {
      if (entry.url.startsWith('blob:')) {
        URL.revokeObjectURL(entry.url);
      }
    }
    
    this.streamingCache.clear();
    console.log('StreamingTTSService: Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    size: number;
    totalBytes: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    let totalBytes = 0;
    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.streamingCache.values()) {
      totalBytes += entry.metadata.size;
      oldest = Math.min(oldest, entry.metadata.created);
      newest = Math.max(newest, entry.metadata.created);
    }

    return {
      size: this.streamingCache.size,
      totalBytes,
      hitRate: this.metrics.cacheHitRate,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  /**
   * Preload TTS for predicted text
   */
  async preloadTTS(
    text: string,
    config?: Partial<StreamingTTSConfig>,
    priority: 'low' | 'normal' | 'high' = 'low'
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(text, { ...this.config, ...config });
    
    // Check if already cached or preloading
    if (this.streamingCache.has(cacheKey) || this.preloadedStreams.has(cacheKey)) {
      return cacheKey;
    }

    // Start preloading in background
    const preloadPromise = this.generateStreamingTTS(text, { config }).catch(error => {
      console.warn('StreamingTTSService: Preload failed:', error);
      return null;
    });

    this.preloadedStreams.set(cacheKey, preloadPromise);

    return cacheKey;
  }

  /**
   * Stop the streaming service with comprehensive cleanup
   */
  stop(): void {
    console.log('StreamingTTSService: Initiating service shutdown...');

    // Clear all timers
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.bandwidthMonitor) {
      clearInterval(this.bandwidthMonitor);
      this.bandwidthMonitor = null;
    }

    // Cancel all active sessions with proper cleanup
    const activeSessions = Array.from(this.activeSessions.keys());
    console.log(`StreamingTTSService: Cancelling ${activeSessions.length} active sessions`);
    
    for (const sessionId of activeSessions) {
      this.cancelSession(sessionId);
    }

    // Clear all data structures to prevent memory leaks
    this.activeSessions.clear();
    this.connectionPool.clear();
    this.preloadedStreams.clear();

    // Clear cache with proper URL revocation
    this.clearCache();

    // Close audio context properly
    if (this.audioContext) {
      // Close any active audio worklets first
      if (this.audioWorklet) {
        this.audioWorklet.disconnect();
        this.audioWorklet = null;
      }
      
      this.audioContext.close().then(() => {
        console.log('StreamingTTSService: Audio context closed successfully');
      }).catch(error => {
        console.warn('StreamingTTSService: Error closing audio context:', error);
      });
      
      this.audioContext = null;
    }

    // Clear event listeners to prevent memory leaks
    this.eventListeners = {};

    // Force garbage collection hint (if available in dev)
    if (typeof window !== 'undefined' && (window as any).gc) {
      setTimeout(() => (window as any).gc(), 100);
    }

    console.log('StreamingTTSService: Service stopped and cleaned up');
  }
}

// Export singleton instance
export const streamingTTSService = new StreamingTTSService();