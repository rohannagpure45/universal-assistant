import { adminDb } from '@/lib/firebase/admin';
import type { VoiceProfile } from '@/services/universal-assistant/VoiceProfileService';

export interface UserProfile {
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: {
    language: string;
    timezone: string;
    theme: string;
    notifications: boolean;
  };
}

export interface Meeting {
  title: string;
  organizerId: string;
  participants: Array<{
    userId: string;
    role: 'organizer' | 'participant' | 'observer';
    joinedAt: Date;
    leftAt?: Date;
  }>;
  type: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  settings: {
    enableRecording: boolean;
    enableTranscription: boolean;
    enableAI: boolean;
    language: string;
    maxParticipants: number;
  };
  metadata: {
    tags: string[];
    department?: string;
    project?: string;
    confidentiality: 'public' | 'internal' | 'confidential';
  };
}

export interface TranscriptEntry {
  text: string;
  speakerId: string;
  confidence: number;
  timestamp: Date;
  duration: number;
  metadata: Record<string, any>;
}

export interface SpeakerProfile {
  name: string;
  userId?: string;
  voiceProfile: Record<string, any>;
  statistics: {
    totalSpeakTime: number;
    averageConfidence: number;
    wordCount: number;
  };
  firstDetected: Date;
}

export interface MeetingNote {
  content: string;
  authorId: string;
  type: 'manual' | 'ai-generated' | 'action-item';
  tags: string[];
  timestamp: Date;
  isPublic: boolean;
}

export class FirestoreService {
  // User Management
  static async createUserProfile(userId: string, userData: Omit<UserProfile, 'createdAt' | 'lastLoginAt'>): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
      ...userData,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
  }
  
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const doc = await adminDb.collection('users').doc(userId).get();
    return doc.exists ? doc.data() as UserProfile : null;
  }
  
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await adminDb.collection('users').doc(userId).update({
      ...updates,
      lastLoginAt: new Date(),
    });
  }
  
  // Meeting Management
  static async createMeeting(meetingData: Omit<Meeting, 'createdAt' | 'status'>): Promise<string> {
    const meetingRef = await adminDb.collection('meetings').add({
      ...meetingData,
      createdAt: new Date(),
      status: 'scheduled',
    });
    return meetingRef.id;
  }
  
  static async getMeeting(meetingId: string): Promise<Meeting | null> {
    const doc = await adminDb.collection('meetings').doc(meetingId).get();
    return doc.exists ? doc.data() as Meeting : null;
  }
  
  static async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<void> {
    await adminDb.collection('meetings').doc(meetingId).update({
      status,
      updatedAt: new Date(),
    });
  }
  
  static async getUserMeetings(userId: string, limit: number = 20): Promise<Meeting[]> {
    const snapshot = await adminDb
      .collection('meetings')
      .where('participants', 'array-contains', userId)
      .orderBy('startTime', 'desc')
      .limit(limit)
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Meeting[];
  }
  
  // Transcript Management
  static async addTranscriptEntry(
    meetingId: string, 
    entryData: Omit<TranscriptEntry, 'timestamp'>
  ): Promise<string> {
    const entryRef = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('transcripts')
      .collection('entries')
      .add({
        ...entryData,
        timestamp: new Date(),
      });
    return entryRef.id;
  }
  
  static async getTranscriptEntries(
    meetingId: string, 
    startTime?: Date, 
    endTime?: Date
  ): Promise<TranscriptEntry[]> {
    let query = adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('transcripts')
      .collection('entries')
      .orderBy('timestamp', 'asc');
    
    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }
    
    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TranscriptEntry[];
  }
  
  // Speaker Management
  static async addSpeaker(
    meetingId: string, 
    speakerId: string, 
    speakerData: Omit<SpeakerProfile, 'firstDetected'>
  ): Promise<void> {
    await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('speakers')
      .doc(speakerId)
      .set({
        ...speakerData,
        firstDetected: new Date(),
      });
  }
  
  static async updateSpeakerStatistics(
    meetingId: string, 
    speakerId: string, 
    statistics: Partial<SpeakerProfile['statistics']>
  ): Promise<void> {
    await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('speakers')
      .doc(speakerId)
      .update({
        statistics,
        updatedAt: new Date(),
      });
  }
  
  // Voice Profile Management
  static async getUserVoiceProfiles(userId: string): Promise<VoiceProfile[]> {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as VoiceProfile[];
  }
  
  static async createVoiceProfile(
    userId: string, 
    profileData: Omit<VoiceProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const profileRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .add({
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return profileRef.id;
  }
  
  // Meeting Notes
  static async addMeetingNote(
    meetingId: string, 
    noteData: Omit<MeetingNote, 'timestamp'>
  ): Promise<string> {
    const noteRef = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('notes')
      .add({
        ...noteData,
        timestamp: new Date(),
      });
    return noteRef.id;
  }
  
  static async getMeetingNotes(meetingId: string): Promise<MeetingNote[]> {
    const snapshot = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('notes')
      .orderBy('timestamp', 'desc')
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MeetingNote[];
  }
  
  // Analytics
  static async updateMeetingAnalytics(
    meetingId: string, 
    analysisType: 'speaking-time' | 'sentiment' | 'topics',
    analytics: Record<string, any>
  ): Promise<void> {
    await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('analytics')
      .doc(analysisType)
      .set({
        ...analytics,
        calculatedAt: new Date(),
      });
  }
  
  static async getMeetingAnalytics(
    meetingId: string, 
    analysisType: 'speaking-time' | 'sentiment' | 'topics'
  ): Promise<Record<string, any> | null> {
    const doc = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('analytics')
      .doc(analysisType)
      .get();
    
    return doc.exists ? doc.data() || null : null;
  }
  
  // Cache Management
  static async cacheTTSEntry(
    cacheKey: string,
    metadata: {
      text: string;
      voiceId: string;
      settings: Record<string, any>;
      storageUrl: string;
      size: number;
    }
  ): Promise<void> {
    await adminDb.collection('cache').collection('ttsCache').doc(cacheKey).set({
      ...metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }
  
  static async getTTSCacheEntry(cacheKey: string): Promise<any | null> {
    const doc = await adminDb.collection('cache').collection('ttsCache').doc(cacheKey).get();
    return doc.exists ? doc.data() : null;
  }
  
  // System Configuration
  static async getSystemConfig(configType: 'aiModels' | 'features' | 'limits'): Promise<any | null> {
    const doc = await adminDb.collection('systemConfig').doc(configType).get();
    return doc.exists ? doc.data() : null;
  }
  
  static async updateSystemConfig(
    configType: 'aiModels' | 'features' | 'limits',
    config: Record<string, any>
  ): Promise<void> {
    await adminDb.collection('systemConfig').doc(configType).set({
      ...config,
      updatedAt: new Date(),
    });
  }
  
  // Analytics Aggregation
  static async updateDailyAnalytics(
    date: string, // YYYY-MM-DD format
    metrics: {
      totalUsers: number;
      totalMeetings: number;
      totalDuration: number;
      newUsers: number;
      activeUsers: number;
    }
  ): Promise<void> {
    await adminDb.collection('analytics').collection('daily').doc(date).set({
      ...metrics,
      date,
      updatedAt: new Date(),
    });
  }
  
  // Batch Operations
  static async batchUpdateSpeakerStats(
    meetingId: string,
    speakerUpdates: Array<{
      speakerId: string;
      statistics: Partial<SpeakerProfile['statistics']>;
    }>
  ): Promise<void> {
    const batch = adminDb.batch();
    
    speakerUpdates.forEach(({ speakerId, statistics }) => {
      const speakerRef = adminDb
        .collection('meetings')
        .doc(meetingId)
        .collection('speakers')
        .doc(speakerId);
      
      batch.update(speakerRef, {
        statistics,
        updatedAt: new Date(),
      });
    });
    
    await batch.commit();
  }
  
  // Cleanup Operations
  static async cleanupExpiredCache(): Promise<number> {
    const now = new Date();
    const expiredSnapshot = await adminDb
      .collection('cache')
      .collection('ttsCache')
      .where('expiresAt', '<', now)
      .get();
    
    const batch = adminDb.batch();
    expiredSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return expiredSnapshot.size;
  }
}