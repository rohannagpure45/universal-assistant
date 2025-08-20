/**
 * Firestore REST-Only Service
 * 
 * This service replaces real-time onSnapshot listeners with REST-only operations
 * and polling mechanisms to eliminate WebSocket/streaming transport conflicts
 * that cause issues in Brave and Safari browsers.
 * 
 * Key Features:
 * - Uses Firestore Lite (REST-only) for all operations
 * - Implements intelligent polling for "real-time" updates
 * - Eliminates all streaming transport dependencies
 * - Provides same interface as RealtimeService for easy migration
 */

import { 
  initializeApp,
  getApps 
} from 'firebase/app';
import { 
  getFirestore as getFirestoreLite,
  connectFirestoreEmulator as connectFirestoreEmulatorLite,
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
} from 'firebase/firestore/lite';

import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule, 
  MeetingType
} from '@/types';

// Firebase config (same as client config)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firestore Lite (REST-only)
let app: any;
let db: any;

if (!getApps().find(a => a.name === 'firestore-lite')) {
  app = initializeApp(firebaseConfig, 'firestore-lite');
} else {
  app = getApps().find(a => a.name === 'firestore-lite');
}

db = getFirestoreLite(app);

// Utility function for timestamp conversion
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value && typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        converted[key] = value.toDate();
      } else if (value.seconds && value.nanoseconds !== undefined) {
        converted[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
      } else if (Array.isArray(value)) {
        converted[key] = value.map(convertTimestamps);
      } else if (typeof value === 'object') {
        converted[key] = convertTimestamps(value);
      }
    }
  });
  
  return converted;
};

// Document change types for compatibility with RealtimeService
export type DocumentChangeType = 'added' | 'modified' | 'removed';

export interface DocumentChange<T> {
  type: DocumentChangeType;
  doc: T;
  oldIndex?: number;
  newIndex?: number;
}

export interface RestUpdate<T> {
  changes: DocumentChange<T>[];
  data: T[];
  metadata: {
    hasPendingWrites: boolean;
    isFromCache: boolean;
  };
}

// Polling configuration
export interface PollingConfig {
  interval: number; // milliseconds
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffDelay: number;
}

const DEFAULT_POLLING_CONFIG: PollingConfig = {
  interval: 2000, // 2 seconds for active polling
  maxRetries: 3,
  backoffMultiplier: 1.5,
  maxBackoffDelay: 30000, // 30 seconds max
};

// Polling manager to handle multiple concurrent polls
class PollingManager {
  private activePolls = new Map<string, {
    intervalId: NodeJS.Timeout;
    config: PollingConfig;
    callback: (data: any) => void;
    lastData: any;
    retryCount: number;
  }>();

  startPolling<T>(
    pollId: string,
    pollFunction: () => Promise<T>,
    callback: (data: T) => void,
    config: PollingConfig = DEFAULT_POLLING_CONFIG
  ): void {
    // Stop existing poll if running
    this.stopPolling(pollId);

    const poll = async () => {
      try {
        const data = await pollFunction();
        const existingPoll = this.activePolls.get(pollId);
        
        if (existingPoll) {
          // Only call callback if data has changed
          const dataChanged = JSON.stringify(data) !== JSON.stringify(existingPoll.lastData);
          if (dataChanged) {
            callback(data);
            existingPoll.lastData = data;
          }
          existingPoll.retryCount = 0; // Reset retry count on success
        }
      } catch (error) {
        console.error(`Polling error for ${pollId}:`, error);
        const existingPoll = this.activePolls.get(pollId);
        
        if (existingPoll && existingPoll.retryCount < config.maxRetries) {
          existingPoll.retryCount++;
          const backoffDelay = Math.min(
            config.interval * Math.pow(config.backoffMultiplier, existingPoll.retryCount),
            config.maxBackoffDelay
          );
          
          // Reschedule with backoff
          setTimeout(() => {
            if (this.activePolls.has(pollId)) {
              poll();
            }
          }, backoffDelay);
        }
      }
    };

    // Start initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, config.interval);

    this.activePolls.set(pollId, {
      intervalId,
      config,
      callback,
      lastData: null,
      retryCount: 0
    });
  }

  stopPolling(pollId: string): void {
    const poll = this.activePolls.get(pollId);
    if (poll) {
      clearInterval(poll.intervalId);
      this.activePolls.delete(pollId);
    }
  }

  stopAllPolling(): void {
    for (const [pollId] of this.activePolls) {
      this.stopPolling(pollId);
    }
  }

  getActivePolls(): string[] {
    return Array.from(this.activePolls.keys());
  }
}

// Global polling manager instance
const pollingManager = new PollingManager();

// Error handling for REST operations
export class FirestoreRestError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FirestoreRestError';
  }
}

/**
 * REST-only Firestore Service
 * Provides polling-based "real-time" updates without streaming transports
 */
export class FirestoreRestService {
  
  // ============ POLLING-BASED LISTENERS ============
  
  /**
   * Listen to user profile changes via polling
   */
  static listenToUser(
    userId: string, 
    callback: (user: User | null) => void,
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = `user-${userId}`;

    const fetchUser = async (): Promise<User | null> => {
      try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          return convertTimestamps({ uid: docSnap.id, ...docSnap.data() }) as User;
        }
        return null;
      } catch (error) {
        throw new FirestoreRestError(
          `Failed to fetch user ${userId}`,
          'USER_FETCH_FAILED',
          'fetchUser',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchUser, callback, pollConfig);

    // Return unsubscribe function
    return () => pollingManager.stopPolling(pollId);
  }

  /**
   * Listen to single meeting changes via polling
   */
  static listenToMeeting(
    meetingId: string, 
    callback: (meeting: Meeting | null) => void,
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = `meeting-${meetingId}`;

    const fetchMeeting = async (): Promise<Meeting | null> => {
      try {
        const meetingRef = doc(db, 'meetings', meetingId);
        const docSnap = await getDoc(meetingRef);
        
        if (docSnap.exists()) {
          return convertTimestamps({ 
            meetingId: docSnap.id, 
            ...docSnap.data() 
          }) as Meeting;
        }
        return null;
      } catch (error) {
        throw new FirestoreRestError(
          `Failed to fetch meeting ${meetingId}`,
          'MEETING_FETCH_FAILED',
          'fetchMeeting',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchMeeting, callback, pollConfig);

    return () => pollingManager.stopPolling(pollId);
  }

  /**
   * Listen to user meetings via polling
   */
  static listenToUserMeetings(
    userId: string,
    callback: (update: RestUpdate<Meeting>) => void,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {},
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = `user-meetings-${userId}`;

    const fetchMeetings = async (): Promise<RestUpdate<Meeting>> => {
      try {
        const {
          limit: queryLimit = 20,
          orderBy: orderField = 'startTime',
          orderDirection = 'desc'
        } = options;

        const meetingsQuery = query(
          collection(db, 'meetings'),
          where('participantsUserIds', 'array-contains', userId),
          limit(queryLimit)
        );

        const snapshot = await getDocs(meetingsQuery);
        const meetings: Meeting[] = [];

        snapshot.docs.forEach((doc) => {
          meetings.push(convertTimestamps({ 
            meetingId: doc.id, 
            ...doc.data() 
          }) as Meeting);
        });

        // Sort client-side since we can't use orderBy with array-contains
        meetings.sort((a, b) => {
          const aTime = (a.startTime || a.createdAt || new Date(0)).getTime();
          const bTime = (b.startTime || b.createdAt || new Date(0)).getTime();
          return orderDirection === 'desc' ? bTime - aTime : aTime - bTime;
        });

        return {
          changes: meetings.map(meeting => ({
            type: 'added' as DocumentChangeType,
            doc: meeting
          })),
          data: meetings,
          metadata: {
            hasPendingWrites: false,
            isFromCache: false
          }
        };
      } catch (error) {
        throw new FirestoreRestError(
          `Failed to fetch user meetings for ${userId}`,
          'USER_MEETINGS_FETCH_FAILED',
          'fetchUserMeetings',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchMeetings, callback, pollConfig);

    return () => pollingManager.stopPolling(pollId);
  }

  /**
   * Listen to transcript entries via polling
   */
  static listenToTranscriptEntries(
    meetingId: string,
    callback: (update: RestUpdate<TranscriptEntry>) => void,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {},
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = `transcript-${meetingId}`;

    const fetchTranscripts = async (): Promise<RestUpdate<TranscriptEntry>> => {
      try {
        const {
          limit: queryLimit = 100,
          orderBy: orderField = 'timestamp',
          orderDirection = 'asc'
        } = options;

        const transcriptsQuery = query(
          collection(db, 'meetings', meetingId, 'transcripts'),
          orderBy(orderField, orderDirection),
          limit(queryLimit)
        );

        const snapshot = await getDocs(transcriptsQuery);
        const transcripts: TranscriptEntry[] = [];

        snapshot.docs.forEach((doc) => {
          transcripts.push(convertTimestamps({ 
            id: doc.id, 
            ...doc.data() 
          }) as TranscriptEntry);
        });

        return {
          changes: transcripts.map(transcript => ({
            type: 'added' as DocumentChangeType,
            doc: transcript
          })),
          data: transcripts,
          metadata: {
            hasPendingWrites: false,
            isFromCache: false
          }
        };
      } catch (error) {
        throw new FirestoreRestError(
          `Failed to fetch transcripts for meeting ${meetingId}`,
          'TRANSCRIPTS_FETCH_FAILED',
          'fetchTranscripts',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchTranscripts, callback, pollConfig);

    return () => pollingManager.stopPolling(pollId);
  }

  /**
   * Listen to voice profiles via polling
   */
  static listenToUserVoiceProfiles(
    userId: string,
    callback: (update: RestUpdate<SpeakerProfile>) => void,
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = `voice-profiles-${userId}`;

    const fetchProfiles = async (): Promise<RestUpdate<SpeakerProfile>> => {
      try {
        const voiceProfilesQuery = query(
          collection(db, 'users', userId, 'voiceProfiles'),
          orderBy('lastSeen', 'desc')
        );

        const snapshot = await getDocs(voiceProfilesQuery);
        const profiles: SpeakerProfile[] = [];

        snapshot.docs.forEach((doc) => {
          profiles.push(convertTimestamps({ 
            speakerId: doc.id, 
            ...doc.data() 
          }) as SpeakerProfile);
        });

        return {
          changes: profiles.map(profile => ({
            type: 'added' as DocumentChangeType,
            doc: profile
          })),
          data: profiles,
          metadata: {
            hasPendingWrites: false,
            isFromCache: false
          }
        };
      } catch (error) {
        throw new FirestoreRestError(
          `Failed to fetch voice profiles for ${userId}`,
          'VOICE_PROFILES_FETCH_FAILED',
          'fetchVoiceProfiles',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchProfiles, callback, pollConfig);

    return () => pollingManager.stopPolling(pollId);
  }

  /**
   * Listen to custom rules via polling
   */
  static listenToUserCustomRules(
    userId: string,
    callback: (update: RestUpdate<CustomRule>) => void,
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = `custom-rules-${userId}`;

    const fetchRules = async (): Promise<RestUpdate<CustomRule>> => {
      try {
        const rulesQuery = query(
          collection(db, 'customRules'),
          where('userId', '==', userId),
          orderBy('priority', 'desc')
        );

        const snapshot = await getDocs(rulesQuery);
        const rules: CustomRule[] = [];

        snapshot.docs.forEach((doc) => {
          rules.push(convertTimestamps({ 
            id: doc.id, 
            ...doc.data() 
          }) as CustomRule);
        });

        return {
          changes: rules.map(rule => ({
            type: 'added' as DocumentChangeType,
            doc: rule
          })),
          data: rules,
          metadata: {
            hasPendingWrites: false,
            isFromCache: false
          }
        };
      } catch (error) {
        throw new FirestoreRestError(
          `Failed to fetch custom rules for ${userId}`,
          'CUSTOM_RULES_FETCH_FAILED',
          'fetchCustomRules',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchRules, callback, pollConfig);

    return () => pollingManager.stopPolling(pollId);
  }

  /**
   * Listen to active meetings via polling
   */
  static listenToActiveMeetings(
    callback: (update: RestUpdate<Meeting>) => void,
    options: {
      limit?: number;
    } = {},
    config?: Partial<PollingConfig>
  ): () => void {
    const pollConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    const pollId = 'active-meetings';

    const fetchActiveMeetings = async (): Promise<RestUpdate<Meeting>> => {
      try {
        const { limit: queryLimit = 50 } = options;

        const activeMeetingsQuery = query(
          collection(db, 'meetings'),
          where('endTime', '==', null),
          orderBy('startTime', 'desc'),
          limit(queryLimit)
        );

        const snapshot = await getDocs(activeMeetingsQuery);
        const meetings: Meeting[] = [];

        snapshot.docs.forEach((doc) => {
          meetings.push(convertTimestamps({ 
            meetingId: doc.id, 
            ...doc.data() 
          }) as Meeting);
        });

        return {
          changes: meetings.map(meeting => ({
            type: 'added' as DocumentChangeType,
            doc: meeting
          })),
          data: meetings,
          metadata: {
            hasPendingWrites: false,
            isFromCache: false
          }
        };
      } catch (error) {
        throw new FirestoreRestError(
          'Failed to fetch active meetings',
          'ACTIVE_MEETINGS_FETCH_FAILED',
          'fetchActiveMeetings',
          error as Error
        );
      }
    };

    pollingManager.startPolling(pollId, fetchActiveMeetings, callback, pollConfig);

    return () => pollingManager.stopPolling(pollId);
  }

  // ============ DIRECT DATA FETCHING (NON-POLLING) ============

  /**
   * Get user by ID (one-time fetch)
   */
  static async getUser(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        return convertTimestamps({ uid: docSnap.id, ...docSnap.data() }) as User;
      }
      return null;
    } catch (error) {
      throw new FirestoreRestError(
        `Failed to get user ${userId}`,
        'GET_USER_FAILED',
        'getUser',
        error as Error
      );
    }
  }

  /**
   * Get meeting by ID (one-time fetch)
   */
  static async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      const docSnap = await getDoc(meetingRef);
      
      if (docSnap.exists()) {
        return convertTimestamps({ 
          meetingId: docSnap.id, 
          ...docSnap.data() 
        }) as Meeting;
      }
      return null;
    } catch (error) {
      throw new FirestoreRestError(
        `Failed to get meeting ${meetingId}`,
        'GET_MEETING_FAILED',
        'getMeeting',
        error as Error
      );
    }
  }

  /**
   * Get user meetings (one-time fetch)
   */
  static async getUserMeetings(
    userId: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      startAfterDoc?: any;
    } = {}
  ): Promise<{ data: Meeting[]; hasMore: boolean }> {
    try {
      const {
        limit: queryLimit = 20,
        orderBy: orderField = 'startTime',
        orderDirection = 'desc',
        startAfterDoc
      } = options;

      let meetingsQuery = query(
        collection(db, 'meetings'),
        where('participantsUserIds', 'array-contains', userId),
        limit(queryLimit)
      );

      if (startAfterDoc) {
        meetingsQuery = query(meetingsQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(meetingsQuery);
      const meetings: Meeting[] = [];

      snapshot.docs.forEach((doc) => {
        meetings.push(convertTimestamps({ 
          meetingId: doc.id, 
          ...doc.data() 
        }) as Meeting);
      });

      // Sort client-side
      meetings.sort((a, b) => {
        const aTime = (a.startTime || a.createdAt || new Date(0)).getTime();
        const bTime = (b.startTime || b.createdAt || new Date(0)).getTime();
        return orderDirection === 'desc' ? bTime - aTime : aTime - bTime;
      });

      return {
        data: meetings,
        hasMore: snapshot.docs.length === queryLimit
      };
    } catch (error) {
      throw new FirestoreRestError(
        `Failed to get user meetings for ${userId}`,
        'GET_USER_MEETINGS_FAILED',
        'getUserMeetings',
        error as Error
      );
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Stop all active polling
   */
  static stopAllPolling(): void {
    pollingManager.stopAllPolling();
  }

  /**
   * Get active polling status
   */
  static getActivePolls(): string[] {
    return pollingManager.getActivePolls();
  }

  /**
   * Create a composite unsubscribe function
   */
  static createCompositeUnsubscribe(unsubscribeFns: (() => void)[]): () => void {
    return () => {
      unsubscribeFns.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.error('Error unsubscribing from polling:', error);
        }
      });
    };
  }

  /**
   * Create a debounced callback
   */
  static createDebouncedCallback<T>(
    callback: (data: T) => void,
    delay: number = 300
  ): (data: T) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (data: T) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        callback(data);
      }, delay);
    };
  }

  /**
   * Create a throttled callback
   */
  static createThrottledCallback<T>(
    callback: (data: T) => void,
    delay: number = 1000
  ): (data: T) => void {
    let lastCallTime = 0;
    
    return (data: T) => {
      const now = Date.now();
      
      if (now - lastCallTime >= delay) {
        lastCallTime = now;
        callback(data);
      }
    };
  }
}

// Export polling manager for advanced usage
export { pollingManager };

// Cleanup on browser tab/window close
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    FirestoreRestService.stopAllPolling();
  });
}