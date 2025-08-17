import { AudioManager, AudioManagerConfig } from './AudioManager';
import { InputGatekeeper, InputItem, createInputGatekeeper } from '../gating/InputGatekeeper';
import { createConversationInputHandlers } from '../gating/ConversationInputHandlers';
import { EnhancedInputGatekeeper } from '../gatekeeper/EnhancedInputGatekeeper';
import { ConcurrentGatekeeper } from '../gatekeeper/ConcurrentGatekeeper';

// Voice Activity Detection Configuration
export interface VoiceActivityConfig {
  enabled: boolean;
  sensitivity: number; // 0-1, higher means more sensitive
  minSpeechDuration: number; // minimum ms of speech to trigger
  maxSilenceDuration: number; // ms of silence before declaring speech end
  energyThreshold: number; // energy level threshold for speech detection
  frequencyThreshold: number; // frequency-based speech detection
  adaptiveThreshold: boolean; // dynamically adjust thresholds
}

// Silence Detection Configuration
export interface SilenceDetectionConfig {
  enabled: boolean;
  silenceThreshold: number; // audio level threshold for silence
  silenceDuration: number; // ms of silence before triggering callback
  debounceMs: number; // debounce silence detection
}

// Real-time Audio Analysis Configuration
export interface AudioAnalysisConfig {
  enabled: boolean;
  fftSize: number; // FFT size for frequency analysis
  smoothingTimeConstant: number; // analyser smoothing
  updateInterval: number; // analysis update interval in ms
}

// Enhanced Audio Manager Configuration
export interface EnhancedAudioManagerConfig extends AudioManagerConfig {
  voiceActivityDetection: VoiceActivityConfig;
  silenceDetection: SilenceDetectionConfig;
  audioAnalysis: AudioAnalysisConfig;
  enablePhase3Features: boolean;
}

// Voice Activity Detection Events
export interface VoiceActivityEvents {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onSilenceStart: () => void;
  onSilenceEnd: () => void;
  onVoiceActivityChange: (isActive: boolean, confidence: number) => void;
  onAudioLevelChange: (level: number, frequency: number) => void;
}

// Audio Analysis Data
export interface AudioAnalysisData {
  timestamp: number;
  audioLevel: number;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  dominantFrequency: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  spectralRolloff: number;
}

// Voice Activity State
export interface VoiceActivityState {
  isActive: boolean;
  isSpeaking: boolean;
  isSilent: boolean;
  level: number;
  confidence: number;
  speechDuration: number;
  silenceDuration: number;
  lastActivity: number;
  adaptiveThreshold: number;
}

/**
 * Enhanced Audio Manager with Phase 3 capabilities
 * Extends the existing AudioManager with voice activity detection,
 * silence detection, and real-time audio analysis
 */
export class EnhancedAudioManager extends AudioManager {
  // Add missing property for recording state
  private recordingActive: boolean = false;
  
  /**
   * Check if recording is currently active
   */
  private isRecordingActive(): boolean {
    return this.recordingActive;
  }
  private analyser: AnalyserNode | null = null;
  private audioAnalysisData: AudioAnalysisData | null = null;
  private voiceActivityState: VoiceActivityState;
  private vadEventListeners: Partial<VoiceActivityEvents> = {};
  private silenceDetectionTimer: NodeJS.Timeout | null = null;
  private speechDetectionTimer: NodeJS.Timeout | null = null;
  private analysisTimer: NodeJS.Timeout | null = null;
  private enhancedConfig: EnhancedAudioManagerConfig;
  
  // Audio analysis buffers
  private frequencyBuffer: Uint8Array = new Uint8Array();
  private timeBuffer: Uint8Array = new Uint8Array();
  private energyHistory: number[] = [];
  private frequencyHistory: number[] = [];
  
  constructor(config?: Partial<EnhancedAudioManagerConfig>) {
    // Initialize base AudioManager with enhanced config
    const baseConfig: AudioManagerConfig = {
      enableInputGating: config?.enableInputGating ?? true,
      enableConcurrentProcessing: config?.enableConcurrentProcessing ?? false,
      chunkInterval: config?.chunkInterval ?? 100,
      audioQuality: config?.audioQuality ?? {
        sampleRate: 16000,
        audioBitsPerSecond: 128000,
      },
    };
    
    super(baseConfig);
    
    // Enhanced configuration with Phase 3 defaults
    this.enhancedConfig = {
      ...baseConfig,
      voiceActivityDetection: {
        enabled: true,
        sensitivity: 0.6,
        minSpeechDuration: 300,
        maxSilenceDuration: 800,
        energyThreshold: 0.01,
        frequencyThreshold: 85, // Hz, human speech fundamental frequency threshold
        adaptiveThreshold: true,
        ...config?.voiceActivityDetection,
      },
      silenceDetection: {
        enabled: true,
        silenceThreshold: 30, // relative to 0-255 range
        silenceDuration: 1500,
        debounceMs: 100,
        ...config?.silenceDetection,
      },
      audioAnalysis: {
        enabled: true,
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        updateInterval: 50, // 20Hz update rate
        ...config?.audioAnalysis,
      },
      enablePhase3Features: config?.enablePhase3Features ?? true,
      ...config,
    };
    
    // Initialize voice activity state
    this.voiceActivityState = {
      isActive: false,
      isSpeaking: false,
      isSilent: true,
      level: 0,
      confidence: 0,
      speechDuration: 0,
      silenceDuration: 0,
      lastActivity: Date.now(),
      adaptiveThreshold: this.enhancedConfig.voiceActivityDetection.energyThreshold,
    };
    
    this.initializeEnhancedFeatures();
  }
  
  /**
   * Initialize Phase 3 enhanced features
   */
  private initializeEnhancedFeatures(): void {
    if (!this.enhancedConfig.enablePhase3Features) {
      return;
    }
    
    console.log('EnhancedAudioManager: Initializing Phase 3 features');
    
    // Initialize audio analysis buffers
    if (this.enhancedConfig.audioAnalysis.enabled) {
      const bufferSize = this.enhancedConfig.audioAnalysis.fftSize / 2;
      this.frequencyBuffer = new Uint8Array(new ArrayBuffer(bufferSize));
      this.timeBuffer = new Uint8Array(new ArrayBuffer(this.enhancedConfig.audioAnalysis.fftSize));
    }
  }
  
  /**
   * Enhanced recording with voice activity detection
   */
  async startRecording(onDataAvailable?: (chunk: Blob) => void): Promise<void> {
    // Call parent startRecording
    await super.startRecording(onDataAvailable);
    this.recordingActive = true;
    
    if (!this.enhancedConfig.enablePhase3Features) {
      return;
    }
    
    // Initialize audio analysis if enabled
    if (this.enhancedConfig.audioAnalysis.enabled) {
      await this.initializeAudioAnalysis();
    }
    
    // Start voice activity detection
    if (this.enhancedConfig.voiceActivityDetection.enabled) {
      this.startVoiceActivityDetection();
    }
    
    // Start silence detection
    if (this.enhancedConfig.silenceDetection.enabled) {
      this.startSilenceDetection();
    }
    
    console.log('EnhancedAudioManager: Enhanced recording started');
  }
  
  /**
   * Enhanced recording stop with cleanup
   */
  stopRecording(): Blob | null {
    this.recordingActive = false;
    this.stopEnhancedFeatures();
    return super.stopRecording();
  }
  
  /**
   * Initialize audio analysis with Web Audio API
   */
  private async initializeAudioAnalysis(): Promise<void> {
    try {
      if (!this.getAudioContext() || !this.getAudioStream()) {
        throw new Error('Audio context or stream not available');
      }
      
      const audioContext = this.getAudioContext()!;
      const audioStream = this.getAudioStream()!;
      
      // Create analyser node
      this.analyser = audioContext.createAnalyser();
      this.analyser.fftSize = this.enhancedConfig.audioAnalysis.fftSize;
      this.analyser.smoothingTimeConstant = this.enhancedConfig.audioAnalysis.smoothingTimeConstant;
      
      // Connect audio stream to analyser
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(this.analyser);
      
      // Start audio analysis loop
      this.startAudioAnalysis();
      
      console.log('EnhancedAudioManager: Audio analysis initialized');
    } catch (error) {
      console.error('EnhancedAudioManager: Failed to initialize audio analysis:', error);
      throw error;
    }
  }
  
  /**
   * Start real-time audio analysis
   */
  private startAudioAnalysis(): void {
    if (!this.analyser || !this.enhancedConfig.audioAnalysis.enabled) {
      return;
    }
    
    const analyzeAudio = () => {
      if (!this.analyser || !this.isRecordingActive()) {
        return;
      }
      
      // Get frequency and time domain data
      this.analyser.getByteFrequencyData(this.frequencyBuffer);
      this.analyser.getByteTimeDomainData(this.timeBuffer);
      
      // Calculate audio analysis metrics
      const analysisData = this.calculateAudioMetrics();
      this.audioAnalysisData = analysisData;
      
      // Process voice activity detection
      if (this.enhancedConfig.voiceActivityDetection.enabled) {
        this.processVoiceActivity(analysisData);
      }
      
      // Process silence detection
      if (this.enhancedConfig.silenceDetection.enabled) {
        this.processSilenceDetection(analysisData);
      }
      
      // Emit audio level change event
      this.vadEventListeners.onAudioLevelChange?.(
        analysisData.audioLevel,
        analysisData.dominantFrequency
      );
      
      // Schedule next analysis
      this.analysisTimer = setTimeout(analyzeAudio, this.enhancedConfig.audioAnalysis.updateInterval);
    };
    
    analyzeAudio();
  }
  
  /**
   * Calculate comprehensive audio metrics
   */
  private calculateAudioMetrics(): AudioAnalysisData {
    const timestamp = Date.now();
    
    // Calculate audio level (RMS)
    let sum = 0;
    for (let i = 0; i < this.timeBuffer.length; i++) {
      const normalized = (this.timeBuffer[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const audioLevel = Math.sqrt(sum / this.timeBuffer.length);
    
    // Find dominant frequency
    let maxIndex = 0;
    let maxValue = 0;
    for (let i = 0; i < this.frequencyBuffer.length; i++) {
      if (this.frequencyBuffer[i] > maxValue) {
        maxValue = this.frequencyBuffer[i];
        maxIndex = i;
      }
    }
    const dominantFrequency = (maxIndex * this.getAudioContext()!.sampleRate) / (2 * this.frequencyBuffer.length);
    
    // Calculate spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;
    for (let i = 0; i < this.frequencyBuffer.length; i++) {
      const frequency = (i * this.getAudioContext()!.sampleRate) / (2 * this.frequencyBuffer.length);
      const magnitude = this.frequencyBuffer[i] / 255;
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Calculate zero crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < this.timeBuffer.length; i++) {
      if ((this.timeBuffer[i-1] - 128) * (this.timeBuffer[i] - 128) < 0) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / this.timeBuffer.length;
    
    // Calculate spectral rolloff (95% of energy)
    const energySum = this.frequencyBuffer.reduce((sum, val) => sum + val * val, 0);
    const targetEnergy = energySum * 0.95;
    let cumulativeEnergy = 0;
    let rolloffIndex = 0;
    for (let i = 0; i < this.frequencyBuffer.length; i++) {
      cumulativeEnergy += this.frequencyBuffer[i] * this.frequencyBuffer[i];
      if (cumulativeEnergy >= targetEnergy) {
        rolloffIndex = i;
        break;
      }
    }
    const spectralRolloff = (rolloffIndex * this.getAudioContext()!.sampleRate) / (2 * this.frequencyBuffer.length);
    
    return {
      timestamp,
      audioLevel,
      frequencyData: new Uint8Array(this.frequencyBuffer),
      timeData: new Uint8Array(this.timeBuffer),
      dominantFrequency,
      spectralCentroid,
      zeroCrossingRate,
      spectralRolloff,
    };
  }
  
  /**
   * Process voice activity detection
   */
  private processVoiceActivity(analysisData: AudioAnalysisData): void {
    const config = this.enhancedConfig.voiceActivityDetection;
    const currentTime = Date.now();
    
    // Update energy and frequency history for adaptive threshold
    this.energyHistory.push(analysisData.audioLevel);
    this.frequencyHistory.push(analysisData.dominantFrequency);
    
    // Keep only recent history (last 5 seconds)
    const maxHistoryLength = Math.floor(5000 / this.enhancedConfig.audioAnalysis.updateInterval);
    if (this.energyHistory.length > maxHistoryLength) {
      this.energyHistory.shift();
      this.frequencyHistory.shift();
    }
    
    // Adaptive threshold adjustment
    if (config.adaptiveThreshold && this.energyHistory.length > 10) {
      const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
      const stdDev = Math.sqrt(
        this.energyHistory.reduce((sum, val) => sum + Math.pow(val - avgEnergy, 2), 0) / this.energyHistory.length
      );
      this.voiceActivityState.adaptiveThreshold = avgEnergy + (stdDev * config.sensitivity);
    }
    
    // Voice activity detection logic
    const energyThreshold = this.voiceActivityState.adaptiveThreshold;
    const isEnergyAboveThreshold = analysisData.audioLevel > energyThreshold;
    const isFrequencyInSpeechRange = analysisData.dominantFrequency > config.frequencyThreshold && 
                                     analysisData.dominantFrequency < 4000; // Typical speech range
    const isZeroCrossingInRange = analysisData.zeroCrossingRate > 0.02 && analysisData.zeroCrossingRate < 0.8;
    
    // Combine multiple features for confidence
    let confidence = 0;
    if (isEnergyAboveThreshold) confidence += 0.4;
    if (isFrequencyInSpeechRange) confidence += 0.3;
    if (isZeroCrossingInRange) confidence += 0.2;
    if (analysisData.spectralCentroid > 200 && analysisData.spectralCentroid < 3000) confidence += 0.1;
    
    this.voiceActivityState.confidence = confidence;
    this.voiceActivityState.level = analysisData.audioLevel;
    
    const isSpeechDetected = confidence > config.sensitivity;
    
    // Update speech/silence durations
    if (isSpeechDetected && this.voiceActivityState.isSpeaking) {
      this.voiceActivityState.speechDuration += currentTime - this.voiceActivityState.lastActivity;
      this.voiceActivityState.silenceDuration = 0;
    } else if (!isSpeechDetected && !this.voiceActivityState.isSpeaking) {
      this.voiceActivityState.silenceDuration += currentTime - this.voiceActivityState.lastActivity;
      this.voiceActivityState.speechDuration = 0;
    }
    
    this.voiceActivityState.lastActivity = currentTime;
    
    // State transitions with duration thresholds
    if (!this.voiceActivityState.isSpeaking && isSpeechDetected) {
      // Check minimum speech duration before declaring speech start
      if (this.voiceActivityState.speechDuration === 0) {
        this.voiceActivityState.speechDuration = 0;
      }
      
      // Use a timer to ensure minimum speech duration
      if (this.speechDetectionTimer) {
        clearTimeout(this.speechDetectionTimer);
      }
      
      this.speechDetectionTimer = setTimeout(() => {
        if (!this.voiceActivityState.isSpeaking && confidence > config.sensitivity) {
          this.voiceActivityState.isActive = true;
          this.voiceActivityState.isSpeaking = true;
          this.voiceActivityState.isSilent = false;
          this.vadEventListeners.onSpeechStart?.();
          this.vadEventListeners.onVoiceActivityChange?.(true, confidence);
          
          // Emit speech start event
          this.emitSpeechEvent('speechStart');
        }
      }, config.minSpeechDuration);
      
    } else if (this.voiceActivityState.isSpeaking && !isSpeechDetected) {
      // Check silence duration before declaring speech end
      if (this.silenceDetectionTimer) {
        clearTimeout(this.silenceDetectionTimer);
      }
      
      this.silenceDetectionTimer = setTimeout(() => {
        if (this.voiceActivityState.isSpeaking) {
          this.voiceActivityState.isActive = false;
          this.voiceActivityState.isSpeaking = false;
          this.voiceActivityState.isSilent = true;
          this.vadEventListeners.onSpeechEnd?.();
          this.vadEventListeners.onVoiceActivityChange?.(false, confidence);
          
          // Emit speech end event
          this.emitSpeechEvent('speechEnd');
        }
      }, config.maxSilenceDuration);
    }
  }
  
  /**
   * Process silence detection
   */
  private processSilenceDetection(analysisData: AudioAnalysisData): void {
    const config = this.enhancedConfig.silenceDetection;
    const averageLevel = this.frequencyBuffer.reduce((a, b) => a + b, 0) / this.frequencyBuffer.length;
    
    const isSilent = averageLevel < config.silenceThreshold;
    
    if (isSilent !== this.voiceActivityState.isSilent) {
      // Debounce silence detection
      if (this.silenceDetectionTimer) {
        clearTimeout(this.silenceDetectionTimer);
      }
      
      this.silenceDetectionTimer = setTimeout(() => {
        if (isSilent !== this.voiceActivityState.isSilent) {
          this.voiceActivityState.isSilent = isSilent;
          
          if (isSilent) {
            this.vadEventListeners.onSilenceStart?.();
            this.emitSpeechEvent('silenceStart');
          } else {
            this.vadEventListeners.onSilenceEnd?.();
            this.emitSpeechEvent('silenceEnd');
          }
        }
      }, config.debounceMs);
    }
  }
  
  /**
   * Start voice activity detection
   */
  private startVoiceActivityDetection(): void {
    console.log('EnhancedAudioManager: Voice activity detection started');
  }
  
  /**
   * Start silence detection
   */
  private startSilenceDetection(): void {
    console.log('EnhancedAudioManager: Silence detection started');
  }
  
  /**
   * Stop all enhanced features
   */
  private stopEnhancedFeatures(): void {
    // Clear timers
    if (this.silenceDetectionTimer) {
      clearTimeout(this.silenceDetectionTimer);
      this.silenceDetectionTimer = null;
    }
    
    if (this.speechDetectionTimer) {
      clearTimeout(this.speechDetectionTimer);
      this.speechDetectionTimer = null;
    }
    
    if (this.analysisTimer) {
      clearTimeout(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    // Reset state
    this.voiceActivityState = {
      isActive: false,
      isSpeaking: false,
      isSilent: true,
      level: 0,
      confidence: 0,
      speechDuration: 0,
      silenceDuration: 0,
      lastActivity: Date.now(),
      adaptiveThreshold: this.enhancedConfig.voiceActivityDetection.energyThreshold,
    };
    
    // Clear history buffers
    this.energyHistory = [];
    this.frequencyHistory = [];
    
    console.log('EnhancedAudioManager: Enhanced features stopped');
  }
  
  /**
   * Emit speech events for integration with existing systems
   */
  private emitSpeechEvent(eventType: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventType, {
        detail: {
          voiceActivityState: { ...this.voiceActivityState },
          audioAnalysis: this.audioAnalysisData ? { ...this.audioAnalysisData } : null,
          timestamp: Date.now(),
        }
      }));
    }
  }
  
  // Public API methods
  
  /**
   * Register voice activity event listeners
   */
  setVoiceActivityListeners(listeners: Partial<VoiceActivityEvents>): void {
    this.vadEventListeners = { ...this.vadEventListeners, ...listeners };
  }
  
  /**
   * Get current voice activity state
   */
  getVoiceActivityState(): VoiceActivityState {
    return { ...this.voiceActivityState };
  }
  
  /**
   * Get current audio analysis data
   */
  getAudioAnalysisData(): AudioAnalysisData | null {
    return this.audioAnalysisData ? { ...this.audioAnalysisData } : null;
  }
  
  /**
   * Update enhanced configuration
   */
  updateEnhancedConfig(config: Partial<EnhancedAudioManagerConfig>): void {
    this.enhancedConfig = { ...this.enhancedConfig, ...config };
    
    // Update base config
    this.updateConfig(config);
    
    // Reinitialize features if needed
    if (this.isRecordingActive() && config.enablePhase3Features !== undefined) {
      if (config.enablePhase3Features) {
        this.initializeEnhancedFeatures();
      } else {
        this.stopEnhancedFeatures();
      }
    }
  }
  
  /**
   * Get enhanced configuration
   */
  getEnhancedConfig(): EnhancedAudioManagerConfig {
    return { ...this.enhancedConfig };
  }
  
  /**
   * Check if speaking is currently detected
   */
  isSpeaking(): boolean {
    return this.voiceActivityState.isSpeaking;
  }
  
  /**
   * Check if silence is currently detected
   */
  isSilent(): boolean {
    return this.voiceActivityState.isSilent;
  }
  
  /**
   * Get current speech confidence
   */
  getSpeechConfidence(): number {
    return this.voiceActivityState.confidence;
  }

  /**
   * Stop voice activity detection
   */
  stopVoiceActivityDetection(): void {
    try {
      if (this.speechDetectionTimer) {
        clearTimeout(this.speechDetectionTimer);
        this.speechDetectionTimer = null;
      }
      
      if (this.silenceDetectionTimer) {
        clearTimeout(this.silenceDetectionTimer);
        this.silenceDetectionTimer = null;
      }
      
      if (this.analysisTimer) {
        clearTimeout(this.analysisTimer);
        this.analysisTimer = null;
      }
      
      // Reset voice activity state
      this.voiceActivityState = {
        isActive: false,
        isSpeaking: false,
        isSilent: true,
        level: 0,
        confidence: 0,
        speechDuration: 0,
        silenceDuration: 0,
        lastActivity: Date.now(),
        adaptiveThreshold: this.enhancedConfig.voiceActivityDetection.energyThreshold,
      };
      
      console.log('EnhancedAudioManager: Voice activity detection stopped');
    } catch (error) {
      console.error('EnhancedAudioManager: Error stopping voice activity detection:', error);
    }
  }

  /**
   * Update buffer configuration
   */
  updateBufferConfig(config: Partial<{ bufferSize: number; sampleRate: number; channels: number }>): void {
    try {
      if (config.bufferSize && config.bufferSize > 0) {
        this.enhancedConfig.audioAnalysis.bufferSize = config.bufferSize;
      }
      
      if (config.sampleRate && config.sampleRate > 0) {
        this.enhancedConfig.audioAnalysis.sampleRate = config.sampleRate;
      }
      
      if (config.channels && config.channels > 0) {
        this.enhancedConfig.audioAnalysis.channels = config.channels;
      }
      
      // Reinitialize buffers with new configuration
      this.initializeAudioAnalysis();
      
      console.log('EnhancedAudioManager: Buffer configuration updated:', config);
    } catch (error) {
      console.error('EnhancedAudioManager: Error updating buffer configuration:', error);
    }
  }
  
  // Private helper methods to access parent protected members
  private getAudioContext(): AudioContext | null {
    return (this as any).audioContext;
  }
  
  private getAudioStream(): MediaStream | null {
    return (this as any).audioStream;
  }
}

// Export enhanced singleton instance
export const enhancedAudioManager = new EnhancedAudioManager();