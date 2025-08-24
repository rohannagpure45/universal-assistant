/**
 * Enhanced Audio Processor
 * 
 * Integration layer that connects the new audio chunk collection and processing
 * system with the existing AudioManager and UniversalAssistantCoordinator.
 * Provides a unified interface for voice identification audio processing.
 */

import { AudioSegmentExtractor, SegmentExtractionConfig, ExtractedSegment, SpeakerChangeEvent } from './AudioSegmentExtractor';
import { AudioManager, AudioManagerConfig } from '../universal-assistant/AudioManager';
import type { UniversalAssistantCoordinator } from '../universal-assistant/UniversalAssistantCoordinator';

export interface EnhancedAudioConfig {
  // Audio manager configuration
  audioManager: Partial<AudioManagerConfig>;
  
  // Segment extraction configuration
  segmentExtraction: Partial<SegmentExtractionConfig>;
  
  // Integration settings
  integration: {
    enableVoiceCapture: boolean;
    enableRealtimeProcessing: boolean;
    enableSpeakerTracking: boolean;
    autoUploadSegments: boolean;
    uploadQualityThreshold: number;
  };
  
  // Voice identification settings
  voiceIdentification: {
    minSampleDuration: number; // Minimum duration for voice samples (ms)
    maxSampleDuration: number; // Maximum duration for voice samples (ms)
    targetSamplesPerSpeaker: number; // Target number of samples per speaker
    qualityThreshold: number; // Minimum quality for voice identification
  };
  
  // Storage settings
  storage: {
    enableLocalCache: boolean;
    cacheSize: number; // Maximum cache size in bytes
    autoCleanup: boolean;
    cleanupInterval: number; // Cleanup interval in ms
  };
}

export interface ProcessingStats {
  totalChunksProcessed: number;
  totalSegmentsExtracted: number;
  totalSamplesUploaded: number;
  averageProcessingTime: number;
  memoryUsage: number;
  speakerStats: Map<string, {
    segmentCount: number;
    sampleCount: number;
    totalDuration: number;
    averageQuality: number;
    lastActivity: number;
  }>;
}

export class EnhancedAudioProcessor {
  private audioManager!: AudioManager;
  private segmentExtractor!: AudioSegmentExtractor;
  private coordinator: UniversalAssistantCoordinator | null = null;
  private config: EnhancedAudioConfig;
  
  // State tracking
  private isProcessing: boolean = false;
  private isRecording: boolean = false;
  private currentMeetingId: string | null = null;
  private speakerMapping: Map<string, string> = new Map(); // deepgram ID -> user ID
  
  // Statistics
  private stats: ProcessingStats = {
    totalChunksProcessed: 0,
    totalSegmentsExtracted: 0,
    totalSamplesUploaded: 0,
    averageProcessingTime: 0,
    memoryUsage: 0,
    speakerStats: new Map(),
  };
  
  // Callbacks
  private segmentCallbacks: Set<(segment: ExtractedSegment) => void> = new Set();
  private speakerCallbacks: Set<(event: SpeakerChangeEvent) => void> = new Set();
  private uploadCallbacks: Set<(speakerId: string, url: string) => void> = new Set();
  
  // Cache for local storage
  private localCache: Map<string, ExtractedSegment> = new Map();
  private cacheTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<EnhancedAudioConfig>) {
    this.config = {
      audioManager: {
        enableInputGating: true,
        enableConcurrentProcessing: false,
        chunkInterval: 100,
        audioQuality: {
          sampleRate: 16000,
          audioBitsPerSecond: 128000,
        },
        voiceActivityDetection: {
          enabled: true,
          threshold: 0.05,
          minSilenceDuration: 500,
          bufferSilentChunks: 5,
        },
      },
      segmentExtraction: {
        extractionSettings: {
          minSegmentDuration: 3000,
          maxSegmentDuration: 15000,
          qualityThreshold: 0.5,
          maxSegmentsPerSpeaker: 10,
          segmentOverlap: 500,
        },
        speakerChangeDetection: {
          enabled: true,
          confidenceThreshold: 0.7,
          transitionGracePeriod: 1000,
          forceSegmentOnChange: true,
        },
        realtimeProcessing: true,
        processingBatchSize: 5,
        maxMemoryUsage: 100 * 1024 * 1024,
      },
      integration: {
        enableVoiceCapture: true,
        enableRealtimeProcessing: true,
        enableSpeakerTracking: true,
        autoUploadSegments: true,
        uploadQualityThreshold: 0.6,
      },
      voiceIdentification: {
        minSampleDuration: 3000,
        maxSampleDuration: 15000,
        targetSamplesPerSpeaker: 5,
        qualityThreshold: 0.6,
      },
      storage: {
        enableLocalCache: true,
        cacheSize: 50 * 1024 * 1024, // 50MB
        autoCleanup: true,
        cleanupInterval: 300000, // 5 minutes
      },
      ...config,
    };

    this.initializeComponents();
    this.setupIntegration();
    
    if (this.config.storage.autoCleanup) {
      this.startCacheCleanup();
    }
  }

  /**
   * Initialize audio processing components
   */
  private initializeComponents(): void {
    // Initialize audio manager with enhanced configuration
    this.audioManager = new AudioManager(this.config.audioManager);
    
    // Initialize segment extractor
    this.segmentExtractor = new AudioSegmentExtractor(this.config.segmentExtraction);
  }

  /**
   * Setup integration between components
   */
  private setupIntegration(): void {
    // Register audio chunk callback from AudioManager
    this.audioManager.addRecordingCallback(this.handleAudioChunk.bind(this));
    
    // Register segment extraction callback
    this.segmentExtractor.onSegmentExtracted(this.handleExtractedSegment.bind(this));
    
    // Register speaker change callback
    this.segmentExtractor.onSpeakerChange(this.handleSpeakerChange.bind(this));
  }

  /**
   * Set the coordinator instance for deeper integration
   */
  public setCoordinator(coordinator: UniversalAssistantCoordinator): void {
    this.coordinator = coordinator;
    
    // Set up transcription callback if available
    this.audioManager.setTranscriptionCallback((text: string, speakerId?: string) => {
      if (speakerId && this.config.integration.enableSpeakerTracking) {
        this.updateSpeakerMapping(speakerId, text);
      }
    });
  }

  /**
   * Start audio processing for a meeting
   */
  public async startProcessing(meetingId: string): Promise<void> {
    if (this.isProcessing) {
      console.warn('Audio processing already active');
      return;
    }

    try {
      this.currentMeetingId = meetingId;
      this.isProcessing = true;
      
      // Start audio recording
      await this.audioManager.startRecording();
      this.isRecording = true;
      
      console.log(`Enhanced audio processing started for meeting: ${meetingId}`);
    } catch (error) {
      this.isProcessing = false;
      console.error('Failed to start enhanced audio processing:', error);
      throw error;
    }
  }

  /**
   * Stop audio processing
   */
  public async stopProcessing(): Promise<ExtractedSegment[]> {
    if (!this.isProcessing) {
      console.warn('Audio processing not active');
      return [];
    }

    try {
      // Stop audio recording
      if (this.isRecording) {
        this.audioManager.stopRecording();
        this.isRecording = false;
      }
      
      // Force extraction of remaining segments
      const finalSegments = await this.segmentExtractor.forceExtraction();
      
      // Upload any remaining high-quality segments
      if (this.config.integration.autoUploadSegments) {
        await this.uploadPendingSegments();
      }
      
      this.isProcessing = false;
      this.currentMeetingId = null;
      
      console.log(`Enhanced audio processing stopped. Final segments: ${finalSegments.length}`);
      return finalSegments;
    } catch (error) {
      console.error('Error stopping enhanced audio processing:', error);
      this.isProcessing = false;
      return [];
    }
  }

  /**
   * Handle incoming audio chunks from AudioManager
   */
  private async handleAudioChunk(audioBlob: Blob): Promise<void> {
    if (!this.isProcessing || !this.config.integration.enableVoiceCapture) {
      return;
    }

    try {
      const timestamp = Date.now();
      
      // Determine speaker ID (use current speaker from coordinator or default)
      let speakerId = 'unknown_speaker';
      if (this.coordinator) {
        const coordinatorState = this.coordinator.getState();
        speakerId = coordinatorState.currentSpeaker || 'unknown_speaker';
      }
      
      // Process chunk through segment extractor
      await this.segmentExtractor.processAudioChunk(audioBlob, speakerId, timestamp);
      
      this.stats.totalChunksProcessed++;
      this.updateProcessingStats();
    } catch (error) {
      console.error('Error handling audio chunk:', error);
    }
  }

  /**
   * Handle extracted segments
   */
  private async handleExtractedSegment(segment: ExtractedSegment): Promise<void> {
    try {
      this.stats.totalSegmentsExtracted++;
      
      // Update speaker statistics
      this.updateSpeakerStats(segment);
      
      // Cache segment locally if enabled
      if (this.config.storage.enableLocalCache) {
        this.cacheSegment(segment);
      }
      
      // Auto-upload high-quality segments
      if (this.shouldUploadSegment(segment)) {
        await this.uploadSegment(segment);
      }
      
      // Notify callbacks
      this.segmentCallbacks.forEach(callback => {
        try {
          callback(segment);
        } catch (error) {
          console.error('Error in segment callback:', error);
        }
      });
      
      console.log(`Extracted segment for ${segment.speakerId}: ${segment.duration}ms, quality: ${segment.quality.overall.toFixed(2)}`);
    } catch (error) {
      console.error('Error handling extracted segment:', error);
    }
  }

  /**
   * Handle speaker change events
   */
  private async handleSpeakerChange(event: SpeakerChangeEvent): Promise<void> {
    try {
      console.log(`Speaker changed: ${event.previousSpeaker} -> ${event.newSpeaker}`);
      
      // Update coordinator if available
      if (this.coordinator) {
        // The coordinator should already be handling this, but we can log for debugging
        const coordinatorState = this.coordinator.getState();
        if (coordinatorState.currentSpeaker !== event.newSpeaker) {
          console.log('Speaker change detected by audio processor differs from coordinator');
        }
      }
      
      // Notify callbacks
      this.speakerCallbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in speaker change callback:', error);
        }
      });
    } catch (error) {
      console.error('Error handling speaker change:', error);
    }
  }

  /**
   * Determine if segment should be uploaded
   */
  private shouldUploadSegment(segment: ExtractedSegment): boolean {
    if (!this.config.integration.autoUploadSegments || !this.currentMeetingId) {
      return false;
    }
    
    // Check quality threshold
    if (segment.quality.overall < this.config.integration.uploadQualityThreshold) {
      return false;
    }
    
    // Check duration requirements
    const minDuration = this.config.voiceIdentification.minSampleDuration;
    const maxDuration = this.config.voiceIdentification.maxSampleDuration;
    
    if (segment.duration < minDuration || segment.duration > maxDuration) {
      return false;
    }
    
    // Check if we need more samples for this speaker
    const speakerStats = this.stats.speakerStats.get(segment.speakerId);
    if (speakerStats && speakerStats.sampleCount >= this.config.voiceIdentification.targetSamplesPerSpeaker) {
      // Only upload if this segment has significantly better quality
      return segment.quality.overall > speakerStats.averageQuality + 0.1;
    }
    
    return true;
  }

  /**
   * Upload segment to Firebase Storage
   */
  private async uploadSegment(segment: ExtractedSegment): Promise<void> {
    if (!this.currentMeetingId) {
      console.error('No active meeting for segment upload');
      return;
    }

    try {
      // Dynamic import for client-side safety
      const { StorageService } = await import('@/services/firebase/StorageService');
      
      // Calculate duration in seconds
      const durationSeconds = Math.round(segment.duration / 1000);
      
      // Upload voice sample with enhanced metadata
      const uploadResult = await StorageService.uploadVoiceSample(
        segment.speakerId,
        this.currentMeetingId,
        segment.audioBlob,
        durationSeconds,
        {
          quality: segment.quality.overall,
          transcript: segment.metadata.transcript || '',
          speakerConfidence: segment.metadata.confidence || 0.8,
        }
      );
      
      if (uploadResult.success && uploadResult.url) {
        this.stats.totalSamplesUploaded++;
        
        // Update speaker stats
        const speakerStats = this.stats.speakerStats.get(segment.speakerId);
        if (speakerStats) {
          speakerStats.sampleCount++;
        }
        
        // Notify upload callbacks
        this.uploadCallbacks.forEach(callback => {
          try {
            callback(segment.speakerId, uploadResult.url!);
          } catch (error) {
            console.error('Error in upload callback:', error);
          }
        });
        
        console.log(`Uploaded voice sample for ${segment.speakerId}: ${uploadResult.url}`);
        
        // Handle voice identification workflow
        await this.handleVoiceIdentificationWorkflow(segment.speakerId, uploadResult.url!);
      } else {
        console.error(`Failed to upload segment: ${uploadResult.error}`);
      }
    } catch (error) {
      console.error('Error uploading segment:', error);
    }
  }

  /**
   * Handle voice identification workflow
   */
  private async handleVoiceIdentificationWorkflow(speakerId: string, audioUrl: string): Promise<void> {
    try {
      // Dynamic imports for client-side safety
      const [{ VoiceLibraryService }, { NeedsIdentificationService }] = await Promise.all([
        import('@/services/firebase/VoiceLibraryService'),
        import('@/services/firebase/NeedsIdentificationService')
      ]);
      
      // Check if speaker is already identified
      const existingIdentity = await VoiceLibraryService.getOrCreateVoiceEntry(speakerId);
      
      if (!existingIdentity.userId && this.currentMeetingId) {
        // Create identification request for unknown speaker
        await NeedsIdentificationService.createIdentificationRequest({
          meetingId: this.currentMeetingId,
          meetingTitle: 'Enhanced Audio Processing Session',
          meetingDate: new Date(),
          meetingTypeId: 'general',
          hostId: 'system',
          deepgramVoiceId: speakerId,
          voiceId: speakerId, // For backward compatibility
          speakerLabel: `Unknown Speaker`,
          sampleTranscripts: [],
          audioUrl,
        });
        
        console.log(`Created identification request for ${speakerId}`);
      } else if (existingIdentity.userId) {
        // Update speaking time for known speaker
        const duration = this.stats.speakerStats.get(speakerId)?.totalDuration || 0;
        await VoiceLibraryService.updateSpeakingTime(speakerId, duration / 1000);
        
        console.log(`Updated speaking time for ${existingIdentity.userName} (${speakerId})`);
      }
    } catch (error) {
      console.error('Error in voice identification workflow:', error);
    }
  }

  /**
   * Upload any pending high-quality segments
   */
  private async uploadPendingSegments(): Promise<void> {
    const allSegments = this.segmentExtractor.getAllSegmentsByQuality();
    
    for (const segment of allSegments) {
      if (this.shouldUploadSegment(segment)) {
        await this.uploadSegment(segment);
      }
    }
  }

  /**
   * Cache segment locally
   */
  private cacheSegment(segment: ExtractedSegment): void {
    // Check cache size limit
    const currentCacheSize = this.getCurrentCacheSize();
    if (currentCacheSize + segment.audioBuffer.byteLength > this.config.storage.cacheSize) {
      this.evictOldestCacheEntries();
    }
    
    this.localCache.set(segment.id, segment);
  }

  /**
   * Get current cache size
   */
  private getCurrentCacheSize(): number {
    let totalSize = 0;
    for (const segment of this.localCache.values()) {
      totalSize += segment.audioBuffer.byteLength;
    }
    return totalSize;
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldestCacheEntries(): void {
    const segments = Array.from(this.localCache.values());
    segments.sort((a, b) => a.startTime - b.startTime);
    
    // Remove oldest 25% of segments
    const removeCount = Math.ceil(segments.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      this.localCache.delete(segments[i].id);
    }
  }

  /**
   * Update speaker statistics
   */
  private updateSpeakerStats(segment: ExtractedSegment): void {
    if (!this.stats.speakerStats.has(segment.speakerId)) {
      this.stats.speakerStats.set(segment.speakerId, {
        segmentCount: 0,
        sampleCount: 0,
        totalDuration: 0,
        averageQuality: 0,
        lastActivity: Date.now(),
      });
    }
    
    const stats = this.stats.speakerStats.get(segment.speakerId)!;
    stats.segmentCount++;
    stats.totalDuration += segment.duration;
    stats.lastActivity = Date.now();
    
    // Update average quality
    stats.averageQuality = (stats.averageQuality * (stats.segmentCount - 1) + segment.quality.overall) / stats.segmentCount;
  }

  /**
   * Update processing statistics
   */
  private updateProcessingStats(): void {
    const extractorStats = this.segmentExtractor.getStats();
    this.stats.memoryUsage = extractorStats.memoryUsage.current;
    this.stats.averageProcessingTime = extractorStats.totalProcessingTime / Math.max(1, extractorStats.totalChunksProcessed);
  }

  /**
   * Update speaker mapping from transcription
   */
  private updateSpeakerMapping(deepgramSpeakerId: string, transcript: string): void {
    this.speakerMapping.set(deepgramSpeakerId, deepgramSpeakerId);
    // Here you could implement more sophisticated speaker mapping logic
    // based on voice characteristics, speaking patterns, etc.
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    if (this.cacheTimer) return;
    
    this.cacheTimer = setInterval(() => {
      this.cleanupCache();
    }, this.config.storage.cleanupInterval);
  }

  /**
   * Cleanup old cache entries
   */
  private cleanupCache(): void {
    const maxAge = 30 * 60 * 1000; // 30 minutes
    const currentTime = Date.now();
    
    for (const [id, segment] of this.localCache.entries()) {
      if (currentTime - segment.startTime > maxAge) {
        this.localCache.delete(id);
      }
    }
  }

  /**
   * Get best segments for a speaker
   */
  public getBestSegmentsForSpeaker(speakerId: string, count: number = 3): ExtractedSegment[] {
    return this.segmentExtractor.getBestSegments(speakerId, count);
  }

  /**
   * Get all segments for a speaker
   */
  public getSegmentsForSpeaker(speakerId: string): ExtractedSegment[] {
    return this.segmentExtractor.getSegmentsForSpeaker(speakerId);
  }

  /**
   * Get processing statistics
   */
  public getStats(): ProcessingStats {
    this.updateProcessingStats();
    return { ...this.stats };
  }

  /**
   * Register callbacks
   */
  public onSegmentExtracted(callback: (segment: ExtractedSegment) => void): () => void {
    this.segmentCallbacks.add(callback);
    return () => this.segmentCallbacks.delete(callback);
  }

  public onSpeakerChange(callback: (event: SpeakerChangeEvent) => void): () => void {
    this.speakerCallbacks.add(callback);
    return () => this.speakerCallbacks.delete(callback);
  }

  public onSegmentUploaded(callback: (speakerId: string, url: string) => void): () => void {
    this.uploadCallbacks.add(callback);
    return () => this.uploadCallbacks.delete(callback);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<EnhancedAudioConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (newConfig.audioManager) {
      this.audioManager.updateConfig(newConfig.audioManager);
    }
    
    if (newConfig.segmentExtraction) {
      this.segmentExtractor.updateConfig(newConfig.segmentExtraction);
    }
  }

  /**
   * Check if processing is active
   */
  public isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current meeting ID
   */
  public getCurrentMeetingId(): string | null {
    return this.currentMeetingId;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.isProcessing) {
      this.stopProcessing();
    }
    
    if (this.cacheTimer) {
      clearInterval(this.cacheTimer);
      this.cacheTimer = null;
    }
    
    this.segmentExtractor.dispose();
    this.audioManager.cleanup();
    
    this.localCache.clear();
    this.speakerMapping.clear();
    this.segmentCallbacks.clear();
    this.speakerCallbacks.clear();
    this.uploadCallbacks.clear();
  }
}

/**
 * Factory function to create EnhancedAudioProcessor instance
 */
export function createEnhancedAudioProcessor(config?: Partial<EnhancedAudioConfig>): EnhancedAudioProcessor {
  return new EnhancedAudioProcessor(config);
}