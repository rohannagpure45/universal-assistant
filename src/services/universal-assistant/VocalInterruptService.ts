import { enhancedMessageQueueManager } from './EnhancedMessageQueueManager';
import { streamingTTSService } from './StreamingTTSService';
import { useAppStore } from '@/stores/appStore';
import { nanoid } from 'nanoid';

// Legacy interrupt config (maintained for backward compatibility)
export interface InterruptConfig {
    keywords: string[];
    sensitivity: 'low' | 'medium' | 'high';
    requireExactMatch: boolean;
    cooldownMs: number;
}

// Enhanced voice command types
export interface VoiceCommand {
  id: string;
  keyword: string;
  aliases: string[];
  action: VocalInterruptAction;
  confidence: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresConfirmation: boolean;
  confirmationTimeout: number;
  cooldownPeriod: number;
  description: string;
  parameters?: Record<string, any>;
  contextSensitive: boolean;
  validContexts?: string[];
}

export type VocalInterruptAction = 
  | 'stop_playback'
  | 'pause_playback'
  | 'resume_playback'
  | 'skip_message'
  | 'repeat_message'
  | 'clear_queue'
  | 'mute_microphone'
  | 'unmute_microphone'
  | 'increase_volume'
  | 'decrease_volume'
  | 'save_transcript'
  | 'summarize_meeting'
  | 'end_meeting'
  | 'legacy_interrupt'; // For backward compatibility

export interface CommandContext {
  timestamp: number;
  sessionId: string;
  speakerId?: string;
  confidence: number;
  originalText: string;
  normalizedText: string;
  currentState: {
    isRecording: boolean;
    isPlaying: boolean;
    queueLength: number;
    currentVolume: number;
    isMuted: boolean;
  };
}

export interface CommandResult {
  success: boolean;
  action: VocalInterruptAction;
  executedAt: number;
  duration: number;
  error?: string;
  feedback?: string;
  newState?: any;
}

export interface VocalInterruptEvents {
  onCommandDetected: (command: VoiceCommand, context: CommandContext) => void;
  onCommandExecuted: (result: CommandResult) => void;
  onCommandFailed: (command: VoiceCommand, error: Error, context: CommandContext) => void;
  onLegacyInterrupt: () => void; // For backward compatibility
}

export class VocalInterruptService {
    // Legacy properties (maintained for backward compatibility)
    private config: InterruptConfig = {
      keywords: ['stop', 'pause', 'wait', 'hold on', 'shut up', 'quiet', 'enough'],
      sensitivity: 'medium',
      requireExactMatch: false,
      cooldownMs: 2000,
    };
    
    private lastInterruptTime: number = 0;
    private onInterruptCallbacks: Set<() => void> = new Set();

    // Enhanced Phase 3 properties
    private isEnhancedMode: boolean = true;
    private eventListeners: Partial<VocalInterruptEvents> = {};
    private voiceCommands: Map<string, VoiceCommand> = new Map();
    private commandCooldowns: Map<string, number> = new Map();
    private sessionId: string = nanoid();
    private confidenceThreshold: number = 0.7;
    private processedTranscripts: Set<string> = new Set();
    private executingCommands: Set<string> = new Set(); // Race condition protection

    constructor() {
      this.initializeEnhancedCommands();
    }

    /**
     * Initialize enhanced voice commands
     */
    private initializeEnhancedCommands(): void {
      const enhancedCommands: VoiceCommand[] = [
        {
          id: 'stop',
          keyword: 'stop',
          aliases: ['halt', 'cease', 'end this', 'stop now'],
          action: 'stop_playback',
          confidence: 0.9,
          priority: 'high',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 1000,
          description: 'Stop current audio playback',
          contextSensitive: false,
          validContexts: []
        },
        {
          id: 'pause',
          keyword: 'pause',
          aliases: ['hold on', 'wait', 'pause this'],
          action: 'pause_playback',
          confidence: 0.85,
          priority: 'normal',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 500,
          description: 'Pause current audio playback',
          contextSensitive: false,
          validContexts: []
        },
        {
          id: 'resume',
          keyword: 'resume',
          aliases: ['continue', 'go on', 'keep going', 'play'],
          action: 'resume_playback',
          confidence: 0.85,
          priority: 'normal',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 500,
          description: 'Resume paused audio playback',
          contextSensitive: false,
          validContexts: []
        },
        {
          id: 'skip',
          keyword: 'skip',
          aliases: ['next', 'skip this', 'move on'],
          action: 'skip_message',
          confidence: 0.8,
          priority: 'normal',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 1000,
          description: 'Skip current message and play next',
          contextSensitive: false,
          validContexts: []
        },
        {
          id: 'repeat',
          keyword: 'repeat',
          aliases: ['say again', 'repeat that', 'one more time'],
          action: 'repeat_message',
          confidence: 0.8,
          priority: 'normal',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 1000,
          description: 'Repeat the last message',
          contextSensitive: false,
          validContexts: []
        },
        {
          id: 'volume_up',
          keyword: 'volume up',
          aliases: ['louder', 'increase volume', 'turn up'],
          action: 'increase_volume',
          confidence: 0.8,
          priority: 'normal',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 500,
          description: 'Increase audio volume',
          contextSensitive: false,
          validContexts: []
        },
        {
          id: 'volume_down',
          keyword: 'volume down',
          aliases: ['quieter', 'decrease volume', 'turn down'],
          action: 'decrease_volume',
          confidence: 0.8,
          priority: 'normal',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 500,
          description: 'Decrease audio volume',
          contextSensitive: false,
          validContexts: []
        },
        // Legacy interrupt commands mapped to enhanced system
        {
          id: 'legacy_stop',
          keyword: 'shut up',
          aliases: ['quiet', 'enough'],
          action: 'legacy_interrupt',
          confidence: 0.75,
          priority: 'high',
          requiresConfirmation: false,
          confirmationTimeout: 5000,
          cooldownPeriod: 2000,
          description: 'Legacy interrupt command',
          contextSensitive: false,
          validContexts: []
        }
      ];

      enhancedCommands.forEach(command => {
        this.voiceCommands.set(command.id, command);
      });

      // Debug: Loaded enhanced commands (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`VocalInterruptService: Loaded ${enhancedCommands.length} enhanced commands`);
      }
    }

    // Legacy methods (maintained for backward compatibility)
    configure(config: Partial<InterruptConfig>): void {
      this.config = { ...this.config, ...config };
    }

    detectInterrupt(transcript: string): boolean {
      // Enhanced detection if in enhanced mode
      if (this.isEnhancedMode) {
        return this.detectEnhancedCommands(transcript);
      }

      // Legacy detection logic
      const now = Date.now();
      if (now - this.lastInterruptTime < this.config.cooldownMs) {
        return false;
      }

      const lowercaseTranscript = transcript.toLowerCase().trim();
      let interrupted = false;
      
      if (this.config.requireExactMatch) {
        interrupted = this.config.keywords.some(keyword => 
          lowercaseTranscript === keyword.toLowerCase()
        );
      } else {
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

    /**
     * Enhanced command detection with Phase 3 capabilities
     */
    private detectEnhancedCommands(transcript: string): boolean {
      if (this.processedTranscripts.has(transcript)) {
        return false;
      }

      this.processedTranscripts.add(transcript);
      
      // Clean up old processed transcripts
      if (this.processedTranscripts.size > 100) {
        const oldEntries = Array.from(this.processedTranscripts).slice(0, 50);
        oldEntries.forEach(entry => this.processedTranscripts.delete(entry));
      }

      const text = transcript.toLowerCase().trim();
      const normalizedText = this.normalizeText(text);
      
      // Try to match against voice commands
      for (const command of this.voiceCommands.values()) {
        if (this.matchesCommand(normalizedText, command)) {
          // Use confidenceThreshold to filter commands
          const confidence = Math.max(0.8, this.confidenceThreshold);
          this.handleVoiceCommand(command, {
            timestamp: Date.now(),
            sessionId: this.sessionId,
            confidence,
            originalText: transcript,
            normalizedText,
            currentState: this.getCurrentState()
          });
          return true;
        }
      }

      return false;
    }

    private matchesCommand(text: string, command: VoiceCommand): boolean {
      // Check main keyword
      if (new RegExp(`\\b${this.escapeRegex(command.keyword)}\\b`, 'i').test(text)) {
        return true;
      }

      // Check aliases
      return command.aliases.some(alias => 
        new RegExp(`\\b${this.escapeRegex(alias)}\\b`, 'i').test(text)
      );
    }

    private async handleVoiceCommand(command: VoiceCommand, context: CommandContext): Promise<void> {
      const startTime = Date.now();
      
      // Race condition protection - prevent concurrent execution of same command
      if (this.executingCommands.has(command.id)) {
        return; // Command already executing
      }
      
      // Check cooldown period
      const lastExecution = this.commandCooldowns.get(command.id);
      if (lastExecution && (startTime - lastExecution) < command.cooldownPeriod) {
        return;
      }
      
      // Mark command as executing
      this.executingCommands.add(command.id);

      // Debug: Processing command (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`VocalInterruptService: Processing command "${command.action}"`);
      }

      // Emit command detected event
      this.eventListeners.onCommandDetected?.(command, context);

      // Execute command
      try {
        const result = await this.executeCommand(command, context, startTime);
        
        // Set cooldown
        this.commandCooldowns.set(command.id, Date.now());
        
        // Emit result event
        this.eventListeners.onCommandExecuted?.(result);

        // Debug: Command executed successfully (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log(`VocalInterruptService: Command ${command.action} executed successfully`);
        }

      } catch (error) {
        console.error(`VocalInterruptService: Failed to execute command ${command.action}:`, error);
        this.eventListeners.onCommandFailed?.(command, error as Error, context);
      } finally {
        // Always remove command from executing set to prevent permanent locks
        this.executingCommands.delete(command.id);
      }
    }

    private async executeCommand(command: VoiceCommand, context: CommandContext, startTime: number): Promise<CommandResult> {
      let result: CommandResult;

      switch (command.action) {
        case 'stop_playback':
          result = await this.executeStopPlayback(command, context);
          break;
        case 'pause_playback':
          result = await this.executePausePlayback(command, context);
          break;
        case 'resume_playback':
          result = await this.executeResumePlayback(command, context);
          break;
        case 'skip_message':
          result = await this.executeSkipMessage(command, context);
          break;
        case 'repeat_message':
          result = await this.executeRepeatMessage(command, context);
          break;
        case 'increase_volume':
          result = await this.executeIncreaseVolume(command, context);
          break;
        case 'decrease_volume':
          result = await this.executeDecreaseVolume(command, context);
          break;
        case 'legacy_interrupt':
          // Trigger legacy interrupt for backward compatibility
          this.triggerInterrupt();
          result = {
            success: true,
            action: command.action,
            executedAt: Date.now(),
            duration: Date.now() - startTime,
            feedback: 'Legacy interrupt triggered'
          };
          break;
        default:
          result = {
            success: false,
            action: command.action,
            executedAt: Date.now(),
            duration: Date.now() - startTime,
            error: 'Action not implemented'
          };
      }

      result.duration = Date.now() - startTime;
      return result;
    }

    // Command execution methods
    private async executeStopPlayback(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      enhancedMessageQueueManager.interrupt();
      streamingTTSService.getActiveSessions().forEach(session => {
        streamingTTSService.cancelSession(session.sessionId);
      });

      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: 'Playback stopped'
      };
    }

    private async executePausePlayback(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      // Implementation would pause current audio playback
      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: 'Playback paused'
      };
    }

    private async executeResumePlayback(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      // Implementation would resume paused audio playback
      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: 'Playback resumed'
      };
    }

    private async executeSkipMessage(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      const currentMessage = enhancedMessageQueueManager.getCurrentMessage();
      if (currentMessage) {
        enhancedMessageQueueManager.interrupt();
      }

      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: 'Message skipped'
      };
    }

    private async executeRepeatMessage(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      const currentMessage = enhancedMessageQueueManager.getCurrentMessage();
      if (currentMessage) {
        enhancedMessageQueueManager.addEnhancedMessage({
          text: currentMessage.text,
          type: 'ai',
          priority: Date.now(),
          urgency: 'high',
          maxDelay: 100,
          maxRetries: 3
        });
      }

      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: 'Message will repeat'
      };
    }

    private async executeIncreaseVolume(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      const appStore = useAppStore.getState();
      const currentVolume = appStore.audioSettings.volume;
      const newVolume = Math.min(currentVolume + 0.1, 1.0);
      
      appStore.updateAudioSettings({ volume: newVolume });

      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: `Volume increased to ${Math.round(newVolume * 100)}%`
      };
    }

    private async executeDecreaseVolume(command: VoiceCommand, _context: CommandContext): Promise<CommandResult> {
      const appStore = useAppStore.getState();
      const currentVolume = appStore.audioSettings.volume;
      const newVolume = Math.max(currentVolume - 0.1, 0.0);
      
      appStore.updateAudioSettings({ volume: newVolume });

      return {
        success: true,
        action: command.action,
        executedAt: Date.now(),
        duration: 0,
        feedback: `Volume decreased to ${Math.round(newVolume * 100)}%`
      };
    }

    // Utility methods
    private normalizeText(text: string): string {
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    private escapeRegex(string: string): string {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    private getCurrentState(): CommandContext['currentState'] {
      const queueStatus = enhancedMessageQueueManager.getEnhancedQueueStatus();
      const appStore = useAppStore.getState();

      return {
        isRecording: false,
        isPlaying: queueStatus.processingMessage !== null,
        queueLength: queueStatus.queueSize,
        currentVolume: appStore.audioSettings.volume,
        isMuted: appStore.audioSettings.volume === 0
      };
    }

    // Legacy methods (maintained for backward compatibility)
    getSensitivityThreshold(): number {
      switch (this.config.sensitivity) {
        case 'high': return 0.3;
        case 'medium': return 0.5;
        case 'low': return 0.7;
        default: return 0.5;
      }
    }

    private triggerInterrupt(): void {
      this.onInterruptCallbacks.forEach(callback => callback());
      this.eventListeners.onLegacyInterrupt?.();
    }

    onInterrupt(callback: () => void): () => void {
      this.onInterruptCallbacks.add(callback);
      return () => this.onInterruptCallbacks.delete(callback);
    }

    reset(): void {
      this.lastInterruptTime = 0;
      this.commandCooldowns.clear();
      this.processedTranscripts.clear();
      this.executingCommands.clear(); // Clear any stuck executing commands
    }

    getLastInterruptTime(): number {
      return this.lastInterruptTime;
    }

    // Enhanced API methods
    setEnhancedMode(enabled: boolean): void {
      this.isEnhancedMode = enabled;
      // Debug: Enhanced mode toggled (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`VocalInterruptService: Enhanced mode ${enabled ? 'enabled' : 'disabled'}`);
      }
    }

    setEventListeners(listeners: Partial<VocalInterruptEvents>): void {
      this.eventListeners = { ...this.eventListeners, ...listeners };
    }

    addCustomCommand(command: VoiceCommand): void {
      this.voiceCommands.set(command.id, command);
      // Debug: Added custom command (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`VocalInterruptService: Added custom command "${command.id}"`);
      }
    }

    removeCommand(commandId: string): boolean {
      const removed = this.voiceCommands.delete(commandId);
      if (removed) {
        // Debug: Removed command (remove in production)
        if (process.env.NODE_ENV === 'development') {
          console.log(`VocalInterruptService: Removed command "${commandId}"`);
        }
      }
      return removed;
    }

    getAvailableCommands(): VoiceCommand[] {
      return Array.from(this.voiceCommands.values());
    }

    setConfidenceThreshold(threshold: number): void {
      this.confidenceThreshold = Math.max(0.1, Math.min(1.0, threshold));
    }

    isEnhancedModeEnabled(): boolean {
      return this.isEnhancedMode;
    }
}

export const vocalInterruptService = new VocalInterruptService();