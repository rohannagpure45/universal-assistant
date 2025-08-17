import { AudioManager } from './AudioManager';

interface VoiceCommand {
    phrases: string[];
    action: () => void;
    priority: number;
  }
  
  export class VoiceCommandService {
    private commands: Map<string, VoiceCommand> = new Map();
    private stopPhrases = [
      'stop', 'pause', 'quiet', 'silence', 
      'stop talking', 'be quiet', 'shut up',
      'pause audio', 'stop playback'
    ];
    
    constructor(private audioManager: AudioManager) {
      this.registerDefaultCommands();
    }
    
    private registerDefaultCommands(): void {
      this.commands.set('stop', {
        phrases: this.stopPhrases,
        action: () => this.audioManager.stopAllAudio(),
        priority: 1
      });
      
      this.commands.set('resume', {
        phrases: ['resume', 'continue', 'go on', 'keep going'],
        action: () => this.audioManager.resumePlayback(),
        priority: 2
      });
    }
    
    async processTranscript(transcript: string): Promise<boolean> {
      const lowercaseTranscript = transcript.toLowerCase();
      
      for (const [, command] of this.commands) {
        if (command.phrases.some(phrase => 
          lowercaseTranscript.includes(phrase)
        )) {
          command.action();
          return true;
        }
      }
      return false;
    }
  }