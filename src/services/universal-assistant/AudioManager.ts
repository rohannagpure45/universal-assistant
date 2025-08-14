export class AudioManager {
    private audioContext: AudioContext | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioStream: MediaStream | null = null;
    private audioChunks: Blob[] = [];
    private activeAudioElements: Set<HTMLAudioElement> = new Set();
    private recordingCallbacks: ((chunk: Blob) => void)[] = [];
  
    constructor() {
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
        // Request microphone access
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          }
        });
  
        // Create MediaRecorder
        const mimeType = this.getSupportedMimeType();
        this.mediaRecorder = new MediaRecorder(this.audioStream, {
          mimeType,
          audioBitsPerSecond: 128000,
        });
  
        // Handle data available
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
            if (onDataAvailable) {
              onDataAvailable(event.data);
            }
            this.recordingCallbacks.forEach(callback => callback(event.data));
          }
        };
  
        // Start recording with 100ms chunks
        this.mediaRecorder.start(100);
        console.log('Recording started');
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    }
  
    stopRecording(): Blob | null {
      if (!this.mediaRecorder) {
        console.warn('No active recording to stop');
        return null;
      }
  
      // Stop recording
      this.mediaRecorder.stop();
      
      // Stop all tracks
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }
  
      // Create final blob
      const audioBlob = new Blob(this.audioChunks, { 
        type: this.mediaRecorder.mimeType || 'audio/webm' 
      });
      
      // Reset
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.recordingCallbacks = [];
      
      console.log('Recording stopped');
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
  }
  
  export const audioManager = new AudioManager();