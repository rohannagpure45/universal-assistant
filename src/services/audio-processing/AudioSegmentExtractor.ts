/**
 * Audio Segment Extractor
 * 
 * Coordinates audio chunk buffering, VAD, and format conversion to extract
 * high-quality voice segments for speaker identification. Integrates all
 * audio processing components into a unified workflow.
 */

import { AudioChunkBuffer, AudioSegment, AudioChunk, AudioChunkBufferConfig } from './AudioChunkBuffer';
import { VoiceActivityDetection, VADConfig, VADSegment } from './VoiceActivityDetection';
import { AudioFormatConverter, ConversionOptions, ConversionResult, AudioFormat } from './AudioFormatConverter';

export interface SegmentExtractionConfig {
  // Component configurations
  bufferConfig: Partial<AudioChunkBufferConfig>;
  vadConfig: Partial<VADConfig>;
  
  // Extraction parameters
  extractionSettings: {
    minSegmentDuration: number; // Minimum segment duration (ms)
    maxSegmentDuration: number; // Maximum segment duration (ms)
    qualityThreshold: number; // Minimum quality score (0-1)
    maxSegmentsPerSpeaker: number; // Maximum segments to keep per speaker
    segmentOverlap: number; // Overlap between segments (ms)
  };
  
  // Speaker change detection
  speakerChangeDetection: {
    enabled: boolean;
    confidenceThreshold: number; // Minimum confidence for speaker change
    transitionGracePeriod: number; // Grace period for speaker transitions (ms)
    forceSegmentOnChange: boolean; // Force segment creation on speaker change
  };
  
  // Output format
  outputFormat: AudioFormat;
  conversionOptions: Partial<ConversionOptions>;
  
  // Performance settings
  realtimeProcessing: boolean;
  processingBatchSize: number; // Number of chunks to process in batch
  maxMemoryUsage: number; // Maximum memory usage in bytes
}

export interface ExtractedSegment {
  id: string;
  speakerId: string;
  startTime: number;
  endTime: number;
  duration: number;
  audioBlob: Blob;
  audioBuffer: ArrayBuffer;
  quality: {
    overall: number;
    snr: number;
    volume: number;
    clarity: number;
    voiceActivity: number;
  };
  vadSegments: VADSegment[];
  metadata: {
    originalFormat: string;
    convertedFormat: AudioFormat;
    compressionRatio: number;
    processingTime: number;
    chunkCount: number;
    transcript?: string;
    confidence?: number;
  };
}

export interface SpeakerChangeEvent {
  previousSpeaker?: string;
  newSpeaker: string;
  timestamp: number;
  confidence: number;
  transcript?: string;
}

export interface ExtractionStats {
  totalChunksProcessed: number;
  totalSegmentsExtracted: number;
  totalProcessingTime: number;
  averageQuality: number;
  speakerStats: Map<string, {
    segmentCount: number;
    totalDuration: number;
    averageQuality: number;
    lastActivity: number;
  }>;
  vadStats: {
    voiceRatio: number;
    averageConfidence: number;
    totalSegments: number;
  };
  memoryUsage: {
    current: number;
    peak: number;
    bufferedChunks: number;
  };
}

export class AudioSegmentExtractor {
  private chunkBuffer!: AudioChunkBuffer;
  private vad!: VoiceActivityDetection;
  private formatConverter!: AudioFormatConverter;
  private config: SegmentExtractionConfig;
  
  // State tracking
  private extractedSegments: Map<string, ExtractedSegment[]> = new Map();
  private currentSpeaker: string | null = null;
  private lastSpeakerChange: number = 0;
  private processingQueue: Array<{ chunk: Blob; speakerId: string; timestamp: number }> = [];
  private processingTimer: NodeJS.Timeout | null = null;
  
  // Statistics
  private stats: ExtractionStats = {
    totalChunksProcessed: 0,
    totalSegmentsExtracted: 0,
    totalProcessingTime: 0,
    averageQuality: 0,
    speakerStats: new Map(),
    vadStats: {
      voiceRatio: 0,
      averageConfidence: 0,
      totalSegments: 0,
    },
    memoryUsage: {
      current: 0,
      peak: 0,
      bufferedChunks: 0,
    },
  };
  
  // Callbacks
  private segmentCallbacks: Set<(segment: ExtractedSegment) => void> = new Set();
  private speakerChangeCallbacks: Set<(event: SpeakerChangeEvent) => void> = new Set();

  constructor(config?: Partial<SegmentExtractionConfig>) {
    this.config = {
      bufferConfig: {},
      vadConfig: {},
      extractionSettings: {
        minSegmentDuration: 3000, // 3 seconds
        maxSegmentDuration: 15000, // 15 seconds
        qualityThreshold: 0.5,
        maxSegmentsPerSpeaker: 10,
        segmentOverlap: 500, // 500ms overlap
      },
      speakerChangeDetection: {
        enabled: true,
        confidenceThreshold: 0.7,
        transitionGracePeriod: 1000, // 1 second
        forceSegmentOnChange: true,
      },
      outputFormat: {
        mimeType: 'audio/webm;codecs=opus',
        codec: 'opus',
        sampleRate: 16000,
        channels: 1,
        bitRate: 64000,
      },
      conversionOptions: {
        quality: 'medium',
        normalize: true,
        removeNoise: true,
        trimSilence: false,
      },
      realtimeProcessing: true,
      processingBatchSize: 5,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      ...config,
    };

    this.initializeComponents();
    this.setupCallbacks();
    
    if (this.config.realtimeProcessing) {
      this.startRealtimeProcessing();
    }
  }

  /**
   * Initialize audio processing components
   */
  private initializeComponents(): void {
    // Initialize chunk buffer with enhanced config
    const bufferConfig = {
      ...this.config.bufferConfig,
      maxBufferSizeBytes: this.config.maxMemoryUsage * 0.6, // 60% for buffering
      segmentConfig: {
        minDuration: this.config.extractionSettings.minSegmentDuration,
        maxDuration: this.config.extractionSettings.maxSegmentDuration,
        silenceThreshold: this.config.bufferConfig.segmentConfig?.silenceThreshold || 0.01,
        silenceDuration: this.config.bufferConfig.segmentConfig?.silenceDuration || 1000,
      },
    };
    this.chunkBuffer = new AudioChunkBuffer(bufferConfig as any);

    // Initialize VAD
    this.vad = new VoiceActivityDetection(this.config.vadConfig);

    // Initialize format converter
    this.formatConverter = new AudioFormatConverter();
  }

  /**
   * Setup callbacks between components
   */
  private setupCallbacks(): void {
    // Chunk buffer segment callback
    this.chunkBuffer.onSegmentCreated((segment) => {
      this.handleBufferSegment(segment);
    });

    // VAD segment callback
    this.vad.onSegment((vadSegment) => {
      this.handleVADSegment(vadSegment);
    });
  }

  /**
   * Process incoming audio chunk
   */
  public async processAudioChunk(
    audioBlob: Blob,
    speakerId: string,
    timestamp?: number
  ): Promise<void> {
    const chunkTimestamp = timestamp || Date.now();
    
    try {
      // Check for speaker change
      if (this.config.speakerChangeDetection.enabled) {
        await this.handleSpeakerChange(speakerId, chunkTimestamp);
      }

      // Add to processing queue for batch processing
      if (this.config.realtimeProcessing) {
        this.processingQueue.push({
          chunk: audioBlob,
          speakerId,
          timestamp: chunkTimestamp,
        });
      } else {
        // Process immediately
        await this.processChunkInternal(audioBlob, speakerId, chunkTimestamp);
      }

      this.stats.totalChunksProcessed++;
      this.updateMemoryStats();
    } catch (error) {
      console.error('Failed to process audio chunk:', error);
    }
  }

  /**
   * Internal chunk processing
   */
  private async processChunkInternal(
    audioBlob: Blob,
    speakerId: string,
    timestamp: number
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Process with VAD first
      const arrayBuffer = await audioBlob.arrayBuffer();
      const vadFrames = await this.vad.processAudioChunk(arrayBuffer, timestamp, speakerId);
      
      // Add to chunk buffer if VAD indicates voice activity
      const hasVoiceActivity = vadFrames.some(frame => frame.isVoice);
      if (hasVoiceActivity) {
        const audioChunk = await this.chunkBuffer.addChunk(audioBlob, speakerId, timestamp);
        
        if (audioChunk) {
          // Update speaker statistics
          this.updateSpeakerStats(speakerId, audioChunk.quality.duration);
        }
      }
      
      const processingTime = Date.now() - startTime;
      this.stats.totalProcessingTime += processingTime;
    } catch (error) {
      console.error('Error in internal chunk processing:', error);
    }
  }

  /**
   * Handle speaker change detection
   */
  private async handleSpeakerChange(speakerId: string, timestamp: number): Promise<void> {
    if (this.currentSpeaker && this.currentSpeaker !== speakerId) {
      const timeSinceLastChange = timestamp - this.lastSpeakerChange;
      
      // Only process if outside grace period
      if (timeSinceLastChange >= this.config.speakerChangeDetection.transitionGracePeriod) {
        const speakerChangeEvent: SpeakerChangeEvent = {
          previousSpeaker: this.currentSpeaker,
          newSpeaker: speakerId,
          timestamp,
          confidence: 0.8, // Default confidence, could be enhanced
        };
        
        // Force segment creation for previous speaker if enabled
        if (this.config.speakerChangeDetection.forceSegmentOnChange) {
          await this.chunkBuffer.forceSegmentCreation(this.currentSpeaker);
          this.vad.forceEndCurrentSegment();
        }
        
        // Notify callbacks
        this.speakerChangeCallbacks.forEach(callback => {
          try {
            callback(speakerChangeEvent);
          } catch (error) {
            console.error('Error in speaker change callback:', error);
          }
        });
        
        this.lastSpeakerChange = timestamp;
      }
    }
    
    this.currentSpeaker = speakerId;
  }

  /**
   * Handle segments from chunk buffer
   */
  private async handleBufferSegment(segment: AudioSegment): Promise<void> {
    try {
      // Check if segment meets quality threshold
      if (segment.averageQuality.overallQuality < this.config.extractionSettings.qualityThreshold) {
        console.log(`Segment rejected for low quality: ${segment.averageQuality.overallQuality}`);
        return;
      }

      // Convert segment to blob
      const audioBlob = await this.chunkBuffer.convertSegmentToBlob(segment);
      if (!audioBlob) {
        console.error('Failed to convert segment to blob');
        return;
      }

      // Convert to target format
      const conversionOptions: ConversionOptions = {
        targetFormat: this.config.outputFormat,
        quality: (this.config.conversionOptions?.quality as any) || 'high',
        normalize: this.config.conversionOptions?.normalize ?? true,
        removeNoise: this.config.conversionOptions?.removeNoise ?? false,
        trimSilence: this.config.conversionOptions?.trimSilence ?? true,
        fadeIn: this.config.conversionOptions?.fadeIn,
        fadeOut: this.config.conversionOptions?.fadeOut,
      };
      const conversionResult = await this.formatConverter.convertAudio(
        audioBlob,
        conversionOptions
      );

      if (!conversionResult.success || !conversionResult.blob || !conversionResult.audioData) {
        console.error('Audio conversion failed:', conversionResult.error);
        return;
      }

      // Create extracted segment
      const extractedSegment = await this.createExtractedSegment(
        segment,
        conversionResult,
        []
      );

      // Store and manage segments
      this.storeExtractedSegment(extractedSegment);
      
      // Notify callbacks
      this.segmentCallbacks.forEach(callback => {
        try {
          callback(extractedSegment);
        } catch (error) {
          console.error('Error in segment callback:', error);
        }
      });

      this.stats.totalSegmentsExtracted++;
    } catch (error) {
      console.error('Failed to handle buffer segment:', error);
    }
  }

  /**
   * Handle segments from VAD
   */
  private async handleVADSegment(vadSegment: VADSegment): Promise<void> {
    // VAD segments are primarily used for timing information
    // The actual audio processing is handled by the chunk buffer
    this.stats.vadStats.totalSegments++;
    
    if (vadSegment.speakerId) {
      this.stats.vadStats.averageConfidence = 
        (this.stats.vadStats.averageConfidence + vadSegment.confidence) / 2;
    }
  }

  /**
   * Create extracted segment from processed data
   */
  private async createExtractedSegment(
    audioSegment: AudioSegment,
    conversionResult: ConversionResult,
    vadSegments: VADSegment[]
  ): Promise<ExtractedSegment> {
    const segmentId = `${audioSegment.speakerId}_${audioSegment.startTime}_${Date.now()}`;
    
    return {
      id: segmentId,
      speakerId: audioSegment.speakerId,
      startTime: audioSegment.startTime,
      endTime: audioSegment.endTime,
      duration: audioSegment.duration,
      audioBlob: conversionResult.blob!,
      audioBuffer: conversionResult.audioData!,
      quality: {
        overall: audioSegment.averageQuality.overallQuality,
        snr: audioSegment.averageQuality.snr,
        volume: audioSegment.averageQuality.volume,
        clarity: audioSegment.averageQuality.clarity,
        voiceActivity: audioSegment.averageQuality.voiceActivity,
      },
      vadSegments,
      metadata: {
        originalFormat: 'audio/webm', // From input
        convertedFormat: conversionResult.format,
        compressionRatio: conversionResult.compressionRatio,
        processingTime: conversionResult.processingTime,
        chunkCount: audioSegment.chunks.length,
      },
    };
  }

  /**
   * Store extracted segment with memory management
   */
  private storeExtractedSegment(segment: ExtractedSegment): void {
    if (!this.extractedSegments.has(segment.speakerId)) {
      this.extractedSegments.set(segment.speakerId, []);
    }

    const speakerSegments = this.extractedSegments.get(segment.speakerId)!;
    speakerSegments.push(segment);

    // Enforce max segments per speaker
    const maxSegments = this.config.extractionSettings.maxSegmentsPerSpeaker;
    if (speakerSegments.length > maxSegments) {
      // Remove oldest segments, keeping the highest quality ones
      speakerSegments.sort((a, b) => b.quality.overall - a.quality.overall);
      speakerSegments.splice(maxSegments);
    }

    // Sort by quality for quick access to best segments
    speakerSegments.sort((a, b) => b.quality.overall - a.quality.overall);
  }

  /**
   * Update speaker statistics
   */
  private updateSpeakerStats(speakerId: string, duration: number): void {
    if (!this.stats.speakerStats.has(speakerId)) {
      this.stats.speakerStats.set(speakerId, {
        segmentCount: 0,
        totalDuration: 0,
        averageQuality: 0,
        lastActivity: Date.now(),
      });
    }

    const speakerStat = this.stats.speakerStats.get(speakerId)!;
    speakerStat.totalDuration += duration;
    speakerStat.lastActivity = Date.now();
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryStats(): void {
    const bufferStats = this.chunkBuffer.getBufferStats();
    this.stats.memoryUsage.current = bufferStats.totalBufferSize;
    this.stats.memoryUsage.peak = Math.max(
      this.stats.memoryUsage.peak,
      this.stats.memoryUsage.current
    );
    this.stats.memoryUsage.bufferedChunks = bufferStats.totalChunks;
  }

  /**
   * Start realtime processing timer
   */
  private startRealtimeProcessing(): void {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(async () => {
      await this.processBatch();
    }, 100); // Process every 100ms
  }

  /**
   * Process queued chunks in batches
   */
  private async processBatch(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    const batchSize = Math.min(this.config.processingBatchSize, this.processingQueue.length);
    const batch = this.processingQueue.splice(0, batchSize);

    // Process batch in parallel
    const promises = batch.map(({ chunk, speakerId, timestamp }) =>
      this.processChunkInternal(chunk, speakerId, timestamp)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }

  /**
   * Get best quality segments for a speaker
   */
  public getBestSegments(speakerId: string, count: number = 3): ExtractedSegment[] {
    const segments = this.extractedSegments.get(speakerId) || [];
    return segments.slice(0, Math.min(count, segments.length));
  }

  /**
   * Get all segments for a speaker
   */
  public getSegmentsForSpeaker(speakerId: string): ExtractedSegment[] {
    return this.extractedSegments.get(speakerId) || [];
  }

  /**
   * Get segments across all speakers, sorted by quality
   */
  public getAllSegmentsByQuality(count?: number): ExtractedSegment[] {
    const allSegments: ExtractedSegment[] = [];
    
    for (const segments of this.extractedSegments.values()) {
      allSegments.push(...segments);
    }
    
    allSegments.sort((a, b) => b.quality.overall - a.quality.overall);
    
    return count ? allSegments.slice(0, count) : allSegments;
  }

  /**
   * Force segment extraction for current state
   */
  public async forceExtraction(): Promise<ExtractedSegment[]> {
    const extractedSegments: ExtractedSegment[] = [];
    
    // Force segments for all active speakers
    for (const speakerId of this.stats.speakerStats.keys()) {
      const segment = await this.chunkBuffer.forceSegmentCreation(speakerId);
      if (segment) {
        await this.handleBufferSegment(segment);
        const speakerSegments = this.getSegmentsForSpeaker(speakerId);
        if (speakerSegments.length > 0) {
          extractedSegments.push(speakerSegments[0]); // Latest segment
        }
      }
    }
    
    return extractedSegments;
  }

  /**
   * Get extraction statistics
   */
  public getStats(): ExtractionStats {
    // Update VAD stats
    const vadStats = this.vad.getStats();
    this.stats.vadStats.voiceRatio = vadStats.voiceRatio;
    this.stats.vadStats.averageConfidence = vadStats.averageConfidence;
    
    // Calculate average quality across all segments
    const allSegments = this.getAllSegmentsByQuality();
    this.stats.averageQuality = allSegments.length > 0 ?
      allSegments.reduce((sum, seg) => sum + seg.quality.overall, 0) / allSegments.length : 0;
    
    return { ...this.stats };
  }

  /**
   * Register callback for segment extraction
   */
  public onSegmentExtracted(callback: (segment: ExtractedSegment) => void): () => void {
    this.segmentCallbacks.add(callback);
    return () => this.segmentCallbacks.delete(callback);
  }

  /**
   * Register callback for speaker changes
   */
  public onSpeakerChange(callback: (event: SpeakerChangeEvent) => void): () => void {
    this.speakerChangeCallbacks.add(callback);
    return () => this.speakerChangeCallbacks.delete(callback);
  }

  /**
   * Clear segments for a speaker
   */
  public clearSpeakerSegments(speakerId: string): void {
    this.extractedSegments.delete(speakerId);
    this.chunkBuffer.clearSpeakerBuffer(speakerId);
    this.stats.speakerStats.delete(speakerId);
  }

  /**
   * Clear all segments and reset state
   */
  public clearAllSegments(): void {
    this.extractedSegments.clear();
    this.chunkBuffer.clearAllBuffers();
    this.vad.reset();
    this.stats.speakerStats.clear();
    this.currentSpeaker = null;
    this.lastSpeakerChange = 0;
    this.processingQueue = [];
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<SegmentExtractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (newConfig.bufferConfig) {
      this.chunkBuffer.updateConfig(newConfig.bufferConfig);
    }
    
    if (newConfig.vadConfig) {
      this.vad.updateConfig(newConfig.vadConfig);
    }
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    this.chunkBuffer.dispose();
    this.vad.dispose();
    this.formatConverter.dispose();
    
    this.clearAllSegments();
    this.segmentCallbacks.clear();
    this.speakerChangeCallbacks.clear();
  }
}

/**
 * Factory function to create AudioSegmentExtractor instance
 */
export function createAudioSegmentExtractor(
  config?: Partial<SegmentExtractionConfig>
): AudioSegmentExtractor {
  return new AudioSegmentExtractor(config);
}