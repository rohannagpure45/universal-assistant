'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageErrorBoundary } from '@/components/error-boundaries/PageErrorBoundary';
import { useRouter } from 'next/navigation';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Users, 
  Clock, 
  Volume2, 
  VolumeX,
  Settings,
  ArrowLeft,
  Phone,
  PhoneOff
} from 'lucide-react';

// Store and service imports
import { useMeetingActions, useMeetingState, useRecording, useTranscript, useParticipants } from '@/stores/hooks/useMeetingHooks';
import { useAuth } from '@/hooks/useAuth';
import { UniversalAssistantCoordinator, createUniversalAssistantCoordinator, type UniversalAssistantConfig } from '@/services/universal-assistant/UniversalAssistantCoordinator';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAppStore } from '@/stores/appStore';

// Component imports
import { MeetingTypeSelector } from '@/components/meeting/MeetingTypeSelector';
import { CreateMeetingTypeModal } from '@/components/meeting/CreateMeetingTypeModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';

// Type imports
import type { MeetingTypeConfig } from '@/types/database';
import type { Meeting, MeetingType } from '@/types';

interface MeetingSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMeeting: (title: string, meetingType: MeetingTypeConfig) => Promise<void>;
  isStarting: boolean;
}

const MeetingSetupModal: React.FC<MeetingSetupModalProps> = ({
  isOpen,
  onClose,
  onStartMeeting,
  isStarting
}) => {
  const [title, setTitle] = useState('');
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingTypeConfig | null>(null);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMeetingType || isStarting) return;
    
    await onStartMeeting(title.trim(), selectedMeetingType);
  };

  const handleMeetingTypeCreated = (meetingType: MeetingTypeConfig) => {
    setSelectedMeetingType(meetingType);
    setShowCreateTypeModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Start New Meeting
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter meeting title..."
                disabled={isStarting}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Type
              </label>
              <MeetingTypeSelector
                selectedMeetingType={selectedMeetingType}
                onMeetingTypeChange={setSelectedMeetingType}
                onCreateMeetingType={() => setShowCreateTypeModal(true)}
                required
                disabled={isStarting}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isStarting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || !selectedMeetingType || isStarting}
                className="flex items-center space-x-2"
              >
                {isStarting && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>{isStarting ? 'Starting...' : 'Start Meeting'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>

      <CreateMeetingTypeModal
        isOpen={showCreateTypeModal}
        onClose={() => setShowCreateTypeModal(false)}
        onMeetingTypeCreated={handleMeetingTypeCreated}
      />
    </>
  );
};

interface MeetingControlsProps {
  onEndMeeting: () => Promise<void>;
  isEnding: boolean;
}

const MeetingControls: React.FC<MeetingControlsProps> = ({
  onEndMeeting,
  isEnding
}) => {
  const { isRecording, recordingTime, actions: recordingActions } = useRecording();
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const handleToggleRecording = () => {
    if (isRecording) {
      recordingActions.pauseRecording();
    } else {
      recordingActions.startRecording();
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      {/* Recording Timer */}
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
          {recordingTime.formatted}
        </span>
      </div>

      {/* Recording Control */}
      <Button
        onClick={handleToggleRecording}
        variant={isRecording ? "danger" : "primary"}
        size="lg"
        className="flex items-center space-x-2"
      >
        {isRecording ? (
          <>
            <Pause className="w-5 h-5" />
            <span>Pause</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span>Record</span>
          </>
        )}
      </Button>

      {/* Mute Control */}
      <Button
        onClick={() => setIsMuted(!isMuted)}
        variant={isMuted ? "danger" : "outline"}
        size="lg"
        className="flex items-center space-x-2"
      >
        {isMuted ? (
          <>
            <MicOff className="w-5 h-5" />
            <span>Muted</span>
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            <span>Live</span>
          </>
        )}
      </Button>

      {/* End Meeting */}
      <Button
        onClick={onEndMeeting}
        variant="danger"
        size="lg"
        disabled={isEnding}
        className="flex items-center space-x-2"
      >
        {isEnding ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            <span>Ending...</span>
          </>
        ) : (
          <>
            <PhoneOff className="w-5 h-5" />
            <span>End Meeting</span>
          </>
        )}
      </Button>
    </div>
  );
};

interface TranscriptDisplayProps {}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = () => {
  const { transcript, transcriptAnalytics } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length]);

  return (
    <Card className="h-64 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Live Transcript
          </h3>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{transcript.length} entries</span>
            <span>{transcriptAnalytics.speakers} speakers</span>
            <span>{(transcriptAnalytics.averageConfidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>
      </div>

      <div 
        ref={transcriptRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {transcript.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Transcript will appear here as you speak...</p>
          </div>
        ) : (
          transcript.map((entry, index) => (
            <div key={entry.id || index} className="flex space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  {entry.speaker?.charAt(0) || 'S'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {entry.speaker || 'Unknown Speaker'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  {!entry.isComplete && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      (partial)
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {entry.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

interface ParticipantsDisplayProps {}

const ParticipantsDisplay: React.FC<ParticipantsDisplayProps> = () => {
  const { participants, activeSpeaker, participantAnalytics } = useParticipants();

  return (
    <Card className="h-64">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Participants
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{participantAnalytics.totalParticipants}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto max-h-48">
        {participants.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No participants yet...</p>
          </div>
        ) : (
          participants.map((participant) => {
            const stats = participantAnalytics.participantStats.find(
              s => s.userId === participant.userId
            );
            return (
              <div
                key={participant.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  activeSpeaker === participant.userId
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    stats?.isConnected 
                      ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }`}>
                    {participant.displayName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {participant.displayName || 'Unknown Participant'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {participant.role} • {stats?.speakingPercentage.toFixed(0)}% speaking time
                    </p>
                  </div>
                </div>
                
                {activeSpeaker === participant.userId && (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium">Speaking</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

function MeetingPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Meeting state and actions
  const meetingActions = useMeetingActions();
  const { currentMeeting, isInMeeting, isLoadingMeeting, meetingStats } = useMeetingState();
  
  // Local state
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  
  // Universal Assistant integration with proper error handling
  const universalAssistantRef = useRef<UniversalAssistantCoordinator | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const initializingRef = useRef<boolean>(false);
  
  // Store references - avoid direct store usage in effects
  const meetingStoreRef = useRef(useMeetingStore);
  const appStoreRef = useRef(useAppStore);

  // Initialize Universal Assistant when meeting starts with proper race condition handling
  useEffect(() => {
    if (isInMeeting && currentMeeting && !universalAssistantRef.current && !initializingRef.current) {
      initializingRef.current = true;
      setAssistantError(null);

      const initializeAssistant = async () => {
        try {
          const config: UniversalAssistantConfig = {
            model: 'gpt-4o-mini',
            maxTokens: 1000,
            voiceId: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
            ttsSpeed: 1.0,
            enableConcurrentProcessing: true,
            enableSpeakerIdentification: true
          };

          universalAssistantRef.current = createUniversalAssistantCoordinator(
            config,
            meetingStoreRef.current,
            appStoreRef.current
          );

          // Start recording with Universal Assistant
          await universalAssistantRef.current.startRecording(currentMeeting);
          console.log('Universal Assistant initialized successfully');
        } catch (error) {
          console.error('Failed to start Universal Assistant recording:', error);
          setAssistantError(error instanceof Error ? error.message : 'Failed to initialize assistant');
          
          // Clean up on error
          if (universalAssistantRef.current) {
            universalAssistantRef.current.cleanup();
            universalAssistantRef.current = null;
          }
        } finally {
          initializingRef.current = false;
        }
      };

      initializeAssistant();
    }

    // Cleanup when meeting ends or component changes
    if (!isInMeeting && universalAssistantRef.current) {
      console.log('Cleaning up Universal Assistant due to meeting end');
      universalAssistantRef.current.cleanup();
      universalAssistantRef.current = null;
      initializingRef.current = false;
      setAssistantError(null);
    }
  }, [isInMeeting, currentMeeting?.meetingId]); // Use meetingId to prevent unnecessary re-renders

  // Cleanup Universal Assistant when component unmounts
  useEffect(() => {
    return () => {
      if (universalAssistantRef.current) {
        console.log('Cleaning up Universal Assistant on component unmount');
        universalAssistantRef.current.cleanup();
        universalAssistantRef.current = null;
      }
      initializingRef.current = false;
    };
  }, []);

  const handleStartMeeting = useCallback(async (title: string, meetingType: MeetingTypeConfig) => {
    if (!user || isStartingMeeting) return;

    setIsStartingMeeting(true);
    setAssistantError(null);
    
    try {
      console.log('Starting meeting:', { title, meetingType: meetingType.name });
      
      const meetingId = await meetingActions.startMeeting(
        title, 
        'standup' as MeetingType, // Map from meetingType to MeetingType enum
        {
          // Additional meeting data
          description: meetingType.contextRules
        }
      );

      if (meetingId) {
        console.log('Meeting started successfully:', meetingId);
        setShowSetupModal(false);
        
        // Add success notification
        useAppStore.getState().addNotification({
          type: 'success',
          title: 'Meeting Started',
          message: `"${title}" meeting has been started successfully.`,
          persistent: false
        });
      } else {
        throw new Error('Failed to create meeting - no meeting ID returned');
      }
    } catch (error) {
      console.error('Failed to start meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Add error notification
      useAppStore.getState().addNotification({
        type: 'error',
        title: 'Failed to Start Meeting',
        message: errorMessage,
        persistent: false
      });
      
      // Reset any partial state
      if (universalAssistantRef.current) {
        universalAssistantRef.current.cleanup();
        universalAssistantRef.current = null;
      }
      initializingRef.current = false;
    } finally {
      setIsStartingMeeting(false);
    }
  }, [user, meetingActions, isStartingMeeting]);

  const handleEndMeeting = useCallback(async () => {
    if (!currentMeeting || isEndingMeeting) return;

    setIsEndingMeeting(true);
    
    try {
      console.log('Ending meeting:', currentMeeting.meetingId);
      
      // Stop Universal Assistant first with timeout
      if (universalAssistantRef.current) {
        console.log('Stopping Universal Assistant...');
        const cleanupPromise = universalAssistantRef.current.stopRecording();
        
        // Add timeout to prevent hanging
        await Promise.race([
          cleanupPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Assistant cleanup timeout')), 10000)
          )
        ]);
        
        universalAssistantRef.current.cleanup();
        universalAssistantRef.current = null;
        console.log('Universal Assistant stopped successfully');
      }

      // End meeting in store
      const success = await meetingActions.endMeeting(currentMeeting.meetingId);
      
      if (success) {
        console.log('Meeting ended successfully');
        
        // Add success notification
        useAppStore.getState().addNotification({
          type: 'success',
          title: 'Meeting Ended',
          message: 'Meeting has been ended and data has been saved.',
          persistent: false
        });
        
        // Reset assistant error state
        setAssistantError(null);
        initializingRef.current = false;
        
        // Optional: Navigate back to dashboard after a short delay
        // setTimeout(() => router.push('/dashboard'), 1000);
      } else {
        throw new Error('Failed to end meeting in store');
      }
    } catch (error) {
      console.error('Failed to end meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Add error notification
      useAppStore.getState().addNotification({
        type: 'error',
        title: 'Failed to End Meeting',
        message: errorMessage,
        persistent: false
      });
      
      // Force cleanup even on error to prevent stuck state
      try {
        if (universalAssistantRef.current) {
          universalAssistantRef.current.cleanup();
          universalAssistantRef.current = null;
        }
        initializingRef.current = false;
      } catch (cleanupError) {
        console.error('Error during forced cleanup:', cleanupError);
      }
    } finally {
      setIsEndingMeeting(false);
    }
  }, [currentMeeting, meetingActions, isEndingMeeting]);

  const handleBackToDashboard = useCallback(async () => {
    console.log('Navigating back to dashboard...');
    
    // If in meeting, prompt user to end meeting first
    if (isInMeeting && currentMeeting) {
      const shouldEndMeeting = window.confirm(
        'You are currently in a meeting. Do you want to end the meeting and return to dashboard?'
      );
      
      if (shouldEndMeeting) {
        try {
          await handleEndMeeting();
          // Navigation will happen after meeting ends
          setTimeout(() => router.push('/dashboard'), 500);
        } catch (error) {
          console.error('Error ending meeting during navigation:', error);
          // Force navigation even if ending fails (user requested it)
          router.push('/dashboard');
        }
      }
      return;
    }
    
    // Clean up any lingering state
    if (universalAssistantRef.current) {
      universalAssistantRef.current.cleanup();
      universalAssistantRef.current = null;
    }
    initializingRef.current = false;
    setAssistantError(null);
    
    // Navigate to dashboard
    router.push('/dashboard');
  }, [isInMeeting, currentMeeting, handleEndMeeting, router]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInMeeting || universalAssistantRef.current) {
        e.preventDefault();
        e.returnValue = 'You are currently in a meeting. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handlePopState = () => {
      if (isInMeeting && currentMeeting) {
        const shouldStay = window.confirm(
          'You are currently in a meeting. Do you want to end the meeting?'
        );
        
        if (!shouldStay) {
          // Prevent navigation
          window.history.pushState(null, '', window.location.href);
          return;
        }
        
        // End meeting and allow navigation
        handleEndMeeting().catch(error => {
          console.error('Error ending meeting during browser navigation:', error);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isInMeeting, currentMeeting, handleEndMeeting]);

  // Loading state
  if (isLoadingMeeting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleBackToDashboard}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isInMeeting ? currentMeeting?.title : 'Meeting Room'}
              </h1>
              {isInMeeting && meetingStats && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.floor(meetingStats.duration / 60000)} minutes • {meetingStats.participantCount} participants
                </p>
              )}
            </div>
          </div>

          {!isInMeeting && (
            <Button
              onClick={() => setShowSetupModal(true)}
              size="lg"
              className="flex items-center space-x-2"
              disabled={isStartingMeeting}
            >
              <Phone className="w-5 h-5" />
              <span>Start Meeting</span>
            </Button>
          )}
        </div>

        {isInMeeting ? (
          <>
            {/* Assistant Error Alert */}
            {assistantError && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                  <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="font-medium">AI Assistant Error</p>
                    <p className="text-sm mt-1">{assistantError}</p>
                    <p className="text-xs mt-1 opacity-75">
                      Meeting recording continues, but AI features may be limited.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Meeting Controls */}
            <MeetingControls 
              onEndMeeting={handleEndMeeting}
              isEnding={isEndingMeeting}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Transcript - Takes up 2/3 on large screens */}
              <div className="lg:col-span-2">
                <TranscriptDisplay />
              </div>

              {/* Participants - Takes up 1/3 on large screens */}
              <div className="lg:col-span-1">
                <ParticipantsDisplay />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <Phone className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Ready to start your meeting?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
              Click "Start Meeting" to begin recording, transcribing, and getting AI assistance for your conversation.
            </p>
            <Button
              onClick={() => setShowSetupModal(true)}
              size="lg"
              className="flex items-center space-x-2"
              disabled={isStartingMeeting}
            >
              <Phone className="w-5 h-5" />
              <span>Start Meeting</span>
            </Button>
          </div>
        )}
      </div>

      {/* Meeting Setup Modal */}
      <MeetingSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onStartMeeting={handleStartMeeting}
        isStarting={isStartingMeeting}
      />
    </div>
  );
}

// Export with error boundary protection
export default function MeetingPage() {
  return (
    <PageErrorBoundary 
      pageName="Meeting" 
      enableRetry={true}
      maxRetries={2}
    >
      <MeetingPageContent />
    </PageErrorBoundary>
  );
}