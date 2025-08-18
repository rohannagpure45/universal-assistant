import { useEffect, useRef } from 'react';
import { useAuth as useAuthFromStore, useAuthStore as useStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useMeetingStore } from '@/stores/meetingStore';

/**
 * Enhanced authentication hook with cross-store integration
 * 
 * This hook provides a unified interface to the auth system with
 * automatic synchronization between AuthStore, AppStore, and MeetingStore.
 */
export const useAuth = () => {
  const auth = useAuthFromStore();
  const appStore = useAppStore();
  const meetingStore = useMeetingStore();
  const isInitializedRef = useRef(false);

  // Initialize auth on first render
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Only initialize if not already initialized
      if (!auth.isInitialized) {
        auth.initialize();
      }
    }
  }, [auth.initialize, auth.isInitialized]);

  // Auto-clear errors after a timeout
  useEffect(() => {
    if (auth.error) {
      const timer = setTimeout(() => {
        auth.clearError();
      }, 5000); // Clear error after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [auth.error, auth.clearError]);

  // Sync user preferences between AuthStore and AppStore
  useEffect(() => {
    if (auth.user?.preferences) {
      const { preferences } = auth.user;
      
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
        });
      }
      
      // Sync UI settings
      if (preferences.ui) {
        appStore.updateUISettings({
          theme: preferences.ui.theme,
          language: preferences.ui.language,
          fontSize: preferences.ui.fontSize > 16 ? 'large' : preferences.ui.fontSize < 14 ? 'small' : 'medium',
        });
      }
    }
  }, [auth.user?.preferences, appStore.updateAISettings, appStore.updateTTSSettings, appStore.updateUISettings]);

  // Clean up meeting state when user signs out
  useEffect(() => {
    if (!auth.isAuthenticated && meetingStore.isInMeeting) {
      meetingStore.resetMeetingState();
    }
  }, [auth.isAuthenticated, meetingStore.isInMeeting, meetingStore.resetMeetingState]);

  // Load recent meetings when user signs in
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      meetingStore.loadRecentMeetings(auth.user.uid, 10);
    }
  }, [auth.isAuthenticated, auth.user?.uid, meetingStore.loadRecentMeetings]);

  // Enhanced sign out with cross-store cleanup
  const enhancedSignOut = async () => {
    try {
      // Clean up meeting state first
      if (meetingStore.isInMeeting) {
        await meetingStore.leaveMeeting();
      }
      
      // Clean up any real-time listeners
      meetingStore.cleanupRealtimeListeners();
      
      // Sign out from auth
      const success = await auth.signOut();
      
      if (success) {
        // Clear app notifications related to the user
        appStore.clearNotifications();
        
        // Reset meeting store state
        meetingStore.resetMeetingState();
      }
      
      return success;
    } catch (error) {
      console.error('Enhanced sign out failed:', error);
      return false;
    }
  };

  // Enhanced profile update with preference sync
  const enhancedUpdateProfile = async (data: Parameters<typeof auth.updateProfile>[0]) => {
    const success = await auth.updateProfile(data);
    
    if (success && data.preferences) {
      // Sync preferences to app store immediately
      const { preferences } = data;
      
      if (preferences.ai) {
        appStore.updateAISettings({
          defaultModel: preferences.ai.defaultModel,
          temperature: preferences.ai.temperature,
          maxTokens: preferences.ai.maxTokens,
        });
      }
      
      if (preferences.tts) {
        appStore.updateTTSSettings({
          voiceId: preferences.tts.voice,
          speed: preferences.tts.speed,
          volume: preferences.tts.volume,
        });
      }
      
      if (preferences.ui) {
        appStore.updateUISettings({
          theme: preferences.ui.theme,
          language: preferences.ui.language,
          fontSize: preferences.ui.fontSize > 16 ? 'large' : preferences.ui.fontSize < 14 ? 'small' : 'medium',
        });
      }
    }
    
    return success;
  };

  return {
    // Core auth state
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isInitialized: auth.isInitialized,
    error: auth.error,

    // Loading states for UI feedback
    isSigningIn: auth.isSigningIn,
    isSigningUp: auth.isSigningUp,
    isSigningOut: auth.isSigningOut,
    isUpdatingProfile: auth.isUpdatingProfile,
    isResettingPassword: auth.isResettingPassword,
    isUpdatingPassword: auth.isUpdatingPassword,

    // Check if any auth operation is in progress
    isAnyLoading: auth.isSigningIn || 
                  auth.isSigningUp || 
                  auth.isSigningOut || 
                  auth.isUpdatingProfile || 
                  auth.isResettingPassword || 
                  auth.isUpdatingPassword ||
                  auth.isLoading,

    // Authentication actions (enhanced)
    signUp: auth.signUp,
    signIn: auth.signIn,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: enhancedSignOut,
    resetPassword: auth.resetPassword,
    updatePassword: auth.updatePassword,
    updateProfile: enhancedUpdateProfile,

    // Utility actions
    clearError: auth.clearError,
    refreshUser: auth.refreshUser,
    
    // Cross-store integration utilities
    syncPreferencesToAppStore: () => {
      if (auth.user?.preferences) {
        const { preferences } = auth.user;
        
        if (preferences.ai) {
          appStore.updateAISettings({
            defaultModel: preferences.ai.defaultModel,
            temperature: preferences.ai.temperature,
            maxTokens: preferences.ai.maxTokens,
            });
        }
        
        if (preferences.tts) {
          appStore.updateTTSSettings({
            voiceId: preferences.tts.voice,
            speed: preferences.tts.speed,
            volume: preferences.tts.volume,
            });
        }
        
        if (preferences.ui) {
          appStore.updateUISettings({
            theme: preferences.ui.theme,
            language: preferences.ui.language,
            fontSize: preferences.ui.fontSize > 16 ? 'large' : preferences.ui.fontSize < 14 ? 'small' : 'medium',
          });
        }
      }
    },
  };
};

/**
 * Hook that only returns user data
 */
export const useAuthUser = () => {
  return useStore((state) => state.user);
};

/**
 * Hook that returns authentication status
 */
export const useAuthStatus = () => {
  return useStore((state) => ({
    isAuthenticated: Boolean(state.user),
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
  }));
};

/**
 * Hook that returns current error state
 */
export const useAuthError = () => {
  return useStore((state) => state.error);
};

/**
 * Hook that returns all loading states
 */
export const useAuthLoading = () => {
  return useStore((state) => ({
    isSigningIn: state.isSigningIn,
    isSigningUp: state.isSigningUp,
    isSigningOut: state.isSigningOut,
    isUpdatingProfile: state.isUpdatingProfile,
    isResettingPassword: state.isResettingPassword,
    isUpdatingPassword: state.isUpdatingPassword,
    isAnyLoading: state.isSigningIn || 
                  state.isSigningUp || 
                  state.isSigningOut || 
                  state.isUpdatingProfile || 
                  state.isResettingPassword || 
                  state.isUpdatingPassword ||
                  state.isLoading,
  }));
};

/**
 * Hook for user preferences
 */
export const useUserPreferences = () => {
  return useStore((state) => state.user?.preferences || null);
};

/**
 * Hook that provides auth actions only (no state)
 */
export const useAuthActions = () => {
  return useStore((state) => ({
    signUp: state.signUp,
    signIn: state.signIn,
    signInWithGoogle: state.signInWithGoogle,
    signOut: state.signOut,
    resetPassword: state.resetPassword,
    updatePassword: state.updatePassword,
    updateProfile: state.updateProfile,
    clearError: state.clearError,
    refreshUser: state.refreshUser,
  }));
};

/**
 * Type guard to check if user is authenticated
 */
export const isAuthenticated = (user: ReturnType<typeof useAuthUser>) => {
  return user !== null;
};

/**
 * Utility hook for checking specific permissions or roles
 * (Can be extended based on your user model)
 */
export const useAuthPermissions = () => {
  const user = useAuthUser();
  
  return {
    canAccessDashboard: Boolean(user),
    canModifySettings: Boolean(user),
    canCreateMeetings: Boolean(user),
    // Add more permission checks as needed
  };
};

export default useAuth;