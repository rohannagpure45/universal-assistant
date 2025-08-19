import { DeepgramSTT, TranscriptionResult } from './DeepgramSTT';
import { LiveTranscriptionEvents, createClient, LiveClient } from '@deepgram/sdk';

// Enhanced transcription configuration
export interface EnhancedTranscriptionConfig {
  model: string;
  language: string;
  punctuate: boolean;
  diarize: boolean;
  smart_format: boolean;
  utterances: boolean;
  interim_results: boolean;
  endpointing: number;
  // Phase 3 Enhanced Options
  diarize_version?: string;
  numerals: boolean;
  profanity_filter: boolean;
  redact: string[];
  search: string[];
  replace: Record<string, string>;
  keywords: string[];
  keyword_boost: 'legacy' | 'latest';
}

// Connection management configuration
export interface ConnectionConfig {
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number; // initial delay in ms
  maxReconnectDelay: number; // maximum delay in ms
  backoffMultiplier: number; // exponential backoff multiplier
  connectionTimeout: number; // connection timeout in ms
  heartbeatInterval: number; // heartbeat interval in ms
  bufferSize: number; // audio buffer size for reconnection
}

// Audio buffering for seamless reconnection
export interface AudioBuffer {
  data: ArrayBuffer;
  timestamp: number;
  sequence: number;
}

// Connection state tracking
export interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnectedTime: number;
  lastDisconnectedTime: number;
  connectionId: string;
  totalReconnects: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unstable';
}

// Enhanced transcription events
export interface EnhancedTranscriptionEvents {
  onTranscription: (result: TranscriptionResult) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
  onReconnectAttempt: (attempt: number, maxAttempts: number) => void;
  onReconnectSuccess: (attempt: number) => void;
  onReconnectFailed: (error: Error) => void;
  onBufferOverflow: (droppedSamples: number) => void;
  onLatencyWarning: (latency: number) => void;
  onQualityChange: (quality: ConnectionState['connectionQuality']) => void;
}

// Performance metrics
export interface TranscriptionMetrics {
  averageLatency: number;
  totalTranscriptions: number;
  errorRate: number;
  reconnectionRate: number;
  bufferUtilization: number;
  qualityScore: number;
  uptime: number;
  lastMetricsUpdate: number;
}

/**
 * Enhanced Deepgram STT with advanced reconnection, buffering, and error handling
 * Extends the existing DeepgramSTT with Phase 3 capabilities
 */
export class EnhancedDeepgramSTT extends DeepgramSTT {
  private enhancedConfig: EnhancedTranscriptionConfig;
  private connectionConfig: ConnectionConfig;
  private connectionState: ConnectionState;
  private eventListeners: Partial<EnhancedTranscriptionEvents> = {};
  private audioBuffer: AudioBuffer[] = [];
  private enhancedReconnectTimer: NodeJS.Timeout | null = null;
  private enhancedHeartbeatTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;
  private metrics: TranscriptionMetrics;
  private sequenceNumber: number = 0;
  private isEnhancedMode: boolean;
  
  // Connection management
  private lastHeartbeat: number = 0;
  private latencyMeasurements: number[] = [];
  private errorHistory: Array<{ timestamp: number; error: string }> = [];
  
  constructor(
    apiKey: string, 
    enhancedConfig?: Partial<EnhancedTranscriptionConfig>,
    connectionConfig?: Partial<ConnectionConfig>,
    enableEnhancedMode: boolean = true
  ) {
    super(apiKey);
    
    this.isEnhancedMode = enableEnhancedMode;
    
    // Enhanced transcription configuration
    this.enhancedConfig = {
      model: 'nova-2',
      language: 'en-US',
      punctuate: true,
      diarize: true,
      smart_format: true,
      utterances: true,
      interim_results: true,
      endpointing: 300,
      diarize_version: '2024-01-26',
      numerals: true,
      profanity_filter: false,
      redact: [],
      search: [],
      replace: {},
      keywords: [],
      keyword_boost: 'latest',
      ...enhancedConfig,
    };
    
    // Connection management configuration
    this.connectionConfig = {
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      backoffMultiplier: 2,
      connectionTimeout: 10000,
      heartbeatInterval: 30000,
      bufferSize: 50, // Keep last 50 audio chunks
      ...connectionConfig,
    };
    
    // Initialize connection state
    this.connectionState = {
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastConnectedTime: 0,
      lastDisconnectedTime: 0,
      connectionId: this.generateConnectionId(),
      totalReconnects: 0,
      connectionQuality: 'excellent',
    };
    
    // Initialize metrics
    this.metrics = {
      averageLatency: 0,
      totalTranscriptions: 0,
      errorRate: 0,
      reconnectionRate: 0,
      bufferUtilization: 0,
      qualityScore: 100,
      uptime: 0,
      lastMetricsUpdate: Date.now(),
    };
    
    this.initializeEnhancedFeatures();
  }
  
  /**
   * Initialize Phase 3 enhanced features
   */
  private initializeEnhancedFeatures(): void {
    if (!this.isEnhancedMode) {
      console.log('EnhancedDeepgramSTT: Enhanced mode disabled, using basic functionality');
      return;
    }
    
    console.log('EnhancedDeepgramSTT: Initializing Phase 3 enhanced features');
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Initialize connection quality monitoring
    this.initializeQualityMonitoring();
  }
  
  /**
   * Enhanced live transcription with reconnection support
   */
  async startLiveTranscription(options?: Partial<EnhancedTranscriptionConfig>): Promise<void> {
    // Merge options with enhanced config
    const config = { ...this.enhancedConfig, ...options };
    
    try {
      await this.establishConnection(config);
    } catch (error) {
      console.error('EnhancedDeepgramSTT: Failed to start live transcription:', error);
      
      if (this.connectionConfig.autoReconnect) {
        this.scheduleReconnection(error as Error);
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Establish WebSocket connection with enhanced configuration
   */
  private async establishConnection(config: EnhancedTranscriptionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.connectionConfig.connectionTimeout);
      
      try {
        // Use parent's method but with enhanced error handling
        super.startLiveTranscription(config)
          .then(() => {
            clearTimeout(connectionTimeout);
            this.onConnectionEstablished();
            resolve();
          })
          .catch((error) => {
            clearTimeout(connectionTimeout);
            this.onConnectionFailed(error);
            reject(error);
          });
        
        // Override the parent's transcription handler to add enhanced processing
        this.setTranscriptionHandler((result: TranscriptionResult) => {
          this.processEnhancedTranscription(result);
        });
        
      } catch (error) {
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  }
  
  /**
   * Process transcription with enhanced features
   */
  private processEnhancedTranscription(result: TranscriptionResult): void {
    const now = Date.now();
    
    // Calculate latency
    const latency = now - result.timestamp;
    this.latencyMeasurements.push(latency);
    
    // Keep only recent latency measurements (last 100)
    if (this.latencyMeasurements.length > 100) {
      this.latencyMeasurements.shift();
    }
    
    // Update metrics
    this.metrics.totalTranscriptions++;
    this.metrics.averageLatency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    
    // Check for latency warnings
    if (latency > 1000) { // > 1 second latency
      this.eventListeners.onLatencyWarning?.(latency);
    }
    
    // Update connection quality based on latency and error rate
    this.updateConnectionQuality();
    
    // Forward to original handler
    this.eventListeners.onTranscription?.(result);
  }
  
  /**
   * Enhanced audio chunk sending with buffering
   */
  sendAudioChunk(chunk: ArrayBuffer): void {
    if (!this.isEnhancedMode) {
      super.sendAudioChunk(chunk);
      return;
    }
    
    // Buffer audio for reconnection support
    const audioBuffer: AudioBuffer = {
      data: chunk.slice(0), // Create a copy
      timestamp: Date.now(),
      sequence: this.sequenceNumber++,
    };
    
    this.audioBuffer.push(audioBuffer);
    
    // Maintain buffer size
    if (this.audioBuffer.length > this.connectionConfig.bufferSize) {
      const droppedBuffer = this.audioBuffer.shift();
      if (droppedBuffer) {
        this.eventListeners.onBufferOverflow?.(1);
      }
    }
    
    // Send audio if connected
    if (this.connectionState.isConnected) {
      try {
        super.sendAudioChunk(chunk);
      } catch (error) {
        console.error('EnhancedDeepgramSTT: Error sending audio chunk:', error);
        this.onConnectionError(error as Error);
      }
    }
  }
  
  /**
   * Connection established handler
   */
  private onConnectionEstablished(): void {
    const now = Date.now();
    
    this.connectionState.isConnected = true;
    this.connectionState.isReconnecting = false;
    this.connectionState.lastConnectedTime = now;
    this.connectionState.connectionId = this.generateConnectionId();
    
    // Reset reconnection attempts on successful connection
    if (this.connectionState.reconnectAttempts > 0) {
      this.connectionState.totalReconnects++;
      this.eventListeners.onReconnectSuccess?.(this.connectionState.reconnectAttempts);
    }
    
    this.connectionState.reconnectAttempts = 0;
    
    // Clear reconnection timer
    if (this.enhancedReconnectTimer) {
      clearTimeout(this.enhancedReconnectTimer);
      this.enhancedReconnectTimer = null;
    }
    
    // Start heartbeat
    this.startEnhancedHeartbeat();
    
    // Replay buffered audio if this was a reconnection
    if (this.connectionState.totalReconnects > 0 && this.audioBuffer.length > 0) {
      this.replayBufferedAudio();
    }
    
    this.eventListeners.onConnectionStateChange?.(this.connectionState);
    
    console.log('EnhancedDeepgramSTT: Connection established');
  }
  
  /**
   * Connection failed handler
   */
  private onConnectionFailed(error: Error): void {
    this.connectionState.isConnected = false;
    this.connectionState.lastDisconnectedTime = Date.now();
    
    this.recordError(error);
    
    if (this.connectionConfig.autoReconnect && 
        this.connectionState.reconnectAttempts < this.connectionConfig.maxReconnectAttempts) {
      this.scheduleReconnection(error);
    } else {
      this.eventListeners.onReconnectFailed?.(error);
    }
    
    this.eventListeners.onConnectionStateChange?.(this.connectionState);
  }
  
  /**
   * Connection error handler
   */
  private onConnectionError(error: Error): void {
    console.error('EnhancedDeepgramSTT: Connection error:', error);
    
    this.recordError(error);
    this.onConnectionFailed(error);
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnection(lastError: Error): void {
    if (this.connectionState.isReconnecting) {
      return; // Already reconnecting
    }
    
    this.connectionState.isReconnecting = true;
    this.connectionState.reconnectAttempts++;
    
    const delay = Math.min(
      this.connectionConfig.reconnectDelay * Math.pow(
        this.connectionConfig.backoffMultiplier,
        this.connectionState.reconnectAttempts - 1
      ),
      this.connectionConfig.maxReconnectDelay
    );
    
    this.eventListeners.onReconnectAttempt?.(
      this.connectionState.reconnectAttempts,
      this.connectionConfig.maxReconnectAttempts
    );
    
    console.log(
      `EnhancedDeepgramSTT: Scheduling reconnection attempt ${this.connectionState.reconnectAttempts}/${this.connectionConfig.maxReconnectAttempts} in ${delay}ms`
    );
    
    this.enhancedReconnectTimer = setTimeout(async () => {
      try {
        await this.establishConnection(this.enhancedConfig);
      } catch (error) {
        console.error('EnhancedDeepgramSTT: Reconnection failed:', error);
        this.onConnectionFailed(error as Error);
      }
    }, delay);
  }
  
  /**
   * Replay buffered audio after reconnection
   */
  private replayBufferedAudio(): void {
    console.log(`EnhancedDeepgramSTT: Replaying ${this.audioBuffer.length} buffered audio chunks`);
    
    // Sort buffer by sequence number to maintain order
    this.audioBuffer.sort((a, b) => a.sequence - b.sequence);
    
    // Replay buffered audio with a small delay between chunks
    this.audioBuffer.forEach((buffer, index) => {
      setTimeout(() => {
        if (this.connectionState.isConnected) {
          super.sendAudioChunk(buffer.data);
        }
      }, index * 10); // 10ms delay between chunks
    });
    
    // Clear buffer after replay
    this.audioBuffer = [];
  }
  
  /**
   * Start heartbeat to monitor connection health
   */
  private startEnhancedHeartbeat(): void {
    if (this.enhancedHeartbeatTimer) {
      clearInterval(this.enhancedHeartbeatTimer);
    }
    
    this.enhancedHeartbeatTimer = setInterval(() => {
      if (this.connectionState.isConnected) {
        this.sendHeartbeat();
      }
    }, this.connectionConfig.heartbeatInterval);
  }
  
  /**
   * Send heartbeat to check connection health
   */
  private sendHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    
    // Send a small audio chunk as heartbeat
    const silentChunk = new ArrayBuffer(1024);
    try {
      super.sendAudioChunk(silentChunk);
    } catch (error) {
      console.error('EnhancedDeepgramSTT: Heartbeat failed:', error);
      this.onConnectionError(error as Error);
    }
  }
  
  /**
   * Update connection quality based on metrics
   */
  private updateConnectionQuality(): void {
    const avgLatency = this.metrics.averageLatency;
    const errorRate = this.metrics.errorRate;
    
    let quality: ConnectionState['connectionQuality'];
    
    if (avgLatency < 200 && errorRate < 0.01) {
      quality = 'excellent';
    } else if (avgLatency < 500 && errorRate < 0.05) {
      quality = 'good';
    } else if (avgLatency < 1000 && errorRate < 0.1) {
      quality = 'poor';
    } else {
      quality = 'unstable';
    }
    
    if (quality !== this.connectionState.connectionQuality) {
      this.connectionState.connectionQuality = quality;
      this.eventListeners.onQualityChange?.(quality);
    }
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update metrics every 5 seconds
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.metrics.lastMetricsUpdate;
    
    // Calculate error rate
    const recentErrors = this.errorHistory.filter(
      error => now - error.timestamp < 60000 // Last minute
    );
    this.metrics.errorRate = recentErrors.length / Math.max(this.metrics.totalTranscriptions, 1);
    
    // Calculate reconnection rate
    this.metrics.reconnectionRate = this.connectionState.totalReconnects / Math.max(timeSinceLastUpdate / 3600000, 1); // per hour
    
    // Calculate buffer utilization
    this.metrics.bufferUtilization = this.audioBuffer.length / this.connectionConfig.bufferSize;
    
    // Calculate quality score
    this.metrics.qualityScore = this.calculateQualityScore();
    
    // Calculate uptime
    if (this.connectionState.isConnected) {
      this.metrics.uptime += timeSinceLastUpdate;
    }
    
    this.metrics.lastMetricsUpdate = now;
  }
  
  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(): number {
    const latencyScore = Math.max(0, 100 - (this.metrics.averageLatency / 10));
    const errorScore = Math.max(0, 100 - (this.metrics.errorRate * 1000));
    const uptimeScore = Math.min(100, (this.metrics.uptime / 3600000) * 10); // 10 points per hour, max 100
    
    return (latencyScore + errorScore + uptimeScore) / 3;
  }
  
  /**
   * Initialize connection quality monitoring
   */
  private initializeQualityMonitoring(): void {
    // Monitor connection quality and automatically adjust settings
    setInterval(() => {
      if (this.connectionState.connectionQuality === 'poor' || this.connectionState.connectionQuality === 'unstable') {
        // Automatically reduce quality settings to improve stability
        this.optimizeForStability();
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Optimize settings for connection stability
   */
  private optimizeForStability(): void {
    console.log('EnhancedDeepgramSTT: Optimizing for connection stability');
    
    // Reduce features that might impact performance
    this.enhancedConfig.interim_results = false;
    this.enhancedConfig.diarize = false;
    this.enhancedConfig.utterances = false;
    
    // Increase endpointing for better stability
    this.enhancedConfig.endpointing = 500;
  }
  
  /**
   * Record error for metrics
   */
  private recordError(error: Error): void {
    this.errorHistory.push({
      timestamp: Date.now(),
      error: error.message,
    });
    
    // Keep only recent errors (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.errorHistory = this.errorHistory.filter(e => e.timestamp > oneHourAgo);
  }
  
  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Enhanced stop transcription with cleanup
   */
  stopTranscription(): void {
    // Clear all timers
    if (this.enhancedReconnectTimer) {
      clearTimeout(this.enhancedReconnectTimer);
      this.enhancedReconnectTimer = null;
    }
    
    if (this.enhancedHeartbeatTimer) {
      clearInterval(this.enhancedHeartbeatTimer);
      this.enhancedHeartbeatTimer = null;
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    // Clear buffers
    this.audioBuffer = [];
    this.latencyMeasurements = [];
    this.errorHistory = [];
    
    // Reset connection state
    this.connectionState.isConnected = false;
    this.connectionState.isReconnecting = false;
    this.connectionState.lastDisconnectedTime = Date.now();
    
    // Call parent stop method
    super.stopTranscription();
    
    console.log('EnhancedDeepgramSTT: Enhanced transcription stopped');
  }
  
  // Public API methods
  
  /**
   * Set enhanced event listeners
   */
  setEnhancedEventListeners(listeners: Partial<EnhancedTranscriptionEvents>): void {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }
  
  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }
  
  /**
   * Get performance metrics
   */
  getMetrics(): TranscriptionMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Update enhanced configuration
   */
  updateEnhancedConfig(config: Partial<EnhancedTranscriptionConfig>): void {
    this.enhancedConfig = { ...this.enhancedConfig, ...config };
  }
  
  /**
   * Update connection configuration
   */
  updateConnectionConfig(config: Partial<ConnectionConfig>): void {
    this.connectionConfig = { ...this.connectionConfig, ...config };
  }
  
  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    if (this.connectionState.isConnected) {
      this.stopTranscription();
    }
    
    await this.startLiveTranscription();
  }
  
  /**
   * Get audio buffer status
   */
  getBufferStatus(): {
    size: number;
    utilization: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    return {
      size: this.audioBuffer.length,
      utilization: this.audioBuffer.length / this.connectionConfig.bufferSize,
      oldestTimestamp: this.audioBuffer[0]?.timestamp || 0,
      newestTimestamp: this.audioBuffer[this.audioBuffer.length - 1]?.timestamp || 0,
    };
  }
  
  /**
   * Check if enhanced mode is enabled
   */
  isEnhancedModeEnabled(): boolean {
    return this.isEnhancedMode;
  }
  
  /**
   * Enable/disable enhanced mode
   */
  setEnhancedMode(enabled: boolean): void {
    this.isEnhancedMode = enabled;
    
    if (enabled) {
      this.initializeEnhancedFeatures();
    } else {
      // Stop enhanced features
      if (this.metricsTimer) {
        clearInterval(this.metricsTimer);
        this.metricsTimer = null;
      }
    }
  }
}

// Export enhanced singleton instance
export const enhancedDeepgramSTT = new EnhancedDeepgramSTT(
  process.env.DEEPGRAM_API_KEY || '',
  undefined,
  undefined,
  true // Enable enhanced mode by default
);