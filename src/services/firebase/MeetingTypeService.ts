/**
 * Meeting Type Service
 * Manages meeting templates and configurations
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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import type { MeetingTypeConfig } from '@/types/database';
import type { AIModel } from '@/types';

export class MeetingTypeService {
  private static readonly COLLECTION_NAME = 'meeting_types';

  /**
   * Create a new meeting type
   */
  static async createMeetingType(
    data: Omit<MeetingTypeConfig, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      const docRef = doc(collection(db, this.COLLECTION_NAME));
      
      await setDoc(docRef, {
        ...this.convertToFirestore(data),
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating meeting type:', error);
      throw error;
    }
  }

  /**
   * Get a meeting type by ID
   */
  static async getMeetingType(meetingTypeId: string): Promise<MeetingTypeConfig | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, meetingTypeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...this.convertFromFirestore(docSnap.data())
      };
    } catch (error) {
      console.error('Error getting meeting type:', error);
      throw error;
    }
  }

  /**
   * Get all meeting types for a user
   */
  static async getUserMeetingTypes(userId: string): Promise<MeetingTypeConfig[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting user meeting types:', error);
      throw error;
    }
  }

  /**
   * Get all public/shared meeting types
   */
  static async getPublicMeetingTypes(): Promise<MeetingTypeConfig[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('name')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFromFirestore(doc.data())
      }));
    } catch (error) {
      console.error('Error getting public meeting types:', error);
      throw error;
    }
  }

  /**
   * Update a meeting type
   */
  static async updateMeetingType(
    meetingTypeId: string,
    updates: Partial<MeetingTypeConfig>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, meetingTypeId);
      
      const { id, createdAt, ...updateData } = updates;
      
      await updateDoc(docRef, {
        ...this.convertToFirestore(updateData as any),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meeting type:', error);
      throw error;
    }
  }

  /**
   * Add or update user-specific model override
   */
  static async setUserModelOverride(
    meetingTypeId: string,
    userId: string,
    preferredModel: AIModel
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, meetingTypeId);
      
      await updateDoc(docRef, {
        [`modelOverrides.${userId}`]: {
          preferredModel,
          lastUsed: serverTimestamp()
        }
      });
    } catch (error) {
      console.error('Error setting user model override:', error);
      throw error;
    }
  }

  /**
   * Update model performance history
   */
  static async updateModelPerformance(
    meetingTypeId: string,
    model: string,
    metrics: {
      responseTime: number;
      success: boolean;
      userSatisfaction?: number;
    }
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, meetingTypeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Meeting type not found');
      }

      const data = docSnap.data();
      const history = data.modelCompatibility?.performanceHistory || [];
      
      // Find or create entry for this model
      let modelEntry = history.find((h: any) => h.model === model);
      
      if (!modelEntry) {
        modelEntry = {
          model,
          avgResponseTime: metrics.responseTime,
          successRate: metrics.success ? 1 : 0,
          userSatisfaction: metrics.userSatisfaction || 0,
          sampleCount: 1
        };
        history.push(modelEntry);
      } else {
        // Update running averages
        const count = modelEntry.sampleCount || 1;
        modelEntry.avgResponseTime = 
          (modelEntry.avgResponseTime * count + metrics.responseTime) / (count + 1);
        modelEntry.successRate = 
          (modelEntry.successRate * count + (metrics.success ? 1 : 0)) / (count + 1);
        if (metrics.userSatisfaction !== undefined) {
          modelEntry.userSatisfaction = 
            (modelEntry.userSatisfaction * count + metrics.userSatisfaction) / (count + 1);
        }
        modelEntry.sampleCount = count + 1;
      }

      await updateDoc(docRef, {
        'modelCompatibility.performanceHistory': history,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating model performance:', error);
      throw error;
    }
  }

  /**
   * Add a regular participant to a meeting type
   */
  static async addRegularParticipant(
    meetingTypeId: string,
    userId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, meetingTypeId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Meeting type not found');
      }

      const data = docSnap.data();
      const participants = data.regularParticipants || [];
      
      if (!participants.includes(userId) && participants.length < 10) {
        participants.push(userId);
        
        await updateDoc(docRef, {
          regularParticipants: participants,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error adding regular participant:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting type
   */
  static async deleteMeetingType(meetingTypeId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, meetingTypeId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting meeting type:', error);
      throw error;
    }
  }

  /**
   * Get recommended model for a meeting type
   */
  static async getRecommendedModel(meetingTypeId: string): Promise<string | null> {
    try {
      const meetingType = await this.getMeetingType(meetingTypeId);
      
      if (!meetingType) {
        return null;
      }

      // Check performance history for best performing model
      const history = meetingType.modelCompatibility?.performanceHistory || [];
      
      if (history.length > 0) {
        // Sort by success rate and user satisfaction
        const sorted = [...history].sort((a, b) => {
          const scoreA = a.successRate * 0.7 + (a.userSatisfaction / 5) * 0.3;
          const scoreB = b.successRate * 0.7 + (b.userSatisfaction / 5) * 0.3;
          return scoreB - scoreA;
        });
        
        return sorted[0].model;
      }

      return meetingType.modelCompatibility?.recommendedModel || meetingType.defaultModel;
    } catch (error) {
      console.error('Error getting recommended model:', error);
      return null;
    }
  }

  /**
   * Convert Firestore data to MeetingTypeConfig
   */
  private static convertFromFirestore(data: any): Omit<MeetingTypeConfig, 'id'> {
    return {
      name: data.name,
      ownerId: data.ownerId,
      regularParticipants: data.regularParticipants || [],
      systemPrompt: data.systemPrompt,
      contextRules: data.contextRules,
      files: data.files || [],
      aiSettings: data.aiSettings,
      defaultModel: data.defaultModel,
      modelOverrides: data.modelOverrides || {},
      modelSpecificPrompts: data.modelSpecificPrompts || {},
      modelCompatibility: data.modelCompatibility || {
        recommendedModel: data.defaultModel,
        performanceHistory: []
      },
      createdAt: data.createdAt?.toDate() || new Date()
    };
  }

  /**
   * Convert MeetingTypeConfig to Firestore format
   */
  private static convertToFirestore(data: Partial<MeetingTypeConfig>): any {
    const result: any = { ...data };
    
    if (data.createdAt) {
      result.createdAt = Timestamp.fromDate(data.createdAt);
    }
    
    // Convert any Date objects in modelOverrides
    if (data.modelOverrides) {
      result.modelOverrides = {};
      for (const [userId, override] of Object.entries(data.modelOverrides)) {
        result.modelOverrides[userId] = {
          ...override,
          lastUsed: override.lastUsed ? Timestamp.fromDate(override.lastUsed) : serverTimestamp()
        };
      }
    }
    
    return result;
  }
}