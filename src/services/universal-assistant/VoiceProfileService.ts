import { adminDb, adminStorage } from '@/lib/firebase/admin';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

export interface VoiceProfile {
  id: string;
  userId: string;
  name: string;
  voiceId?: string; // ElevenLabs voice ID
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    speed: number;
    pitch?: number;
  };
  embedding?: number[]; // Voice embedding for speaker recognition
  sampleAudioUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  metadata: {
    language?: string;
    accent?: string;
    gender?: string;
    ageRange?: string;
    description?: string;
  };
}

export class VoiceProfileService {
  private profileCache: Map<string, VoiceProfile> = new Map();

  // Helper function to ensure adminDb is initialized
  private ensureAdminDb(): import('firebase-admin/firestore').Firestore {
    const db = adminDb();
    if (!db) {
      throw new Error('Firebase Admin Database not initialized');
    }
    return db;
  }

  async createProfile(
    userId: string,
    profileData: Omit<VoiceProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<VoiceProfile> {
    const profile: VoiceProfile = {
      ...profileData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    await this.ensureAdminDb()
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .doc(profile.id)
      .set(profile);

    this.profileCache.set(profile.id, profile);
    return profile;
  }

  async getProfile(userId: string, profileId: string): Promise<VoiceProfile | null> {
    // Check cache first
    if (this.profileCache.has(profileId)) {
      return this.profileCache.get(profileId)!;
    }

    // Fetch from Firestore
    const doc = await this.ensureAdminDb()
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .doc(profileId)
      .get();

    if (!doc.exists) {
      return null;
    }

    const profile = doc.data() as VoiceProfile;
    this.profileCache.set(profileId, profile);
    return profile;
  }

  async getUserProfiles(userId: string): Promise<VoiceProfile[]> {
    const snapshot = await this.ensureAdminDb()
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => doc.data() as VoiceProfile);
  }

  async updateProfile(
    userId: string,
    profileId: string,
    updates: Partial<VoiceProfile>
  ): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    await this.ensureAdminDb()
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .doc(profileId)
      .update(updateData);

    // Update cache
    if (this.profileCache.has(profileId)) {
      const cached = this.profileCache.get(profileId)!;
      this.profileCache.set(profileId, { ...cached, ...updateData });
    }
  }

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    await this.ensureAdminDb()
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .doc(profileId)
      .delete();

    this.profileCache.delete(profileId);
  }

  async setDefaultProfile(userId: string, profileId: string): Promise<void> {
    // First, unset any existing default
    const profiles = await this.getUserProfiles(userId);
    const batch = this.ensureAdminDb().batch();

    for (const profile of profiles) {
      if (profile.isDefault) {
        const ref = this.ensureAdminDb()
          .collection('users')
          .doc(userId)
          .collection('voiceProfiles')
          .doc(profile.id);
        batch.update(ref, { isDefault: false });
      }
    }

    // Set new default
    const ref = this.ensureAdminDb()
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .doc(profileId);
    batch.update(ref, { isDefault: true });

    await batch.commit();
  }

  async uploadVoiceSample(
    userId: string,
    profileId: string,
    audioFile: Buffer,
    mimeType: string
  ): Promise<string> {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }

    const fileName = `voice-samples/${userId}/${profileId}/sample.${mimeType.split('/')[1]}`;
    const file = storage.bucket().file(fileName);

    await file.save(audioFile, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Generate signed URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    // Update profile with sample URL
    await this.updateProfile(userId, profileId, { sampleAudioUrl: url });

    return url;
  }

  async extractVoiceEmbedding(audioData: ArrayBuffer): Promise<number[]> {
    // This would integrate with a voice embedding model
    // For now, return a placeholder
    const view = new DataView(audioData);
    const embedding: number[] = [];
    
    for (let i = 0; i < 256; i++) {
      if (i * 4 < view.byteLength) {
        embedding.push(view.getFloat32(i * 4, true));
      } else {
        embedding.push(0);
      }
    }
    
    return embedding;
  }

  async matchVoiceToProfile(
    userId: string,
    audioData: ArrayBuffer
  ): Promise<VoiceProfile | null> {
    const embedding = await this.extractVoiceEmbedding(audioData);
    const profiles = await this.getUserProfiles(userId);
    
    let bestMatch: { profile: VoiceProfile; similarity: number } | null = null;
    
    for (const profile of profiles) {
      if (profile.embedding) {
        const similarity = this.cosineSimilarity(embedding, profile.embedding);
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { profile, similarity };
        }
      }
    }
    
    // Threshold for match
    if (bestMatch && bestMatch.similarity > 0.8) {
      return bestMatch.profile;
    }
    
    return null;
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
}

export const voiceProfileService = new VoiceProfileService();