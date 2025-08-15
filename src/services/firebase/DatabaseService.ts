import { adminDb } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule, 
  MeetingType,
  UserPreferences,
  Participant
} from '@/types';
import type { 
  UserMetadata, 
  MeetingMetadata, 
  VoiceProfileMetadata,
  AnalyticsMetadata 
} from '@/types/firebase';

// Utility functions for Firestore timestamp conversion
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert Firestore timestamps to Date objects
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value && typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        // Firestore Timestamp
        converted[key] = value.toDate();
      } else if (value.seconds && value.nanoseconds !== undefined) {
        // Firestore Timestamp-like object
        converted[key] = new Timestamp(value.seconds, value.nanoseconds).toDate();
      } else if (Array.isArray(value)) {
        // Handle arrays recursively
        converted[key] = value.map(convertTimestamps);
      } else if (typeof value === 'object') {
        // Handle nested objects recursively
        converted[key] = convertTimestamps(value);
      }
    }
  });
  
  return converted;
};

const convertDatesToTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value instanceof Date) {
      converted[key] = Timestamp.fromDate(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      converted[key] = convertDatesToTimestamps(value);
    } else if (Array.isArray(value)) {
      converted[key] = value.map(convertDatesToTimestamps);
    }
  });
  
  return converted;
};

// Pagination interface
export interface PaginationOptions {
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  lastDoc?: DocumentSnapshot;
  hasMore: boolean;
  total?: number;
}

// Database error types
export class DatabaseError extends Error {
  constructor(
    message: string, 
    public code: string, 
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class DatabaseService {
  // ============ USER MANAGEMENT ============
  
  /**
   * Create a new user profile
   */
  static async createUser(userData: Omit<User, 'uid' | 'createdAt' | 'lastActive'>): Promise<string> {
    try {
      const userId = doc(collection(db, 'users')).id;
      const now = new Date();
      
      const userDoc: User = {
        uid: userId,
        ...userData,
        createdAt: now,
        lastActive: now
      };

      await setDoc(doc(db, 'users', userId), convertDatesToTimestamps(userDoc));
      return userId;
    } catch (error) {
      throw new DatabaseError(
        'Failed to create user',
        'USER_CREATE_FAILED',
        'createUser',
        error as Error
      );
    }
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }

      return convertTimestamps({ uid: userDoc.id, ...userDoc.data() }) as User;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user ${userId}`,
        'USER_GET_FAILED',
        'getUser',
        error as Error
      );
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        lastActive: new Date()
      };

      await updateDoc(doc(db, 'users', userId), convertDatesToTimestamps(updateData));
    } catch (error) {
      throw new DatabaseError(
        `Failed to update user ${userId}`,
        'USER_UPDATE_FAILED',
        'updateUser',
        error as Error
      );
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        preferences: preferences,
        lastActive: serverTimestamp()
      });
    } catch (error) {
      throw new DatabaseError(
        `Failed to update user preferences for ${userId}`,
        'USER_PREFERENCES_UPDATE_FAILED',
        'updateUserPreferences',
        error as Error
      );
    }
  }

  // ============ MEETING MANAGEMENT ============

  /**
   * Create a new meeting
   */
  static async createMeeting(meetingData: Omit<Meeting, 'meetingId'>): Promise<string> {
    try {
      const meetingRef = await addDoc(
        collection(db, 'meetings'), 
        convertDatesToTimestamps(meetingData)
      );
      
      return meetingRef.id;
    } catch (error) {
      throw new DatabaseError(
        'Failed to create meeting',
        'MEETING_CREATE_FAILED',
        'createMeeting',
        error as Error
      );
    }
  }

  /**
   * Get meeting by ID
   */
  static async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const meetingDoc = await getDoc(doc(db, 'meetings', meetingId));
      
      if (!meetingDoc.exists()) {
        return null;
      }

      return convertTimestamps({ 
        meetingId: meetingDoc.id, 
        ...meetingDoc.data() 
      }) as Meeting;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get meeting ${meetingId}`,
        'MEETING_GET_FAILED',
        'getMeeting',
        error as Error
      );
    }
  }

  /**
   * Update meeting
   */
  static async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'meetings', meetingId), 
        convertDatesToTimestamps(updates)
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update meeting ${meetingId}`,
        'MEETING_UPDATE_FAILED',
        'updateMeeting',
        error as Error
      );
    }
  }

  /**
   * Delete meeting
   */
  static async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete meeting ${meetingId}`,
        'MEETING_DELETE_FAILED',
        'deleteMeeting',
        error as Error
      );
    }
  }

  /**
   * Get user meetings with pagination
   */
  static async getUserMeetings(
    userId: string, 
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Meeting>> {
    try {
      const {
        limit: pageLimit = 20,
        startAfterDoc,
        orderByField = 'startTime',
        orderDirection = 'desc'
      } = options;

      let meetingQuery = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains-any', [userId]),
        orderBy(orderByField, orderDirection),
        limit(pageLimit + 1) // Get one extra to check if there are more
      );

      if (startAfterDoc) {
        meetingQuery = query(meetingQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(meetingQuery);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageLimit;
      
      if (hasMore) {
        docs.pop(); // Remove the extra document
      }

      const meetings = docs.map(doc => 
        convertTimestamps({ meetingId: doc.id, ...doc.data() })
      ) as Meeting[];

      return {
        data: meetings,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
        hasMore
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get meetings for user ${userId}`,
        'USER_MEETINGS_GET_FAILED',
        'getUserMeetings',
        error as Error
      );
    }
  }

  /**
   * Get meetings by type
   */
  static async getMeetingsByType(
    meetingType: MeetingType,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Meeting>> {
    try {
      const {
        limit: pageLimit = 20,
        startAfterDoc,
        orderByField = 'startTime',
        orderDirection = 'desc'
      } = options;

      let meetingQuery = query(
        collection(db, 'meetings'),
        where('type', '==', meetingType),
        orderBy(orderByField, orderDirection),
        limit(pageLimit + 1)
      );

      if (startAfterDoc) {
        meetingQuery = query(meetingQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(meetingQuery);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageLimit;
      
      if (hasMore) {
        docs.pop();
      }

      const meetings = docs.map(doc => 
        convertTimestamps({ meetingId: doc.id, ...doc.data() })
      ) as Meeting[];

      return {
        data: meetings,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
        hasMore
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get meetings by type ${meetingType}`,
        'MEETINGS_BY_TYPE_GET_FAILED',
        'getMeetingsByType',
        error as Error
      );
    }
  }

  // ============ TRANSCRIPT MANAGEMENT ============

  /**
   * Add transcript entry to a meeting
   */
  static async addTranscriptEntry(
    meetingId: string, 
    transcriptData: Omit<TranscriptEntry, 'id'>
  ): Promise<string> {
    try {
      const transcriptRef = await addDoc(
        collection(db, 'meetings', meetingId, 'transcripts'),
        convertDatesToTimestamps(transcriptData)
      );
      
      return transcriptRef.id;
    } catch (error) {
      throw new DatabaseError(
        `Failed to add transcript entry to meeting ${meetingId}`,
        'TRANSCRIPT_ADD_FAILED',
        'addTranscriptEntry',
        error as Error
      );
    }
  }

  /**
   * Get transcript entries for a meeting
   */
  static async getTranscriptEntries(
    meetingId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<TranscriptEntry>> {
    try {
      const {
        limit: pageLimit = 50,
        startAfterDoc,
        orderByField = 'timestamp',
        orderDirection = 'asc'
      } = options;

      let transcriptQuery = query(
        collection(db, 'meetings', meetingId, 'transcripts'),
        orderBy(orderByField, orderDirection),
        limit(pageLimit + 1)
      );

      if (startAfterDoc) {
        transcriptQuery = query(transcriptQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(transcriptQuery);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageLimit;
      
      if (hasMore) {
        docs.pop();
      }

      const transcripts = docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      ) as TranscriptEntry[];

      return {
        data: transcripts,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
        hasMore
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get transcript entries for meeting ${meetingId}`,
        'TRANSCRIPT_GET_FAILED',
        'getTranscriptEntries',
        error as Error
      );
    }
  }

  /**
   * Update transcript entry
   */
  static async updateTranscriptEntry(
    meetingId: string,
    transcriptId: string,
    updates: Partial<TranscriptEntry>
  ): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'meetings', meetingId, 'transcripts', transcriptId),
        convertDatesToTimestamps(updates)
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update transcript entry ${transcriptId}`,
        'TRANSCRIPT_UPDATE_FAILED',
        'updateTranscriptEntry',
        error as Error
      );
    }
  }

  /**
   * Delete transcript entry
   */
  static async deleteTranscriptEntry(meetingId: string, transcriptId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId, 'transcripts', transcriptId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete transcript entry ${transcriptId}`,
        'TRANSCRIPT_DELETE_FAILED',
        'deleteTranscriptEntry',
        error as Error
      );
    }
  }

  /**
   * Get transcript entries by speaker
   */
  static async getTranscriptEntriesBySpeaker(
    meetingId: string,
    speakerId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<TranscriptEntry>> {
    try {
      const {
        limit: pageLimit = 50,
        startAfterDoc,
        orderByField = 'timestamp',
        orderDirection = 'asc'
      } = options;

      let transcriptQuery = query(
        collection(db, 'meetings', meetingId, 'transcripts'),
        where('speakerId', '==', speakerId),
        orderBy(orderByField, orderDirection),
        limit(pageLimit + 1)
      );

      if (startAfterDoc) {
        transcriptQuery = query(transcriptQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(transcriptQuery);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageLimit;
      
      if (hasMore) {
        docs.pop();
      }

      const transcripts = docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      ) as TranscriptEntry[];

      return {
        data: transcripts,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
        hasMore
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get transcript entries by speaker ${speakerId}`,
        'TRANSCRIPT_BY_SPEAKER_GET_FAILED',
        'getTranscriptEntriesBySpeaker',
        error as Error
      );
    }
  }

  // ============ VOICE PROFILE MANAGEMENT ============

  /**
   * Create voice profile
   */
  static async createVoiceProfile(
    userId: string,
    profileData: Omit<SpeakerProfile, 'speakerId' | 'lastSeen'>
  ): Promise<string> {
    try {
      const profileRef = await addDoc(
        collection(db, 'users', userId, 'voiceProfiles'),
        convertDatesToTimestamps({
          ...profileData,
          lastSeen: new Date()
        })
      );
      
      return profileRef.id;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create voice profile for user ${userId}`,
        'VOICE_PROFILE_CREATE_FAILED',
        'createVoiceProfile',
        error as Error
      );
    }
  }

  /**
   * Get voice profile
   */
  static async getVoiceProfile(userId: string, profileId: string): Promise<SpeakerProfile | null> {
    try {
      const profileDoc = await getDoc(doc(db, 'users', userId, 'voiceProfiles', profileId));
      
      if (!profileDoc.exists()) {
        return null;
      }

      return convertTimestamps({ 
        speakerId: profileDoc.id, 
        ...profileDoc.data() 
      }) as SpeakerProfile;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get voice profile ${profileId}`,
        'VOICE_PROFILE_GET_FAILED',
        'getVoiceProfile',
        error as Error
      );
    }
  }

  /**
   * Get all voice profiles for a user
   */
  static async getUserVoiceProfiles(userId: string): Promise<SpeakerProfile[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users', userId, 'voiceProfiles'));
      
      return snapshot.docs.map(doc => 
        convertTimestamps({ speakerId: doc.id, ...doc.data() })
      ) as SpeakerProfile[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to get voice profiles for user ${userId}`,
        'USER_VOICE_PROFILES_GET_FAILED',
        'getUserVoiceProfiles',
        error as Error
      );
    }
  }

  /**
   * Update voice profile
   */
  static async updateVoiceProfile(
    userId: string,
    profileId: string,
    updates: Partial<SpeakerProfile>
  ): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'users', userId, 'voiceProfiles', profileId),
        convertDatesToTimestamps({
          ...updates,
          lastSeen: new Date()
        })
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update voice profile ${profileId}`,
        'VOICE_PROFILE_UPDATE_FAILED',
        'updateVoiceProfile',
        error as Error
      );
    }
  }

  /**
   * Delete voice profile
   */
  static async deleteVoiceProfile(userId: string, profileId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId, 'voiceProfiles', profileId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete voice profile ${profileId}`,
        'VOICE_PROFILE_DELETE_FAILED',
        'deleteVoiceProfile',
        error as Error
      );
    }
  }

  // ============ CUSTOM RULES MANAGEMENT ============

  /**
   * Create custom rule
   */
  static async createCustomRule(ruleData: Omit<CustomRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      const ruleRef = await addDoc(
        collection(db, 'customRules'),
        convertDatesToTimestamps({
          ...ruleData,
          createdAt: now,
          updatedAt: now
        })
      );
      
      return ruleRef.id;
    } catch (error) {
      throw new DatabaseError(
        'Failed to create custom rule',
        'CUSTOM_RULE_CREATE_FAILED',
        'createCustomRule',
        error as Error
      );
    }
  }

  /**
   * Get custom rule
   */
  static async getCustomRule(ruleId: string): Promise<CustomRule | null> {
    try {
      const ruleDoc = await getDoc(doc(db, 'customRules', ruleId));
      
      if (!ruleDoc.exists()) {
        return null;
      }

      return convertTimestamps({ id: ruleDoc.id, ...ruleDoc.data() }) as CustomRule;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get custom rule ${ruleId}`,
        'CUSTOM_RULE_GET_FAILED',
        'getCustomRule',
        error as Error
      );
    }
  }

  /**
   * Get user custom rules
   */
  static async getUserCustomRules(userId: string): Promise<CustomRule[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'customRules'),
          where('userId', '==', userId),
          orderBy('priority', 'desc')
        )
      );
      
      return snapshot.docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      ) as CustomRule[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to get custom rules for user ${userId}`,
        'USER_CUSTOM_RULES_GET_FAILED',
        'getUserCustomRules',
        error as Error
      );
    }
  }

  /**
   * Update custom rule
   */
  static async updateCustomRule(ruleId: string, updates: Partial<CustomRule>): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'customRules', ruleId),
        convertDatesToTimestamps({
          ...updates,
          updatedAt: new Date()
        })
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update custom rule ${ruleId}`,
        'CUSTOM_RULE_UPDATE_FAILED',
        'updateCustomRule',
        error as Error
      );
    }
  }

  /**
   * Delete custom rule
   */
  static async deleteCustomRule(ruleId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'customRules', ruleId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete custom rule ${ruleId}`,
        'CUSTOM_RULE_DELETE_FAILED',
        'deleteCustomRule',
        error as Error
      );
    }
  }

  // ============ BATCH OPERATIONS ============

  /**
   * Batch update transcript entries
   */
  static async batchUpdateTranscriptEntries(
    meetingId: string,
    updates: Array<{ id: string; data: Partial<TranscriptEntry> }>
  ): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      updates.forEach(({ id, data }) => {
        const transcriptRef = doc(db, 'meetings', meetingId, 'transcripts', id);
        batch.update(transcriptRef, convertDatesToTimestamps(data));
      });

      await batch.commit();
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch update transcript entries for meeting ${meetingId}`,
        'BATCH_TRANSCRIPT_UPDATE_FAILED',
        'batchUpdateTranscriptEntries',
        error as Error
      );
    }
  }

  /**
   * Batch create transcript entries
   */
  static async batchCreateTranscriptEntries(
    meetingId: string,
    entries: Array<Omit<TranscriptEntry, 'id'>>
  ): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const createdIds: string[] = [];
      
      entries.forEach((entry) => {
        const transcriptRef = doc(collection(db, 'meetings', meetingId, 'transcripts'));
        batch.set(transcriptRef, convertDatesToTimestamps(entry));
        createdIds.push(transcriptRef.id);
      });

      await batch.commit();
      return createdIds;
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch create transcript entries for meeting ${meetingId}`,
        'BATCH_TRANSCRIPT_CREATE_FAILED',
        'batchCreateTranscriptEntries',
        error as Error
      );
    }
  }

  // ============ ANALYTICS & REPORTING ============

  /**
   * Get meeting statistics
   */
  static async getMeetingStatistics(userId: string): Promise<{
    totalMeetings: number;
    totalDuration: number;
    averageDuration: number;
    meetingsByType: Record<MeetingType, number>;
  }> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'meetings'),
          where('hostId', '==', userId)
        )
      );

      let totalDuration = 0;
      const meetingsByType: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const meeting = convertTimestamps(doc.data()) as Meeting;
        
        if (meeting.startTime && meeting.endTime) {
          totalDuration += meeting.endTime.getTime() - meeting.startTime.getTime();
        }
        
        meetingsByType[meeting.type] = (meetingsByType[meeting.type] || 0) + 1;
      });

      return {
        totalMeetings: snapshot.size,
        totalDuration,
        averageDuration: snapshot.size > 0 ? totalDuration / snapshot.size : 0,
        meetingsByType: meetingsByType as Record<MeetingType, number>
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get meeting statistics for user ${userId}`,
        'MEETING_STATISTICS_GET_FAILED',
        'getMeetingStatistics',
        error as Error
      );
    }
  }

  // ============ SEARCH OPERATIONS ============

  /**
   * Search meetings by title or keywords
   */
  static async searchMeetings(
    userId: string,
    searchTerm: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Meeting>> {
    try {
      // Note: Firestore doesn't have full-text search, so this is a basic implementation
      // For production, consider using Algolia or similar search service
      
      const {
        limit: pageLimit = 20,
        startAfterDoc,
        orderByField = 'startTime',
        orderDirection = 'desc'
      } = options;

      let meetingQuery = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains-any', [userId]),
        orderBy(orderByField, orderDirection),
        limit(pageLimit * 3) // Get more to filter client-side
      );

      if (startAfterDoc) {
        meetingQuery = query(meetingQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(meetingQuery);
      
      // Filter results client-side for basic text search
      const filteredMeetings = snapshot.docs
        .map(doc => convertTimestamps({ meetingId: doc.id, ...doc.data() }) as Meeting)
        .filter(meeting => 
          meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          meeting.keywords.some(keyword => 
            keyword.toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
        .slice(0, pageLimit);

      return {
        data: filteredMeetings,
        lastDoc: filteredMeetings.length > 0 ? 
          snapshot.docs.find(doc => doc.id === filteredMeetings[filteredMeetings.length - 1].meetingId) : 
          undefined,
        hasMore: filteredMeetings.length === pageLimit
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to search meetings for user ${userId}`,
        'MEETING_SEARCH_FAILED',
        'searchMeetings',
        error as Error
      );
    }
  }
}