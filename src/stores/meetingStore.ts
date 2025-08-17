import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import type { Unsubscribe } from 'firebase/firestore';
import { 
  Meeting, 
  TranscriptEntry, 
  Participant, 
  SpeakerProfile, 
  MeetingType,
  CustomRule 
} from '@/types';
import { DatabaseService } from '@/services/firebase/DatabaseService';
import { RealtimeService } from '@/services/firebase/RealtimeService';
import type { 
  RealtimeUpdate, 
  DocumentChange 
} from '@/services/firebase/RealtimeService';

// Meeting-specific error types
export interface MeetingError {
  code: string;
  message: string;
  operation: string;
  cause?: Error;
}

// Meeting store state interface
export interface MeetingState {
  // Current meeting state
  currentMeeting: Meeting | null;
  isInMeeting: boolean;
  isLoadingMeeting: boolean;
  meetingError: MeetingError | null;
  
  // Transcript state
  transcript: TranscriptEntry[];
  isLoadingTranscript: boolean;
  transcriptError: MeetingError | null;
  fragmentBuffer: TranscriptEntry[];
  
  // Participants state
  participants: Participant[];
  connectedParticipants: string[];
  speakerProfiles: SpeakerProfile[];
  activeSpeaker: string | null;
  
  // Meeting management
  recentMeetings: Meeting[];
  isLoadingRecentMeetings: boolean;
  
  // Real-time listeners
  listeners: Map<string, Unsubscribe>;
  
  // UI state
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  
  // Search and filters
  searchTerm: string;
  selectedMeetingType: MeetingType | null;
  dateRange: { start: Date | null; end: Date | null };
}

// Meeting store actions interface
export interface MeetingActions {
  // Meeting management
  startMeeting: (meetingData: Omit<Meeting, 'meetingId' | 'transcript' | 'startTime'>) => Promise<string | null>;
  endMeeting: (meetingId?: string) => Promise<boolean>;
  joinMeeting: (meetingId: string) => Promise<boolean>;
  leaveMeeting: () => Promise<boolean>;
  loadMeeting: (meetingId: string) => Promise<boolean>;
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => Promise<boolean>;
  deleteMeeting: (meetingId: string) => Promise<boolean>;
  
  // Transcript management
  addTranscriptEntry: (entry: Omit<TranscriptEntry, 'id'>) => Promise<string | null>;
  updateTranscriptEntry: (entryId: string, updates: Partial<TranscriptEntry>) => Promise<boolean>;
  deleteTranscriptEntry: (entryId: string) => Promise<boolean>;
  addFragmentToBuffer: (fragment: TranscriptEntry) => void;
  processFragmentBuffer: () => Promise<void>;
  clearFragmentBuffer: () => void;
  
  // Participant management
  addParticipant: (participant: Omit<Participant, 'joinTime' | 'speakingTime'>) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<Participant>) => void;
  setActiveSpeaker: (speakerId: string | null) => void;
  updateSpeakerProfile: (profile: SpeakerProfile) => void;
  
  // Recent meetings
  loadRecentMeetings: (userId: string, limit?: number) => Promise<boolean>;
  refreshRecentMeetings: () => Promise<boolean>;
  
  // Recording controls
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  updateRecordingDuration: (duration: number) => void;
  
  // Real-time synchronization
  setupRealtimeListeners: (meetingId: string) => void;
  cleanupRealtimeListeners: () => void;
  
  // Search and filters
  setSearchTerm: (term: string) => void;
  setMeetingTypeFilter: (type: MeetingType | null) => void;
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  searchMeetings: (userId: string, searchTerm: string) => Promise<Meeting[]>;
  
  // State management
  clearMeetingError: () => void;
  clearTranscriptError: () => void;
  resetMeetingState: () => void;
  setMeetingError: (error: MeetingError | null) => void;
  setTranscriptError: (error: MeetingError | null) => void;
}

type MeetingStore = MeetingState & MeetingActions;

export const useMeetingStore = create<MeetingStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        currentMeeting: null,
        isInMeeting: false,
        isLoadingMeeting: false,
        meetingError: null,
        
        transcript: [],
        isLoadingTranscript: false,
        transcriptError: null,
        fragmentBuffer: [],
        
        participants: [],
        connectedParticipants: [],
        speakerProfiles: [],
        activeSpeaker: null,
        
        recentMeetings: [],
        isLoadingRecentMeetings: false,
        
        listeners: new Map(),
        
        isRecording: false,
        isPaused: false,
        recordingDuration: 0,
        
        searchTerm: '',
        selectedMeetingType: null,
        dateRange: { start: null, end: null },

        // Meeting management actions
        startMeeting: async (meetingData) => {
          set((state) => {
            state.isLoadingMeeting = true;
            state.meetingError = null;
          });

          try {
            const meetingId = await DatabaseService.createMeeting({
              ...meetingData,
              startTime: new Date(),
              transcript: [],
              notes: [],
              keywords: [],
              appliedRules: []
            });

            const meeting = await DatabaseService.getMeeting(meetingId);
            if (!meeting) {
              throw new Error('Failed to retrieve created meeting');
            }

            set((state) => {
              state.currentMeeting = meeting;
              state.isInMeeting = true;
              state.isLoadingMeeting = false;
              state.transcript = [];
              state.participants = meeting.participants;
            });

            // Setup real-time listeners
            get().setupRealtimeListeners(meetingId);

            return meetingId;
          } catch (error) {
            const meetingError: MeetingError = {
              code: 'MEETING_START_FAILED',
              message: 'Failed to start meeting',
              operation: 'startMeeting',
              cause: error as Error
            };

            set((state) => {
              state.meetingError = meetingError;
              state.isLoadingMeeting = false;
            });

            return null;
          }
        },

        endMeeting: async (meetingId) => {
          const currentMeetingId = meetingId || get().currentMeeting?.meetingId;
          if (!currentMeetingId) return false;

          try {
            await DatabaseService.updateMeeting(currentMeetingId, {
              endTime: new Date()
            });

            set((state) => {
              state.isInMeeting = false;
              state.isRecording = false;
              state.isPaused = false;
              state.recordingDuration = 0;
            });

            // Cleanup listeners
            get().cleanupRealtimeListeners();

            return true;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'MEETING_END_FAILED',
                message: 'Failed to end meeting',
                operation: 'endMeeting',
                cause: error as Error
              };
            });

            return false;
          }
        },

        joinMeeting: async (meetingId) => {
          set((state) => {
            state.isLoadingMeeting = true;
            state.meetingError = null;
          });

          try {
            const meeting = await DatabaseService.getMeeting(meetingId);
            if (!meeting) {
              throw new Error('Meeting not found');
            }

            // Load transcript
            const transcriptResult = await DatabaseService.getTranscriptEntries(meetingId);
            
            set((state) => {
              state.currentMeeting = meeting;
              state.isInMeeting = true;
              state.isLoadingMeeting = false;
              state.transcript = transcriptResult.data;
              state.participants = meeting.participants;
            });

            // Setup real-time listeners
            get().setupRealtimeListeners(meetingId);

            return true;
          } catch (error) {
            const meetingError: MeetingError = {
              code: 'MEETING_JOIN_FAILED',
              message: 'Failed to join meeting',
              operation: 'joinMeeting',
              cause: error as Error
            };

            set((state) => {
              state.meetingError = meetingError;
              state.isLoadingMeeting = false;
            });

            return false;
          }
        },

        leaveMeeting: async () => {
          try {
            get().cleanupRealtimeListeners();

            set((state) => {
              state.currentMeeting = null;
              state.isInMeeting = false;
              state.transcript = [];
              state.participants = [];
              state.activeSpeaker = null;
              state.isRecording = false;
              state.isPaused = false;
              state.recordingDuration = 0;
              state.fragmentBuffer = [];
            });

            return true;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'MEETING_LEAVE_FAILED',
                message: 'Failed to leave meeting',
                operation: 'leaveMeeting',
                cause: error as Error
              };
            });

            return false;
          }
        },

        loadMeeting: async (meetingId) => {
          set((state) => {
            state.isLoadingMeeting = true;
            state.meetingError = null;
          });

          try {
            const meeting = await DatabaseService.getMeeting(meetingId);
            if (!meeting) {
              throw new Error('Meeting not found');
            }

            set((state) => {
              state.currentMeeting = meeting;
              state.isLoadingMeeting = false;
            });

            return true;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'MEETING_LOAD_FAILED',
                message: 'Failed to load meeting',
                operation: 'loadMeeting',
                cause: error as Error
              };
              state.isLoadingMeeting = false;
            });

            return false;
          }
        },

        updateMeeting: async (meetingId, updates) => {
          try {
            await DatabaseService.updateMeeting(meetingId, updates);

            set((state) => {
              if (state.currentMeeting?.meetingId === meetingId) {
                state.currentMeeting = { ...state.currentMeeting, ...updates };
              }
            });

            return true;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'MEETING_UPDATE_FAILED',
                message: 'Failed to update meeting',
                operation: 'updateMeeting',
                cause: error as Error
              };
            });

            return false;
          }
        },

        deleteMeeting: async (meetingId) => {
          try {
            await DatabaseService.deleteMeeting(meetingId);

            set((state) => {
              if (state.currentMeeting?.meetingId === meetingId) {
                state.currentMeeting = null;
                state.isInMeeting = false;
              }
              state.recentMeetings = state.recentMeetings.filter(
                meeting => meeting.meetingId !== meetingId
              );
            });

            return true;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'MEETING_DELETE_FAILED',
                message: 'Failed to delete meeting',
                operation: 'deleteMeeting',
                cause: error as Error
              };
            });

            return false;
          }
        },

        // Transcript management actions
        addTranscriptEntry: async (entry) => {
          const meetingId = get().currentMeeting?.meetingId;
          if (!meetingId) return null;

          try {
            const entryId = await DatabaseService.addTranscriptEntry(meetingId, entry);

            // Optimistic update - the real-time listener will handle the final state
            set((state) => {
              state.transcript.push({ ...entry, id: entryId });
            });

            return entryId;
          } catch (error) {
            set((state) => {
              state.transcriptError = {
                code: 'TRANSCRIPT_ADD_FAILED',
                message: 'Failed to add transcript entry',
                operation: 'addTranscriptEntry',
                cause: error as Error
              };
            });

            return null;
          }
        },

        updateTranscriptEntry: async (entryId, updates) => {
          const meetingId = get().currentMeeting?.meetingId;
          if (!meetingId) return false;

          try {
            await DatabaseService.updateTranscriptEntry(meetingId, entryId, updates);

            // Optimistic update
            set((state) => {
              const index = state.transcript.findIndex(entry => entry.id === entryId);
              if (index !== -1) {
                state.transcript[index] = { ...state.transcript[index], ...updates };
              }
            });

            return true;
          } catch (error) {
            set((state) => {
              state.transcriptError = {
                code: 'TRANSCRIPT_UPDATE_FAILED',
                message: 'Failed to update transcript entry',
                operation: 'updateTranscriptEntry',
                cause: error as Error
              };
            });

            return false;
          }
        },

        deleteTranscriptEntry: async (entryId) => {
          const meetingId = get().currentMeeting?.meetingId;
          if (!meetingId) return false;

          try {
            await DatabaseService.deleteTranscriptEntry(meetingId, entryId);

            // Optimistic update
            set((state) => {
              state.transcript = state.transcript.filter(entry => entry.id !== entryId);
            });

            return true;
          } catch (error) {
            set((state) => {
              state.transcriptError = {
                code: 'TRANSCRIPT_DELETE_FAILED',
                message: 'Failed to delete transcript entry',
                operation: 'deleteTranscriptEntry',
                cause: error as Error
              };
            });

            return false;
          }
        },

        addFragmentToBuffer: (fragment) => {
          set((state) => {
            state.fragmentBuffer.push(fragment);
          });
        },

        processFragmentBuffer: async () => {
          const buffer = get().fragmentBuffer;
          if (buffer.length === 0) return;

          // Process fragments - combine incomplete fragments with the same speaker
          const processedFragments: TranscriptEntry[] = [];
          let currentFragment: TranscriptEntry | null = null;

          for (const fragment of buffer) {
            if (currentFragment && 
                currentFragment.speakerId === fragment.speakerId && 
                !currentFragment.isComplete && 
                !fragment.isComplete) {
              // Combine fragments from the same speaker
              currentFragment.text += ' ' + fragment.text;
              currentFragment.timestamp = fragment.timestamp;
              currentFragment.confidence = Math.min(currentFragment.confidence, fragment.confidence);
            } else {
              if (currentFragment) {
                processedFragments.push(currentFragment);
              }
              currentFragment = { ...fragment };
            }
          }

          if (currentFragment) {
            processedFragments.push(currentFragment);
          }

          // Add processed fragments to transcript
          for (const fragment of processedFragments) {
            if (fragment.isComplete || fragment.text.trim().length > 0) {
              await get().addTranscriptEntry(fragment);
            }
          }

          get().clearFragmentBuffer();
        },

        clearFragmentBuffer: () => {
          set((state) => {
            state.fragmentBuffer = [];
          });
        },

        // Participant management actions
        addParticipant: (participant) => {
          set((state) => {
            const existingParticipant = state.participants.find(p => p.userId === participant.userId);
            if (!existingParticipant) {
              state.participants.push({
                ...participant,
                joinTime: new Date(),
                speakingTime: 0
              });
            }
          });
        },

        removeParticipant: (userId) => {
          set((state) => {
            state.participants = state.participants.filter(p => p.userId !== userId);
            state.connectedParticipants = state.connectedParticipants.filter(id => id !== userId);
            if (state.activeSpeaker === userId) {
              state.activeSpeaker = null;
            }
          });
        },

        updateParticipant: (userId, updates) => {
          set((state) => {
            const index = state.participants.findIndex(p => p.userId === userId);
            if (index !== -1) {
              state.participants[index] = { ...state.participants[index], ...updates };
            }
          });
        },

        setActiveSpeaker: (speakerId) => {
          set((state) => {
            state.activeSpeaker = speakerId;
          });
        },

        updateSpeakerProfile: (profile) => {
          set((state) => {
            const index = state.speakerProfiles.findIndex(p => p.speakerId === profile.speakerId);
            if (index !== -1) {
              state.speakerProfiles[index] = profile;
            } else {
              state.speakerProfiles.push(profile);
            }
          });
        },

        // Recent meetings actions
        loadRecentMeetings: async (userId, limit = 20) => {
          set((state) => {
            state.isLoadingRecentMeetings = true;
          });

          try {
            const result = await DatabaseService.getUserMeetings(userId, { limit });

            set((state) => {
              state.recentMeetings = result.data;
              state.isLoadingRecentMeetings = false;
            });

            return true;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'RECENT_MEETINGS_LOAD_FAILED',
                message: 'Failed to load recent meetings',
                operation: 'loadRecentMeetings',
                cause: error as Error
              };
              state.isLoadingRecentMeetings = false;
            });

            return false;
          }
        },

        refreshRecentMeetings: async () => {
          const userId = get().currentMeeting?.hostId;
          if (!userId) return false;

          return get().loadRecentMeetings(userId);
        },

        // Recording controls
        startRecording: () => {
          set((state) => {
            state.isRecording = true;
            state.isPaused = false;
          });
        },

        stopRecording: () => {
          set((state) => {
            state.isRecording = false;
            state.isPaused = false;
            state.recordingDuration = 0;
          });
        },

        pauseRecording: () => {
          set((state) => {
            state.isPaused = true;
          });
        },

        resumeRecording: () => {
          set((state) => {
            state.isPaused = false;
          });
        },

        updateRecordingDuration: (duration) => {
          set((state) => {
            state.recordingDuration = duration;
          });
        },

        // Real-time synchronization
        setupRealtimeListeners: (meetingId) => {
          const listeners = get().listeners;

          // Cleanup existing listeners
          get().cleanupRealtimeListeners();

          try {
            // Listen to meeting changes
            const meetingListener = RealtimeService.listenToMeeting(meetingId, (meeting) => {
              set((state) => {
                if (meeting) {
                  state.currentMeeting = meeting;
                  state.participants = meeting.participants;
                }
              });
            });

            // Listen to transcript changes
            const transcriptListener = RealtimeService.listenToTranscriptEntries(
              meetingId,
              (update: RealtimeUpdate<TranscriptEntry>) => {
                set((state) => {
                  // Process changes
                  update.changes.forEach((change) => {
                    switch (change.type) {
                      case 'added':
                        const existingIndex = state.transcript.findIndex(
                          entry => entry.id === change.doc.id
                        );
                        if (existingIndex === -1) {
                          state.transcript.push(change.doc);
                        }
                        break;
                      case 'modified':
                        const modifyIndex = state.transcript.findIndex(
                          entry => entry.id === change.doc.id
                        );
                        if (modifyIndex !== -1) {
                          state.transcript[modifyIndex] = change.doc;
                        }
                        break;
                      case 'removed':
                        state.transcript = state.transcript.filter(
                          entry => entry.id !== change.doc.id
                        );
                        break;
                    }
                  });

                  // Sort transcript by timestamp
                  state.transcript.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                });
              }
            );

            // Store listeners for cleanup
            listeners.set('meeting', meetingListener);
            listeners.set('transcript', transcriptListener);

          } catch (error) {
            console.error('Failed to setup real-time listeners:', error);
            set((state) => {
              state.meetingError = {
                code: 'REALTIME_SETUP_FAILED',
                message: 'Failed to setup real-time listeners',
                operation: 'setupRealtimeListeners',
                cause: error as Error
              };
            });
          }
        },

        cleanupRealtimeListeners: () => {
          const listeners = get().listeners;
          
          listeners.forEach((unsubscribe, key) => {
            try {
              unsubscribe();
            } catch (error) {
              console.error(`Failed to cleanup listener ${key}:`, error);
            }
          });

          listeners.clear();
        },

        // Search and filters
        setSearchTerm: (term) => {
          set((state) => {
            state.searchTerm = term;
          });
        },

        setMeetingTypeFilter: (type) => {
          set((state) => {
            state.selectedMeetingType = type;
          });
        },

        setDateRange: (range) => {
          set((state) => {
            state.dateRange = range;
          });
        },

        searchMeetings: async (userId, searchTerm) => {
          try {
            const result = await DatabaseService.searchMeetings(userId, searchTerm);
            return result.data;
          } catch (error) {
            set((state) => {
              state.meetingError = {
                code: 'MEETING_SEARCH_FAILED',
                message: 'Failed to search meetings',
                operation: 'searchMeetings',
                cause: error as Error
              };
            });
            return [];
          }
        },

        // State management
        clearMeetingError: () => {
          set((state) => {
            state.meetingError = null;
          });
        },

        clearTranscriptError: () => {
          set((state) => {
            state.transcriptError = null;
          });
        },

        resetMeetingState: () => {
          get().cleanupRealtimeListeners();

          set((state) => {
            state.currentMeeting = null;
            state.isInMeeting = false;
            state.isLoadingMeeting = false;
            state.meetingError = null;
            state.transcript = [];
            state.isLoadingTranscript = false;
            state.transcriptError = null;
            state.fragmentBuffer = [];
            state.participants = [];
            state.connectedParticipants = [];
            state.speakerProfiles = [];
            state.activeSpeaker = null;
            state.isRecording = false;
            state.isPaused = false;
            state.recordingDuration = 0;
          });
        },

        setMeetingError: (error) => {
          set((state) => {
            state.meetingError = error;
          });
        },

        setTranscriptError: (error) => {
          set((state) => {
            state.transcriptError = error;
          });
        },
      }))
    ),
    { name: 'meeting-store' }
  )
);

// Derived selectors for convenience
export const useMeeting = () => {
  const store = useMeetingStore();
  return {
    // Meeting state
    currentMeeting: store.currentMeeting,
    isInMeeting: store.isInMeeting,
    isLoadingMeeting: store.isLoadingMeeting,
    meetingError: store.meetingError,
    
    // Transcript state
    transcript: store.transcript,
    isLoadingTranscript: store.isLoadingTranscript,
    transcriptError: store.transcriptError,
    fragmentBuffer: store.fragmentBuffer,
    
    // Participants
    participants: store.participants,
    activeSpeaker: store.activeSpeaker,
    
    // Recording state
    isRecording: store.isRecording,
    isPaused: store.isPaused,
    recordingDuration: store.recordingDuration,
    
    // Actions
    startMeeting: store.startMeeting,
    endMeeting: store.endMeeting,
    joinMeeting: store.joinMeeting,
    leaveMeeting: store.leaveMeeting,
    addTranscriptEntry: store.addTranscriptEntry,
    startRecording: store.startRecording,
    stopRecording: store.stopRecording,
    pauseRecording: store.pauseRecording,
    resumeRecording: store.resumeRecording,
    clearMeetingError: store.clearMeetingError,
    clearTranscriptError: store.clearTranscriptError,
  };
};

// Selector hooks for specific state
export const useCurrentMeeting = () => useMeetingStore((state) => state.currentMeeting);
export const useMeetingTranscript = () => useMeetingStore((state) => state.transcript);
export const useMeetingParticipants = () => useMeetingStore((state) => state.participants);
export const useMeetingRecordingState = () => useMeetingStore((state) => ({
  isRecording: state.isRecording,
  isPaused: state.isPaused,
  recordingDuration: state.recordingDuration,
}));
export const useMeetingErrors = () => useMeetingStore((state) => ({
  meetingError: state.meetingError,
  transcriptError: state.transcriptError,
}));
export const useRecentMeetings = () => useMeetingStore((state) => ({
  meetings: state.recentMeetings,
  isLoading: state.isLoadingRecentMeetings,
}));

// Performance-optimized selectors
export const useMeetingLoadingStates = () => useMeetingStore((state) => ({
  isLoadingMeeting: state.isLoadingMeeting,
  isLoadingTranscript: state.isLoadingTranscript,
  isLoadingRecentMeetings: state.isLoadingRecentMeetings,
}));

// Cleanup on unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useMeetingStore.getState().cleanupRealtimeListeners();
  });
}