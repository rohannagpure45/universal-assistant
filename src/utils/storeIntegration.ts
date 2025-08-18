/**
 * Store Integration Utilities
 * 
 * Common patterns and utilities for integrating between stores and services
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/appStore';
import { useMeetingStore } from '@/stores/meetingStore';
import type { UserPreferences, AIModel, MeetingType } from '@/types';

// ============ PREFERENCE SYNC UTILITIES ============

/**
 * Sync user preferences from AuthStore to AppStore
 */
export const usePreferenceSync = () => {
  const { user, updateProfile } = useAuth();
  const appStore = useAppStore();

  const syncFromAuthToApp = useCallback(() => {
    if (!user?.preferences) return;

    const { preferences } = user;

    // Sync AI settings
    if (preferences.ai) {
      appStore.updateAISettings({
        defaultModel: preferences.ai.defaultModel,
        temperature: preferences.ai.temperature,
        maxTokens: preferences.ai.maxTokens,
      });
    }

    // Sync TTS settings
    if (preferences.tts) {
      appStore.updateTTSSettings({
        voiceId: preferences.tts.voice,
        speed: preferences.tts.speed,
        volume: preferences.tts.volume,
        enabled: true, // Default to enabled
      });
    }

    // Sync UI settings
    if (preferences.ui) {
      appStore.updateUISettings({
        theme: preferences.ui.theme,
        language: preferences.ui.language,
        compact: preferences.ui.compactMode,
      });
    }
  }, [user?.preferences, appStore]);

  const syncFromAppToAuth = useCallback(async () => {
    if (!user) return false;

    const preferences: Partial<UserPreferences> = {
      ai: {
        defaultModel: appStore.aiSettings.defaultModel,
        temperature: appStore.aiSettings.temperature,
        maxTokens: appStore.aiSettings.maxTokens,
        enableFallback: true, // Map from fallbackModel existence
      },
      tts: {
        voice: appStore.ttsSettings.voiceId,
        speed: appStore.ttsSettings.speed,
        pitch: appStore.ttsSettings.pitch || 1.0,
        volume: appStore.ttsSettings.volume,
      },
      ui: {
        theme: appStore.uiSettings.theme,
        language: appStore.uiSettings.language,
        fontSize: parseInt(appStore.uiSettings.fontSize || '14'),
        compactMode: appStore.uiSettings.compact,
      },
    };

    return await updateProfile({ preferences });
  }, [
    user,
    updateProfile,
    appStore.aiSettings,
    appStore.ttsSettings,
    appStore.uiSettings,
  ]);

  return {
    syncFromAuthToApp,
    syncFromAppToAuth,
  };
};

// ============ MEETING STATE UTILITIES ============

/**
 * Utility for managing meeting state across stores
 */
export const useMeetingIntegration = () => {
  const { user } = useAuth();
  const meetingStore = useMeetingStore();
  const appStore = useAppStore();

  const startNewMeeting = useCallback(async (
    meetingType: MeetingType,
    title: string,
    description?: string
  ) => {
    if (!user) {
      appStore.addNotification({
        type: 'error',
        title: 'Authentication Required',
        message: 'Please sign in to start a meeting',
        persistent: false,
      });
      return null;
    }

    try {
      const meetingId = await meetingStore.startMeeting({
        id: '',
        title,
        description: description || '',
        hostId: user.uid,
        createdBy: user.uid,
        type: meetingType,
        participants: [{
          id: user.uid,
          userId: user.uid,
          userName: user.displayName || 'Host',
          displayName: user.displayName || 'Host',
          email: user.email || '',
          voiceProfileId: 'default',
          role: 'host' as const,
          joinTime: new Date(),
          joinedAt: new Date(),
          speakingTime: 0,
          isActive: true,
        }],
        notes: [],
        keywords: [],
        appliedRules: [],
        endTime: undefined,
        startedAt: undefined,
        endedAt: undefined,
        scheduledFor: undefined,
        status: 'active',
        duration: undefined,
        recording: undefined,
        settings: {
          allowRecording: true,
          autoTranscribe: true,
          maxParticipants: 10,
          isPublic: false,
          language: 'en',
        },
        metadata: undefined,
        summary: undefined,
        actionItems: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (meetingId) {
        appStore.addNotification({
          type: 'success',
          title: 'Meeting Started',
          message: `Meeting "${title}" has been started successfully`,
          persistent: false,
        });
      }

      return meetingId;
    } catch (error) {
      appStore.addNotification({
        type: 'error',
        title: 'Failed to Start Meeting',
        message: 'There was an error starting your meeting',
        persistent: false,
      });
      return null;
    }
  }, [user, meetingStore, appStore]);

  const endCurrentMeeting = useCallback(async () => {
    try {
      const success = await meetingStore.endMeeting();
      
      if (success) {
        appStore.addNotification({
          type: 'success',
          title: 'Meeting Ended',
          message: 'Meeting has been ended successfully',
          persistent: false,
        });
        
        // Clear any meeting-related notifications
        appStore.clearNotifications();
      }

      return success;
    } catch (error) {
      appStore.addNotification({
        type: 'error',
        title: 'Failed to End Meeting',
        message: 'There was an error ending the meeting',
        persistent: false,
      });
      return false;
    }
  }, [meetingStore, appStore]);

  return {
    startNewMeeting,
    endCurrentMeeting,
  };
};

// ============ ERROR HANDLING UTILITIES ============

/**
 * Centralized error handling across stores
 */
export const useStoreErrorHandler = () => {
  const appStore = useAppStore();

  const handleError = useCallback((
    error: Error,
    operation: string,
    showNotification: boolean = true
  ) => {
    console.error(`Error in ${operation}:`, error);
    
    // Add to global error store
    appStore.addGlobalError({
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      operation,
      timestamp: new Date(),
      cause: error,
    });

    // Show user notification if requested
    if (showNotification) {
      appStore.addNotification({
        type: 'error',
        title: 'Application Error',
        message: `${operation}: ${error.message}`,
        persistent: false,
      });
    }
  }, [appStore]);

  const handleAsyncError = useCallback((
    errorPromise: Promise<any>,
    operation: string,
    showNotification: boolean = true
  ) => {
    errorPromise.catch((error) => {
      handleError(error, operation, showNotification);
    });
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
};

// ============ STATE PERSISTENCE UTILITIES ============

/**
 * Utility for managing state persistence across page reloads
 */
export const useStatePersistence = () => {
  const meetingStore = useMeetingStore();
  const appStore = useAppStore();

  const saveAppState = useCallback(() => {
    try {
      const stateSnapshot = {
        currentMeeting: meetingStore.currentMeeting,
        isInMeeting: meetingStore.isInMeeting,
        settings: {
          ai: appStore.aiSettings,
          tts: appStore.ttsSettings,
          ui: appStore.uiSettings,
        },
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem('app_state_snapshot', JSON.stringify(stateSnapshot));
      return true;
    } catch (error) {
      console.error('Failed to save app state:', error);
      return false;
    }
  }, [meetingStore, appStore]);

  const restoreAppState = useCallback(() => {
    try {
      const saved = localStorage.getItem('app_state_snapshot');
      if (!saved) return false;

      const stateSnapshot = JSON.parse(saved);
      const savedTime = new Date(stateSnapshot.timestamp);
      const now = new Date();
      
      // Don't restore if snapshot is older than 1 hour
      if (now.getTime() - savedTime.getTime() > 60 * 60 * 1000) {
        localStorage.removeItem('app_state_snapshot');
        return false;
      }

      // Restore settings
      if (stateSnapshot.settings) {
        if (stateSnapshot.settings.ai) {
          appStore.updateAISettings(stateSnapshot.settings.ai);
        }
        if (stateSnapshot.settings.tts) {
          appStore.updateTTSSettings(stateSnapshot.settings.tts);
        }
        if (stateSnapshot.settings.ui) {
          appStore.updateUISettings(stateSnapshot.settings.ui);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to restore app state:', error);
      localStorage.removeItem('app_state_snapshot');
      return false;
    }
  }, [appStore]);

  const clearAppState = useCallback(() => {
    localStorage.removeItem('app_state_snapshot');
  }, []);

  return {
    saveAppState,
    restoreAppState,
    clearAppState,
  };
};

// ============ PERFORMANCE MONITORING UTILITIES ============

/**
 * Utility for monitoring store performance and state changes
 */
export const useStorePerformanceMonitor = () => {
  const appStore = useAppStore();

  const measureStoreOperation = useCallback(<T>(
    operationName: string,
    operation: () => T | Promise<T>
  ): T | Promise<T> => {
    const startTime = performance.now();
    
    const finish = (result: T) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Update performance metrics
      appStore.updatePerformanceMetrics({
        networkLatency: duration,
      });
      
      console.log(`Store operation "${operationName}" took ${duration.toFixed(2)}ms`);
      return result;
    };

    try {
      const result = operation();
      
      // Handle async operations
      if (result instanceof Promise) {
        return result.then(finish).catch((error) => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.error(`Store operation "${operationName}" failed after ${duration.toFixed(2)}ms:`, error);
          throw error;
        }) as T;
      }
      
      // Handle sync operations
      return finish(result);
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`Store operation "${operationName}" failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }, [appStore]);

  return {
    measureStoreOperation,
  };
};

// ============ CLEANUP UTILITIES ============

/**
 * Utility for cleaning up store state and listeners
 */
export const useStoreCleanup = () => {
  const meetingStore = useMeetingStore();
  const appStore = useAppStore();

  const cleanupMeetingState = useCallback(() => {
    meetingStore.cleanupRealtimeListeners();
    meetingStore.resetMeetingState();
  }, [meetingStore]);

  const cleanupAppState = useCallback(() => {
    appStore.clearNotifications();
    appStore.clearGlobalErrors();
  }, [appStore]);

  const cleanupAllStores = useCallback(() => {
    cleanupMeetingState();
    cleanupAppState();
  }, [cleanupMeetingState, cleanupAppState]);

  return {
    cleanupMeetingState,
    cleanupAppState,
    cleanupAllStores,
  };
};

// Export all utilities as a combined hook
export const useStoreIntegration = () => {
  const preferenceSync = usePreferenceSync();
  const meetingIntegration = useMeetingIntegration();
  const errorHandler = useStoreErrorHandler();
  const statePersistence = useStatePersistence();
  const performanceMonitor = useStorePerformanceMonitor();
  const cleanup = useStoreCleanup();

  return {
    ...preferenceSync,
    ...meetingIntegration,
    ...errorHandler,
    ...statePersistence,
    ...performanceMonitor,
    ...cleanup,
  };
};