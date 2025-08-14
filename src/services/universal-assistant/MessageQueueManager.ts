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
  
      // Effective priority: favor explicit priority, else recency
      const effectivePriority =
        typeof message.priority === 'number' ? message.priority : queuedMessage.timestamp;

      // Insert by priority (desc). When equal, newer timestamp first
      const insertIndex = this.queue.findIndex(m => {
        const mPriority = typeof m.priority === 'number' ? m.priority : m.timestamp;
        if (mPriority === effectivePriority) {
          return m.timestamp < queuedMessage.timestamp;
        }
        return mPriority < effectivePriority;
      });
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
  
    // Keep only the most recent N messages by effective priority
    clearOldMessages(keepCount: number = 1): void {
      if (keepCount <= 0) {
        this.queue = [];
        return;
      }
      const sorted = [...this.queue].sort((a, b) => {
        const ap = typeof a.priority === 'number' ? a.priority : a.timestamp;
        const bp = typeof b.priority === 'number' ? b.priority : b.timestamp;
        if (bp === ap) return b.timestamp - a.timestamp;
        return bp - ap;
      });
      this.queue = sorted.slice(0, keepCount);
    }

    // Promote the most recent message to be processed next
    playMostRecent(): void {
      // Interrupt current processing and keep only the most recent item
      this.interrupt();
      this.clearOldMessages(1);
      if (!this.isProcessing) {
        this.processQueue();
      }
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