import { useCallback, useMemo, useEffect, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useMeetingStore, type MeetingError } from '../meetingStore';
import { useAuthStore } from '../authStore';
import type { 
  Meeting, 
  TranscriptEntry, 
  Participant, 
  SpeakerProfile,
  MeetingType 
} from '@/types';

// ============ MEETING MANAGEMENT HOOKS ============

/**
 * Hook for managing meeting lifecycle with optimistic updates
 */
export const useMeetingActions = () => {
  const user = useAuthStore((state) => state.user);
  const {
    startMeeting,
    endMeeting,
    joinMeeting,
    leaveMeeting,
    updateMeeting,
    deleteMeeting,
  } = useMeetingStore(
    (state) => ({
      startMeeting: state.startMeeting,
      endMeeting: state.endMeeting,
      joinMeeting: state.joinMeeting,
      leaveMeeting: state.leaveMeeting,
      updateMeeting: state.updateMeeting,
      deleteMeeting: state.deleteMeeting,
    }),
    shallow
  );

  const startMeetingWithDefaults = useCallback(async (
    title: string,
    type: MeetingType,
    additionalData?: Partial<Meeting>
  ) => {
    if (!user) return null;

    return startMeeting({
      id: `meeting-${Date.now()}`,
      hostId: user.uid,
      createdBy: user.uid,
      title,
      type,
      status: 'active' as const,
      endTime: undefined,
      duration: 0,
      recording: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [{
        id: user.uid,
        userId: user.uid,
        userName: user.displayName || 'Unknown',
        displayName: user.displayName || 'Unknown',
        email: user.email || '',
        voiceProfileId: 'default',
        role: 'host' as const,
        joinTime: new Date(),
        joinedAt: new Date(),
        speakingTime: 0,
        isActive: true,
      }],
      notes: [],
      keywords: [],
      appliedRules: [],
      ...additionalData,
    });
  }, [user, startMeeting]);

  return {
    startMeeting: startMeetingWithDefaults,
    endMeeting,
    joinMeeting,
    leaveMeeting,
    updateMeeting,
    deleteMeeting,
  };
};

/**
 * Hook for accessing current meeting state with memoized calculations
 */
export const useMeetingState = () => {
  const meetingData = useMeetingStore(
    (state) => ({
      currentMeeting: state.currentMeeting,
      isInMeeting: state.isInMeeting,
      isLoadingMeeting: state.isLoadingMeeting,
      participants: state.participants,
      activeSpeaker: state.activeSpeaker,
      isRecording: state.isRecording,
      recordingDuration: state.recordingDuration,
    }),
    shallow
  );

  // Memoized calculations for performance
  const meetingStats = useMemo(() => {
    if (!meetingData.currentMeeting) {
      return null;
    }

    const meeting = meetingData.currentMeeting;
    const duration = meeting.endTime 
      ? meeting.endTime.getTime() - meeting.startTime.getTime()
      : Date.now() - meeting.startTime.getTime();

    const participantCount = meetingData.participants.length;
    const totalSpeakingTime = meetingData.participants.reduce(
      (total, p) => total + p.speakingTime, 0
    );

    return {
      duration,
      participantCount,
      totalSpeakingTime,
      averageSpeakingTime: participantCount > 0 ? totalSpeakingTime / participantCount : 0,
    };
  }, [meetingData.currentMeeting, meetingData.participants]);

  const activeSpeakerInfo = useMemo(() => {
    if (!meetingData.activeSpeaker) return null;
    
    return meetingData.participants.find(
      p => p.userId === meetingData.activeSpeaker
    );
  }, [meetingData.activeSpeaker, meetingData.participants]);

  return {
    ...meetingData,
    meetingStats,
    activeSpeakerInfo,
  };
};

// ============ TRANSCRIPT MANAGEMENT HOOKS ============

/**
 * Hook for managing transcript with performance optimizations
 */
export const useTranscript = () => {
  const {
    transcript,
    fragmentBuffer,
    isLoadingTranscript,
    transcriptError,
    addTranscriptEntry,
    updateTranscriptEntry,
    deleteTranscriptEntry,
    addFragmentToBuffer,
    processFragmentBuffer,
    clearFragmentBuffer,
  } = useMeetingStore(
    (state) => ({
      transcript: state.transcript,
      fragmentBuffer: state.fragmentBuffer,
      isLoadingTranscript: state.isLoadingTranscript,
      transcriptError: state.transcriptError,
      addTranscriptEntry: state.addTranscriptEntry,
      updateTranscriptEntry: state.updateTranscriptEntry,
      deleteTranscriptEntry: state.deleteTranscriptEntry,
      addFragmentToBuffer: state.addFragmentToBuffer,
      processFragmentBuffer: state.processFragmentBuffer,
      clearFragmentBuffer: state.clearFragmentBuffer,
    }),
    shallow
  );

  // Memoized transcript analytics
  const transcriptAnalytics = useMemo(() => {
    const totalEntries = transcript.length;
    const completedEntries = transcript.filter(entry => entry.isComplete).length;
    const speakers = Array.from(new Set(transcript.map(entry => entry.speakerId)));
    
    const averageConfidence = totalEntries > 0 
      ? transcript.reduce((sum, entry) => sum + entry.confidence, 0) / totalEntries 
      : 0;

    const speakerStats = speakers.map(speakerId => {
      const speakerEntries = transcript.filter(entry => entry.speakerId === speakerId);
      const wordCount = speakerEntries.reduce(
        (count, entry) => count + entry.text.split(' ').length, 0
      );
      
      return {
        speakerId,
        entryCount: speakerEntries.length,
        wordCount,
        averageConfidence: speakerEntries.reduce(
          (sum, entry) => sum + entry.confidence, 0
        ) / speakerEntries.length,
      };
    });

    return {
      totalEntries,
      completedEntries,
      completionRate: totalEntries > 0 ? completedEntries / totalEntries : 0,
      speakers: speakers.length,
      averageConfidence,
      speakerStats,
    };
  }, [transcript]);

  // Debounced fragment processing
  const debouncedProcessFragments = useCallback(() => {
    const timeoutRef = setTimeout(() => {
      processFragmentBuffer();
    }, 500);

    return () => clearTimeout(timeoutRef);
  }, [processFragmentBuffer]);

  return {
    transcript,
    fragmentBuffer,
    isLoadingTranscript,
    transcriptError,
    transcriptAnalytics,
    actions: {
      addTranscriptEntry,
      updateTranscriptEntry,
      deleteTranscriptEntry,
      addFragmentToBuffer,
      processFragmentBuffer: debouncedProcessFragments,
      clearFragmentBuffer,
    },
  };
};

/**
 * Hook for filtered and paginated transcript entries
 */
export const useFilteredTranscript = (options: {
  speakerId?: string;
  searchTerm?: string;
  limit?: number;
  onlyComplete?: boolean;
}) => {
  const transcript = useMeetingStore((state) => state.transcript);

  const filteredTranscript = useMemo(() => {
    let filtered = [...transcript];

    if (options.speakerId) {
      filtered = filtered.filter(entry => entry.speakerId === options.speakerId);
    }

    if (options.onlyComplete) {
      filtered = filtered.filter(entry => entry.isComplete);
    }

    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.text.toLowerCase().includes(searchLower) ||
        entry.speaker.toLowerCase().includes(searchLower)
      );
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit); // Get most recent entries
    }

    return filtered;
  }, [transcript, options.speakerId, options.searchTerm, options.limit, options.onlyComplete]);

  return filteredTranscript;
};

// ============ PARTICIPANT MANAGEMENT HOOKS ============

/**
 * Hook for managing meeting participants
 */
export const useParticipants = () => {
  const {
    participants,
    connectedParticipants,
    speakerProfiles,
    activeSpeaker,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setActiveSpeaker,
    updateSpeakerProfile,
  } = useMeetingStore(
    (state) => ({
      participants: state.participants,
      connectedParticipants: state.connectedParticipants,
      speakerProfiles: state.speakerProfiles,
      activeSpeaker: state.activeSpeaker,
      addParticipant: state.addParticipant,
      removeParticipant: state.removeParticipant,
      updateParticipant: state.updateParticipant,
      setActiveSpeaker: state.setActiveSpeaker,
      updateSpeakerProfile: state.updateSpeakerProfile,
    }),
    shallow
  );

  // Memoized participant analytics
  const participantAnalytics = useMemo(() => {
    const totalParticipants = participants.length;
    const connectedCount = connectedParticipants.length;
    const totalSpeakingTime = participants.reduce((sum, p) => sum + p.speakingTime, 0);
    
    const participantStats = participants.map(participant => {
      const speakingPercentage = totalSpeakingTime > 0 
        ? (participant.speakingTime / totalSpeakingTime) * 100 
        : 0;

      return {
        ...participant,
        speakingPercentage,
        isConnected: connectedParticipants.includes(participant.userId),
        isActive: activeSpeaker === participant.userId,
      };
    });

    return {
      totalParticipants,
      connectedCount,
      connectionRate: totalParticipants > 0 ? connectedCount / totalParticipants : 0,
      participantStats,
    };
  }, [participants, connectedParticipants, activeSpeaker]);

  return {
    participants,
    connectedParticipants,
    speakerProfiles,
    activeSpeaker,
    participantAnalytics,
    actions: {
      addParticipant,
      removeParticipant,
      updateParticipant,
      setActiveSpeaker,
      updateSpeakerProfile,
    },
  };
};

// ============ REAL-TIME SYNCHRONIZATION HOOKS ============

/**
 * Hook for managing real-time synchronization with automatic cleanup
 */
export const useRealtimeSync = (meetingId?: string) => {
  const setupRealtimeListeners = useMeetingStore((state) => state.setupRealtimeListeners);
  const cleanupRealtimeListeners = useMeetingStore((state) => state.cleanupRealtimeListeners);
  const currentMeetingId = useMeetingStore((state) => state.currentMeeting?.meetingId);
  
  const effectiveMeetingId = meetingId || currentMeetingId;

  useEffect(() => {
    if (!effectiveMeetingId) return;

    setupRealtimeListeners(effectiveMeetingId);

    return () => {
      cleanupRealtimeListeners();
    };
  }, [effectiveMeetingId, setupRealtimeListeners, cleanupRealtimeListeners]);

  return {
    isConnected: Boolean(effectiveMeetingId),
    meetingId: effectiveMeetingId,
  };
};

// ============ RECORDING CONTROL HOOKS ============

/**
 * Hook for managing recording state with time tracking
 */
export const useRecording = () => {
  const {
    isRecording,
    isPaused,
    recordingDuration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    updateRecordingDuration,
  } = useMeetingStore(
    (state) => ({
      isRecording: state.isRecording,
      isPaused: state.isPaused,
      recordingDuration: state.recordingDuration,
      startRecording: state.startRecording,
      stopRecording: state.stopRecording,
      pauseRecording: state.pauseRecording,
      resumeRecording: state.resumeRecording,
      updateRecordingDuration: state.updateRecordingDuration,
    }),
    shallow
  );

  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        updateRecordingDuration(recordingDuration + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused, recordingDuration, updateRecordingDuration]);

  const recordingTime = useMemo(() => {
    const hours = Math.floor(recordingDuration / 3600);
    const minutes = Math.floor((recordingDuration % 3600) / 60);
    const seconds = recordingDuration % 60;

    return {
      hours,
      minutes,
      seconds,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    };
  }, [recordingDuration]);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    recordingTime,
    actions: {
      startRecording,
      stopRecording,
      pauseRecording,
      resumeRecording,
    },
  };
};

// ============ ERROR HANDLING HOOKS ============

/**
 * Hook for managing meeting-related errors with auto-clearing
 */
export const useMeetingErrorsHook = () => {
  const {
    meetingError,
    transcriptError,
    clearMeetingError,
    clearTranscriptError,
  } = useMeetingStore(
    (state) => ({
      meetingError: state.meetingError,
      transcriptError: state.transcriptError,
      clearMeetingError: state.clearMeetingError,
      clearTranscriptError: state.clearTranscriptError,
    }),
    shallow
  );

  // Auto-clear errors after a timeout
  useEffect(() => {
    if (meetingError) {
      const timeout = setTimeout(() => {
        clearMeetingError();
      }, 10000); // Clear after 10 seconds

      return () => clearTimeout(timeout);
    }
  }, [meetingError, clearMeetingError]);

  useEffect(() => {
    if (transcriptError) {
      const timeout = setTimeout(() => {
        clearTranscriptError();
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [transcriptError, clearTranscriptError]);

  return {
    meetingError,
    transcriptError,
    hasErrors: Boolean(meetingError || transcriptError),
    actions: {
      clearMeetingError,
      clearTranscriptError,
      clearAllErrors: () => {
        clearMeetingError();
        clearTranscriptError();
      },
    },
  };
};

// ============ MEETING SEARCH AND FILTERS ============

/**
 * Hook for searching and filtering meetings
 */
export const useMeetingSearch = () => {
  const user = useAuthStore((state) => state.user);
  const {
    recentMeetings,
    isLoadingRecentMeetings,
    searchTerm,
    selectedMeetingType,
    dateRange,
    setSearchTerm,
    setMeetingTypeFilter,
    setDateRange,
    searchMeetings,
  } = useMeetingStore(
    (state) => ({
      recentMeetings: state.recentMeetings,
      isLoadingRecentMeetings: state.isLoadingRecentMeetings,
      searchTerm: state.searchTerm,
      selectedMeetingType: state.selectedMeetingType,
      dateRange: state.dateRange,
      setSearchTerm: state.setSearchTerm,
      setMeetingTypeFilter: state.setMeetingTypeFilter,
      setDateRange: state.setDateRange,
      searchMeetings: state.searchMeetings,
    }),
    shallow
  );

  const filteredMeetings = useMemo(() => {
    let filtered = [...recentMeetings];

    if (selectedMeetingType) {
      filtered = filtered.filter(meeting => meeting.type === selectedMeetingType);
    }

    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(meeting => {
        const meetingDate = meeting.startTime;
        if (dateRange.start && meetingDate < dateRange.start) return false;
        if (dateRange.end && meetingDate > dateRange.end) return false;
        return true;
      });
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(meeting =>
        meeting.title.toLowerCase().includes(searchLower) ||
        meeting.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchLower)
        )
      );
    }

    return filtered;
  }, [recentMeetings, selectedMeetingType, dateRange, searchTerm]);

  const performSearch = useCallback(async () => {
    if (!user || !searchTerm.trim()) return [];
    
    return searchMeetings(user.uid, searchTerm);
  }, [user, searchTerm, searchMeetings]);

  return {
    meetings: filteredMeetings,
    isLoading: isLoadingRecentMeetings,
    searchTerm,
    selectedMeetingType,
    dateRange,
    actions: {
      setSearchTerm,
      setMeetingTypeFilter,
      setDateRange,
      performSearch,
    },
  };
};