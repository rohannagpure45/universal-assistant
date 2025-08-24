import { conversationProcessor } from './ConversationProcessor';
import { audioManager } from './AudioManager';
import { performanceMonitor } from '@/services/monitoring/PerformanceMonitor';
import { TTSApiClient } from './TTSApiClient';
import { DeepgramSTT } from './DeepgramSTT';
import { VoiceIdentificationCoordinator } from '../voice-identification/VoiceIdentificationCoordinator';
import type { TranscriptEntry, Meeting } from '@/types';
import { useMeetingStore, useAppStore } from '@/stores';

// Define store types based on the actual Zustand store instances
// useMeetingStore and useAppStore are Zustand stores, so we get the store API type
type MeetingStoreInstance = typeof useMeetingStore;
type AppStoreInstance = typeof useAppStore;

export interface CoordinatorSpeakerProfile {
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
  speakers: Map<string, CoordinatorSpeakerProfile>;
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
  private meetingStore: MeetingStoreInstance | null = null;
  private appStore: AppStoreInstance | null = null;
  private ttsClient: TTSApiClient;
  private authToken: string | null = null;
  private voiceIdentificationCoordinator: VoiceIdentificationCoordinator | null = null;
  private currentMeeting: Meeting | null = null;
  private state: CoordinatorState = {
    isRecording: false,
    isPlaying: false,
    transcript: '',
    speakers: new Map(),
    isProcessing: false,
  };

  constructor(
    config: UniversalAssistantConfig,
    meetingStore?: MeetingStoreInstance,
    appStore?: AppStoreInstance
  ) {
    this.config = config;
    this.meetingStore = meetingStore || null;
    this.appStore = appStore || null;
    this.ttsClient = new TTSApiClient();
    
    // Initialize concurrent processing if enabled
    if (config.enableConcurrentProcessing) {
      conversationProcessor.updateConfig({ enableConcurrentProcessing: true });
      audioManager.enableConcurrentProcessing();
    }

    // Set up audio manager callbacks
    audioManager.setTranscriptionCallback(this.handleTranscriptionResponse.bind(this));
    
    // Set up store synchronization if available
    this.setupStoreSynchronization();
    
    // Initialize authentication
    this.initializeAuth();
  }

  // Authentication initialization
  private async initializeAuth(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const { auth } = await import('@/lib/firebase/client');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            try {
              this.authToken = await user.getIdToken();
            } catch (error) {
              console.error('Failed to get auth token:', error);
              this.authToken = null;
            }
          } else {
            this.authToken = null;
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    }
  }

  // Store synchronization setup
  private setupStoreSynchronization(): void {
    if (this.meetingStore) {
      // Sync recording state changes to meeting store
      const originalSetState = this.setState.bind(this);
      this.setState = (newState: Partial<CoordinatorState>) => {
        // Update local state
        originalSetState(newState);
        
        // Sync to meeting store
        if (newState.isRecording !== undefined && this.meetingStore) {
          const { startRecording, stopRecording } = this.meetingStore.getState();
          if (newState.isRecording) {
            startRecording();
          } else {
            stopRecording();
          }
        }
        
        if (newState.currentSpeaker !== undefined && this.meetingStore) {
          const { setActiveSpeaker } = this.meetingStore.getState();
          setActiveSpeaker(newState.currentSpeaker);
        }
      };
    }
  }

  // Enhanced state management
  private setState(newState: Partial<CoordinatorState>): void {
    this.state = { ...this.state, ...newState };
    this.stateListeners.forEach(listener => listener(this.state));
    
    // Sync critical state to stores if available
    if (this.meetingStore) {
      const meetingActions = this.meetingStore.getState();
      if (newState.isRecording !== undefined) {
        if (newState.isRecording) {
          meetingActions.startRecording();
        } else {
          meetingActions.stopRecording();
        }
      }
      
      if (newState.currentSpeaker !== undefined) {
        meetingActions.setActiveSpeaker(newState.currentSpeaker);
      }
    }
  }

  public subscribe(listener: (state: CoordinatorState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public getState(): CoordinatorState {
    return { ...this.state };
  }

  // Store integration methods
  public setStores(
    meetingStore: MeetingStoreInstance,
    appStore: AppStoreInstance
  ): void {
    this.meetingStore = meetingStore;
    this.appStore = appStore;
    this.setupStoreSynchronization();
    
    // Update config from app store if available
    try {
      const appState = appStore.getState();
      if (appState.aiSettings && appState.ttsSettings) {
        this.updateConfig({
          model: appState.aiSettings.defaultModel,
          maxTokens: appState.aiSettings.maxTokens,
          voiceId: appState.ttsSettings.voiceId,
          ttsSpeed: appState.ttsSettings.speed,
        });
      }
    } catch (error) {
      console.error('Failed to sync config from app store:', error);
    }
  }

  public getMeetingStore(): MeetingStoreInstance | null {
    return this.meetingStore;
  }

  public getAppStore(): AppStoreInstance | null {
    return this.appStore;
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

  // Helper method to get Deepgram API key
  private async getDeepgramApiKey(): Promise<string> {
    try {
      const response = await fetch('/api/universal-assistant/deepgram-key');
      const { key } = await response.json();
      return key;
    } catch (error) {
      console.error('Failed to get Deepgram API key:', error);
      throw new Error('Unable to retrieve Deepgram API key');
    }
  }

  // Setup voice identification callbacks
  private setupVoiceIdentificationCallbacks(): void {
    if (!this.voiceIdentificationCoordinator) return;

    // Track speaker changes for voice capture
    let lastSpeaker: string | null = null;
    let speakerStartTime: number = Date.now();
    const audioChunkBuffer: Map<string, Blob[]> = new Map();

    // Register audio chunk callback for voice capture
    audioManager.addRecordingCallback(async (audioChunk: Blob) => {
      try {
        const currentSpeaker = this.state.currentSpeaker;
        
        if (currentSpeaker) {
          // Handle speaker change
          if (lastSpeaker !== currentSpeaker) {
            if (lastSpeaker) {
              console.log(`Speaker change detected: ${lastSpeaker} -> ${currentSpeaker}`);
              
              // Notify voice coordinator of speaker change
              if (this.voiceIdentificationCoordinator) {
                const voiceCapture = (this.voiceIdentificationCoordinator as any).voiceCapture;
                if (voiceCapture && voiceCapture.handleSpeakerChange) {
                  await voiceCapture.handleSpeakerChange({
                    previousSpeaker: this.extractDeepgramVoiceId([{ speaker: this.extractSpeakerNumber(lastSpeaker) }]),
                    newSpeaker: this.extractDeepgramVoiceId([{ speaker: this.extractSpeakerNumber(currentSpeaker) }]) || 'dg_voice_0',
                    timestamp: Date.now(),
                    transcript: ''
                  });
                }
              }
            }
            
            lastSpeaker = currentSpeaker;
            speakerStartTime = Date.now();
            audioChunkBuffer.set(currentSpeaker, []);
          }
          
          // Store audio chunk for current speaker
          if (!audioChunkBuffer.has(currentSpeaker)) {
            audioChunkBuffer.set(currentSpeaker, []);
          }
          audioChunkBuffer.get(currentSpeaker)!.push(audioChunk);
          
          // Process audio chunk through voice capture if available
          if (this.voiceIdentificationCoordinator) {
            const voiceCapture = (this.voiceIdentificationCoordinator as any).voiceCapture;
            if (voiceCapture && voiceCapture.handleTranscriptUpdate) {
              const deepgramVoiceId = this.extractDeepgramVoiceId([{ speaker: this.extractSpeakerNumber(currentSpeaker) }]);
              if (deepgramVoiceId) {
                const audioBuffer = await audioChunk.arrayBuffer();
                voiceCapture.handleTranscriptUpdate({
                  speaker: deepgramVoiceId,
                  audioChunk: audioBuffer,
                  transcript: '',
                  confidence: 0.8
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error in voice identification audio callback:', error);
      }
    });

    console.log('Voice identification callbacks configured');
  }

  // Helper to extract speaker number from speaker string
  private extractSpeakerNumber(speakerString: string): number {
    const match = speakerString.match(/Speaker (\d+)/);
    return match ? parseInt(match[1], 10) - 1 : 0; // Convert to 0-based index
  }

  // Recording Management
  public async startRecording(meeting?: Meeting): Promise<void> {
    try {
      // Initialize Deepgram if not already connected
      if (!this.deepgramConnection || this.deepgramConnection.readyState !== WebSocket.OPEN) {
        await this.initializeDeepgram();
      }

      // Initialize voice identification if meeting provided and enabled
      if (meeting && this.config.enableSpeakerIdentification) {
        this.currentMeeting = meeting;
        
        // Create a DeepgramSTT instance for voice identification
        const deepgramApiKey = await this.getDeepgramApiKey();
        const deepgramSTT = new DeepgramSTT(deepgramApiKey);
        
        // Initialize voice identification coordinator
        this.voiceIdentificationCoordinator = new VoiceIdentificationCoordinator(
          meeting,
          deepgramSTT
        );
        
        // Connect voice identification to transcript processing
        this.setupVoiceIdentificationCallbacks();
        
        console.log('Voice identification initialized for meeting:', meeting.meetingId);
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

  public async stopRecording(): Promise<void> {
    try {
      // Stop audio recording through AudioManager
      audioManager.stopRecording();

      // Close Deepgram connection
      if (this.deepgramConnection) {
        this.deepgramConnection.close();
        this.deepgramConnection = null;
      }

      // End voice identification if active
      if (this.voiceIdentificationCoordinator) {
        try {
          const stats = await this.voiceIdentificationCoordinator.endMeeting();
          console.log('Voice identification stats:', stats);
          
          // Clear recording callbacks to prevent memory leaks
          audioManager.clearRecordingCallbacks();
          
          console.log(`Meeting ended with ${stats.totalSpeakers} speakers: ${stats.identifiedCount} identified, ${stats.unidentifiedCount} unidentified`);
        } catch (voiceIdError) {
          console.error('Error ending voice identification:', voiceIdError);
        } finally {
          this.voiceIdentificationCoordinator = null;
        }
      }

      this.setState({ isRecording: false });
      this.currentMeeting = null;
      
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

      if (data.type === 'Results' && data.is_final) {
        const result = data.channel.alternatives[0];
        if (result?.transcript && result.transcript.trim()) {
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

      // Process voice identification if enabled
      if (this.config.enableSpeakerIdentification && this.voiceIdentificationCoordinator) {
        try {
          // Extract deepgram voice ID from words array (speaker number from diarization)
          const deepgramVoiceId = this.extractDeepgramVoiceId(words);
          
          if (deepgramVoiceId !== null) {
            // Process transcript through voice identification
            await this.voiceIdentificationCoordinator.processTranscript({
              speaker: deepgramVoiceId,
              text: transcript,
              confidence: result.confidence || 0.8,
              timestamp: Date.now()
            });
            
            console.log(`Processed transcript for voice identification: speaker=${deepgramVoiceId}, text="${transcript.substring(0, 50)}..."`);
          }
        } catch (voiceIdError) {
          console.error('Error processing voice identification:', voiceIdError);
          // Continue with normal processing even if voice identification fails
        }
      }

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

      // Process diarization for speaker identification (only if voice ID is enabled)
      if (words && this.config.enableSpeakerIdentification) {
        this.processDiarization(words);
      } else if (!this.config.enableSpeakerIdentification) {
        // Still process basic diarization for speaker labels without voice ID
        this.processDiarization(words || []);
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
      return 'Speaker 1';
    }

    // Get most common speaker in this chunk
    const speakerCounts = new Map<number, number>();
    words.forEach(word => {
      if (word.speaker !== undefined && word.speaker !== null) {
        speakerCounts.set(word.speaker, (speakerCounts.get(word.speaker) || 0) + 1);
      }
    });

    if (speakerCounts.size === 0) {
      return 'Speaker 1';
    }

    const dominantSpeaker = Array.from(speakerCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    // Return human-readable speaker name instead of speaker_0
    return `Speaker ${dominantSpeaker + 1}`;
  }

  // Extract Deepgram voice ID for voice identification
  private extractDeepgramVoiceId(words?: any[]): string | null {
    if (!words || words.length === 0) {
      return null;
    }

    // Get most common speaker in this chunk (same logic as extractSpeakerId)
    const speakerCounts = new Map<number, number>();
    words.forEach(word => {
      if (word.speaker !== undefined && word.speaker !== null) {
        speakerCounts.set(word.speaker, (speakerCounts.get(word.speaker) || 0) + 1);
      }
    });

    if (speakerCounts.size === 0) {
      return null;
    }

    const dominantSpeaker = Array.from(speakerCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];

    // Return Deepgram voice ID format (dg_voice_N)
    return `dg_voice_${dominantSpeaker}`;
  }

  private processDiarization(words: any[]): void {
    const speakerMap = new Map(this.state.speakers);

    words.forEach(word => {
      if (word.speaker !== undefined && word.speaker !== null) {
        const speakerId = `Speaker ${word.speaker + 1}`; // Human-readable speaker name
        const existing = speakerMap.get(speakerId);

        if (existing) {
          existing.utteranceCount++;
          existing.lastSeen = new Date();
          existing.confidence = Math.max(existing.confidence, word.confidence || 0);
        } else {
          speakerMap.set(speakerId, {
            id: speakerId,
            name: speakerId, // Set human-readable name
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

      if (!this.authToken) {
        console.error('No auth token available for AI response');
        this.setState({ isProcessing: false });
        return;
      }

      const response = await fetch('/api/universal-assistant/ai-response', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          text: prompt, // Use 'text' instead of 'prompt' to match API expectation
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          context: this.getConversationContext(),
          meetingId: this.meetingStore?.getState().currentMeeting?.meetingId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI response API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.response?.text || data.text;

      if (responseText) {
        await this.generateTTS(responseText);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      performanceMonitor.recordError('ai_response_generation', error);
      
      // Show error notification if app store available
      if (this.appStore) {
        const appActions = this.appStore.getState();
        appActions.addNotification({
          type: 'error',
          title: 'AI Response Error',
          message: 'Failed to generate AI response. Please try again.',
          persistent: false,
        });
      }
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  // TTS Integration
  private async generateTTS(text: string): Promise<void> {
    try {
      this.setState({ isPlaying: true });

      // Use the TTSApiClient instead of direct fetch
      const response = await this.ttsClient.generateSpeech(text, {
        voiceId: this.config.voiceId,
        options: {
          speed: this.config.ttsSpeed,
          useCache: true,
        }
      });

      if (response.success && response.audioUrl) {
        await this.playAudio(response.audioUrl);
      } else {
        throw new Error(response.error || 'TTS generation failed');
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      performanceMonitor.recordError('tts_generation', error);
      this.setState({ isPlaying: false });
      
      // Show error notification if app store available
      if (this.appStore) {
        const appActions = this.appStore.getState();
        appActions.addNotification({
          type: 'error',
          title: 'Speech Generation Error',
          message: 'Failed to generate speech. Please try again.',
          persistent: false,
        });
      }
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
  private async handleTranscriptionResponse(text: string, speakerId?: string): Promise<void> {
    // This is called by AudioManager when responses are processed
    console.log(`Response processed for ${speakerId}: ${text}`);
    
    // Add transcript entry to meeting store if available
    if (this.meetingStore && text.trim()) {
      const transcriptEntry: Omit<TranscriptEntry, 'id'> = {
        meetingId: this.meetingStore.getState().currentMeeting?.id || '',
        content: text.trim(),
        speaker: speakerId || 'unknown', // Speaker name/display text
        speakerId: speakerId || 'unknown', // Unique speaker identifier
        speakerName: speakerId || 'unknown',
        text: text.trim(),
        timestamp: new Date(),
        duration: 0,
        confidence: 0.8, // Default confidence
        language: 'en-US',
        isFragment: false,
        isComplete: true,
        isProcessed: false,
      };
      
      try {
        const meetingActions = this.meetingStore.getState();
        await meetingActions.addTranscriptEntry(transcriptEntry);
      } catch (error) {
        console.error('Failed to add transcript entry:', error);
        
        // Add to app store notifications if available
        if (this.appStore) {
          const appActions = this.appStore.getState();
          appActions.addNotification({
            type: 'error',
            title: 'Transcript Error',
            message: 'Failed to save transcript entry',
            persistent: false,
          });
        }
      }
    }
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

    // Handle speaker identification configuration changes
    if (newConfig.enableSpeakerIdentification !== undefined) {
      if (newConfig.enableSpeakerIdentification && !this.config.enableSpeakerIdentification) {
        console.log('Speaker identification enabled');
      } else if (!newConfig.enableSpeakerIdentification && this.config.enableSpeakerIdentification) {
        console.log('Speaker identification disabled');
        
        // Clean up voice identification if currently active
        if (this.voiceIdentificationCoordinator) {
          this.voiceIdentificationCoordinator.endMeeting().catch(error => {
            console.error('Error cleaning up voice identification:', error);
          });
          this.voiceIdentificationCoordinator = null;
        }
      }
    }
  }

  // Validate voice identification configuration
  public validateVoiceIdentificationConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if feature is enabled
    if (!this.config.enableSpeakerIdentification) {
      return { isValid: true, errors, warnings: ['Speaker identification is disabled'] };
    }

    // Check if we have a current meeting
    if (!this.currentMeeting) {
      warnings.push('No active meeting for voice identification');
    }

    // Check if voice identification coordinator is initialized
    if (!this.voiceIdentificationCoordinator) {
      warnings.push('Voice identification coordinator not initialized');
    }

    // Check if Deepgram connection is available
    if (!this.deepgramConnection || this.deepgramConnection.readyState !== WebSocket.OPEN) {
      errors.push('Deepgram connection not available for voice identification');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public getConfig(): UniversalAssistantConfig {
    return { ...this.config };
  }

  // Get voice identification status and statistics
  public getVoiceIdentificationStatus(): {
    enabled: boolean;
    active: boolean;
    speakers?: Array<{
      deepgramVoiceId: string;
      name: string;
      isIdentified: boolean;
      stats: any;
    }>;
    meetingId?: string;
  } {
    if (!this.config.enableSpeakerIdentification) {
      return { enabled: false, active: false };
    }

    if (!this.voiceIdentificationCoordinator) {
      return { 
        enabled: true, 
        active: false,
        meetingId: this.currentMeeting?.meetingId 
      };
    }

    const speakers = this.voiceIdentificationCoordinator.getAllSpeakers();
    
    return {
      enabled: true,
      active: true,
      speakers,
      meetingId: this.currentMeeting?.meetingId
    };
  }

  // Public method to trigger AI response (for manual triggers)
  public async triggerAIResponse(text?: string): Promise<void> {
    const prompt = text || this.state.transcript || 'Please provide a brief response to the current conversation.';
    await this.generateAIResponse(prompt);
  }

  // Cleanup
  public cleanup(): void {
    this.stopRecording();
    audioManager.stopAllAudio();
    this.ttsClient.cancelAllRequests();
    this.stateListeners.clear();
    this.deepgramConnection = null;
    this.authToken = null;
  }
}

// Factory function for easy setup
export function createUniversalAssistantCoordinator(
  config: UniversalAssistantConfig,
  meetingStore?: MeetingStoreInstance,
  appStore?: AppStoreInstance
): UniversalAssistantCoordinator {
  return new UniversalAssistantCoordinator(config, meetingStore, appStore);
}