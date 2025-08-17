import { AudioQueueManager } from './AudioQueueManager';

interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

interface ElevenLabsService {
  textToSpeech(options: {
    text: string;
    voice_settings: {
      stability: number;
      similarity_boost: number;
      style: number;
      use_speaker_boost: boolean;
    };
    model_id: string;
    voice_id: string;
  }): Promise<string>;
}

export class EnhancedTTSService {
    private elevenLabs: ElevenLabsService;
    private audioQueue: AudioQueueManager;
    private voiceSettings = {
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
      modelId: 'eleven_multilingual_v2',
      stability: 0.75,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    };

    constructor(elevenLabs: ElevenLabsService, audioQueue: AudioQueueManager) {
      this.elevenLabs = elevenLabs;
      this.audioQueue = audioQueue;
    }
    
    async generateHighQualityTTS(
      text: string,
      options?: Partial<TTSOptions>
    ): Promise<string> {
      const settings = { ...this.voiceSettings, ...options };
      
      // Pre-process text for better pronunciation
      const processedText = this.preprocessText(text);
      
      // Generate TTS with ElevenLabs
      const audioUrl = await this.elevenLabs.textToSpeech({
        text: processedText,
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarityBoost,
          style: settings.style,
          use_speaker_boost: settings.useSpeakerBoost
        },
        model_id: settings.modelId,
        voice_id: settings.voiceId
      });
      
      return audioUrl;
    }
    
    private preprocessText(text: string): string {
      // Add pauses for better rhythm
      text = text.replace(/\. /g, '. <break time="0.5s"/> ');
      text = text.replace(/\? /g, '? <break time="0.5s"/> ');
      text = text.replace(/! /g, '! <break time="0.5s"/> ');
      
      // Handle abbreviations
      text = text.replace(/Dr\./g, 'Doctor');
      text = text.replace(/Mr\./g, 'Mister');
      text = text.replace(/Mrs\./g, 'Missus');
      
      return text;
    }
  }