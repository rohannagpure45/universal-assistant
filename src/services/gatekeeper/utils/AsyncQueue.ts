/**
 * AsyncQueue - Thread-safe async queue for managing concurrent operations
 * Ensures proper ordering and prevents race conditions in message processing
 */

export interface QueueItem<T> {
  id: string;
  payload: T;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  timeout?: number;
}

export interface QueueOptions {
  maxConcurrency: number;
  defaultTimeout: number;
  defaultMaxRetries: number;
  enablePriorityOrdering: boolean;
  onError?: (error: Error, item: QueueItem<any>) => void;
  onComplete?: (item: QueueItem<any>) => void;
  onTimeout?: (item: QueueItem<any>) => void;
}

export interface QueueStats {
  totalProcessed: number;
  totalErrors: number;
  totalTimeouts: number;
  averageProcessingTime: number;
  queueLength: number;
  activeOperations: number;
  successRate: number;
}

export class AsyncQueue<T = any> {
  private queue: QueueItem<T>[] = [];
  private processing: Map<string, Promise<void>> = new Map();
  private options: QueueOptions;
  private stats: QueueStats = {
    totalProcessed: 0,
    totalErrors: 0,
    totalTimeouts: 0,
    averageProcessingTime: 0,
    queueLength: 0,
    activeOperations: 0,
    successRate: 1.0,
  };
  private processingTimes: number[] = [];
  private isShuttingDown = false;

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = {
      maxConcurrency: 5,
      defaultTimeout: 30000, // 30 seconds
      defaultMaxRetries: 3,
      enablePriorityOrdering: true,
      ...options,
    };
  }

  /**
   * Adds an item to the queue
   */
  async enqueue(
    payload: T,
    options: {
      id?: string;
      priority?: number;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('Queue is shutting down, cannot accept new items');
    }

    const item: QueueItem<T> = {
      id: options.id || this.generateId(),
      payload,
      priority: options.priority || 0,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options.maxRetries || this.options.defaultMaxRetries,
      timeout: options.timeout || this.options.defaultTimeout,
    };

    this.queue.push(item);
    this.sortQueue();
    this.stats.queueLength = this.queue.length;
    
    // Start processing if we have capacity
    void this.processNext();
    
    return item.id;
  }

  /**
   * Processes an item with the given processor function
   */
  async process<R>(
    processor: (payload: T) => Promise<R>,
    processorName: string = 'default'
  ): Promise<void> {
    while (!this.isShuttingDown && (this.queue.length > 0 || this.processing.size > 0)) {
      await this.processNext(processor, processorName);
      
      // Small delay to prevent tight loops
      if (this.queue.length === 0 && this.processing.size === 0) {
        break;
      }
      
      await this.delay(10);
    }
  }

  /**
   * Processes the next item in the queue if we have capacity
   */
  private async processNext<R>(
    processor?: (payload: T) => Promise<R>,
    processorName: string = 'default'
  ): Promise<void> {
    if (
      this.isShuttingDown ||
      this.processing.size >= this.options.maxConcurrency ||
      this.queue.length === 0 ||
      !processor
    ) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.stats.queueLength = this.queue.length;
    this.stats.activeOperations = this.processing.size + 1;

    const processingPromise = this.processItem(item, processor, processorName);
    this.processing.set(item.id, processingPromise);

    processingPromise.finally(() => {
      this.processing.delete(item.id);
      this.stats.activeOperations = this.processing.size;
    });
  }

  /**
   * Processes a single item with error handling and timeout
   */
  private async processItem<R>(
    item: QueueItem<T>,
    processor: (payload: T) => Promise<R>,
    processorName: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Processing timeout after ${item.timeout}ms`));
        }, item.timeout);
      });

      // Race between processing and timeout
      await Promise.race([
        processor(item.payload),
        timeoutPromise,
      ]);

      // Success
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, true);
      this.options.onComplete?.(item);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof Error && error.message.includes('timeout')) {
        this.stats.totalTimeouts++;
        this.options.onTimeout?.(item);
      } else {
        this.stats.totalErrors++;
      }

      this.updateProcessingStats(processingTime, false);

      // Retry logic
      if (item.retryCount < item.maxRetries) {
        item.retryCount++;
        item.timestamp = Date.now();
        
        // Exponential backoff for retries
        const delay = Math.min(1000 * Math.pow(2, item.retryCount - 1), 10000);
        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.queue.unshift(item);
            this.sortQueue();
            this.stats.queueLength = this.queue.length;
          }
        }, delay);
      } else {
        this.options.onError?.(error as Error, item);
      }
    }
  }

  /**
   * Removes an item from the queue
   */
  async remove(itemId: string): Promise<boolean> {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.stats.queueLength = this.queue.length;
      return true;
    }

    // Check if it's currently processing
    if (this.processing.has(itemId)) {
      // Can't remove items that are currently processing
      return false;
    }

    return false;
  }

  /**
   * Clears all pending items from the queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    this.stats.queueLength = 0;
  }

  /**
   * Gets the current queue length
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Gets the number of items currently being processed
   */
  activeCount(): number {
    return this.processing.size;
  }

  /**
   * Gets queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Checks if the queue is empty and no items are processing
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.processing.size === 0;
  }

  /**
   * Gracefully shuts down the queue
   */
  async shutdown(timeoutMs: number = 30000): Promise<void> {
    this.isShuttingDown = true;
    
    // Clear pending queue
    this.queue = [];
    this.stats.queueLength = 0;

    // Wait for active operations to complete
    const shutdownPromise = Promise.all(Array.from(this.processing.values()));
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);
    
    // Force clear any remaining processing items
    this.processing.clear();
    this.stats.activeOperations = 0;
  }

  /**
   * Sorts the queue by priority (higher priority first) and timestamp
   */
  private sortQueue(): void {
    if (!this.options.enablePriorityOrdering) return;

    this.queue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Earlier timestamp first for same priority
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * Updates processing statistics
   */
  private updateProcessingStats(processingTime: number, success: boolean): void {
    this.stats.totalProcessed++;
    
    // Track processing times for average calculation
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 100) {
      this.processingTimes.shift(); // Keep only last 100 times
    }
    
    this.stats.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    
    // Calculate success rate
    const totalAttempts = this.stats.totalProcessed;
    const totalFailures = this.stats.totalErrors + this.stats.totalTimeouts;
    this.stats.successRate = totalAttempts > 0 ? (totalAttempts - totalFailures) / totalAttempts : 1.0;
  }

  /**
   * Generates a unique ID for queue items
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}