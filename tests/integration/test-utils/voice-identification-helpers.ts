/**
 * Voice Identification Test Utilities
 * 
 * Specialized test utilities for voice identification system testing including:
 * - Mock audio data generation
 * - Voice sample creation utilities
 * - Speaker simulation helpers
 * - Audio processing component mocks
 * - Performance benchmarking tools
 */

import { jest } from '@jest/globals';
import type { ExtractedSegment, SpeakerChangeEvent } from '@/services/audio-processing/AudioSegmentExtractor';
import type { VoiceSampleMetadata } from '@/services/firebase/StorageService';

// Audio data generation utilities
export class MockAudioGenerator {
  /**
   * Create a realistic mock audio blob with proper WebM structure
   */
  static createAudioBlob(options: {
    duration: number; // Duration in milliseconds
    quality: 'low' | 'medium' | 'high';
    sampleRate?: number;
    channels?: number;
  }): Blob {
    const { duration, quality, sampleRate = 16000, channels = 1 } = options;
    
    const samples = Math.floor((duration / 1000) * sampleRate * channels);
    const bytesPerSample = 2; // 16-bit samples
    const audioBuffer = new ArrayBuffer(samples * bytesPerSample);
    const audioView = new Int16Array(audioBuffer);
    
    // Generate audio data based on quality
    const amplitude = quality === 'high' ? 16000 : quality === 'medium' ? 8000 : 4000;
    const noiseLevel = quality === 'high' ? 0.05 : quality === 'medium' ? 0.15 : 0.3;
    
    // Generate a mix of tones to simulate speech
    const fundamentalFreq = 120 + Math.random() * 80; // 120-200 Hz (typical voice range)
    const harmonics = [1, 2, 3, 4, 5]; // Voice harmonics
    
    for (let i = 0; i < samples; i++) {
      let sample = 0;
      
      // Add harmonic components
      for (const harmonic of harmonics) {
        const freq = fundamentalFreq * harmonic;
        const harmonicAmplitude = amplitude / (harmonic * harmonic); // Natural harmonic decay
        sample += Math.sin(2 * Math.PI * freq * i / sampleRate) * harmonicAmplitude;
      }
      
      // Add formants (simulated)
      const formant1 = Math.sin(2 * Math.PI * 800 * i / sampleRate) * (amplitude * 0.3);
      const formant2 = Math.sin(2 * Math.PI * 1200 * i / sampleRate) * (amplitude * 0.2);
      sample += formant1 + formant2;
      
      // Add realistic noise
      const noise = (Math.random() - 0.5) * amplitude * noiseLevel;
      sample += noise;
      
      // Add envelope (fade in/out)
      const envelopePosition = i / samples;
      let envelope = 1;
      if (envelopePosition < 0.1) {
        envelope = envelopePosition / 0.1; // Fade in
      } else if (envelopePosition > 0.9) {
        envelope = (1 - envelopePosition) / 0.1; // Fade out
      }
      
      audioView[i] = Math.max(-32768, Math.min(32767, sample * envelope));
    }
    
    return new Blob([audioBuffer], { type: 'audio/webm;codecs=opus' });
  }

  /**
   * Create a batch of audio blobs for testing
   */
  static createAudioBatch(count: number, options: {
    baseDuration?: number;
    durationVariation?: number;
    qualityMix?: Array<'low' | 'medium' | 'high'>;
  } = {}): Blob[] {
    const {
      baseDuration = 3000,
      durationVariation = 2000,
      qualityMix = ['high', 'medium', 'low']
    } = options;
    
    return Array.from({ length: count }, (_, i) => {
      const duration = baseDuration + (Math.random() - 0.5) * durationVariation;
      const quality = qualityMix[i % qualityMix.length];
      
      return this.createAudioBlob({
        duration: Math.max(1000, duration), // Minimum 1 second
        quality
      });
    });
  }

  /**
   * Create audio with specific characteristics for testing
   */
  static createSpecializedAudio(type: 'silence' | 'noise' | 'tone' | 'speech', duration: number = 3000): Blob {
    const sampleRate = 16000;
    const samples = Math.floor((duration / 1000) * sampleRate);
    const audioBuffer = new ArrayBuffer(samples * 2);
    const audioView = new Int16Array(audioBuffer);

    switch (type) {
      case 'silence':
        // All zeros
        audioView.fill(0);
        break;
        
      case 'noise':
        // Random noise
        for (let i = 0; i < samples; i++) {
          audioView[i] = (Math.random() - 0.5) * 16000;
        }
        break;
        
      case 'tone':
        // Pure sine wave at 440 Hz
        for (let i = 0; i < samples; i++) {
          audioView[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 8000;
        }
        break;
        
      case 'speech':
        // Complex waveform simulating speech
        for (let i = 0; i < samples; i++) {
          let sample = 0;
          // Fundamental + harmonics
          sample += Math.sin(2 * Math.PI * 150 * i / sampleRate) * 4000;
          sample += Math.sin(2 * Math.PI * 300 * i / sampleRate) * 2000;
          sample += Math.sin(2 * Math.PI * 450 * i / sampleRate) * 1000;
          // Formants
          sample += Math.sin(2 * Math.PI * 800 * i / sampleRate) * 1500;
          sample += Math.sin(2 * Math.PI * 1200 * i / sampleRate) * 1000;
          // Modulation
          const modulation = 1 + 0.3 * Math.sin(2 * Math.PI * 5 * i / sampleRate);
          audioView[i] = sample * modulation;
        }
        break;
    }

    return new Blob([audioBuffer], { type: 'audio/webm;codecs=opus' });
  }
}

// Speaker simulation utilities
export class MockSpeakerSimulator {
  private speakers: Array<{
    id: string;
    name?: string;
    isKnown: boolean;
    voiceCharacteristics: {
      fundamentalFrequency: number;
      speakingRate: number;
      quality: 'low' | 'medium' | 'high';
    };
  }> = [];

  constructor(speakerCount: number = 5) {
    this.speakers = Array.from({ length: speakerCount }, (_, i) => ({
      id: `speaker-${i}`,
      name: i < 2 ? `Known Speaker ${i}` : undefined,
      isKnown: i < 2,
      voiceCharacteristics: {
        fundamentalFrequency: 100 + Math.random() * 100, // 100-200 Hz
        speakingRate: 0.8 + Math.random() * 0.4, // 0.8-1.2x normal
        quality: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
      }
    }));
  }

  getSpeakers() {
    return [...this.speakers];
  }

  getKnownSpeakers() {
    return this.speakers.filter(s => s.isKnown);
  }

  getUnknownSpeakers() {
    return this.speakers.filter(s => !s.isKnown);
  }

  /**
   * Generate a speaking segment for a specific speaker
   */
  generateSpeakingSegment(speakerId: string, options: {
    duration?: number;
    transcript?: string;
    startTime?: number;
  } = {}): {
    speaker: any;
    audioBlob: Blob;
    transcript: string;
    quality: number;
    duration: number;
    startTime: number;
  } {
    const speaker = this.speakers.find(s => s.id === speakerId);
    if (!speaker) {
      throw new Error(`Speaker ${speakerId} not found`);
    }

    const {
      duration = 3000 + Math.random() * 4000, // 3-7 seconds
      transcript = `This is speech from ${speaker.name || speakerId}`,
      startTime = Date.now()
    } = options;

    const qualityMap = { low: 0.4, medium: 0.7, high: 0.9 };
    const quality = qualityMap[speaker.voiceCharacteristics.quality] + (Math.random() - 0.5) * 0.2;

    const audioBlob = MockAudioGenerator.createAudioBlob({
      duration,
      quality: speaker.voiceCharacteristics.quality
    });

    return {
      speaker,
      audioBlob,
      transcript,
      quality: Math.max(0.1, Math.min(1.0, quality)),
      duration,
      startTime
    };
  }

  /**
   * Simulate a complete meeting with speaker changes
   */
  simulateMeeting(options: {
    duration?: number; // Total meeting duration in ms
    averageSegmentLength?: number;
    speakerChangeFrequency?: number; // Higher = more changes
  } = {}): Array<ReturnType<MockSpeakerSimulator['generateSpeakingSegment']>> {
    const {
      duration = 300000, // 5 minutes
      averageSegmentLength = 4000, // 4 seconds
      speakerChangeFrequency = 0.3 // 30% chance of speaker change each segment
    } = options;

    const segments = [];
    let currentTime = 0;
    let currentSpeaker = this.speakers[0].id;

    while (currentTime < duration) {
      // Decide if speaker should change
      if (segments.length > 0 && Math.random() < speakerChangeFrequency) {
        const availableSpeakers = this.speakers.filter(s => s.id !== currentSpeaker);
        currentSpeaker = availableSpeakers[Math.floor(Math.random() * availableSpeakers.length)].id;
      }

      const segmentLength = averageSegmentLength + (Math.random() - 0.5) * (averageSegmentLength * 0.5);
      const segment = this.generateSpeakingSegment(currentSpeaker, {
        duration: segmentLength,
        startTime: currentTime
      });

      segments.push(segment);
      currentTime += segmentLength + (500 + Math.random() * 1500); // Add pause between segments
    }

    return segments;
  }
}

// Voice identification test data factories
export class VoiceIdentificationTestData {
  /**
   * Create mock extracted segment
   */
  static createMockExtractedSegment(options: Partial<{
    speakerId: string;
    duration: number;
    quality: number;
    transcript: string;
    confidence: number;
  }> = {}): ExtractedSegment {
    const {
      speakerId = 'test-speaker',
      duration = 4000,
      quality = 0.8,
      transcript = 'Mock extracted segment',
      confidence = 0.85
    } = options;

    const audioBlob = MockAudioGenerator.createAudioBlob({ duration, quality: 'high' });
    
    return {
      id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      speakerId,
      startTime: Date.now() - duration,
      endTime: Date.now(),
      duration,
      audioBlob,
      audioBuffer: new ArrayBuffer(Math.floor(duration * 16)), // Mock buffer
      quality: {
        overall: quality,
        snr: quality * 0.9,
        volume: quality * 0.8 + 0.2,
        clarity: quality * 0.85,
        voiceActivity: quality * 0.95
      },
      vadSegments: [],
      metadata: {
        originalFormat: 'audio/webm',
        convertedFormat: {
          mimeType: 'audio/webm;codecs=opus',
          codec: 'opus',
          sampleRate: 16000,
          channels: 1,
          bitRate: 64000
        },
        compressionRatio: 0.8,
        processingTime: 50 + Math.random() * 100,
        chunkCount: Math.ceil(duration / 1000),
        transcript,
        confidence
      }
    };
  }

  /**
   * Create mock speaker change event
   */
  static createMockSpeakerChangeEvent(options: Partial<{
    previousSpeaker: string;
    newSpeaker: string;
    confidence: number;
    transcript: string;
  }> = {}): SpeakerChangeEvent {
    const {
      previousSpeaker,
      newSpeaker = 'new-speaker',
      confidence = 0.8,
      transcript = 'Speaker changed'
    } = options;

    return {
      previousSpeaker,
      newSpeaker,
      timestamp: Date.now(),
      confidence,
      transcript
    };
  }

  /**
   * Create mock voice sample metadata
   */
  static createMockVoiceSampleMetadata(options: Partial<{
    deepgramVoiceId: string;
    meetingId: string;
    duration: number;
    quality: number;
  }> = {}): VoiceSampleMetadata {
    const {
      deepgramVoiceId = 'test-voice',
      meetingId = 'test-meeting',
      duration = 5,
      quality = 0.8
    } = options;

    const timestamp = Date.now();
    
    return {
      deepgramVoiceId,
      meetingId,
      duration,
      quality,
      transcript: 'Mock voice sample transcript',
      speakerConfidence: 0.85,
      uploadedAt: new Date(timestamp).toISOString(),
      filePath: `voice-samples/${deepgramVoiceId}/${timestamp}_${meetingId}_${duration}s.webm`,
      size: duration * 8000 // Approximate size based on duration
    };
  }
}

// Performance testing utilities
export class VoiceIdentificationBenchmark {
  private measurements: Array<{
    operation: string;
    duration: number;
    memoryUsage?: number;
    timestamp: number;
  }> = [];

  /**
   * Benchmark an async operation
   */
  async measureOperation<T>(
    operation: () => Promise<T>,
    name: string
  ): Promise<{ result: T; duration: number; memoryUsage?: number }> {
    const startMemory = this.getMemoryUsage();
    const startTime = performance.now();
    
    const result = await operation();
    
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const duration = endTime - startTime;
    const memoryUsage = startMemory && endMemory ? endMemory - startMemory : undefined;
    
    this.measurements.push({
      operation: name,
      duration,
      memoryUsage,
      timestamp: Date.now()
    });

    return { result, duration, memoryUsage };
  }

  /**
   * Run a batch of operations and return performance statistics
   */
  async benchmarkBatch<T>(
    operations: Array<{ name: string; operation: () => Promise<T> }>,
    iterations: number = 1
  ): Promise<{
    results: T[];
    statistics: {
      totalDuration: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      totalMemoryUsage?: number;
      averageMemoryUsage?: number;
    };
  }> {
    const results: T[] = [];
    const durations: number[] = [];
    const memoryUsages: number[] = [];

    for (let iteration = 0; iteration < iterations; iteration++) {
      for (const { name, operation } of operations) {
        const measurement = await this.measureOperation(operation, `${name} (iteration ${iteration})`);
        results.push(measurement.result);
        durations.push(measurement.duration);
        if (measurement.memoryUsage) {
          memoryUsages.push(measurement.memoryUsage);
        }
      }
    }

    const statistics = {
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalMemoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((sum, m) => sum + m, 0) : undefined,
      averageMemoryUsage: memoryUsages.length > 0 ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length : undefined
    };

    return { results, statistics };
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number | undefined {
    return (performance as any).memory?.usedJSHeapSize;
  }

  /**
   * Get all measurements
   */
  getMeasurements() {
    return [...this.measurements];
  }

  /**
   * Clear measurements
   */
  clearMeasurements() {
    this.measurements = [];
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.measurements.length === 0) {
      return 'No measurements recorded';
    }

    let report = 'Voice Identification Performance Report\n';
    report += '=====================================\n\n';

    // Group by operation
    const groupedMeasurements = this.measurements.reduce((groups, measurement) => {
      const operation = measurement.operation;
      if (!groups[operation]) {
        groups[operation] = [];
      }
      groups[operation].push(measurement);
      return groups;
    }, {} as Record<string, typeof this.measurements>);

    for (const [operation, measurements] of Object.entries(groupedMeasurements)) {
      const durations = measurements.map(m => m.duration);
      const memoryUsages = measurements.map(m => m.memoryUsage).filter(m => m !== undefined) as number[];

      report += `Operation: ${operation}\n`;
      report += `  Executions: ${measurements.length}\n`;
      report += `  Average Duration: ${(durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(2)}ms\n`;
      report += `  Min Duration: ${Math.min(...durations).toFixed(2)}ms\n`;
      report += `  Max Duration: ${Math.max(...durations).toFixed(2)}ms\n`;
      
      if (memoryUsages.length > 0) {
        report += `  Average Memory Usage: ${(memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length / 1024 / 1024).toFixed(2)}MB\n`;
      }
      
      report += '\n';
    }

    return report;
  }
}

// Mock component factories
export class VoiceIdentificationMocks {
  /**
   * Create mock Enhanced Audio Processor
   */
  static createMockEnhancedAudioProcessor() {
    return {
      onSegmentExtracted: jest.fn(),
      onSpeakerChange: jest.fn(),
      onSegmentUploaded: jest.fn(),
      startProcessing: jest.fn(),
      stopProcessing: jest.fn().mockImplementation(async () => []),
      isActive: jest.fn().mockReturnValue(false),
      setCoordinator: jest.fn(),
      updateConfig: jest.fn(),
      dispose: jest.fn(),
      getBestSegmentsForSpeaker: jest.fn().mockReturnValue([]),
      getStats: jest.fn().mockReturnValue({
        totalChunksProcessed: 0,
        totalSegmentsExtracted: 0,
        totalSamplesUploaded: 0,
        averageProcessingTime: 0,
        memoryUsage: 0,
        speakerStats: new Map()
      })
    };
  }

  /**
   * Create mock Firebase Storage Service
   */
  static createMockStorageService() {
    return {
      uploadVoiceSample: jest.fn().mockResolvedValue({
        success: true,
        url: 'https://storage.googleapis.com/test-bucket/voice-sample.webm',
        filePath: 'voice-samples/speaker-123/sample.webm',
        metadata: VoiceIdentificationTestData.createMockVoiceSampleMetadata()
      }),
      listVoiceSamples: jest.fn().mockResolvedValue([]),
      deleteVoiceSample: jest.fn().mockResolvedValue({ success: true })
    };
  }

  /**
   * Create mock Voice Library Service
   */
  static createMockVoiceLibraryService() {
    return {
      getOrCreateVoiceEntry: jest.fn().mockResolvedValue({
        voiceId: 'test-voice',
        deepgramVoiceId: 'test-voice',
        userId: null,
        userName: null,
        identificationStatus: 'needs_identification'
      }),
      updateSpeakingTime: jest.fn().mockResolvedValue(undefined),
      identifyVoice: jest.fn().mockResolvedValue(undefined),
      getAllVoiceEntries: jest.fn().mockResolvedValue([]),
      searchVoiceEntries: jest.fn().mockResolvedValue([])
    };
  }

  /**
   * Create mock Needs Identification Service
   */
  static createMockNeedsIdentificationService() {
    return {
      createIdentificationRequest: jest.fn().mockResolvedValue({
        id: 'identification-request-123',
        status: 'pending',
        deepgramVoiceId: 'unknown-speaker',
        meetingId: 'test-meeting',
        createdAt: new Date()
      }),
      updateIdentificationStatus: jest.fn().mockResolvedValue(undefined),
      getAllPendingRequests: jest.fn().mockResolvedValue([]),
      getRequestsByMeeting: jest.fn().mockResolvedValue([])
    };
  }
}

// All classes are already exported above with 'export class' syntax