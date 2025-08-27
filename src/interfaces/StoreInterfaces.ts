import type { User, UserPreferences, Meeting, TranscriptEntry, SpeakerProfile } from '@/types';
import type { LocalAuthError, SignUpData, SignInData } from '@/services/firebase/AuthService';

/**
 * Store Interface Definitions for Dependency Injection
 * 
 * These interfaces define the contracts that services can depend on
 * without creating circular dependencies with actual store implementations.
 */

// ============ AUTH STORE INTERFACE ============
export interface AuthStoreInterface {
  // State
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: LocalAuthError | null;
  
  // Loading states for specific operations
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSigningOut: boolean;
  isUpdatingProfile: boolean;
  isResettingPassword: boolean;
  isUpdatingPassword: boolean;

  // Authentication actions
  signUp: (data: SignUpData) => Promise<boolean>;
  signIn: (data: SignInData) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  
  // Profile management
  updateProfile: (data: {
    displayName?: string;
    photoURL?: string;
    preferences?: Partial<UserPreferences>;
  }) => Promise<boolean>;
  
  // State management
  setUser: (user: User | null) => void;
  setError: (error: LocalAuthError | null) => void;
  clearError: () => void;
  setInitialized: (initialized: boolean) => void;
  
  // Utility actions
  refreshUser: () => Promise<void>;
  initialize: () => void;
  initializeAuth: () => Promise<void>;
}

// ============ MEETING STORE INTERFACE ============
export interface MeetingStoreInterface {
  // Core state
  currentMeeting: Meeting | null;
  isInMeeting: boolean;
  meetingType: string;
  
  // Transcript state
  transcript: TranscriptEntry[];
  filteredTranscript: TranscriptEntry[];
  
  // Participants and speakers
  participants: SpeakerProfile[];
  
  // Recording state
  isRecording: boolean;
  recordingStartTime: Date | null;
  
  // Error states
  meetingError: string | null;
  transcriptError: string | null;
  
  // Real-time synchronization
  realtimeEnabled: boolean;
  listeners: Set<string>;
  
  // Actions
  startMeeting: (meetingData: {
    type: string;
    title?: string;
    description?: string;
  }) => Promise<string | null>;
  
  endMeeting: (meetingId?: string) => Promise<boolean>;
  
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  updateTranscriptEntry: (id: string, updates: Partial<TranscriptEntry>) => void;
  
  addParticipant: (participant: SpeakerProfile) => void;
  updateParticipant: (id: string, updates: Partial<SpeakerProfile>) => void;
  
  startRecording: () => void;
  stopRecording: () => void;
  
  setMeetingError: (error: string | null) => void;
  setTranscriptError: (error: string | null) => void;
  
  enableRealtimeSync: (meetingId: string) => Promise<void>;
  disableRealtimeSync: () => void;
  
  resetMeetingState: () => void;
}

// ============ APP STORE INTERFACE ============
export interface AppStoreInterface {
  // UI State
  sidebarOpen: boolean;
  isOnline: boolean;
  
  // Device management
  availableDevices: Array<{
    id: string;
    name: string;
    type: 'microphone' | 'speaker';
  }>;
  selectedMicrophone: { id: string; name: string; type: 'microphone' } | null;
  selectedSpeaker: { id: string; name: string; type: 'speaker' } | null;
  
  // Audio settings
  microphoneGain: number;
  speakerVolume: number;
  noiseReduction: boolean;
  echoCancellation: boolean;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
  
  // Global errors
  globalErrors: Array<{
    id: string;
    error: Error;
    context?: string;
    timestamp: Date;
  }>;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setOnlineStatus: (online: boolean) => void;
  
  updateDevices: (devices: Array<{
    id: string;
    name: string;
    type: 'microphone' | 'speaker';
  }>) => void;
  setSelectedMicrophone: (device: { id: string; name: string; type: 'microphone' } | null) => void;
  setSelectedSpeaker: (device: { id: string; name: string; type: 'speaker' } | null) => void;
  
  updateAudioSettings: (settings: {
    microphoneGain?: number;
    speakerVolume?: number;
    noiseReduction?: boolean;
    echoCancellation?: boolean;
  }) => void;
  
  addNotification: (notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }) => string;
  
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  addGlobalError: (error: Error, context?: string) => string;
  removeGlobalError: (id: string) => void;
  clearGlobalErrors: () => void;
}

// ============ STORE REGISTRY INTERFACE ============
export interface StoreRegistryInterface {
  auth: AuthStoreInterface;
  meeting: MeetingStoreInterface;
  app: AppStoreInterface;
}

// ============ SERVICE DEPENDENCY INTERFACE ============
export interface ServiceDependencies {
  authStore?: AuthStoreInterface;
  meetingStore?: MeetingStoreInterface;
  appStore?: AppStoreInterface;
}