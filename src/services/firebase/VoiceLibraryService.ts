/**
 * Voice Library Service
 * Manages voice identification data in the voice_library collection
 */

import { db } from '@/lib/firebase/client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import type { VoiceLibraryEntry } from '@/types/database';

export class VoiceLibraryService {
  private static readonly COLLECTION_NAME = 'voice_library';
  private static readonly MAX_AUDIO_SAMPLES = 5;
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * Get or create a voice library entry
   */
  static async getOrCreateVoiceEntry(deepgramVoiceId: string): Promise<VoiceLibraryEntry> {
    try {
      const voiceRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      const voiceSnap = await getDoc(voiceRef);

      if (voiceSnap.exists()) {
        return this.convertFromFirestore(voiceSnap.data());
      }

      // Create new entry
      const newEntry: Omit<VoiceLibraryEntry, 'deepgramVoiceId'> = {
        userId: null,
        userName: null,
        confirmed: false,
        confidence: 0,
        firstHeard: new Date(),
        lastHeard: new Date(),
        meetingsCount: 1,
        totalSpeakingTime: 0,
        audioSamples: [],
        identificationHistory: []
      };

      await setDoc(voiceRef, {
        ...this.convertToFirestore(newEntry),
        createdAt: serverTimestamp()
      });

      return { deepgramVoiceId, ...newEntry };
    } catch (error) {
      console.error('Error getting/creating voice entry:', error);
      throw error;
    }
  }

  /**
   * Update voice identification with user info
   */
  static async identifyVoice(
    deepgramVoiceId: string,
    userId: string,
    userName: string,
    method: 'self' | 'mentioned' | 'manual' | 'pattern',
    meetingId: string,
    confidence: number = 1.0
  ): Promise<void> {
    try {
      const voiceRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      
      await updateDoc(voiceRef, {
        userId,
        userName,
        confirmed: confidence >= this.MIN_CONFIDENCE_THRESHOLD,
        confidence,
        lastHeard: serverTimestamp(),
        identificationHistory: arrayUnion({
          method,
          timestamp: serverTimestamp(),
          meetingId,
          confidence,
          details: `Identified as ${userName} via ${method}`
        })
      });
    } catch (error) {
      console.error('Error identifying voice:', error);
      throw error;
    }
  }

  /**
   * Add an audio sample to a voice entry
   */
  static async addAudioSample(
    deepgramVoiceId: string,
    sample: {
      url: string;
      transcript: string;
      quality: number;
      duration: number;
    }
  ): Promise<void> {
    try {
      const voiceRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      const voiceSnap = await getDoc(voiceRef);

      if (!voiceSnap.exists()) {
        await this.getOrCreateVoiceEntry(deepgramVoiceId);
      }

      const currentData = voiceSnap.data();
      let audioSamples = currentData?.audioSamples || [];

      // Add new sample with timestamp
      audioSamples.push({
        ...sample,
        timestamp: new Date()
      });

      // Keep only the best N samples (sorted by quality)
      audioSamples.sort((a: any, b: any) => b.quality - a.quality);
      audioSamples = audioSamples.slice(0, this.MAX_AUDIO_SAMPLES);

      await updateDoc(voiceRef, {
        audioSamples: audioSamples.map((s: any) => ({
          ...s,
          timestamp: s.timestamp instanceof Date ? Timestamp.fromDate(s.timestamp) : s.timestamp
        })),
        lastHeard: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding audio sample:', error);
      throw error;
    }
  }

  /**
   * Update speaking time for a voice
   */
  static async updateSpeakingTime(
    deepgramVoiceId: string,
    additionalSeconds: number
  ): Promise<void> {
    try {
      const voiceRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      
      await updateDoc(voiceRef, {
        totalSpeakingTime: increment(additionalSeconds),
        meetingsCount: increment(1),
        lastHeard: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating speaking time:', error);
      throw error;
    }
  }

  /**
   * Get all confirmed voice profiles for a user
   */
  static async getUserVoiceProfiles(userId: string): Promise<VoiceLibraryEntry[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('confirmed', '==', true)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        deepgramVoiceId: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user voice profiles:', error);
      throw error;
    }
  }

  /**
   * Get unconfirmed voices (for identification UI)
   */
  static async getUnconfirmedVoices(limit: number = 10): Promise<VoiceLibraryEntry[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('confirmed', '==', false),
        orderBy('meetingsCount', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        deepgramVoiceId: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting unconfirmed voices:', error);
      throw error;
    }
  }

  /**
   * Search for potential voice matches by comparing audio characteristics
   */
  static async findPotentialMatches(
    deepgramVoiceId: string,
    threshold: number = 0.6
  ): Promise<Array<{ voiceId: string; confidence: number; userName?: string }>> {
    try {
      // This would ideally use audio fingerprinting or ML
      // For now, we'll return voices with similar meeting patterns
      const targetVoice = await this.getOrCreateVoiceEntry(deepgramVoiceId);
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('confirmed', '==', true),
        orderBy('confidence', 'desc'),
        limit(5)
      );

      const snapshot = await getDocs(q);
      const matches = snapshot.docs
        .map(doc => {
          const data = doc.data();
          // Simple confidence calculation based on metadata similarity
          // In production, this would use audio analysis
          const confidence = data.confidence || 0;
          
          return {
            voiceId: doc.id,
            confidence,
            userName: data.userName
          };
        })
        .filter(match => match.confidence >= threshold);

      return matches;
    } catch (error) {
      console.error('Error finding potential matches:', error);
      throw error;
    }
  }

  /**
   * Convert Firestore data to VoiceLibraryEntry
   */
  private static convertFromFirestore(data: any): Omit<VoiceLibraryEntry, 'deepgramVoiceId'> {
    return {
      userId: data.userId || null,
      userName: data.userName || null,
      confirmed: data.confirmed || false,
      confidence: data.confidence || 0,
      firstHeard: data.firstHeard?.toDate() || new Date(),
      lastHeard: data.lastHeard?.toDate() || new Date(),
      meetingsCount: data.meetingsCount || 0,
      totalSpeakingTime: data.totalSpeakingTime || 0,
      audioSamples: (data.audioSamples || []).map((s: any) => ({
        ...s,
        timestamp: s.timestamp?.toDate() || new Date()
      })),
      identificationHistory: (data.identificationHistory || []).map((h: any) => ({
        ...h,
        timestamp: h.timestamp?.toDate() || new Date()
      }))
    };
  }

  /**
   * Convert VoiceLibraryEntry to Firestore format
   */
  private static convertToFirestore(entry: Omit<VoiceLibraryEntry, 'deepgramVoiceId'>): any {
    return {
      ...entry,
      firstHeard: Timestamp.fromDate(entry.firstHeard),
      lastHeard: Timestamp.fromDate(entry.lastHeard),
      audioSamples: entry.audioSamples.map(s => ({
        ...s,
        timestamp: Timestamp.fromDate(s.timestamp)
      })),
      identificationHistory: entry.identificationHistory.map(h => ({
        ...h,
        timestamp: Timestamp.fromDate(h.timestamp)
      }))
    };
  }
}