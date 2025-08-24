/**
 * Voice Activity Detection (VAD) Service
 * 
 * Advanced voice activity detection for audio segmentation and processing.
 * Provides real-time analysis of audio streams to detect speech vs silence,
 * segment boundaries, and speaker transitions.
 */

export interface VADFrame {
  timestamp: number;
  isVoice: boolean;
  confidence: number;
  energy: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  metadata?: {
    frameIndex: number;
    speakerId?: string;
  };
}

export interface VADSegment {
  startTime: number;
  endTime: number;
  duration: number;
  type: 'voice' | 'silence';
  confidence: number;
  frames: VADFrame[];
  speakerId?: string;
}

export interface VADConfig {
  // Frame analysis
  frameSize: number; // Frame size in samples (default: 512)
  hopSize: number; // Hop size in samples (default: 256)
  sampleRate: number; // Sample rate in Hz (default: 16000)
  
  // Thresholds
  energyThreshold: number; // Energy threshold for voice detection (0-1)
  zcRateThreshold: number; // Zero-crossing rate threshold (0-1)
  spectralThreshold: number; // Spectral centroid threshold
  confidenceThreshold: number; // Minimum confidence for voice detection
  
  // Temporal filtering
  minVoiceDuration: number; // Minimum voice segment duration (ms)
  minSilenceDuration: number; // Minimum silence segment duration (ms)
  hangoverFrames: number; // Frames to continue voice after detection ends
  lookAheadFrames: number; // Frames to look ahead for voice onset
  
  // Advanced features
  enableSpectralAnalysis: boolean;
  enableAdaptiveThreshold: boolean;
  enableSmoothing: boolean;
  smoothingWindow: number; // Window size for smoothing (frames)
}

export interface VADStats {
  totalFrames: number;
  voiceFrames: number;
  silenceFrames: number;
  voiceRatio: number;
  averageConfidence: number;
  totalDuration: number;
  voiceDuration: number;
  silenceDuration: number;
  segmentCount: number;
}

export class VoiceActivityDetection {
  private config: VADConfig;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private frameBuffer: Float32Array[] = [];
  private vadFrames: VADFrame[] = [];
  private vadSegments: VADSegment[] = [];
  private currentSegment: VADSegment | null = null;
  
  // State tracking
  private frameIndex: number = 0;
  private lastVoiceTime: number = 0;
  private consecutiveVoiceFrames: number = 0;
  private consecutiveSilenceFrames: number = 0;
  private isInVoiceSegment: boolean = false;
  
  // Adaptive thresholding
  private energyHistory: number[] = [];
  private adaptiveEnergyThreshold: number = 0;
  
  // Callbacks
  private frameCallbacks: Set<(frame: VADFrame) => void> = new Set();
  private segmentCallbacks: Set<(segment: VADSegment) => void> = new Set();

  constructor(config?: Partial<VADConfig>) {
    this.config = {
      frameSize: 512,
      hopSize: 256,
      sampleRate: 16000,
      energyThreshold: 0.01,
      zcRateThreshold: 0.3,
      spectralThreshold: 1000,
      confidenceThreshold: 0.5,
      minVoiceDuration: 100, // 100ms
      minSilenceDuration: 200, // 200ms
      hangoverFrames: 5,
      lookAheadFrames: 3,
      enableSpectralAnalysis: true,
      enableAdaptiveThreshold: true,
      enableSmoothing: true,
      smoothingWindow: 5,
      ...config,
    };

    this.initializeAudioContext();
    this.adaptiveEnergyThreshold = this.config.energyThreshold;
  }

  private async initializeAudioContext(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.setupAnalyser();
      } catch (error) {
        console.error('Failed to initialize AudioContext for VAD:', error);
      }
    }
  }

  private setupAnalyser(): void {
    if (!this.audioContext) return;

    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = this.config.frameSize * 2;
    this.analyserNode.smoothingTimeConstant = 0.3;
  }

  /**
   * Process audio chunk for voice activity detection
   */
  public async processAudioChunk(
    audioData: ArrayBuffer | Float32Array, 
    timestamp: number,
    speakerId?: string
  ): Promise<VADFrame[]> {
    try {
      let audioSamples: Float32Array;
      
      if (audioData instanceof ArrayBuffer) {
        // Decode audio data if needed
        audioSamples = await this.decodeAudioData(audioData);
      } else {
        audioSamples = audioData;
      }

      return this.analyzeAudioSamples(audioSamples, timestamp, speakerId);
    } catch (error) {
      console.error('Failed to process audio chunk for VAD:', error);
      return [];
    }
  }

  /**
   * Decode audio data from ArrayBuffer
   */
  private async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<Float32Array> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      return audioBuffer.getChannelData(0);
    } catch (error) {
      console.error('Failed to decode audio data:', error);
      throw error;
    }
  }

  /**
   * Analyze audio samples for voice activity
   */
  private analyzeAudioSamples(
    samples: Float32Array, 
    timestamp: number,
    speakerId?: string
  ): VADFrame[] {
    const frames: VADFrame[] = [];
    const frameSize = this.config.frameSize;
    const hopSize = this.config.hopSize;

    for (let i = 0; i <= samples.length - frameSize; i += hopSize) {
      const frameData = samples.slice(i, i + frameSize);
      const frameTimestamp = timestamp + (i / this.config.sampleRate) * 1000;
      
      const frame = this.analyzeFrame(frameData, frameTimestamp, speakerId);
      frames.push(frame);
      
      // Update VAD state
      this.updateVADState(frame);
      
      // Apply temporal filtering and smoothing
      this.applyTemporalFiltering();
      
      // Notify frame callbacks
      this.frameCallbacks.forEach(callback => {
        try {
          callback(frame);
        } catch (error) {
          console.error('Error in VAD frame callback:', error);
        }
      });
    }

    return frames;
  }

  /**
   * Analyze a single audio frame
   */
  private analyzeFrame(frameData: Float32Array, timestamp: number, speakerId?: string): VADFrame {
    this.frameIndex++;
    
    // Calculate basic features
    const energy = this.calculateEnergy(frameData);
    const zeroCrossingRate = this.calculateZeroCrossingRate(frameData);
    const spectralCentroid = this.config.enableSpectralAnalysis ? 
      this.calculateSpectralCentroid(frameData) : 0;
    
    // Update adaptive threshold if enabled
    if (this.config.enableAdaptiveThreshold) {
      this.updateAdaptiveThreshold(energy);
    }
    
    // Determine voice activity
    const isVoice = this.classifyFrame(energy, zeroCrossingRate, spectralCentroid);
    const confidence = this.calculateConfidence(energy, zeroCrossingRate, spectralCentroid, isVoice);
    
    const frame: VADFrame = {
      timestamp,
      isVoice,
      confidence,
      energy,
      spectralCentroid,
      zeroCrossingRate,
      metadata: {
        frameIndex: this.frameIndex,
        speakerId,
      },
    };
    
    this.vadFrames.push(frame);
    return frame;
  }

  /**
   * Calculate frame energy (RMS)
   */
  private calculateEnergy(frameData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frameData.length; i++) {
      sum += frameData[i] * frameData[i];
    }
    return Math.sqrt(sum / frameData.length);
  }

  /**
   * Calculate zero-crossing rate
   */
  private calculateZeroCrossingRate(frameData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < frameData.length; i++) {
      if ((frameData[i] >= 0) !== (frameData[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / frameData.length;
  }

  /**
   * Calculate spectral centroid
   */
  private calculateSpectralCentroid(frameData: Float32Array): number {
    // Simple spectral centroid calculation using FFT
    const fftSize = frameData.length;
    const magnitudes = new Array(fftSize / 2);
    
    // Apply window function (Hamming)
    const windowed = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      windowed[i] = frameData[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (fftSize - 1)));
    }
    
    // Simple magnitude calculation (without actual FFT for performance)
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < fftSize / 2; i++) {
      const magnitude = Math.abs(windowed[i]);
      const frequency = (i * this.config.sampleRate) / fftSize;
      
      weightedSum += magnitude * frequency;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Classify frame as voice or silence
   */
  private classifyFrame(energy: number, zcRate: number, spectralCentroid: number): boolean {
    const energyThreshold = this.config.enableAdaptiveThreshold ? 
      this.adaptiveEnergyThreshold : this.config.energyThreshold;
    
    // Energy-based detection
    const energyVote = energy > energyThreshold;
    
    // Zero-crossing rate based detection (speech typically has moderate ZCR)
    const zcVote = zcRate > 0.01 && zcRate < this.config.zcRateThreshold;
    
    // Spectral centroid based detection (speech typically has centroid in voice range)
    const spectralVote = !this.config.enableSpectralAnalysis || 
      (spectralCentroid > 300 && spectralCentroid < 3000);
    
    // Combine votes (majority voting with energy as primary)
    return energyVote && (zcVote || spectralVote);
  }

  /**
   * Calculate confidence score for frame classification
   */
  private calculateConfidence(
    energy: number, 
    zcRate: number, 
    spectralCentroid: number, 
    isVoice: boolean
  ): number {
    const energyThreshold = this.config.enableAdaptiveThreshold ? 
      this.adaptiveEnergyThreshold : this.config.energyThreshold;
    
    // Energy confidence (distance from threshold)
    const energyConf = energy > energyThreshold ? 
      Math.min(1, energy / (energyThreshold * 2)) : 
      Math.max(0, 1 - (energyThreshold - energy) / energyThreshold);
    
    // ZCR confidence (distance from optimal range)
    const optimalZC = 0.1;
    const zcConf = 1 - Math.abs(zcRate - optimalZC) / optimalZC;
    
    // Spectral confidence
    const spectralConf = this.config.enableSpectralAnalysis && spectralCentroid > 0 ? 
      (spectralCentroid > 300 && spectralCentroid < 3000 ? 0.8 : 0.3) : 0.5;
    
    // Weighted combination
    const confidence = (energyConf * 0.5) + (zcConf * 0.3) + (spectralConf * 0.2);
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Update adaptive energy threshold
   */
  private updateAdaptiveThreshold(energy: number): void {
    this.energyHistory.push(energy);
    
    // Keep only recent history (last 100 frames)
    if (this.energyHistory.length > 100) {
      this.energyHistory.shift();
    }
    
    // Calculate adaptive threshold as a percentile of recent energy values
    if (this.energyHistory.length >= 10) {
      const sorted = [...this.energyHistory].sort((a, b) => a - b);
      const percentileIndex = Math.floor(sorted.length * 0.3); // 30th percentile
      this.adaptiveEnergyThreshold = Math.max(
        this.config.energyThreshold * 0.5, // Minimum threshold
        sorted[percentileIndex] * 1.5 // Adaptive threshold
      );
    }
  }

  /**
   * Update VAD state and track segments
   */
  private updateVADState(frame: VADFrame): void {
    if (frame.isVoice && frame.confidence >= this.config.confidenceThreshold) {
      this.consecutiveVoiceFrames++;
      this.consecutiveSilenceFrames = 0;
      this.lastVoiceTime = frame.timestamp;
      
      // Start voice segment if not already in one
      if (!this.isInVoiceSegment) {
        this.startVoiceSegment(frame);
      }
    } else {
      this.consecutiveSilenceFrames++;
      
      // End voice segment if silence is long enough
      if (this.isInVoiceSegment && 
          this.consecutiveSilenceFrames > this.config.hangoverFrames) {
        this.endVoiceSegment(frame);
      }
      
      // Reset voice frame count if long silence
      if (this.consecutiveSilenceFrames > this.config.hangoverFrames * 2) {
        this.consecutiveVoiceFrames = 0;
      }
    }
  }

  /**
   * Start a new voice segment
   */
  private startVoiceSegment(frame: VADFrame): void {
    this.isInVoiceSegment = true;
    this.currentSegment = {
      startTime: frame.timestamp,
      endTime: frame.timestamp,
      duration: 0,
      type: 'voice',
      confidence: frame.confidence,
      frames: [frame],
      speakerId: frame.metadata?.speakerId,
    };
  }

  /**
   * End the current voice segment
   */
  private endVoiceSegment(frame: VADFrame): void {
    if (!this.currentSegment) return;
    
    this.currentSegment.endTime = frame.timestamp;
    this.currentSegment.duration = this.currentSegment.endTime - this.currentSegment.startTime;
    
    // Calculate average confidence
    const confidences = this.currentSegment.frames.map(f => f.confidence);
    this.currentSegment.confidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    
    // Only save segment if it meets minimum duration
    if (this.currentSegment.duration >= this.config.minVoiceDuration) {
      this.vadSegments.push(this.currentSegment);
      
      // Notify segment callbacks
      this.segmentCallbacks.forEach(callback => {
        try {
          callback(this.currentSegment!);
        } catch (error) {
          console.error('Error in VAD segment callback:', error);
        }
      });
    }
    
    this.currentSegment = null;
    this.isInVoiceSegment = false;
  }

  /**
   * Apply temporal filtering and smoothing
   */
  private applyTemporalFiltering(): void {
    if (!this.config.enableSmoothing || this.vadFrames.length < this.config.smoothingWindow) {
      return;
    }
    
    const windowSize = this.config.smoothingWindow;
    const recentFrames = this.vadFrames.slice(-windowSize);
    
    // Apply median filter to recent frames
    const voiceVotes = recentFrames.map(f => f.isVoice ? 1 : 0);
    const voiceCount = voiceVotes.reduce((sum: number, vote) => sum + vote, 0);
    const shouldBeVoice = voiceCount > windowSize / 2;
    
    // Update the most recent frame if smoothing suggests a different classification
    const lastFrame = this.vadFrames[this.vadFrames.length - 1];
    if (lastFrame.isVoice !== shouldBeVoice && lastFrame.confidence < 0.8) {
      lastFrame.isVoice = shouldBeVoice;
      lastFrame.confidence = Math.max(0.5, lastFrame.confidence);
    }
  }

  /**
   * Get current VAD statistics
   */
  public getStats(): VADStats {
    const voiceFrames = this.vadFrames.filter(f => f.isVoice).length;
    const silenceFrames = this.vadFrames.length - voiceFrames;
    const totalDuration = this.vadFrames.length > 0 ? 
      this.vadFrames[this.vadFrames.length - 1].timestamp - this.vadFrames[0].timestamp : 0;
    
    const confidences = this.vadFrames.map(f => f.confidence);
    const averageConfidence = confidences.length > 0 ? 
      confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length : 0;
    
    const voiceDuration = this.vadSegments
      .filter(s => s.type === 'voice')
      .reduce((sum, s) => sum + s.duration, 0);
    
    return {
      totalFrames: this.vadFrames.length,
      voiceFrames,
      silenceFrames,
      voiceRatio: this.vadFrames.length > 0 ? voiceFrames / this.vadFrames.length : 0,
      averageConfidence,
      totalDuration,
      voiceDuration,
      silenceDuration: totalDuration - voiceDuration,
      segmentCount: this.vadSegments.length,
    };
  }

  /**
   * Get recent voice segments
   */
  public getRecentSegments(count: number = 10): VADSegment[] {
    return this.vadSegments.slice(-count);
  }

  /**
   * Get voice segments for a specific speaker
   */
  public getSegmentsForSpeaker(speakerId: string): VADSegment[] {
    return this.vadSegments.filter(s => s.speakerId === speakerId);
  }

  /**
   * Check if currently in a voice segment
   */
  public isCurrentlyVoice(): boolean {
    return this.isInVoiceSegment;
  }

  /**
   * Force end current segment (useful for speaker changes)
   */
  public forceEndCurrentSegment(): VADSegment | null {
    if (!this.currentSegment) return null;
    
    const lastFrame = this.vadFrames[this.vadFrames.length - 1];
    if (lastFrame) {
      this.endVoiceSegment(lastFrame);
    }
    
    return this.vadSegments[this.vadSegments.length - 1] || null;
  }

  /**
   * Register callback for frame processing
   */
  public onFrame(callback: (frame: VADFrame) => void): () => void {
    this.frameCallbacks.add(callback);
    return () => this.frameCallbacks.delete(callback);
  }

  /**
   * Register callback for segment completion
   */
  public onSegment(callback: (segment: VADSegment) => void): () => void {
    this.segmentCallbacks.add(callback);
    return () => this.segmentCallbacks.delete(callback);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<VADConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reset adaptive threshold if energy threshold changed
    if (newConfig.energyThreshold !== undefined) {
      this.adaptiveEnergyThreshold = this.config.energyThreshold;
      this.energyHistory = [];
    }
  }

  /**
   * Reset VAD state
   */
  public reset(): void {
    this.vadFrames = [];
    this.vadSegments = [];
    this.currentSegment = null;
    this.frameIndex = 0;
    this.lastVoiceTime = 0;
    this.consecutiveVoiceFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.isInVoiceSegment = false;
    this.energyHistory = [];
    this.adaptiveEnergyThreshold = this.config.energyThreshold;
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.reset();
    this.frameCallbacks.clear();
    this.segmentCallbacks.clear();
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}

/**
 * Factory function to create VAD instance
 */
export function createVoiceActivityDetection(config?: Partial<VADConfig>): VoiceActivityDetection {
  return new VoiceActivityDetection(config);
}