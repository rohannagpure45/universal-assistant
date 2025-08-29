import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { subscribeWithSelector, devtools } from 'zustand/middleware';

// Enable MapSet plugin for Immer to handle Map and Set objects
enableMapSet();
import type { Unsubscribe } from 'firebase/firestore';
import { 
  Meeting, 
  TranscriptEntry, 
  Participant, 
  SpeakerProfile, 
  MeetingType
} from '@/types';
import { DatabaseService } from '@/services/firebase/DatabaseService';
import { UniversalRealtimeService } from '@/services/firebase/UniversalRealtimeService';
import { dashboardCache } from '@/lib/cache/DashboardCache';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

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
  
  // Required by MeetingStoreInterface
  meetingType: string;
  filteredTranscript: TranscriptEntry[];
  recordingStartTime: Date | null;
  realtimeEnabled: boolean;
  listeners: Set<string>;
  
  // Transcript state
  transcript: TranscriptEntry[];
  isLoadingTranscript: boolean;
  transcriptError: MeetingError | null;
  fragmentBuffer: TranscriptEntry[];
  
  // Participants state - using SpeakerProfile as participants (matching interface)
  participants: SpeakerProfile[];
  connectedParticipants: string[];
  speakerProfiles: SpeakerProfile[];
  activeSpeaker: string | null;
  
  // Meeting management
  recentMeetings: Meeting[];
  isLoadingRecentMeetings: boolean;
  
  // Real-time listeners (internal map for unsubscribers)
  listenerMap: Map<string, Unsubscribe>;
  
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
  addParticipant: (participant: Omit<SpeakerProfile, 'joinTime' | 'speakingTime'>) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<SpeakerProfile>) => void;
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
  
  // Real-time synchronization (required by interface)
  enableRealtimeSync: (meetingId: string) => Promise<void>;
  disableRealtimeSync: () => void;
  
  // Real-time synchronization (internal methods)
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
        
        // Required by interface
        meetingType: '',
        filteredTranscript: [],
        recordingStartTime: null,
        realtimeEnabled: false,
        listeners: new Set(),
        
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
        
        // Internal listener map
        listenerMap: new Map(),
        
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
              state.meetingType = meeting.type || '';
              state.transcript = [];
              state.filteredTranscript = [];
              // Convert Participant[] to SpeakerProfile[] format
              state.participants = meeting.participants.map(p => ({
                speakerId: p.id,
                voiceId: p.voiceProfileId || p.id,
                userName: p.displayName,
                voiceEmbedding: [], // Will be populated by voice identification
                lastSeen: p.joinTime,
                confidence: 0.8, // Default confidence
                sessionCount: 1,
                // Additional properties from Participant
                userId: p.userId,
                displayName: p.displayName,
                role: p.role,
                speakingTime: p.speakingTime || 0,
                voiceProfileId: p.voiceProfileId,
                joinTime: p.joinTime,
                // Computed properties
                speakingPercentage: 0,
                isConnected: true,
                isActive: false,
              }));
              state.recordingStartTime = meeting.startTime;
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
              // Convert Participant[] to SpeakerProfile[] format
              state.participants = meeting.participants.map(p => ({
                speakerId: p.id,
                voiceId: p.voiceProfileId || p.id,
                userName: p.displayName,
                voiceEmbedding: [], // Will be populated by voice identification
                lastSeen: p.joinTime,
                confidence: 0.8, // Default confidence
                sessionCount: 1,
                // Additional properties from Participant
                userId: p.userId,
                displayName: p.displayName,
                role: p.role,
                speakingTime: p.speakingTime || 0,
                voiceProfileId: p.voiceProfileId,
                joinTime: p.joinTime,
                // Computed properties
                speakingPercentage: 0,
                isConnected: true,
                isActive: false,
              }));
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

            // Optimistic update with race-safe de-duplication:
            // If the realtime listener already inserted this id, update it instead of pushing a duplicate.
            set((state) => {
              const existingIndex = state.transcript.findIndex(t => t.id === entryId);
              if (existingIndex !== -1) {
                state.transcript[existingIndex] = { ...state.transcript[existingIndex], ...entry, id: entryId };
                return;
              }

              // Strong duplicate guard: check recent items (last 5 or last 12s) for same speaker + same normalized text
              const normalize = (s: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const nowTs = entry.timestamp instanceof Date ? entry.timestamp.getTime() : new Date(entry.timestamp as any).getTime();
              const recent = state.transcript.slice(-5);
              const dupIdx = recent.findIndex(e => {
                const t = e.timestamp instanceof Date ? e.timestamp.getTime() : new Date(e.timestamp as any).getTime();
                return e.speakerId === entry.speakerId && Math.abs(nowTs - t) <= 12000 && normalize(e.text) === normalize(entry.text);
              });
              if (dupIdx !== -1) {
                // Update confidence/timestamp on the existing recent entry instead of pushing a new one
                const absoluteIndex = state.transcript.length - recent.length + dupIdx;
                state.transcript[absoluteIndex] = {
                  ...state.transcript[absoluteIndex],
                  text: state.transcript[absoluteIndex].text.length >= entry.text.length ? state.transcript[absoluteIndex].text : entry.text,
                  confidence: Math.max(state.transcript[absoluteIndex].confidence ?? 0, entry.confidence ?? 0),
                  timestamp: entry.timestamp,
                } as any;
                return;
              }

              const newEntry = { ...entry, id: entryId };
              state.transcript.push(newEntry);
              state.filteredTranscript.push(newEntry);
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

        // Recent meetings actions with caching
        loadRecentMeetings: async (userId, limit = 20) => {
          set((state) => {
            state.isLoadingRecentMeetings = true;
          });

          try {
            // Use dashboard cache for recent meetings
            const result = await dashboardCache.get(
              `recent-meetings:${userId}:${limit}`,
              () => DatabaseService.getUserMeetings(userId, { limit }),
              'high'
            );

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
          // Cleanup existing listeners
          get().cleanupRealtimeListeners();

          try {
            // Listen to meeting changes
            const meetingUnsubscribe = UniversalRealtimeService.createDocumentListener(
              `meeting-${meetingId}`,
              doc(db, 'meetings', meetingId),
              (meeting: Meeting | null) => {
              set((state) => {
                if (meeting) {
                  state.currentMeeting = meeting;
                  // Convert Participant[] to SpeakerProfile[] format
                  state.participants = meeting.participants?.map(p => ({
                    speakerId: p.id,
                    voiceId: p.voiceProfileId || p.id,
                    userName: p.displayName,
                    voiceEmbedding: [], // Will be populated by voice identification
                    lastSeen: p.joinTime,
                    confidence: 0.8, // Default confidence
                    sessionCount: 1,
                    speakingPercentage: 0,
                    isConnected: true,
                    isActive: false,
                  })) || [];
                }
              });
            });

            // Listen to transcript changes using UniversalRealtimeService
            const transcriptUnsubscribe = UniversalRealtimeService.createListener(
              `transcript-${meetingId}`,
              query(
                collection(db, 'meetings', meetingId, 'transcriptEntries'),
                orderBy('timestamp', 'asc')
              ),
              (entries: TranscriptEntry[]) => {
                set((state) => {
                  // Replace entire transcript with new data
                  state.transcript = entries;
                  state.filteredTranscript = entries;
                });
              }
            );
            

            // Store listeners for cleanup
            set((state) => {
              state.listeners.add('meeting');
              state.listeners.add('transcript');
              state.listenerMap.set('meeting', meetingUnsubscribe);
              state.listenerMap.set('transcript', transcriptUnsubscribe);
            });

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
          const listenerMap = get().listenerMap;
          
          listenerMap.forEach((unsubscribe, key) => {
            try {
              unsubscribe();
            } catch (error) {
              console.error(`Failed to cleanup listener ${key}:`, error);
            }
          });

          // Use set to clear the listeners Map properly with Immer
          set((state) => {
            state.listeners.clear();
            state.listenerMap.clear();
          });
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
            state.meetingType = '';
            state.filteredTranscript = [];
            state.recordingStartTime = null;
            state.realtimeEnabled = false;
            state.listeners.clear();
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

        // Interface-required methods
        enableRealtimeSync: async (meetingId: string) => {
          set((state) => {
            state.realtimeEnabled = true;
            state.listeners.add(meetingId);
          });
          
          // Delegate to existing implementation
          get().setupRealtimeListeners(meetingId);
        },

        disableRealtimeSync: () => {
          set((state) => {
            state.realtimeEnabled = false;
            state.listeners.clear();
          });
          
          // Delegate to existing implementation
          get().cleanupRealtimeListeners();
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
    meetingError: store.meetingError?.message || null,
    meetingType: store.meetingType,
    recordingStartTime: store.recordingStartTime,
    realtimeEnabled: store.realtimeEnabled,
    listeners: store.listeners,
    
    // Transcript state
    transcript: store.transcript,
    filteredTranscript: store.filteredTranscript,
    isLoadingTranscript: store.isLoadingTranscript,
    transcriptError: store.transcriptError?.message || null,
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
    addTranscriptEntry: (entry: TranscriptEntry) => store.addTranscriptEntry(entry),
    updateTranscriptEntry: (id: string, updates: Partial<TranscriptEntry>) => store.updateTranscriptEntry(id, updates),
    addParticipant: store.addParticipant,
    updateParticipant: store.updateParticipant,
    startRecording: store.startRecording,
    stopRecording: store.stopRecording,
    setMeetingError: (error: string | null) => store.setMeetingError(error ? { code: 'USER_ERROR', message: error, operation: 'user' } : null),
    setTranscriptError: (error: string | null) => store.setTranscriptError(error ? { code: 'USER_ERROR', message: error, operation: 'user' } : null),
    enableRealtimeSync: store.enableRealtimeSync,
    disableRealtimeSync: store.disableRealtimeSync,
    resetMeetingState: store.resetMeetingState,
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