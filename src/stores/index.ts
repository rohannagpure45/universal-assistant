// ============ STORE EXPORTS ============
export * from './authStore';
export * from './meetingStore';
export * from './appStore';

// ============ HOOK EXPORTS ============
export * from './hooks/useMeetingHooks';
export * from './hooks/useAppHooks';

// ============ TYPE EXPORTS ============
export type { MeetingError } from './meetingStore';
export type { 
  AudioDevice, 
  AudioSettings, 
  UISettings,
  AccessibilitySettings,
  AISettings,
  TTSSettings,
  NotificationSettings,
  AppError,
  Notification 
} from './appStore';

// ============ STORE INTEGRATION UTILITIES ============

/**
 * Utility to reset all stores to their initial state
 * Useful for testing, logout, or clean slate scenarios
 */
export const resetAllStores = () => {
  const { resetMeetingState } = require('./meetingStore').useMeetingStore.getState();
  const { resetSettingsToDefault, clearNotifications, clearGlobalErrors } = require('./appStore').useAppStore.getState();
  
  // Reset meeting state
  resetMeetingState();
  
  // Reset app settings to defaults
  resetSettingsToDefault();
  clearNotifications();
  clearGlobalErrors();
  
  // Note: AuthStore cleanup is handled by the auth service itself
};

/**
 * Utility to check if all stores are properly initialized
 * Useful for app initialization checks
 */
export const areStoresInitialized = (): boolean => {
  const { isInitialized: authInitialized } = require('./authStore').useAuthStore.getState();
  const { isOnline } = require('./appStore').useAppStore.getState();
  
  return authInitialized && typeof isOnline === 'boolean';
};

/**
 * Get store health status for debugging
 */
export const getStoreHealthStatus = () => {
  const authStore = require('./authStore').useAuthStore.getState();
  const meetingStore = require('./meetingStore').useMeetingStore.getState();
  const appStore = require('./appStore').useAppStore.getState();
  
  return {
    auth: {
      initialized: authStore.isInitialized,
      hasUser: Boolean(authStore.user),
      hasError: Boolean(authStore.error),
      loading: authStore.isLoading,
    },
    meeting: {
      inMeeting: meetingStore.isInMeeting,
      hasCurrentMeeting: Boolean(meetingStore.currentMeeting),
      transcriptLength: meetingStore.transcript.length,
      participantCount: meetingStore.participants.length,
      hasErrors: Boolean(meetingStore.meetingError || meetingStore.transcriptError),
      activeListeners: meetingStore.listeners.size,
    },
    app: {
      online: appStore.isOnline,
      deviceCount: appStore.availableDevices.length,
      notificationCount: appStore.notifications.length,
      errorCount: appStore.globalErrors.length,
      sidebarOpen: appStore.sidebarOpen,
    },
  };
};

/**
 * Subscribe to store changes for debugging or analytics
 */
export const subscribeToStoreChanges = (
  callback: (storeName: string, state: any, previousState: any) => void
) => {
  const { useAuthStore } = require('./authStore');
  const { useMeetingStore } = require('./meetingStore');
  const { useAppStore } = require('./appStore');
  
  const unsubscribeAuth = useAuthStore.subscribe(
    (state, previousState) => callback('auth', state, previousState)
  );
  
  const unsubscribeMeeting = useMeetingStore.subscribe(
    (state, previousState) => callback('meeting', state, previousState)
  );
  
  const unsubscribeApp = useAppStore.subscribe(
    (state, previousState) => callback('app', state, previousState)
  );
  
  return () => {
    unsubscribeAuth();
    unsubscribeMeeting();
    unsubscribeApp();
  };
};