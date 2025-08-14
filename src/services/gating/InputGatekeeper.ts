// PROBLEM: User input processed during TTS generation
// ROOT CAUSE: No input gating mechanism
// ENHANCEMENT: Thread-safe concurrent processing with speaker-specific locking

export interface InputItem {
  id: string;
  text: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface InputHandlers {
  handleInput: (input: InputItem) => Promise<void>;
  saveAsContext: (input: InputItem) => Promise<void>;
  addToContext: (input: InputItem) => Promise<void>;
}

export interface ConcurrentGatingConfig {
  enableSpeakerLocking: boolean;
  maxConcurrentInputs: number;
  lockTimeout: number;
}

// FIX: Implement input gating with concurrent processing support
export class InputGatekeeper {
  private isGated: boolean = false;
  private gatedInputs: InputItem[] = [];
  private handlers: InputHandlers;
  private speakerGates: Map<string, boolean> = new Map();
  private speakerQueues: Map<string, InputItem[]> = new Map();
  private processingPromises: Map<string, Promise<void>> = new Map();
  private config: ConcurrentGatingConfig;

  constructor(handlers: InputHandlers, config?: Partial<ConcurrentGatingConfig>) {
    this.handlers = handlers;
    this.config = {
      enableSpeakerLocking: false,
      maxConcurrentInputs: 5,
      lockTimeout: 5000,
      ...config,
    };
  }

  async processInput(input: InputItem): Promise<void> {
    const speakerId = input.metadata?.speakerId || 'unknown_speaker';

    // Use speaker-specific gating if enabled
    if (this.config.enableSpeakerLocking) {
      return this.processSpeakerInput(input, speakerId);
    }

    // Global gating behavior
    if (this.isGated) {
      // Store input as context only
      this.gatedInputs.push(input);
      await this.handlers.saveAsContext(input);
      return;
    }

    // Normal processing
    await this.handlers.handleInput(input);
  }

  private async processSpeakerInput(input: InputItem, speakerId: string): Promise<void> {
    // Check if speaker is gated
    const isGatedForSpeaker = this.speakerGates.get(speakerId) || this.isGated;
    
    if (isGatedForSpeaker) {
      // Add to speaker-specific queue
      if (!this.speakerQueues.has(speakerId)) {
        this.speakerQueues.set(speakerId, []);
      }
      this.speakerQueues.get(speakerId)!.push(input);
      await this.handlers.saveAsContext(input);
      return;
    }

    // Process with speaker-specific locking to prevent race conditions
    const existingPromise = this.processingPromises.get(speakerId);
    if (existingPromise) {
      // Wait for existing processing to complete, then process
      await existingPromise;
    }

    const processingPromise = this.handleSpeakerProcessing(input, speakerId);
    this.processingPromises.set(speakerId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingPromises.delete(speakerId);
    }
  }

  private async handleSpeakerProcessing(input: InputItem, speakerId: string): Promise<void> {
    try {
      await this.handlers.handleInput(input);
    } catch (error) {
      console.error(`InputGatekeeper: Error processing input for speaker ${speakerId}:`, error);
      throw error;
    }
  }

  gateDuringTTS(ttsPromise: Promise<void>, speakerId?: string): void {
    if (speakerId && this.config.enableSpeakerLocking) {
      // Gate specific speaker
      this.speakerGates.set(speakerId, true);
      
      ttsPromise.finally(() => {
        this.speakerGates.set(speakerId, false);
        // Process any gated inputs for this speaker as context
        void this.processSpeakerGatedInputs(speakerId);
      });
    } else {
      // Global gating behavior
      this.isGated = true;

      ttsPromise.finally(() => {
        this.isGated = false;
        // Process any gated inputs as context
        void this.processGatedInputs();
      });
    }
  }

  private async processGatedInputs(): Promise<void> {
    for (const input of this.gatedInputs) {
      await this.handlers.addToContext(input);
    }
    this.gatedInputs = [];
  }

  private async processSpeakerGatedInputs(speakerId: string): Promise<void> {
    const speakerInputs = this.speakerQueues.get(speakerId) || [];
    
    for (const input of speakerInputs) {
      await this.handlers.addToContext(input);
    }
    
    // Clear the speaker queue
    this.speakerQueues.delete(speakerId);
  }

  // Enable speaker-specific locking
  enableSpeakerLocking(): void {
    this.config.enableSpeakerLocking = true;
  }

  // Disable speaker-specific locking
  disableSpeakerLocking(): void {
    this.config.enableSpeakerLocking = false;
    // Clear speaker-specific state
    this.speakerGates.clear();
    this.speakerQueues.clear();
    this.processingPromises.clear();
  }

  // Check if a specific speaker is gated
  isSpeakerGated(speakerId: string): boolean {
    if (this.config.enableSpeakerLocking) {
      return this.speakerGates.get(speakerId) || false;
    }
    return this.isGated;
  }

  // Get processing statistics
  getProcessingStats(): {
    globallyGated: boolean;
    speakerLockingEnabled: boolean;
    activeProcessingPromises: number;
    gatedSpeakers: string[];
    totalGatedInputs: number;
    speakerQueueSizes: Record<string, number>;
  } {
    const gatedSpeakers = Array.from(this.speakerGates.entries())
      .filter(([, isGated]) => isGated)
      .map(([speakerId]) => speakerId);

    const speakerQueueSizes: Record<string, number> = {};
    for (const [speakerId, queue] of this.speakerQueues.entries()) {
      speakerQueueSizes[speakerId] = queue.length;
    }

    return {
      globallyGated: this.isGated,
      speakerLockingEnabled: this.config.enableSpeakerLocking,
      activeProcessingPromises: this.processingPromises.size,
      gatedSpeakers,
      totalGatedInputs: this.gatedInputs.length,
      speakerQueueSizes,
    };
  }
}

export const createInputGatekeeper = (
  handlers: InputHandlers,
  config?: Partial<ConcurrentGatingConfig>
) => new InputGatekeeper(handlers, config);

// Factory function for concurrent-enabled gatekeeper
export const createConcurrentInputGatekeeper = (
  handlers: InputHandlers,
  maxConcurrentInputs: number = 5
) => new InputGatekeeper(handlers, {
  enableSpeakerLocking: true,
  maxConcurrentInputs,
  lockTimeout: 5000,
});


