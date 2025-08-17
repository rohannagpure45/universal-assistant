import { VocalInterruptService } from './VocalInterruptService';
import { InterruptExecutionService } from './InterruptExecutionService';
import { AudioManager } from './AudioManager';

export interface InterruptOrchestratorConfig {
  autoExecute: boolean;
  logInterrupts: boolean;
  enableAnalytics: boolean;
}

export class InterruptOrchestrator {
  private config: InterruptOrchestratorConfig = {
    autoExecute: true,
    logInterrupts: true,
    enableAnalytics: false,
  };

  private interruptCount: number = 0;
  private lastInterruptTranscript: string = '';

  constructor(
    private vocalInterruptService: VocalInterruptService,
    private interruptExecutionService: InterruptExecutionService
  ) {
    this.setupInterruptHandling();
  }

  private setupInterruptHandling(): void {
    // Subscribe to interrupt detection
    this.vocalInterruptService.onInterrupt(() => {
      if (this.config.autoExecute) {
        this.handleInterrupt();
      }
    });
  }

  configure(config: Partial<InterruptOrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async processTranscript(transcript: string): Promise<boolean> {
    const wasInterrupted = this.vocalInterruptService.detectInterrupt(transcript);
    
    if (wasInterrupted) {
      this.lastInterruptTranscript = transcript;
      this.interruptCount++;
      
      if (this.config.logInterrupts) {
        console.log(`Interrupt detected: "${transcript}" (Count: ${this.interruptCount})`);
      }

      if (!this.config.autoExecute) {
        // Manual execution required
        return true;
      }
    }

    return wasInterrupted;
  }

  async handleInterrupt(): Promise<void> {
    try {
      await this.interruptExecutionService.executeInterrupt();
      
      if (this.config.enableAnalytics) {
        this.recordInterruptAnalytics();
      }
    } catch (error) {
      console.error('Failed to handle interrupt:', error);
    }
  }

  async manualInterrupt(): Promise<void> {
    console.log('Manual interrupt triggered');
    await this.handleInterrupt();
  }

  private recordInterruptAnalytics(): void {
    // Analytics implementation can be added here
    const analytics = {
      timestamp: new Date(),
      transcript: this.lastInterruptTranscript,
      interruptCount: this.interruptCount,
    };
    
    // Could send to analytics service
    console.log('Interrupt analytics:', analytics);
  }

  getInterruptStats(): {
    count: number;
    lastTranscript: string;
    lastInterruptTime: number;
  } {
    return {
      count: this.interruptCount,
      lastTranscript: this.lastInterruptTranscript,
      lastInterruptTime: this.vocalInterruptService.getLastInterruptTime(),
    };
  }

  reset(): void {
    this.interruptCount = 0;
    this.lastInterruptTranscript = '';
    this.vocalInterruptService.reset();
  }
}

// Factory function for easy setup
export function createInterruptOrchestrator(
  audioManager: AudioManager,
  dependencies?: {
    messageQueue?: any;
    ttsState?: any;
    startListening?: () => Promise<void>;
  }
): InterruptOrchestrator {
  const vocalInterruptService = new VocalInterruptService();
  const interruptExecutionService = new InterruptExecutionService(
    audioManager,
    dependencies?.messageQueue,
    dependencies?.ttsState,
    dependencies?.startListening
  );

  return new InterruptOrchestrator(vocalInterruptService, interruptExecutionService);
}
