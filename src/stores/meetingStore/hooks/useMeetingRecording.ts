/**
 * Meeting Recording Management Hooks
 * 
 * Specialized hooks for recording controls and audio state management.
 */

import { useMeetingStore } from '../../meetingStore';

/**
 * Hook for recording controls
 */
export const useMeetingRecording = () => {
  return useMeetingStore((state) => ({
    // Recording state
    isRecording: state.isRecording,
    isPaused: state.isPaused,
    recordingDuration: state.recordingDuration,
    
    // Recording actions
    startRecording: state.startRecording,
    stopRecording: state.stopRecording,
    pauseRecording: state.pauseRecording,
    resumeRecording: state.resumeRecording,
    updateRecordingDuration: state.updateRecordingDuration,
  }));
};

/**
 * Hook for recording status with computed values
 */
export const useRecordingStatus = () => {
  return useMeetingStore((state) => {
    const isActive = state.isRecording && !state.isPaused;
    const formattedDuration = formatDuration(state.recordingDuration);
    
    return {
      isRecording: state.isRecording,
      isPaused: state.isPaused,
      isActive,
      duration: state.recordingDuration,
      formattedDuration,
      canRecord: state.isInMeeting,
      status: !state.isRecording 
        ? 'stopped' 
        : state.isPaused 
        ? 'paused' 
        : 'recording' as 'stopped' | 'paused' | 'recording',
    };
  });
};

/**
 * Hook for recording actions with validation
 */
export const useRecordingActions = () => {
  const store = useMeetingStore();
  
  return {
    startRecording: () => {
      if (store.isInMeeting && !store.isRecording) {
        store.startRecording();
        return true;
      }
      return false;
    },
    
    stopRecording: () => {
      if (store.isRecording) {
        store.stopRecording();
        return true;
      }
      return false;
    },
    
    pauseRecording: () => {
      if (store.isRecording && !store.isPaused) {
        store.pauseRecording();
        return true;
      }
      return false;
    },
    
    resumeRecording: () => {
      if (store.isRecording && store.isPaused) {
        store.resumeRecording();
        return true;
      }
      return false;
    },
    
    toggleRecording: () => {
      if (!store.isRecording) {
        return store.isInMeeting ? (store.startRecording(), true) : false;
      } else if (store.isPaused) {
        store.resumeRecording();
        return true;
      } else {
        store.pauseRecording();
        return true;
      }
    },
  };
};

// Utility function to format duration
function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}