import { MessageQueueManager, QueuedMessage } from './MessageQueueManager';
import { nanoid } from 'nanoid';

// Enhanced message interface with Phase 3 capabilities
export interface EnhancedQueuedMessage extends QueuedMessage {
  // Streaming and TTS properties
  audioUrl?: string;
  streamingId?: string;
  ttsCacheKey?: string;
  estimatedDuration?: number;
  
  // Priority and scheduling
  urgency: 'low' | 'normal' | 'high' | 'critical';
  maxDelay: number; // maximum acceptable delay in ms
  expiresAt?: number; // message expiration timestamp
  
  // Audio and playback properties
  audioSettings?: {
    voiceId?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    effects?: string[];
  };
  
  // Dependency and grouping
  dependsOn?: string[]; // message IDs this message depends on
  groupId?: string; // for grouping related messages
  sequence?: number; // for ordered message groups
  
  // Performance tracking
  queuedAt: number;
  processedAt?: number;
  completedAt?: number;
  latency?: number;
  
  // Status tracking
  status: 'queued' | 'processing' | 'streaming' | 'playing' | 'completed' | 'failed' | 'expired';
  retryCount: number;
  maxRetries: number;
  
  // Callbacks
  onStart?: () => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

// Streaming configuration
export interface StreamingConfig {
  enabled: boolean;
  chunkSize: number; // TTS chunk size in bytes
  bufferSize: number; // audio buffer size
  preloadNext: boolean; // preload next message while playing current
  concurrentStreams: number; // max concurrent streaming operations
}

// Queue performance configuration
export interface QueuePerformanceConfig {
  latencyTarget: number; // target latency in ms (sub-500ms)
  maxQueueSize: number;
  messageTimeout: number; // individual message timeout
  batchProcessing: boolean; // process multiple messages in batch
  priorityBoost: number; // priority boost for urgent messages
  adaptiveThrottling: boolean; // adjust processing based on performance
}

// TTS integration configuration
export interface TTSIntegrationConfig {
  defaultVoiceId: string;
  cachingEnabled: boolean;
  compressionEnabled: boolean;
  qualityMode: 'low' | 'medium' | 'high';
  streamingMode: boolean;
  pregeneration: boolean; // pre-generate TTS for predicted messages
}

// Queue analytics and metrics
export interface QueueMetrics {
  totalProcessed: number;
  averageLatency: number;
  currentQueueSize: number;
  messagesPerSecond: number;
  errorRate: number;
  cacheHitRate: number;
  streamingUtilization: number;
  lastMetricsUpdate: number;
}

// Message processing events
export interface MessageEvents {
  onMessageQueued: (message: EnhancedQueuedMessage) => void;
  onMessageStarted: (message: EnhancedQueuedMessage) => void;
  onMessageProgress: (message: EnhancedQueuedMessage, progress: number) => void;
  onMessageCompleted: (message: EnhancedQueuedMessage) => void;
  onMessageFailed: (message: EnhancedQueuedMessage, error: Error) => void;
  onQueueEmpty: () => void;
  onQueueFull: () => void;
  onPerformanceAlert: (metric: string, value: number) => void;
}

/**
 * Enhanced Message Queue Manager with Phase 3 capabilities
 * Extends the existing MessageQueueManager with streaming TTS,
 * sub-500ms latency optimization, and advanced queue management
 */
export class EnhancedMessageQueueManager extends MessageQueueManager {
  private enhancedQueue: EnhancedQueuedMessage[] = [];
  private activeStreams: Map<string, any> = new Map();
  private processedMessages: Map<string, EnhancedQueuedMessage> = new Map();
  private eventListeners: Partial<MessageEvents> = {};
  private performanceTimer: NodeJS.Timeout | null = null;
  
  // Configuration
  private streamingConfig: StreamingConfig;
  private performanceConfig: QueuePerformanceConfig;
  private ttsConfig: TTSIntegrationConfig;
  
  // Metrics and monitoring
  private metrics: QueueMetrics;
  private performanceHistory: Array<{ timestamp: number; latency: number }> = [];
  
  // Message grouping and dependencies
  private messageGroups: Map<string, EnhancedQueuedMessage[]> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  
  // Streaming and caching
  private ttsCache: Map<string, { url: string; expiresAt: number }> = new Map();
  private streamingQueue: Map<string, Promise<any>> = new Map();
  
  constructor(
    streamingConfig?: Partial<StreamingConfig>,
    performanceConfig?: Partial<QueuePerformanceConfig>,
    ttsConfig?: Partial<TTSIntegrationConfig>
  ) {
    super();
    
    // Initialize enhanced configurations
    this.streamingConfig = {
      enabled: true,
      chunkSize: 4096,
      bufferSize: 32768,
      preloadNext: true,
      concurrentStreams: 3,
      ...streamingConfig,
    };
    
    this.performanceConfig = {
      latencyTarget: 500, // sub-500ms target
      maxQueueSize: 100,
      messageTimeout: 30000,
      batchProcessing: true,
      priorityBoost: 10,
      adaptiveThrottling: true,
      ...performanceConfig,
    };
    
    this.ttsConfig = {
      defaultVoiceId: '21m00Tcm4TlvDq8ikWAM',
      cachingEnabled: true,
      compressionEnabled: true,
      qualityMode: 'high',
      streamingMode: true,
      pregeneration: false,
      ...ttsConfig,
    };
    
    // Initialize metrics
    this.metrics = {
      totalProcessed: 0,
      averageLatency: 0,
      currentQueueSize: 0,
      messagesPerSecond: 0,
      errorRate: 0,
      cacheHitRate: 0,
      streamingUtilization: 0,
      lastMetricsUpdate: Date.now(),
    };
    
    this.initializeEnhancedFeatures();
  }
  
  /**
   * Initialize Phase 3 enhanced features
   */
  private initializeEnhancedFeatures(): void {
    console.log('EnhancedMessageQueueManager: Initializing Phase 3 features');
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    // Initialize TTS cache cleanup
    this.initializeCacheCleanup();
    
    // Set up dependency resolution
    this.initializeDependencyTracking();
  }
  
  /**
   * Enhanced message addition with Phase 3 capabilities
   */
  addEnhancedMessage(message: Omit<EnhancedQueuedMessage, 'id' | 'timestamp' | 'queuedAt' | 'status' | 'retryCount'>): string {
    const now = Date.now();
    const messageId = nanoid();
    
    const enhancedMessage: EnhancedQueuedMessage = {
      ...message,
      id: messageId,
      timestamp: now,
      queuedAt: now,
      status: 'queued',
      retryCount: 0,
      maxRetries: message.maxRetries || 3,
      urgency: message.urgency || 'normal',
      maxDelay: message.maxDelay || this.performanceConfig.latencyTarget,
      type: message.type || 'ai',
      priority: this.calculateEnhancedPriority(message, now),
    };
    
    // Validate queue capacity
    if (this.enhancedQueue.length >= this.performanceConfig.maxQueueSize) {
      this.handleQueueOverflow();
    }
    
    // Check for dependencies
    if (message.dependsOn && message.dependsOn.length > 0) {
      this.registerDependencies(messageId, message.dependsOn);
      
      // Only queue if dependencies are satisfied
      if (!this.areDependenciesSatisfied(message.dependsOn)) {
        this.dependencyGraph.set(messageId, message.dependsOn);
        console.log(`Message ${messageId} waiting for dependencies: ${message.dependsOn.join(', ')}`);
        return messageId;
      }
    }
    
    // Add to enhanced queue
    this.insertByPriority(enhancedMessage);
    
    // Handle message grouping
    if (message.groupId) {
      this.addToGroup(message.groupId, enhancedMessage);
    }
    
    // Update metrics
    this.metrics.currentQueueSize = this.enhancedQueue.length;
    
    // Emit event
    this.eventListeners.onMessageQueued?.(enhancedMessage);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processEnhancedQueue();
    }
    
    // Check for immediate processing if critical
    if (enhancedMessage.urgency === 'critical') {
      this.processCriticalMessage(enhancedMessage);
    }
    
    console.log(`Enhanced message queued: ${messageId} (priority: ${enhancedMessage.priority}, urgency: ${enhancedMessage.urgency})`);
    
    return messageId;
  }
  
  /**
   * Calculate enhanced priority based on multiple factors
   */
  private calculateEnhancedPriority(message: any, timestamp: number): number {
    let priority = message.priority || timestamp;
    
    // Urgency boost
    switch (message.urgency) {
      case 'critical':
        priority += this.performanceConfig.priorityBoost * 4;
        break;
      case 'high':
        priority += this.performanceConfig.priorityBoost * 2;
        break;
      case 'normal':
        priority += this.performanceConfig.priorityBoost;
        break;
      case 'low':
        // No boost for low priority
        break;
    }
    
    // Age-based priority boost (prevent starvation)
    const age = Date.now() - timestamp;
    if (age > 5000) { // 5 seconds
      priority += Math.floor(age / 1000); // 1 point per second
    }
    
    // Deadline proximity boost
    if (message.expiresAt) {
      const timeToExpiry = message.expiresAt - Date.now();
      if (timeToExpiry < message.maxDelay * 2) {
        priority += this.performanceConfig.priorityBoost;
      }
    }
    
    return priority;
  }
  
  /**
   * Insert message by priority with optimized insertion
   */
  private insertByPriority(message: EnhancedQueuedMessage): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.enhancedQueue.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midPriority = this.enhancedQueue[mid].priority;
      
      if (midPriority > message.priority) {
        left = mid + 1;
      } else if (midPriority < message.priority) {
        right = mid;
      } else {
        // Same priority, use timestamp for tiebreaking
        if (this.enhancedQueue[mid].timestamp < message.timestamp) {
          left = mid + 1;
        } else {
          right = mid;
        }
      }
    }
    
    this.enhancedQueue.splice(left, 0, message);
  }
  
  /**
   * Enhanced queue processing with Phase 3 optimizations
   */
  private async processEnhancedQueue(): Promise<void> {
    if (this.isProcessing || this.enhancedQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      while (this.enhancedQueue.length > 0 && !this.interruptFlag) {
        const startTime = Date.now();
        
        // Get next message(s) to process
        const messages = this.getNextBatch();
        
        if (messages.length === 0) {
          break;
        }
        
        // Process messages (potentially in parallel)
        if (this.performanceConfig.batchProcessing && messages.length > 1) {
          await this.processBatch(messages);
        } else {
          await this.processSingleMessage(messages[0]);
        }
        
        // Update performance metrics
        const processingTime = Date.now() - startTime;
        this.updateLatencyMetrics(processingTime);
        
        // Adaptive throttling based on performance
        if (this.performanceConfig.adaptiveThrottling) {
          await this.adaptiveDelay(processingTime);
        }
      }
    } catch (error) {
      console.error('EnhancedMessageQueueManager: Error in queue processing:', error);
    } finally {
      this.isProcessing = false;
      this.interruptFlag = false;
      
      // Emit queue empty event if applicable
      if (this.enhancedQueue.length === 0) {
        this.eventListeners.onQueueEmpty?.();
      }
    }
  }
  
  /**
   * Get next batch of messages for processing
   */
  private getNextBatch(): EnhancedQueuedMessage[] {
    const batch: EnhancedQueuedMessage[] = [];
    const maxBatchSize = this.performanceConfig.batchProcessing ? 3 : 1;
    
    // Remove expired messages first
    this.removeExpiredMessages();
    
    // Get ready messages (dependencies satisfied)
    for (let i = 0; i < Math.min(maxBatchSize, this.enhancedQueue.length); i++) {
      const message = this.enhancedQueue[i];
      
      if (this.isMessageReady(message)) {
        this.enhancedQueue.splice(i, 1);
        batch.push(message);
        i--; // Adjust index after removal
      }
    }
    
    return batch;
  }
  
  /**
   * Check if message is ready for processing
   */
  private isMessageReady(message: EnhancedQueuedMessage): boolean {
    // Check dependencies
    if (message.dependsOn && !this.areDependenciesSatisfied(message.dependsOn)) {
      return false;
    }
    
    // Check if part of an ordered group
    if (message.groupId && message.sequence !== undefined) {
      const group = this.messageGroups.get(message.groupId);
      if (group) {
        const expectedNext = this.getNextSequenceInGroup(message.groupId);
        if (message.sequence !== expectedNext) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Process a single message with enhanced features
   */
  private async processSingleMessage(message: EnhancedQueuedMessage): Promise<void> {
    const startTime = Date.now();
    message.status = 'processing';
    message.processedAt = startTime;
    
    try {
      // Emit start event
      this.eventListeners.onMessageStarted?.(message);
      message.onStart?.();
      
      // Check if TTS is cached
      let audioUrl = message.audioUrl;
      if (!audioUrl && this.ttsConfig.cachingEnabled) {
        const cacheKey = this.generateTTSCacheKey(message);
        const cached = this.ttsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          audioUrl = cached.url;
          this.metrics.cacheHitRate = (this.metrics.cacheHitRate * this.metrics.totalProcessed + 1) / (this.metrics.totalProcessed + 1);
        }
      }
      
      // Generate TTS if needed
      if (!audioUrl && message.text) {
        audioUrl = await this.generateTTS(message);
      }
      
      // Process with streaming if enabled
      if (this.streamingConfig.enabled && this.ttsConfig.streamingMode) {
        await this.processStreamingMessage(message, audioUrl);
      } else {
        await this.processStandardMessage(message, audioUrl);
      }
      
      // Mark as completed
      message.status = 'completed';
      message.completedAt = Date.now();
      message.latency = message.completedAt - message.queuedAt;
      
      // Update metrics
      this.metrics.totalProcessed++;
      
      // Store processed message
      this.processedMessages.set(message.id, message);
      
      // Emit completion events
      this.eventListeners.onMessageCompleted?.(message);
      message.onComplete?.();
      
      // Check for dependent messages
      this.processDependentMessages(message.id);
      
      console.log(`Message processed: ${message.id} (latency: ${message.latency}ms)`);
      
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      
      message.status = 'failed';
      message.retryCount++;
      
      // Retry if under limit
      if (message.retryCount < message.maxRetries) {
        message.status = 'queued';
        this.insertByPriority(message);
        console.log(`Message ${message.id} queued for retry (attempt ${message.retryCount}/${message.maxRetries})`);
      } else {
        // Emit error events
        this.eventListeners.onMessageFailed?.(message, error as Error);
        message.onError?.(error as Error);
        
        // Update error rate
        this.metrics.errorRate = (this.metrics.errorRate * this.metrics.totalProcessed + 1) / (this.metrics.totalProcessed + 1);
      }
    }
  }

  /**
   * Process multiple messages in batch
   */
  private async processBatch(messages: EnhancedQueuedMessage[]): Promise<void> {
    console.log(`EnhancedMessageQueueManager: Processing batch of ${messages.length} messages`);
    
    // Process all messages in parallel
    const promises = messages.map(message => this.processSingleMessage(message));
    
    try {
      await Promise.all(promises);
      console.log(`EnhancedMessageQueueManager: Batch processing completed successfully`);
    } catch (error) {
      console.error('EnhancedMessageQueueManager: Batch processing failed:', error);
      throw error;
    }
  }
  
  /**
   * Process message with streaming TTS
   */
  private async processStreamingMessage(message: EnhancedQueuedMessage, audioUrl?: string): Promise<void> {
    message.status = 'streaming';
    
    if (audioUrl) {
      // Stream from cached URL
      await this.streamFromUrl(message, audioUrl);
    } else {
      // Generate and stream TTS in real-time
      await this.streamGeneratedTTS(message);
    }
  }
  
  /**
   * Stream TTS from URL
   */
  private async streamFromUrl(message: EnhancedQueuedMessage, audioUrl: string): Promise<void> {
    const streamId = nanoid();
    message.streamingId = streamId;
    
    try {
      // Create audio element for streaming
      const audio = new Audio(audioUrl);
      this.activeStreams.set(streamId, audio);
      
      // Set up progress tracking
      audio.addEventListener('timeupdate', () => {
        const progress = audio.currentTime / audio.duration;
        message.onProgress?.(progress);
        this.eventListeners.onMessageProgress?.(message, progress);
      });
      
      // Play audio
      message.status = 'playing';
      await audio.play();
      
      // Wait for completion
      await new Promise((resolve, reject) => {
        audio.addEventListener('ended', resolve);
        audio.addEventListener('error', reject);
      });
      
    } finally {
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Generate and stream TTS in real-time
   */
  private async streamGeneratedTTS(message: EnhancedQueuedMessage): Promise<void> {
    const streamId = nanoid();
    message.streamingId = streamId;
    
    try {
      // Generate TTS audio first
      const audioUrl = await this.generateTTS(message);
      
      // Stream the generated audio
      await this.streamFromUrl(message, audioUrl);
      
    } catch (error) {
      console.error('EnhancedMessageQueueManager: Failed to stream generated TTS:', error);
      throw error;
    }
  }
  
  /**
   * Generate TTS with caching
   */
  private async generateTTS(message: EnhancedQueuedMessage): Promise<string> {
    const cacheKey = this.generateTTSCacheKey(message);
    
    // Implementation would call TTSApiClient here
    // For now, return a placeholder
    const audioUrl = `tts-${message.id}.mp3`;
    
    // Cache the result
    if (this.ttsConfig.cachingEnabled) {
      this.ttsCache.set(cacheKey, {
        url: audioUrl,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      });
    }
    
    return audioUrl;
  }
  
  /**
   * Generate TTS cache key
   */
  private generateTTSCacheKey(message: EnhancedQueuedMessage): string {
    const voiceId = message.audioSettings?.voiceId || this.ttsConfig.defaultVoiceId;
    const speed = message.audioSettings?.speed || 1.0;
    const textHash = this.hashString(message.text);
    
    return `tts_${voiceId}_${speed}_${textHash}`;
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
   * Process standard (non-streaming) message
   */
  private async processStandardMessage(message: EnhancedQueuedMessage, audioUrl?: string): Promise<void> {
    if (this.onMessageProcess) {
      // Use the parent's message processor
      await this.onMessageProcess(message);
    }
  }
  
  /**
   * Handle queue overflow
   */
  private handleQueueOverflow(): void {
    console.warn('EnhancedMessageQueueManager: Queue overflow detected');
    
    // Remove oldest low-priority messages
    const lowPriorityMessages = this.enhancedQueue.filter(m => m.urgency === 'low');
    if (lowPriorityMessages.length > 0) {
      const toRemove = lowPriorityMessages.slice(0, Math.ceil(lowPriorityMessages.length / 2));
      toRemove.forEach(msg => {
        const index = this.enhancedQueue.indexOf(msg);
        if (index > -1) {
          this.enhancedQueue.splice(index, 1);
        }
      });
    }
    
    this.eventListeners.onQueueFull?.();
  }
  
  /**
   * Remove expired messages
   */
  private removeExpiredMessages(): void {
    const now = Date.now();
    const beforeLength = this.enhancedQueue.length;
    
    this.enhancedQueue = this.enhancedQueue.filter(message => {
      if (message.expiresAt && message.expiresAt < now) {
        message.status = 'expired';
        console.log(`Message ${message.id} expired`);
        return false;
      }
      return true;
    });
    
    const removedCount = beforeLength - this.enhancedQueue.length;
    if (removedCount > 0) {
      this.metrics.currentQueueSize = this.enhancedQueue.length;
    }
  }
  
  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceTimer = setInterval(() => {
      this.updateMetrics();
      this.checkPerformanceAlerts();
    }, 5000); // Update every 5 seconds
  }
  
  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.metrics.lastMetricsUpdate;
    
    // Calculate messages per second
    if (timeSinceLastUpdate > 0) {
      this.metrics.messagesPerSecond = this.metrics.totalProcessed / (timeSinceLastUpdate / 1000);
    }
    
    // Update current queue size
    this.metrics.currentQueueSize = this.enhancedQueue.length;
    
    // Calculate streaming utilization
    this.metrics.streamingUtilization = this.activeStreams.size / this.streamingConfig.concurrentStreams;
    
    this.metrics.lastMetricsUpdate = now;
  }
  
  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(): void {
    // Latency alert
    if (this.metrics.averageLatency > this.performanceConfig.latencyTarget * 1.5) {
      this.eventListeners.onPerformanceAlert?.('latency', this.metrics.averageLatency);
    }
    
    // Queue size alert
    if (this.metrics.currentQueueSize > this.performanceConfig.maxQueueSize * 0.8) {
      this.eventListeners.onPerformanceAlert?.('queue_size', this.metrics.currentQueueSize);
    }
    
    // Error rate alert
    if (this.metrics.errorRate > 0.1) { // 10% error rate
      this.eventListeners.onPerformanceAlert?.('error_rate', this.metrics.errorRate);
    }
  }
  
  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    this.performanceHistory.push({ timestamp: Date.now(), latency });
    
    // Keep only recent history (last 100 measurements)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
    
    // Calculate average latency
    this.metrics.averageLatency = this.performanceHistory.reduce((sum, entry) => sum + entry.latency, 0) / this.performanceHistory.length;
  }
  
  /**
   * Adaptive delay based on performance
   */
  private async adaptiveDelay(lastProcessingTime: number): Promise<void> {
    if (lastProcessingTime > this.performanceConfig.latencyTarget) {
      // If processing is slow, add a small delay to prevent overload
      const delay = Math.min(lastProcessingTime * 0.1, 100); // Max 100ms delay
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Dependency tracking methods
  
  private initializeDependencyTracking(): void {
    // Set up dependency resolution checking
  }
  
  private registerDependencies(messageId: string, dependencies: string[]): void {
    this.dependencyGraph.set(messageId, dependencies);
  }
  
  private areDependenciesSatisfied(dependencies: string[]): boolean {
    return dependencies.every(depId => this.processedMessages.has(depId));
  }
  
  private processDependentMessages(completedMessageId: string): void {
    const waitingMessages: EnhancedQueuedMessage[] = [];
    
    this.dependencyGraph.forEach((deps, messageId) => {
      if (deps.includes(completedMessageId) && this.areDependenciesSatisfied(deps)) {
        // Find the waiting message and add it to queue
        // Implementation would search through waiting messages
        this.dependencyGraph.delete(messageId);
      }
    });
  }
  
  // Group management methods
  
  private addToGroup(groupId: string, message: EnhancedQueuedMessage): void {
    if (!this.messageGroups.has(groupId)) {
      this.messageGroups.set(groupId, []);
    }
    this.messageGroups.get(groupId)!.push(message);
  }
  
  private getNextSequenceInGroup(groupId: string): number {
    const group = this.messageGroups.get(groupId);
    if (!group) return 0;
    
    const processed = group.filter(m => m.status === 'completed');
    return processed.length;
  }
  
  // Cache management
  
  private initializeCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Clean up every minute
  }
  
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    const entries = Array.from(this.ttsCache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt < now) {
        this.ttsCache.delete(key);
      }
    }
  }
  
  // Public API methods
  
  /**
   * Set enhanced event listeners
   */
  setEnhancedEventListeners(listeners: Partial<MessageEvents>): void {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): QueueMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get queue status
   */
  getEnhancedQueueStatus(): {
    queueSize: number;
    activeStreams: number;
    processingMessage: EnhancedQueuedMessage | null;
    averageLatency: number;
    cacheSize: number;
  } {
    return {
      queueSize: this.enhancedQueue.length,
      activeStreams: this.activeStreams.size,
      processingMessage: this.getCurrentMessage() as EnhancedQueuedMessage,
      averageLatency: this.metrics.averageLatency,
      cacheSize: this.ttsCache.size,
    };
  }
  
  /**
   * Process critical message immediately
   */
  private async processCriticalMessage(message: EnhancedQueuedMessage): Promise<void> {
    // Process critical messages with highest priority
    console.log(`Processing critical message immediately: ${message.id}`);
    await this.processSingleMessage(message);
  }
  
  /**
   * Clear enhanced queue
   */
  clearEnhanced(): void {
    this.enhancedQueue = [];
    this.messageGroups.clear();
    this.dependencyGraph.clear();
    this.activeStreams.clear();
    this.metrics.currentQueueSize = 0;
    
    // Also clear parent queue
    this.clear();
  }
  
  /**
   * Update configurations
   */
  updateStreamingConfig(config: Partial<StreamingConfig>): void {
    this.streamingConfig = { ...this.streamingConfig, ...config };
  }
  
  updatePerformanceConfig(config: Partial<QueuePerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config };
  }
  
  updateTTSConfig(config: Partial<TTSIntegrationConfig>): void {
    this.ttsConfig = { ...this.ttsConfig, ...config };
  }
  
  /**
   * Stop all enhanced features
   */
  stopEnhanced(): void {
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = null;
    }
    
    // Stop all active streams
    this.activeStreams.forEach(stream => {
      if (stream && typeof stream.pause === 'function') {
        stream.pause();
      }
    });
    this.activeStreams.clear();
    
    console.log('EnhancedMessageQueueManager: Enhanced features stopped');
  }
}

// Export enhanced singleton instance
export const enhancedMessageQueueManager = new EnhancedMessageQueueManager();