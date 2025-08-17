/**
 * Meeting Transcript Management Hooks
 * 
 * Specialized hooks for transcript operations, fragment processing,
 * and real-time transcript updates.
 */

import { useMeetingStore } from '../../meetingStore';

/**
 * Hook for transcript management
 */
export const useMeetingTranscript = () => {
  return useMeetingStore((state) => ({
    // Transcript state
    transcript: state.transcript,
    isLoadingTranscript: state.isLoadingTranscript,
    transcriptError: state.transcriptError,
    fragmentBuffer: state.fragmentBuffer,
    
    // Transcript actions
    addTranscriptEntry: state.addTranscriptEntry,
    updateTranscriptEntry: state.updateTranscriptEntry,
    deleteTranscriptEntry: state.deleteTranscriptEntry,
    
    // Fragment processing
    addFragmentToBuffer: state.addFragmentToBuffer,
    processFragmentBuffer: state.processFragmentBuffer,
    clearFragmentBuffer: state.clearFragmentBuffer,
    
    // Error management
    clearTranscriptError: state.clearTranscriptError,
    setTranscriptError: state.setTranscriptError,
  }));
};

/**
 * Hook for real-time transcript updates
 */
export const useTranscriptRealtime = () => {
  return useMeetingStore((state) => ({
    transcript: state.transcript,
    fragmentBuffer: state.fragmentBuffer,
    setupRealtimeListeners: state.setupRealtimeListeners,
    cleanupRealtimeListeners: state.cleanupRealtimeListeners,
    listeners: state.listeners,
  }));
};

/**
 * Hook for transcript statistics
 */
export const useTranscriptStats = () => {
  return useMeetingStore((state) => {
    const transcript = state.transcript;
    const speakerStats = transcript.reduce((acc, entry) => {
      if (!acc[entry.speakerId]) {
        acc[entry.speakerId] = {
          entryCount: 0,
          wordCount: 0,
          totalConfidence: 0,
        };
      }
      
      acc[entry.speakerId].entryCount++;
      acc[entry.speakerId].wordCount += entry.text.split(' ').length;
      acc[entry.speakerId].totalConfidence += entry.confidence;
      
      return acc;
    }, {} as Record<string, { entryCount: number; wordCount: number; totalConfidence: number }>);
    
    return {
      totalEntries: transcript.length,
      totalWords: transcript.reduce((total, entry) => total + entry.text.split(' ').length, 0),
      averageConfidence: transcript.length > 0 
        ? transcript.reduce((total, entry) => total + entry.confidence, 0) / transcript.length 
        : 0,
      speakerStats: Object.entries(speakerStats).map(([speakerId, stats]) => ({
        speakerId,
        entryCount: stats.entryCount,
        wordCount: stats.wordCount,
        averageConfidence: stats.totalConfidence / stats.entryCount,
      })),
    };
  });
};

/**
 * Hook for transcript search and filtering
 */
export const useTranscriptSearch = () => {
  return useMeetingStore((state) => ({
    transcript: state.transcript,
    searchTranscript: (searchTerm: string) => {
      return state.transcript.filter(entry =>
        entry.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.speaker.toLowerCase().includes(searchTerm.toLowerCase())
      );
    },
    getTranscriptBySpeaker: (speakerId: string) => {
      return state.transcript.filter(entry => entry.speakerId === speakerId);
    },
    getTranscriptByTimeRange: (startTime: Date, endTime: Date) => {
      return state.transcript.filter(entry => 
        entry.timestamp >= startTime && entry.timestamp <= endTime
      );
    },
  }));
};