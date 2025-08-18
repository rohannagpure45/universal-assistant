/**
 * Store Event Listeners
 * 
 * This module sets up event listeners for stores to respond to events
 * from other stores without direct coupling. This replaces the direct
 * store manipulation in useAuth.ts
 */

import { storeEventBus } from '@/lib/events/StoreEventBus';
import { useAppStore } from './appStore';
import { useMeetingStore } from './meetingStore';

/**
 * App Store event listeners
 */
export const setupAppStoreListeners = () => {
  const appStore = useAppStore.getState();

  // Listen for user sign-in to sync preferences
  const unsubscribeUserSignIn = storeEventBus.subscribe('auth:user-signed-in', (event) => {
    const { user } = event.payload;
    
    if (user.preferences) {
      const { preferences } = user;
      
      // Sync AI settings
      if (preferences.ai) {
        appStore.updateAISettings({
          defaultModel: preferences.ai.defaultModel,
          temperature: preferences.ai.temperature,
          maxTokens: preferences.ai.maxTokens,
          enableAutoResponse: preferences.ai.enableAutoResponse,
        });
      }
      
      // Sync TTS settings
      if (preferences.tts) {
        appStore.updateTTSSettings({
          voiceId: preferences.tts.voiceId,
          speed: preferences.tts.speed,
          volume: preferences.tts.volume,
          enabled: preferences.tts.enabled,
        });
      }
      
      // Sync UI settings
      if (preferences.ui) {
        appStore.updateUISettings({
          theme: preferences.ui.theme,
          language: preferences.ui.language,
          compact: preferences.ui.compact,
        });
      }
    }
  });

  // Listen for user sign-out to clear notifications
  const unsubscribeUserSignOut = storeEventBus.subscribe('auth:user-signed-out', () => {
    appStore.clearNotifications();
  });

  // Listen for preference updates
  const unsubscribePreferencesUpdate = storeEventBus.subscribe('auth:preferences-updated', (event) => {
    const { preferences } = event.payload;
    
    if (preferences.ai) {
      appStore.updateAISettings({
        defaultModel: preferences.ai.defaultModel,
        temperature: preferences.ai.temperature,
        maxTokens: preferences.ai.maxTokens,
        enableAutoResponse: preferences.ai.enableAutoResponse,
      });
    }
    
    if (preferences.tts) {
      appStore.updateTTSSettings({
        voiceId: preferences.tts.voiceId,
        speed: preferences.tts.speed,
        volume: preferences.tts.volume,
        enabled: preferences.tts.enabled,
      });
    }
    
    if (preferences.ui) {
      appStore.updateUISettings({
        theme: preferences.ui.theme,
        language: preferences.ui.language,
        compact: preferences.ui.compact,
      });
    }
  });

  return () => {
    unsubscribeUserSignIn();
    unsubscribeUserSignOut();
    unsubscribePreferencesUpdate();
  };
};

/**
 * Meeting Store event listeners
 */
export const setupMeetingStoreListeners = () => {
  const meetingStore = useMeetingStore.getState();

  // Listen for user sign-in to load recent meetings
  const unsubscribeUserSignIn = storeEventBus.subscribe('auth:user-signed-in', (event) => {
    const { user } = event.payload;
    if (user.uid) {
      meetingStore.loadRecentMeetings(user.uid, 10);
    }
  });

  // Listen for user sign-out to clean up meeting state
  const unsubscribeUserSignOut = storeEventBus.subscribe('auth:user-signed-out', async () => {
    // Clean up any active meeting
    if (meetingStore.isInMeeting) {
      await meetingStore.leaveMeeting();
    }
    
    // Clean up real-time listeners
    meetingStore.cleanupRealtimeListeners();
    
    // Reset meeting state
    meetingStore.resetMeetingState();
  });

  return () => {
    unsubscribeUserSignIn();
    unsubscribeUserSignOut();
  };
};

/**
 * Initialize all store event listeners
 * Call this once during app initialization
 */
export const initializeStoreEventListeners = () => {
  const appUnsubscribe = setupAppStoreListeners();
  const meetingUnsubscribe = setupMeetingStoreListeners();

  // Return cleanup function
  return () => {
    appUnsubscribe();
    meetingUnsubscribe();
  };
};

// Note: Listeners should be initialized in StoreProviders component
// to avoid circular dependencies during SSR