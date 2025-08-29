/**
 * Unified Realtime Service
 * 
 * This service provides a unified interface for real-time data access and can
 * intelligently switch between streaming (RealtimeService) and REST-only 
 * (FirestoreRestService) modes based on browser compatibility and user preferences.
 * 
 * By default, it uses the REST-only service to eliminate streaming transport
 * conflicts in Brave, Safari, and other browsers with strict security policies.
 */

import { FIRESTORE_REST_MODE } from '@/lib/firebase/client';
import { RealtimeService } from './RealtimeService';
import { FirestoreRestService, RestUpdate, DocumentChange } from './FirestoreRestService';
import FirestoreLiteService from '@/lib/firebase/firestoreLite';
import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule, 
  MeetingType 
} from '@/types';

// Re-export types for compatibility
export type { DocumentChangeType, DocumentChange } from './FirestoreRestService';
export type RealtimeUpdate<T> = RestUpdate<T>;

// Listener callback types (same as RealtimeService)
export type UserListener = (user: User | null) => void;
export type MeetingListener = (meeting: Meeting | null) => void;
export type MeetingListListener = (update: RealtimeUpdate<Meeting>) => void;
export type TranscriptListener = (update: RealtimeUpdate<TranscriptEntry>) => void;
export type VoiceProfileListener = (update: RealtimeUpdate<SpeakerProfile>) => void;
export type CustomRuleListener = (update: RealtimeUpdate<CustomRule>) => void;

// Error handling (compatible with both services)
export class UnifiedRealtimeError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'UnifiedRealtimeError';
  }
}

// Service detection utility
const detectBrowserCompatibility = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Known problematic browsers for Firestore streaming
  const problematicBrowsers = [
    'brave', // Brave Browser
    'safari', // Safari (sometimes)
  ];
  
  return !problematicBrowsers.some(browser => userAgent.includes(browser));
};

// Configuration options
export interface UnifiedRealtimeConfig {
  forceRestMode?: boolean;
  pollingInterval?: number;
  maxRetries?: number;
  backoffMultiplier?: number;
  maxBackoffDelay?: number;
}

const DEFAULT_CONFIG: UnifiedRealtimeConfig = {
  forceRestMode: true, // Default to REST mode for reliability
  pollingInterval: 2000,
  maxRetries: 3,
  backoffMultiplier: 1.5,
  maxBackoffDelay: 30000,
};

/**
 * Unified Realtime Service
 * 
 * Provides a consistent interface for real-time data access while automatically
 * handling browser compatibility issues with Firestore streaming.
 */
export class UnifiedRealtimeService {
  private static config: UnifiedRealtimeConfig = DEFAULT_CONFIG;
  private static useRestMode: boolean = true;

  /**
   * Initialize the service with configuration
   */
  static initialize(config: Partial<UnifiedRealtimeConfig> = {}): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Determine whether to use REST mode
    if (this.config.forceRestMode !== undefined) {
      this.useRestMode = this.config.forceRestMode;
    } else {
      // Auto-detect based on browser and global setting
      this.useRestMode = FIRESTORE_REST_MODE || !detectBrowserCompatibility();
    }

    console.log(`UnifiedRealtimeService initialized in ${this.useRestMode ? 'REST' : 'streaming'} mode`);
  }

  /**
   * Get current service mode
   */
  static getServiceMode(): 'rest' | 'streaming' {
    return this.useRestMode ? 'rest' : 'streaming';
  }

  /**
   * Force switch to REST mode (useful for troubleshooting)
   */
  static switchToRestMode(): void {
    this.useRestMode = true;
    console.log('Switched to REST mode');
  }

  /**
   * Force switch to streaming mode (if supported)
   */
  static switchToStreamingMode(): void {
    if (FIRESTORE_REST_MODE) {
      console.warn('Cannot switch to streaming mode: FIRESTORE_REST_MODE is enabled');
      return;
    }
    this.useRestMode = false;
    console.log('Switched to streaming mode');
  }

  // ============ USER LISTENERS ============

  /**
   * Listen to user profile changes
   */
  static listenToUser(userId: string, callback: UserListener): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToUser(userId, callback, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToUser(userId, callback);
    }
  }

  // ============ MEETING LISTENERS ============

  /**
   * Listen to single meeting changes
   */
  static listenToMeeting(meetingId: string, callback: MeetingListener): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToMeeting(meetingId, callback, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToMeeting(meetingId, callback);
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
  ): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToUserMeetings(userId, callback, options, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToUserMeetings(userId, callback, options);
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
  ): () => void {
    if (this.useRestMode) {
      // For REST mode, we'll need to implement this in FirestoreRestService
      // For now, return a no-op unsubscribe function
      console.warn('listenToMeetingsByType not yet implemented in REST mode');
      return () => {};
    } else {
      return RealtimeService.listenToMeetingsByType(meetingType, callback, options);
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
  ): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToTranscriptEntries(meetingId, callback, options, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToTranscriptEntries(meetingId, callback, options);
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
  ): () => void {
    if (this.useRestMode) {
      // For REST mode, we'll need to implement this in FirestoreRestService
      // For now, return a no-op unsubscribe function
      console.warn('listenToTranscriptEntriesBySpeaker not yet implemented in REST mode');
      return () => {};
    } else {
      return RealtimeService.listenToTranscriptEntriesBySpeaker(meetingId, speakerId, callback, options);
    }
  }

  // ============ VOICE PROFILE LISTENERS ============

  /**
   * Listen to user voice profiles
   */
  static listenToUserVoiceProfiles(
    userId: string,
    callback: VoiceProfileListener
  ): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToUserVoiceProfiles(userId, callback, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToUserVoiceProfiles(userId, callback);
    }
  }

  // ============ CUSTOM RULES LISTENERS ============

  /**
   * Listen to user custom rules
   */
  static listenToUserCustomRules(
    userId: string,
    callback: CustomRuleListener
  ): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToUserCustomRules(userId, callback, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToUserCustomRules(userId, callback);
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
  ): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.listenToActiveMeetings(callback, options, {
        interval: this.config.pollingInterval,
        maxRetries: this.config.maxRetries,
        backoffMultiplier: this.config.backoffMultiplier,
        maxBackoffDelay: this.config.maxBackoffDelay,
      });
    } else {
      return RealtimeService.listenToActiveMeetings(callback, options);
    }
  }

  // ============ DIRECT DATA FETCHING ============

  /**
   * Get user by ID (one-time fetch)
   */
  static async getUser(userId: string): Promise<User | null> {
    if (this.useRestMode) {
      return FirestoreRestService.getUser(userId);
    } else {
      // For streaming mode, we'll use a one-time snapshot
      // This would need to be implemented in the original RealtimeService
      throw new UnifiedRealtimeError(
        'One-time user fetch not implemented for streaming mode',
        'NOT_IMPLEMENTED',
        'getUser'
      );
    }
  }

  /**
   * Get meeting by ID (one-time fetch)
   */
  static async getMeeting(meetingId: string): Promise<Meeting | null> {
    if (this.useRestMode) {
      return FirestoreRestService.getMeeting(meetingId);
    } else {
      throw new UnifiedRealtimeError(
        'One-time meeting fetch not implemented for streaming mode',
        'NOT_IMPLEMENTED',
        'getMeeting'
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
    if (this.useRestMode) {
      return FirestoreRestService.getUserMeetings(userId, options);
    } else {
      throw new UnifiedRealtimeError(
        'One-time user meetings fetch not implemented for streaming mode',
        'NOT_IMPLEMENTED',
        'getUserMeetings'
      );
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Create a composite listener that combines multiple listeners
   */
  static createCompositeListener(listeners: (() => void)[]): () => void {
    if (this.useRestMode) {
      return FirestoreRestService.createCompositeUnsubscribe(listeners);
    } else {
      return RealtimeService.createCompositeListener(listeners);
    }
  }

  /**
   * Create a debounced listener wrapper
   */
  static createDebouncedListener<T>(
    callback: (data: T) => void,
    delay: number = 300
  ): (data: T) => void {
    if (this.useRestMode) {
      return FirestoreRestService.createDebouncedCallback(callback, delay);
    } else {
      return RealtimeService.createDebouncedListener(callback, delay);
    }
  }

  /**
   * Create a throttled listener wrapper
   */
  static createThrottledListener<T>(
    callback: (data: T) => void,
    delay: number = 1000
  ): (data: T) => void {
    if (this.useRestMode) {
      return FirestoreRestService.createThrottledCallback(callback, delay);
    } else {
      return RealtimeService.createThrottledListener(callback, delay);
    }
  }

  /**
   * Stop all active listeners/polling
   */
  static stopAll(): void {
    if (this.useRestMode) {
      FirestoreRestService.stopAllPolling();
    } else {
      // For streaming mode, we don't have a global stop method
      console.warn('Global stop not implemented for streaming mode');
    }
  }

  /**
   * Get service health/status information
   */
  static getServiceInfo(): {
    mode: 'rest' | 'streaming';
    browserCompatible: boolean;
    activeListeners: string[] | number;
    config: UnifiedRealtimeConfig;
  } {
    return {
      mode: this.getServiceMode(),
      browserCompatible: detectBrowserCompatibility(),
      activeListeners: this.useRestMode 
        ? FirestoreRestService.getActivePolls() 
        : 0, // Streaming mode doesn't track this
      config: this.config
    };
  }
}

// Auto-initialize with default settings
UnifiedRealtimeService.initialize();

// Cleanup on browser tab/window close
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    UnifiedRealtimeService.stopAll();
  });
}