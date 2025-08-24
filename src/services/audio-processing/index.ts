/**
 * Audio Processing Module
 * 
 * Comprehensive audio chunk collection and processing system for voice identification.
 * Provides advanced audio buffering, quality analysis, VAD, format conversion,
 * and segment extraction capabilities.
 */

// Core components
export { AudioChunkBuffer, createAudioChunkBuffer } from './AudioChunkBuffer';
export type { 
  AudioChunk, 
  AudioQualityMetrics, 
  AudioSegment, 
  AudioChunkBufferConfig 
} from './AudioChunkBuffer';

export { VoiceActivityDetection, createVoiceActivityDetection } from './VoiceActivityDetection';
export type { 
  VADFrame, 
  VADSegment, 
  VADConfig, 
  VADStats 
} from './VoiceActivityDetection';

export { AudioFormatConverter, createAudioFormatConverter, AudioFormatUtils } from './AudioFormatConverter';
export type { 
  AudioFormat, 
  ConversionResult, 
  AudioMetadata 
} from './AudioFormatConverter';
import type { ConversionOptions } from './AudioFormatConverter';
import { AudioFormatUtils as FormatUtils } from './AudioFormatConverter';
export type { ConversionOptions };

export { AudioSegmentExtractor, createAudioSegmentExtractor } from './AudioSegmentExtractor';
export type { 
  ExtractedSegment, 
  SpeakerChangeEvent, 
  ExtractionStats 
} from './AudioSegmentExtractor';
import type { SegmentExtractionConfig } from './AudioSegmentExtractor';
import { AudioSegmentExtractor, createAudioSegmentExtractor } from './AudioSegmentExtractor';
export type { SegmentExtractionConfig };

export { EnhancedAudioProcessor, createEnhancedAudioProcessor } from './EnhancedAudioProcessor';
export type { 
  EnhancedAudioConfig, 
  ProcessingStats 
} from './EnhancedAudioProcessor';
import { EnhancedAudioProcessor, createEnhancedAudioProcessor } from './EnhancedAudioProcessor';

// Configuration management
export { 
  AudioProcessingConfigManager, 
  createAudioProcessingConfig, 
  audioProcessingConfig 
} from './AudioProcessingConfig';
export type { 
  AudioProcessingPreset, 
  QualityThresholds, 
  PerformanceSettings 
} from './AudioProcessingConfig';
import { AudioProcessingConfigManager, createAudioProcessingConfig } from './AudioProcessingConfig';

/**
 * Utility functions for common audio processing tasks
 */
export const AudioProcessingUtils = {
  /**
   * Create a standard configuration for voice identification
   */
  createVoiceIDConfig(): SegmentExtractionConfig {
    return {
      bufferConfig: {
        qualityThresholds: {
          minSNR: 0.4,
          minVolume: 0.1,
          minClarity: 0.5,
          minVoiceActivity: 0.7,
          minOverallQuality: 0.6,
        },
        segmentConfig: {
          minDuration: 3000,
          maxDuration: 12000,
          silenceThreshold: 0.02,
          silenceDuration: 1000,
        },
      },
      vadConfig: {
        energyThreshold: 0.015,
        confidenceThreshold: 0.6,
        enableAdaptiveThreshold: true,
        enableSpectralAnalysis: true,
      },
      extractionSettings: {
        minSegmentDuration: 3000,
        maxSegmentDuration: 12000,
        qualityThreshold: 0.6,
        maxSegmentsPerSpeaker: 8,
        segmentOverlap: 500,
      },
      speakerChangeDetection: {
        enabled: true,
        confidenceThreshold: 0.75,
        transitionGracePeriod: 800,
        forceSegmentOnChange: true,
      },
      outputFormat: FormatUtils.getVoiceIDFormat(),
      conversionOptions: {
        quality: 'medium',
        normalize: true,
        removeNoise: true,
        trimSilence: false,
      },
      realtimeProcessing: true,
      processingBatchSize: 3,
      maxMemoryUsage: 75 * 1024 * 1024, // 75MB
    };
  },

  /**
   * Create a configuration optimized for storage
   */
  createStorageOptimizedConfig(): SegmentExtractionConfig {
    return {
      bufferConfig: {
        qualityThresholds: {
          minSNR: 0.25,
          minVolume: 0.05,
          minClarity: 0.3,
          minVoiceActivity: 0.5,
          minOverallQuality: 0.4,
        },
      },
      vadConfig: {}, // Use defaults
      extractionSettings: {
        minSegmentDuration: 2000,
        maxSegmentDuration: 10000,
        qualityThreshold: 0.4,
        maxSegmentsPerSpeaker: 5,
        segmentOverlap: 200,
      },
      speakerChangeDetection: {
        enabled: true,
        confidenceThreshold: 0.7,
        transitionGracePeriod: 1000,
        forceSegmentOnChange: false,
      },
      outputFormat: FormatUtils.getStorageOptimizedFormat(),
      conversionOptions: {
        quality: 'low',
        normalize: true,
        removeNoise: true,
        trimSilence: true,
      },
      realtimeProcessing: false,
      processingBatchSize: 10,
      maxMemoryUsage: 25 * 1024 * 1024, // 25MB
    };
  },

  /**
   * Create a high-performance configuration
   */
  createHighPerformanceConfig(): SegmentExtractionConfig {
    return {
      bufferConfig: {
        maxChunksPerSpeaker: 50,
        maxBufferSizeBytes: 30 * 1024 * 1024, // 30MB
        enableRealtimeProcessing: true,
        processingInterval: 50, // Faster processing
      },
      vadConfig: {
        frameSize: 256, // Smaller frames for faster processing
        hopSize: 128,
        enableSpectralAnalysis: false, // Disable for performance
        enableSmoothing: false,
      },
      extractionSettings: {
        minSegmentDuration: 1500,
        maxSegmentDuration: 8000,
        qualityThreshold: 0.3,
        maxSegmentsPerSpeaker: 4,
        segmentOverlap: 100,
      },
      speakerChangeDetection: {
        enabled: true,
        confidenceThreshold: 0.6,
        transitionGracePeriod: 500,
        forceSegmentOnChange: false,
      },
      outputFormat: {
        mimeType: 'audio/webm;codecs=opus',
        codec: 'opus',
        sampleRate: 16000,
        channels: 1,
        bitRate: 32000, // Lower bitrate for performance
      },
      conversionOptions: {
        quality: 'low',
        normalize: false,
        removeNoise: false,
        trimSilence: false,
      },
      realtimeProcessing: true,
      processingBatchSize: 8, // Larger batches
      maxMemoryUsage: 30 * 1024 * 1024,
    };
  },

  /**
   * Validate audio processing configuration
   */
  validateConfig(config: SegmentExtractionConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate extraction settings
    if (config.extractionSettings) {
      const settings = config.extractionSettings;
      
      if (settings.minSegmentDuration >= settings.maxSegmentDuration) {
        errors.push('minSegmentDuration must be less than maxSegmentDuration');
      }
      
      if (settings.qualityThreshold < 0 || settings.qualityThreshold > 1) {
        errors.push('qualityThreshold must be between 0 and 1');
      }
      
      if (settings.maxSegmentsPerSpeaker < 1) {
        errors.push('maxSegmentsPerSpeaker must be at least 1');
      }
      
      if (settings.minSegmentDuration < 1000) {
        warnings.push('minSegmentDuration below 1 second may result in poor quality segments');
      }
    }

    // Validate buffer config
    if (config.bufferConfig?.qualityThresholds) {
      const qt = config.bufferConfig.qualityThresholds;
      
      Object.entries(qt).forEach(([key, value]) => {
        if (key.startsWith('min') && (typeof value !== 'number' || value < 0 || value > 1)) {
          errors.push(`${key} must be a number between 0 and 1`);
        }
      });
    }

    // Validate VAD config
    if (config.vadConfig) {
      const vad = config.vadConfig;
      
      if (vad.frameSize && vad.frameSize < 64) {
        warnings.push('VAD frameSize below 64 may cause instability');
      }
      
      if (vad.energyThreshold && (vad.energyThreshold < 0 || vad.energyThreshold > 1)) {
        errors.push('VAD energyThreshold must be between 0 and 1');
      }
    }

    // Validate memory usage
    if (config.maxMemoryUsage && config.maxMemoryUsage < 10 * 1024 * 1024) {
      warnings.push('maxMemoryUsage below 10MB may cause processing issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Calculate optimal configuration based on requirements
   */
  calculateOptimalConfig(requirements: {
    targetQuality: 'low' | 'medium' | 'high';
    maxMemoryMB: number;
    realtimeRequired: boolean;
    speakerCount?: number;
  }): SegmentExtractionConfig {
    const { targetQuality, maxMemoryMB, realtimeRequired, speakerCount = 4 } = requirements;
    
    const baseConfig = AudioProcessingUtils.createVoiceIDConfig();
    
    // Adjust based on quality requirements
    switch (targetQuality) {
      case 'high':
        baseConfig.extractionSettings!.qualityThreshold = 0.8;
        baseConfig.extractionSettings!.maxSegmentsPerSpeaker = 10;
        baseConfig.bufferConfig!.qualityThresholds!.minOverallQuality = 0.7;
        baseConfig.outputFormat = FormatUtils.getHighQualityFormat();
        break;
        
      case 'low':
        baseConfig.extractionSettings!.qualityThreshold = 0.3;
        baseConfig.extractionSettings!.maxSegmentsPerSpeaker = 3;
        baseConfig.bufferConfig!.qualityThresholds!.minOverallQuality = 0.3;
        baseConfig.outputFormat = FormatUtils.getStorageOptimizedFormat();
        break;
        
      default: // medium
        // Use default values
        break;
    }
    
    // Adjust based on memory constraints
    const memoryBytes = maxMemoryMB * 1024 * 1024;
    baseConfig.maxMemoryUsage = memoryBytes;
    baseConfig.bufferConfig!.maxBufferSizeBytes = Math.min(
      memoryBytes * 0.6, // 60% for buffering
      50 * 1024 * 1024 // Max 50MB
    );
    
    // Adjust based on speaker count
    const segmentsPerSpeaker = Math.max(
      2,
      Math.floor((memoryBytes * 0.3) / (speakerCount * 1024 * 1024)) // Estimate 1MB per segment
    );
    baseConfig.extractionSettings!.maxSegmentsPerSpeaker = Math.min(
      segmentsPerSpeaker,
      baseConfig.extractionSettings!.maxSegmentsPerSpeaker!
    );
    
    // Adjust for realtime requirements
    if (realtimeRequired) {
      baseConfig.realtimeProcessing = true;
      baseConfig.processingBatchSize = Math.min(3, baseConfig.processingBatchSize!);
    } else {
      baseConfig.realtimeProcessing = false;
      baseConfig.processingBatchSize = Math.max(8, baseConfig.processingBatchSize!);
    }
    
    return baseConfig;
  },

  /**
   * Get default presets
   */
  getDefaultPresets(): Record<string, SegmentExtractionConfig> {
    return {
      voiceIdentification: AudioProcessingUtils.createVoiceIDConfig(),
      storage: AudioProcessingUtils.createStorageOptimizedConfig(),
      performance: AudioProcessingUtils.createHighPerformanceConfig(),
    };
  },
};

/**
 * Factory function to create a complete audio processing pipeline
 */
export function createAudioProcessingPipeline(
  config?: Partial<SegmentExtractionConfig>
): {
  extractor: AudioSegmentExtractor;
  processor: EnhancedAudioProcessor;
  configManager: AudioProcessingConfigManager;
} {
  const configManager = createAudioProcessingConfig();
  
  // Apply user config if provided
  if (config) {
    const currentConfig = configManager.getExtractionConfig();
    configManager.updateConfig({
      extractionConfig: { ...currentConfig, ...config },
    });
  }
  
  const extractor = createAudioSegmentExtractor(configManager.getExtractionConfig());
  const processor = createEnhancedAudioProcessor(configManager.getEnhancedConfig());
  
  return {
    extractor,
    processor,
    configManager,
  };
}

/**
 * Quick setup functions for common use cases
 */
export const AudioProcessingSetup = {
  /**
   * Setup for voice identification
   */
  forVoiceIdentification(memoryLimitMB: number = 75): EnhancedAudioProcessor {
    const config = AudioProcessingUtils.calculateOptimalConfig({
      targetQuality: 'medium',
      maxMemoryMB: memoryLimitMB,
      realtimeRequired: true,
    });
    
    return createEnhancedAudioProcessor({
      segmentExtraction: config,
      integration: {
        enableVoiceCapture: true,
        enableRealtimeProcessing: true,
        enableSpeakerTracking: true,
        autoUploadSegments: true,
        uploadQualityThreshold: 0.6,
      },
      voiceIdentification: {
        minSampleDuration: 3000,
        maxSampleDuration: 12000,
        targetSamplesPerSpeaker: 5,
        qualityThreshold: 0.6,
      },
    });
  },

  /**
   * Setup for high-quality recording
   */
  forHighQuality(memoryLimitMB: number = 150): EnhancedAudioProcessor {
    const config = AudioProcessingUtils.calculateOptimalConfig({
      targetQuality: 'high',
      maxMemoryMB: memoryLimitMB,
      realtimeRequired: true,
    });
    
    return createEnhancedAudioProcessor({
      segmentExtraction: config,
      integration: {
        enableVoiceCapture: true,
        enableRealtimeProcessing: true,
        enableSpeakerTracking: true,
        autoUploadSegments: true,
        uploadQualityThreshold: 0.8,
      },
      voiceIdentification: {
        minSampleDuration: 5000,
        maxSampleDuration: 20000,
        targetSamplesPerSpeaker: 8,
        qualityThreshold: 0.8,
      },
    });
  },

  /**
   * Setup for mobile/low-resource environments
   */
  forMobile(memoryLimitMB: number = 25): EnhancedAudioProcessor {
    const config = AudioProcessingUtils.calculateOptimalConfig({
      targetQuality: 'low',
      maxMemoryMB: memoryLimitMB,
      realtimeRequired: false,
    });
    
    return createEnhancedAudioProcessor({
      segmentExtraction: config,
      integration: {
        enableVoiceCapture: true,
        enableRealtimeProcessing: false,
        enableSpeakerTracking: true,
        autoUploadSegments: true,
        uploadQualityThreshold: 0.4,
      },
      voiceIdentification: {
        minSampleDuration: 2000,
        maxSampleDuration: 8000,
        targetSamplesPerSpeaker: 3,
        qualityThreshold: 0.4,
      },
      storage: {
        enableLocalCache: true,
        cacheSize: 10 * 1024 * 1024, // 10MB
        autoCleanup: true,
        cleanupInterval: 60000, // 1 minute
      },
    });
  },
};