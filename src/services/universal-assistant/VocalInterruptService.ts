export interface InterruptConfig {
    keywords: string[];
    sensitivity: 'low' | 'medium' | 'high';
    requireExactMatch: boolean;
    cooldownMs: number;
  }
  
  export class VocalInterruptService {
    private config: InterruptConfig = {
      keywords: ['stop', 'pause', 'wait', 'hold on', 'shut up', 'quiet', 'enough'],
      sensitivity: 'medium',
      requireExactMatch: false,
      cooldownMs: 2000,
    };
    
    private lastInterruptTime: number = 0;
    private onInterruptCallbacks: Set<() => void> = new Set();
  
    configure(config: Partial<InterruptConfig>): void {
      this.config = { ...this.config, ...config };
    }
  
    detectInterrupt(transcript: string): boolean {
      // Check cooldown
      const now = Date.now();
      if (now - this.lastInterruptTime < this.config.cooldownMs) {
        return false;
      }
  
      const lowercaseTranscript = transcript.toLowerCase().trim();
      
      // Check for interrupt keywords
      let interrupted = false;
      
      if (this.config.requireExactMatch) {
        interrupted = this.config.keywords.some(keyword => 
          lowercaseTranscript === keyword.toLowerCase()
        );
      } else {
        // Check based on sensitivity
        const threshold = this.getSensitivityThreshold();
        interrupted = this.config.keywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          if (this.config.sensitivity === 'high') {
            return lowercaseTranscript.includes(keywordLower);
          } else if (this.config.sensitivity === 'medium') {
            return new RegExp(`\\b${keywordLower}\\b`).test(lowercaseTranscript);
          } else {
            return lowercaseTranscript.startsWith(keywordLower);
          }
        });
      }
  
      if (interrupted) {
        this.lastInterruptTime = now;
        this.triggerInterrupt();
      }
  
      return interrupted;
    }
  
    private getSensitivityThreshold(): number {
      switch (this.config.sensitivity) {
        case 'high': return 0.3;
        case 'medium': return 0.5;
        case 'low': return 0.7;
        default: return 0.5;
      }
    }
  
    private triggerInterrupt(): void {
      this.onInterruptCallbacks.forEach(callback => callback());
    }
  
    onInterrupt(callback: () => void): () => void {
      this.onInterruptCallbacks.add(callback);
      return () => this.onInterruptCallbacks.delete(callback);
    }
  
    reset(): void {
      this.lastInterruptTime = 0;
    }

    getLastInterruptTime(): number {
      return this.lastInterruptTime;
    }
  }
  
  export const vocalInterruptService = new VocalInterruptService();