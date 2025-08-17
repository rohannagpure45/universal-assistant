'use client';

import React, { useEffect } from 'react';
import { initializeStoreEventListeners } from '@/stores/eventListeners';

interface StoreProvidersProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes store event listeners and provides
 * store context to the application
 */
export const StoreProviders: React.FC<StoreProvidersProps> = ({ children }) => {
  useEffect(() => {
    // Initialize store event listeners for cross-store communication
    const cleanup = initializeStoreEventListeners();
    
    // Cleanup event listeners on unmount
    return cleanup;
  }, []);

  return <>{children}</>;
};