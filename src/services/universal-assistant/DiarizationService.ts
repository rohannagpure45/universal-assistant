export interface Speaker {
    id: string;
    name?: string;
    voiceProfile?: {
      embedding: number[];
      sampleRate: number;
      features: Record<string, any>;
    };
    lastActiveTime: number;
    totalSpeakingTime: number;
    utterances: Array<{
      text: string;
      timestamp: number;
      duration: number;
      confidence: number;
    }>;
  }
  
  export class DiarizationService {
    private speakers: Map<string, Speaker> = new Map();
    private activeSpeaker: string | null = null;
    private speakerChangeCallbacks: Set<(speakerId: string) => void> = new Set();
    private voiceEmbeddings: Map<string, number[]> = new Map();
  
    async processSpeakerSegment(
      audioData: ArrayBuffer,
      transcript: string,
      speakerId?: string,
      timestamp?: number
    ): Promise<string> {
      // Generate or retrieve speaker ID
      const id = speakerId || await this.identifySpeaker(audioData);
      
      // Update or create speaker
      let speaker = this.speakers.get(id);
      if (!speaker) {
        speaker = {
          id,
          lastActiveTime: timestamp || Date.now(),
          totalSpeakingTime: 0,
          utterances: [],
        };
        this.speakers.set(id, speaker);
      }
  
      // Add utterance
      const utterance = {
        text: transcript,
        timestamp: timestamp || Date.now(),
        duration: 0, // Calculate from audio if needed
        confidence: 0.95,
      };
      speaker.utterances.push(utterance);
      speaker.lastActiveTime = utterance.timestamp;
  
      // Handle speaker change
      if (this.activeSpeaker !== id) {
        this.activeSpeaker = id;
        this.notifySpeakerChange(id);
      }
  
      return id;
    }
  
    private async identifySpeaker(audioData: ArrayBuffer): Promise<string> {
      // Extract voice features (simplified - would use actual voice embedding model)
      const embedding = await this.extractVoiceEmbedding(audioData);
      
      // Compare with known speakers
      let bestMatch: { id: string; similarity: number } | null = null;
      for (const [speakerId, knownEmbedding] of this.voiceEmbeddings) {
        const similarity = this.cosineSimilarity(embedding, knownEmbedding);
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { id: speakerId, similarity };
        }
      }
  
      // Threshold for new speaker detection
      if (!bestMatch || bestMatch.similarity < 0.7) {
        const newId = `speaker_${this.speakers.size + 1}`;
        this.voiceEmbeddings.set(newId, embedding);
        return newId;
      }
  
      return bestMatch.id;
    }
  
    private async extractVoiceEmbedding(audioData: ArrayBuffer): Promise<number[]> {
      // Placeholder - would use actual voice embedding model
      // In production, use pyannote.audio or similar
      const view = new DataView(audioData);
      const embedding: number[] = [];
      const sampleSize = Math.min(512, view.byteLength / 4);
          
    for (let i = 0; i < sampleSize; i++) {
        embedding.push(view.getFloat32(i * 4, true));
      }
      
      return embedding;
    }
  
    private cosineSimilarity(a: number[], b: number[]): number {
      if (a.length !== b.length) return 0;
      
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
  
    private notifySpeakerChange(speakerId: string): void {
      this.speakerChangeCallbacks.forEach(callback => callback(speakerId));
    }
  
    onSpeakerChange(callback: (speakerId: string) => void): () => void {
      this.speakerChangeCallbacks.add(callback);
      return () => this.speakerChangeCallbacks.delete(callback);
    }
  
    getSpeaker(id: string): Speaker | undefined {
      return this.speakers.get(id);
    }
  
    getAllSpeakers(): Speaker[] {
      return Array.from(this.speakers.values());
    }
  
    assignName(speakerId: string, name: string): void {
      const speaker = this.speakers.get(speakerId);
      if (speaker) {
        speaker.name = name;
      }
    }
  
    mergeSpeakers(speakerId1: string, speakerId2: string): void {
      const speaker1 = this.speakers.get(speakerId1);
      const speaker2 = this.speakers.get(speakerId2);
      
      if (speaker1 && speaker2) {
        // Merge utterances
        speaker1.utterances.push(...speaker2.utterances);
        speaker1.utterances.sort((a, b) => a.timestamp - b.timestamp);
        
        // Update stats
        speaker1.totalSpeakingTime += speaker2.totalSpeakingTime;
        speaker1.lastActiveTime = Math.max(
          speaker1.lastActiveTime,
          speaker2.lastActiveTime
        );
        
        // Remove speaker2
        this.speakers.delete(speakerId2);
        this.voiceEmbeddings.delete(speakerId2);
      }
    }
  
    reset(): void {
      this.speakers.clear();
      this.voiceEmbeddings.clear();
      this.activeSpeaker = null;
    }
  }
  
  export const diarizationService = new DiarizationService();