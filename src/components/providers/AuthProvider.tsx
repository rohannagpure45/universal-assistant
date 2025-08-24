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
  const { initializeAuth, isInitialized: authStoreInitialized, isLoading } = useAuthStore();
  const { addNotification } = useAppStore();
  const [localInitialized, setLocalInitialized] = useState(false);
  const [forceInitialized, setForceInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuthentication = async () => {
      try {
        console.log('Starting auth initialization...');
        
        // Initialize the auth store - this sets up the auth listener
        await initializeAuth();
        console.log('Auth store initialized');
        
        // Set local initialized flag once auth store is set up
        if (isMounted) {
          setLocalInitialized(true);
        }

        // Set a timeout to force initialization if auth state doesn't settle
        timeoutId = setTimeout(() => {
          if (isMounted && !authStoreInitialized) {
            console.warn('Auth initialization timeout - forcing initialization');
            setForceInitialized(true);
          }
        }, 3000);

      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setForceInitialized(true);
        }
      }
    };

    // Only initialize once
    if (!localInitialized && !forceInitialized) {
      initializeAuthentication();
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initializeAuth, authStoreInitialized, localInitialized, forceInitialized]);

  // Show loading spinner during auth initialization
  // Only show loading if neither the auth store nor local state is initialized
  if (!authStoreInitialized && !forceInitialized && localInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
          {forceInitialized && (
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-2">
              Timeout reached - proceeding with limited functionality
            </p>
          )}
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