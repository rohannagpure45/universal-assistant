/**
 * Audio Format Converter
 * 
 * Provides comprehensive audio format conversion capabilities for the voice identification system.
 * Handles conversion between different audio formats, sample rates, and codecs.
 * Optimized for web browser environments using Web Audio API.
 */

export interface AudioFormat {
  mimeType: string;
  codec?: string;
  sampleRate: number;
  channels: number;
  bitDepth?: number;
  bitRate?: number;
}

export interface ConversionOptions {
  targetFormat: AudioFormat;
  quality: 'low' | 'medium' | 'high' | 'lossless';
  normalize: boolean; // Normalize audio levels
  removeNoise: boolean; // Apply basic noise reduction
  trimSilence: boolean; // Remove silence from beginning/end
  fadeIn?: number; // Fade in duration (ms)
  fadeOut?: number; // Fade out duration (ms)
}

export interface ConversionResult {
  success: boolean;
  audioData: ArrayBuffer | null;
  blob: Blob | null;
  format: AudioFormat;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
  processingTime: number;
  error?: string;
  metadata?: {
    duration: number;
    channels: number;
    sampleRate: number;
    originalFormat?: AudioFormat;
  };
}

export interface AudioMetadata {
  duration: number; // Duration in seconds
  sampleRate: number;
  channels: number;
  bitDepth?: number;
  format: string;
  size: number;
  averageVolume: number;
  peakVolume: number;
  dynamicRange: number;
}

export class AudioFormatConverter {
  private audioContext: AudioContext | null = null;
  private supportedFormats: Map<string, boolean> = new Map();

  constructor() {
    this.initializeAudioContext();
    this.detectSupportedFormats();
  }

  private async initializeAudioContext(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to initialize AudioContext for format conversion:', error);
      }
    }
  }

  /**
   * Detect supported audio formats in the current browser
   */
  private detectSupportedFormats(): void {
    const formats = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vorbis',
      'audio/mp4',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mpeg',
      'audio/ogg',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/x-wav',
    ];

    if (typeof window !== 'undefined' && window.MediaRecorder) {
      formats.forEach(format => {
        this.supportedFormats.set(format, MediaRecorder.isTypeSupported(format));
      });
    }

    console.log('Supported audio formats:', Array.from(this.supportedFormats.entries()));
  }

  /**
   * Convert audio from one format to another
   */
  public async convertAudio(
    input: Blob | ArrayBuffer,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.audioContext) {
        throw new Error('AudioContext not available');
      }

      // Get input data as ArrayBuffer
      let inputBuffer: ArrayBuffer;
      let originalSize: number;
      
      if (input instanceof Blob) {
        inputBuffer = await input.arrayBuffer();
        originalSize = input.size;
      } else {
        inputBuffer = input;
        originalSize = input.byteLength;
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(inputBuffer.slice(0));
      
      // Apply audio processing based on options
      const processedBuffer = await this.processAudioBuffer(audioBuffer, options);
      
      // Convert to target format
      const convertedData = await this.encodeAudioBuffer(processedBuffer, options.targetFormat, options.quality);
      
      const processingTime = Date.now() - startTime;
      const convertedSize = convertedData.byteLength;
      
      return {
        success: true,
        audioData: convertedData,
        blob: new Blob([convertedData], { type: options.targetFormat.mimeType }),
        format: options.targetFormat,
        originalSize,
        convertedSize,
        compressionRatio: originalSize / convertedSize,
        processingTime,
        metadata: {
          duration: processedBuffer.duration,
          channels: processedBuffer.numberOfChannels,
          sampleRate: processedBuffer.sampleRate,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Audio conversion failed:', error);
      
      return {
        success: false,
        audioData: null,
        blob: null,
        format: options.targetFormat,
        originalSize: input instanceof Blob ? input.size : input.byteLength,
        convertedSize: 0,
        compressionRatio: 0,
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown conversion error',
      };
    }
  }

  /**
   * Process audio buffer with various enhancements
   */
  private async processAudioBuffer(
    audioBuffer: AudioBuffer,
    options: ConversionOptions
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Create offline context for processing
    const offlineContext = new OfflineAudioContext(
      options.targetFormat.channels,
      Math.floor(audioBuffer.duration * options.targetFormat.sampleRate),
      options.targetFormat.sampleRate
    );

    // Create source node
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    let currentNode: AudioNode = source;

    // Apply normalization
    if (options.normalize) {
      const gainNode = offlineContext.createGain();
      const normalizeGain = this.calculateNormalizationGain(audioBuffer);
      gainNode.gain.value = normalizeGain;
      currentNode.connect(gainNode);
      currentNode = gainNode;
    }

    // Apply noise reduction (simple high-pass filter)
    if (options.removeNoise) {
      const highPassFilter = offlineContext.createBiquadFilter();
      highPassFilter.type = 'highpass';
      highPassFilter.frequency.value = 80; // Remove low-frequency noise
      currentNode.connect(highPassFilter);
      currentNode = highPassFilter;
    }

    // Apply fade in/out
    if (options.fadeIn || options.fadeOut) {
      const fadeGainNode = offlineContext.createGain();
      this.applyFadeEffects(fadeGainNode, audioBuffer.duration, options.fadeIn, options.fadeOut);
      currentNode.connect(fadeGainNode);
      currentNode = fadeGainNode;
    }

    // Connect to destination
    currentNode.connect(offlineContext.destination);

    // Start processing
    source.start();

    // Wait for processing to complete
    return await offlineContext.startRendering();
  }

  /**
   * Calculate gain for audio normalization
   */
  private calculateNormalizationGain(audioBuffer: AudioBuffer): number {
    let maxPeak = 0;
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        maxPeak = Math.max(maxPeak, Math.abs(channelData[i]));
      }
    }
    
    // Target peak level (leave some headroom)
    const targetPeak = 0.9;
    return maxPeak > 0 ? Math.min(3.0, targetPeak / maxPeak) : 1.0;
  }

  /**
   * Apply fade in/out effects
   */
  private applyFadeEffects(
    gainNode: GainNode,
    duration: number,
    fadeIn?: number,
    fadeOut?: number
  ): void {
    const audioContext = gainNode.context;
    
    if (fadeIn && fadeIn > 0) {
      const fadeInDuration = Math.min(fadeIn / 1000, duration / 4);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeInDuration);
    }
    
    if (fadeOut && fadeOut > 0) {
      const fadeOutDuration = Math.min(fadeOut / 1000, duration / 4);
      const fadeOutStart = duration - fadeOutDuration;
      gainNode.gain.setValueAtTime(1, audioContext.currentTime + fadeOutStart);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
    }
  }

  /**
   * Encode audio buffer to target format
   */
  private async encodeAudioBuffer(
    audioBuffer: AudioBuffer,
    targetFormat: AudioFormat,
    quality: string
  ): Promise<ArrayBuffer> {
    // For WebM/Opus (most common case)
    if (targetFormat.mimeType.includes('webm') || targetFormat.mimeType.includes('opus')) {
      return this.encodeToWebM(audioBuffer, targetFormat, quality);
    }
    
    // For WAV (PCM)
    if (targetFormat.mimeType.includes('wav')) {
      return this.encodeToWAV(audioBuffer, targetFormat);
    }
    
    // For other formats, use MediaRecorder if available
    return this.encodeWithMediaRecorder(audioBuffer, targetFormat, quality);
  }

  /**
   * Encode to WebM format using MediaRecorder
   */
  private async encodeToWebM(
    audioBuffer: AudioBuffer,
    targetFormat: AudioFormat,
    quality: string
  ): Promise<ArrayBuffer> {
    if (typeof window === 'undefined' || !window.MediaRecorder) {
      throw new Error('MediaRecorder not available');
    }

    // Create audio stream from buffer
    const stream = this.createStreamFromBuffer(audioBuffer);
    
    // Set up MediaRecorder
    const options = {
      mimeType: targetFormat.mimeType,
      audioBitsPerSecond: this.getBitRateForQuality(quality),
    };
    
    const mediaRecorder = new MediaRecorder(stream, options);
    const chunks: Blob[] = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: targetFormat.mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          resolve(arrayBuffer);
        } catch (error) {
          reject(error);
        }
      };
      
      mediaRecorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event}`));
      };
      
      mediaRecorder.start();
      
      // Stop recording after buffer duration
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, audioBuffer.duration * 1000 + 100);
    });
  }

  /**
   * Encode to WAV format (PCM)
   */
  private encodeToWAV(audioBuffer: AudioBuffer, targetFormat: AudioFormat): ArrayBuffer {
    const length = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bitDepth = targetFormat.bitDepth || 16;
    const bytesPerSample = bitDepth / 8;
    
    // Calculate buffer size
    const bufferLength = 44 + (length * channels * bytesPerSample);
    const buffer = new ArrayBuffer(bufferLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    this.writeWAVHeader(view, length, channels, sampleRate, bitDepth);
    
    // Write audio data
    let offset = 44;
    const maxValue = Math.pow(2, bitDepth - 1) - 1;
    
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        const intSample = Math.round(sample * maxValue);
        
        if (bitDepth === 16) {
          view.setInt16(offset, intSample, true);
          offset += 2;
        } else if (bitDepth === 24) {
          view.setInt32(offset, intSample << 8, true);
          offset += 3;
        } else if (bitDepth === 32) {
          view.setInt32(offset, intSample, true);
          offset += 4;
        }
      }
    }
    
    return buffer;
  }

  /**
   * Write WAV file header
   */
  private writeWAVHeader(
    view: DataView,
    length: number,
    channels: number,
    sampleRate: number,
    bitDepth: number
  ): void {
    const bytesPerSample = bitDepth / 8;
    const byteRate = sampleRate * channels * bytesPerSample;
    const blockAlign = channels * bytesPerSample;
    const dataSize = length * channels * bytesPerSample;
    
    // RIFF chunk descriptor
    view.setUint32(0, 0x46464952, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    view.setUint32(8, 0x45564157, false); // "WAVE"
    
    // Format sub-chunk
    view.setUint32(12, 0x20746d66, false); // "fmt "
    view.setUint32(16, 16, true); // Sub-chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, channels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, byteRate, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bitDepth, true); // Bits per sample
    
    // Data sub-chunk
    view.setUint32(36, 0x61746164, false); // "data"
    view.setUint32(40, dataSize, true); // Data size
  }

  /**
   * Create MediaStream from AudioBuffer
   */
  private createStreamFromBuffer(audioBuffer: AudioBuffer): MediaStream {
    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    // Create MediaStreamDestination
    const destination = this.audioContext.createMediaStreamDestination();
    
    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    source.start();
    
    return destination.stream;
  }

  /**
   * Encode using MediaRecorder with fallback
   */
  private async encodeWithMediaRecorder(
    audioBuffer: AudioBuffer,
    targetFormat: AudioFormat,
    quality: string
  ): Promise<ArrayBuffer> {
    // Check if target format is supported
    if (!this.supportedFormats.get(targetFormat.mimeType)) {
      throw new Error(`Unsupported target format: ${targetFormat.mimeType}`);
    }
    
    return this.encodeToWebM(audioBuffer, targetFormat, quality);
  }

  /**
   * Get bit rate based on quality setting
   */
  private getBitRateForQuality(quality: string): number {
    switch (quality) {
      case 'low': return 64000; // 64 kbps
      case 'medium': return 128000; // 128 kbps
      case 'high': return 256000; // 256 kbps
      case 'lossless': return 512000; // 512 kbps
      default: return 128000;
    }
  }

  /**
   * Extract comprehensive metadata from audio
   */
  public async extractMetadata(input: Blob | ArrayBuffer): Promise<AudioMetadata> {
    try {
      if (!this.audioContext) {
        throw new Error('AudioContext not available');
      }

      // Get input as ArrayBuffer
      const arrayBuffer = input instanceof Blob ? await input.arrayBuffer() : input;
      
      // Decode audio
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      
      // Calculate volume metrics
      let totalSum = 0;
      let maxPeak = 0;
      let sampleCount = 0;
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          const absValue = Math.abs(channelData[i]);
          totalSum += absValue;
          maxPeak = Math.max(maxPeak, absValue);
          sampleCount++;
        }
      }
      
      const averageVolume = sampleCount > 0 ? totalSum / sampleCount : 0;
      const dynamicRange = maxPeak > 0 ? 20 * Math.log10(maxPeak / (averageVolume || 0.001)) : 0;
      
      return {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        format: input instanceof Blob ? input.type : 'unknown',
        size: arrayBuffer.byteLength,
        averageVolume,
        peakVolume: maxPeak,
        dynamicRange: Math.max(0, dynamicRange),
      };
    } catch (error) {
      console.error('Failed to extract audio metadata:', error);
      throw error;
    }
  }

  /**
   * Check if a format is supported for conversion
   */
  public isFormatSupported(mimeType: string): boolean {
    return this.supportedFormats.get(mimeType) || false;
  }

  /**
   * Get list of supported formats
   */
  public getSupportedFormats(): string[] {
    return Array.from(this.supportedFormats.entries())
      .filter(([, supported]) => supported)
      .map(([format]) => format);
  }

  /**
   * Convert audio to optimal format for voice identification
   */
  public async convertForVoiceID(input: Blob | ArrayBuffer): Promise<ConversionResult> {
    const optimizedFormat: AudioFormat = {
      mimeType: 'audio/webm;codecs=opus',
      codec: 'opus',
      sampleRate: 16000, // Optimal for speech recognition
      channels: 1, // Mono for voice identification
      bitRate: 64000, // Good quality for speech
    };

    const options: ConversionOptions = {
      targetFormat: optimizedFormat,
      quality: 'medium',
      normalize: true,
      removeNoise: true,
      trimSilence: false, // Keep natural speech patterns
    };

    return this.convertAudio(input, options);
  }

  /**
   * Convert audio for storage optimization
   */
  public async convertForStorage(input: Blob | ArrayBuffer): Promise<ConversionResult> {
    const storageFormat: AudioFormat = {
      mimeType: 'audio/webm;codecs=opus',
      codec: 'opus',
      sampleRate: 16000,
      channels: 1,
      bitRate: 32000, // Lower bitrate for storage efficiency
    };

    const options: ConversionOptions = {
      targetFormat: storageFormat,
      quality: 'low',
      normalize: true,
      removeNoise: true,
      trimSilence: true,
    };

    return this.convertAudio(input, options);
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
    this.supportedFormats.clear();
  }
}

/**
 * Factory function to create AudioFormatConverter instance
 */
export function createAudioFormatConverter(): AudioFormatConverter {
  return new AudioFormatConverter();
}

/**
 * Utility functions for common audio format operations
 */
export const AudioFormatUtils = {
  /**
   * Create standard format configurations
   */
  createWebMFormat(sampleRate: number = 16000, channels: number = 1): AudioFormat {
    return {
      mimeType: 'audio/webm;codecs=opus',
      codec: 'opus',
      sampleRate,
      channels,
      bitRate: 128000,
    };
  },

  createWAVFormat(sampleRate: number = 44100, channels: number = 2, bitDepth: number = 16): AudioFormat {
    return {
      mimeType: 'audio/wav',
      sampleRate,
      channels,
      bitDepth,
    };
  },

  createMP3Format(sampleRate: number = 44100, channels: number = 2): AudioFormat {
    return {
      mimeType: 'audio/mpeg',
      sampleRate,
      channels,
      bitRate: 192000,
    };
  },

  /**
   * Get optimal format for different use cases
   */
  getVoiceIDFormat(): AudioFormat {
    return {
      mimeType: 'audio/webm;codecs=opus',
      codec: 'opus',
      sampleRate: 16000,
      channels: 1,
      bitRate: 64000,
    };
  },

  getHighQualityFormat(): AudioFormat {
    return {
      mimeType: 'audio/webm;codecs=opus',
      codec: 'opus',
      sampleRate: 48000,
      channels: 2,
      bitRate: 256000,
    };
  },

  getStorageOptimizedFormat(): AudioFormat {
    return {
      mimeType: 'audio/webm;codecs=opus',
      codec: 'opus',
      sampleRate: 16000,
      channels: 1,
      bitRate: 32000,
    };
  },
};