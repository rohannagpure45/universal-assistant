import { UniversalAssistantCoordinator } from './UniversalAssistantCoordinator';
import type { TranscriptEntry } from '@/types';
import { useMeetingStore, type MeetingState, type MeetingActions } from '@/stores/meetingStore';
import { useAppStore, type AppState, type AppActions } from '@/stores/appStore';
import type { StoreApi } from 'zustand';

/**
 * ServiceBridge - Handles communication between frontend components and backend services
 * Provides proper error handling, state synchronization, and service coordination
 */
// Type definitions for Zustand store APIs
type MeetingStoreApi = StoreApi<MeetingState & MeetingActions>;
type AppStoreApi = StoreApi<AppState & AppActions>;

export class ServiceBridge {
  private coordinator: UniversalAssistantCoordinator | null = null;
  private meetingStore: MeetingStoreApi | null = null;
  private appStore: AppStoreApi | null = null;
  private stateSubscriptions: (() => void)[] = [];
  private isInitialized = false;

  constructor(
    coordinator: UniversalAssistantCoordinator,
    meetingStore?: MeetingStoreApi,
    appStore?: AppStoreApi
  ) {
    this.coordinator = coordinator;
    this.meetingStore = meetingStore || null;
    this.appStore = appStore || null;
    this.setupStateSync();
  }

  /**
   * Set up bidirectional state synchronization between coordinator and stores
   */
  private setupStateSync(): void {
    if (!this.coordinator) return;

    // Subscribe to coordinator state changes
    const coordinatorUnsubscribe = this.coordinator.subscribe((coordinatorState) => {
      // Sync recording state
      if (this.meetingStore) {
        const meetingState = this.meetingStore.getState();
        if (meetingState.isRecording !== coordinatorState.isRecording) {
          if (coordinatorState.isRecording) {
            meetingState.startRecording();
          } else {
            meetingState.stopRecording();
          }
        }
      }

      // Sync processing state through notifications (AppStore doesn't have isProcessing)
      if (this.appStore && coordinatorState.isProcessing) {
        const appState = this.appStore.getState();
        // We can track processing state through feature flags or notifications
        // For now, we'll just ensure the app store is aware of activity
        appState.updateLastSyncTime();
      }
    });

    this.stateSubscriptions.push(coordinatorUnsubscribe);
  }

  /**
   * Initialize the service bridge with store connections
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set stores on coordinator if available
      if (this.coordinator && this.meetingStore && this.appStore) {
        this.coordinator.setStores(this.meetingStore as any, this.appStore as any);
      }

      this.isInitialized = true;
      console.log('ServiceBridge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ServiceBridge:', error);
      throw error;
    }
  }

  /**
   * Start recording with proper error handling and state sync
   */
  public async startRecording(): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not available');
    }

    try {
      await this.coordinator.startRecording();
      
      // Ensure meeting store is updated
      if (this.meetingStore) {
        const actions = this.meetingStore.getState();
        if (!actions.isRecording) {
          actions.startRecording();
        }
      }
    } catch (error) {
      console.error('ServiceBridge: Failed to start recording:', error);
      
      // Show error notification
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.addNotification({
          type: 'error',
          title: 'Recording Error',
          message: 'Failed to start recording. Please check your microphone permissions.',
          persistent: false,
        });
      }
      
      throw error;
    }
  }

  /**
   * Stop recording with proper cleanup
   */
  public async stopRecording(): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not available');
    }

    try {
      this.coordinator.stopRecording();
      
      // Ensure meeting store is updated
      if (this.meetingStore) {
        const actions = this.meetingStore.getState();
        if (actions.isRecording) {
          actions.stopRecording();
        }
      }

      // Update app state to indicate recording stopped
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.updateLastSyncTime();
        actions.addNotification({
          type: 'info',
          title: 'Recording Stopped',
          message: 'Audio recording has been stopped successfully.',
          persistent: false,
        });
      }
    } catch (error) {
      console.error('ServiceBridge: Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Trigger AI response with proper error handling
   */
  public async triggerAIResponse(text?: string): Promise<void> {
    if (!this.coordinator) {
      throw new Error('Coordinator not available');
    }

    try {
      // Update app state to indicate AI processing
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.updateLastSyncTime();
      }

      await this.coordinator.triggerAIResponse(text);
      
      // Success notification
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.addNotification({
          type: 'success',
          title: 'AI Response Generated',
          message: 'AI response has been generated and will be played.',
          persistent: false,
        });
      }
    } catch (error) {
      console.error('ServiceBridge: Failed to trigger AI response:', error);
      
      // Error notification
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.addNotification({
          type: 'error',
          title: 'AI Response Error',
          message: 'Failed to generate AI response. Please try again.',
          persistent: false,
        });
        actions.updateLastSyncTime();
      }
      
      throw error;
    }
  }

  /**
   * Handle vocal interrupts
   */
  public handleVocalInterrupt(): void {
    if (!this.coordinator) {
      console.warn('Coordinator not available for vocal interrupt');
      return;
    }

    try {
      this.coordinator.handleVocalInterrupt();
      
      // Show notification
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.addNotification({
          type: 'info',
          title: 'Interrupted',
          message: 'Audio playback has been interrupted.',
          persistent: false,
        });
      }
    } catch (error) {
      console.error('ServiceBridge: Failed to handle vocal interrupt:', error);
    }
  }

  /**
   * Get current coordinator state
   */
  public getCoordinatorState() {
    return this.coordinator?.getState() || null;
  }

  /**
   * Check if services are ready
   */
  public isReady(): boolean {
    return this.isInitialized && this.coordinator !== null;
  }

  /**
   * Add transcript entry through the bridge
   */
  public async addTranscriptEntry(entry: Omit<TranscriptEntry, 'id'>): Promise<void> {
    if (!this.meetingStore) {
      console.warn('Meeting store not available for transcript entry');
      return;
    }

    try {
      const actions = this.meetingStore.getState();
      await actions.addTranscriptEntry(entry);
    } catch (error) {
      console.error('ServiceBridge: Failed to add transcript entry:', error);
      
      if (this.appStore) {
        const actions = this.appStore.getState();
        actions.addNotification({
          type: 'error',
          title: 'Transcript Error',
          message: 'Failed to save transcript entry.',
          persistent: false,
        });
      }
    }
  }

  /**
   * Clean up the service bridge
   */
  public cleanup(): void {
    try {
      // Clean up coordinator
      if (this.coordinator) {
        this.coordinator.cleanup();
        this.coordinator = null;
      }

      // Clean up subscriptions
      this.stateSubscriptions.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error cleaning up subscription:', error);
        }
      });
      this.stateSubscriptions = [];

      // Clear references
      this.meetingStore = null;
      this.appStore = null;
      this.isInitialized = false;

      console.log('ServiceBridge cleaned up successfully');
    } catch (error) {
      console.error('Error during ServiceBridge cleanup:', error);
    }
  }
}

/**
 * Factory function to create a service bridge
 */
export function createServiceBridge(
  coordinator: UniversalAssistantCoordinator,
  meetingStore?: MeetingStoreApi,
  appStore?: AppStoreApi
): ServiceBridge {
  return new ServiceBridge(coordinator, meetingStore, appStore);
}

/**
 * Utility function to get store API from store hooks
 * This extracts the underlying Zustand store API that has getState(), setState(), subscribe() methods
 */
export function getStoreApi<T>(storeHook: () => T): StoreApi<T> {
  return (storeHook as any);
}

/**
 * Helper function to create ServiceBridge with proper store APIs
 */
export function createServiceBridgeWithHooks(
  coordinator: UniversalAssistantCoordinator
): ServiceBridge {
  const meetingStoreApi = getStoreApi(useMeetingStore) as MeetingStoreApi;
  const appStoreApi = getStoreApi(useAppStore) as AppStoreApi;
  
  return new ServiceBridge(coordinator, meetingStoreApi, appStoreApi);
}