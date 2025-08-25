import { InputGatekeeper, InputItem, createInputGatekeeper } from '@/services/gating/InputGatekeeper';
import { createConversationInputHandlers } from '@/services/gating/ConversationInputHandlers';
import { EnhancedInputGatekeeper } from '@/services/gatekeeper/EnhancedInputGatekeeper';
import { ConcurrentGatekeeper } from '@/services/gatekeeper/ConcurrentGatekeeper';
import { ConversationResponse } from '@/services/universal-assistant/ConversationProcessor';

export interface AudioManagerConfig {
  enableInputGating: boolean;
  enableConcurrentProcessing: boolean;
  chunkInterval: number;
  audioQuality: {
    sampleRate: number;
    audioBitsPerSecond: number;
  };
  voiceActivityDetection: {
    enabled: boolean;
    threshold: number; // Audio level threshold (0.0 - 1.0)
    minSilenceDuration: number; // Minimum silence duration to stop sending (ms)
    bufferSilentChunks: number; // Number of silent chunks to buffer before stopping
  };
  chunkBatching: {
    enabled: boolean;
    maxBatchSize: number; // Maximum chunks to batch together
    maxBatchDelay: number; // Maximum delay before sending batch (ms)
    minChunkSize: number; // Minimum chunk size to consider (bytes)
  };
}

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioStream: MediaStream | null = null;
    private audioChunks: Blob[] = [];
    private activeAudio: HTMLAudioElement | null = null;
    private audioQueue: HTMLAudioElement[] = [];
    private activeAudioElements: Set<HTMLAudioElement> = new Set();
    private recordingCallbacks: ((chunk: Blob) => void)[] = [];
    private inputGatekeeper: InputGatekeeper | null = null;
    private enhancedInputGatekeeper: EnhancedInputGatekeeper | null = null;
    private concurrentGatekeeper: ConcurrentGatekeeper | null = null;
    private config: AudioManagerConfig;
    private transcriptionCallback?: (text: string, speakerId?: string) => void;
    // Voice Activity Detection
    private analyserNode: AnalyserNode | null = null;
    private audioDataArray: Uint8Array | null = null;
    private silentChunkCount: number = 0;
    private lastVoiceActivityTime: number = 0;
    private vadChunkCount: number = 0;
    private vadProcessedChunks: number = 0;
    private vadFilteredChunks: number = 0;
    // Chunk batching for performance
    private chunkBatch: Blob[] = [];
    private batchTimer: NodeJS.Timeout | null = null;
    private lastBatchTime: number = 0;
  
    constructor(config?: Partial<AudioManagerConfig>) {
      this.config = {
        enableInputGating: true,
        enableConcurrentProcessing: false,
        chunkInterval: 100,
        audioQuality: {
          sampleRate: 16000,
          audioBitsPerSecond: 128000,
        },
        voiceActivityDetection: {
          enabled: true,
          threshold: 0.05, // Lowered threshold to allow more audio through (was 0.10, but audio levels are ~0.06-0.08)
          minSilenceDuration: 500, // 0.5 seconds of silence before stopping (faster response)
          bufferSilentChunks: 5, // Buffer 5 silent chunks before stopping transmission (faster response)
        },
        chunkBatching: {
          enabled: true,
          maxBatchSize: 3, // Batch up to 3 chunks together
          maxBatchDelay: 150, // Send batch after 150ms maximum
          minChunkSize: 500, // Only batch chunks larger than 500 bytes
        },
        ...config,
      };

      // Initialize input gatekeeper with conversation handlers
      // TODO: AudioManager needs proper ConversationProcessor integration
      // For now, skip input gatekeeper initialization due to missing ConversationProcessor
      // const handlers = createConversationInputHandlers(
      //   this.onConversationResponse.bind(this)
      // );
      // this.inputGatekeeper = createInputGatekeeper(handlers);
      this.inputGatekeeper = null;

      // Initialize concurrent processing if enabled
      if (this.config.enableConcurrentProcessing) {
        this.initializeConcurrentProcessing();
      }

      if (typeof window !== 'undefined') {
        this.initializeAudioContext();
      }
    }
  
    private async initializeAudioContext() {
      try {
        this.audioContext = new (window.AudioContext || 
          (window as any).webkitAudioContext)();
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
      }
    }
  
    async startRecording(onDataAvailable?: (chunk: Blob) => void): Promise<void> {
      try {
        // Check if already recording
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          console.warn('Recording already in progress');
          return;
        }
        
        // Clean up any existing recorder first
        if (this.mediaRecorder) {
          console.log('Cleaning up existing MediaRecorder before starting new one...');
          this.stopRecording();
        }
        
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
          throw new Error('MediaRecorder is not supported in this browser');
        }

        // Request microphone access with optimized constraints for speech recognition
        console.log('Requesting microphone access...');
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: this.config.audioQuality.sampleRate, // 16000 Hz for speech recognition
            channelCount: 1, // Mono audio
          }
        });

        console.log('Microphone access granted, creating MediaRecorder...');

        // Set up Voice Activity Detection if enabled
        if (this.config.voiceActivityDetection.enabled && this.audioContext) {
          this.setupVoiceActivityDetection(this.audioStream);
        }
  
        // Create MediaRecorder with optimized settings
        const mimeType = this.getSupportedMimeType();
        console.log(`[AudioManager] MIME type: ${mimeType}`);
        console.log(`[AudioManager] Audio stream tracks:`, this.audioStream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          label: track.label,
          settings: track.getSettings()
        })));
        
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
          mimeType,
          audioBitsPerSecond: this.config.audioQuality.audioBitsPerSecond,
        });
  
        // Set up event handlers
        this.mediaRecorder.ondataavailable = async (event) => {
          // Double-check that we're still in a recording state to prevent processing stale chunks
          if (event.data.size > 0 && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            // Apply Voice Activity Detection if enabled
            const shouldProcess = this.config.voiceActivityDetection.enabled 
              ? this.shouldProcessAudioChunk(event.data)
              : true;

            if (shouldProcess) {
              console.log(`Audio chunk captured: ${event.data.size} bytes`);
              this.audioChunks.push(event.data);
              
              // Create raw WebM blob with proper MIME type
              const rawWebMBlob = new Blob([event.data], { 
                type: event.data.type || 'audio/webm' 
              }) as Blob & { arrayBuffer(): Promise<ArrayBuffer> };
              
              // Add arrayBuffer method for backward compatibility
              rawWebMBlob.arrayBuffer = () => event.data.arrayBuffer();
              
              // PERFORMANCE OPTIMIZATION: Use batching if enabled
              if (this.config.chunkBatching.enabled && event.data.size >= this.config.chunkBatching.minChunkSize) {
                this.addChunkToBatch(rawWebMBlob, onDataAvailable);
              } else {
                // Send immediately for small chunks or when batching is disabled
                console.log(`[AudioManager] Sending raw WebM chunk immediately: ${event.data.size} bytes`);
                
                // Call the callback with raw WebM data
                if (onDataAvailable) {
                  onDataAvailable(rawWebMBlob);
                }
                
                // Call all registered callbacks with raw WebM data
                this.recordingCallbacks.forEach(callback => {
                  try {
                    callback(rawWebMBlob);
                  } catch (callbackError) {
                    console.error('Error in recording callback:', callbackError);
                  }
                });
              }
            } else {
              // Skip processing silent chunk but still track it (reduce logging frequency)
              if (this.vadChunkCount % 50 === 0) {
                console.log(`Skipping silent audio chunk: ${event.data.size} bytes`);
              }
            }
          } else if (event.data.size > 0) {
            console.log(`Discarding stale audio chunk: ${event.data.size} bytes (recorder state: ${this.mediaRecorder?.state || 'null'})`);
          }
        };

        this.mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
        };

        this.mediaRecorder.onstart = () => {
          console.log('MediaRecorder started');
        };

        this.mediaRecorder.onstop = () => {
          console.log('MediaRecorder stopped');
        };
  
        // Start recording with configured chunk interval (100ms for real-time processing)
        this.mediaRecorder.start(this.config.chunkInterval);
        console.log(`Recording started with ${this.config.chunkInterval}ms chunk interval`);
      } catch (error) {
        console.error('Failed to start recording:', error);
        
        // Handle specific error types
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Microphone access denied. Please allow microphone permissions and try again.');
          } else if (error.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
          } else if (error.name === 'NotSupportedError') {
            throw new Error('Audio recording is not supported in this browser.');
          } else if (error.name === 'NotReadableError') {
            throw new Error('Microphone is already in use by another application.');
          }
        }
        
        throw error;
      }
    }
  

    stopRecording(): Blob | null {
      if (!this.mediaRecorder) {
        console.warn('No active recording to stop');
        return null;
      }
  
      console.log('Stopping MediaRecorder...');
      
      // Clear all event handlers first to prevent any further callbacks
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstart = null;
      this.mediaRecorder.onstop = null;
      
      // Stop recording
      this.mediaRecorder.stop();
      
      // Stop all tracks
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped audio track: ${track.kind}`);
        });
        this.audioStream = null;
      }
  
      // Create final blob
      const audioBlob = new Blob(this.audioChunks, { 
        type: this.mediaRecorder.mimeType || 'audio/webm' 
      });
      
      // Clean up VAD resources
      this.cleanupVoiceActivityDetection();
      
      // Reset all state
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.recordingCallbacks = [];
      
      console.log('Recording stopped and cleaned up');
      return audioBlob;
    }
  
    private getSupportedMimeType(): string {
      const types = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg',
      ];
      
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      
      return 'audio/webm';
    }

    private setupVoiceActivityDetection(audioStream: MediaStream): void {
      if (!this.audioContext) return;

      try {
        // Reset VAD counters
        this.vadChunkCount = 0;
        this.vadProcessedChunks = 0;
        this.vadFilteredChunks = 0;
        this.silentChunkCount = 0;
        this.lastVoiceActivityTime = Date.now();

        // Create audio source from stream
        const source = this.audioContext.createMediaStreamSource(audioStream);
        
        // Create analyser node for audio analysis
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 512; // Smaller FFT for better performance
        this.analyserNode.smoothingTimeConstant = 0.8;
        
        // Create data array for frequency analysis
        const arrayBuffer = new ArrayBuffer(this.analyserNode.frequencyBinCount);
        this.audioDataArray = new Uint8Array(arrayBuffer);
        
        // Connect source to analyser
        source.connect(this.analyserNode);
        
        console.log(`[VAD] Voice Activity Detection initialized - threshold: ${this.config.voiceActivityDetection.threshold}, buffer chunks: ${this.config.voiceActivityDetection.bufferSilentChunks}, silence duration: ${this.config.voiceActivityDetection.minSilenceDuration}ms`);
      } catch (error) {
        console.error('Failed to setup Voice Activity Detection:', error);
        this.analyserNode = null;
        this.audioDataArray = null;
      }
    }

    private shouldProcessAudioChunk(chunk: Blob): boolean {
      this.vadChunkCount++;
      
      if (!this.analyserNode || !this.audioDataArray) {
        // Reduce logging frequency for fallback case
        if (this.vadChunkCount % 50 === 0) {
          console.log('[VAD] Analyser not available, processing chunk');
        }
        this.vadProcessedChunks++;
        return true; // Fallback to processing if VAD is not available
      }

      try {
        const vadConfig = this.config.voiceActivityDetection;
        const currentTime = Date.now();
        
        // OPTIMIZATION 1: Skip analysis completely if we're in a confirmed silence period
        const silenceDuration = currentTime - this.lastVoiceActivityTime;
        if (this.silentChunkCount > vadConfig.bufferSilentChunks * 2 && 
            silenceDuration > vadConfig.minSilenceDuration * 2) {
          this.vadFilteredChunks++;
          if (this.vadChunkCount % 50 === 0) {
            console.log(`[VAD] Deep silence mode - skipping analysis`);
          }
          return false;
        }
        
        // OPTIMIZATION 2: Reduced frequency domain analysis - only sample key frequencies
        this.analyserNode.getByteFrequencyData(this.audioDataArray as Uint8Array<ArrayBuffer>);
        
        // Voice typically occurs in 300-3400 Hz range
        // Sample only these frequencies for better performance (roughly 1/8 of full spectrum)
        const voiceStart = Math.floor(this.audioDataArray.length * 0.1); // ~300Hz
        const voiceEnd = Math.floor(this.audioDataArray.length * 0.6); // ~3400Hz
        
        let voiceSum = 0;
        const voiceLength = voiceEnd - voiceStart;
        for (let i = voiceStart; i < voiceEnd; i++) {
          voiceSum += this.audioDataArray[i];
        }
        const voiceLevel = voiceSum / voiceLength / 255; // Normalize to 0-1
        
        // OPTIMIZATION 3: Use cached RMS calculation every other chunk to reduce CPU load
        let rmsLevel = 0;
        if (this.vadChunkCount % 2 === 0) {
          this.analyserNode.getByteTimeDomainData(this.audioDataArray as Uint8Array<ArrayBuffer>);
          let rmsSum = 0;
          // Sample every 4th value for performance
          for (let i = 0; i < this.audioDataArray.length; i += 4) {
            const normalized = (this.audioDataArray[i] - 128) / 128;
            rmsSum += normalized * normalized;
          }
          rmsLevel = Math.sqrt(rmsSum / (this.audioDataArray.length / 4));
        } else {
          // Use previous RMS approximation based on voice level
          rmsLevel = voiceLevel * 0.8;
        }
        
        // OPTIMIZATION 4: Weighted combination focusing on voice frequencies
        const audioLevel = (voiceLevel * 0.7) + (rmsLevel * 0.3);
        
        // OPTIMIZATION 5: Reduce logging frequency significantly
        const shouldLog = this.vadChunkCount % 100 === 0;
        if (shouldLog) {
          console.log(`[VAD] Chunk ${this.vadChunkCount}: voice=${voiceLevel.toFixed(4)}, rms=${rmsLevel.toFixed(4)}, combined=${audioLevel.toFixed(4)}, threshold=${vadConfig.threshold}, silent=${this.silentChunkCount}, processed=${this.vadProcessedChunks}, filtered=${this.vadFilteredChunks}`);
        }
        
        // Check if audio level exceeds threshold
        if (audioLevel > vadConfig.threshold) {
          // Voice activity detected
          this.lastVoiceActivityTime = currentTime;
          this.silentChunkCount = 0;
          this.vadProcessedChunks++;
          
          if (shouldLog) {
            console.log(`[VAD] Voice activity detected - processing chunk`);
          }
          return true;
        } else {
          // Silence detected
          this.silentChunkCount++;
          
          // Process chunk if:
          // 1. We haven't exceeded the silent chunk buffer, OR
          // 2. We haven't exceeded the minimum silence duration
          const shouldProcess = this.silentChunkCount <= vadConfig.bufferSilentChunks || 
                               silenceDuration < vadConfig.minSilenceDuration;
          
          if (shouldProcess) {
            this.vadProcessedChunks++;
          } else {
            this.vadFilteredChunks++;
          }
          
          if (shouldLog) {
            console.log(`[VAD] Silence detected - level: ${audioLevel.toFixed(4)}, duration: ${silenceDuration}ms, buffer count: ${this.silentChunkCount}/${vadConfig.bufferSilentChunks}, processing: ${shouldProcess}`);
          }
          
          return shouldProcess;
        }
      } catch (error) {
        console.error('Error in Voice Activity Detection:', error);
        this.vadProcessedChunks++;
        return true; // Fallback to processing on error
      }
    }

    private addChunkToBatch(chunk: Blob, onDataAvailable?: (chunk: Blob) => void): void {
      const currentTime = Date.now();
      this.chunkBatch.push(chunk);
      
      // Initialize batch timer if this is the first chunk
      if (this.chunkBatch.length === 1) {
        this.lastBatchTime = currentTime;
      }
      
      const shouldSendBatch = 
        // Batch is full
        this.chunkBatch.length >= this.config.chunkBatching.maxBatchSize ||
        // Maximum delay exceeded
        (currentTime - this.lastBatchTime) >= this.config.chunkBatching.maxBatchDelay;
      
      if (shouldSendBatch) {
        this.flushBatch(onDataAvailable);
      } else if (!this.batchTimer) {
        // Set timer to flush batch after max delay
        this.batchTimer = setTimeout(() => {
          this.flushBatch(onDataAvailable);
        }, this.config.chunkBatching.maxBatchDelay);
      }
    }

    private flushBatch(onDataAvailable?: (chunk: Blob) => void): void {
      if (this.chunkBatch.length === 0) return;
      
      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
      
      // Combine chunks into a single blob for efficiency
      const batchedBlob = new Blob(this.chunkBatch, { 
        type: 'audio/webm' 
      }) as Blob & { arrayBuffer(): Promise<ArrayBuffer> };
      
      // Add arrayBuffer method for backward compatibility
      batchedBlob.arrayBuffer = () => new Blob(this.chunkBatch).arrayBuffer();
      
      const totalSize = this.chunkBatch.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`[AudioManager] Sending batched WebM chunks: ${this.chunkBatch.length} chunks, ${totalSize} bytes total`);
      
      // Send batched chunk
      if (onDataAvailable) {
        onDataAvailable(batchedBlob);
      }
      
      // Call all registered callbacks with batched data
      this.recordingCallbacks.forEach(callback => {
        try {
          callback(batchedBlob);
        } catch (callbackError) {
          console.error('Error in recording callback:', callbackError);
        }
      });
      
      // Clear batch
      this.chunkBatch = [];
      this.lastBatchTime = 0;
    }

    private cleanupBatching(): void {
      // Flush any remaining batch
      if (this.chunkBatch.length > 0) {
        console.log('[AudioManager] Flushing remaining batch on cleanup');
        this.flushBatch();
      }
      
      // Clear batch timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
    }

    private cleanupVoiceActivityDetection(): void {
      // Log final VAD stats before cleanup
      if (this.vadChunkCount > 0) {
        console.log(`[VAD] Session summary - Total chunks: ${this.vadChunkCount}, Processed: ${this.vadProcessedChunks}, Filtered: ${this.vadFilteredChunks}, Filter rate: ${(this.vadFilteredChunks / this.vadChunkCount * 100).toFixed(1)}%`);
      }
      
      this.analyserNode = null;
      this.audioDataArray = null;
      this.silentChunkCount = 0;
      this.lastVoiceActivityTime = 0;
      this.vadChunkCount = 0;
      this.vadProcessedChunks = 0;
      this.vadFilteredChunks = 0;
    }

    /**
     * Convert webm audio blob to linear16 PCM format for Deepgram compatibility
     * Uses Web Audio API to decode and resample audio data
     */
    private async convertWebmToPCM(webmBlob: Blob): Promise<ArrayBuffer | null> {
      // TESTING: Bypassing PCM conversion - sending raw WebM data instead
      console.log('[AudioManager] convertWebmToPCM bypassed - using raw WebM data');
      return null;
      
      // Original conversion code commented out for testing
      /*
      if (!this.audioContext) {
        console.error('[AudioManager] AudioContext not available for audio conversion');
        return null;
      }

      try {
        // Convert blob to array buffer
        const arrayBuffer = await webmBlob.arrayBuffer();
        
        // Decode audio data using Web Audio API
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        
        // Get the audio data (use first channel for mono)
        const channelData = audioBuffer.getChannelData(0);
        
        // Convert to 16-bit PCM at target sample rate (16000 Hz for Deepgram)
        const targetSampleRate = this.config.audioQuality.sampleRate; // 16000
        const sourceSampleRate = audioBuffer.sampleRate;
        
        // Calculate resampling ratio
        const ratio = targetSampleRate / sourceSampleRate;
        const targetLength = Math.floor(channelData.length * ratio);
        
        // Create 16-bit PCM buffer
        const pcmBuffer = new Int16Array(targetLength);
        
        // Resample and convert to 16-bit PCM
        for (let i = 0; i < targetLength; i++) {
          // Linear interpolation for resampling
          const sourceIndex = i / ratio;
          const index = Math.floor(sourceIndex);
          const fraction = sourceIndex - index;
          
          let sample;
          if (index + 1 < channelData.length) {
            // Interpolate between samples
            sample = channelData[index] * (1 - fraction) + channelData[index + 1] * fraction;
          } else {
            // Use last sample if at the end
            sample = channelData[Math.min(index, channelData.length - 1)];
          }
          
          // Convert float32 (-1.0 to 1.0) to int16 (-32768 to 32767)
          // Clamp to prevent overflow
          const clampedSample = Math.max(-1, Math.min(1, sample));
          pcmBuffer[i] = Math.round(clampedSample * 32767);
        }
        
        // Convert Int16Array to ArrayBuffer
        const pcmArrayBuffer = pcmBuffer.buffer.slice(
          pcmBuffer.byteOffset,
          pcmBuffer.byteOffset + pcmBuffer.byteLength
        );
        
        // Log conversion details for debugging
        console.log(`[AudioManager] Audio conversion: ${sourceSampleRate}Hz → ${targetSampleRate}Hz, ${channelData.length} → ${targetLength} samples, ${arrayBuffer.byteLength} → ${pcmArrayBuffer.byteLength} bytes`);
        
        return pcmArrayBuffer;
      } catch (error) {
        console.error('[AudioManager] Error converting webm to PCM:', error);
        return null;
      }
      */
    }

    stopAllAudio(): void {
      // Stop tracked single active element
      if (this.activeAudio) {
        try {
          this.activeAudio.pause();
          this.activeAudio.currentTime = 0;
          this.activeAudio.src = '';
        } catch {}
      }

      // Stop all active audio elements set
      this.activeAudioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        try { audio.src = ''; } catch {}
      });
      this.activeAudioElements.clear();

      // Stop and clear queued elements
      this.audioQueue.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
        } catch {}
      });
      this.audioQueue = [];
      this.activeAudio = null;
    }

    resumePlayback(): void {
      // Resume playback for all paused audio elements
      this.activeAudioElements.forEach(audio => {
        if (audio.paused) {
          audio.play().catch(console.error);
        }
      });
    }

    isPlaying(): boolean {
      return !!this.activeAudio && !this.activeAudio.paused;
    }

    private cleanupAudio(audio: HTMLAudioElement): void {
      const index = this.audioQueue.indexOf(audio);
      if (index > -1) {
        this.audioQueue.splice(index, 1);
      }
      this.activeAudioElements.delete(audio);
      if (audio === this.activeAudio) {
        this.activeAudio = null;
      }
    }

    private initializeConcurrentProcessing(): void {
      try {
        const messageProcessor = {
          processMessage: async (message: any): Promise<ConversationResponse> => {
            console.log('Processing message in AudioManager:', message);
            return {
              shouldRespond: false,
              responseType: 'none',
              processedText: message.text,
              confidence: 1.0,
              metadata: { 
                fragmentType: 'AUDIO_PROCESSED',
                speakerContext: [],
                conversationTopics: [],
                interruptDetected: false,
              },
            };
          },
        };

        this.concurrentGatekeeper = new ConcurrentGatekeeper(messageProcessor, {
          maxConcurrentProcessing: 5,
          processingTimeout: 5000,
          enablePerformanceMonitoring: true,
        });

        // TODO: Fix this by creating proper ConversationProcessor instance
        // For now, skip conversation input handlers to unblock build
        const baseHandlers = null; // createConversationInputHandlers(messageProcessor);
        const enhancedHandlers = {
          handleInput: async () => {},
          saveAsContext: async () => {},
          addToContext: async () => {},
          concurrentGatekeeper: this.concurrentGatekeeper,
          handleSpeakerInput: async (input: any, speakerId: string) => {
            console.log('Handling speaker input:', input, speakerId);
          },
          categorizeInput: async (input: any) => 'queued' as const,
          shouldGateInput: async (input: any) => false,
        };

        this.enhancedInputGatekeeper = new EnhancedInputGatekeeper(enhancedHandlers, {
          enableConcurrentProcessing: true,
          speakerContextWindow: 10,
        });

        console.log('AudioManager: Concurrent processing initialized');
      } catch (error) {
        console.error('AudioManager: Failed to initialize concurrent processing:', error);
        this.concurrentGatekeeper = null;
        this.enhancedInputGatekeeper = null;
      }
    }

    // Process transcribed input through the gatekeeper
    async processTranscriptionInput(text: string, speakerId?: string): Promise<void> {
      if (!text.trim()) {
        return;
      }

      const inputItem: InputItem = {
        id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: text.trim(),
        timestamp: Date.now(),
        metadata: {
          speakerId: speakerId || 'unknown_speaker',
          source: 'transcription',
          audioManager: true,
        },
      };

      try {
        // Use enhanced gatekeeper if available and concurrent processing is enabled
        if (this.config.enableConcurrentProcessing && this.enhancedInputGatekeeper && speakerId) {
          await this.enhancedInputGatekeeper.processInput(inputItem);
        } else if (this.inputGatekeeper) {
          // Fallback to regular gatekeeper
          await this.inputGatekeeper.processInput(inputItem);
        }
      } catch (error) {
        console.error('Failed to process transcription input:', error);
        throw error;
      }
    }

    // Enhanced TTS gating with concurrent processing support
    async play(url: string, speakerId?: string): Promise<void> {
      // Gate input during TTS playback if enabled
      if (this.config.enableInputGating) {
        const playbackPromise = this.performPlayback(url);
        
        // Use enhanced gatekeeper if available
        if (this.config.enableConcurrentProcessing && this.enhancedInputGatekeeper && speakerId) {
          this.enhancedInputGatekeeper.gateDuringTTS(playbackPromise);
        } else if (this.inputGatekeeper) {
          // Fallback to regular gatekeeper
          this.inputGatekeeper.gateDuringTTS(playbackPromise);
        }
        
        return playbackPromise;
      } else {
        return this.performPlayback(url);
      }
    }

    private async performPlayback(url: string): Promise<void> {
      this.stopAllAudio();

      this.activeAudio = new Audio(url);
      this.audioQueue.push(this.activeAudio);
      this.activeAudioElements.add(this.activeAudio);

      this.activeAudio.addEventListener('ended', () => {
        if (this.activeAudio) {
          this.cleanupAudio(this.activeAudio);
        }
      });

      try {
        await this.activeAudio.play();
      } catch (error) {
        console.error('Failed to play audio:', error);
        if (this.activeAudio) {
          this.cleanupAudio(this.activeAudio);
        }
      }
    }

    // Callback for when conversation processor generates a response
    private async onConversationResponse(response: any): Promise<void> {
      try {
        console.log('Conversation response received:', {
          shouldRespond: response.shouldRespond,
          responseType: response.responseType,
          confidence: response.confidence,
        });

        // If there's a transcription callback, notify it
        if (this.transcriptionCallback) {
          this.transcriptionCallback(response.processedText, response.metadata?.speakerId);
        }

        // Here you could trigger TTS generation, UI updates, etc.
        // This is where the AudioManager interfaces with other services
      } catch (error) {
        console.error('Error handling conversation response:', error);
      }
    }

    // Set callback for transcription events
    setTranscriptionCallback(callback: (text: string, speakerId?: string) => void): void {
      this.transcriptionCallback = callback;
    }

    // Configuration methods
    updateConfig(config: Partial<AudioManagerConfig>): void {
      const oldConfig = { ...this.config };
      this.config = { ...this.config, ...config };
      
      // Reinitialize concurrent processing if setting changed
      if (oldConfig.enableConcurrentProcessing !== this.config.enableConcurrentProcessing) {
        if (this.config.enableConcurrentProcessing) {
          this.initializeConcurrentProcessing();
        } else {
          this.concurrentGatekeeper = null;
          this.enhancedInputGatekeeper = null;
        }
      }
    }

    getConfig(): AudioManagerConfig {
      return { ...this.config };
    }

    // Input gating control
    enableInputGating(): void {
      this.config.enableInputGating = true;
    }

    disableInputGating(): void {
      this.config.enableInputGating = false;
    }

    isInputGatingEnabled(): boolean {
      return this.config.enableInputGating;
    }

    // Concurrent processing control
    enableConcurrentProcessing(): void {
      this.config.enableConcurrentProcessing = true;
      if (!this.concurrentGatekeeper) {
        this.initializeConcurrentProcessing();
      }
    }

    disableConcurrentProcessing(): void {
      this.config.enableConcurrentProcessing = false;
      this.concurrentGatekeeper = null;
      this.enhancedInputGatekeeper = null;
    }

    isConcurrentProcessingEnabled(): boolean {
      return this.config.enableConcurrentProcessing && this.concurrentGatekeeper !== null;
    }

    // Recording callback management
    addRecordingCallback(callback: (chunk: Blob) => void): void {
      this.recordingCallbacks.push(callback);
    }

    removeRecordingCallback(callback: (chunk: Blob) => void): void {
      const index = this.recordingCallbacks.indexOf(callback);
      if (index > -1) {
        this.recordingCallbacks.splice(index, 1);
      }
    }

    clearRecordingCallbacks(): void {
      this.recordingCallbacks = [];
    }

    // Voice Activity Detection control
    enableVoiceActivityDetection(): void {
      this.config.voiceActivityDetection.enabled = true;
    }

    disableVoiceActivityDetection(): void {
      this.config.voiceActivityDetection.enabled = false;
    }

    isVoiceActivityDetectionEnabled(): boolean {
      return this.config.voiceActivityDetection.enabled;
    }

    updateVADThreshold(threshold: number): void {
      if (threshold >= 0 && threshold <= 1) {
        this.config.voiceActivityDetection.threshold = threshold;
      } else {
        console.warn('VAD threshold must be between 0 and 1');
      }
    }

    getVADStats(): { 
      silentChunkCount: number; 
      lastVoiceActivityTime: number; 
      threshold: number;
      totalChunks: number;
      processedChunks: number;
      filteredChunks: number;
      filterRate: number;
    } {
      return {
        silentChunkCount: this.silentChunkCount,
        lastVoiceActivityTime: this.lastVoiceActivityTime,
        threshold: this.config.voiceActivityDetection.threshold,
        totalChunks: this.vadChunkCount,
        processedChunks: this.vadProcessedChunks,
        filteredChunks: this.vadFilteredChunks,
        filterRate: this.vadChunkCount > 0 ? this.vadFilteredChunks / this.vadChunkCount * 100 : 0,
      };
    }

    // State getters
    isRecording(): boolean {
      return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
    }

    getRecordingState(): string {
      return this.mediaRecorder?.state || 'inactive';
    }

    /**
     * Complete cleanup of all AudioManager resources
     * This ensures proper lifecycle management and prevents memory leaks
     */
    cleanup(): void {
      console.log('AudioManager: Starting cleanup...');
      
      // Stop recording if active
      if (this.isRecording()) {
        this.stopRecording();
      }
      
      // Stop all audio playback
      this.stopAllAudio();
      
      // Clean up chunk batching
      this.cleanupBatching();
      
      // Clean up audio context
      if (this.audioContext) {
        try {
          const closePromise = this.audioContext.close();
          this.audioContext = null;
          // Handle promise rejection if close returns a promise
          if (closePromise && typeof closePromise.catch === 'function') {
            closePromise.catch((error) => {
              console.warn('Error closing AudioContext:', error);
            });
          }
        } catch (error) {
          console.warn('Error closing AudioContext:', error);
          this.audioContext = null;
        }
      }
      
      // Clear all callbacks
      this.recordingCallbacks = [];
      this.transcriptionCallback = undefined;
      
      // Clean up VAD resources
      this.cleanupVoiceActivityDetection();
      
      // Reset gatekeeper instances
      this.inputGatekeeper = null as any;
      this.enhancedInputGatekeeper = null;
      this.concurrentGatekeeper = null;
      
      console.log('AudioManager: Cleanup completed');
    }
  }
  
/**
 * Factory function to create AudioManager instance
 * Use this instead of the singleton to avoid SSR issues
 */
export function createAudioManager(config?: Partial<AudioManagerConfig>): AudioManager {
  return new AudioManager(config);
}

// Safe singleton pattern for browser-dependent service
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager | null {
  if (typeof window === 'undefined') {
    return null; // SSR safe
  }
  
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  
  return audioManagerInstance;
}

/**
 * @deprecated Use getAudioManager() factory function instead for better SSR safety
 * This singleton export will be removed in a future version
 */
export const audioManager = getAudioManager();