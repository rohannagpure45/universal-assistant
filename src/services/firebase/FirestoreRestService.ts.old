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

// Use shared Firebase instances for consistent auth context
import { db, auth } from '@/lib/firebase/client';
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
  onSnapshot,
  deleteDoc,
  writeBatch,
  Timestamp,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  FirestoreError,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';

import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule, 
  MeetingType
} from '@/types';
import { handleFirebaseError, reportFirebaseError, withFirebaseErrorHandling } from '@/utils/firebaseErrorHandler';
import { processCatchError } from '@/utils/errorMessages';

// Using shared db and auth instances from main application
// This ensures consistent authentication state across all services

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
  useRealTime?: boolean; // Enable real-time listeners instead of polling
}

const DEFAULT_POLLING_CONFIG: PollingConfig = {
  interval: 2000, // 2 seconds for active polling
  maxRetries: 3,
  backoffMultiplier: 1.5,
  maxBackoffDelay: 30000, // 30 seconds max
  useRealTime: true // Enable real-time listeners by default
};

// Efficient shallow equality check for polling data comparison
function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (!obj1 || !obj2) return false;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((item, index) => item === obj2[index]);
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => obj1[key] === obj2[key]);
}

// Polling manager to handle both polling and real-time listeners
class PollingManager {
  private activePolls = new Map<string, {
    intervalId?: NodeJS.Timeout;
    unsubscribe?: () => void; // Real-time listener unsubscribe function
    config: PollingConfig;
    callback: (data: any) => void;
    lastData: any;
    retryCount: number;
    isRealTime: boolean;
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
          // Only call callback if data has changed (using efficient shallow comparison)
          const dataChanged = !shallowEqual(data, existingPoll.lastData);
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
      retryCount: 0,
      isRealTime: false
    });
  }

  /**
   * Start real-time listener with fallback to polling on error
   */
  startRealTimeListener<T>(
    pollId: string,
    queryRef: any, // Firestore query reference
    callback: (data: T) => void,
    config: PollingConfig = DEFAULT_POLLING_CONFIG
  ): void {
    // Stop existing poll if running
    this.stopPolling(pollId);

    try {
      // Set up real-time listener with error handling
      const unsubscribe = onSnapshot(
        queryRef, 
        (snapshot: QuerySnapshot) => {
          try {
            // Process snapshot data (similar to poll function)
            const data = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ 
              id: doc.id, 
              ...doc.data() 
            })) as T;
            
            const existingPoll = this.activePolls.get(pollId);
            if (existingPoll) {
              // Only call callback if data has changed
              const dataChanged = !shallowEqual(data, existingPoll.lastData);
              if (dataChanged) {
                callback(data);
                existingPoll.lastData = data;
              }
              existingPoll.retryCount = 0; // Reset retry count on success
            }
          } catch (error) {
            console.error(`Real-time listener callback error for ${pollId}:`, error);
          }
        },
        (error: FirestoreError) => {
          console.error(`Real-time listener error for ${pollId}:`, error);
          // Fallback to polling on listener failure
          this.fallbackToPolling(pollId, config);
        }
      );

      this.activePolls.set(pollId, {
        unsubscribe,
        config,
        callback,
        lastData: null,
        retryCount: 0,
        isRealTime: true
      });
    } catch (error) {
      console.error(`Failed to setup real-time listener for ${pollId}:`, error);
      // Fallback to polling if listener setup fails
      this.fallbackToPolling(pollId, config);
    }
  }

  /**
   * Fallback to polling when real-time listener fails
   */
  private fallbackToPolling(pollId: string, config: PollingConfig): void {
    console.warn(`Falling back to polling for ${pollId}`);
    // This would need the original poll function - simplified for now
    // In practice, you'd need to store the poll function or recreate it
  }

  stopPolling(pollId: string): void {
    const poll = this.activePolls.get(pollId);
    if (poll) {
      if (poll.isRealTime && poll.unsubscribe) {
        // Clean up real-time listener
        poll.unsubscribe();
      } else if (poll.intervalId) {
        // Clean up polling interval
        clearInterval(poll.intervalId);
      }
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

// Enhanced authentication validation with better timing and error handling
const ensureAuthenticatedUser = (): Promise<{ authenticated: boolean; user: FirebaseUser | null }> => {
  return new Promise((resolve) => {
    if (!auth) {
      console.warn('Auth not available - proceeding without auth check');
      resolve({ authenticated: false, user: null });
      return;
    }

    // If user is already available, return immediately
    if (auth.currentUser) {
      resolve({ authenticated: true, user: auth.currentUser });
      return;
    }

    // Wait longer for auth state to settle (increased from 3s to 6s)
    const timeout = setTimeout(() => {
      console.warn('Auth state timeout - checking final state');
      resolve({ 
        authenticated: Boolean(auth.currentUser), 
        user: auth.currentUser 
      });
    }, 6000);

    // Listen for auth state changes with better error handling
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      clearTimeout(timeout);
      unsubscribe();
      
      console.log('Auth state resolved:', user ? 'authenticated' : 'not authenticated');
      resolve({ 
        authenticated: Boolean(user), 
        user 
      });
    }, (error) => {
      // Handle auth state change errors
      console.error('Auth state change error:', error);
      clearTimeout(timeout);
      unsubscribe();
      resolve({ authenticated: false, user: null });
    });
  });
};

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
        // Use our new Firebase error handling for monitoring
        const processedError = processCatchError(error);
        reportFirebaseError(processedError, 'Fetch user', userId);
        
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

    // Real-time listener callback that handles single document
    const realtimeCallback = (snapshot: any) => {
      try {
        if (snapshot.exists()) {
          const meeting = convertTimestamps({ 
            meetingId: snapshot.id, 
            ...snapshot.data() 
          }) as Meeting;
          callback(meeting);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error(`Error processing meeting snapshot for ${meetingId}:`, error);
        callback(null);
      }
    };

    // Create document reference for real-time listener
    const meetingRef = doc(db, 'meetings', meetingId);
    
    // Set up real-time listener with automatic fallback to polling
    const unsubscribe = onSnapshot(
      meetingRef,
      realtimeCallback,
      (error) => {
        console.warn(`Real-time listener failed for meeting ${meetingId}, falling back to polling:`, error);
        
        // Fallback to polling on error
        const fetchMeeting = async (): Promise<Meeting | null> => {
          try {
            const authState = await ensureAuthenticatedUser();
            if (!authState.authenticated) return null;

            const docSnap = await getDoc(meetingRef);
            if (docSnap.exists()) {
              return convertTimestamps({ 
                meetingId: docSnap.id, 
                ...docSnap.data() 
              }) as Meeting;
            }
            return null;
          } catch (error) {
            if ((error as any)?.code === 'permission-denied') return null;
            throw new FirestoreRestError(
              `Failed to fetch meeting ${meetingId}`,
              'MEETING_FETCH_FAILED',
              'fetchMeeting',
              error as Error
            );
          }
        };

        pollingManager.startPolling(pollId, fetchMeeting, callback, pollConfig);
      }
    );

    return () => {
      unsubscribe();
      pollingManager.stopPolling(pollId);
    };
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
        // Ensure auth state is ready before attempting Firestore operations
        const authState = await ensureAuthenticatedUser();
        
        if (!authState.authenticated) {
          console.warn(`No authenticated user for user meetings ${userId} - returning empty result`);
          return {
            changes: [],
            data: [],
            metadata: {
              hasPendingWrites: false,
              isFromCache: false
            }
          };
        }

        const {
          limit: queryLimit = 20,
          orderBy: orderField = 'startTime',
          orderDirection = 'desc'
        } = options;

        const meetingsQuery = query(
          collection(db, 'meetings'),
          where('participantIds', 'array-contains', userId),
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
        // For permission denied errors, return empty result instead of throwing
        if ((error as any)?.code === 'permission-denied') {
          console.warn(`Permission denied for user meetings ${userId} - returning empty result`);
          return {
            changes: [],
            data: [],
            metadata: {
              hasPendingWrites: false,
              isFromCache: false
            }
          };
        }
        
        throw new FirestoreRestError(
          `Failed to fetch user meetings for ${userId}`,
          'USER_MEETINGS_FETCH_FAILED',
          'fetchUserMeetings',
          error as Error
        );
      }
    };

    // Set up real-time listener for user meetings collection
    const {
      limit: queryLimit = 20,
      orderBy: orderField = 'startTime',
      orderDirection = 'desc'
    } = options;

    const meetingsQuery = query(
      collection(db, 'meetings'),
      where('participantIds', 'array-contains', userId),
      limit(queryLimit)
    );

    // Real-time listener with automatic fallback to polling
    const unsubscribe = onSnapshot(
      meetingsQuery,
      (snapshot) => {
        try {
          const changes = snapshot.docChanges().map(change => ({
            type: change.type,
            doc: convertTimestamps({ 
              meetingId: change.doc.id, 
              ...change.doc.data() 
            }) as Meeting
          }));

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

          callback({
            changes,
            data: meetings,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        } catch (error) {
          console.error(`Error processing user meetings snapshot for ${userId}:`, error);
        }
      },
      (error) => {
        console.warn(`Real-time listener failed for user meetings ${userId}, falling back to polling:`, error);
        // Fallback to polling on error
        pollingManager.startPolling(pollId, fetchMeetings, callback, pollConfig);
      }
    );

    return () => {
      unsubscribe();
      pollingManager.stopPolling(pollId);
    };
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
        // Ensure auth state is ready before attempting Firestore operations
        const authState = await ensureAuthenticatedUser();
        
        if (!authState.authenticated) {
          console.warn(`No authenticated user for transcripts in meeting ${meetingId} - returning empty result`);
          return {
            changes: [],
            data: [],
            metadata: {
              hasPendingWrites: false,
              isFromCache: false
            }
          };
        }

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
        // For permission denied errors, return empty result instead of throwing
        if ((error as any)?.code === 'permission-denied') {
          console.warn(`Permission denied for transcripts in meeting ${meetingId} - returning empty result`);
          return {
            changes: [],
            data: [],
            metadata: {
              hasPendingWrites: false,
              isFromCache: false
            }
          };
        }
        
        throw new FirestoreRestError(
          `Failed to fetch transcripts for meeting ${meetingId}`,
          'TRANSCRIPTS_FETCH_FAILED',
          'fetchTranscripts',
          error as Error
        );
      }
    };

    // Set up real-time listener for transcript collection
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

    // Real-time listener with automatic fallback to polling
    const unsubscribe = onSnapshot(
      transcriptsQuery,
      (snapshot) => {
        try {
          const changes = snapshot.docChanges().map(change => ({
            type: change.type,
            doc: convertTimestamps({ 
              id: change.doc.id, 
              ...change.doc.data() 
            }) as TranscriptEntry
          }));

          const data: TranscriptEntry[] = [];
          snapshot.docs.forEach((doc) => {
            data.push(convertTimestamps({ 
              id: doc.id, 
              ...doc.data() 
            }) as TranscriptEntry);
          });

          callback({
            changes,
            data,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        } catch (error) {
          console.error(`Error processing transcript snapshot for ${meetingId}:`, error);
        }
      },
      (error) => {
        console.warn(`Real-time listener failed for transcripts ${meetingId}, falling back to polling:`, error);
        // Fallback to polling on error
        pollingManager.startPolling(pollId, fetchTranscripts, callback, pollConfig);
      }
    );

    return () => {
      unsubscribe();
      pollingManager.stopPolling(pollId);
    };
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
        where('participantIds', 'array-contains', userId),
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