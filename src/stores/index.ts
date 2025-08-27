// ============ STORE EXPORTS ============
export * from './authStore';
export * from './meetingStore';
export * from './appStore';

// ============ HOOK EXPORTS ============
// Export specific hooks to avoid naming conflicts
export { 
  useMeetingActions,
  useMeetingState,
  useTranscript,
  useFilteredTranscript,
  useParticipants,
  useRealtimeSync,
  useRecording,
  useMeetingErrorsHook,
  useMeetingSearch
} from './hooks/useMeetingHooks';

export {
  useAudioDevicesHook,
  useAudioSettingsHook,
  useTheme,
  useUISettingsHook,
  useNotifications,
  usePerformanceMonitor,
  useFeatureFlagsHook,
  useErrorHandler
} from './hooks/useAppHooks';

// ============ EVENT SYSTEM ============
export * from './eventListeners';
export * from '../lib/events/StoreEventBus';

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
 * 
 * Uses lazy imports to avoid circular dependencies
 */
export const resetAllStores = async () => {
  try {
    // Use dynamic imports to avoid circular dependencies
    const [meetingStoreModule, appStoreModule] = await Promise.all([
      import('./meetingStore'),
      import('./appStore')
    ]);

    const { resetMeetingState } = meetingStoreModule.useMeetingStore.getState();
    const { resetSettingsToDefault, clearNotifications, clearGlobalErrors } = appStoreModule.useAppStore.getState();
    
    // Reset meeting state
    resetMeetingState();
    
    // Reset app settings to defaults
    resetSettingsToDefault();
    clearNotifications();
    clearGlobalErrors();
    
    // Note: AuthStore cleanup is handled by the auth service itself
  } catch (error) {
    console.error('Failed to reset stores:', error);
  }
};

/**
 * Utility to check if all stores are properly initialized
 * Useful for app initialization checks
 * 
 * Uses lazy imports to avoid circular dependencies
 */
export const areStoresInitialized = async (): Promise<boolean> => {
  try {
    // Use dynamic imports to avoid circular dependencies
    const [authStoreModule, appStoreModule] = await Promise.all([
      import('./authStore'),
      import('./appStore')
    ]);

    const { isInitialized: authInitialized } = authStoreModule.useAuthStore.getState();
    const { isOnline } = appStoreModule.useAppStore.getState();
    
    return authInitialized && typeof isOnline === 'boolean';
  } catch (error) {
    console.error('Failed to check store initialization:', error);
    return false;
  }
};

/**
 * Get store health status for debugging
 * 
 * Uses lazy imports to avoid circular dependencies
 */
export const getStoreHealthStatus = async () => {
  try {
    // Use dynamic imports to avoid circular dependencies
    const [authStoreModule, meetingStoreModule, appStoreModule] = await Promise.all([
      import('./authStore'),
      import('./meetingStore'),
      import('./appStore')
    ]);

    const authStore = authStoreModule.useAuthStore.getState();
    const meetingStore = meetingStoreModule.useMeetingStore.getState();
    const appStore = appStoreModule.useAppStore.getState();
    
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
  } catch (error) {
    console.error('Failed to get store health status:', error);
    return null;
  }
};

/**
 * Subscribe to store changes for debugging or analytics
 * 
 * Uses lazy imports to avoid circular dependencies
 */
export const subscribeToStoreChanges = async (
  callback: (storeName: string, state: any, previousState: any) => void
) => {
  try {
    // Use dynamic imports to avoid circular dependencies
    const [authStoreModule, meetingStoreModule, appStoreModule] = await Promise.all([
      import('./authStore'),
      import('./meetingStore'),
      import('./appStore')
    ]);

    const unsubscribeAuth = authStoreModule.useAuthStore.subscribe(
      (state: any, previousState: any) => callback('auth', state, previousState)
    );
    
    const unsubscribeMeeting = meetingStoreModule.useMeetingStore.subscribe(
      (state: any, previousState: any) => callback('meeting', state, previousState)
    );
    
    const unsubscribeApp = appStoreModule.useAppStore.subscribe(
      (state: any, previousState: any) => callback('app', state, previousState)
    );
    
    return () => {
      unsubscribeAuth();
      unsubscribeMeeting();
      unsubscribeApp();
    };
  } catch (error) {
    console.error('Failed to subscribe to store changes:', error);
    return () => {}; // Return no-op unsubscribe function
  }
};