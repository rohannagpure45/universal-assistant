export interface QueuedMessage {
    id: string;
    text: string;
    priority: number;
    timestamp: number;
    type: 'ai' | 'system' | 'user';
    metadata?: {
      voiceId?: string;
      speed?: number;
      emotion?: string;
    };
  }
  
  export class MessageQueueManager {
    private queue: QueuedMessage[] = [];
    private isProcessing: boolean = false;
    private currentMessage: QueuedMessage | null = null;
    private onMessageProcess: ((message: QueuedMessage) => Promise<void>) | null = null;
    private interruptFlag: boolean = false;
  
    addMessage(message: Omit<QueuedMessage, 'id' | 'timestamp'>): void {
      const queuedMessage: QueuedMessage = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
  
      // Add message based on priority
      const insertIndex = this.queue.findIndex(m => m.priority < message.priority);
      if (insertIndex === -1) {
        this.queue.push(queuedMessage);
      } else {
        this.queue.splice(insertIndex, 0, queuedMessage);
      }
  
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    }
  
    private async processQueue(): Promise<void> {
      if (this.isProcessing || this.queue.length === 0) {
        return;
      }
  
      this.isProcessing = true;
  
      while (this.queue.length > 0 && !this.interruptFlag) {
        this.currentMessage = this.queue.shift()!;
        
        try {
          if (this.onMessageProcess) {
            await this.onMessageProcess(this.currentMessage);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
  
        this.currentMessage = null;
      }
  
      this.isProcessing = false;
      this.interruptFlag = false;
    }
  
    interrupt(): void {
      this.interruptFlag = true;
      this.queue = [];
      this.currentMessage = null;
    }
  
    clear(): void {
      this.queue = [];
    }
  
    setMessageProcessor(processor: (message: QueuedMessage) => Promise<void>): void {
      this.onMessageProcess = processor;
    }
  
    getQueueLength(): number {
      return this.queue.length;
    }
  
    getCurrentMessage(): QueuedMessage | null {
      return this.currentMessage;
    }
  }
  
  export const messageQueueManager = new MessageQueueManager();