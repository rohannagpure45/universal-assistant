import { InputGatekeeper, InputItem, createInputGatekeeper } from '@/services/gating/InputGatekeeper';
import { createConversationInputHandlers } from '@/services/gating/ConversationInputHandlers';
import { EnhancedInputGatekeeper } from '@/services/gatekeeper/EnhancedInputGatekeeper';
import { ConcurrentGatekeeper } from '@/services/gatekeeper/ConcurrentGatekeeper';
import { ConversationResponse } from '@/services/universal-assistant/ConversationProcessor';

export interface AudioManagerConfig {
  enableInputGating: boolean;
  enableConcurrentProcessing: boolean;
  chunkInterval: number;
  audioQuality: {
    sampleRate: number;
    audioBitsPerSecond: number;
  };
}

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioStream: MediaStream | null = null;
    private audioChunks: Blob[] = [];
    private activeAudio: HTMLAudioElement | null = null;
    private audioQueue: HTMLAudioElement[] = [];
    private activeAudioElements: Set<HTMLAudioElement> = new Set();
    private recordingCallbacks: ((chunk: Blob) => void)[] = [];
    private inputGatekeeper: InputGatekeeper;
    private enhancedInputGatekeeper: EnhancedInputGatekeeper | null = null;
    private concurrentGatekeeper: ConcurrentGatekeeper | null = null;
    private config: AudioManagerConfig;
    private transcriptionCallback?: (text: string, speakerId?: string) => void;
  
    constructor(config?: Partial<AudioManagerConfig>) {
      this.config = {
        enableInputGating: true,
        enableConcurrentProcessing: false,
        chunkInterval: 100,
        audioQuality: {
          sampleRate: 16000,
          audioBitsPerSecond: 128000,
        },
        ...config,
      };

      // Initialize input gatekeeper with conversation handlers
      const handlers = createConversationInputHandlers(
        this.onConversationResponse.bind(this)
      );
      this.inputGatekeeper = createInputGatekeeper(handlers);

      // Initialize concurrent processing if enabled
      if (this.config.enableConcurrentProcessing) {
        this.initializeConcurrentProcessing();
      }

      if (typeof window !== 'undefined') {
        this.initializeAudioContext();
      }
    }
  
    private async initializeAudioContext() {
      try {
        this.audioContext = new (window.AudioContext || 
          (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
      }
    }
  
    async startRecording(onDataAvailable?: (chunk: Blob) => void): Promise<void> {
      try {
        // Request microphone access
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: this.config.audioQuality.sampleRate,
          }
        });
  
        // Create MediaRecorder
        const mimeType = this.getSupportedMimeType();
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
          mimeType,
          audioBitsPerSecond: this.config.audioQuality.audioBitsPerSecond,
        });
  
        // Handle data available
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
            if (onDataAvailable) {
              onDataAvailable(event.data);
            }
            this.recordingCallbacks.forEach(callback => callback(event.data));
          }
        };
  
        // Start recording with configured chunk interval
        this.mediaRecorder.start(this.config.chunkInterval);
        console.log('Recording started');
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    }
  

    stopRecording(): Blob | null {
      if (!this.mediaRecorder) {
        console.warn('No active recording to stop');
        return null;
      }
  
      // Stop recording
      this.mediaRecorder.stop();
      
      // Stop all tracks
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }
  
      // Create final blob
      const audioBlob = new Blob(this.audioChunks, { 
        type: this.mediaRecorder.mimeType || 'audio/webm' 
      });
      
      // Reset
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.recordingCallbacks = [];
      
      console.log('Recording stopped');
      return audioBlob;
    }
  
    private getSupportedMimeType(): string {
      const types = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg',
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      
      return 'audio/webm';
    }

    stopAllAudio(): void {
      // Stop tracked single active element
      if (this.activeAudio) {
        try {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
          this.activeAudio.src = '';
        } catch {}
      }

      // Stop all active audio elements set
      this.activeAudioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        try { audio.src = ''; } catch {}
      });
      this.activeAudioElements.clear();

      // Stop and clear queued elements
      this.audioQueue.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
        } catch {}
      });
      this.audioQueue = [];
      this.activeAudio = null;
    }

    resumePlayback(): void {
      // Resume playback for all paused audio elements
      this.activeAudioElements.forEach(audio => {
        if (audio.paused) {
          audio.play().catch(console.error);
        }
      });
    }

    isPlaying(): boolean {
      return !!this.activeAudio && !this.activeAudio.paused;
    }

    private cleanupAudio(audio: HTMLAudioElement): void {
      const index = this.audioQueue.indexOf(audio);
      if (index > -1) {
        this.audioQueue.splice(index, 1);
      }
      this.activeAudioElements.delete(audio);
      if (audio === this.activeAudio) {
        this.activeAudio = null;
      }
    }

    private initializeConcurrentProcessing(): void {
      try {
        const messageProcessor = {
          processMessage: async (message: any): Promise<ConversationResponse> => {
            console.log('Processing message in AudioManager:', message);
            return {
              shouldRespond: false,
              responseType: 'none',
              processedText: message.text,
              confidence: 1.0,
              metadata: { 
                fragmentType: 'AUDIO_PROCESSED',
                speakerContext: [],
                conversationTopics: [],
                interruptDetected: false,
              },
            };
          },
        };

        this.concurrentGatekeeper = new ConcurrentGatekeeper(messageProcessor, {
          maxConcurrentProcessing: 5,
          processingTimeout: 5000,
          enablePerformanceMonitoring: true,
        });

        const baseHandlers = createConversationInputHandlers();
        const enhancedHandlers = {
          handleInput: baseHandlers.handleInput,
          saveAsContext: baseHandlers.saveAsContext,
          addToContext: baseHandlers.addToContext,
          concurrentGatekeeper: this.concurrentGatekeeper,
          handleSpeakerInput: async (input: any, speakerId: string) => {
            console.log('Handling speaker input:', input, speakerId);
          },
          categorizeInput: async (input: any) => 'queued' as const,
          shouldGateInput: async (input: any) => false,
        };

        this.enhancedInputGatekeeper = new EnhancedInputGatekeeper(enhancedHandlers, {
          enableConcurrentProcessing: true,
          speakerContextWindow: 10,
        });

        console.log('AudioManager: Concurrent processing initialized');
      } catch (error) {
        console.error('AudioManager: Failed to initialize concurrent processing:', error);
        this.concurrentGatekeeper = null;
        this.enhancedInputGatekeeper = null;
      }
    }

    // Process transcribed input through the gatekeeper
    async processTranscriptionInput(text: string, speakerId?: string): Promise<void> {
      if (!text.trim()) {
        return;
      }

      const inputItem: InputItem = {
        id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        timestamp: Date.now(),
        metadata: {
          speakerId: speakerId || 'unknown_speaker',
          source: 'transcription',
          audioManager: true,
        },
      };

      try {
        // Use enhanced gatekeeper if available and concurrent processing is enabled
        if (this.config.enableConcurrentProcessing && this.enhancedInputGatekeeper && speakerId) {
          await this.enhancedInputGatekeeper.processInput(inputItem);
        } else {
          // Fallback to regular gatekeeper
          await this.inputGatekeeper.processInput(inputItem);
        }
      } catch (error) {
        console.error('Failed to process transcription input:', error);
        throw error;
      }
    }

    // Enhanced TTS gating with concurrent processing support
    async play(url: string, speakerId?: string): Promise<void> {
      // Gate input during TTS playback if enabled
      if (this.config.enableInputGating) {
        const playbackPromise = this.performPlayback(url);
        
        // Use enhanced gatekeeper if available
        if (this.config.enableConcurrentProcessing && this.enhancedInputGatekeeper && speakerId) {
          this.enhancedInputGatekeeper.gateDuringTTS(playbackPromise);
        } else {
          // Fallback to regular gatekeeper
          this.inputGatekeeper.gateDuringTTS(playbackPromise);
        }
        
        return playbackPromise;
      } else {
        return this.performPlayback(url);
      }
    }

    private async performPlayback(url: string): Promise<void> {
      this.stopAllAudio();

      this.activeAudio = new Audio(url);
      this.audioQueue.push(this.activeAudio);
      this.activeAudioElements.add(this.activeAudio);

      this.activeAudio.addEventListener('ended', () => {
        if (this.activeAudio) {
          this.cleanupAudio(this.activeAudio);
        }
      });

      try {
        await this.activeAudio.play();
      } catch (error) {
        console.error('Failed to play audio:', error);
        if (this.activeAudio) {
          this.cleanupAudio(this.activeAudio);
        }
      }
    }

    // Callback for when conversation processor generates a response
    private async onConversationResponse(response: any): Promise<void> {
      try {
        console.log('Conversation response received:', {
          shouldRespond: response.shouldRespond,
          responseType: response.responseType,
          confidence: response.confidence,
        });

        // If there's a transcription callback, notify it
        if (this.transcriptionCallback) {
          this.transcriptionCallback(response.processedText, response.metadata?.speakerId);
        }

        // Here you could trigger TTS generation, UI updates, etc.
        // This is where the AudioManager interfaces with other services
      } catch (error) {
        console.error('Error handling conversation response:', error);
      }
    }

    // Set callback for transcription events
    setTranscriptionCallback(callback: (text: string, speakerId?: string) => void): void {
      this.transcriptionCallback = callback;
    }

    // Configuration methods
    updateConfig(config: Partial<AudioManagerConfig>): void {
      const oldConfig = { ...this.config };
      this.config = { ...this.config, ...config };
      
      // Reinitialize concurrent processing if setting changed
      if (oldConfig.enableConcurrentProcessing !== this.config.enableConcurrentProcessing) {
        if (this.config.enableConcurrentProcessing) {
          this.initializeConcurrentProcessing();
        } else {
          this.concurrentGatekeeper = null;
          this.enhancedInputGatekeeper = null;
        }
      }
    }

    getConfig(): AudioManagerConfig {
      return { ...this.config };
    }

    // Input gating control
    enableInputGating(): void {
      this.config.enableInputGating = true;
    }

    disableInputGating(): void {
      this.config.enableInputGating = false;
    }

    isInputGatingEnabled(): boolean {
      return this.config.enableInputGating;
    }

    // Concurrent processing control
    enableConcurrentProcessing(): void {
      this.config.enableConcurrentProcessing = true;
      if (!this.concurrentGatekeeper) {
        this.initializeConcurrentProcessing();
      }
    }

    disableConcurrentProcessing(): void {
      this.config.enableConcurrentProcessing = false;
      this.concurrentGatekeeper = null;
      this.enhancedInputGatekeeper = null;
    }

    isConcurrentProcessingEnabled(): boolean {
      return this.config.enableConcurrentProcessing && this.concurrentGatekeeper !== null;
    }
  }
  
  export const audioManager = new AudioManager();