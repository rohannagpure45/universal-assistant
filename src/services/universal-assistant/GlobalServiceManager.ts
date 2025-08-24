'use client';

import { UniversalAssistantCoordinator, createUniversalAssistantCoordinator, type UniversalAssistantConfig } from './UniversalAssistantCoordinator';
import { useMeetingStore, useAppStore } from '@/stores';
import type { StoreApi } from 'zustand';

/**
 * Global service manager for Universal Assistant services
 * Ensures single instance coordination across all components
 */
export class GlobalServiceManager {
  private static instance: GlobalServiceManager | null = null;
  private coordinator: UniversalAssistantCoordinator | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<UniversalAssistantCoordinator> | null = null;
  private subscribers = new Set<(coordinator: UniversalAssistantCoordinator | null) => void>();
  private cleanupCallbacks = new Set<() => void>();

  private constructor() {}

  static getInstance(): GlobalServiceManager {
    if (!GlobalServiceManager.instance) {
      GlobalServiceManager.instance = new GlobalServiceManager();
    }
    return GlobalServiceManager.instance;
  }

  /**
   * Get or initialize the Universal Assistant coordinator
   */
  async getCoordinator(config?: UniversalAssistantConfig): Promise<UniversalAssistantCoordinator> {
    // If coordinator already exists, return it
    if (this.coordinator) {
      return this.coordinator;
    }

    // If already initializing, wait for the existing initialization
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start new initialization
    this.isInitializing = true;
    this.initializationPromise = this.initializeCoordinator(config);
    
    try {
      const coordinator = await this.initializationPromise;
      this.coordinator = coordinator;
      this.notifySubscribers(coordinator);
      return coordinator;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  /**
   * Initialize the coordinator with default config
   */
  private async initializeCoordinator(config?: UniversalAssistantConfig): Promise<UniversalAssistantCoordinator> {
    const defaultConfig: UniversalAssistantConfig = {
      model: 'claude-3-5-sonnet',
      maxTokens: 1000,
      voiceId: '21m00Tcm4TlvDq8ikWAM',
      ttsSpeed: 1.0,
      enableConcurrentProcessing: true,
      enableSpeakerIdentification: true,
      ...config
    };

    console.log('GlobalServiceManager: Initializing Universal Assistant coordinator');
    
    const coordinator = createUniversalAssistantCoordinator(
      defaultConfig,
      useMeetingStore,
      useAppStore
    );

    return coordinator;
  }

  /**
   * Subscribe to coordinator changes
   */
  subscribe(callback: (coordinator: UniversalAssistantCoordinator | null) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately notify with current coordinator
    callback(this.coordinator);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Register cleanup callback
   */
  registerCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    return () => {
      this.cleanupCallbacks.delete(callback);
    };
  }

  /**
   * Check if coordinator is available
   */
  isReady(): boolean {
    return this.coordinator !== null;
  }

  /**
   * Get current coordinator without initialization
   */
  getCurrentCoordinator(): UniversalAssistantCoordinator | null {
    return this.coordinator;
  }

  /**
   * Safely execute an action with the coordinator
   */
  async withCoordinator<T>(
    action: (coordinator: UniversalAssistantCoordinator) => Promise<T> | T,
    config?: UniversalAssistantConfig
  ): Promise<T | null> {
    try {
      const coordinator = await this.getCoordinator(config);
      return await action(coordinator);
    } catch (error) {
      console.error('GlobalServiceManager: Error executing action with coordinator:', error);
      return null;
    }
  }

  /**
   * Cleanup all services and reset state
   */
  async cleanup(): Promise<void> {
    console.log('GlobalServiceManager: Starting cleanup...');
    
    // Run all registered cleanup callbacks first
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('GlobalServiceManager: Error in cleanup callback:', error);
      }
    }
    this.cleanupCallbacks.clear();

    // Cleanup coordinator
    if (this.coordinator) {
      try {
        await this.coordinator.cleanup();
      } catch (error) {
        console.error('GlobalServiceManager: Error cleaning up coordinator:', error);
      }
      this.coordinator = null;
    }

    // Notify subscribers of cleanup
    this.notifySubscribers(null);
    
    // Reset state
    this.isInitializing = false;
    this.initializationPromise = null;
    
    console.log('GlobalServiceManager: Cleanup completed');
  }

  /**
   * Force reset the service manager (for debugging)
   */
  static reset(): void {
    if (GlobalServiceManager.instance) {
      GlobalServiceManager.instance.cleanup();
      GlobalServiceManager.instance = null;
    }
  }

  /**
   * Notify all subscribers of coordinator changes
   */
  private notifySubscribers(coordinator: UniversalAssistantCoordinator | null): void {
    for (const callback of this.subscribers) {
      try {
        callback(coordinator);
      } catch (error) {
        console.error('GlobalServiceManager: Error in subscriber callback:', error);
      }
    }
  }
}

/**
 * Hook to use the global service manager
 */
export function useGlobalServiceManager() {
  return GlobalServiceManager.getInstance();
}

/**
 * Hook to get coordinator with automatic cleanup
 */
export function useUniversalAssistantCoordinator(config?: UniversalAssistantConfig) {
  const serviceManager = useGlobalServiceManager();
  const [coordinator, setCoordinator] = React.useState<UniversalAssistantCoordinator | null>(
    serviceManager.getCurrentCoordinator()
  );
  const [isLoading, setIsLoading] = React.useState(!serviceManager.isReady());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const unsubscribe = serviceManager.subscribe((newCoordinator) => {
      if (mounted) {
        setCoordinator(newCoordinator);
        setIsLoading(false);
      }
    });

    // Initialize if not ready
    if (!serviceManager.isReady()) {
      serviceManager.getCoordinator(config)
        .then(() => {
          if (mounted) {
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to initialize coordinator');
            setIsLoading(false);
          }
        });
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [config, serviceManager]);

  return {
    coordinator,
    isLoading,
    error,
    isReady: coordinator !== null
  };
}

// Import React for the hook
import React from 'react';