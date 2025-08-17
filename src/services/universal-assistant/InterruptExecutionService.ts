import { AudioManager } from './AudioManager';

export interface InterruptExecutionConfig {
  stopAudio: boolean;
  clearQueue: boolean;
  resetTTS: boolean;
  activateMicrophone: boolean;
}

export class InterruptExecutionService {
  private config: InterruptExecutionConfig = {
    stopAudio: true,
    clearQueue: true,
    resetTTS: true,
    activateMicrophone: true,
  };

  constructor(
    private audioManager: AudioManager,
    private messageQueue?: any, // Will be properly typed when integrated
    private ttsState?: any,     // Will be properly typed when integrated
    private startListening?: () => Promise<void>
  ) {}

  configure(config: Partial<InterruptExecutionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async executeInterrupt(): Promise<void> {
    console.log('Executing interrupt sequence...');

    try {
      // 1. Stop all audio playback
      if (this.config.stopAudio) {
        this.audioManager.stopAllAudio();
        console.log('Audio playback stopped');
      }

      // 2. Clear message queue if available
      if (this.config.clearQueue && this.messageQueue?.clear) {
        this.messageQueue.clear();
        console.log('Message queue cleared');
      }

      // 3. Reset TTS state if available
      if (this.config.resetTTS && this.ttsState?.reset) {
        this.ttsState.reset();
        console.log('TTS state reset');
      }

      // 4. Activate microphone if available
      if (this.config.activateMicrophone && this.startListening) {
        await this.startListening();
        console.log('Microphone activated');
      }

      console.log('Interrupt sequence completed');
    } catch (error) {
      console.error('Error during interrupt execution:', error);
      throw error;
    }
  }

  // Method to update dependencies at runtime
  updateDependencies(deps: {
    messageQueue?: any;
    ttsState?: any;
    startListening?: () => Promise<void>;
  }): void {
    if (deps.messageQueue) this.messageQueue = deps.messageQueue;
    if (deps.ttsState) this.ttsState = deps.ttsState;
    if (deps.startListening) this.startListening = deps.startListening;
  }
}
