/**
 * Audio Processing Types
 * Shared types for the audio processing system to avoid circular dependencies.
 */

export interface EnhancedAudioConfig {
  // Audio manager configuration
  audioManager: {
    enableInputGating?: boolean;
    enableConcurrentProcessing?: boolean;
    chunkInterval?: number;
    [key: string]: any;
  };
  
  // Segment extraction configuration
  segmentExtraction: {
    minSegmentDuration?: number;
    maxSegmentDuration?: number;
    silenceThreshold?: number;
    [key: string]: any;
  };
  
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
  errorRate: number;
  cacheHitRate: number;
}