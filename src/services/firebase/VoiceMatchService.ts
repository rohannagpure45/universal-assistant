/**
 * Voice Match Service
 * Manages voice matching cache for performance optimization
 */

import { db } from '@/lib/firebase/client';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import type { VoiceMatch, MeetingHistoryEntry } from '@/types/database';

export class VoiceMatchService {
  private static readonly COLLECTION_NAME = 'voice_matches';
  private static readonly MAX_HISTORY_ENTRIES = 10;

  /**
   * Get voice match cache entry
   */
  static async getVoiceMatch(deepgramVoiceId: string): Promise<VoiceMatch | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          deepgramVoiceId,
          ...this.convertFromFirestore(docSnap.data())
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting voice match:', error);
      throw error;
    }
  }

  /**
   * Create or update voice match cache
   */
  static async updateVoiceMatch(
    deepgramVoiceId: string,
    confirmedUserId: string | null,
    meetingEntry?: MeetingHistoryEntry
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      const existing = await this.getVoiceMatch(deepgramVoiceId);

      if (existing) {
        // Update existing entry
        const updateData: any = {
          lastUpdated: serverTimestamp()
        };

        if (confirmedUserId !== undefined) {
          updateData.confirmedUserId = confirmedUserId;
        }

        if (meetingEntry) {
          // Add to meeting history, keeping only the latest entries
          let history = existing.meetingHistory || [];
          history.unshift(meetingEntry);
          history = history.slice(0, this.MAX_HISTORY_ENTRIES);
          updateData.meetingHistory = history.map(this.convertToFirestore);
        }

        await updateDoc(docRef, updateData);
      } else {
        // Create new entry
        const newMatch: Omit<VoiceMatch, 'deepgramVoiceId'> = {
          confirmedUserId,
          lastUpdated: new Date(),
          meetingHistory: meetingEntry ? [meetingEntry] : []
        };

        await setDoc(docRef, {
          ...this.convertToFirestore(newMatch),
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating voice match:', error);
      throw error;
    }
  }

  /**
   * Get all confirmed voice matches
   */
  static async getConfirmedMatches(): Promise<VoiceMatch[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('confirmedUserId', '!=', null)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        deepgramVoiceId: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting confirmed matches:', error);
      throw error;
    }
  }

  /**
   * Get voice matches for a specific user
   */
  static async getMatchesForUser(userId: string): Promise<VoiceMatch[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('confirmedUserId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        deepgramVoiceId: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting matches for user:', error);
      throw error;
    }
  }

  /**
   * Add meeting history entry to voice match
   */
  static async addMeetingHistory(
    deepgramVoiceId: string,
    meetingEntry: MeetingHistoryEntry
  ): Promise<void> {
    try {
      await this.updateVoiceMatch(deepgramVoiceId, null, meetingEntry);
    } catch (error) {
      console.error('Error adding meeting history:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a voice (useful when identification changes)
   */
  static async clearVoiceMatch(deepgramVoiceId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, deepgramVoiceId);
      await setDoc(docRef, {
        confirmedUserId: null,
        lastUpdated: serverTimestamp(),
        meetingHistory: []
      });
    } catch (error) {
      console.error('Error clearing voice match:', error);
      throw error;
    }
  }

  /**
   * Convert Firestore data to JavaScript objects
   */
  private static convertFromFirestore(data: any): any {
    const converted = { ...data };
    
    // Convert Timestamps to Dates
    if (converted.lastUpdated?.toDate) {
      converted.lastUpdated = converted.lastUpdated.toDate();
    }
    
    if (converted.meetingHistory) {
      converted.meetingHistory = converted.meetingHistory.map((entry: any) => ({
        ...entry,
        date: entry.date?.toDate ? entry.date.toDate() : entry.date
      }));
    }
    
    return converted;
  }

  /**
   * Convert JavaScript objects to Firestore format
   */
  private static convertToFirestore(data: any): any {
    const converted = { ...data };
    
    // Convert Dates to Timestamps
    if (converted.lastUpdated instanceof Date) {
      converted.lastUpdated = Timestamp.fromDate(converted.lastUpdated);
    }
    
    if (converted.meetingHistory) {
      converted.meetingHistory = converted.meetingHistory.map((entry: any) => ({
        ...entry,
        date: entry.date instanceof Date ? Timestamp.fromDate(entry.date) : entry.date
      }));
    }
    
    return converted;
  }
}