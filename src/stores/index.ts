// ============ STORE EXPORTS ============
export * from './authStore';
export * from './meetingStore';
export * from './appStore';

// Export cost store with specific naming to avoid conflicts
export { 
  useCostStore,
  validateAPICall,
  validateBudget,
  validatePeriod,
  VALIDATION_ERRORS,
  selectBudgetUtilization,
  selectPerformanceMetrics,
  selectCostAlerts,
  PerformanceCache,
  VirtualScrollHelper,
  RequestDeduplicator,
  BatchProcessor
} from './costStore';

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
export type { CostStore } from './costStore';

// ============ STORE INTEGRATION UTILITIES ============

/**
 * Utility to reset all stores to their initial state
 * Useful for testing, logout, or clean slate scenarios
 */
export const resetAllStores = () => {
  const { resetMeetingState } = require('./meetingStore').useMeetingStore.getState();
  const { resetSettingsToDefault, clearNotifications, clearGlobalErrors } = require('./appStore').useAppStore.getState();
  const { clearData, resetConfig } = require('./costStore').useCostStore.getState();
  
  // Reset meeting state
  resetMeetingState();
  
  // Reset app settings to defaults
  resetSettingsToDefault();
  clearNotifications();
  clearGlobalErrors();
  
  // Reset cost tracking
  clearData();
  resetConfig();
  
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
  const costStore = require('./costStore').useCostStore.getState();
  
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
    cost: {
      tracking: costStore.isTracking,
      apiCallCount: costStore.apiCalls.length,
      budgetCount: costStore.budgets.length,
      hasAnalytics: Boolean(costStore.currentAnalytics),
      hasError: Boolean(costStore.error),
      lastUpdated: costStore.lastUpdated,
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
  const { useCostStore } = require('./costStore');
  
  const unsubscribeAuth = useAuthStore.subscribe(
    (state: any, previousState: any) => callback('auth', state, previousState)
  );
  
  const unsubscribeMeeting = useMeetingStore.subscribe(
    (state: any, previousState: any) => callback('meeting', state, previousState)
  );
  
  const unsubscribeApp = useAppStore.subscribe(
    (state: any, previousState: any) => callback('app', state, previousState)
  );
  
  const unsubscribeCost = useCostStore.subscribe(
    (state: any, previousState: any) => callback('cost', state, previousState)
  );
  
  return () => {
    unsubscribeAuth();
    unsubscribeMeeting();
    unsubscribeApp();
    unsubscribeCost();
  };
};