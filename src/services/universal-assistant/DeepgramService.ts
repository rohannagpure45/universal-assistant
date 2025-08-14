import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';

export interface DeepgramConfig {
  model: string;
  language: string;
  diarize: boolean;
  punctuate: boolean;
  numerals: boolean;
  utterances: boolean;
  interim_results: boolean;
  endpointing: number;
  diarize_version?: string;
}

export interface DiarizationResult {
  transcript: string;
  speaker: number;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker: number;
  }>;
}

export class DeepgramService {
  private client: any;
  private connection: LiveClient | null = null;
  private config: DeepgramConfig;
  private callbacks: Map<string, Function> = new Map();

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
    this.config = {
      model: 'nova-3',
      language: 'en',
      diarize: true,
      punctuate: true,
      numerals: true,
      utterances: true,
      interim_results: true,
      endpointing: 300,
      diarize_version: '2025-08-14',
    };
  }

  async connect(onTranscript?: (result: DiarizationResult) => void): Promise<void> {
    try {
      this.connection = this.client.listen.live(this.config);
      const connection = this.connection;
      if (!connection) {
        throw new Error('Failed to initialize Deepgram live connection');
      }

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram connection opened');
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const result = this.processDiarizationResult(data);
        if (result && onTranscript) {
          onTranscript(result);
        }
        this.callbacks.forEach(callback => callback(result));
      });

      connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('Deepgram error:', error);
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
      });
    } catch (error) {
      console.error('Failed to connect to Deepgram:', error);
      throw error;
    }
  }

  sendAudio(audioData: Blob | ArrayBuffer): void {
    if (!this.connection) {
      console.warn('No active Deepgram connection');
      return;
    }

    try {
      if (audioData instanceof Blob) {
        audioData.arrayBuffer().then(buffer => {
          this.connection?.send(buffer);
        });
      } else {
        this.connection.send(audioData);
      }
    } catch (error) {
      console.error('Error sending audio to Deepgram:', error);
    }
  }

  private processDiarizationResult(data: any): DiarizationResult | null {
    if (!data.channel?.alternatives?.[0]) {
      return null;
    }

    const alternative = data.channel.alternatives[0];
    
    if (!alternative.transcript) {
      return null;
    }

    return {
      transcript: alternative.transcript,
      speaker: alternative.words?.[0]?.speaker || 0,
      confidence: alternative.confidence || 0,
      words: alternative.words || [],
    };
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }

  updateConfig(config: Partial<DeepgramConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onTranscript(callback: (result: DiarizationResult) => void): string {
    const id = `callback_${Date.now()}_${Math.random()}`;
    this.callbacks.set(id, callback);
    return id;
  }

  offTranscript(id: string): void {
    this.callbacks.delete(id);
  }

  isConnected(): boolean {
    return this.connection !== null;
  }
}