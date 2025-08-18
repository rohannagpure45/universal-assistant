import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, UserPreferences } from '@/types';
import { authService, SignUpData, SignInData, LocalAuthError } from '@/services/firebase/AuthService';

// Store the auth unsubscribe function outside the store
let authUnsubscribe: (() => void) | null = null;

export interface AuthState {
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
}

export interface AuthActions {
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

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      isSigningIn: false,
      isSigningUp: false,
      isSigningOut: false,
      isUpdatingProfile: false,
      isResettingPassword: false,
      isUpdatingPassword: false,

      // Authentication actions
      signUp: async (data: SignUpData) => {
        set((state) => {
          state.isSigningUp = true;
          state.error = null;
        });

        try {
          const result = await authService.signUp(data);
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isSigningUp = false;
            });
            return false;
          }

          set((state) => {
            state.user = result.user;
            state.isSigningUp = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isSigningUp = false;
          });
          return false;
        }
      },

      signIn: async (data: SignInData) => {
        set((state) => {
          state.isSigningIn = true;
          state.error = null;
        });

        try {
          const result = await authService.signIn(data);
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isSigningIn = false;
            });
            return false;
          }

          set((state) => {
            state.user = result.user;
            state.isSigningIn = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isSigningIn = false;
          });
          return false;
        }
      },

      signInWithGoogle: async () => {
        set((state) => {
          state.isSigningIn = true;
          state.error = null;
        });

        try {
          const result = await authService.signInWithGoogle();
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isSigningIn = false;
            });
            return false;
          }

          set((state) => {
            state.user = result.user;
            state.isSigningIn = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isSigningIn = false;
          });
          return false;
        }
      },

      signOut: async () => {
        set((state) => {
          state.isSigningOut = true;
          state.error = null;
        });

        try {
          const result = await authService.signOut();
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isSigningOut = false;
            });
            return false;
          }

          set((state) => {
            state.user = null;
            state.isSigningOut = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isSigningOut = false;
          });
          return false;
        }
      },

      resetPassword: async (email: string) => {
        set((state) => {
          state.isResettingPassword = true;
          state.error = null;
        });

        try {
          const result = await authService.resetPassword(email);
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isResettingPassword = false;
            });
            return false;
          }

          set((state) => {
            state.isResettingPassword = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isResettingPassword = false;
          });
          return false;
        }
      },

      updatePassword: async (currentPassword: string, newPassword: string) => {
        set((state) => {
          state.isUpdatingPassword = true;
          state.error = null;
        });

        try {
          const result = await authService.updateUserPassword(currentPassword, newPassword);
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isUpdatingPassword = false;
            });
            return false;
          }

          set((state) => {
            state.isUpdatingPassword = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isUpdatingPassword = false;
          });
          return false;
        }
      },

      updateProfile: async (data) => {
        set((state) => {
          state.isUpdatingProfile = true;
          state.error = null;
        });

        try {
          const result = await authService.updateUserProfile(data);
          
          if (result.error) {
            set((state) => {
              state.error = result.error || null;
              state.isUpdatingProfile = false;
            });
            return false;
          }

          set((state) => {
            state.user = result.user;
            state.isUpdatingProfile = false;
            state.error = null;
          });
          
          return true;
        } catch (error) {
          set((state) => {
            state.error = {
              code: 'auth/unknown',
              message: 'An unexpected error occurred',
              name: 'LocalAuthError',
            };
            state.isUpdatingProfile = false;
          });
          return false;
        }
      },

      // State management
      setUser: (user: User | null) => {
        set((state) => {
          state.user = user;
        });
      },

      setError: (error: LocalAuthError | null) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      setInitialized: (initialized: boolean) => {
        set((state) => {
          state.isInitialized = initialized;
        });
      },

      // Utility actions
      refreshUser: async () => {
        try {
          const user = await authService.getCurrentUser();
          set((state) => {
            state.user = user;
          });
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      initialize: () => {
        // Set up auth state listener
        const unsubscribe = authService.onAuthStateChanged((user) => {
          set((state) => {
            state.user = user;
            state.isInitialized = true;
            state.isLoading = false;
          });
        });

        // Store unsubscribe function for cleanup if needed
        // We'll store it in a closure variable outside the store
        authUnsubscribe = unsubscribe;
      },

      initializeAuth: async () => {
        try {
          set((state) => {
            state.isLoading = true;
          });
          
          // Initialize auth service - this will trigger the auth state listener
          get().initialize();
          
        } catch (error) {
          console.error('Auth initialization failed:', error);
          set((state) => {
            state.error = {
              code: 'auth/initialization-failed',
              message: 'Failed to initialize authentication',
              name: 'LocalAuthError',
            };
            state.isLoading = false;
            state.isInitialized = true;
          });
        }
      },
    }))
  )
);

// Derived selectors for convenience
export const useAuth = () => {
  const store = useAuthStore();
  return {
    // User state
    user: store.user,
    isAuthenticated: Boolean(store.user),
    isLoading: store.isLoading,
    isInitialized: store.isInitialized,
    error: store.error,
    
    // Loading states
    isSigningIn: store.isSigningIn,
    isSigningUp: store.isSigningUp,
    isSigningOut: store.isSigningOut,
    isUpdatingProfile: store.isUpdatingProfile,
    isResettingPassword: store.isResettingPassword,
    isUpdatingPassword: store.isUpdatingPassword,
    
    // Actions
    signUp: store.signUp,
    signIn: store.signIn,
    signInWithGoogle: store.signInWithGoogle,
    signOut: store.signOut,
    resetPassword: store.resetPassword,
    updatePassword: store.updatePassword,
    updateProfile: store.updateProfile,
    clearError: store.clearError,
    refreshUser: store.refreshUser,
    initialize: store.initialize,
    initializeAuth: store.initializeAuth,
  };
};

// Selector hooks for specific state
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useAuthLoading = () => useAuthStore((state) => ({
  isSigningIn: state.isSigningIn,
  isSigningUp: state.isSigningUp,
  isSigningOut: state.isSigningOut,
  isUpdatingProfile: state.isUpdatingProfile,
  isResettingPassword: state.isResettingPassword,
  isUpdatingPassword: state.isUpdatingPassword,
}));

// Note: Auth store should be initialized in AuthProvider component
// to avoid issues during SSR