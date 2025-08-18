import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  UniversalAssistantCoordinator, 
  createUniversalAssistantCoordinator,
  UniversalAssistantConfig,
  CoordinatorState
} from '@/services/universal-assistant/UniversalAssistantCoordinator';
import { SpeakerProfile } from '@/types';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAppStore } from '@/stores/appStore';

export interface UseUniversalAssistantOptions {
  model?: string;
  maxTokens?: number;
  voiceId?: string;
  ttsSpeed?: number;
  enableConcurrentProcessing?: boolean;
  enableSpeakerIdentification?: boolean;
  autoStart?: boolean;
}

export interface UseUniversalAssistantReturn {
  // State
  isRecording: boolean;
  isPlaying: boolean;
  isProcessing: boolean;
  transcript: string;
  speakers: Map<string, SpeakerProfile>;
  currentSpeaker?: string;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  handleVocalInterrupt: () => void;
  playAudio: (url: string) => Promise<void>;
  updateConfig: (config: Partial<UniversalAssistantConfig>) => void;
  
  // Utilities
  getConfig: () => UniversalAssistantConfig;
  getProcessingStats: () => any;
  cleanup: () => void;
  
  // Error state
  error: string | null;
}

const DEFAULT_CONFIG: UniversalAssistantConfig = {
  model: 'claude-3-5-sonnet',
  maxTokens: 1000,
  voiceId: 'default',
  ttsSpeed: 1.0,
  enableConcurrentProcessing: true, // Enable by default for new hook users
  enableSpeakerIdentification: true,
};

export function useUniversalAssistant(options: UseUniversalAssistantOptions = {}): UseUniversalAssistantReturn {
  // Store integration
  const meetingStore = useMeetingStore();
  const appStore = useAppStore();
  
  // Configuration with app store preferences
  const config: UniversalAssistantConfig = {
    ...DEFAULT_CONFIG,
    // Override with app store settings if available
    model: appStore.aiSettings?.defaultModel || DEFAULT_CONFIG.model,
    maxTokens: appStore.aiSettings?.maxTokens || DEFAULT_CONFIG.maxTokens,
    voiceId: appStore.ttsSettings?.voiceId || DEFAULT_CONFIG.voiceId,
    ttsSpeed: appStore.ttsSettings?.speed || DEFAULT_CONFIG.ttsSpeed,
    ...options, // User options take final priority
  };

  // State management
  const [state, setState] = useState<CoordinatorState>({
    isRecording: false,
    isPlaying: false,
    transcript: '',
    speakers: new Map(),
    isProcessing: false,
  });
  
  const [error, setError] = useState<string | null>(null);

  // Coordinator reference
  const coordinatorRef = useRef<UniversalAssistantCoordinator | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize coordinator on mount
  useEffect(() => {
    try {
      const coordinator = createUniversalAssistantCoordinator(config, meetingStore as any, appStore as any);
      coordinatorRef.current = coordinator;

      // Subscribe to state changes
      const unsubscribe = coordinator.subscribe((newState) => {
        setState(newState);
      });
      unsubscribeRef.current = unsubscribe;

      // Auto-start if requested
      if (options.autoStart) {
        coordinator.startRecording().catch((err) => {
          setError(`Failed to auto-start recording: ${err.message}`);
          
          // Also add notification to app store
          appStore.addNotification({
            type: 'error',
            title: 'Auto-start Failed',
            message: `Failed to auto-start recording: ${err.message}`,
            persistent: false,
          });
        });
      }

      setError(null);
    } catch (err) {
      const errorMessage = `Failed to initialize Universal Assistant: ${(err as Error).message}`;
      setError(errorMessage);
      
      // Add error notification
      appStore.addNotification({
        type: 'error',
        title: 'Initialization Failed',
        message: errorMessage,
        persistent: false,
      });
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (coordinatorRef.current) {
        coordinatorRef.current.cleanup();
      }
    };
  }, [meetingStore, appStore]); // Include stores in dependencies

  // Sync app store settings when they change
  useEffect(() => {
    if (coordinatorRef.current && appStore.aiSettings && appStore.ttsSettings) {
      coordinatorRef.current.updateConfig({
        model: appStore.aiSettings.defaultModel,
        maxTokens: appStore.aiSettings.maxTokens,
        voiceId: appStore.ttsSettings.voiceId,
        ttsSpeed: appStore.ttsSettings.speed,
      });
    }
  }, [appStore.aiSettings, appStore.ttsSettings]);

  // Action handlers with error handling
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      if (coordinatorRef.current) {
        await coordinatorRef.current.startRecording();
      }
    } catch (err) {
      const errorMessage = `Failed to start recording: ${(err as Error).message}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const stopRecording = useCallback(() => {
    try {
      setError(null);
      if (coordinatorRef.current) {
        coordinatorRef.current.stopRecording();
      }
    } catch (err) {
      const errorMessage = `Failed to stop recording: ${(err as Error).message}`;
      setError(errorMessage);
    }
  }, []);

  const handleVocalInterrupt = useCallback(() => {
    try {
      setError(null);
      if (coordinatorRef.current) {
        coordinatorRef.current.handleVocalInterrupt();
      }
    } catch (err) {
      const errorMessage = `Failed to handle vocal interrupt: ${(err as Error).message}`;
      setError(errorMessage);
    }
  }, []);

  const playAudio = useCallback(async (url: string) => {
    try {
      setError(null);
      if (coordinatorRef.current) {
        await coordinatorRef.current.playAudio(url);
      }
    } catch (err) {
      const errorMessage = `Failed to play audio: ${(err as Error).message}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<UniversalAssistantConfig>) => {
    try {
      setError(null);
      if (coordinatorRef.current) {
        coordinatorRef.current.updateConfig(newConfig);
        
        // Also update app store if config includes relevant settings
        if (newConfig.model || newConfig.maxTokens) {
          appStore.updateAISettings({
            ...(newConfig.model && { defaultModel: newConfig.model as any }),
            ...(newConfig.maxTokens && { maxTokens: newConfig.maxTokens }),
          });
        }
        
        if (newConfig.voiceId || newConfig.ttsSpeed) {
          appStore.updateTTSSettings({
            ...(newConfig.voiceId && { voiceId: newConfig.voiceId }),
            ...(newConfig.ttsSpeed && { speed: newConfig.ttsSpeed }),
          });
        }
      }
    } catch (err) {
      const errorMessage = `Failed to update config: ${(err as Error).message}`;
      setError(errorMessage);
      
      appStore.addNotification({
        type: 'error',
        title: 'Config Update Failed',
        message: errorMessage,
        persistent: false,
      });
    }
  }, [appStore]);

  const getConfig = useCallback((): UniversalAssistantConfig => {
    if (coordinatorRef.current) {
      return coordinatorRef.current.getConfig();
    }
    return config;
  }, [config]);

  const getProcessingStats = useCallback(() => {
    try {
      // Get stats from underlying services
      const { conversationProcessor } = require('@/services/universal-assistant/ConversationProcessor');
      const { improvedFragmentAggregator } = require('@/services/fragments/ImprovedFragmentAggregator');
      const { performanceMonitor } = require('@/services/monitoring/PerformanceMonitor');

      return {
        conversation: conversationProcessor.getProcessorStats(),
        fragmentAggregator: improvedFragmentAggregator.getStats(),
        performance: performanceMonitor.getStats(),
        coordinator: coordinatorRef.current?.getState(),
      };
    } catch (err) {
      console.error('Failed to get processing stats:', err);
      return null;
    }
  }, []);

  const cleanup = useCallback(() => {
    try {
      if (coordinatorRef.current) {
        coordinatorRef.current.cleanup();
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      setError(null);
    } catch (err) {
      console.error('Error during cleanup:', err);
    }
  }, []);

  // Return hook interface
  return {
    // State
    isRecording: state.isRecording,
    isPlaying: state.isPlaying,
    isProcessing: state.isProcessing,
    transcript: state.transcript,
    speakers: state.speakers as any,
    currentSpeaker: state.currentSpeaker,
    
    // Actions
    startRecording,
    stopRecording,
    handleVocalInterrupt,
    playAudio,
    updateConfig,
    
    // Utilities
    getConfig,
    getProcessingStats,
    cleanup,
    
    // Error state
    error,
  };
}

// Convenience hook for quick setup with production defaults
export function useProductionUniversalAssistant(): UseUniversalAssistantReturn {
  return useUniversalAssistant({
    enableConcurrentProcessing: true,
    enableSpeakerIdentification: true,
    model: 'claude-3-5-sonnet',
    maxTokens: 1500,
    ttsSpeed: 1.1,
  });
}

// Hook for development/testing with safer defaults
export function useDevelopmentUniversalAssistant(): UseUniversalAssistantReturn {
  return useUniversalAssistant({
    enableConcurrentProcessing: false, // Disable for easier debugging
    enableSpeakerIdentification: true,
    model: 'gpt-4o-mini', // Cheaper for development
    maxTokens: 500,
    ttsSpeed: 1.2,
  });
}

// Export types for convenience
export type { 
  UniversalAssistantConfig, 
  CoordinatorState, 
  SpeakerProfile
};