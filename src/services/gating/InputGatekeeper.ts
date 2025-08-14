// PROBLEM: User input processed during TTS generation
// ROOT CAUSE: No input gating mechanism

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

// FIX: Implement input gating
export class InputGatekeeper {
  private isGated: boolean = false;
  private gatedInputs: InputItem[] = [];
  private handlers: InputHandlers;

  constructor(handlers: InputHandlers) {
    this.handlers = handlers;
  }

  async processInput(input: InputItem): Promise<void> {
    if (this.isGated) {
      // Store input as context only
      this.gatedInputs.push(input);
      await this.handlers.saveAsContext(input);
      return;
    }

    // Normal processing
    await this.handlers.handleInput(input);
  }

  gateDuringTTS(ttsPromise: Promise<void>): void {
    this.isGated = true;

    ttsPromise.finally(() => {
      this.isGated = false;
      // Process any gated inputs as context
      void this.processGatedInputs();
    });
  }

  private async processGatedInputs(): Promise<void> {
    for (const input of this.gatedInputs) {
      await this.handlers.addToContext(input);
    }
    this.gatedInputs = [];
  }
}

export const createInputGatekeeper = (handlers: InputHandlers) => new InputGatekeeper(handlers);


