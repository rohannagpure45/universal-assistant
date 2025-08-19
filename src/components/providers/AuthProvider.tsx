'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { authService } from '@/services/firebase/AuthService';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that handles authentication state initialization
 * and manages auth-related side effects
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { initializeAuth } = useAuthStore();
  const { addNotification } = useAppStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuthentication = async () => {
      try {
        // Loading will be managed by auth store
        
        // Initialize auth service and listen for auth state changes
        const unsubscribe = authService.onAuthStateChanged((user) => {
          if (!isMounted) return;
          
          if (user) {
            // User state is now handled by the auth store directly
            
            // Notifications will be handled elsewhere
          } else {
            // setUser removed(null);
          }
          
          // Loading state handled by auth store
          if (!isInitialized) {
            setIsInitialized(true);
          }
        });

        // Initialize the auth store
        await initializeAuth();

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          // Error handling is now done by the auth store
          // Loading state handled by auth store
          setIsInitialized(true);
        }
      }
    };

    const cleanup = initializeAuthentication();

    return () => {
      isMounted = false;
      cleanup.then(unsubscribe => unsubscribe?.()).catch(console.error);
    };
  }, [initializeAuth, addNotification, isInitialized]);

  // Show loading spinner during auth initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallbackType="full-page"
      severity="critical"
      componentName="AuthProvider"
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The authentication system encountered a critical error. Please refresh the page or contact support if the issue persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};