'use client';

import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAppStore } from '@/stores/appStore';
import { serviceProvider } from '@/services/ServiceProvider';
import type { StoreRegistryInterface } from '@/interfaces/StoreInterfaces';

/**
 * StoreServiceProvider Component
 * 
 * This component initializes the ServiceProvider with actual store instances
 * to enable dependency injection for services. This breaks circular dependencies
 * by ensuring stores are fully initialized before services try to use them.
 */

interface StoreServiceProviderProps {
  children: React.ReactNode;
}

export const StoreServiceProvider: React.FC<StoreServiceProviderProps> = ({ children }) => {
  const initializationRef = useRef(false);
  
  // CRITICAL FIX: Get store functions once, not on every render
  const authStoreRef = useRef(useAuthStore);
  const meetingStoreRef = useRef(useMeetingStore);
  const appStoreRef = useRef(useAppStore);

  useEffect(() => {
    // Only initialize once
    if (initializationRef.current) {
      return;
    }

    const initializeServiceProvider = async () => {
      try {
        console.log('[StoreServiceProvider] Initializing service provider with stores...');
        
        // Create store registry with actual store instances
        const storeRegistry: StoreRegistryInterface = {
          auth: authStoreRef.current as any,
          meeting: meetingStoreRef.current as any,
          app: appStoreRef.current as any,
        };

        // Initialize the service provider
        await serviceProvider.initialize(storeRegistry);
        
        console.log('[StoreServiceProvider] Service provider initialized successfully');
        initializationRef.current = true;
        
      } catch (error) {
        console.error('[StoreServiceProvider] Failed to initialize service provider:', error);
      }
    };

    initializeServiceProvider();
  }, []); // CRITICAL FIX: Remove store dependencies - they never change, only their internal state does

  // Always render children, even during initialization
  // Services will handle the case where stores aren't ready yet
  return <>{children}</>;
};

/**
 * Hook to check if the service provider is ready
 * Useful for components that need to wait for store initialization
 */
export const useServiceProviderReady = (): boolean => {
  const [isReady, setIsReady] = React.useState(serviceProvider.isInitialized());
  
  useEffect(() => {
    if (serviceProvider.isInitialized()) {
      setIsReady(true);
      return;
    }

    // Poll for initialization
    const checkInterval = setInterval(() => {
      if (serviceProvider.isInitialized()) {
        setIsReady(true);
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  return isReady;
};

/**
 * Hook to safely access stores via service provider
 * Returns null if service provider isn't ready
 */
export const useStoresViaSP = () => {
  const isReady = useServiceProviderReady();
  
  if (!isReady) {
    return {
      authStore: null,
      meetingStore: null,
      appStore: null,
      isReady: false,
    };
  }

  try {
    const stores = serviceProvider.getStores();
    return {
      authStore: stores.auth,
      meetingStore: stores.meeting,
      appStore: stores.app,
      isReady: true,
    };
  } catch (error) {
    console.error('Failed to get stores via service provider:', error);
    return {
      authStore: null,
      meetingStore: null,
      appStore: null,
      isReady: false,
    };
  }
};