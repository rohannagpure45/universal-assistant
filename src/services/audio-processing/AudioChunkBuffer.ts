/**
 * AudioChunkBuffer - Per-speaker audio buffering with quality analysis
 * 
 * This class manages audio chunks for individual speakers, providing:
 * - Memory-efficient buffering with configurable limits
 * - Real-time quality analysis and metrics
 * - Voice Activity Detection for segment boundaries
 * - Audio format conversion and processing
 * - Segment extraction based on speaker changes
 */

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  speakerId: string;
  quality: AudioQualityMetrics;
  originalBlob?: Blob; // Original WebM blob for reference
}

export interface AudioQualityMetrics {
  snr: number; // Signal-to-noise ratio (0-1)
  volume: number; // Average volume level (0-1)
  clarity: number; // Speech clarity metric (0-1)
  duration: number; // Chunk duration in milliseconds
  voiceActivity: number; // Voice activity ratio (0-1)
  overallQuality: number; // Combined quality score (0-1)
}

export interface AudioSegment {
  speakerId: string;
  chunks: AudioChunk[];
  startTime: number;
  endTime: number;
  duration: number;
  averageQuality: AudioQualityMetrics;
  transcript?: string;
  confidence?: number;
}

export interface AudioChunkBufferConfig {
  // Memory management
  maxChunksPerSpeaker: number; // Maximum chunks to keep per speaker
  maxBufferSizeBytes: number; // Maximum total buffer size
  
  // Quality thresholds
  qualityThresholds: {
    minSNR: number; // Minimum signal-to-noise ratio
    minVolume: number; // Minimum volume level
    minClarity: number; // Minimum clarity score
    minVoiceActivity: number; // Minimum voice activity ratio
    minOverallQuality: number; // Minimum overall quality
  };
  
  // Segment processing
  segmentConfig: {
    minDuration: number; // Minimum segment duration (ms)
    maxDuration: number; // Maximum segment duration (ms)
    silenceThreshold: number; // Silence detection threshold
    silenceDuration: number; // Silence duration to trigger segment end (ms)
  };
  
  // VAD configuration
  vadConfig: {
    enabled: boolean;
    frameSize: number; // Analysis frame size in samples
    hopSize: number; // Hop size for overlapping analysis
    voiceThreshold: number; // Voice activity threshold (0-1)
    silenceFrames: number; // Consecutive silence frames to trigger boundary
  };
  
  // Performance settings
  enableRealtimeProcessing: boolean;
  processingInterval: number; // Processing interval in ms
}

export class AudioChunkBuffer {
  private speakerBuffers: Map<string, AudioChunk[]> = new Map();
  private speakerSegments: Map<string, AudioSegment[]> = new Map();
  private config: AudioChunkBufferConfig;
  private processingTimer: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNodes: Map<string, AnalyserNode> = new Map();
  
  // Quality tracking
  private qualityStats: Map<string, AudioQualityMetrics[]> = new Map();
  private segmentCallbacks: Set<(segment: AudioSegment) => void> = new Set();
  
  // VAD state
  private vadState: Map<string, {
    consecutiveSilenceFrames: number;
    lastVoiceTime: number;
    currentSegmentStart: number;
  }> = new Map();

  constructor(config?: Partial<AudioChunkBufferConfig>) {
    this.config = {
      maxChunksPerSpeaker: 100,
      maxBufferSizeBytes: 50 * 1024 * 1024, // 50MB
      qualityThresholds: {
        minSNR: 0.3,
        minVolume: 0.05,
        minClarity: 0.4,
        minVoiceActivity: 0.6,
        minOverallQuality: 0.5,
      },
      segmentConfig: {
        minDuration: 3000, // 3 seconds
        maxDuration: 15000, // 15 seconds
        silenceThreshold: 0.02,
        silenceDuration: 1500, // 1.5 seconds
      },
      vadConfig: {
        enabled: true,
        frameSize: 512,
        hopSize: 256,
        voiceThreshold: 0.5,
        silenceFrames: 10,
      },
      enableRealtimeProcessing: true,
      processingInterval: 100,
      ...config,
    };

    this.initializeAudioContext();
    
    if (this.config.enableRealtimeProcessing) {
      this.startRealtimeProcessing();
    }
  }

  private async initializeAudioContext(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to initialize AudioContext for chunk buffer:', error);
      }
    }
  }

  /**
   * Add an audio chunk for processing and buffering
   */
  public async addChunk(blob: Blob, speakerId: string, timestamp?: number): Promise<AudioChunk | null> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const chunkTimestamp = timestamp || Date.now();
      
      // Calculate quality metrics
      const quality = await this.calculateQualityMetrics(arrayBuffer, speakerId);
      
      // Check if chunk meets quality thresholds
      if (!this.meetsQualityThresholds(quality)) {
        console.log(`Chunk rejected for speaker ${speakerId} - quality below threshold:`, quality);
        return null;
      }

      const chunk: AudioChunk = {
        data: arrayBuffer,
        timestamp: chunkTimestamp,
        speakerId,
        quality,
        originalBlob: blob,
      };

      // Add to buffer
      this.addToBuffer(speakerId, chunk);
      
      // Process for potential segment creation
      if (this.config.enableRealtimeProcessing) {
        await this.processRealtimeSegmentation(speakerId, chunk);
      }

      return chunk;
    } catch (error) {
      console.error('Failed to add audio chunk:', error);
      return null;
    }
  }

  /**
   * Calculate comprehensive quality metrics for an audio chunk
   */
  private async calculateQualityMetrics(
    arrayBuffer: ArrayBuffer, 
    speakerId: string
  ): Promise<AudioQualityMetrics> {
    if (!this.audioContext) {
      // Fallback basic metrics without audio analysis
      return {
        snr: 0.5,
        volume: 0.5,
        clarity: 0.5,
        duration: arrayBuffer.byteLength / 32000, // Approximate duration
        voiceActivity: 0.5,
        overallQuality: 0.5,
      };
    }

    try {
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      const channelData = audioBuffer.getChannelData(0);
      const duration = audioBuffer.duration * 1000; // Convert to ms

      // Calculate volume (RMS)
      let rmsSum = 0;
      for (let i = 0; i < channelData.length; i++) {
        rmsSum += channelData[i] * channelData[i];
      }
      const volume = Math.sqrt(rmsSum / channelData.length);

      // Calculate Signal-to-Noise Ratio
      const snr = this.calculateSNR(channelData);

      // Calculate clarity using spectral features
      const clarity = this.calculateClarity(channelData);

      // Calculate voice activity detection
      const voiceActivity = this.calculateVoiceActivity(channelData);

      // Combine metrics for overall quality score
      const overallQuality = this.calculateOverallQuality({
        snr,
        volume,
        clarity,
        voiceActivity,
        duration,
      });

      return {
        snr,
        volume,
        clarity,
        duration,
        voiceActivity,
        overallQuality,
      };
    } catch (error) {
      console.error('Error calculating quality metrics:', error);
      // Return fallback metrics
      return {
        snr: 0.3,
        volume: 0.3,
        clarity: 0.3,
        duration: arrayBuffer.byteLength / 32000,
        voiceActivity: 0.3,
        overallQuality: 0.3,
      };
    }
  }

  /**
   * Calculate Signal-to-Noise Ratio
   */
  private calculateSNR(channelData: Float32Array): number {
    // Simple energy-based SNR calculation
    let signalEnergy = 0;
    let noiseEnergy = 0;
    
    // Calculate overall energy
    for (let i = 0; i < channelData.length; i++) {
      signalEnergy += channelData[i] * channelData[i];
    }
    
    // Estimate noise from quiet segments (bottom 10% of energy)
    const samples = Array.from(channelData).map(sample => sample * sample);
    samples.sort((a, b) => a - b);
    const noiseIndex = Math.floor(samples.length * 0.1);
    noiseEnergy = samples.slice(0, noiseIndex).reduce((sum, val) => sum + val, 0) / noiseIndex;
    
    const avgSignalEnergy = signalEnergy / channelData.length;
    const snr = noiseEnergy > 0 ? avgSignalEnergy / noiseEnergy : 1.0;
    
    // Normalize to 0-1 range
    return Math.min(1.0, Math.max(0.0, snr / 10));
  }

  /**
   * Calculate speech clarity using spectral features
   */
  private calculateClarity(channelData: Float32Array): number {
    // Use zero-crossing rate as a simple clarity metric
    let zeroCrossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    
    const zcr = zeroCrossings / channelData.length;
    
    // Speech typically has ZCR between 0.01 and 0.3
    // Normalize to 0-1 range
    return Math.min(1.0, Math.max(0.0, (zcr - 0.01) / 0.29));
  }

  /**
   * Calculate voice activity ratio
   */
  private calculateVoiceActivity(channelData: Float32Array): number {
    const frameSize = this.config.vadConfig.frameSize;
    const hopSize = this.config.vadConfig.hopSize;
    const threshold = this.config.vadConfig.voiceThreshold;
    
    let voiceFrames = 0;
    let totalFrames = 0;
    
    for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
      // Calculate frame energy
      let frameEnergy = 0;
      for (let j = 0; j < frameSize; j++) {
        const sample = channelData[i + j];
        frameEnergy += sample * sample;
      }
      frameEnergy = Math.sqrt(frameEnergy / frameSize);
      
      if (frameEnergy > threshold) {
        voiceFrames++;
      }
      totalFrames++;
    }
    
    return totalFrames > 0 ? voiceFrames / totalFrames : 0;
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQuality(metrics: Partial<AudioQualityMetrics>): number {
    const weights = {
      snr: 0.3,
      volume: 0.2,
      clarity: 0.3,
      voiceActivity: 0.2,
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    if (metrics.snr !== undefined) {
      weightedSum += metrics.snr * weights.snr;
      totalWeight += weights.snr;
    }
    
    if (metrics.volume !== undefined) {
      // Volume score: penalize too quiet or too loud
      const volumeScore = metrics.volume < 0.1 ? metrics.volume * 5 : 
                         metrics.volume > 0.8 ? (1 - metrics.volume) * 5 : 1;
      weightedSum += volumeScore * weights.volume;
      totalWeight += weights.volume;
    }
    
    if (metrics.clarity !== undefined) {
      weightedSum += metrics.clarity * weights.clarity;
      totalWeight += weights.clarity;
    }
    
    if (metrics.voiceActivity !== undefined) {
      weightedSum += metrics.voiceActivity * weights.voiceActivity;
      totalWeight += weights.voiceActivity;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Check if chunk meets quality thresholds
   */
  private meetsQualityThresholds(quality: AudioQualityMetrics): boolean {
    const thresholds = this.config.qualityThresholds;
    
    return (
      quality.snr >= thresholds.minSNR &&
      quality.volume >= thresholds.minVolume &&
      quality.clarity >= thresholds.minClarity &&
      quality.voiceActivity >= thresholds.minVoiceActivity &&
      quality.overallQuality >= thresholds.minOverallQuality
    );
  }

  /**
   * Add chunk to speaker buffer with memory management
   */
  private addToBuffer(speakerId: string, chunk: AudioChunk): void {
    if (!this.speakerBuffers.has(speakerId)) {
      this.speakerBuffers.set(speakerId, []);
      this.qualityStats.set(speakerId, []);
    }

    const buffer = this.speakerBuffers.get(speakerId)!;
    const stats = this.qualityStats.get(speakerId)!;

    // Add chunk and quality stats
    buffer.push(chunk);
    stats.push(chunk.quality);

    // Enforce memory limits
    this.enforceBufferLimits(speakerId);
  }

  /**
   * Enforce buffer size and memory limits
   */
  private enforceBufferLimits(speakerId: string): void {
    const buffer = this.speakerBuffers.get(speakerId);
    const stats = this.qualityStats.get(speakerId);
    
    if (!buffer || !stats) return;

    // Remove old chunks if exceeding max chunks per speaker
    while (buffer.length > this.config.maxChunksPerSpeaker) {
      buffer.shift();
      stats.shift();
    }

    // Check total buffer size across all speakers
    const totalSize = this.getTotalBufferSize();
    if (totalSize > this.config.maxBufferSizeBytes) {
      this.evictOldestChunks();
    }
  }

  /**
   * Calculate total buffer size across all speakers
   */
  private getTotalBufferSize(): number {
    let totalSize = 0;
    for (const buffer of this.speakerBuffers.values()) {
      for (const chunk of buffer) {
        totalSize += chunk.data.byteLength;
      }
    }
    return totalSize;
  }

  /**
   * Evict oldest chunks when approaching memory limits
   */
  private evictOldestChunks(): void {
    // Find speaker with oldest chunks
    let oldestTime = Date.now();
    let oldestSpeaker: string | null = null;
    
    for (const [speakerId, buffer] of this.speakerBuffers.entries()) {
      if (buffer.length > 0 && buffer[0].timestamp < oldestTime) {
        oldestTime = buffer[0].timestamp;
        oldestSpeaker = speakerId;
      }
    }
    
    // Remove oldest chunk
    if (oldestSpeaker) {
      const buffer = this.speakerBuffers.get(oldestSpeaker)!;
      const stats = this.qualityStats.get(oldestSpeaker)!;
      buffer.shift();
      stats.shift();
    }
  }

  /**
   * Process real-time segmentation based on VAD and speaker changes
   */
  private async processRealtimeSegmentation(speakerId: string, chunk: AudioChunk): Promise<void> {
    if (!this.config.vadConfig.enabled) return;

    // Initialize VAD state for new speaker
    if (!this.vadState.has(speakerId)) {
      this.vadState.set(speakerId, {
        consecutiveSilenceFrames: 0,
        lastVoiceTime: chunk.timestamp,
        currentSegmentStart: chunk.timestamp,
      });
    }

    const vadState = this.vadState.get(speakerId)!;
    const isVoiceActive = chunk.quality.voiceActivity > this.config.vadConfig.voiceThreshold;

    if (isVoiceActive) {
      vadState.lastVoiceTime = chunk.timestamp;
      vadState.consecutiveSilenceFrames = 0;
    } else {
      vadState.consecutiveSilenceFrames++;
    }

    // Check for segment boundary conditions
    const silenceDuration = chunk.timestamp - vadState.lastVoiceTime;
    const segmentDuration = chunk.timestamp - vadState.currentSegmentStart;
    
    const shouldEndSegment = 
      vadState.consecutiveSilenceFrames >= this.config.vadConfig.silenceFrames ||
      silenceDuration >= this.config.segmentConfig.silenceDuration ||
      segmentDuration >= this.config.segmentConfig.maxDuration;

    if (shouldEndSegment && segmentDuration >= this.config.segmentConfig.minDuration) {
      await this.createSegment(speakerId, vadState.currentSegmentStart, chunk.timestamp);
      vadState.currentSegmentStart = chunk.timestamp;
      vadState.consecutiveSilenceFrames = 0;
    }
  }

  /**
   * Create an audio segment from buffered chunks
   */
  private async createSegment(speakerId: string, startTime: number, endTime: number): Promise<AudioSegment | null> {
    const buffer = this.speakerBuffers.get(speakerId);
    if (!buffer) return null;

    // Find chunks within the time range
    const segmentChunks = buffer.filter(
      chunk => chunk.timestamp >= startTime && chunk.timestamp <= endTime
    );

    if (segmentChunks.length === 0) return null;

    // Calculate average quality metrics
    const averageQuality = this.calculateAverageQuality(segmentChunks.map(c => c.quality));

    const segment: AudioSegment = {
      speakerId,
      chunks: segmentChunks,
      startTime,
      endTime,
      duration: endTime - startTime,
      averageQuality,
    };

    // Store segment
    if (!this.speakerSegments.has(speakerId)) {
      this.speakerSegments.set(speakerId, []);
    }
    this.speakerSegments.get(speakerId)!.push(segment);

    // Notify callbacks
    this.segmentCallbacks.forEach(callback => {
      try {
        callback(segment);
      } catch (error) {
        console.error('Error in segment callback:', error);
      }
    });

    console.log(`Created audio segment for ${speakerId}: ${segment.duration}ms, quality: ${averageQuality.overallQuality.toFixed(2)}`);
    return segment;
  }

  /**
   * Calculate average quality across multiple metrics
   */
  private calculateAverageQuality(qualities: AudioQualityMetrics[]): AudioQualityMetrics {
    if (qualities.length === 0) {
      return {
        snr: 0,
        volume: 0,
        clarity: 0,
        duration: 0,
        voiceActivity: 0,
        overallQuality: 0,
      };
    }

    const sum = qualities.reduce((acc, quality) => ({
      snr: acc.snr + quality.snr,
      volume: acc.volume + quality.volume,
      clarity: acc.clarity + quality.clarity,
      duration: acc.duration + quality.duration,
      voiceActivity: acc.voiceActivity + quality.voiceActivity,
      overallQuality: acc.overallQuality + quality.overallQuality,
    }), {
      snr: 0,
      volume: 0,
      clarity: 0,
      duration: 0,
      voiceActivity: 0,
      overallQuality: 0,
    });

    const count = qualities.length;
    return {
      snr: sum.snr / count,
      volume: sum.volume / count,
      clarity: sum.clarity / count,
      duration: sum.duration, // Total duration, not average
      voiceActivity: sum.voiceActivity / count,
      overallQuality: sum.overallQuality / count,
    };
  }

  /**
   * Start real-time processing timer
   */
  private startRealtimeProcessing(): void {
    if (this.processingTimer) return;

    this.processingTimer = setInterval(() => {
      this.processBuffers();
    }, this.config.processingInterval);
  }

  /**
   * Process all speaker buffers for potential segments
   */
  private processBuffers(): void {
    const currentTime = Date.now();
    
    for (const [speakerId, vadState] of this.vadState.entries()) {
      const silenceDuration = currentTime - vadState.lastVoiceTime;
      const segmentDuration = currentTime - vadState.currentSegmentStart;
      
      // Check for timeout-based segment creation
      if (silenceDuration >= this.config.segmentConfig.silenceDuration && 
          segmentDuration >= this.config.segmentConfig.minDuration) {
        this.createSegment(speakerId, vadState.currentSegmentStart, currentTime);
        vadState.currentSegmentStart = currentTime;
      }
    }
  }

  /**
   * Force segment creation for a speaker (useful for speaker changes)
   */
  public async forceSegmentCreation(speakerId: string): Promise<AudioSegment | null> {
    const vadState = this.vadState.get(speakerId);
    if (!vadState) return null;

    const currentTime = Date.now();
    const segment = await this.createSegment(speakerId, vadState.currentSegmentStart, currentTime);
    
    if (segment) {
      vadState.currentSegmentStart = currentTime;
    }
    
    return segment;
  }

  /**
   * Get the best quality segments for a speaker
   */
  public getBestSegments(speakerId: string, count: number = 3): AudioSegment[] {
    const segments = this.speakerSegments.get(speakerId) || [];
    
    return segments
      .filter(segment => segment.duration >= this.config.segmentConfig.minDuration)
      .sort((a, b) => b.averageQuality.overallQuality - a.averageQuality.overallQuality)
      .slice(0, count);
  }

  /**
   * Convert audio segment to a format suitable for storage
   */
  public async convertSegmentToBlob(segment: AudioSegment): Promise<Blob | null> {
    try {
      // Combine all chunk data
      const totalSize = segment.chunks.reduce((sum, chunk) => sum + chunk.data.byteLength, 0);
      const combined = new Uint8Array(totalSize);
      
      let offset = 0;
      for (const chunk of segment.chunks) {
        combined.set(new Uint8Array(chunk.data), offset);
        offset += chunk.data.byteLength;
      }
      
      return new Blob([combined], { type: 'audio/webm' });
    } catch (error) {
      console.error('Failed to convert segment to blob:', error);
      return null;
    }
  }

  /**
   * Add callback for segment creation events
   */
  public onSegmentCreated(callback: (segment: AudioSegment) => void): () => void {
    this.segmentCallbacks.add(callback);
    return () => this.segmentCallbacks.delete(callback);
  }

  /**
   * Get buffer statistics
   */
  public getBufferStats(): {
    totalSpeakers: number;
    totalChunks: number;
    totalSegments: number;
    totalBufferSize: number;
    averageQualityPerSpeaker: Map<string, AudioQualityMetrics>;
  } {
    let totalChunks = 0;
    let totalSegments = 0;
    const averageQualityPerSpeaker = new Map<string, AudioQualityMetrics>();

    for (const [speakerId, buffer] of this.speakerBuffers.entries()) {
      totalChunks += buffer.length;
      
      const segments = this.speakerSegments.get(speakerId) || [];
      totalSegments += segments.length;
      
      const stats = this.qualityStats.get(speakerId) || [];
      if (stats.length > 0) {
        averageQualityPerSpeaker.set(speakerId, this.calculateAverageQuality(stats));
      }
    }

    return {
      totalSpeakers: this.speakerBuffers.size,
      totalChunks,
      totalSegments,
      totalBufferSize: this.getTotalBufferSize(),
      averageQualityPerSpeaker,
    };
  }

  /**
   * Clear buffer for a specific speaker
   */
  public clearSpeakerBuffer(speakerId: string): void {
    this.speakerBuffers.delete(speakerId);
    this.speakerSegments.delete(speakerId);
    this.qualityStats.delete(speakerId);
    this.vadState.delete(speakerId);
  }

  /**
   * Clear all buffers
   */
  public clearAllBuffers(): void {
    this.speakerBuffers.clear();
    this.speakerSegments.clear();
    this.qualityStats.clear();
    this.vadState.clear();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AudioChunkBufferConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart processing if interval changed
    if (newConfig.processingInterval !== undefined && this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
      if (this.config.enableRealtimeProcessing) {
        this.startRealtimeProcessing();
      }
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

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.clearAllBuffers();
    this.segmentCallbacks.clear();
    this.analyserNodes.clear();
  }
}

/**
 * Factory function to create AudioChunkBuffer instance
 */
export function createAudioChunkBuffer(config?: Partial<AudioChunkBufferConfig>): AudioChunkBuffer {
  return new AudioChunkBuffer(config);
}