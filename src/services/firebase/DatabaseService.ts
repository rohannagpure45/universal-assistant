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
} from 'firebase/firestore';
// Firestore Lite removed - not needed with new schema
import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  MeetingType,
  UserPreferences
} from '@/types';
// Firebase metadata types removed - not needed

// Query optimization cache
const QueryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL
const DASHBOARD_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for dashboard queries

// Cache key generator
const generateCacheKey = (operation: string, params: any): string => {
  return `${operation}:${JSON.stringify(params, Object.keys(params).sort())}`;
};

// Cache getter with TTL check
const getCachedResult = (key: string): any | null => {
  const cached = QueryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.timestamp + cached.ttl) {
    QueryCache.delete(key);
    return null;
  }
  
  return cached.data;
};

// Cache setter
const setCachedResult = (key: string, data: any, ttl: number = CACHE_TTL): void => {
  QueryCache.set(key, {
    data: JSON.parse(JSON.stringify(data)), // Deep clone
    timestamp: Date.now(),
    ttl
  });
};

// Performance metrics
interface QueryMetrics {
  queryCount: number;
  cacheHits: number;
  averageLatency: number;
  lastQueries: Array<{ operation: string; latency: number; cached: boolean; timestamp: Date }>;
}

const queryMetrics: QueryMetrics = {
  queryCount: 0,
  cacheHits: 0,
  averageLatency: 0,
  lastQueries: []
};

// Performance tracking wrapper
const trackQueryPerformance = async <T>(
  operation: string,
  queryFn: () => Promise<T>,
  cached: boolean = false
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const latency = Date.now() - startTime;
    
    queryMetrics.queryCount++;
    if (cached) queryMetrics.cacheHits++;
    
    // Update average latency
    queryMetrics.averageLatency = (
      (queryMetrics.averageLatency * (queryMetrics.queryCount - 1) + latency) / 
      queryMetrics.queryCount
    );
    
    // Track last queries (keep last 50)
    queryMetrics.lastQueries.unshift({
      operation,
      latency,
      cached,
      timestamp: new Date()
    });
    
    if (queryMetrics.lastQueries.length > 50) {
      queryMetrics.lastQueries.pop();
    }
    
    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    queryMetrics.lastQueries.unshift({
      operation: `${operation}:ERROR`,
      latency,
      cached,
      timestamp: new Date()
    });
    
    throw error;
  }
};

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
   * Get user by ID with access control check
   */
  static async getUser(userId: string, requestingUserId?: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }

      const userData = convertTimestamps({ uid: userDoc.id, ...userDoc.data() }) as User;
      
      // Access control: users can only see their own full data unless they're admin
      if (requestingUserId && requestingUserId !== userId) {
        const requestingUser = await getDoc(doc(db, 'users', requestingUserId));
        if (!requestingUser.exists() || !requestingUser.data()?.isAdmin) {
          // Return limited data for non-admin users viewing others
          return {
            ...userData,
            preferences: {} as UserPreferences // Hide preferences from other users
          };
        }
      }

      return userData;
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
      // Ensure participantIds is set for access control
      const participantIds = meetingData.participantIds || [];
      
      // Add the host to participants if not already included
      if (meetingData.hostId && !participantIds.includes(meetingData.hostId)) {
        participantIds.push(meetingData.hostId);
      }

      const meetingRef = await addDoc(
        collection(db, 'meetings'), 
        convertDatesToTimestamps({
          ...meetingData,
          participantIds,
        })
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
   * Get meeting by ID with access control
   */
  static async getMeeting(meetingId: string, requestingUserId?: string): Promise<Meeting | null> {
    try {
      const meetingDoc = await getDoc(doc(db, 'meetings', meetingId));
      
      if (!meetingDoc.exists()) {
        return null;
      }

      const meetingData = convertTimestamps({ 
        meetingId: meetingDoc.id, 
        ...meetingDoc.data() 
      }) as Meeting;

      // Access control check
      if (requestingUserId) {
        const user = await getDoc(doc(db, 'users', requestingUserId));
        const isAdmin = user.exists() && user.data()?.isAdmin;
        
        // Check if user has access (is admin or is a participant)
        if (!isAdmin && !meetingData.participantIds?.includes(requestingUserId)) {
          return null; // No access
        }
      }

      return meetingData;
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
      // Ensure participantIds is updated if participants change
      if (updates.participants) {
        const participantIds = updates.participants.map(p => p.userId);
        updates.participantIds = participantIds;
      }

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
   * Get user meetings with pagination and access control
   */
  static async getUserMeetings(
    userId: string, 
    options: PaginationOptions & { includeAdminView?: boolean } = {}
  ): Promise<PaginatedResult<Meeting>> {
    const {
      limit: pageLimit = 20,
      startAfterDoc,
      orderByField = 'startTime',
      orderDirection = 'desc',
      includeAdminView = false
    } = options;
    
    // Generate cache key for first page only (pagination not cached)
    const cacheKey = !startAfterDoc ? 
      generateCacheKey('getUserMeetings', { userId, pageLimit, orderByField, orderDirection, includeAdminView }) : 
      null;
    
    // Check cache first for non-paginated requests
    if (cacheKey) {
      const cached = getCachedResult(cacheKey);
      if (cached) {
        return trackQueryPerformance('getUserMeetings', () => Promise.resolve(cached), true);
      }
    }
    
    return trackQueryPerformance('getUserMeetings', async () => {
      try {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', userId));
        const isAdmin = userDoc.exists() && userDoc.data()?.isAdmin;

        // If admin and includeAdminView is true, get all meetings
        if (isAdmin && includeAdminView) {
          let meetingQuery = query(
            collection(db, 'meetings'),
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

          const result = {
            data: meetings,
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
            hasMore
          };

          if (cacheKey) {
            setCachedResult(cacheKey, result, DASHBOARD_CACHE_TTL);
          }

          return result;
        }

        // For non-admin users or when not using admin view, use participantIds
        if (startAfterDoc) {
          let meetingQuery = query(
            collection(db, 'meetings'),
            where('participantIds', 'array-contains', userId),
            orderBy(orderByField, orderDirection),
            limit(pageLimit + 1)
          );
          meetingQuery = query(meetingQuery, startAfter(startAfterDoc));
          const snap = await getDocs(meetingQuery);
          const docs = snap.docs;
          const hasMore = docs.length > pageLimit;
          if (hasMore) docs.pop();
          const meetings = docs.map(doc => convertTimestamps({ meetingId: doc.id, ...doc.data() })) as Meeting[];
          return { data: meetings, lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined, hasMore };
        }

        // Use participantIds for access control
        const meetingQuery = query(
          collection(db, 'meetings'),
          where('participantIds', 'array-contains', userId),
          orderBy(orderByField, orderDirection),
          limit(pageLimit + 1)
        );

        const snapshot = await getDocs(meetingQuery);
        const docs = snapshot.docs;
        const hasMore = docs.length > pageLimit;
        
        if (hasMore) {
          docs.pop();
        }

        const meetings = docs.map(doc => 
          convertTimestamps({ meetingId: doc.id, ...doc.data() })
        ) as Meeting[];

        const result = {
          data: meetings,
          lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined,
          hasMore
        };
        
        // Cache first page results
        if (cacheKey) {
          setCachedResult(cacheKey, result, DASHBOARD_CACHE_TTL);
        }
        
        return result;
      } catch (error) {
        throw new DatabaseError(
          `Failed to get meetings for user ${userId}`,
          'USER_MEETINGS_GET_FAILED',
          'getUserMeetings',
          error as Error
        );
      }
    });
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

  // ============ CACHE MANAGEMENT ============
  
  /**
   * Invalidate meeting cache entries for a user
   */
  static invalidateMeetingCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of QueryCache) {
      if (key.includes('getUserMeetings') && key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => QueryCache.delete(key));
  }
  
  /**
   * Clear all cache entries
   */
  static clearCache(): void {
    QueryCache.clear();
    queryMetrics.cacheHits = 0;
    queryMetrics.queryCount = 0;
    queryMetrics.averageLatency = 0;
    queryMetrics.lastQueries = [];
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      cacheSize: QueryCache.size,
      cacheHitRate: queryMetrics.queryCount > 0 ? (queryMetrics.cacheHits / queryMetrics.queryCount) * 100 : 0,
      totalQueries: queryMetrics.queryCount,
      averageLatency: queryMetrics.averageLatency,
      recentQueries: queryMetrics.lastQueries.slice(0, 10)
    };
  }
  
  /**
   * Cleanup expired cache entries
   */
  static cleanupExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of QueryCache) {
      if (now > value.timestamp + value.ttl) {
        QueryCache.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  // ============ MEETING STATISTICS ============

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
          where('participantIds', 'array-contains', userId)
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

      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', userId));
      const isAdmin = userDoc.exists() && userDoc.data()?.isAdmin;

      let meetingQuery;
      if (isAdmin) {
        // Admin can search all meetings
        meetingQuery = query(
          collection(db, 'meetings'),
          orderBy(orderByField, orderDirection),
          limit(pageLimit * 3) // Get more to filter client-side
        );
      } else {
        // Regular users can only search their meetings
        meetingQuery = query(
          collection(db, 'meetings'),
          where('participantIds', 'array-contains', userId),
          orderBy(orderByField, orderDirection),
          limit(pageLimit * 3) // Get more to filter client-side
        );
      }

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