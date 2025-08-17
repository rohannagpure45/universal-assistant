/**
 * Meeting Participants Management Hooks
 * 
 * Specialized hooks for participant management, speaker tracking,
 * and voice profile handling.
 */

import { useMeetingStore } from '../../meetingStore';

/**
 * Hook for participant management
 */
export const useMeetingParticipants = () => {
  return useMeetingStore((state) => ({
    // Participant state
    participants: state.participants,
    connectedParticipants: state.connectedParticipants,
    activeSpeaker: state.activeSpeaker,
    
    // Participant actions
    addParticipant: state.addParticipant,
    removeParticipant: state.removeParticipant,
    updateParticipant: state.updateParticipant,
    setActiveSpeaker: state.setActiveSpeaker,
  }));
};

/**
 * Hook for speaker profile management
 */
export const useSpeakerProfiles = () => {
  return useMeetingStore((state) => ({
    speakerProfiles: state.speakerProfiles,
    updateSpeakerProfile: state.updateSpeakerProfile,
    getSpeakerProfile: (speakerId: string) => {
      return state.speakerProfiles.find(profile => profile.speakerId === speakerId);
    },
  }));
};

/**
 * Hook for participant statistics
 */
export const useParticipantStats = () => {
  return useMeetingStore((state) => {
    const participants = state.participants;
    const transcript = state.transcript;
    
    // Calculate speaking time for each participant
    const participantStats = participants.map(participant => {
      const participantEntries = transcript.filter(entry => entry.speakerId === participant.voiceProfileId);
      const speakingTime = participantEntries.reduce((total, entry) => {
        // Estimate speaking time based on text length (rough calculation)
        const wordsPerMinute = 150; // Average speaking rate
        const words = entry.text.split(' ').length;
        const timeInMinutes = words / wordsPerMinute;
        return total + (timeInMinutes * 60 * 1000); // Convert to milliseconds
      }, 0);
      
      return {
        ...participant,
        speakingTime,
        entryCount: participantEntries.length,
        wordCount: participantEntries.reduce((total, entry) => total + entry.text.split(' ').length, 0),
        averageConfidence: participantEntries.length > 0
          ? participantEntries.reduce((total, entry) => total + entry.confidence, 0) / participantEntries.length
          : 0,
      };
    });
    
    return {
      totalParticipants: participants.length,
      connectedCount: state.connectedParticipants.length,
      activeSpeaker: state.activeSpeaker,
      participantStats,
      mostActiveParticipant: participantStats.reduce((most, current) => 
        current.speakingTime > most.speakingTime ? current : most, 
        participantStats[0] || null
      ),
    };
  });
};

/**
 * Hook for current speaker tracking
 */
export const useCurrentSpeaker = () => {
  return useMeetingStore((state) => {
    const activeSpeakerId = state.activeSpeaker;
    const activeSpeaker = activeSpeakerId 
      ? state.participants.find(p => p.voiceProfileId === activeSpeakerId)
      : null;
    
    return {
      activeSpeakerId,
      activeSpeaker,
      setActiveSpeaker: state.setActiveSpeaker,
      isCurrentlySpeaking: Boolean(activeSpeaker),
    };
  });
};