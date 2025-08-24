/**
 * Audio Processing Configuration Management
 * 
 * Centralized configuration system for all audio processing components.
 * Provides presets, validation, and dynamic configuration updates.
 */

import { AudioChunkBufferConfig } from './AudioChunkBuffer';
import { VADConfig } from './VoiceActivityDetection';
import { AudioFormat, ConversionOptions } from './AudioFormatConverter';
import { SegmentExtractionConfig } from './AudioSegmentExtractor';
import { EnhancedAudioConfig } from './EnhancedAudioProcessor';

export interface AudioProcessingPreset {
  name: string;
  description: string;
  useCase: string;
  config: EnhancedAudioConfig;
}

export interface QualityThresholds {
  // Signal quality thresholds
  minSNR: number; // Minimum signal-to-noise ratio (0-1)
  minVolume: number; // Minimum volume level (0-1)
  minClarity: number; // Minimum clarity score (0-1)
  minVoiceActivity: number; // Minimum voice activity ratio (0-1)
  minOverallQuality: number; // Minimum overall quality score (0-1)
  
  // Duration thresholds
  minSegmentDuration: number; // Minimum segment duration (ms)
  maxSegmentDuration: number; // Maximum segment duration (ms)
  optimalSegmentDuration: number; // Optimal segment duration (ms)
  
  // Confidence thresholds
  minSpeakerConfidence: number; // Minimum speaker identification confidence
  minTranscriptConfidence: number; // Minimum transcription confidence
  
  // Processing thresholds
  maxProcessingTime: number; // Maximum processing time per chunk (ms)
  maxMemoryUsage: number; // Maximum memory usage (bytes)
}

export interface PerformanceSettings {
  // Processing optimization
  enableRealtimeProcessing: boolean;
  processingBatchSize: number;
  processingInterval: number; // ms
  
  // Memory management
  maxBufferSize: number; // bytes
  cacheCleanupInterval: number; // ms
  enableMemoryOptimization: boolean;
  
  // Concurrency settings
  maxConcurrentProcessing: number;
  enableBackgroundProcessing: boolean;
  
  // Quality vs Performance tradeoffs
  qualityLevel: 'low' | 'medium' | 'high' | 'maximum';
  enableAggresiveOptimization: boolean;
}

export interface AudioProcessingConfig {
  // Core configurations
  bufferConfig: AudioChunkBufferConfig;
  vadConfig: VADConfig;
  extractionConfig: SegmentExtractionConfig;
  enhancedConfig: EnhancedAudioConfig;
  
  // Quality and performance settings
  qualityThresholds: QualityThresholds;
  performanceSettings: PerformanceSettings;
  
  // Output format preferences
  outputFormats: {
    voiceIdentification: AudioFormat;
    storage: AudioFormat;
    playback: AudioFormat;
  };
  
  // Validation and constraints
  constraints: {
    maxFileSize: number; // bytes
    maxDuration: number; // ms
    supportedFormats: string[];
    allowedSampleRates: number[];
  };
}

export class AudioProcessingConfigManager {
  private config: AudioProcessingConfig;
  private presets: Map<string, AudioProcessingPreset> = new Map();
  private currentPreset: string | null = null;
  
  // Configuration change callbacks
  private configChangeCallbacks: Set<(config: AudioProcessingConfig) => void> = new Set();

  constructor(initialConfig?: Partial<AudioProcessingConfig>) {
    this.config = this.createDefaultConfig();
    if (initialConfig) {
      this.updateConfig(initialConfig);
    }
    
    this.initializePresets();
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): AudioProcessingConfig {
    return {
      bufferConfig: {
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
          minDuration: 3000,
          maxDuration: 15000,
          silenceThreshold: 0.02,
          silenceDuration: 1500,
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
      },
      vadConfig: {
        frameSize: 512,
        hopSize: 256,
        sampleRate: 16000,
        energyThreshold: 0.01,
        zcRateThreshold: 0.3,
        spectralThreshold: 1000,
        confidenceThreshold: 0.5,
        minVoiceDuration: 100,
        minSilenceDuration: 200,
        hangoverFrames: 5,
        lookAheadFrames: 3,
        enableSpectralAnalysis: true,
        enableAdaptiveThreshold: true,
        enableSmoothing: true,
        smoothingWindow: 5,
      },
      extractionConfig: {
        bufferConfig: {},
        vadConfig: {},
        realtimeProcessing: true,
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
        processingBatchSize: 5,
        maxMemoryUsage: 100 * 1024 * 1024
      },
      enhancedConfig: {
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
        segmentExtraction: {},
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
          cacheSize: 50 * 1024 * 1024,
          autoCleanup: true,
          cleanupInterval: 300000,
        },
        // realtimeProcessing: true, // Property not defined in EnhancedAudioConfig type
        // processingBatchSize: 5, // Property not defined in EnhancedAudioConfig type
        // maxMemoryUsage: 100 * 1024 * 1024, // Property not defined in EnhancedAudioConfig type
      },
      qualityThresholds: {
        minSNR: 0.3,
        minVolume: 0.05,
        minClarity: 0.4,
        minVoiceActivity: 0.6,
        minOverallQuality: 0.5,
        minSegmentDuration: 3000,
        maxSegmentDuration: 15000,
        optimalSegmentDuration: 8000,
        minSpeakerConfidence: 0.7,
        minTranscriptConfidence: 0.8,
        maxProcessingTime: 1000,
        maxMemoryUsage: 100 * 1024 * 1024,
      },
      performanceSettings: {
        enableRealtimeProcessing: true,
        processingBatchSize: 5,
        processingInterval: 100,
        maxBufferSize: 50 * 1024 * 1024,
        cacheCleanupInterval: 300000,
        enableMemoryOptimization: true,
        maxConcurrentProcessing: 3,
        enableBackgroundProcessing: true,
        qualityLevel: 'medium',
        enableAggresiveOptimization: false,
      },
      outputFormats: {
        voiceIdentification: {
          mimeType: 'audio/webm;codecs=opus',
          codec: 'opus',
          sampleRate: 16000,
          channels: 1,
          bitRate: 64000,
        },
        storage: {
          mimeType: 'audio/webm;codecs=opus',
          codec: 'opus',
          sampleRate: 16000,
          channels: 1,
          bitRate: 32000,
        },
        playback: {
          mimeType: 'audio/webm;codecs=opus',
          codec: 'opus',
          sampleRate: 48000,
          channels: 2,
          bitRate: 192000,
        },
      },
      constraints: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxDuration: 300000, // 5 minutes
        supportedFormats: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'],
        allowedSampleRates: [8000, 16000, 22050, 44100, 48000],
      },
    };
  }

  /**
   * Initialize predefined configuration presets
   */
  private initializePresets(): void {
    // High Quality Preset
    this.presets.set('high-quality', {
      name: 'High Quality',
      description: 'Maximum quality settings for critical voice identification',
      useCase: 'High-stakes meetings, legal proceedings, medical consultations',
      config: this.createHighQualityConfig(),
    });

    // Performance Optimized Preset
    this.presets.set('performance', {
      name: 'Performance Optimized',
      description: 'Optimized for speed and low resource usage',
      useCase: 'Large meetings, resource-constrained environments',
      config: this.createPerformanceConfig(),
    });

    // Balanced Preset
    this.presets.set('balanced', {
      name: 'Balanced',
      description: 'Good balance between quality and performance',
      useCase: 'General meetings, daily conversations',
      config: this.createBalancedConfig(),
    });

    // Mobile Optimized Preset
    this.presets.set('mobile', {
      name: 'Mobile Optimized',
      description: 'Optimized for mobile devices and poor network conditions',
      useCase: 'Mobile meetings, low bandwidth situations',
      config: this.createMobileConfig(),
    });

    // Debug/Development Preset
    this.presets.set('debug', {
      name: 'Debug/Development',
      description: 'Enhanced logging and debugging features',
      useCase: 'Development, testing, troubleshooting',
      config: this.createDebugConfig(),
    });
  }

  /**
   * Create high quality configuration
   */
  private createHighQualityConfig(): EnhancedAudioConfig {
    const baseConfig = this.createDefaultConfig().enhancedConfig;
    return {
      ...baseConfig,
      audioManager: {
        ...baseConfig.audioManager,
        audioQuality: {
          sampleRate: 48000,
          audioBitsPerSecond: 256000,
        },
        voiceActivityDetection: {
          enabled: true,
          threshold: 0.03, // More sensitive
          minSilenceDuration: 300,
          bufferSilentChunks: 3,
        },
      },
      segmentExtraction: {
        ...baseConfig.segmentExtraction,
        extractionSettings: {
          minSegmentDuration: 5000, // Longer segments for better quality
          maxSegmentDuration: 20000,
          qualityThreshold: 0.8, // Higher quality threshold
          maxSegmentsPerSpeaker: 15,
          segmentOverlap: 1000,
        },
        outputFormat: {
          mimeType: 'audio/webm;codecs=opus',
          codec: 'opus',
          sampleRate: 48000,
          channels: 1,
          bitRate: 128000,
        },
        conversionOptions: {
          quality: 'high',
          normalize: true,
          removeNoise: true,
          trimSilence: false,
        },
      },
      integration: {
        ...baseConfig.integration,
        uploadQualityThreshold: 0.8,
      },
      voiceIdentification: {
        ...baseConfig.voiceIdentification,
        qualityThreshold: 0.8,
        targetSamplesPerSpeaker: 8,
      },
    };
  }

  /**
   * Create performance optimized configuration
   */
  private createPerformanceConfig(): EnhancedAudioConfig {
    const baseConfig = this.createDefaultConfig().enhancedConfig;
    return {
      ...baseConfig,
      audioManager: {
        ...baseConfig.audioManager,
        chunkInterval: 200, // Larger chunks for efficiency
        audioQuality: {
          sampleRate: 16000,
          audioBitsPerSecond: 64000,
        },
        voiceActivityDetection: {
          enabled: true,
          threshold: 0.08, // Less sensitive for performance
          minSilenceDuration: 1000,
          bufferSilentChunks: 8,
        },
      },
      segmentExtraction: {
        ...baseConfig.segmentExtraction,
        extractionSettings: {
          minSegmentDuration: 2000, // Shorter processing time
          maxSegmentDuration: 10000,
          qualityThreshold: 0.3, // Lower quality for speed
          maxSegmentsPerSpeaker: 5,
          segmentOverlap: 200,
        },
        processingBatchSize: 10, // Larger batches
        maxMemoryUsage: 50 * 1024 * 1024, // Smaller memory footprint
      },
      integration: {
        ...baseConfig.integration,
        uploadQualityThreshold: 0.4,
      },
      voiceIdentification: {
        ...baseConfig.voiceIdentification,
        qualityThreshold: 0.4,
        targetSamplesPerSpeaker: 3,
      },
      storage: {
        ...baseConfig.storage,
        cacheSize: 25 * 1024 * 1024,
        cleanupInterval: 60000, // More frequent cleanup
      },
    };
  }

  /**
   * Create balanced configuration
   */
  private createBalancedConfig(): EnhancedAudioConfig {
    return this.createDefaultConfig().enhancedConfig;
  }

  /**
   * Create mobile optimized configuration
   */
  private createMobileConfig(): EnhancedAudioConfig {
    const baseConfig = this.createDefaultConfig().enhancedConfig;
    return {
      ...baseConfig,
      audioManager: {
        ...baseConfig.audioManager,
        chunkInterval: 250,
        audioQuality: {
          sampleRate: 16000,
          audioBitsPerSecond: 32000, // Very low bitrate
        },
        voiceActivityDetection: {
          enabled: true,
          threshold: 0.1, // Less sensitive for noisy mobile environments
          minSilenceDuration: 1500,
          bufferSilentChunks: 10,
        },
      },
      segmentExtraction: {
        ...baseConfig.segmentExtraction,
        extractionSettings: {
          minSegmentDuration: 2500,
          maxSegmentDuration: 8000, // Shorter for mobile processing
          qualityThreshold: 0.35,
          maxSegmentsPerSpeaker: 4,
          segmentOverlap: 300,
        },
        outputFormat: {
          mimeType: 'audio/webm;codecs=opus',
          codec: 'opus',
          sampleRate: 16000,
          channels: 1,
          bitRate: 24000, // Very low bitrate
        },
        maxMemoryUsage: 25 * 1024 * 1024, // Small memory footprint
      },
      storage: {
        ...baseConfig.storage,
        cacheSize: 10 * 1024 * 1024, // Very small cache
        cleanupInterval: 30000, // Frequent cleanup
      },
    };
  }

  /**
   * Create debug configuration
   */
  private createDebugConfig(): EnhancedAudioConfig {
    const baseConfig = this.createDefaultConfig().enhancedConfig;
    return {
      ...baseConfig,
      segmentExtraction: {
        ...baseConfig.segmentExtraction,
        extractionSettings: {
          minSegmentDuration: baseConfig.segmentExtraction?.extractionSettings?.minSegmentDuration || 3000,
          maxSegmentDuration: baseConfig.segmentExtraction?.extractionSettings?.maxSegmentDuration || 15000,
          qualityThreshold: baseConfig.segmentExtraction?.extractionSettings?.qualityThreshold || 0.5,
          segmentOverlap: baseConfig.segmentExtraction?.extractionSettings?.segmentOverlap || 500,
          maxSegmentsPerSpeaker: 50, // Keep more segments for analysis
        },
      },
      storage: {
        ...baseConfig.storage,
        enableLocalCache: true,
        cacheSize: 200 * 1024 * 1024, // Large cache for debugging
        autoCleanup: false, // Don't auto-cleanup for debugging
      },
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): AudioProcessingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<AudioProcessingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
    this.notifyConfigChange();
  }

  /**
   * Apply a preset configuration
   */
  public applyPreset(presetName: string): boolean {
    const preset = this.presets.get(presetName);
    if (!preset) {
      console.error(`Preset '${presetName}' not found`);
      return false;
    }

    this.config.enhancedConfig = preset.config;
    this.currentPreset = presetName;
    this.validateConfig();
    this.notifyConfigChange();
    
    console.log(`Applied preset: ${preset.name} - ${preset.description}`);
    return true;
  }

  /**
   * Get available presets
   */
  public getPresets(): AudioProcessingPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get current preset name
   */
  public getCurrentPreset(): string | null {
    return this.currentPreset;
  }

  /**
   * Create custom preset from current configuration
   */
  public createCustomPreset(name: string, description: string, useCase: string): void {
    const preset: AudioProcessingPreset = {
      name,
      description,
      useCase,
      config: { ...this.config.enhancedConfig },
    };
    
    this.presets.set(name.toLowerCase().replace(/\s+/g, '-'), preset);
    console.log(`Created custom preset: ${name}`);
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const config = this.config;
    
    // Validate quality thresholds
    const qt = config.qualityThresholds;
    if (qt.minSNR < 0 || qt.minSNR > 1) {
      console.warn('Invalid minSNR value, using default');
      qt.minSNR = 0.3;
    }
    
    if (qt.minSegmentDuration > qt.maxSegmentDuration) {
      console.warn('minSegmentDuration cannot be greater than maxSegmentDuration');
      qt.minSegmentDuration = Math.min(qt.minSegmentDuration, qt.maxSegmentDuration - 1000);
    }
    
    // Validate performance settings
    const ps = config.performanceSettings;
    if (ps.processingBatchSize < 1) {
      console.warn('processingBatchSize must be at least 1');
      ps.processingBatchSize = 1;
    }
    
    if (ps.maxBufferSize < 1024 * 1024) {
      console.warn('maxBufferSize too small, using minimum 1MB');
      ps.maxBufferSize = 1024 * 1024;
    }
    
    // Validate constraints
    const constraints = config.constraints;
    if (constraints.maxFileSize < 1024 * 1024) {
      console.warn('maxFileSize too small, using minimum 1MB');
      constraints.maxFileSize = 1024 * 1024;
    }
  }

  /**
   * Get configuration for specific component
   */
  public getBufferConfig(): AudioChunkBufferConfig {
    return this.config.bufferConfig;
  }

  public getVADConfig(): VADConfig {
    return this.config.vadConfig;
  }

  public getExtractionConfig(): SegmentExtractionConfig {
    return this.config.extractionConfig;
  }

  public getEnhancedConfig(): EnhancedAudioConfig {
    return this.config.enhancedConfig;
  }

  public getQualityThresholds(): QualityThresholds {
    return this.config.qualityThresholds;
  }

  public getPerformanceSettings(): PerformanceSettings {
    return this.config.performanceSettings;
  }

  /**
   * Auto-tune configuration based on system capabilities
   */
  public autoTuneForSystem(): void {
    const navigator = typeof window !== 'undefined' ? window.navigator : null;
    
    if (!navigator) {
      console.log('Auto-tuning skipped: running in non-browser environment');
      return;
    }

    // Detect system capabilities
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 4; // GB
    const connection = (navigator as any).connection;
    
    console.log(`Auto-tuning for system: ${hardwareConcurrency} cores, ${memory}GB memory`);
    
    // Adjust based on CPU cores
    if (hardwareConcurrency >= 8) {
      this.config.performanceSettings.maxConcurrentProcessing = 5;
      this.config.performanceSettings.processingBatchSize = 8;
    } else if (hardwareConcurrency >= 4) {
      this.config.performanceSettings.maxConcurrentProcessing = 3;
      this.config.performanceSettings.processingBatchSize = 5;
    } else {
      this.config.performanceSettings.maxConcurrentProcessing = 2;
      this.config.performanceSettings.processingBatchSize = 3;
    }
    
    // Adjust based on memory
    if (memory >= 8) {
      this.config.performanceSettings.maxBufferSize = 100 * 1024 * 1024; // 100MB
      this.config.enhancedConfig.storage!.cacheSize = 80 * 1024 * 1024; // 80MB
    } else if (memory >= 4) {
      this.config.performanceSettings.maxBufferSize = 50 * 1024 * 1024; // 50MB
      this.config.enhancedConfig.storage!.cacheSize = 40 * 1024 * 1024; // 40MB
    } else {
      this.config.performanceSettings.maxBufferSize = 25 * 1024 * 1024; // 25MB
      this.config.enhancedConfig.storage!.cacheSize = 20 * 1024 * 1024; // 20MB
    }
    
    // Adjust based on network connection
    if (connection) {
      if (connection.effectiveType === '4g' || connection.effectiveType === '5g') {
        // High-speed connection: enable higher quality
        this.config.enhancedConfig.integration!.uploadQualityThreshold = 0.7;
      } else if (connection.effectiveType === '3g') {
        // Medium connection: balanced settings
        this.config.enhancedConfig.integration!.uploadQualityThreshold = 0.5;
      } else {
        // Slow connection: optimize for bandwidth
        this.config.enhancedConfig.integration!.uploadQualityThreshold = 0.3;
        this.applyPreset('mobile');
        return; // Mobile preset handles the rest
      }
    }
    
    this.validateConfig();
    this.notifyConfigChange();
    console.log('Auto-tuning completed');
  }

  /**
   * Register for configuration change notifications
   */
  public onConfigChange(callback: (config: AudioProcessingConfig) => void): () => void {
    this.configChangeCallbacks.add(callback);
    return () => this.configChangeCallbacks.delete(callback);
  }

  /**
   * Notify configuration change callbacks
   */
  private notifyConfigChange(): void {
    this.configChangeCallbacks.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in config change callback:', error);
      }
    });
  }

  /**
   * Export configuration as JSON
   */
  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson) as Partial<AudioProcessingConfig>;
      this.updateConfig(importedConfig);
      this.currentPreset = null; // Clear preset since we imported custom config
      console.log('Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }

  /**
   * Reset to default configuration
   */
  public resetToDefault(): void {
    this.config = this.createDefaultConfig();
    this.currentPreset = null;
    this.notifyConfigChange();
    console.log('Configuration reset to default');
  }

  /**
   * Get configuration summary
   */
  public getConfigSummary(): {
    preset: string | null;
    qualityLevel: string;
    realtimeProcessing: boolean;
    memoryUsage: string;
    outputFormat: string;
  } {
    const config = this.config;
    return {
      preset: this.currentPreset,
      qualityLevel: config.performanceSettings.qualityLevel,
      realtimeProcessing: config.performanceSettings.enableRealtimeProcessing,
      memoryUsage: `${Math.round(config.performanceSettings.maxBufferSize / (1024 * 1024))}MB`,
      outputFormat: config.outputFormats.voiceIdentification.mimeType,
    };
  }
}

/**
 * Factory function to create configuration manager
 */
export function createAudioProcessingConfig(
  initialConfig?: Partial<AudioProcessingConfig>
): AudioProcessingConfigManager {
  return new AudioProcessingConfigManager(initialConfig);
}

/**
 * Singleton instance for global configuration management
 */
export const audioProcessingConfig = new AudioProcessingConfigManager();