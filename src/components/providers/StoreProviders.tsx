'use client';

import React, { useEffect, useState } from 'react';
import { initializeStoreEventListeners } from '@/stores/eventListeners';

interface StoreProvidersProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes store event listeners and provides
 * store context to the application
 */
export const StoreProviders: React.FC<StoreProvidersProps> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    try {
      // Initialize store event listeners for cross-store communication
      cleanup = initializeStoreEventListeners();
      
      if (!cleanup || typeof cleanup !== 'function') {
        throw new Error('Store event listeners failed to initialize properly');
      }
      
      console.log('[StoreProviders] Store event listeners initialized successfully');
    } catch (error) {
      const errorMessage = `Store initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[StoreProviders]', errorMessage);
      setError(errorMessage);
    }
    
    // Cleanup event listeners on unmount
    return () => {
      try {
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
          console.log('[StoreProviders] Store event listeners cleaned up');
        }
      } catch (cleanupError) {
        console.error('[StoreProviders] Cleanup error:', cleanupError);
      }
    };
  }, []);

  // Show error fallback if store initialization failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
            Store Initialization Error
          </h2>
          <p className="text-red-700 dark:text-red-300 text-sm mb-4">
            The application store failed to initialize properly. Please refresh the page.
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            Error: {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};