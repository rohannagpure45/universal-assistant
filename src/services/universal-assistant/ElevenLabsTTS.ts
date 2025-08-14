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
  }