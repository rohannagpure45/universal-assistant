'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { authService } from '@/services/firebase/AuthService';

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

  return <>{children}</>;
};