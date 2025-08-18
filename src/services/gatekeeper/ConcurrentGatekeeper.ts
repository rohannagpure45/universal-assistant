/**
 * ConcurrentGatekeeper - Thread-safe message processing system
 * 
 * Features:
 * - Speaker-specific locking to prevent concurrent processing conflicts
 * - Async queue management for proper message ordering
 * - Integration with existing InputGatekeeper for TTS gating
 * - Comprehensive error handling and recovery
 * - Performance monitoring and metrics
 * - Thread-safe operations with proper cleanup
 */

import { AsyncQueue, QueueStats } from './utils/AsyncQueue';
import { AsyncLock, SpeakerLockManager, LockStats } from './utils/AsyncLock';
import { InputGatekeeper, InputItem, InputHandlers } from '../gating/InputGatekeeper';
import { ConversationEvent, ConversationResponse, ConversationProcessor } from '../universal-assistant/ConversationProcessor';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface ConcurrentMessage {
  id: string;
  speakerId: string;
  text: string;
  timestamp: number;
  priority: number;
  metadata?: Record<string, any>;
  processingAttempts: number;
  maxProcessingAttempts: number;
}

export interface ProcessingContext {
  messageId: string;
  speakerId: string;
  startTime: number;
  operationType: string;
  metadata: Record<string, any>;
}

export interface ConcurrentGatekeeperConfig {
  maxConcurrentProcessing: number;
  processingTimeout: number;
  maxRetries: number;
  enablePriorityProcessing: boolean;
  speakerLockTimeout: number;
  queueCleanupInterval: number;
  enablePerformanceMonitoring: boolean;
  enableInputGating: boolean;
  deadlockDetectionEnabled: boolean;
}

export interface GatekeeperStats {
  totalMessages: number;
  messagesProcessed: number;
  messagesInQueue: number;
  processingErrors: number;
  averageProcessingTime: number;
  speakerStats: Record<string, {
    messagesProcessed: number;
    averageProcessingTime: number;
    errorCount: number;
    lastProcessedAt: number;
  }>;
  queueStats: QueueStats;
  lockStats: LockStats;
  activeProcessingOperations: number;
}

export interface MessageProcessor {
  processMessage(message: ConcurrentMessage): Promise<ConversationResponse>;
}

/**
 * ConcurrentGatekeeper manages thread-safe message processing with speaker-specific locking
 */
export class ConcurrentGatekeeper {
  private messageQueue!: AsyncQueue<ConcurrentMessage>;
  private speakerLockManager!: SpeakerLockManager;
  private inputGatekeeper: InputGatekeeper | null = null;
  private messageProcessor!: MessageProcessor;
  private config: ConcurrentGatekeeperConfig;
  
  private activeProcessing: Map<string, ProcessingContext> = new Map();
  private processingStats!: GatekeeperStats;
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;
  
  // Speaker-specific stats
  private speakerProcessingTimes: Map<string, number[]> = new Map();
  private speakerErrorCounts: Map<string, number> = new Map();
  private speakerLastProcessed: Map<string, number> = new Map();

  constructor(
    messageProcessor: MessageProcessor,
    config: Partial<ConcurrentGatekeeperConfig> = {},
    inputHandlers?: InputHandlers
  ) {
    this.config = {
      maxConcurrentProcessing: 5,
      processingTimeout: 30000,
      maxRetries: 3,
      enablePriorityProcessing: true,
      speakerLockTimeout: 15000,
      queueCleanupInterval: 60000,
      enablePerformanceMonitoring: true,
      enableInputGating: false,
      deadlockDetectionEnabled: true,
      ...config,
    };

    this.messageProcessor = messageProcessor;
    
    this.initializeComponents(inputHandlers);
    this.initializeStats();
    this.startCleanupInterval();
  }

  /**
   * Processes a message with speaker-specific locking and queuing
   */
  async processMessage(
    speakerId: string,
    text: string,
    options: {
      priority?: number;
      timeout?: number;
      metadata?: Record<string, any>;
      bypassQueue?: boolean;
    } = {}
  ): Promise<ConversationResponse> {
    if (this.isShuttingDown) {
      throw new Error('Gatekeeper is shutting down');
    }

    // Check if input is gated (during TTS playback)
    if (this.inputGatekeeper && this.config.enableInputGating) {
      const inputItem: InputItem = {
        id: this.generateMessageId(),
        text,
        timestamp: Date.now(),
        metadata: options.metadata,
      };
      
      await this.inputGatekeeper.processInput(inputItem);
      
      // If input was gated, return a gated response
      // The input will be processed later when gating is released
      return this.createGatedResponse(speakerId, text);
    }

    const message: ConcurrentMessage = {
      id: this.generateMessageId(),
      speakerId,
      text,
      timestamp: Date.now(),
      priority: options.priority || 0,
      metadata: options.metadata || {},
      processingAttempts: 0,
      maxProcessingAttempts: this.config.maxRetries,
    };

    this.processingStats.totalMessages++;

    // Process immediately if bypassing queue and speaker is not locked
    if (options.bypassQueue && !this.speakerLockManager.isSpeakerLocked(speakerId)) {
      return this.processSingleMessage(message);
    }

    // Add to queue for ordered processing
    const queueId = await this.messageQueue.enqueue(message, {
      id: message.id,
      priority: message.priority,
      timeout: options.timeout || this.config.processingTimeout,
      maxRetries: this.config.maxRetries,
    });

    // Start processing the queue
    void this.startQueueProcessing();

    // Return a queued response - actual processing will happen asynchronously
    return this.createQueuedResponse(message);
  }

  /**
   * Processes a conversation event with proper concurrency control
   */
  async processConversationEvent(event: ConversationEvent): Promise<ConversationResponse> {
    const speakerId = event.data.speakerId || 'unknown';
    const text = event.data.text || '';
    
    // Determine priority based on event type
    let priority = 0;
    switch (event.type) {
      case 'interrupt':
        priority = 10; // Highest priority
        break;
      case 'transcript':
        priority = 5;
        break;
      case 'speaker_change':
        priority = 3;
        break;
      case 'silence':
        priority = 1;
        break;
      default:
        priority = 0;
    }

    return this.processMessage(speakerId, text, {
      priority,
      metadata: {
        eventType: event.type,
        eventData: event.data,
      },
    });
  }

  /**
   * Gates input during TTS playback
   */
  gateDuringTTS(ttsPromise: Promise<void>): void {
    if (this.inputGatekeeper && this.config.enableInputGating) {
      this.inputGatekeeper.gateDuringTTS(ttsPromise);
    }
  }

  /**
   * Checks if input is currently gated
   */
  isInputGated(): boolean {
    return this.config.enableInputGating && this.inputGatekeeper !== null;
  }

  /**
   * Gets comprehensive gatekeeper statistics
   */
  getStats(): GatekeeperStats {
    this.updateStats();
    return { ...this.processingStats };
  }

  /**
   * Gets speaker-specific statistics
   */
  getSpeakerStats(speakerId: string): {
    messagesProcessed: number;
    averageProcessingTime: number;
    errorCount: number;
    lastProcessedAt: number;
    isCurrentlyLocked: boolean;
  } {
    const stats = this.processingStats.speakerStats[speakerId] || {
      messagesProcessed: 0,
      averageProcessingTime: 0,
      errorCount: 0,
      lastProcessedAt: 0,
    };

    return {
      ...stats,
      isCurrentlyLocked: this.speakerLockManager.isSpeakerLocked(speakerId),
    };
  }

  /**
   * Clears messages for a specific speaker
   */
  async clearSpeakerMessages(speakerId: string): Promise<number> {
    let clearedCount = 0;
    
    // Note: AsyncQueue doesn't have a direct way to remove by criteria
    // This would need to be implemented by filtering the queue
    // For now, we'll focus on preventing new messages
    
    // Clear speaker stats
    this.speakerProcessingTimes.delete(speakerId);
    this.speakerErrorCounts.delete(speakerId);
    this.speakerLastProcessed.delete(speakerId);
    
    if (this.processingStats.speakerStats[speakerId]) {
      delete this.processingStats.speakerStats[speakerId];
    }

    return clearedCount;
  }

  /**
   * Performs cleanup of expired operations and locks
   */
  cleanup(): void {
    if (this.isShuttingDown) return;

    try {
      // Clean up expired locks
      this.speakerLockManager.cleanup();
      
      // Clean up old processing contexts
      const now = Date.now();
      for (const [contextId, context] of this.activeProcessing) {
        if (now - context.startTime > this.config.processingTimeout * 2) {
          console.warn(`Cleaning up stale processing context: ${contextId}`);
          this.activeProcessing.delete(contextId);
        }
      }

      // Clean up old speaker processing times
      for (const [speakerId, times] of this.speakerProcessingTimes) {
        if (times.length > 100) {
          this.speakerProcessingTimes.set(speakerId, times.slice(-50));
        }
      }

      if (this.config.enablePerformanceMonitoring) {
        performanceMonitor.recordMetric('gatekeeper_cleanup', {
          activeLocks: this.speakerLockManager.getStats().activeLocks,
          activeProcessing: this.activeProcessing.size,
          queueLength: this.messageQueue.size(),
        });
      }
    } catch (error) {
      console.error('Error during gatekeeper cleanup:', error);
    }
  }

  /**
   * Gracefully shuts down the gatekeeper
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true;
    
    try {
      // Stop cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Shutdown message queue
      await this.messageQueue.shutdown(timeoutMs / 2);
      
      // Shutdown speaker lock manager
      this.speakerLockManager.shutdown();
      
      // Clear active processing
      this.activeProcessing.clear();
      
      console.log('ConcurrentGatekeeper shut down gracefully');
    } catch (error) {
      console.error('Error during gatekeeper shutdown:', error);
    }
  }

  /**
   * Initializes components
   */
  private initializeComponents(inputHandlers?: InputHandlers): void {
    // Initialize message queue
    this.messageQueue = new AsyncQueue<ConcurrentMessage>({
      maxConcurrency: this.config.maxConcurrentProcessing,
      defaultTimeout: this.config.processingTimeout,
      defaultMaxRetries: this.config.maxRetries,
      enablePriorityOrdering: this.config.enablePriorityProcessing,
      onError: (error, item) => this.handleProcessingError(error, item.payload),
      onComplete: (item) => this.handleProcessingComplete(item.payload),
      onTimeout: (item) => this.handleProcessingTimeout(item.payload),
    });

    // Initialize speaker lock manager
    this.speakerLockManager = new SpeakerLockManager({
      timeout: this.config.speakerLockTimeout,
      maxWaitingOperations: this.config.maxConcurrentProcessing * 2,
      enableDeadlockDetection: this.config.deadlockDetectionEnabled,
      deadlockTimeout: this.config.speakerLockTimeout * 2,
    });

    // Initialize input gatekeeper if handlers provided
    if (inputHandlers && this.config.enableInputGating) {
      this.inputGatekeeper = new InputGatekeeper(inputHandlers);
    }
  }

  /**
   * Initializes statistics
   */
  private initializeStats(): void {
    this.processingStats = {
      totalMessages: 0,
      messagesProcessed: 0,
      messagesInQueue: 0,
      processingErrors: 0,
      averageProcessingTime: 0,
      speakerStats: {},
      queueStats: this.messageQueue.getStats(),
      lockStats: this.speakerLockManager.getStats(),
      activeProcessingOperations: 0,
    };
  }

  /**
   * Starts the cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.queueCleanupInterval);
  }

  /**
   * Starts processing the message queue
   */
  private async startQueueProcessing(): Promise<void> {
    if (this.messageQueue.activeCount() >= this.config.maxConcurrentProcessing) {
      return; // Already at capacity
    }

    void this.messageQueue.process(
      async (message: ConcurrentMessage) => {
        return this.processSingleMessage(message);
      },
      'concurrent_gatekeeper'
    );
  }

  /**
   * Processes a single message with speaker locking
   */
  private async processSingleMessage(message: ConcurrentMessage): Promise<ConversationResponse> {
    const startTime = Date.now();
    const contextId = `${message.id}_${message.speakerId}`;
    
    // Create processing context
    const context: ProcessingContext = {
      messageId: message.id,
      speakerId: message.speakerId,
      startTime,
      operationType: 'message_processing',
      metadata: message.metadata || {},
    };
    
    this.activeProcessing.set(contextId, context);

    try {
      // Use speaker-specific locking to prevent race conditions
      return await this.speakerLockManager.withSpeakerLock(
        message.speakerId,
        async () => {
          message.processingAttempts++;
          
          if (this.config.enablePerformanceMonitoring) {
            return performanceMonitor.measureAsync(
              'concurrent_gatekeeper_processing',
              () => this.messageProcessor.processMessage(message),
              {
                speakerId: message.speakerId,
                messageId: message.id,
                attempt: message.processingAttempts,
              }
            );
          } else {
            return this.messageProcessor.processMessage(message);
          }
        },
        'message_processing'
      );
    } catch (error) {
      this.handleProcessingError(error as Error, message);
      throw error;
    } finally {
      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateSpeakerStats(message.speakerId, processingTime, false);
      this.activeProcessing.delete(contextId);
    }
  }

  /**
   * Handles processing errors
   */
  private handleProcessingError(error: Error, message: ConcurrentMessage): void {
    console.error(`Message processing error for speaker ${message.speakerId}:`, error);
    
    this.processingStats.processingErrors++;
    this.updateSpeakerStats(message.speakerId, 0, true);
    
    if (this.config.enablePerformanceMonitoring) {
      performanceMonitor.recordError('concurrent_gatekeeper_processing', error, {
        speakerId: message.speakerId,
        messageId: message.id,
      });
    }
  }

  /**
   * Handles processing completion
   */
  private handleProcessingComplete(message: ConcurrentMessage): void {
    this.processingStats.messagesProcessed++;
    
    if (this.config.enablePerformanceMonitoring) {
      performanceMonitor.recordSuccess('concurrent_gatekeeper_processing', {
        speakerId: message.speakerId,
        messageId: message.id,
      });
    }
  }

  /**
   * Handles processing timeouts
   */
  private handleProcessingTimeout(message: ConcurrentMessage): void {
    console.warn(`Message processing timeout for speaker ${message.speakerId}, message: ${message.id}`);
    
    this.processingStats.processingErrors++;
    this.updateSpeakerStats(message.speakerId, 0, true);
  }

  /**
   * Updates speaker-specific statistics
   */
  private updateSpeakerStats(speakerId: string, processingTime: number, isError: boolean): void {
    // Update processing times
    if (!this.speakerProcessingTimes.has(speakerId)) {
      this.speakerProcessingTimes.set(speakerId, []);
    }
    
    if (processingTime > 0) {
      const times = this.speakerProcessingTimes.get(speakerId)!;
      times.push(processingTime);
      if (times.length > 50) times.shift(); // Keep last 50 times
    }

    // Update error counts
    if (isError) {
      const currentCount = this.speakerErrorCounts.get(speakerId) || 0;
      this.speakerErrorCounts.set(speakerId, currentCount + 1);
    }

    // Update last processed time
    this.speakerLastProcessed.set(speakerId, Date.now());
  }

  /**
   * Updates overall statistics
   */
  private updateStats(): void {
    // Update queue and lock stats
    this.processingStats.queueStats = this.messageQueue.getStats();
    this.processingStats.lockStats = this.speakerLockManager.getStats();
    this.processingStats.messagesInQueue = this.messageQueue.size();
    this.processingStats.activeProcessingOperations = this.activeProcessing.size;

    // Calculate average processing time
    let totalProcessingTime = 0;
    let totalProcessedMessages = 0;
    
    for (const times of this.speakerProcessingTimes.values()) {
      totalProcessingTime += times.reduce((sum, time) => sum + time, 0);
      totalProcessedMessages += times.length;
    }
    
    this.processingStats.averageProcessingTime = 
      totalProcessedMessages > 0 ? totalProcessingTime / totalProcessedMessages : 0;

    // Update speaker stats
    for (const [speakerId, times] of this.speakerProcessingTimes) {
      const avgTime = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
      
      this.processingStats.speakerStats[speakerId] = {
        messagesProcessed: times.length,
        averageProcessingTime: avgTime,
        errorCount: this.speakerErrorCounts.get(speakerId) || 0,
        lastProcessedAt: this.speakerLastProcessed.get(speakerId) || 0,
      };
    }
  }

  /**
   * Creates a response for gated input
   */
  private createGatedResponse(speakerId: string, text: string): ConversationResponse {
    return {
      shouldRespond: false,
      responseType: 'none',
      processedText: text,
      confidence: 1.0,
      metadata: {
        fragmentType: 'GATED',
        speakerContext: [],
        conversationTopics: [],
        interruptDetected: false,
      },
    };
  }

  /**
   * Creates a response for queued messages
   */
  private createQueuedResponse(message: ConcurrentMessage): ConversationResponse {
    return {
      shouldRespond: false,
      responseType: 'delayed',
      processedText: message.text,
      confidence: 0.5,
      metadata: {
        fragmentType: 'QUEUED',
        speakerContext: [],
        conversationTopics: [],
        interruptDetected: false,
      },
    };
  }

  /**
   * Generates a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Creates a ConcurrentGatekeeper instance integrated with ConversationProcessor
 */
export function createConcurrentGatekeeper(
  conversationProcessor: ConversationProcessor,
  config: Partial<ConcurrentGatekeeperConfig> = {},
  inputHandlers?: InputHandlers
): ConcurrentGatekeeper {
  const messageProcessor: MessageProcessor = {
    async processMessage(message: ConcurrentMessage): Promise<ConversationResponse> {
      const event: ConversationEvent = {
        type: (message.metadata?.eventType as any) || 'transcript',
        data: {
          text: message.text,
          speakerId: message.speakerId,
          timestamp: message.timestamp,
          confidence: 0.9,
          ...(message.metadata?.eventData || {}),
        },
      };
      
      return conversationProcessor.processConversationEvent(event);
    },
  };

  return new ConcurrentGatekeeper(messageProcessor, config, inputHandlers);
}