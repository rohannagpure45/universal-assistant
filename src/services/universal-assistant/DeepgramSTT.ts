import { LiveTranscriptionEvents, createClient, LiveClient } from '@deepgram/sdk';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  timestamp: number;
  isFinal: boolean;
  speaker?: number;
}

export class DeepgramSTT {
  private apiKey: string;
  private deepgramClient: any;
  private liveConnection: LiveClient | null = null;
  private onTranscription: ((result: TranscriptionResult) => void) | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.deepgramClient = createClient(apiKey);
  }

  async startLiveTranscription(options?: {
    model?: string;
    language?: string;
    punctuate?: boolean;
    diarize?: boolean;
    smart_format?: boolean;
    utterances?: boolean;
  }): Promise<void> {
    try {
      // Create live connection
      this.liveConnection = this.deepgramClient.listen.live({
        model: options?.model || 'nova-2',
        language: options?.language || 'en-US',
        punctuate: options?.punctuate !== false,
        diarize: options?.diarize || false,
        smart_format: options?.smart_format !== false,
        utterances: options?.utterances || false,
        interim_results: true,
        endpointing: 300,
      });

      const connection = this.liveConnection;
      if (!connection) {
        throw new Error('Failed to initialize Deepgram live connection');
      }

      // Handle transcription events
      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const result = data.channel?.alternatives?.[0];
        if (result && this.onTranscription) {
          this.onTranscription({
            transcript: result.transcript,
            confidence: result.confidence,
            timestamp: Date.now(),
            isFinal: data.is_final || false,
            speaker: result.words?.[0]?.speaker,
          });
        }
      });

      // Handle errors
      connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('Deepgram error:', error);
      });

      // Handle connection close
      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
        this.liveConnection = null;
      });

    } catch (error) {
      console.error('Failed to start live transcription:', error);
      throw error;
    }
  }

  sendAudioChunk(chunk: ArrayBuffer): void {
    if (this.liveConnection) {
      this.liveConnection.send(chunk);
    }
  }

  stopTranscription(): void {
    if (this.liveConnection) {
      this.liveConnection.finish();
      this.liveConnection = null;
    }
  }

  setTranscriptionHandler(handler: (result: TranscriptionResult) => void): void {
    this.onTranscription = handler;
  }

  async transcribeFile(audioFile: File): Promise<TranscriptionResult> {
    const response = await this.deepgramClient.transcription.preRecorded(
      { buffer: await audioFile.arrayBuffer(), mimetype: audioFile.type },
      {
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        smart_format: true,
      }
    );

    const result = response.results?.channels?.[0]?.alternatives?.[0];
    return {
      transcript: result?.transcript || '',
      confidence: result?.confidence || 0,
      timestamp: Date.now(),
      isFinal: true,
    };
  }
}