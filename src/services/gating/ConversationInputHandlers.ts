import { InputItem, InputHandlers } from './InputGatekeeper';
import { ConversationProcessor } from '@/services/universal-assistant/ConversationProcessor';

export interface ConversationContext {
  speakerId: string;
  timestamp: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface ContextStorage {
  gatedInputs: InputItem[];
  contextQueue: Array<{ input: InputItem; context: ConversationContext }>;
  maxContextSize: number;
}

export class ConversationInputHandlers implements InputHandlers {
  private contextStorage: ContextStorage = {
    gatedInputs: [],
    contextQueue: [],
    maxContextSize: 50, // Keep last 50 context items
  };

  constructor(
    private conversationProcessor: ConversationProcessor,
    private onProcessedResponse?: (response: any) => Promise<void>
  ) {}

  async handleInput(input: InputItem): Promise<void> {
    try {
      // Process input through the conversation processor
      const conversationEvent = this.convertToConversationEvent(input);
      const response = await this.conversationProcessor.processConversationEvent(conversationEvent);

      // If there's a response callback, call it
      if (this.onProcessedResponse) {
        await this.onProcessedResponse(response);
      }

      // Log successful processing
      console.log(`Processed input: ${input.id}`, {
        shouldRespond: response.shouldRespond,
        responseType: response.responseType,
        confidence: response.confidence,
      });
    } catch (error) {
      console.error(`Failed to handle input ${input.id}:`, error);
      throw error;
    }
  }

  async saveAsContext(input: InputItem): Promise<void> {
    try {
      // Store input in gated inputs for potential future processing
      this.contextStorage.gatedInputs.push(input);

      // Add to context queue with metadata
      const context: ConversationContext = {
        speakerId: this.extractSpeakerId(input),
        timestamp: input.timestamp,
        confidence: 0.6, // Lower confidence since it was gated
        metadata: {
          ...input.metadata,
          gated: true,
          gatedAt: Date.now(),
        },
      };

      this.contextStorage.contextQueue.push({ input, context });

      // Maintain context queue size
      if (this.contextStorage.contextQueue.length > this.contextStorage.maxContextSize) {
        this.contextStorage.contextQueue.shift();
      }

      console.log(`Saved gated input as context: ${input.id}`);
    } catch (error) {
      console.error(`Failed to save input as context ${input.id}:`, error);
      throw error;
    }
  }

  async addToContext(input: InputItem): Promise<void> {
    try {
      // Convert to conversation event with context flag
      const conversationEvent = this.convertToConversationEvent(input, { isContextOnly: true });

      // Process as context-only (no response generation)
      await this.conversationProcessor.processConversationEvent(conversationEvent);

      console.log(`Added input to conversation context: ${input.id}`);
    } catch (error) {
      console.error(`Failed to add input to context ${input.id}:`, error);
      // Non-critical error - log but don't throw
    }
  }

  private convertToConversationEvent(input: InputItem, options?: { isContextOnly?: boolean }) {
    const speakerId = this.extractSpeakerId(input);
    
    return {
      type: 'transcript' as const,
      data: {
        text: input.text,
        speakerId,
        timestamp: input.timestamp,
        confidence: options?.isContextOnly ? 0.5 : 0.8,
        metadata: {
          ...input.metadata,
          contextOnly: options?.isContextOnly || false,
        },
      },
    };
  }

  private extractSpeakerId(input: InputItem): string {
    // Try to extract speaker ID from metadata, fallback to default
    return input.metadata?.speakerId || 
           input.metadata?.speaker || 
           'unknown_speaker';
  }

  // Public methods for context management
  public getGatedInputs(): InputItem[] {
    return [...this.contextStorage.gatedInputs];
  }

  public getContextQueue(): Array<{ input: InputItem; context: ConversationContext }> {
    return [...this.contextStorage.contextQueue];
  }

  public clearGatedInputs(): void {
    this.contextStorage.gatedInputs = [];
    this.contextStorage.contextQueue = [];
    console.log('Cleared gated inputs and context queue');
  }

  public getContextStats(): {
    gatedInputsCount: number;
    contextQueueSize: number;
    oldestContextTimestamp?: number;
    newestContextTimestamp?: number;
  } {
    const queue = this.contextStorage.contextQueue;
    return {
      gatedInputsCount: this.contextStorage.gatedInputs.length,
      contextQueueSize: queue.length,
      oldestContextTimestamp: queue.length > 0 ? queue[0].context.timestamp : undefined,
      newestContextTimestamp: queue.length > 0 ? queue[queue.length - 1].context.timestamp : undefined,
    };
  }

  public updateMaxContextSize(size: number): void {
    this.contextStorage.maxContextSize = Math.max(10, Math.min(200, size));
    
    // Trim if necessary
    while (this.contextStorage.contextQueue.length > this.contextStorage.maxContextSize) {
      this.contextStorage.contextQueue.shift();
    }
  }
}

// Factory function for creating handlers with response callback
export function createConversationInputHandlers(
  conversationProcessor: ConversationProcessor,
  onProcessedResponse?: (response: any) => Promise<void>
): ConversationInputHandlers {
  return new ConversationInputHandlers(conversationProcessor, onProcessedResponse);
}