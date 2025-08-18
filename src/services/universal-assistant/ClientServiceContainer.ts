'use client';

import { AudioManager, AudioManagerConfig } from './AudioManager';
import { ConversationProcessor, ConversationProcessorConfig } from './ConversationProcessor';
import { DeepgramSTT } from './DeepgramSTT';
import { FragmentProcessor, FragmentProcessorConfig } from './FragmentProcessor';
import { GatekeeperService } from './GatekeeperService';
import { SpeakerIdentificationService } from './SpeakerIdentificationService';
import { VocalInterruptService } from './VocalInterruptService';
import { AIService } from './AIService';
import { TTSApiClient } from './TTSApiClient';

/**
 * Client-side service container that manages lazy initialization of all Universal Assistant services.
 * This prevents SSR issues by only creating services when explicitly requested in the browser.
 */
export class ClientServiceContainer {
  private static instance: ClientServiceContainer | null = null;
  
  // Service instances (lazily initialized)
  private _audioManager: AudioManager | null = null;
  private _conversationProcessor: ConversationProcessor | null = null;
  private _deepgramSTT: DeepgramSTT | null = null;
  private _fragmentProcessor: FragmentProcessor | null = null;
  private _gatekeeperService: GatekeeperService | null = null;
  private _speakerIdentificationService: SpeakerIdentificationService | null = null;
  private _vocalInterruptService: VocalInterruptService | null = null;
  private _aiService: AIService | null = null;
  private _ttsApiClient: TTSApiClient | null = null;
  
  // Service configurations
  private audioManagerConfig: Partial<AudioManagerConfig>;
  private conversationProcessorConfig: Partial<ConversationProcessorConfig>;
  private fragmentProcessorConfig: Partial<FragmentProcessorConfig>;
  
  // Minimal duplicate suppression cache per speaker
  private recentFinalsBySpeaker: Map<string, { text: string; timestamp: number } > = new Map();
  
  private constructor() {
    // Default configurations
    this.audioManagerConfig = {
      enableInputGating: true,
      enableConcurrentProcessing: false,
      chunkInterval: 100,
      audioQuality: {
        sampleRate: 16000,
        audioBitsPerSecond: 128000,
      },
    };
    
    this.conversationProcessorConfig = {
      enableSemanticAnalysis: true,
      enableEmotionDetection: true,
      maxBufferSize: 50,
    };
    
    this.fragmentProcessorConfig = {
      minFragmentLength: 10,
      maxFragmentAge: 30000,
      enableContextAnalysis: true,
    };
  }
  
  /**
   * Get the singleton instance of the ClientServiceContainer
   */
  public static getInstance(): ClientServiceContainer {
    if (!ClientServiceContainer.instance) {
      // Only create instance in browser environment
      if (typeof window === 'undefined') {
        throw new Error('ClientServiceContainer can only be instantiated in browser environment');
      }
      ClientServiceContainer.instance = new ClientServiceContainer();
    }
    return ClientServiceContainer.instance;
  }
  
  /**
   * Check if we're in a browser environment
   */
  private ensureBrowserEnvironment(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      throw new Error('Service requires browser environment');
    }
  }
  
  /**
   * Get or create AudioManager instance
   */
  public getAudioManager(): AudioManager {
    this.ensureBrowserEnvironment();
    
    if (!this._audioManager) {
      this._audioManager = this.createAudioManager(this.audioManagerConfig);
    }
    return this._audioManager;
  }
  
  /**
   * Get or create ConversationProcessor instance
   */
  public getConversationProcessor(): ConversationProcessor {
    this.ensureBrowserEnvironment();
    
    if (!this._conversationProcessor) {
      this._conversationProcessor = this.createConversationProcessor(this.conversationProcessorConfig);
    }
    return this._conversationProcessor;
  }
  
  /**
   * Get or create DeepgramSTT instance
   */
  public getDeepgramSTT(): DeepgramSTT {
    this.ensureBrowserEnvironment();
    
    if (!this._deepgramSTT) {
      // For now, hardcode the API key since env var isn't working properly
      // TODO: Fix Next.js env var loading
      const apiKey = '0566346fbc7519739111a82274f6e394c4781d95';
      
      if (!apiKey) {
        throw new Error(
          'NEXT_PUBLIC_DEEPGRAM_API_KEY is required for speech-to-text. ' +
          'Please add your Deepgram API key to your .env.local file: NEXT_PUBLIC_DEEPGRAM_API_KEY=your_key_here'
        );
      }
      this._deepgramSTT = this.createDeepgramSTT(apiKey);
    }
    return this._deepgramSTT;
  }
  
  /**
   * Get or create FragmentProcessor instance
   */
  public getFragmentProcessor(): FragmentProcessor {
    this.ensureBrowserEnvironment();
    
    if (!this._fragmentProcessor) {
      this._fragmentProcessor = this.createFragmentProcessor(this.fragmentProcessorConfig);
    }
    return this._fragmentProcessor;
  }
  
  /**
   * Get or create GatekeeperService instance
   */
  public getGatekeeperService(): GatekeeperService {
    this.ensureBrowserEnvironment();
    
    if (!this._gatekeeperService) {
      this._gatekeeperService = this.createGatekeeperService();
    }
    return this._gatekeeperService;
  }
  
  /**
   * Get or create SpeakerIdentificationService instance
   */
  public getSpeakerIdentificationService(): SpeakerIdentificationService {
    this.ensureBrowserEnvironment();
    
    if (!this._speakerIdentificationService) {
      this._speakerIdentificationService = this.createSpeakerIdentificationService();
    }
    return this._speakerIdentificationService;
  }
  
  /**
   * Get or create VocalInterruptService instance
   */
  public getVocalInterruptService(): VocalInterruptService {
    this.ensureBrowserEnvironment();
    
    if (!this._vocalInterruptService) {
      this._vocalInterruptService = this.createVocalInterruptService();
    }
    return this._vocalInterruptService;
  }
  
  /**
   * Get or create AIService instance
   */
  public getAIService(): AIService {
    this.ensureBrowserEnvironment();
    
    if (!this._aiService) {
      this._aiService = this.createAIService();
    }
    return this._aiService;
  }
  
  /**
   * Get or create TTSApiClient instance
   */
  public getTTSApiClient(): TTSApiClient {
    this.ensureBrowserEnvironment();
    
    if (!this._ttsApiClient) {
      this._ttsApiClient = this.createTTSApiClient();
    }
    return this._ttsApiClient;
  }
  
  /**
   * Initialize and connect all services for real-time transcription
   */
  public async initializeTranscriptionPipeline(options?: {
    onTranscriptEntry?: (entry: {
      id: string;
      text: string;
      speakerId: string;
      timestamp: Date;
      confidence: number;
      isFinal: boolean;
    }) => void;
  }): Promise<{
    audioManager: AudioManager;
    deepgramSTT: DeepgramSTT;
    fragmentProcessor: FragmentProcessor;
    conversationProcessor: ConversationProcessor;
  }> {
    this.ensureBrowserEnvironment();
    
    try {
      // Get all required services
      const audioManager = this.getAudioManager();
      const deepgramSTT = this.getDeepgramSTT();
      const fragmentProcessor = this.getFragmentProcessor();
      const conversationProcessor = this.getConversationProcessor();
      
      // Connect the pipeline: AudioManager → DeepgramSTT → FragmentProcessor → ConversationProcessor
      this.connectTranscriptionPipeline(audioManager, deepgramSTT, fragmentProcessor, conversationProcessor, options?.onTranscriptEntry);
      
      return {
        audioManager,
        deepgramSTT,
        fragmentProcessor,
        conversationProcessor,
      };
    } catch (error) {
      console.error('Failed to initialize transcription pipeline:', error);
      throw new Error(`Transcription pipeline initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Connect the transcription pipeline services
   */
  private connectTranscriptionPipeline(
    audioManager: AudioManager,
    deepgramSTT: DeepgramSTT,
    fragmentProcessor: FragmentProcessor,
    conversationProcessor: ConversationProcessor,
    onTranscriptEntry?: (entry: {
      id: string;
      text: string;
      speakerId: string;
      timestamp: Date;
      confidence: number;
      isFinal: boolean;
    }) => void
  ): void {
    // Connect DeepgramSTT transcription handler
    console.log('[ClientServiceContainer] Setting transcription handler for DeepgramSTT');
    deepgramSTT.setTranscriptionHandler((result) => {
      console.log('[ClientServiceContainer] Transcription handler called with result:', result);
      const timestamp = Date.now();
      
      // Process through FragmentProcessor
      console.log('[ClientServiceContainer] Sending transcript to FragmentProcessor:', result.transcript);
      const processResult = fragmentProcessor.processInput(
        result.transcript,
        result.speaker?.toString() || 'unknown',
        timestamp,
        {
          speakerChanged: false, // This would need speaker detection
          silenceDuration: 0,    // This would come from audio analysis
          previousUtterances: []  // This would be conversation history
        }
      );
      console.log('[ClientServiceContainer] FragmentProcessor result:', processResult);
      
      // If we have a complete thought or aggregated text, send to ConversationProcessor
      if (processResult.type === 'COMPLETE' || processResult.type === 'AGGREGATED') {
        if (processResult.text) {
          // Duplicate suppression: avoid emitting identical finals twice within a short window
          const speakerKey = result.speaker?.toString() || 'unknown';
          const recent = this.recentFinalsBySpeaker.get(speakerKey);
          const newText = processResult.text.trim();
          const now = timestamp;
          let shouldEmit = true;
          
          if (recent) {
            const withinWindow = Math.abs(now - recent.timestamp) <= 5000;
            const a = newText.toLowerCase();
            const b = recent.text.toLowerCase();
            const isSame = a === b;
            
            // Simple token overlap to guard against near-identical repeats
            const normalize = (s: string) => s.replace(/[^a-z0-9\s']/gi, ' ').toLowerCase().trim();
            const toSet = (s: string) => new Set(normalize(s).split(/\s+/).filter(Boolean));
            const setA = toSet(a);
            const setB = toSet(b);
            const intersectionSize = Array.from(setA).filter(w => setB.has(w)).length;
            const unionSize = new Set<string>([...Array.from(setA), ...Array.from(setB)]).size || 1;
            const jaccard = intersectionSize / unionSize;
            const isHighOverlap = jaccard >= 0.95;
            
            if (withinWindow && (isSame || isHighOverlap)) {
              console.log('[ClientServiceContainer] Suppressing duplicate final transcript for speaker', speakerKey, { newText, previous: recent.text });
              shouldEmit = false;
            }
          }
          
          // Update cache with the latest final
          this.recentFinalsBySpeaker.set(speakerKey, { text: newText, timestamp: now });
          
          if (!shouldEmit) {
            return;
          }

          const conversationEvent = {
            type: 'transcript' as const,
            data: {
              text: processResult.text,
              speakerId: result.speaker?.toString() || 'unknown',
              timestamp,
              confidence: processResult.confidence || result.confidence,
              silenceDuration: 0, // Would need to be calculated from audio
              previousSpeaker: null // Would need speaker tracking
            }
          };
          
          conversationProcessor.processConversationEvent(conversationEvent);
          
          // Add transcript entry if callback provided
          if (onTranscriptEntry) {
            onTranscriptEntry({
              id: `transcript_${Date.now()}`,
              text: processResult.text,
              speakerId: result.speaker?.toString() || 'unknown',
              timestamp: new Date(timestamp),
              confidence: processResult.confidence || result.confidence,
              isFinal: true,
            });
          }
        }
      }
    });
  }
  
  /**
   * Update service configurations
   */
  public updateConfigurations(configs: {
    audioManager?: Partial<AudioManagerConfig>;
    conversationProcessor?: Partial<ConversationProcessorConfig>;
    fragmentProcessor?: Partial<FragmentProcessorConfig>;
  }): void {
    if (configs.audioManager) {
      this.audioManagerConfig = { ...this.audioManagerConfig, ...configs.audioManager };
    }
    if (configs.conversationProcessor) {
      this.conversationProcessorConfig = { ...this.conversationProcessorConfig, ...configs.conversationProcessor };
    }
    if (configs.fragmentProcessor) {
      this.fragmentProcessorConfig = { ...this.fragmentProcessorConfig, ...configs.fragmentProcessor };
    }
  }
  
  /**
   * Clean up all services
   */
  public cleanup(): void {
    console.log('ClientServiceContainer: Starting cleanup...');
    
    if (this._audioManager) {
      this._audioManager.cleanup();
      this._audioManager = null;
    }
    if (this._deepgramSTT) {
      this._deepgramSTT.cleanup();
      this._deepgramSTT = null;
    }
    if (this._conversationProcessor) {
      this._conversationProcessor.cleanup?.();
      this._conversationProcessor = null;
    }
    if (this._fragmentProcessor) {
      this._fragmentProcessor.cleanup?.();
      this._fragmentProcessor = null;
    }
    
    // Reset other services
    this._gatekeeperService = null;
    this._speakerIdentificationService = null;
    this._vocalInterruptService = null;
    this._aiService = null;
    this._ttsApiClient = null;
    
    console.log('ClientServiceContainer: Cleanup completed');
  }
  
  /**
   * Reset the singleton instance (for testing)
   */
  public static reset(): void {
    if (ClientServiceContainer.instance) {
      ClientServiceContainer.instance.cleanup();
      ClientServiceContainer.instance = null;
    }
  }
  
  // Factory methods for creating service instances
  private createAudioManager(config: Partial<AudioManagerConfig>): AudioManager {
    return new AudioManager(config);
  }
  
  private createConversationProcessor(config: Partial<ConversationProcessorConfig>): ConversationProcessor {
    return new ConversationProcessor(config);
  }
  
  private createDeepgramSTT(apiKey: string): DeepgramSTT {
    return new DeepgramSTT(apiKey);
  }
  
  private createFragmentProcessor(config: Partial<FragmentProcessorConfig>): FragmentProcessor {
    return new FragmentProcessor(config);
  }
  
  private createGatekeeperService(): GatekeeperService {
    return new GatekeeperService();
  }
  
  private createSpeakerIdentificationService(): SpeakerIdentificationService {
    return new SpeakerIdentificationService();
  }
  
  private createVocalInterruptService(): VocalInterruptService {
    return new VocalInterruptService();
  }
  
  private createAIService(): AIService {
    return new AIService();
  }
  
  private createTTSApiClient(): TTSApiClient {
    return new TTSApiClient();
  }
}

/**
 * Convenience function to get the service container instance
 */
export function getServiceContainer(): ClientServiceContainer {
  return ClientServiceContainer.getInstance();
}

/**
 * Convenience function to initialize the transcription pipeline
 */
export async function initializeTranscription(options?: {
  onTranscriptEntry?: (entry: {
    id: string;
    text: string;
    speakerId: string;
    timestamp: Date;
    confidence: number;
    isFinal: boolean;
  }) => void;
}) {
  const container = getServiceContainer();
  return container.initializeTranscriptionPipeline(options);
}