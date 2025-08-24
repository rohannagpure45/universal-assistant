/**
 * Needs Identification Service
 * Manages pending speaker identification requests
 */

import { db } from '@/lib/firebase/client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type { NeedsIdentification } from '@/types/database';

export class NeedsIdentificationService {
  private static readonly COLLECTION_NAME = 'needs_identification';

  /**
   * Create a new identification request
   */
  static async createIdentificationRequest(
    data: Omit<NeedsIdentification, 'id' | 'createdAt' | 'status' | 'resolvedAt' | 'resolvedUserId' | 'resolvedUserName'>
  ): Promise<string> {
    try {
      // Use deepgramVoiceId if provided, otherwise fall back to voiceId for backward compatibility
      const voiceId = data.deepgramVoiceId || data.voiceId;
      const docId = `${data.meetingId}_${voiceId}`;
      const docRef = doc(db, this.COLLECTION_NAME, docId);

      const requestData = {
        ...data,
        deepgramVoiceId: voiceId,  // Ensure consistent field
        voiceId: voiceId,          // Maintain backward compatibility
        status: 'pending' as const,
        createdAt: serverTimestamp()
      };

      await setDoc(docRef, this.convertToFirestore(requestData as any));

      return docId;
    } catch (error) {
      console.error('Error creating identification request:', error);
      throw error;
    }
  }

  /**
   * Get identification requests for a specific host
   */
  static async getHostRequests(
    hostId: string,
    statusFilter?: 'pending' | 'identified' | 'skipped'
  ): Promise<NeedsIdentification[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('hostId', '==', hostId)
      );

      if (statusFilter) {
        q = query(q, where('status', '==', statusFilter));
      }

      q = query(q, orderBy('createdAt', 'desc'), limit(20));

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting host requests:', error);
      throw error;
    }
  }

  /**
   * Get all pending identification requests
   * @param meetingIdOrLimit - Either a meetingId string or a number limit
   */
  static async getPendingRequests(meetingIdOrLimit: string | number = 10): Promise<NeedsIdentification[]> {
    try {
      // If string, it's a meetingId - get requests for that meeting
      if (typeof meetingIdOrLimit === 'string') {
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where('meetingId', '==', meetingIdOrLimit),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFromFirestore(doc.data())
        }));
      } else {
        // Otherwise it's a limit number - get all pending requests
        const q = query(
          collection(db, this.COLLECTION_NAME),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(meetingIdOrLimit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFromFirestore(doc.data())
        }));
      }
    } catch (error) {
      console.error('Error getting pending requests:', error);
      throw error;
    }
  }

  /**
   * Get identification requests for a specific meeting
   */
  static async getMeetingRequests(meetingId: string): Promise<NeedsIdentification[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('meetingId', '==', meetingId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting meeting requests:', error);
      throw error;
    }
  }

  /**
   * Add AI-suggested matches to a request
   */
  static async addSuggestedMatches(
    requestId: string,
    matches: Array<{
      userId: string;
      userName: string;
      confidence: number;
      reason: string;
    }>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, requestId);
      
      await updateDoc(docRef, {
        suggestedMatches: matches,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding suggested matches:', error);
      throw error;
    }
  }

  /**
   * Resolve an identification request
   */
  static async resolveRequest(
    requestId: string,
    status: 'identified' | 'skipped',
    resolvedUserId?: string,
    resolvedUserName?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, requestId);
      
      const updateData: any = {
        status,
        resolvedAt: serverTimestamp()
      };

      if (status === 'identified' && resolvedUserId) {
        updateData.resolvedUserId = resolvedUserId;
        updateData.resolvedUserName = resolvedUserName;
      }

      await updateDoc(docRef, updateData);

      // If identified, also update the voice_library
      if (status === 'identified' && resolvedUserId) {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const { VoiceLibraryService } = await import('./VoiceLibraryService');
          
          await VoiceLibraryService.identifyVoice(
            data.voiceId,
            resolvedUserId,
            resolvedUserName || 'Unknown',
            'manual',
            data.meetingId,
            0.9
          );
        }
      }
    } catch (error) {
      console.error('Error resolving request:', error);
      throw error;
    }
  }

  /**
   * Delete old resolved requests (cleanup)
   */
  static async cleanupOldRequests(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('status', '!=', 'pending'),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(q);
      let deletedCount = 0;

      for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
        deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old requests:', error);
      throw error;
    }
  }

  /**
   * Check if a voice already has a pending request for a meeting
   */
  static async hasPendingRequest(meetingId: string, voiceId: string): Promise<boolean> {
    try {
      const docId = `${meetingId}_${voiceId}`;
      const docRef = doc(db, this.COLLECTION_NAME, docId);
      const docSnap = await getDoc(docRef);
      
      return docSnap.exists() && docSnap.data()?.status === 'pending';
    } catch (error) {
      console.error('Error checking pending request:', error);
      return false;
    }
  }

  /**
   * Convert Firestore data to NeedsIdentification
   */
  private static convertFromFirestore(data: any): Omit<NeedsIdentification, 'id'> {
    // Handle both deepgramVoiceId and voiceId for backward compatibility
    const voiceId = data.deepgramVoiceId || data.voiceId;
    
    return {
      meetingId: data.meetingId,
      meetingTitle: data.meetingTitle,
      meetingDate: data.meetingDate?.toDate() || new Date(),
      meetingTypeId: data.meetingTypeId,
      hostId: data.hostId,
      deepgramVoiceId: voiceId,
      voiceId: voiceId,  // Maintain backward compatibility
      speakerLabel: data.speakerLabel,
      sampleTranscripts: (data.sampleTranscripts || []).map((s: any) => ({
        text: s.text,
        timestamp: s.timestamp?.toDate() || new Date()
      })),
      audioUrl: data.audioUrl,
      suggestedMatches: data.suggestedMatches || [],
      status: data.status || 'pending',
      resolvedUserId: data.resolvedUserId,
      resolvedUserName: data.resolvedUserName,
      resolvedAt: data.resolvedAt?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date()
    };
  }

  /**
   * Convert NeedsIdentification to Firestore format
   */
  private static convertToFirestore(data: Omit<NeedsIdentification, 'id' | 'createdAt'>): any {
    return {
      ...data,
      meetingDate: Timestamp.fromDate(data.meetingDate),
      resolvedAt: data.resolvedAt ? Timestamp.fromDate(data.resolvedAt) : undefined,
      sampleTranscripts: data.sampleTranscripts.map(s => ({
        text: s.text,
        timestamp: Timestamp.fromDate(s.timestamp)
      }))
    };
  }
}