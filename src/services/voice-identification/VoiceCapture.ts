/**
 * Voice Capture Service
 * Enhanced voice capture using the new audio processing system for improved
 * speaker identification and voice sample quality.
 */

import { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';
import { EnhancedAudioProcessor, EnhancedAudioConfig } from '../audio-processing/EnhancedAudioProcessor';
import { ExtractedSegment, SpeakerChangeEvent as AudioSpeakerChangeEvent } from '../audio-processing/AudioSegmentExtractor';

interface VoiceSegment {
  deepgramVoiceId: string;
  audioBuffer: ArrayBuffer;
  startTime: number;
  endTime: number;
  duration: number;
  transcript: string;
  confidence: number;
  meetingId: string;
  quality?: {
    overall: number;
    snr: number;
    volume: number;
    clarity: number;
    voiceActivity: number;
  };
}

interface SpeakerChangeEvent {
  previousSpeaker?: string;
  newSpeaker: string;
  timestamp: number;
  transcript: string;
  confidence?: number;
}

export class VoiceCaptureService {
  private audioChunks: Map<string, ArrayBuffer[]> = new Map();
  private currentSpeaker: string | null = null;
  private speakerStartTime: number = 0;
  private minSegmentDuration = 3000; // 3 seconds minimum for good voice sample
  private maxSegmentDuration = 15000; // 15 seconds max to keep samples manageable
  private silenceThreshold = 1500; // 1.5 seconds of silence triggers segment save
  private lastAudioTime: number = 0;
  
  // Enhanced audio processing
  private enhancedProcessor: EnhancedAudioProcessor;
  private isEnhancedMode: boolean = true;
  private capturedSegments: Map<string, VoiceSegment[]> = new Map();
  
  constructor(
    private meetingId: string,
    private deepgramService: DeepgramSTT,
    enhancedConfig?: Partial<EnhancedAudioConfig>
  ) {
    // Initialize enhanced audio processor
    this.enhancedProcessor = new EnhancedAudioProcessor({
      integration: {
        enableVoiceCapture: true,
        enableRealtimeProcessing: true,
        enableSpeakerTracking: true,
        autoUploadSegments: true,
        uploadQualityThreshold: 0.6,
      },
      voiceIdentification: {
        minSampleDuration: this.minSegmentDuration,
        maxSampleDuration: this.maxSegmentDuration,
        targetSamplesPerSpeaker: 5,
        qualityThreshold: 0.6,
      },
      ...enhancedConfig,
    });
    
    this.setupEnhancedProcessing();
    this.setupDeepgramListeners();
  }

  /**
   * Setup enhanced audio processing callbacks
   */
  private setupEnhancedProcessing(): void {
    // Register for extracted segments
    this.enhancedProcessor.onSegmentExtracted((segment: ExtractedSegment) => {
      this.handleEnhancedSegment(segment);
    });
    
    // Register for speaker changes
    this.enhancedProcessor.onSpeakerChange((event: AudioSpeakerChangeEvent) => {
      this.handleEnhancedSpeakerChange(event);
    });
    
    // Register for successful uploads
    this.enhancedProcessor.onSegmentUploaded((speakerId: string, url: string) => {
      console.log(`Voice sample uploaded for ${speakerId}: ${url}`);
    });
  }

  /**
   * Setup listeners for Deepgram events
   */
  private setupDeepgramListeners(): void {
    // DeepgramSTT uses callback properties, not event emitters
    // We'll need to integrate with the transcript callbacks
    // For now, we'll comment this out as the integration needs to happen
    // at the UniversalAssistantCoordinator level where DeepgramSTT is used
    
    // TODO: Integrate voice capture with DeepgramSTT callbacks in UniversalAssistantCoordinator
    // The coordinator should call our methods when transcripts arrive with speaker info
  }

  /**
   * Handle enhanced audio segments
   */
  private handleEnhancedSegment(segment: ExtractedSegment): void {
    try {
      // Convert to legacy VoiceSegment format for compatibility
      const voiceSegment: VoiceSegment = {
        deepgramVoiceId: segment.speakerId,
        audioBuffer: segment.audioBuffer,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: segment.duration,
        transcript: segment.metadata.transcript || '',
        confidence: segment.metadata.confidence || 0.8,
        meetingId: this.meetingId,
        quality: segment.quality,
      };
      
      // Store segment
      if (!this.capturedSegments.has(segment.speakerId)) {
        this.capturedSegments.set(segment.speakerId, []);
      }
      this.capturedSegments.get(segment.speakerId)!.push(voiceSegment);
      
      console.log(`Enhanced voice segment captured for ${segment.speakerId}: ${segment.duration}ms, quality: ${segment.quality.overall.toFixed(2)}`);
    } catch (error) {
      console.error('Error handling enhanced segment:', error);
    }
  }

  /**
   * Handle enhanced speaker change events
   */
  private handleEnhancedSpeakerChange(event: AudioSpeakerChangeEvent): void {
    const speakerChangeEvent: SpeakerChangeEvent = {
      previousSpeaker: event.previousSpeaker,
      newSpeaker: event.newSpeaker,
      timestamp: event.timestamp,
      transcript: event.transcript || '',
      confidence: event.confidence,
    };
    
    // Update current speaker tracking
    this.currentSpeaker = event.newSpeaker;
    this.speakerStartTime = event.timestamp;
    
    console.log(`Enhanced speaker change: ${event.previousSpeaker} -> ${event.newSpeaker}`);
  }

  /**
   * Handle speaker change events from Deepgram
   * This should be called by the coordinator when processing transcripts
   */
  public async handleSpeakerChange(event: SpeakerChangeEvent): Promise<void> {
    console.log(`Speaker changed from ${event.previousSpeaker} to ${event.newSpeaker}`);
    
    // Save the previous speaker's segment if it meets criteria
    if (event.previousSpeaker && this.currentSpeaker) {
      await this.saveVoiceSegment(this.currentSpeaker);
    }
    
    // Start tracking new speaker
    this.currentSpeaker = event.newSpeaker;
    this.speakerStartTime = event.timestamp;
    this.audioChunks.set(event.newSpeaker, []);
  }

  /**
   * Handle utterance end - natural pause in speech
   * This should be called by the coordinator when detecting pauses
   */
  public async handleUtteranceEnd(data: {
    speaker: string;
    duration: number;
    transcript: string;
  }): Promise<void> {
    const now = Date.now();
    const silenceDuration = now - this.lastAudioTime;
    
    // If silence is long enough and we have a good sample, save it
    if (silenceDuration > this.silenceThreshold && 
        data.duration > this.minSegmentDuration) {
      await this.saveVoiceSegment(data.speaker);
    }
  }

  /**
   * Handle transcript updates with audio chunks
   * This should be called by the coordinator when receiving transcripts
   */
  public handleTranscriptUpdate(data: {
    speaker: string;
    audioChunk: ArrayBuffer;
    transcript: string;
    confidence: number;
  }): void {
    this.lastAudioTime = Date.now();
    
    // Store audio chunks by speaker
    if (!this.audioChunks.has(data.speaker)) {
      this.audioChunks.set(data.speaker, []);
    }
    
    this.audioChunks.get(data.speaker)!.push(data.audioChunk);
    
    // Check if we should save based on duration
    const duration = Date.now() - this.speakerStartTime;
    if (duration > this.maxSegmentDuration) {
      this.saveVoiceSegment(data.speaker);
    }
  }

  /**
   * Save a voice segment to Firebase Storage and create identification record
   */
  private async saveVoiceSegment(deepgramVoiceId: string): Promise<void> {
    const chunks = this.audioChunks.get(deepgramVoiceId);
    if (!chunks || chunks.length === 0) return;
    
    const duration = (Date.now() - this.speakerStartTime) / 1000; // in seconds
    
    // Skip if too short
    if (duration < this.minSegmentDuration / 1000) {
      console.log(`Segment too short (${duration}s), skipping`);
      return;
    }
    
    try {
      // Combine audio chunks into single buffer
      const audioBuffer = this.combineAudioChunks(chunks);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
      
      // Dynamic imports for client-side safety
      const [{ ClientStorageService }, { VoiceLibraryService }, { NeedsIdentificationService }] = await Promise.all([
        import('@/services/firebase/ClientStorageService'),
        import('@/services/firebase/VoiceLibraryService'),
        import('@/services/firebase/NeedsIdentificationService')
      ]);
      
      // Upload to Firebase Storage with enhanced metadata
      const uploadResult = await ClientStorageService.uploadVoiceSample(
        deepgramVoiceId,
        this.meetingId,
        audioBlob,
        Math.round(duration),
        {
          quality: 0.7, // Default quality score, could be calculated from audio analysis
          transcript: '', // Could be filled if transcription is available
          speakerConfidence: 0.8 // Default confidence, could be from voice recognition
        }
      );
      
      if (!uploadResult.success) {
        throw new Error(`Failed to upload voice sample: ${uploadResult.error}`);
      }
      
      const storageUrl = uploadResult.url!;
      console.log(`Saved ${duration}s voice sample for ${deepgramVoiceId} at ${uploadResult.filePath}`);
      
      // Check if this voice is already identified
      const existingIdentity = await VoiceLibraryService.getOrCreateVoiceEntry(deepgramVoiceId);
      
      if (!existingIdentity.userId) {
        // Create a "needs identification" record
        // Get meeting details for the request
        const meeting = { title: 'Meeting', typeId: 'general', hostId: 'host' }; // Default values
        
        await NeedsIdentificationService.createIdentificationRequest({
          meetingId: this.meetingId,
          meetingTitle: meeting.title,
          meetingDate: new Date(),
          meetingTypeId: meeting.typeId,
          hostId: meeting.hostId,
          deepgramVoiceId: deepgramVoiceId,
          voiceId: deepgramVoiceId, // For backward compatibility
          speakerLabel: `Unknown Speaker`,
          sampleTranscripts: [],
          audioUrl: storageUrl
        });
        
        console.log(`Created identification request for unknown speaker ${deepgramVoiceId}`);
      } else {
        // Update speaking time for known speaker
        await VoiceLibraryService.updateSpeakingTime(deepgramVoiceId, duration);
        console.log(`Updated speaking time for ${existingIdentity.userName} (${deepgramVoiceId})`);
      }
      
      // Clear the chunks for this speaker
      this.audioChunks.set(deepgramVoiceId, []);
      
    } catch (error) {
      console.error('Failed to save voice segment:', error);
    }
  }

  /**
   * Combine multiple audio chunks into a single buffer
   */
  private combineAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return combined.buffer;
  }

  /**
   * Get the best quality samples for identification
   */
  async getBestSamplesForIdentification(deepgramVoiceId: string): Promise<string[]> {
    // For now, return empty array as we need to implement proper storage querying
    // TODO: Implement proper Firebase Storage listing and filtering
    console.log(`Getting best samples for ${deepgramVoiceId}`);
    
    // In a real implementation, we would:
    // 1. List all files in the voice-samples/{deepgramVoiceId}/ directory
    // 2. Sort by metadata (duration, quality, timestamp)
    // 3. Return the best samples
    
    return [];
  }

  /**
   * Start enhanced voice capture processing
   */
  async startEnhancedCapture(): Promise<void> {
    if (this.isEnhancedMode) {
      try {
        await this.enhancedProcessor.startProcessing(this.meetingId);
        console.log('Enhanced voice capture started');
      } catch (error) {
        console.error('Failed to start enhanced voice capture:', error);
        // Fallback to legacy mode
        this.isEnhancedMode = false;
      }
    }
  }

  /**
   * Stop enhanced voice capture processing
   */
  async stopEnhancedCapture(): Promise<VoiceSegment[]> {
    if (this.isEnhancedMode && this.enhancedProcessor.isActive()) {
      try {
        const finalSegments = await this.enhancedProcessor.stopProcessing();
        console.log(`Enhanced voice capture stopped. Final segments: ${finalSegments.length}`);
        
        // Convert to legacy format for compatibility
        return finalSegments.map(segment => ({
          deepgramVoiceId: segment.speakerId,
          audioBuffer: segment.audioBuffer,
          startTime: segment.startTime,
          endTime: segment.endTime,
          duration: segment.duration,
          transcript: segment.metadata.transcript || '',
          confidence: segment.metadata.confidence || 0.8,
          meetingId: this.meetingId,
          quality: segment.quality,
        }));
      } catch (error) {
        console.error('Error stopping enhanced voice capture:', error);
        return [];
      }
    }
    return [];
  }

  /**
   * Set coordinator for enhanced integration
   */
  setCoordinator(coordinator: any): void {
    if (this.isEnhancedMode) {
      this.enhancedProcessor.setCoordinator(coordinator);
    }
  }

  /**
   * Get captured segments using enhanced processing
   */
  getEnhancedSegments(speakerId?: string): VoiceSegment[] {
    if (speakerId) {
      return this.capturedSegments.get(speakerId) || [];
    }
    
    const allSegments: VoiceSegment[] = [];
    for (const segments of this.capturedSegments.values()) {
      allSegments.push(...segments);
    }
    
    // Sort by quality if available
    return allSegments.sort((a, b) => {
      const qualityA = a.quality?.overall || 0;
      const qualityB = b.quality?.overall || 0;
      return qualityB - qualityA;
    });
  }

  /**
   * Get best quality segments for a speaker
   */
  getBestSegments(speakerId: string, count: number = 3): VoiceSegment[] {
    if (this.isEnhancedMode) {
      const enhancedSegments = this.enhancedProcessor.getBestSegmentsForSpeaker(speakerId, count);
      return enhancedSegments.map(segment => ({
        deepgramVoiceId: segment.speakerId,
        audioBuffer: segment.audioBuffer,
        startTime: segment.startTime,
        endTime: segment.endTime,
        duration: segment.duration,
        transcript: segment.metadata.transcript || '',
        confidence: segment.metadata.confidence || 0.8,
        meetingId: this.meetingId,
        quality: segment.quality,
      }));
    }
    
    // Fallback to captured segments
    const segments = this.capturedSegments.get(speakerId) || [];
    return segments
      .sort((a, b) => (b.quality?.overall || 0) - (a.quality?.overall || 0))
      .slice(0, count);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    if (this.isEnhancedMode) {
      return this.enhancedProcessor.getStats();
    }
    
    return {
      totalChunksProcessed: 0,
      totalSegmentsExtracted: this.capturedSegments.size,
      totalSamplesUploaded: 0,
      averageProcessingTime: 0,
      memoryUsage: 0,
      speakerStats: new Map(),
    };
  }

  /**
   * Check if enhanced mode is active
   */
  isEnhancedModeActive(): boolean {
    return this.isEnhancedMode && this.enhancedProcessor.isActive();
  }

  /**
   * Enable or disable enhanced mode
   */
  setEnhancedMode(enabled: boolean): void {
    if (enabled && !this.isEnhancedMode) {
      this.isEnhancedMode = true;
      console.log('Enhanced voice capture mode enabled');
    } else if (!enabled && this.isEnhancedMode) {
      if (this.enhancedProcessor.isActive()) {
        this.enhancedProcessor.stopProcessing();
      }
      this.isEnhancedMode = false;
      console.log('Enhanced voice capture mode disabled');
    }
  }

  /**
   * Update enhanced processing configuration
   */
  updateEnhancedConfig(config: Partial<EnhancedAudioConfig>): void {
    if (this.isEnhancedMode) {
      this.enhancedProcessor.updateConfig(config);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Stop enhanced processing
    if (this.isEnhancedMode) {
      this.enhancedProcessor.dispose();
    }
    
    // Save any remaining segments (legacy mode)
    for (const [speaker] of this.audioChunks) {
      this.saveVoiceSegment(speaker);
    }
    
    this.audioChunks.clear();
    this.capturedSegments.clear();
  }
}