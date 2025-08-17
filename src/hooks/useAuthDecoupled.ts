import { useEffect, useRef } from 'react';
import { useAuth as useAuthFromStore, useAuthStore as useStore } from '@/stores/authStore';
import { 
  storeEventBus, 
  emitUserSignedIn, 
  emitUserSignedOut, 
  emitPreferencesUpdated,
  type UserSignedInEvent,
  type PreferencesUpdatedEvent 
} from '@/lib/events/StoreEventBus';

/**
 * Decoupled authentication hook using event-driven architecture
 * 
 * This hook replaces the direct store coupling with event-based communication.
 * Other stores can subscribe to auth events without importing this hook.
 */
export const useAuthDecoupled = () => {
  const auth = useAuthFromStore();
  const isInitializedRef = useRef(false);
  const previousUserRef = useRef(auth.user);

  // Initialize auth on first render
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
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
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [auth.error, auth.clearError]);

  // Emit auth events when user state changes
  useEffect(() => {
    const currentUser = auth.user;
    const previousUser = previousUserRef.current;

    // User signed in
    if (currentUser && !previousUser) {
      emitUserSignedIn({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        preferences: currentUser.preferences,
      });
    }
    
    // User signed out
    if (!currentUser && previousUser) {
      emitUserSignedOut(previousUser.uid, 'manual');
    }
    
    // Preferences updated
    if (currentUser && previousUser && 
        JSON.stringify(currentUser.preferences) !== JSON.stringify(previousUser.preferences)) {
      emitPreferencesUpdated(currentUser.uid, {
        ai: currentUser.preferences?.ai,
        tts: currentUser.preferences?.tts,
        ui: currentUser.preferences?.ui,
      });
    }

    previousUserRef.current = currentUser;
  }, [auth.user]);

  // Enhanced sign out with event emission
  const enhancedSignOut = async () => {
    try {
      const currentUser = auth.user;
      const success = await auth.signOut();
      
      if (success && currentUser) {
        // Event will be emitted by the useEffect above
        console.log('User signed out successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Enhanced sign out failed:', error);
      return false;
    }
  };

  // Enhanced profile update with event emission
  const enhancedUpdateProfile = async (data: Parameters<typeof auth.updateProfile>[0]) => {
    const success = await auth.updateProfile(data);
    
    if (success && data.preferences && auth.user) {
      // Event will be emitted by the useEffect above
      console.log('Profile updated successfully');
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
    
    // Event bus access for advanced use cases
    eventBus: {
      subscribe: storeEventBus.subscribe.bind(storeEventBus),
      emit: storeEventBus.emit.bind(storeEventBus),
    },
  };
};

// Convenience hooks that still export the original interface
export const useAuthUser = () => {
  return useStore((state) => state.user);
};

export const useAuthStatus = () => {
  return useStore((state) => ({
    isAuthenticated: Boolean(state.user),
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
  }));
};

export const useAuthError = () => {
  return useStore((state) => state.error);
};

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

export const useUserPreferences = () => {
  return useStore((state) => state.user?.preferences || null);
};

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

export const isAuthenticated = (user: ReturnType<typeof useAuthUser>) => {
  return user !== null;
};

export const useAuthPermissions = () => {
  const user = useAuthUser();
  
  return {
    canAccessDashboard: Boolean(user),
    canModifySettings: Boolean(user),
    canCreateMeetings: Boolean(user),
  };
};

export default useAuthDecoupled;