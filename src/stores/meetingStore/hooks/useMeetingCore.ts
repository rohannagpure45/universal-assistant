/**
 * Core Meeting Management Hooks
 * 
 * Specialized hooks for core meeting operations like start, join, leave.
 * This provides a clean interface while keeping the store unified.
 */

import { useMeetingStore } from '../../meetingStore';

/**
 * Hook for core meeting operations
 */
export const useMeetingCore = () => {
  return useMeetingStore((state) => ({
    // Core state
    currentMeeting: state.currentMeeting,
    isInMeeting: state.isInMeeting,
    isLoadingMeeting: state.isLoadingMeeting,
    meetingError: state.meetingError,
    
    // Core actions
    startMeeting: state.startMeeting,
    endMeeting: state.endMeeting,
    joinMeeting: state.joinMeeting,
    leaveMeeting: state.leaveMeeting,
    loadMeeting: state.loadMeeting,
    updateMeeting: state.updateMeeting,
    deleteMeeting: state.deleteMeeting,
    
    // Error management
    clearMeetingError: state.clearMeetingError,
    setMeetingError: state.setMeetingError,
  }));
};

/**
 * Hook for meeting lifecycle events
 */
export const useMeetingLifecycle = () => {
  return useMeetingStore((state) => ({
    isInMeeting: state.isInMeeting,
    isLoadingMeeting: state.isLoadingMeeting,
    currentMeetingId: state.currentMeeting?.meetingId,
    meetingType: state.currentMeeting?.type,
    startTime: state.currentMeeting?.startTime,
    endTime: state.currentMeeting?.endTime,
  }));
};

/**
 * Hook for meeting metadata
 */
export const useMeetingMetadata = () => {
  return useMeetingStore((state) => ({
    meeting: state.currentMeeting,
    title: state.currentMeeting?.title,
    type: state.currentMeeting?.type,
    hostId: state.currentMeeting?.hostId,
    participantCount: state.participants.length,
    duration: state.currentMeeting?.startTime && state.currentMeeting?.endTime
      ? state.currentMeeting.endTime.getTime() - state.currentMeeting.startTime.getTime()
      : state.currentMeeting?.startTime
      ? Date.now() - state.currentMeeting.startTime.getTime()
      : 0,
  }));
};