# Audio Processing Pipeline Documentation

## Overview

The Universal Assistant's audio processing pipeline is a sophisticated system designed for real-time audio capture, processing, and voice identification. This document details the complete audio processing architecture, from initial audio capture to final speaker identification.

## Table of Contents

1. [Pipeline Architecture](#pipeline-architecture)
2. [Audio Capture & Input](#audio-capture--input)
3. [Real-time Processing](#real-time-processing)
4. [Voice Activity Detection](#voice-activity-detection)
5. [Segment Extraction](#segment-extraction)
6. [Quality Assessment](#quality-assessment)
7. [Storage & Caching](#storage--caching)
8. [Performance Optimization](#performance-optimization)

## Pipeline Architecture

### High-Level Processing Flow

```
Audio Input → AudioManager → EnhancedAudioProcessor → SegmentExtractor → StorageService
     ↓              ↓               ↓                      ↓               ↓
Web Audio API   Chunk Processing  Voice Activity      Quality Analysis  Firebase Storage
     ↓              ↓               ↓                      ↓               ↓
Microphone     Real-time Buffer   Speaker Detection   Upload Decision   Voice Library
```

### Component Hierarchy

```typescript
Audio Processing System
├── AudioManager (Core audio handling)
│   ├── Audio capture from microphone
│   ├── Chunk-based processing
│   ├── Voice activity detection
│   └── Recording queue management
├── EnhancedAudioProcessor (Integration layer)
│   ├── Coordinates all audio processing
│   ├── Manages speaker identification workflow
│   ├── Handles upload decisions and caching
│   └── Provides statistics and monitoring
├── AudioSegmentExtractor (Segment analysis)
│   ├── Extracts meaningful voice segments
│   ├── Quality assessment and scoring
│   ├── Speaker change detection
│   └── Memory management
├── VoiceActivityDetection (VAD)
│   ├── Detects speech vs silence
│   ├── Noise level analysis
│   ├── Volume consistency checking
│   └── Activity threshold management
└── AudioFormatConverter (Format handling)
    ├── Cross-browser compatibility
    ├── Compression optimization
    ├── Quality preservation
    └── Format standardization
```

## Audio Capture & Input

### AudioManager Configuration

```typescript
interface AudioManagerConfig {
  enableInputGating: boolean;
  enableConcurrentProcessing: boolean;
  chunkInterval: number;
  
  audioQuality: {
    sampleRate: number;          // 16000 Hz (optimized for speech)
    audioBitsPerSecond: number;  // 128000 bps
    channels: number;            // 1 (mono for voice identification)
  };
  
  voiceActivityDetection: {
    enabled: boolean;
    threshold: number;           // 0.05 (5% activation threshold)
    minSilenceDuration: number;  // 500ms minimum silence
    bufferSilentChunks: number;  // 5 chunks of silence buffering
  };
}
```

### Web Audio API Integration

```typescript
class AudioManager {
  private audioContext: AudioContext;
  private mediaStream: MediaStream;
  private mediaRecorder: MediaRecorder;
  private audioWorklet: AudioWorkletNode;
  
  // Real-time audio capture
  public async startRecording(): Promise<void> {
    // 1. Request microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: this.config.audioQuality.sampleRate,
        channelCount: this.config.audioQuality.channels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    // 2. Initialize audio context and worklet
    this.audioContext = new AudioContext({
      sampleRate: this.config.audioQuality.sampleRate
    });
    
    // 3. Setup real-time processing pipeline
    await this.setupAudioWorklet();
    
    // 4. Start chunk-based recording
    this.startChunkProcessing();
  }
}
```

### Audio Quality Optimization

#### Sample Rate Selection
```typescript
// Optimized for voice identification
const SAMPLE_RATES = {
  MINIMUM: 8000,      // Telephone quality
  STANDARD: 16000,    // Speech recognition standard
  HIGH: 22050,        // Good quality speech
  MAXIMUM: 44100      // CD quality (not needed for voice ID)
};

// Configuration for different use cases
const QUALITY_PRESETS = {
  LOW_BANDWIDTH: {
    sampleRate: 8000,
    bitrate: 64000,
    channels: 1
  },
  OPTIMAL: {
    sampleRate: 16000,
    bitrate: 128000,
    channels: 1
  },
  HIGH_QUALITY: {
    sampleRate: 22050,
    bitrate: 192000,
    channels: 1
  }
};
```

## Real-time Processing

### EnhancedAudioProcessor Integration

```typescript
class EnhancedAudioProcessor {
  // Processing configuration
  private config: EnhancedAudioConfig = {
    integration: {
      enableVoiceCapture: true,
      enableRealtimeProcessing: true,
      enableSpeakerTracking: true,
      autoUploadSegments: true,
      uploadQualityThreshold: 0.6
    },
    
    voiceIdentification: {
      minSampleDuration: 3000,     // 3 seconds minimum
      maxSampleDuration: 15000,    // 15 seconds maximum
      targetSamplesPerSpeaker: 5,  // Optimal sample count
      qualityThreshold: 0.6        // Minimum quality score
    }
  };
  
  // Real-time chunk processing
  private async handleAudioChunk(audioBlob: Blob): Promise<void> {
    const timestamp = Date.now();
    const speakerId = this.getCurrentSpeakerId();
    
    // Process through segment extractor
    await this.segmentExtractor.processAudioChunk(
      audioBlob, 
      speakerId, 
      timestamp
    );
    
    this.updateProcessingStats();
  }
}
```

### Chunk-Based Processing Architecture

```typescript
interface AudioChunk {
  id: string;
  audioBlob: Blob;
  audioBuffer: ArrayBuffer;
  timestamp: number;
  speakerId: string;
  duration: number;
  
  // Processing metadata
  processed: boolean;
  qualityScore?: number;
  hasVoiceActivity?: boolean;
}

class ChunkProcessor {
  private chunkQueue: AudioChunk[] = [];
  private processingBatchSize: number = 5;
  
  // Batch processing for efficiency
  private async processBatch(): Promise<void> {
    const batch = this.chunkQueue.splice(0, this.processingBatchSize);
    
    await Promise.all(
      batch.map(chunk => this.processChunk(chunk))
    );
  }
}
```

## Voice Activity Detection

### VAD Implementation

```typescript
class VoiceActivityDetection {
  private threshold: number = 0.05;        // 5% activation threshold
  private minSilenceDuration: number = 500; // 500ms
  private bufferSilentChunks: number = 5;   // Buffer 5 silent chunks
  
  // Analyze audio for voice activity
  public analyzeActivity(audioBuffer: Float32Array): VoiceActivity {
    const analysis = this.performAudioAnalysis(audioBuffer);
    
    return {
      hasVoiceActivity: analysis.rmsLevel > this.threshold,
      rmsLevel: analysis.rmsLevel,
      peakLevel: analysis.peakLevel,
      zeroCrossingRate: analysis.zcr,
      spectralCentroid: analysis.spectralCentroid,
      confidence: this.calculateConfidence(analysis)
    };
  }
  
  // Advanced audio analysis
  private performAudioAnalysis(audioBuffer: Float32Array): AudioAnalysis {
    // 1. RMS (Root Mean Square) calculation
    const rmsLevel = this.calculateRMS(audioBuffer);
    
    // 2. Peak level detection
    const peakLevel = this.findPeakLevel(audioBuffer);
    
    // 3. Zero crossing rate (voice vs music detection)
    const zcr = this.calculateZeroCrossingRate(audioBuffer);
    
    // 4. Spectral analysis
    const spectralFeatures = this.analyzeSpectrum(audioBuffer);
    
    return {
      rmsLevel,
      peakLevel,
      zcr,
      spectralCentroid: spectralFeatures.centroid,
      spectralRolloff: spectralFeatures.rolloff,
      mfcc: spectralFeatures.mfcc
    };
  }
}
```

### Activity Detection Features

#### Noise Reduction
```typescript
interface NoiseReductionConfig {
  enableNoiseReduction: boolean;
  noiseFloor: number;           // -60 dB
  adaptiveThreshold: boolean;
  spectralSubtraction: boolean;
}

class NoiseReduction {
  // Spectral subtraction for noise reduction
  public reduceNoise(audioBuffer: Float32Array): Float32Array {
    const fft = this.performFFT(audioBuffer);
    const noiseProfile = this.estimateNoiseProfile(fft);
    const cleanSpectrum = this.spectralSubtraction(fft, noiseProfile);
    return this.performIFFT(cleanSpectrum);
  }
}
```

#### Volume Normalization
```typescript
class VolumeNormalization {
  private targetLevel: number = -16; // dB
  private maxGain: number = 20;      // dB
  
  public normalizeVolume(audioBuffer: Float32Array): Float32Array {
    const currentLevel = this.calculateLUFS(audioBuffer);
    const gainRequired = this.targetLevel - currentLevel;
    const appliedGain = Math.min(gainRequired, this.maxGain);
    
    return this.applyGain(audioBuffer, appliedGain);
  }
}
```

## Segment Extraction

### AudioSegmentExtractor

```typescript
interface SegmentExtractionConfig {
  extractionSettings: {
    minSegmentDuration: number;    // 3000ms minimum
    maxSegmentDuration: number;    // 15000ms maximum
    qualityThreshold: number;      // 0.5 minimum quality
    maxSegmentsPerSpeaker: number; // 10 segments max
    segmentOverlap: number;        // 500ms overlap
  };
  
  speakerChangeDetection: {
    enabled: boolean;
    confidenceThreshold: number;   // 0.7 confidence threshold
    transitionGracePeriod: number; // 1000ms grace period
    forceSegmentOnChange: boolean; // Force new segment on speaker change
  };
}

class AudioSegmentExtractor {
  // Extract meaningful voice segments
  public async processAudioChunk(
    audioBlob: Blob, 
    speakerId: string, 
    timestamp: number
  ): Promise<void> {
    const audioBuffer = await this.blobToArrayBuffer(audioBlob);
    const quality = await this.analyzeQuality(audioBuffer);
    
    // Check if we should extract a segment
    if (this.shouldExtractSegment(speakerId, quality, timestamp)) {
      const segment = await this.extractSegment(
        audioBlob, 
        speakerId, 
        timestamp, 
        quality
      );
      
      this.notifySegmentExtracted(segment);
    }
  }
}
```

### Segment Quality Assessment

```typescript
interface QualityAssessment {
  overall: number;           // Overall quality score (0-1)
  clarity: number;          // Audio clarity score
  noiseLevel: number;       // Background noise level
  volumeConsistency: number; // Volume consistency
  durationAdequacy: number; // Duration appropriateness
  
  // Detailed metrics
  signalToNoiseRatio: number;
  dynamicRange: number;
  frequencyResponse: number[];
  distortionLevel: number;
}

class QualityAnalyzer {
  public async analyzeQuality(audioBuffer: ArrayBuffer): Promise<QualityAssessment> {
    const floatArray = new Float32Array(audioBuffer);
    
    // 1. Signal-to-noise ratio calculation
    const snr = this.calculateSNR(floatArray);
    
    // 2. Dynamic range analysis
    const dynamicRange = this.calculateDynamicRange(floatArray);
    
    // 3. Frequency response analysis
    const frequencyResponse = this.analyzeFrequencyResponse(floatArray);
    
    // 4. Distortion measurement
    const distortion = this.measureDistortion(floatArray);
    
    // 5. Overall score calculation
    const overall = this.calculateOverallScore({
      snr,
      dynamicRange,
      frequencyResponse,
      distortion
    });
    
    return {
      overall,
      clarity: snr / 40, // Normalize to 0-1
      noiseLevel: 1 - (snr / 40),
      volumeConsistency: this.calculateVolumeConsistency(floatArray),
      durationAdequacy: this.calculateDurationScore(floatArray.length),
      signalToNoiseRatio: snr,
      dynamicRange,
      frequencyResponse: frequencyResponse.magnitudes,
      distortionLevel: distortion
    };
  }
}
```

## Storage & Caching

### Firebase Storage Integration

```typescript
interface StorageConfiguration {
  enableLocalCache: boolean;
  cacheSize: number;           // 50MB default
  autoCleanup: boolean;
  cleanupInterval: number;     // 5 minutes
  
  // Upload policies
  autoUpload: boolean;
  qualityThreshold: number;    // 0.6 minimum quality
  uploadBatchSize: number;     // 5 files per batch
  retryAttempts: number;       // 3 retry attempts
}

class AudioStorageService {
  // Upload voice sample with metadata
  public async uploadVoiceSample(
    speakerId: string,
    meetingId: string,
    audioBlob: Blob,
    durationSeconds: number,
    metadata: VoiceSampleMetadata
  ): Promise<UploadResult> {
    
    // 1. Generate unique filename
    const filename = this.generateFilename(speakerId, meetingId, durationSeconds);
    
    // 2. Create storage path
    const storagePath = `voice-samples/${speakerId}/${filename}`;
    
    // 3. Upload with metadata
    const uploadTask = this.storage.child(storagePath).put(audioBlob, {
      customMetadata: {
        speakerId,
        meetingId,
        quality: metadata.quality?.toString() || '0',
        transcript: metadata.transcript || '',
        confidence: metadata.speakerConfidence?.toString() || '0',
        uploadedAt: new Date().toISOString()
      }
    });
    
    // 4. Monitor upload progress
    return this.monitorUpload(uploadTask);
  }
}
```

### Local Caching Strategy

```typescript
class AudioCacheManager {
  private cache: Map<string, CachedSegment> = new Map();
  private maxCacheSize: number = 50 * 1024 * 1024; // 50MB
  
  // Intelligent caching based on quality and usage
  public cacheSegment(segment: ExtractedSegment): void {
    // Check cache capacity
    if (this.getCurrentCacheSize() + segment.audioBuffer.byteLength > this.maxCacheSize) {
      this.evictLowQualitySegments();
    }
    
    // Cache high-quality segments preferentially
    if (segment.quality.overall > 0.7) {
      this.cache.set(segment.id, {
        ...segment,
        cacheTime: Date.now(),
        accessCount: 0,
        lastAccess: Date.now()
      });
    }
  }
  
  // LRU eviction with quality consideration
  private evictLowQualitySegments(): void {
    const segments = Array.from(this.cache.values());
    
    // Sort by quality (ascending) then by last access (ascending)
    segments.sort((a, b) => {
      const qualityDiff = a.quality.overall - b.quality.overall;
      if (Math.abs(qualityDiff) > 0.1) return qualityDiff;
      return a.lastAccess - b.lastAccess;
    });
    
    // Remove lowest quality, least recently used segments
    const removeCount = Math.ceil(segments.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(segments[i].id);
    }
  }
}
```

## Performance Optimization

### Memory Management

```typescript
interface MemoryManagement {
  maxMemoryUsage: number;      // 100MB maximum
  garbageCollectionThreshold: number; // 80MB trigger GC
  bufferPoolSize: number;      // 20 buffers in pool
  cleanupInterval: number;     // 30 seconds cleanup
}

class AudioMemoryManager {
  private bufferPool: AudioBuffer[] = [];
  private currentMemoryUsage: number = 0;
  
  // Buffer pooling for memory efficiency
  public getBuffer(size: number): AudioBuffer {
    // Try to reuse existing buffer
    const existingBuffer = this.bufferPool.find(buffer => 
      buffer.length === size
    );
    
    if (existingBuffer) {
      this.bufferPool.splice(this.bufferPool.indexOf(existingBuffer), 1);
      return existingBuffer;
    }
    
    // Create new buffer if none available
    return new AudioBuffer({
      numberOfChannels: 1,
      length: size,
      sampleRate: 16000
    });
  }
  
  // Return buffer to pool for reuse
  public returnBuffer(buffer: AudioBuffer): void {
    if (this.bufferPool.length < this.maxPoolSize) {
      // Clear buffer data
      buffer.getChannelData(0).fill(0);
      this.bufferPool.push(buffer);
    }
  }
}
```

### Real-time Optimization

```typescript
interface PerformanceTargets {
  maxProcessingLatency: number;    // 100ms maximum
  minThroughput: number;           // 10 chunks/second
  maxCPUUsage: number;             // 20% maximum
  maxMemoryFootprint: number;      // 100MB maximum
}

class RealtimeOptimizer {
  // Web Workers for heavy processing
  private audioWorker: Worker;
  
  public initializeWorkers(): void {
    this.audioWorker = new Worker('/audio-processors/enhanced-processor.js');
    
    this.audioWorker.onmessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'SEGMENT_EXTRACTED':
          this.handleWorkerSegment(data);
          break;
        case 'QUALITY_ANALYZED':
          this.handleWorkerQuality(data);
          break;
      }
    };
  }
  
  // Offload heavy processing to Web Worker
  public processInWorker(audioBuffer: ArrayBuffer, config: ProcessingConfig): void {
    this.audioWorker.postMessage({
      type: 'PROCESS_AUDIO',
      audioBuffer,
      config
    }, [audioBuffer]); // Transfer ownership for performance
  }
}
```

### Batch Processing Optimization

```typescript
class BatchProcessor {
  private processingQueue: AudioChunk[] = [];
  private batchSize: number = 5;
  private processingInterval: number = 100; // ms
  
  // Optimized batch processing
  public async processBatch(): Promise<void> {
    if (this.processingQueue.length === 0) return;
    
    const batch = this.processingQueue.splice(0, this.batchSize);
    
    // Process chunks in parallel
    const results = await Promise.all(
      batch.map(chunk => this.processChunkOptimized(chunk))
    );
    
    // Handle results
    results.forEach(result => {
      if (result.shouldExtract) {
        this.extractSegment(result.chunk);
      }
    });
  }
  
  private async processChunkOptimized(chunk: AudioChunk): Promise<ProcessingResult> {
    // 1. Quick voice activity check (< 10ms)
    const hasActivity = this.fastVAD(chunk.audioBuffer);
    if (!hasActivity) {
      return { shouldExtract: false, chunk };
    }
    
    // 2. Quality pre-screening (< 20ms)
    const preliminaryQuality = this.fastQualityCheck(chunk.audioBuffer);
    if (preliminaryQuality < 0.3) {
      return { shouldExtract: false, chunk };
    }
    
    // 3. Full processing for promising chunks (< 100ms)
    const fullAnalysis = await this.fullAudioAnalysis(chunk);
    
    return {
      shouldExtract: fullAnalysis.quality > 0.6,
      chunk,
      analysis: fullAnalysis
    };
  }
}
```

### Performance Monitoring

```typescript
interface PerformanceMetrics {
  processingLatency: number[];     // Latency measurements
  throughput: number[];            // Chunks processed per second
  memoryUsage: number[];           // Memory usage over time
  cpuUsage: number[];              // CPU usage measurements
  
  // Audio specific metrics
  segmentExtractionRate: number;   // Segments per minute
  uploadSuccessRate: number;       // Upload success percentage
  qualityDistribution: number[];   // Quality score distribution
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private startTime: number = performance.now();
  
  public recordProcessingTime(startTime: number): void {
    const latency = performance.now() - startTime;
    this.metrics.processingLatency.push(latency);
    
    // Alert if latency exceeds threshold
    if (latency > 100) { // 100ms threshold
      console.warn(`High processing latency detected: ${latency}ms`);
    }
  }
  
  public getPerformanceReport(): PerformanceReport {
    return {
      averageLatency: this.calculateAverage(this.metrics.processingLatency),
      p95Latency: this.calculatePercentile(this.metrics.processingLatency, 95),
      averageThroughput: this.calculateAverage(this.metrics.throughput),
      peakMemoryUsage: Math.max(...this.metrics.memoryUsage),
      qualityDistribution: this.analyzeQualityDistribution()
    };
  }
}
```

## Advanced Features

### Speaker Change Detection

```typescript
interface SpeakerChangeDetection {
  enabled: boolean;
  method: 'voice_embedding' | 'spectral_analysis' | 'hybrid';
  confidenceThreshold: number;
  gracePeriod: number;
}

class SpeakerChangeDetector {
  // Advanced speaker change detection using voice embeddings
  public detectSpeakerChange(
    currentSegment: AudioBuffer,
    previousSegment: AudioBuffer
  ): SpeakerChangeResult {
    
    // 1. Extract voice embeddings
    const currentEmbedding = this.extractVoiceEmbedding(currentSegment);
    const previousEmbedding = this.extractVoiceEmbedding(previousSegment);
    
    // 2. Calculate similarity score
    const similarity = this.cosineSimilarity(currentEmbedding, previousEmbedding);
    
    // 3. Determine if speaker changed
    const speakerChanged = similarity < this.confidenceThreshold;
    
    return {
      speakerChanged,
      confidence: 1 - similarity,
      similarity,
      method: 'voice_embedding'
    };
  }
}
```

---

*Last Updated: 2025-01-21*
*Audio Processing Pipeline Version: 3.0.0*
*Optimized for Real-time Voice Identification*