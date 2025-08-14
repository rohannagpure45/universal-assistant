import { useState, useCallback, useRef } from 'react';
import { conversationProcessor } from './ConversationProcessor';
import { audioManager } from './AudioManager';
import { improvedFragmentAggregator } from '@/services/fragments/ImprovedFragmentAggregator';
import { performanceMonitor } from '@/services/monitoring/PerformanceMonitor';
import { createProductionGatekeeper } from '@/services/gatekeeper';

export interface SpeakerProfile {
  id: string;
  name?: string;
  voiceId?: string;
  confidence: number;
  lastSeen: Date;
  utteranceCount: number;
}

export interface UniversalAssistantConfig {
  model: string;
  maxTokens: number;
  voiceId: string;
  ttsSpeed: number;
  enableConcurrentProcessing: boolean;
  enableSpeakerIdentification: boolean;
}

export interface CoordinatorState {
  isRecording: boolean;
  isPlaying: boolean;
  transcript: string;
  speakers: Map<string, SpeakerProfile>;
  currentSpeaker?: string;
  isProcessing: boolean;
}

export class UniversalAssistantCoordinator {
  private deepgramConnection: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private currentAudioUrl: string | null = null;
  private config: UniversalAssistantConfig;
  private stateListeners: Set<(state: CoordinatorState) => void> = new Set();
  private state: CoordinatorState = {
    isRecording: false,
    isPlaying: false,
    transcript: '',
    speakers: new Map(),
    isProcessing: false,
  };

  constructor(config: UniversalAssistantConfig) {
    this.config = config;
    
    // Initialize concurrent processing if enabled
    if (config.enableConcurrentProcessing) {
      conversationProcessor.updateConfig({ enableConcurrentProcessing: true });
      audioManager.enableConcurrentProcessing();
    }

    // Set up audio manager callbacks
    audioManager.setTranscriptionCallback(this.handleTranscriptionResponse.bind(this));
  }

  // State management
  private setState(newState: Partial<CoordinatorState>): void {
    this.state = { ...this.state, ...newState };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: (state: CoordinatorState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public getState(): CoordinatorState {
    return { ...this.state };
  }

  // Deepgram Integration
  public async initializeDeepgram(): Promise<void> {
    try {
      const response = await fetch('/api/universal-assistant/deepgram-key');
      const { key } = await response.json();

      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?` +
          `model=nova-2&` +
          `language=en&` +
          `diarize=true&` +
          `punctuate=true&` +
          `interim_results=true`,
        ['token', key]
      );

      ws.onopen = () => {
        console.log('Deepgram connection established');
        performanceMonitor.recordMetric('deepgram_connection', 'success');
      };

      ws.onmessage = this.handleDeepgramMessage.bind(this);
      ws.onerror = this.handleDeepgramError.bind(this);
      ws.onclose = this.handleDeepgramClose.bind(this);

      this.deepgramConnection = ws;
    } catch (error) {
      console.error('Failed to initialize Deepgram:', error);
      performanceMonitor.recordError('deepgram_initialization', error);
      throw error;
    }
  }

  // Recording Management
  public async startRecording(): Promise<void> {
    try {
      // Initialize Deepgram if not already connected
      if (!this.deepgramConnection || this.deepgramConnection.readyState !== WebSocket.OPEN) {
        await this.initializeDeepgram();
      }

      // Start audio recording through AudioManager
      await audioManager.startRecording(this.handleAudioChunk.bind(this));
      
      this.setState({ isRecording: true });
      
      console.log('Recording started with concurrent processing');
      performanceMonitor.recordMetric('recording_start', 'success');
    } catch (error) {
      console.error('Failed to start recording:', error);
      performanceMonitor.recordError('recording_start', error);
      throw error;
    }
  }

  public stopRecording(): void {
    try {
      // Stop audio recording through AudioManager
      audioManager.stopRecording();

      // Close Deepgram connection
      if (this.deepgramConnection) {
        this.deepgramConnection.close();
        this.deepgramConnection = null;
      }

      this.setState({ isRecording: false });
      
      console.log('Recording stopped');
      performanceMonitor.recordMetric('recording_stop', 'success');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      performanceMonitor.recordError('recording_stop', error);
    }
  }

  // Audio Processing
  private handleAudioChunk(chunk: Blob): void {
    if (this.deepgramConnection?.readyState === WebSocket.OPEN) {
      this.deepgramConnection.send(chunk);
    }
  }

  private handleDeepgramMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'Results') {
        const result = data.channel.alternatives[0];

        if (result?.transcript) {
          this.processTranscription(result, data.channel.alternatives[0].words);
        }
      }
    } catch (error) {
      console.error('Error processing Deepgram message:', error);
      performanceMonitor.recordError('deepgram_message_processing', error);
    }
  }

  private async processTranscription(result: any, words?: any[]): Promise<void> {
    try {
      const transcript = result.transcript.trim();
      if (!transcript) return;

      // Determine speaker ID from diarization
      const speakerId = this.extractSpeakerId(words);
      
      // Update transcript state
      this.setState({ 
        transcript: this.state.transcript + ' ' + transcript,
        currentSpeaker: speakerId 
      });

      // Process through concurrent conversation processor
      if (this.config.enableConcurrentProcessing) {
        await audioManager.processTranscriptionInput(transcript, speakerId);
      } else {
        // Fallback to regular processing
        const event = {
          type: 'transcript' as const,
          data: {
            text: transcript,
            speakerId,
            timestamp: Date.now(),
            confidence: result.confidence,
          }
        };

        const response = await conversationProcessor.processConversationEvent(event);
        
        if (response.shouldRespond) {
          await this.generateAIResponse(response.processedText);
        }
      }

      // Process diarization for speaker identification
      if (words && this.config.enableSpeakerIdentification) {
        this.processDiarization(words);
      }

      // Check for vocal interrupts
      if (this.checkForInterrupt(transcript)) {
        this.handleVocalInterrupt();
      }

    } catch (error) {
      console.error('Error processing transcription:', error);
      performanceMonitor.recordError('transcription_processing', error);
    }
  }

  // Speaker Management
  private extractSpeakerId(words?: any[]): string {
    if (!words || words.length === 0) {
      return 'unknown_speaker';
    }

    // Get most common speaker in this chunk
    const speakerCounts = new Map<number, number>();
    words.forEach(word => {
      if (word.speaker !== undefined) {
        speakerCounts.set(word.speaker, (speakerCounts.get(word.speaker) || 0) + 1);
      }
    });

    if (speakerCounts.size === 0) {
      return 'unknown_speaker';
    }

    const dominantSpeaker = Array.from(speakerCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    return `speaker_${dominantSpeaker}`;
  }

  private processDiarization(words: any[]): void {
    const speakerMap = new Map(this.state.speakers);

    words.forEach(word => {
      if (word.speaker !== undefined) {
        const speakerId = `speaker_${word.speaker}`;
        const existing = speakerMap.get(speakerId);

        if (existing) {
          existing.utteranceCount++;
          existing.lastSeen = new Date();
          existing.confidence = Math.max(existing.confidence, word.confidence || 0);
        } else {
          speakerMap.set(speakerId, {
            id: speakerId,
            confidence: word.confidence || 0.5,
            lastSeen: new Date(),
            utteranceCount: 1,
          });
        }
      }
    });

    this.setState({ speakers: speakerMap });
  }

  // AI Response Generation
  private async generateAIResponse(prompt: string): Promise<void> {
    try {
      this.setState({ isProcessing: true });

      const response = await fetch('/api/universal-assistant/ai-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          context: this.getConversationContext(),
        }),
      });

      const { text } = await response.json();

      if (text) {
        await this.generateTTS(text);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      performanceMonitor.recordError('ai_response_generation', error);
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  // TTS Integration
  private async generateTTS(text: string): Promise<void> {
    try {
      this.setState({ isPlaying: true });

      const response = await fetch('/api/universal-assistant/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: this.config.voiceId,
          speed: this.config.ttsSpeed,
        }),
      });

      const { audioUrl } = await response.json();
      
      if (audioUrl) {
        await this.playAudio(audioUrl);
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      performanceMonitor.recordError('tts_generation', error);
      this.setState({ isPlaying: false });
    }
  }

  // Audio Playback
  public async playAudio(url: string): Promise<void> {
    try {
      this.currentAudioUrl = url;
      
      // Use AudioManager with speaker-specific gating if available
      if (this.config.enableConcurrentProcessing && this.state.currentSpeaker) {
        await audioManager.play(url, this.state.currentSpeaker);
      } else {
        await audioManager.play(url);
      }

      this.setState({ isPlaying: false });
      this.currentAudioUrl = null;
    } catch (error) {
      console.error('Audio playback error:', error);
      performanceMonitor.recordError('audio_playback', error);
      this.setState({ isPlaying: false });
    }
  }

  // Vocal Interrupt Handling
  public handleVocalInterrupt(): void {
    try {
      // Stop current audio playback
      audioManager.stopAllAudio();
      
      // Clear processing states
      this.setState({ isPlaying: false, isProcessing: false });
      
      // Clear current audio reference
      this.currentAudioUrl = null;

      // Reactivate recording if needed
      if (!this.state.isRecording) {
        this.startRecording().catch(error => {
          console.error('Failed to restart recording after interrupt:', error);
        });
      }

      console.log('Vocal interrupt handled');
      performanceMonitor.recordMetric('vocal_interrupt', 'handled');
    } catch (error) {
      console.error('Error handling vocal interrupt:', error);
      performanceMonitor.recordError('vocal_interrupt_handling', error);
    }
  }

  private checkForInterrupt(text: string): boolean {
    const interruptPhrases = ['stop', 'shut up', 'stop talking', 'pause', 'quiet'];
    const normalized = text.toLowerCase().trim();
    return interruptPhrases.some(phrase => normalized.includes(phrase));
  }

  // Utility Methods
  private handleTranscriptionResponse(text: string, speakerId?: string): void {
    // This is called by AudioManager when responses are processed
    console.log(`Response processed for ${speakerId}: ${text}`);
  }

  private getConversationContext(): string[] {
    // Get recent conversation context
    const stats = conversationProcessor.getProcessorStats();
    return stats.conversationTopics.slice(-5); // Last 5 topics
  }

  private handleDeepgramError(error: Event): void {
    console.error('Deepgram connection error:', error);
    performanceMonitor.recordError('deepgram_connection', error);
  }

  private handleDeepgramClose(): void {
    console.log('Deepgram connection closed');
    this.deepgramConnection = null;
  }

  // Configuration Management
  public updateConfig(newConfig: Partial<UniversalAssistantConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update related services
    if (newConfig.enableConcurrentProcessing !== undefined) {
      conversationProcessor.updateConfig({ 
        enableConcurrentProcessing: newConfig.enableConcurrentProcessing 
      });
      
      if (newConfig.enableConcurrentProcessing) {
        audioManager.enableConcurrentProcessing();
      } else {
        audioManager.disableConcurrentProcessing();
      }
    }
  }

  public getConfig(): UniversalAssistantConfig {
    return { ...this.config };
  }

  // Cleanup
  public cleanup(): void {
    this.stopRecording();
    audioManager.stopAllAudio();
    this.stateListeners.clear();
    this.deepgramConnection = null;
  }
}

// Factory function for easy setup
export function createUniversalAssistantCoordinator(config: UniversalAssistantConfig): UniversalAssistantCoordinator {
  return new UniversalAssistantCoordinator(config);
}