import { SpeakerProfile } from '@/types';
import { db } from '@/lib/firebase/client';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';

export class VoiceProfileManager {
  private profiles: Map<string, SpeakerProfile> = new Map();
  private userId: string | null = null;
  private similarityThreshold: number = 0.85;

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadProfiles();
  }

  private async loadProfiles(): Promise<void> {
    if (!this.userId) return;

    try {
      const profilesRef = collection(db, 'users', this.userId, 'voiceProfiles');
      const snapshot = await getDocs(profilesRef);
      
      snapshot.forEach(doc => {
        const profile = doc.data() as SpeakerProfile;
        this.profiles.set(profile.speakerId, profile);
      });
      
      console.log(`Loaded ${this.profiles.size} voice profiles`);
    } catch (error) {
      console.error('Error loading voice profiles:', error);
    }
  }

  async matchSpeaker(voiceEmbedding: number[], speakerId: number): Promise<SpeakerProfile | null> {
    let bestMatch: SpeakerProfile | null = null;
    let highestSimilarity = 0;

    for (const profile of this.profiles.values()) {
      const similarity = this.calculateCosineSimilarity(
        voiceEmbedding,
        profile.voiceEmbedding
      );

      if (similarity > highestSimilarity && similarity >= this.similarityThreshold) {
        highestSimilarity = similarity;
        bestMatch = profile;
      }
    }

    if (bestMatch) {
      // Update confidence
      bestMatch.confidence = (bestMatch.confidence + highestSimilarity) / 2;
      bestMatch.sessionCount++;
      bestMatch.lastSeen = new Date();
      await this.saveProfile(bestMatch);
    } else {
      // Create new profile
      bestMatch = await this.createNewProfile(voiceEmbedding, speakerId);
    }

    return bestMatch;
  }

  private async createNewProfile(
    voiceEmbedding: number[],
    speakerId: number
  ): Promise<SpeakerProfile> {
    const profile: SpeakerProfile = {
      speakerId: `speaker_${speakerId}_${Date.now()}`,
      voiceId: `voice_${speakerId}`,
      userName: `Speaker ${speakerId}`,
      voiceEmbedding,
      lastSeen: new Date(),
      confidence: 0.7,
      sessionCount: 1,
    };

    this.profiles.set(profile.speakerId, profile);
    await this.saveProfile(profile);
    
    return profile;
  }

  private async saveProfile(profile: SpeakerProfile): Promise<void> {
    if (!this.userId) return;

    try {
      const profileRef = doc(
        db,
        'users',
        this.userId,
        'voiceProfiles',
        profile.speakerId
      );
      
      await setDoc(profileRef, {
        ...profile,
        lastSeen: profile.lastSeen.toISOString(),
      });
    } catch (error) {
      console.error('Error saving voice profile:', error);
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  async updateProfileName(speakerId: string, userName: string): Promise<void> {
    const profile = this.profiles.get(speakerId);
    if (profile) {
      profile.userName = userName;
      await this.saveProfile(profile);
    }
  }

  getProfile(speakerId: string): SpeakerProfile | undefined {
    return this.profiles.get(speakerId);
  }

  getAllProfiles(): SpeakerProfile[] {
    return Array.from(this.profiles.values());
  }

  clearProfiles(): void {
    this.profiles.clear();
  }
}

export const voiceProfileManager = new VoiceProfileManager();