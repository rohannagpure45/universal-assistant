'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

/**
 * Hook that handles client-side effects after hydration
 * Prevents hydration mismatches by only running after mount
 */
export const useClientEffects = () => {
  const { setOnlineStatus, loadAudioDevices } = useAppStore();

  useEffect(() => {
    // Set initial online status after hydration
    const updateOnlineStatus = () => {
      setOnlineStatus(navigator.onLine);
    };

    // Set initial status
    updateOnlineStatus();

    // Listen for online/offline changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [setOnlineStatus]);

  useEffect(() => {
    // Load audio devices after hydration
    // Only if we haven't loaded them yet
    const { availableDevices } = useAppStore.getState();
    if (availableDevices.length === 0) {
      loadAudioDevices().catch(console.error);
    }
  }, [loadAudioDevices]);
};

/**
 * Hook to safely initialize client-side features
 * Should be called in main layout components
 */
export const useHydrationSafeInit = () => {
  useClientEffects();
  
  useEffect(() => {
    // Add any other client-side initialization here
    console.log('Client-side initialization complete');
  }, []);
};