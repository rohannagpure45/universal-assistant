import { db } from '@/lib/firebase/client';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot, 
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule,
  MeetingType 
} from '@/types';

// Utility function for timestamp conversion (reused from DatabaseService)
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

// Real-time listener types
export type DocumentChangeType = 'added' | 'modified' | 'removed';

export interface DocumentChange<T> {
  type: DocumentChangeType;
  doc: T;
  oldIndex?: number;
  newIndex?: number;
}

export interface RealtimeUpdate<T> {
  changes: DocumentChange<T>[];
  data: T[];
  metadata: {
    hasPendingWrites: boolean;
    isFromCache: boolean;
  };
}

// Listener callback types
export type UserListener = (user: User | null) => void;
export type MeetingListener = (meeting: Meeting | null) => void;
export type MeetingListListener = (update: RealtimeUpdate<Meeting>) => void;
export type TranscriptListener = (update: RealtimeUpdate<TranscriptEntry>) => void;
export type VoiceProfileListener = (update: RealtimeUpdate<SpeakerProfile>) => void;
export type CustomRuleListener = (update: RealtimeUpdate<CustomRule>) => void;

// Error handling for real-time operations
export class RealtimeError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'RealtimeError';
  }
}

export class RealtimeService {
  
  // ============ USER LISTENERS ============
  
  /**
   * Listen to user profile changes
   */
  static listenToUser(userId: string, callback: UserListener): Unsubscribe {
    try {
      const userRef = doc(db, 'users', userId);
      
      return onSnapshot(
        userRef,
        (doc) => {
          if (doc.exists()) {
            const userData = convertTimestamps({ uid: doc.id, ...doc.data() }) as User;
            callback(userData);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('User listener error:', error);
          callback(null);
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up user listener for ${userId}`,
        'USER_LISTENER_FAILED',
        'listenToUser',
        error as Error
      );
    }
  }

  // ============ MEETING LISTENERS ============

  /**
   * Listen to single meeting changes
   */
  static listenToMeeting(meetingId: string, callback: MeetingListener): Unsubscribe {
    try {
      const meetingRef = doc(db, 'meetings', meetingId);
      
      return onSnapshot(
        meetingRef,
        (doc) => {
          if (doc.exists()) {
            const meetingData = convertTimestamps({ 
              meetingId: doc.id, 
              ...doc.data() 
            }) as Meeting;
            callback(meetingData);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Meeting listener error:', error);
          callback(null);
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up meeting listener for ${meetingId}`,
        'MEETING_LISTENER_FAILED',
        'listenToMeeting',
        error as Error
      );
    }
  }

  /**
   * Listen to user meetings
   */
  static listenToUserMeetings(
    userId: string, 
    callback: MeetingListListener,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Unsubscribe {
    try {
      const {
        limit: queryLimit = 20,
        orderBy: orderField = 'startTime',
        orderDirection = 'desc'
      } = options;

      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains-any', [userId]),
        orderBy(orderField, orderDirection),
        limit(queryLimit)
      );

      return onSnapshot(
        meetingsQuery,
        (snapshot) => {
          const changes: DocumentChange<Meeting>[] = [];
          const meetings: Meeting[] = [];

          snapshot.docChanges().forEach((change) => {
            const meetingData = convertTimestamps({ 
              meetingId: change.doc.id, 
              ...change.doc.data() 
            }) as Meeting;

            changes.push({
              type: change.type,
              doc: meetingData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            meetings.push(convertTimestamps({ 
              meetingId: doc.id, 
              ...doc.data() 
            }) as Meeting);
          });

          callback({
            changes,
            data: meetings,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('User meetings listener error:', error);
          // Call callback with empty data on error
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up user meetings listener for ${userId}`,
        'USER_MEETINGS_LISTENER_FAILED',
        'listenToUserMeetings',
        error as Error
      );
    }
  }

  /**
   * Listen to meetings by type
   */
  static listenToMeetingsByType(
    meetingType: MeetingType,
    callback: MeetingListListener,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Unsubscribe {
    try {
      const {
        limit: queryLimit = 20,
        orderBy: orderField = 'startTime',
        orderDirection = 'desc'
      } = options;

      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('type', '==', meetingType),
        orderBy(orderField, orderDirection),
        limit(queryLimit)
      );

      return onSnapshot(
        meetingsQuery,
        (snapshot) => {
          const changes: DocumentChange<Meeting>[] = [];
          const meetings: Meeting[] = [];

          snapshot.docChanges().forEach((change) => {
            const meetingData = convertTimestamps({ 
              meetingId: change.doc.id, 
              ...change.doc.data() 
            }) as Meeting;

            changes.push({
              type: change.type,
              doc: meetingData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            meetings.push(convertTimestamps({ 
              meetingId: doc.id, 
              ...doc.data() 
            }) as Meeting);
          });

          callback({
            changes,
            data: meetings,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('Meetings by type listener error:', error);
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up meetings by type listener for ${meetingType}`,
        'MEETINGS_BY_TYPE_LISTENER_FAILED',
        'listenToMeetingsByType',
        error as Error
      );
    }
  }

  // ============ TRANSCRIPT LISTENERS ============

  /**
   * Listen to transcript entries for a meeting
   */
  static listenToTranscriptEntries(
    meetingId: string,
    callback: TranscriptListener,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Unsubscribe {
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

      return onSnapshot(
        transcriptsQuery,
        (snapshot) => {
          const changes: DocumentChange<TranscriptEntry>[] = [];
          const transcripts: TranscriptEntry[] = [];

          snapshot.docChanges().forEach((change) => {
            const transcriptData = convertTimestamps({ 
              id: change.doc.id, 
              ...change.doc.data() 
            }) as TranscriptEntry;

            changes.push({
              type: change.type,
              doc: transcriptData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            transcripts.push(convertTimestamps({ 
              id: doc.id, 
              ...doc.data() 
            }) as TranscriptEntry);
          });

          callback({
            changes,
            data: transcripts,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('Transcript entries listener error:', error);
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up transcript listener for meeting ${meetingId}`,
        'TRANSCRIPT_LISTENER_FAILED',
        'listenToTranscriptEntries',
        error as Error
      );
    }
  }

  /**
   * Listen to transcript entries by speaker
   */
  static listenToTranscriptEntriesBySpeaker(
    meetingId: string,
    speakerId: string,
    callback: TranscriptListener,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Unsubscribe {
    try {
      const {
        limit: queryLimit = 100,
        orderBy: orderField = 'timestamp',
        orderDirection = 'asc'
      } = options;

      const transcriptsQuery = query(
        collection(db, 'meetings', meetingId, 'transcripts'),
        where('speakerId', '==', speakerId),
        orderBy(orderField, orderDirection),
        limit(queryLimit)
      );

      return onSnapshot(
        transcriptsQuery,
        (snapshot) => {
          const changes: DocumentChange<TranscriptEntry>[] = [];
          const transcripts: TranscriptEntry[] = [];

          snapshot.docChanges().forEach((change) => {
            const transcriptData = convertTimestamps({ 
              id: change.doc.id, 
              ...change.doc.data() 
            }) as TranscriptEntry;

            changes.push({
              type: change.type,
              doc: transcriptData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            transcripts.push(convertTimestamps({ 
              id: doc.id, 
              ...doc.data() 
            }) as TranscriptEntry);
          });

          callback({
            changes,
            data: transcripts,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('Transcript entries by speaker listener error:', error);
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up transcript by speaker listener for ${speakerId}`,
        'TRANSCRIPT_BY_SPEAKER_LISTENER_FAILED',
        'listenToTranscriptEntriesBySpeaker',
        error as Error
      );
    }
  }

  // ============ VOICE PROFILE LISTENERS ============

  /**
   * Listen to user voice profiles
   */
  static listenToUserVoiceProfiles(
    userId: string,
    callback: VoiceProfileListener
  ): Unsubscribe {
    try {
      const voiceProfilesQuery = query(
        collection(db, 'users', userId, 'voiceProfiles'),
        orderBy('lastSeen', 'desc')
      );

      return onSnapshot(
        voiceProfilesQuery,
        (snapshot) => {
          const changes: DocumentChange<SpeakerProfile>[] = [];
          const profiles: SpeakerProfile[] = [];

          snapshot.docChanges().forEach((change) => {
            const profileData = convertTimestamps({ 
              speakerId: change.doc.id, 
              ...change.doc.data() 
            }) as SpeakerProfile;

            changes.push({
              type: change.type,
              doc: profileData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            profiles.push(convertTimestamps({ 
              speakerId: doc.id, 
              ...doc.data() 
            }) as SpeakerProfile);
          });

          callback({
            changes,
            data: profiles,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('Voice profiles listener error:', error);
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up voice profiles listener for user ${userId}`,
        'VOICE_PROFILES_LISTENER_FAILED',
        'listenToUserVoiceProfiles',
        error as Error
      );
    }
  }

  // ============ CUSTOM RULES LISTENERS ============

  /**
   * Listen to user custom rules
   */
  static listenToUserCustomRules(
    userId: string,
    callback: CustomRuleListener
  ): Unsubscribe {
    try {
      const rulesQuery = query(
        collection(db, 'customRules'),
        where('userId', '==', userId),
        orderBy('priority', 'desc')
      );

      return onSnapshot(
        rulesQuery,
        (snapshot) => {
          const changes: DocumentChange<CustomRule>[] = [];
          const rules: CustomRule[] = [];

          snapshot.docChanges().forEach((change) => {
            const ruleData = convertTimestamps({ 
              id: change.doc.id, 
              ...change.doc.data() 
            }) as CustomRule;

            changes.push({
              type: change.type,
              doc: ruleData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            rules.push(convertTimestamps({ 
              id: doc.id, 
              ...doc.data() 
            }) as CustomRule);
          });

          callback({
            changes,
            data: rules,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('Custom rules listener error:', error);
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        `Failed to set up custom rules listener for user ${userId}`,
        'CUSTOM_RULES_LISTENER_FAILED',
        'listenToUserCustomRules',
        error as Error
      );
    }
  }

  // ============ ACTIVE MEETINGS LISTENER ============

  /**
   * Listen to active meetings (meetings in progress)
   */
  static listenToActiveMeetings(
    callback: MeetingListListener,
    options: {
      limit?: number;
    } = {}
  ): Unsubscribe {
    try {
      const { limit: queryLimit = 50 } = options;

      const activeMeetingsQuery = query(
        collection(db, 'meetings'),
        where('endTime', '==', null), // Active meetings don't have endTime
        orderBy('startTime', 'desc'),
        limit(queryLimit)
      );

      return onSnapshot(
        activeMeetingsQuery,
        (snapshot) => {
          const changes: DocumentChange<Meeting>[] = [];
          const meetings: Meeting[] = [];

          snapshot.docChanges().forEach((change) => {
            const meetingData = convertTimestamps({ 
              meetingId: change.doc.id, 
              ...change.doc.data() 
            }) as Meeting;

            changes.push({
              type: change.type,
              doc: meetingData,
              oldIndex: change.oldIndex,
              newIndex: change.newIndex
            });
          });

          snapshot.docs.forEach((doc) => {
            meetings.push(convertTimestamps({ 
              meetingId: doc.id, 
              ...doc.data() 
            }) as Meeting);
          });

          callback({
            changes,
            data: meetings,
            metadata: {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache
            }
          });
        },
        (error) => {
          console.error('Active meetings listener error:', error);
          callback({
            changes: [],
            data: [],
            metadata: { hasPendingWrites: false, isFromCache: false }
          });
        }
      );
    } catch (error) {
      throw new RealtimeError(
        'Failed to set up active meetings listener',
        'ACTIVE_MEETINGS_LISTENER_FAILED',
        'listenToActiveMeetings',
        error as Error
      );
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Create a composite listener that combines multiple listeners
   * Returns a single unsubscribe function that cleans up all listeners
   */
  static createCompositeListener(listeners: Unsubscribe[]): Unsubscribe {
    return () => {
      listeners.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing listener:', error);
        }
      });
    };
  }

  /**
   * Create a debounced listener wrapper
   * Useful for high-frequency updates like transcript entries
   */
  static createDebouncedListener<T>(
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
   * Create a throttled listener wrapper
   * Useful for preventing too many rapid updates
   */
  static createThrottledListener<T>(
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