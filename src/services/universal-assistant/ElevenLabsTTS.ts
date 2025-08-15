export class ElevenLabsTTS {
    private apiKey: string;
    private voiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
    private modelId: string = 'eleven_multilingual_v2';
    private baseUrl: string = 'https://api.elevenlabs.io/v1';
  
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
  
    async generateSpeech(text: string, options?: {
      voiceId?: string;
      modelId?: string;
      stability?: number;
      similarityBoost?: number;
      speed?: number;
    }): Promise<ArrayBuffer> {
      const url = `${this.baseUrl}/text-to-speech/${options?.voiceId || this.voiceId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options?.modelId || this.modelId,
          voice_settings: {
            stability: options?.stability || 0.5,
            similarity_boost: options?.similarityBoost || 0.5,
          },
        }),
      });
  
      if (!response.ok) {
        throw new Error(`TTS generation failed: ${response.statusText}`);
      }
  
      return response.arrayBuffer();
    }

    /**
     * Generate streaming audio for real-time TTS
     */
    async generateStreamingAudio(
      text: string,
      options?: {
        voiceId?: string;
        model?: string;
        voiceSettings?: {
          stability?: number;
          similarity_boost?: number;
          style?: number;
          use_speaker_boost?: boolean;
        };
        outputFormat?: string;
        optimizeStreamingLatency?: string;
      }
    ): Promise<ReadableStream> {
      const url = `${this.baseUrl}/text-to-speech/${options?.voiceId || this.voiceId}/stream`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: options?.model || this.modelId,
          voice_settings: {
            stability: options?.voiceSettings?.stability || 0.5,
            similarity_boost: options?.voiceSettings?.similarity_boost || 0.5,
            style: options?.voiceSettings?.style || 0.0,
            use_speaker_boost: options?.voiceSettings?.use_speaker_boost || true,
          },
          output_format: options?.outputFormat || 'mp3_44100_128',
          optimize_streaming_latency: options?.optimizeStreamingLatency || 'speed',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Streaming TTS generation failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming TTS');
      }
  
      return response.body;
    }
  }