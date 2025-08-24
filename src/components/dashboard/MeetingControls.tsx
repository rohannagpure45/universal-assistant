'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useCoordinatedMeetingOperations } from '@/services/universal-assistant/MeetingServiceIntegration';
import { PrimaryButton, SecondaryButton, Button } from '@/components/ui/Button';
import { MotionCard } from '@/components/ui/Motion';
import { cn } from '@/lib/utils';

// Global Service Manager integration
import { 
  useGlobalServiceManager,
  useUniversalAssistantCoordinator
} from '@/services/universal-assistant/GlobalServiceManager';

interface MeetingControlsProps {
  className?: string;
}

export const MeetingControls = React.memo<MeetingControlsProps>(({ className }) => {
  const { 
    currentMeeting, 
    isInMeeting, 
    isRecording, 
    isPaused,
    endMeeting,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording
  } = useCoordinatedMeetingOperations();
  
  const { addNotification } = useAppStore();
  
  // Global Service Manager integration
  const serviceManager = useGlobalServiceManager();
  const { coordinator, isLoading: isCoordinatorLoading, error: coordinatorError } = useUniversalAssistantCoordinator({
    model: 'gpt-4o',
    maxTokens: 1000,
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    ttsSpeed: 1.0,
    enableConcurrentProcessing: true,
    enableSpeakerIdentification: true,
  });
  
  // Universal Assistant state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(coordinatorError);

  // Subscribe to coordinator state changes
  useEffect(() => {
    if (!coordinator) return;
    
    const unsubscribe = coordinator.subscribe((state) => {
      setIsProcessing(state.isProcessing);
      setIsPlaying(state.isPlaying);
    });

    return unsubscribe;
  }, [coordinator]);

  // Update error state when coordinator error changes
  useEffect(() => {
    setError(coordinatorError);
  }, [coordinatorError]);

  // Handle recording control
  const handleToggleRecording = useCallback(async () => {
    if (!coordinator) {
      addNotification({
        type: 'warning',
        title: 'Not Ready',
        message: 'Universal Assistant is not initialized yet',
        persistent: false,
      });
      return;
    }

    try {
      if (isRecording) {
        if (isPaused) {
          resumeRecording();
        } else {
          pauseRecording();
        }
      } else {
        await coordinator.startRecording();
        startRecording();
        addNotification({
          type: 'success',
          title: 'Recording Started',
          message: 'Universal Assistant is now listening',
          persistent: false,
        });
      }
    } catch (err) {
      console.error('Recording control error:', err);
      addNotification({
        type: 'error',
        title: 'Recording Error',
        message: 'Failed to control recording',
        persistent: false,
      });
    }
  }, [coordinator, isRecording, isPaused, startRecording, pauseRecording, resumeRecording, addNotification]);

  // Handle stopping recording
  const handleStopRecording = useCallback(() => {
    if (!coordinator) return;

    try {
      coordinator.stopRecording();
      stopRecording();
      addNotification({
        type: 'info',
        title: 'Recording Stopped',
        message: 'Universal Assistant has stopped listening',
        persistent: false,
      });
    } catch (err) {
      console.error('Stop recording error:', err);
      addNotification({
        type: 'error',
        title: 'Stop Error',
        message: 'Failed to stop recording',
        persistent: false,
      });
    }
  }, [coordinator, stopRecording, addNotification]);

  // Handle ending meeting with proper service cleanup
  const handleEndMeeting = useCallback(async () => {
    if (!currentMeeting) return;

    try {
      // endMeeting now includes coordinated service cleanup
      const success = await endMeeting(currentMeeting.meetingId);
      
      if (success) {
        addNotification({
          type: 'success',
          title: 'Meeting Ended',
          message: 'Meeting has been successfully ended',
          persistent: false,
        });
      } else {
        throw new Error('Failed to end meeting');
      }
    } catch (err) {
      console.error('End meeting error:', err);
      addNotification({
        type: 'error',
        title: 'End Meeting Error',
        message: 'Failed to end meeting',
        persistent: false,
      });
    }
  }, [currentMeeting, endMeeting, addNotification]);

  // Handle trigger AI speech
  const handleTriggerAISpeech = useCallback(async () => {
    if (!coordinator) {
      addNotification({
        type: 'warning',
        title: 'Not Ready',
        message: 'Universal Assistant is not ready',
        persistent: false,
      });
      return;
    }

    try {
      // Get recent conversation context and generate AI response
      const coordinatorState = coordinator.getState();
      const recentTranscript = coordinatorState.transcript.slice(-500); // Last 500 chars
      
      if (!recentTranscript.trim()) {
        addNotification({
          type: 'info',
          title: 'No Context',
          message: 'No recent conversation to respond to',
          persistent: false,
        });
        return;
      }

      // Trigger AI response generation through the coordinator
      // Note: generateAIResponse is a private method, we need to use a public method
      // For now, we'll simulate triggering AI by adding a test transcript
      const testResponse = "This is a test AI response triggered manually.";
      await coordinator.playAudio('/api/universal-assistant/tts?text=' + encodeURIComponent(testResponse));

    } catch (err) {
      console.error('AI speech trigger error:', err);
      addNotification({
        type: 'error',
        title: 'AI Speech Error',
        message: 'Failed to trigger AI speech',
        persistent: false,
      });
    }
  }, [coordinator, addNotification]);

  // Handle vocal interrupt
  const handleVocalInterrupt = useCallback(() => {
    if (!coordinator) return;

    try {
      coordinator.handleVocalInterrupt();
      addNotification({
        type: 'info',
        title: 'Audio Interrupted',
        message: 'AI speech has been interrupted',
        persistent: false,
      });
    } catch (err) {
      console.error('Vocal interrupt error:', err);
    }
  }, [coordinator, addNotification]);

  // Don't render if not in meeting
  if (!isInMeeting || !currentMeeting) {
    return null;
  }

  return (
    <MotionCard className={cn(
      'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
      'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
      'p-6',
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h4 text-neutral-900 dark:text-neutral-100">
          Meeting Controls
        </h3>
        {error && (
          <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Recording Control */}
        <Button
          variant={isRecording ? (isPaused ? "secondary" : "danger") : "primary"}
          size="sm"
          fullWidth
          onClick={handleToggleRecording}
          disabled={isProcessing || isCoordinatorLoading}
          leftIcon={
            isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )
          }
        >
          {isProcessing ? 'Processing...' : 
           isRecording ? (isPaused ? 'Resume' : 'Pause') : 'Start Recording'}
        </Button>

        {/* Stop Recording */}
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleStopRecording}
          disabled={!isRecording || isProcessing || isCoordinatorLoading}
          leftIcon={<Square className="w-4 h-4" />}
        >
          Stop
        </Button>

        {/* Trigger AI Speech */}
        <PrimaryButton
          size="sm"
          fullWidth
          onClick={handleTriggerAISpeech}
          disabled={isProcessing || isPlaying || isCoordinatorLoading}
          loading={isPlaying}
          leftIcon={isPlaying ? <Volume2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        >
          {isPlaying ? 'Speaking...' : 'Trigger AI'}
        </PrimaryButton>

        {/* Vocal Interrupt */}
        <SecondaryButton
          size="sm"
          fullWidth
          onClick={handleVocalInterrupt}
          disabled={!isPlaying || isCoordinatorLoading}
          leftIcon={<VolumeX className="w-4 h-4" />}
        >
          Interrupt
        </SecondaryButton>
      </div>

      {/* End Meeting */}
      <div className="mt-4 pt-4 border-t border-neutral-200/60 dark:border-neutral-700/60">
        <Button
          variant="danger"
          size="sm"
          fullWidth
          onClick={handleEndMeeting}
          leftIcon={<Square className="w-4 h-4" />}
        >
          End Meeting
        </Button>
      </div>

      {/* Status Indicators */}
      <div className="mt-4 flex items-center justify-between text-sm text-contrast-accessible">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isRecording ? 'bg-danger-500 animate-pulse' : 'bg-neutral-300'
          )} />
          <span>{isRecording ? 'Recording' : 'Not Recording'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isPlaying ? 'bg-primary-500 animate-pulse' : 'bg-neutral-300'
          )} />
          <span>{isPlaying ? 'AI Speaking' : 'AI Silent'}</span>
        </div>
      </div>
    </MotionCard>
  );
});

MeetingControls.displayName = 'MeetingControls';