'use client';

import { GlobalServiceManager } from './GlobalServiceManager';
import { useMeetingStore, type MeetingActions } from '@/stores/meetingStore';

/**
 * Integration utilities for coordinating Universal Assistant services with meeting operations
 */
export class MeetingServiceIntegration {
  private static instance: MeetingServiceIntegration | null = null;
  private serviceManager: GlobalServiceManager;

  private constructor() {
    this.serviceManager = GlobalServiceManager.getInstance();
  }

  static getInstance(): MeetingServiceIntegration {
    if (!MeetingServiceIntegration.instance) {
      MeetingServiceIntegration.instance = new MeetingServiceIntegration();
    }
    return MeetingServiceIntegration.instance;
  }

  /**
   * End meeting with proper service cleanup coordination
   */
  async endMeetingWithServiceCleanup(meetingId?: string): Promise<boolean> {
    console.log('MeetingServiceIntegration: Starting coordinated meeting end...');
    
    try {
      // First, cleanup all Universal Assistant services
      console.log('MeetingServiceIntegration: Cleaning up Universal Assistant services...');
      await this.serviceManager.cleanup();
      
      // Then end the meeting through the store
      console.log('MeetingServiceIntegration: Ending meeting via store...');
      const meetingStore = useMeetingStore.getState();
      const success = await meetingStore.endMeeting(meetingId);
      
      if (success) {
        console.log('MeetingServiceIntegration: Meeting ended successfully with service cleanup');
      } else {
        console.error('MeetingServiceIntegration: Failed to end meeting through store');
      }
      
      return success;
    } catch (error) {
      console.error('MeetingServiceIntegration: Error during coordinated meeting end:', error);
      return false;
    }
  }

  /**
   * Start meeting with service initialization (if needed)
   */
  async startMeetingWithServiceSetup(meetingData: Parameters<MeetingActions['startMeeting']>[0]): Promise<string | null> {
    console.log('MeetingServiceIntegration: Starting meeting with service setup...');
    
    try {
      // Start the meeting through the store first
      const meetingStore = useMeetingStore.getState();
      const meetingId = await meetingStore.startMeeting(meetingData);
      
      if (meetingId) {
        console.log('MeetingServiceIntegration: Meeting started successfully, services will be initialized on demand');
        // Services are initialized on demand through the GlobalServiceManager
        // No need to force initialization here
      }
      
      return meetingId;
    } catch (error) {
      console.error('MeetingServiceIntegration: Error during meeting start:', error);
      return null;
    }
  }

  /**
   * Get the service manager instance
   */
  getServiceManager(): GlobalServiceManager {
    return this.serviceManager;
  }

  /**
   * Check if services are ready
   */
  areServicesReady(): boolean {
    return this.serviceManager.isReady();
  }

  /**
   * Cleanup and reset integration
   */
  async cleanup(): Promise<void> {
    await this.serviceManager.cleanup();
  }

  /**
   * Reset the integration instance (for debugging)
   */
  static reset(): void {
    if (MeetingServiceIntegration.instance) {
      MeetingServiceIntegration.instance.cleanup();
      MeetingServiceIntegration.instance = null;
    }
  }
}

/**
 * Hook to use the meeting service integration
 */
export function useMeetingServiceIntegration() {
  return MeetingServiceIntegration.getInstance();
}

/**
 * Hook for coordinated meeting operations
 */
export function useCoordinatedMeetingOperations() {
  const integration = useMeetingServiceIntegration();
  const meetingStore = useMeetingStore();

  return {
    ...meetingStore,
    // Override endMeeting with coordinated version
    endMeeting: integration.endMeetingWithServiceCleanup.bind(integration),
    // Add startMeeting with service setup
    startMeetingWithServices: integration.startMeetingWithServiceSetup.bind(integration),
    // Utility methods
    areServicesReady: integration.areServicesReady.bind(integration),
    getServiceManager: integration.getServiceManager.bind(integration),
  };
}