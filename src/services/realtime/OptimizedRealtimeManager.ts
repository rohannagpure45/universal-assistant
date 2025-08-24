/**
 * OptimizedRealtimeManager - High-Performance Real-time Communication
 * 
 * Provides optimized WebSocket connections, message batching, connection pooling,
 * and intelligent reconnection strategies for production-grade real-time features.
 */

import { nanoid } from 'nanoid';
import { debounce } from 'lodash-es';

export interface RealtimeMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  priority: MessagePriority;
  retries?: number;
}

export type MessagePriority = 'low' | 'medium' | 'high' | 'critical';

export interface ConnectionConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  batchSize: number;
  batchTimeout: number;
  compressionEnabled: boolean;
  messageBufferSize: number;
}

export interface ConnectionMetrics {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  latency: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectCount: number;
  lastMessageTime: number;
  queueSize: number;
  averageBatchSize: number;
}

export interface MessageHandler {
  type: string;
  handler: (message: RealtimeMessage) => void | Promise<void>;
  priority?: MessagePriority;
}

export class OptimizedRealtimeManager {
  private ws: WebSocket | null = null;
  private config: ConnectionConfig;
  private messageQueue: RealtimeMessage[] = [];
  private outgoingQueue: RealtimeMessage[] = [];
  private handlers = new Map<string, MessageHandler[]>();
  private metrics: ConnectionMetrics = {
    status: 'disconnected',
    latency: 0,
    messagesSent: 0,
    messagesReceived: 0,
    reconnectCount: 0,
    lastMessageTime: 0,
    queueSize: 0,
    averageBatchSize: 0
  };
  
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private latencyCheckTimer: NodeJS.Timeout | null = null;
  
  private readonly debouncedSend = debounce(this.processBatch.bind(this), 10);
  private readonly debouncedReconnect = debounce(this.attemptReconnect.bind(this), 1000);
  
  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = {
      url: '',
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      batchSize: 10,
      batchTimeout: 100,
      compressionEnabled: true,
      messageBufferSize: 1000,
      ...config
    };
    
    this.initializeOptimizations();
  }

  /**
   * Initialize performance optimizations
   */
  private initializeOptimizations(): void {
    // Set up message processing intervals
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60000); // Cleanup every minute
    
    // Monitor connection health
    setInterval(() => {
      this.checkConnectionHealth();
    }, 10000); // Check every 10 seconds
    
    // Update metrics
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Establish optimized WebSocket connection
   */
  public async connect(url?: string): Promise<void> {
    const connectionUrl = url || this.config.url;
    if (!connectionUrl) {
      throw new Error('WebSocket URL is required');
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    this.disconnect(); // Clean up existing connection
    this.metrics.status = 'connecting';
    
    try {
      this.ws = new WebSocket(connectionUrl);
      this.setupWebSocketHandlers();
      
      // Wait for connection with timeout
      await this.waitForConnection(10000);
      
      this.startHeartbeat();
      this.startLatencyCheck();
      console.log('🔗 WebSocket connected successfully');
      
    } catch (error) {
      this.metrics.status = 'error';
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onopen = (event) => {
      this.metrics.status = 'connected';
      this.metrics.reconnectCount = 0;
      this.processQueuedMessages();
      this.onConnectionOpen?.(event);
    };
    
    this.ws.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };
    
    this.ws.onclose = (event) => {
      this.metrics.status = 'disconnected';
      this.stopHeartbeat();
      this.stopLatencyCheck();
      this.onConnectionClose?.(event);
      
      if (!event.wasClean) {
        this.scheduleReconnect();
      }
    };
    
    this.ws.onerror = (event) => {
      this.metrics.status = 'error';
      this.onConnectionError?.(event);
      this.scheduleReconnect();
    };
  }

  /**
   * Handle incoming messages with batching and prioritization
   */
  private async handleIncomingMessage(data: string | ArrayBuffer): Promise<void> {
    try {
      let messages: RealtimeMessage[];
      
      if (typeof data === 'string') {
        // Handle JSON messages
        const parsed = JSON.parse(data);
        messages = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Handle binary messages (compressed)
        messages = await this.decompressMessage(data);
      }
      
      // Process messages by priority
      const prioritizedMessages = this.sortMessagesByPriority(messages);
      
      for (const message of prioritizedMessages) {
        await this.processMessage(message);
        this.metrics.messagesReceived++;
        this.metrics.lastMessageTime = Date.now();
      }
      
    } catch (error) {
      console.error('Failed to handle incoming message:', error);
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(message: RealtimeMessage): Promise<void> {
    const messageHandlers = this.handlers.get(message.type) || [];
    
    // Execute handlers in parallel for better performance
    const handlerPromises = messageHandlers.map(async ({ handler, priority }) => {
      try {
        // Prioritize critical handlers
        if (priority === 'critical') {
          await handler(message);
        } else {
          // Use microtask for non-critical handlers
          Promise.resolve().then(() => handler(message));
        }
      } catch (error) {
        console.error(`Handler for message type ${message.type} failed:`, error);
      }
    });
    
    // Wait for critical handlers, but not for others
    const criticalHandlers = handlerPromises.filter((_, index) => 
      messageHandlers[index].priority === 'critical'
    );
    
    if (criticalHandlers.length > 0) {
      await Promise.all(criticalHandlers);
    }
  }

  /**
   * Send message with batching and compression
   */
  public send(type: string, payload: any, priority: MessagePriority = 'medium'): void {
    const message: RealtimeMessage = {
      id: nanoid(),
      type,
      payload,
      timestamp: Date.now(),
      priority,
      retries: 0
    };
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.addToOutgoingQueue(message);
      this.debouncedSend();
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      this.metrics.queueSize = this.messageQueue.length;
      
      // Attempt to reconnect if not connected
      if (this.metrics.status === 'disconnected') {
        this.debouncedReconnect();
      }
    }
  }

  /**
   * Add message to outgoing batch queue
   */
  private addToOutgoingQueue(message: RealtimeMessage): void {
    this.outgoingQueue.push(message);
    
    // Immediate send for critical messages
    if (message.priority === 'critical') {
      this.processBatch();
      return;
    }
    
    // Batch send when queue is full
    if (this.outgoingQueue.length >= this.config.batchSize) {
      this.processBatch();
      return;
    }
    
    // Schedule batch send
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.config.batchTimeout);
    }
  }

  /**
   * Process batch of outgoing messages
   */
  private async processBatch(): Promise<void> {
    if (this.outgoingQueue.length === 0 || this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    
    const batch = [...this.outgoingQueue];
    this.outgoingQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    try {
      let data: string | ArrayBuffer;
      
      if (this.config.compressionEnabled && batch.length > 1) {
        // Compress large batches
        data = await this.compressMessage(batch);
      } else {
        // Send as JSON for small batches
        data = batch.length === 1 ? JSON.stringify(batch[0]) : JSON.stringify(batch);
      }
      
      this.ws!.send(data);
      this.metrics.messagesSent += batch.length;
      this.metrics.averageBatchSize = (this.metrics.averageBatchSize + batch.length) / 2;
      
    } catch (error) {
      console.error('Failed to send batch:', error);
      // Re-queue failed messages with increased retry count
      batch.forEach(message => {
        message.retries = (message.retries || 0) + 1;
        if (message.retries < 3) {
          this.messageQueue.push(message);
        }
      });
    }
  }

  /**
   * Subscribe to message type
   */
  public subscribe(
    type: string, 
    handler: (message: RealtimeMessage) => void | Promise<void>,
    priority: MessagePriority = 'medium'
  ): () => void {
    const messageHandler: MessageHandler = { type, handler, priority };
    
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    
    this.handlers.get(type)!.push(messageHandler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(messageHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        
        if (handlers.length === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  /**
   * Process queued messages when connection is restored
   */
  private processQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;
    
    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);
    
    // Sort messages by priority and timestamp
    this.messageQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });
    
    // Process messages in batches
    while (this.messageQueue.length > 0) {
      const batch = this.messageQueue.splice(0, this.config.batchSize);
      batch.forEach(message => this.addToOutgoingQueue(message));
    }
    
    this.processBatch();
    this.metrics.queueSize = 0;
  }

  /**
   * Heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() }, 'low');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Latency monitoring
   */
  private startLatencyCheck(): void {
    this.latencyCheckTimer = setInterval(() => {
      const startTime = Date.now();
      const pingId = nanoid();
      
      this.send('latency-check', { id: pingId, timestamp: startTime }, 'high');
      
      // Set up response handler
      const unsubscribe = this.subscribe('latency-response', (message) => {
        if (message.payload.id === pingId) {
          this.metrics.latency = Date.now() - startTime;
          unsubscribe();
        }
      }, 'high');
      
      // Cleanup handler after timeout
      setTimeout(() => {
        unsubscribe();
      }, 5000);
      
    }, 10000); // Check latency every 10 seconds
  }

  private stopLatencyCheck(): void {
    if (this.latencyCheckTimer) {
      clearInterval(this.latencyCheckTimer);
      this.latencyCheckTimer = null;
    }
  }

  /**
   * Connection management
   */
  private async waitForConnection(timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);
      
      const checkConnection = () => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearTimeout(timeoutId);
          resolve();
        } else if (this.ws?.readyState === WebSocket.CLOSED) {
          clearTimeout(timeoutId);
          reject(new Error('Connection failed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      
      checkConnection();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.metrics.reconnectCount >= this.config.maxReconnectAttempts) {
      return;
    }
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.metrics.reconnectCount),
      30000 // Max 30 seconds
    );
    
    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectTimer = null;
    this.metrics.reconnectCount++;
    
    console.log(`🔄 Attempting reconnection (${this.metrics.reconnectCount}/${this.config.maxReconnectAttempts})`);
    
    try {
      await this.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Message compression/decompression (placeholder implementation)
   */
  private async compressMessage(messages: RealtimeMessage[]): Promise<ArrayBuffer> {
    // In a real implementation, this would use actual compression
    const json = JSON.stringify(messages);
    const encoder = new TextEncoder();
    return encoder.encode(json).buffer;
  }

  private async decompressMessage(data: ArrayBuffer): Promise<RealtimeMessage[]> {
    // In a real implementation, this would use actual decompression
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }

  /**
   * Utility methods
   */
  private sortMessagesByPriority(messages: RealtimeMessage[]): RealtimeMessage[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return messages.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });
  }

  private cleanupExpiredMessages(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    this.messageQueue = this.messageQueue.filter(message => 
      now - message.timestamp < maxAge
    );
    
    this.outgoingQueue = this.outgoingQueue.filter(message => 
      now - message.timestamp < maxAge
    );
    
    this.metrics.queueSize = this.messageQueue.length;
  }

  private checkConnectionHealth(): void {
    if (this.metrics.status === 'connected' && 
        Date.now() - this.metrics.lastMessageTime > 60000) {
      // No messages received for 1 minute - connection might be stale
      console.warn('⚠️ Connection appears stale, forcing reconnection');
      this.disconnect();
      this.scheduleReconnect();
    }
  }

  private updateMetrics(): void {
    // Update any calculated metrics here
    if (this.messageQueue.length > this.config.messageBufferSize * 0.8) {
      console.warn(`⚠️ Message queue is ${Math.round((this.messageQueue.length / this.config.messageBufferSize) * 100)}% full`);
    }
  }

  /**
   * Public API methods
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.stopHeartbeat();
    this.stopLatencyCheck();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    this.metrics.status = 'disconnected';
  }

  public getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  public getQueueSize(): number {
    return this.messageQueue.length;
  }

  public clearQueue(): void {
    this.messageQueue = [];
    this.outgoingQueue = [];
    this.metrics.queueSize = 0;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Event handlers (can be set by consumers)
  public onConnectionOpen?: (event: Event) => void;
  public onConnectionClose?: (event: CloseEvent) => void;
  public onConnectionError?: (event: Event) => void;
}

// Singleton instance for global use
export const optimizedRealtimeManager = new OptimizedRealtimeManager();