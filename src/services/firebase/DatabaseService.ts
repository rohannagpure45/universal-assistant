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
  increment,
  onSnapshot,
  Unsubscribe
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
  APICall,
  CostBudget,
  CostAnalytics,
  UsageMetrics,
  TimeBasedUsage,
  CostEvent,
  CostPeriod,
  CostGranularity
} from '@/types/cost';
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
      // Dedupe-at-write: if the most recent transcript (same speaker) within a short window
      // has identical normalized text, update it instead of creating a new doc.
      const transcriptsCol = collection(db, 'meetings', meetingId, 'transcripts');
      const latestQuery = query(
        transcriptsCol,
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const latestSnap = await getDocs(latestQuery);
      const normalize = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const newTextNorm = normalize(transcriptData.text);
      const newSpeaker = transcriptData.speakerId;
      const newTs = transcriptData.timestamp instanceof Date ? transcriptData.timestamp.getTime() : new Date(transcriptData.timestamp as any).getTime();
      const windowMs = 12000; // 12 seconds

      if (!latestSnap.empty) {
        const docSnap = latestSnap.docs[0];
        const latest = convertTimestamps({ id: docSnap.id, ...docSnap.data() }) as TranscriptEntry;
        const latestTextNorm = normalize(latest.text);
        const latestSpeaker = latest.speakerId;
        const latestTs = latest.timestamp instanceof Date ? latest.timestamp.getTime() : new Date(latest.timestamp as any).getTime();

        const sameSpeaker = latestSpeaker === newSpeaker;
        const withinWindow = Math.abs(newTs - latestTs) <= windowMs;
        const sameText = latestTextNorm === newTextNorm;

        if (sameSpeaker && withinWindow && sameText) {
          await updateDoc(doc(db, 'meetings', meetingId, 'transcripts', docSnap.id), convertDatesToTimestamps({
            // prefer higher confidence and newer timestamp
            text: transcriptData.text,
            confidence: Math.max((latest.confidence || 0) as number, (transcriptData.confidence || 0) as number),
            timestamp: transcriptData.timestamp,
          }));
          return docSnap.id;
        }
      }

      const transcriptRef = await addDoc(
        transcriptsCol,
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

  // ============ COST TRACKING MANAGEMENT ============

  /**
   * Record an API call cost
   */
  static async recordAPiCall(userId: string, apiCallData: Omit<APICall, 'id'>): Promise<string> {
    try {
      const apiCallRef = await addDoc(
        collection(db, 'costs', userId, 'apiCalls'),
        convertDatesToTimestamps(apiCallData)
      );
      
      return apiCallRef.id;
    } catch (error) {
      throw new DatabaseError(
        `Failed to record API call for user ${userId}`,
        'API_CALL_RECORD_FAILED',
        'recordAPiCall',
        error as Error
      );
    }
  }

  /**
   * Get API calls for a user with filtering and pagination
   */
  static async getAPIcalls(
    userId: string,
    options: PaginationOptions & {
      startDate?: Date;
      endDate?: Date;
      model?: string;
      service?: string;
    } = {}
  ): Promise<PaginatedResult<APICall>> {
    try {
      const {
        limit: pageLimit = 50,
        startAfterDoc,
        orderByField = 'timestamp',
        orderDirection = 'desc',
        startDate,
        endDate,
        model,
        service
      } = options;

      let apiCallQuery = query(
        collection(db, 'costs', userId, 'apiCalls'),
        orderBy(orderByField, orderDirection),
        limit(pageLimit + 1)
      );

      // Add date range filters
      if (startDate) {
        apiCallQuery = query(apiCallQuery, where('timestamp', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        apiCallQuery = query(apiCallQuery, where('timestamp', '<=', Timestamp.fromDate(endDate)));
      }
      if (model) {
        apiCallQuery = query(apiCallQuery, where('model', '==', model));
      }
      if (service) {
        apiCallQuery = query(apiCallQuery, where('service', '==', service));
      }

      if (startAfterDoc) {
        apiCallQuery = query(apiCallQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(apiCallQuery);
      const docs = snapshot.docs;
      const hasMore = docs.length > pageLimit;
      
      if (hasMore) {
        docs.pop();
      }

      const apiCalls = docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      ) as APICall[];

      return {
        data: apiCalls,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
        hasMore
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get API calls for user ${userId}`,
        'API_CALLS_GET_FAILED',
        'getAPIcalls',
        error as Error
      );
    }
  }

  /**
   * Create or update a cost budget
   */
  static async createCostBudget(budgetData: Omit<CostBudget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = new Date();
      const budgetRef = await addDoc(
        collection(db, 'costs', budgetData.userId, 'budgets'),
        convertDatesToTimestamps({
          ...budgetData,
          createdAt: now,
          updatedAt: now
        })
      );
      
      return budgetRef.id;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create cost budget for user ${budgetData.userId}`,
        'COST_BUDGET_CREATE_FAILED',
        'createCostBudget',
        error as Error
      );
    }
  }

  /**
   * Get cost budget
   */
  static async getCostBudget(userId: string, budgetId: string): Promise<CostBudget | null> {
    try {
      const budgetDoc = await getDoc(doc(db, 'costs', userId, 'budgets', budgetId));
      
      if (!budgetDoc.exists()) {
        return null;
      }

      return convertTimestamps({ id: budgetDoc.id, ...budgetDoc.data() }) as CostBudget;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cost budget ${budgetId}`,
        'COST_BUDGET_GET_FAILED',
        'getCostBudget',
        error as Error
      );
    }
  }

  /**
   * Get all cost budgets for a user
   */
  static async getUserCostBudgets(userId: string): Promise<CostBudget[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'costs', userId, 'budgets'),
          orderBy('createdAt', 'desc')
        )
      );
      
      return snapshot.docs.map(doc => 
        convertTimestamps({ id: doc.id, ...doc.data() })
      ) as CostBudget[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cost budgets for user ${userId}`,
        'USER_COST_BUDGETS_GET_FAILED',
        'getUserCostBudgets',
        error as Error
      );
    }
  }

  /**
   * Update cost budget
   */
  static async updateCostBudget(userId: string, budgetId: string, updates: Partial<CostBudget>): Promise<void> {
    try {
      await updateDoc(
        doc(db, 'costs', userId, 'budgets', budgetId),
        convertDatesToTimestamps({
          ...updates,
          updatedAt: new Date()
        })
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to update cost budget ${budgetId}`,
        'COST_BUDGET_UPDATE_FAILED',
        'updateCostBudget',
        error as Error
      );
    }
  }

  /**
   * Delete cost budget
   */
  static async deleteCostBudget(userId: string, budgetId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'costs', userId, 'budgets', budgetId));
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete cost budget ${budgetId}`,
        'COST_BUDGET_DELETE_FAILED',
        'deleteCostBudget',
        error as Error
      );
    }
  }

  /**
   * Store aggregated cost analytics
   */
  static async storeCostAnalytics(
    userId: string, 
    period: string, 
    analytics: TimeBasedUsage
  ): Promise<void> {
    try {
      await setDoc(
        doc(db, 'costs', userId, 'analytics', period),
        convertDatesToTimestamps(analytics),
        { merge: true }
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to store cost analytics for user ${userId}, period ${period}`,
        'COST_ANALYTICS_STORE_FAILED',
        'storeCostAnalytics',
        error as Error
      );
    }
  }

  /**
   * Get cost analytics for a user and period
   */
  static async getCostAnalytics(userId: string, period: string): Promise<TimeBasedUsage | null> {
    try {
      const analyticsDoc = await getDoc(doc(db, 'costs', userId, 'analytics', period));
      
      if (!analyticsDoc.exists()) {
        return null;
      }

      return convertTimestamps(analyticsDoc.data()) as TimeBasedUsage;
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cost analytics for user ${userId}, period ${period}`,
        'COST_ANALYTICS_GET_FAILED',
        'getCostAnalytics',
        error as Error
      );
    }
  }

  /**
   * Get cost analytics for a date range
   */
  static async getCostAnalyticsRange(
    userId: string,
    startPeriod: string,
    endPeriod: string
  ): Promise<TimeBasedUsage[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'costs', userId, 'analytics'),
          where('period', '>=', startPeriod),
          where('period', '<=', endPeriod),
          orderBy('period', 'asc')
        )
      );
      
      return snapshot.docs.map(doc => 
        convertTimestamps(doc.data())
      ) as TimeBasedUsage[];
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cost analytics range for user ${userId}`,
        'COST_ANALYTICS_RANGE_GET_FAILED',
        'getCostAnalyticsRange',
        error as Error
      );
    }
  }

  /**
   * Calculate usage metrics from API calls
   */
  static async calculateUsageMetrics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageMetrics> {
    try {
      const apiCalls = await this.getAPIcalls(userId, {
        startDate,
        endDate,
        limit: 10000 // Large limit to get all data for calculation
      });

      const metrics: UsageMetrics = {
        totalAPICalls: apiCalls.data.length,
        totalTokens: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        },
        totalCost: 0,
        averageLatency: 0,
        averageCostPerCall: 0,
        costByModel: {} as any,
        costByService: {} as any,
        costByOperation: {} as any
      };

      let totalLatency = 0;

      apiCalls.data.forEach(call => {
        // Aggregate tokens
        metrics.totalTokens.inputTokens += call.tokenUsage.inputTokens;
        metrics.totalTokens.outputTokens += call.tokenUsage.outputTokens;
        metrics.totalTokens.totalTokens += call.tokenUsage.totalTokens;

        // Aggregate costs
        metrics.totalCost += call.cost;
        totalLatency += call.latency;

        // Cost by model
        if (!metrics.costByModel[call.model]) {
          metrics.costByModel[call.model] = {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD'
          };
        }
        metrics.costByModel[call.model].totalCost += call.cost;

        // Cost by service
        if (!metrics.costByService[call.service]) {
          metrics.costByService[call.service] = {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD'
          };
        }
        metrics.costByService[call.service].totalCost += call.cost;

        // Cost by operation
        if (!metrics.costByOperation[call.operation]) {
          metrics.costByOperation[call.operation] = {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD'
          };
        }
        metrics.costByOperation[call.operation].totalCost += call.cost;
      });

      // Calculate averages
      if (metrics.totalAPICalls > 0) {
        metrics.averageLatency = totalLatency / metrics.totalAPICalls;
        metrics.averageCostPerCall = metrics.totalCost / metrics.totalAPICalls;
      }

      return metrics;
    } catch (error) {
      throw new DatabaseError(
        `Failed to calculate usage metrics for user ${userId}`,
        'USAGE_METRICS_CALCULATE_FAILED',
        'calculateUsageMetrics',
        error as Error
      );
    }
  }

  /**
   * Batch record multiple API calls
   */
  static async batchRecordAPIcalls(userId: string, apiCalls: Array<Omit<APICall, 'id'>>): Promise<string[]> {
    try {
      const batch = writeBatch(db);
      const createdIds: string[] = [];
      
      apiCalls.forEach((apiCall) => {
        const apiCallRef = doc(collection(db, 'costs', userId, 'apiCalls'));
        batch.set(apiCallRef, convertDatesToTimestamps(apiCall));
        createdIds.push(apiCallRef.id);
      });

      await batch.commit();
      return createdIds;
    } catch (error) {
      throw new DatabaseError(
        `Failed to batch record API calls for user ${userId}`,
        'BATCH_API_CALLS_RECORD_FAILED',
        'batchRecordAPIcalls',
        error as Error
      );
    }
  }

  /**
   * Get cost summary for a user
   */
  static async getCostSummary(userId: string): Promise<{
    totalSpend: number;
    monthlySpend: number;
    activeBudgets: CostBudget[];
    recentCalls: APICall[];
    topModels: Array<{ model: string; cost: number; calls: number }>;
  }> {
    try {
      // Get current month's spending
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const [monthlyCallsResult, budgets, recentCallsResult] = await Promise.all([
        this.getAPIcalls(userId, { startDate: startOfMonth, endDate: endOfMonth, limit: 10000 }),
        this.getUserCostBudgets(userId),
        this.getAPIcalls(userId, { limit: 10 })
      ]);

      const monthlySpend = monthlyCallsResult.data.reduce((sum, call) => sum + call.cost, 0);
      
      // Calculate total spend from all-time calls (you might want to optimize this)
      const allCallsResult = await this.getAPIcalls(userId, { limit: 10000 });
      const totalSpend = allCallsResult.data.reduce((sum, call) => sum + call.cost, 0);

      // Calculate top models
      const modelStats: Record<string, { cost: number; calls: number }> = {};
      monthlyCallsResult.data.forEach(call => {
        if (!modelStats[call.model]) {
          modelStats[call.model] = { cost: 0, calls: 0 };
        }
        modelStats[call.model].cost += call.cost;
        modelStats[call.model].calls += 1;
      });

      const topModels = Object.entries(modelStats)
        .map(([model, stats]) => ({ model, ...stats }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);

      return {
        totalSpend,
        monthlySpend,
        activeBudgets: budgets.filter(budget => budget.currentUsage < budget.limit),
        recentCalls: recentCallsResult.data,
        topModels
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get cost summary for user ${userId}`,
        'COST_SUMMARY_GET_FAILED',
        'getCostSummary',
        error as Error
      );
    }
  }

  /**
   * Clean up old cost data beyond retention period
   */
  static async cleanupCostData(userId: string, retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldCallsQuery = query(
        collection(db, 'costs', userId, 'apiCalls'),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(oldCallsQuery);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
      }
    } catch (error) {
      throw new DatabaseError(
        `Failed to cleanup cost data for user ${userId}`,
        'COST_DATA_CLEANUP_FAILED',
        'cleanupCostData',
        error as Error
      );
    }
  }

  /**
   * Get aggregated daily cost analytics
   */
  static async getDailyCostAnalytics(
    userId: string,
    numberOfDays: number = 30
  ): Promise<Array<{ date: string; totalCost: number; callCount: number; topModel: string }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - numberOfDays);
      startDate.setHours(0, 0, 0, 0);

      const apiCalls = await this.getAPIcalls(userId, {
        startDate,
        limit: 10000
      });

      // Group by date
      const dailyStats: Record<string, { totalCost: number; callCount: number; models: Record<string, number> }> = {};

      apiCalls.data.forEach(call => {
        const dateStr = call.timestamp.toISOString().split('T')[0];
        
        if (!dailyStats[dateStr]) {
          dailyStats[dateStr] = {
            totalCost: 0,
            callCount: 0,
            models: {}
          };
        }
        
        dailyStats[dateStr].totalCost += call.cost;
        dailyStats[dateStr].callCount += 1;
        dailyStats[dateStr].models[call.model] = (dailyStats[dateStr].models[call.model] || 0) + 1;
      });

      // Convert to array and find top models
      return Object.entries(dailyStats).map(([date, stats]) => {
        const topModel = Object.entries(stats.models)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
        
        return {
          date,
          totalCost: stats.totalCost,
          callCount: stats.callCount,
          topModel
        };
      }).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get daily cost analytics for user ${userId}`,
        'DAILY_COST_ANALYTICS_GET_FAILED',
        'getDailyCostAnalytics',
        error as Error
      );
    }
  }

  /**
   * Get weekly cost analytics
   */
  static async getWeeklyCostAnalytics(
    userId: string,
    numberOfWeeks: number = 12
  ): Promise<Array<{ week: string; totalCost: number; callCount: number; averageCostPerCall: number }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (numberOfWeeks * 7));
      startDate.setHours(0, 0, 0, 0);

      const apiCalls = await this.getAPIcalls(userId, {
        startDate,
        limit: 10000
      });

      // Group by week (ISO week format)
      const weeklyStats: Record<string, { totalCost: number; callCount: number }> = {};

      apiCalls.data.forEach(call => {
        const date = new Date(call.timestamp);
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        const weekStr = `${year}-W${week.toString().padStart(2, '0')}`;
        
        if (!weeklyStats[weekStr]) {
          weeklyStats[weekStr] = {
            totalCost: 0,
            callCount: 0
          };
        }
        
        weeklyStats[weekStr].totalCost += call.cost;
        weeklyStats[weekStr].callCount += 1;
      });

      return Object.entries(weeklyStats).map(([week, stats]) => ({
        week,
        totalCost: stats.totalCost,
        callCount: stats.callCount,
        averageCostPerCall: stats.callCount > 0 ? stats.totalCost / stats.callCount : 0
      })).sort((a, b) => a.week.localeCompare(b.week));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get weekly cost analytics for user ${userId}`,
        'WEEKLY_COST_ANALYTICS_GET_FAILED',
        'getWeeklyCostAnalytics',
        error as Error
      );
    }
  }

  /**
   * Get monthly cost analytics
   */
  static async getMonthlyCostAnalytics(
    userId: string,
    numberOfMonths: number = 12
  ): Promise<Array<{ month: string; totalCost: number; callCount: number; topService: string }>> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - numberOfMonths);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const apiCalls = await this.getAPIcalls(userId, {
        startDate,
        limit: 10000
      });

      // Group by month
      const monthlyStats: Record<string, { totalCost: number; callCount: number; services: Record<string, number> }> = {};

      apiCalls.data.forEach(call => {
        const date = new Date(call.timestamp);
        const monthStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyStats[monthStr]) {
          monthlyStats[monthStr] = {
            totalCost: 0,
            callCount: 0,
            services: {}
          };
        }
        
        monthlyStats[monthStr].totalCost += call.cost;
        monthlyStats[monthStr].callCount += 1;
        monthlyStats[monthStr].services[call.service] = (monthlyStats[monthStr].services[call.service] || 0) + 1;
      });

      return Object.entries(monthlyStats).map(([month, stats]) => {
        const topService = Object.entries(stats.services)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
        
        return {
          month,
          totalCost: stats.totalCost,
          callCount: stats.callCount,
          topService
        };
      }).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      throw new DatabaseError(
        `Failed to get monthly cost analytics for user ${userId}`,
        'MONTHLY_COST_ANALYTICS_GET_FAILED',
        'getMonthlyCostAnalytics',
        error as Error
      );
    }
  }

  /**
   * Check and update budget alerts
   */
  static async checkBudgetAlerts(userId: string): Promise<CostBudget[]> {
    try {
      const budgets = await this.getUserCostBudgets(userId);
      const alertedBudgets: CostBudget[] = [];

      for (const budget of budgets) {
        const usagePercentage = (budget.currentUsage / budget.limit) * 100;
        
        for (const threshold of budget.alerts.thresholds) {
          if (usagePercentage >= threshold && !budget.alerts.notified.includes(threshold)) {
            // Update the budget to mark this threshold as notified
            await this.updateCostBudget(userId, budget.id, {
              alerts: {
                ...budget.alerts,
                notified: [...budget.alerts.notified, threshold]
              }
            });
            
            alertedBudgets.push(budget);
            break; // Only trigger one alert per budget check
          }
        }
      }

      return alertedBudgets;
    } catch (error) {
      throw new DatabaseError(
        `Failed to check budget alerts for user ${userId}`,
        'BUDGET_ALERTS_CHECK_FAILED',
        'checkBudgetAlerts',
        error as Error
      );
    }
  }

  // ============ REAL-TIME COST TRACKING ============

  /**
   * Listen to real-time API call updates
   */
  static listenToAPICalls(
    userId: string,
    callback: (apiCalls: APICall[]) => void,
    options: { limit?: number; startDate?: Date } = {}
  ): Unsubscribe {
    try {
      const { limit: queryLimit = 50, startDate } = options;
      
      let apiCallQuery = query(
        collection(db, 'costs', userId, 'apiCalls'),
        orderBy('timestamp', 'desc'),
        limit(queryLimit)
      );

      if (startDate) {
        apiCallQuery = query(apiCallQuery, where('timestamp', '>=', Timestamp.fromDate(startDate)));
      }

      return onSnapshot(
        apiCallQuery,
        (snapshot) => {
          const apiCalls = snapshot.docs.map(doc => 
            convertTimestamps({ id: doc.id, ...doc.data() })
          ) as APICall[];
          callback(apiCalls);
        },
        (error) => {
          throw new DatabaseError(
            `Real-time API calls listener failed for user ${userId}`,
            'REALTIME_API_CALLS_FAILED',
            'listenToAPICalls',
            error
          );
        }
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to setup API calls listener for user ${userId}`,
        'API_CALLS_LISTENER_FAILED',
        'listenToAPICalls',
        error as Error
      );
    }
  }

  /**
   * Listen to real-time budget updates
   */
  static listenToCostBudgets(
    userId: string,
    callback: (budgets: CostBudget[]) => void
  ): Unsubscribe {
    try {
      const budgetQuery = query(
        collection(db, 'costs', userId, 'budgets'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        budgetQuery,
        (snapshot) => {
          const budgets = snapshot.docs.map(doc => 
            convertTimestamps({ id: doc.id, ...doc.data() })
          ) as CostBudget[];
          callback(budgets);
        },
        (error) => {
          throw new DatabaseError(
            `Real-time cost budgets listener failed for user ${userId}`,
            'REALTIME_BUDGETS_FAILED',
            'listenToCostBudgets',
            error
          );
        }
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to setup cost budgets listener for user ${userId}`,
        'BUDGETS_LISTENER_FAILED',
        'listenToCostBudgets',
        error as Error
      );
    }
  }

  /**
   * Listen to real-time cost analytics updates
   */
  static listenToCostAnalytics(
    userId: string,
    callback: (analytics: TimeBasedUsage[]) => void,
    options: { startPeriod?: string; endPeriod?: string } = {}
  ): Unsubscribe {
    try {
      const { startPeriod, endPeriod } = options;
      
      let analyticsQuery = query(
        collection(db, 'costs', userId, 'analytics'),
        orderBy('period', 'desc')
      );

      if (startPeriod && endPeriod) {
        analyticsQuery = query(
          analyticsQuery,
          where('period', '>=', startPeriod),
          where('period', '<=', endPeriod)
        );
      }

      return onSnapshot(
        analyticsQuery,
        (snapshot) => {
          const analytics = snapshot.docs.map(doc => 
            convertTimestamps(doc.data())
          ) as TimeBasedUsage[];
          callback(analytics);
        },
        (error) => {
          throw new DatabaseError(
            `Real-time cost analytics listener failed for user ${userId}`,
            'REALTIME_ANALYTICS_FAILED',
            'listenToCostAnalytics',
            error
          );
        }
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to setup cost analytics listener for user ${userId}`,
        'ANALYTICS_LISTENER_FAILED',
        'listenToCostAnalytics',
        error as Error
      );
    }
  }

  // ============ HELPER METHODS ============

  /**
   * Get week number from date (ISO week)
   */
  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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

// Create a singleton instance for use in API routes
export const databaseService = new DatabaseService();