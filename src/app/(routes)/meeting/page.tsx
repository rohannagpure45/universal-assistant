'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useMeetingStore, useMeeting } from '@/stores/meetingStore';
import { useAuth } from '@/hooks/useAuth';
import { useUniversalAssistantClient } from '@/hooks/useUniversalAssistantClient';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Users,
  Volume2,
  Settings,
  Wifi,
  Shield
} from 'lucide-react';
import { MeetingType } from '@/types';
import { ProgressModal, ProgressStep, useProgressModal, LoadingSpinner } from '@/components/ui';

// LiveTranscript Component
const LiveTranscript: React.FC = () => {
  const { transcript, isInMeeting } = useMeeting();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript entry
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (!isInMeeting) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center p-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl" />
            <Mic className="relative w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-fluid-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Ready to Record</h3>
          <p className="text-gray-500 dark:text-gray-400">Start a meeting to see live transcript and AI assistance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 glass-morphism dark:glass-morphism-dark rounded-xl border border-white/30 dark:border-gray-700/30 overflow-hidden shadow-soft backdrop-blur-xl">
      <div className="p-6 border-b border-white/20 dark:border-gray-700/30 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-soft" />
          <h3 className="text-fluid-lg font-semibold text-gray-900 dark:text-white">
            Live Transcript
          </h3>
        </div>
      </div>
      
      <div className="p-6 h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center p-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg animate-pulse" />
                <div className="relative w-4 h-4 bg-green-500 rounded-full mx-auto pulse-soft" />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Listening for speech...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Speak naturally to see real-time transcription</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {transcript.map((entry, index) => (
              <div 
                key={entry.id || index} 
                className="group relative p-4 rounded-xl bg-white/40 dark:bg-gray-800/40 border-l-4 border-gradient-primary backdrop-blur-sm hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {entry.speakerId || 'Speaker'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-2 py-1 rounded-full">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      {entry.confidence && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/20 px-2 py-1 rounded-full font-medium">
                          {Math.round(entry.confidence * 100)}% confident
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white leading-relaxed text-fluid-base">
                      {entry.text}
                    </p>
                  </div>
                </div>
                {/* Subtle hover effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

// PastMeetings Component
const PastMeetings: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const { recentMeetings, isLoadingRecentMeetings, loadRecentMeetings } = useMeetingStore();

  useEffect(() => {
    if (user?.uid && recentMeetings.length === 0 && !isLoadingRecentMeetings) {
      loadRecentMeetings(user.uid, 10);
    }
  }, [user?.uid, recentMeetings.length, isLoadingRecentMeetings, loadRecentMeetings]);

  return (
    <div className="glass-morphism dark:glass-morphism-dark rounded-xl border border-white/30 dark:border-gray-700/30 overflow-hidden shadow-soft">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-200 button-press"
        aria-expanded={isExpanded}
        aria-controls="past-meetings-content"
      >
        <div className="flex items-center space-x-4">
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-fluid-lg font-semibold text-gray-900 dark:text-white">
            Past Meetings
          </h3>
          {recentMeetings.length > 0 && (
            <span className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium px-3 py-1 rounded-full border border-blue-200/50 dark:border-blue-700/50">
              {recentMeetings.length}
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div id="past-meetings-content" className="border-t border-gray-200 dark:border-gray-700">
          {isLoadingRecentMeetings ? (
            <div className="p-4 flex items-center justify-center">
              <LoadingSpinner size="sm" color="primary" />
              <span className="ml-2 text-gray-500 dark:text-gray-400">Loading meetings...</span>
            </div>
          ) : recentMeetings.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>No past meetings found</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {recentMeetings.map((meeting) => (
                <div
                  key={meeting.meetingId}
                  className="group relative p-5 border-b border-white/10 dark:border-gray-700/30 last:border-b-0 hover:bg-white/30 dark:hover:bg-gray-800/30 cursor-pointer transition-all duration-200 card-hover"
                  onClick={() => console.log('View meeting:', meeting.meetingId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                        {meeting.title}
                      </h4>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                        </div>
                        {meeting.endTime && (
                          <div className="flex items-center space-x-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                            <Clock className="w-4 h-4" />
                            <span>{Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60))} min</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                          <Users className="w-4 h-4" />
                          <span>{meeting.participants.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-soft group-hover:scale-105 transition-transform duration-200 ${
                      meeting.status === 'active' 
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400 border border-green-200/50 dark:border-green-700/50'
                        : 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-700 dark:to-slate-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-600/50'
                    }`}>
                      {meeting.status}
                    </div>
                  </div>
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Meeting Page Component
export default function MeetingPage() {
  const { user } = useAuth();
  const { 
    isInMeeting, 
    isLoadingMeeting, 
    startMeeting, 
    endMeeting, 
    clearMeetingError,
    meetingError,
    isRecording,
    startRecording,
    stopRecording
  } = useMeeting();
  
  // Universal Assistant integration with client-side safety
  const {
    isRecording: assistantIsRecording,
    isPlaying: assistantIsPlaying,
    isProcessing: assistantIsProcessing,
    error: assistantError,
    startRecording: startAssistantRecording,
    stopRecording: stopAssistantRecording,
    handleVocalInterrupt,
    isReady: assistantReady
  } = useUniversalAssistantClient();
  
  const [isStartingMeeting, setIsStartingMeeting] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [isTriggeringAI, setIsTriggeringAI] = useState(false);
  
  // Progress modal for meeting setup
  const meetingSetupModal = useProgressModal();
  const meetingEndModal = useProgressModal();

  // Clear errors on component mount
  useEffect(() => {
    clearMeetingError();
  }, [clearMeetingError]);

  const handleStartMeeting = async () => {
    if (!user?.uid) return;
    
    setIsStartingMeeting(true);
    
    // Create meeting setup steps
    const steps: ProgressStep[] = [
      {
        id: 'permissions',
        label: 'Requesting permissions',
        description: 'Getting microphone access for audio recording',
        status: 'pending'
      },
      {
        id: 'initialize',
        label: 'Initializing meeting',
        description: 'Setting up meeting room and participant data',
        status: 'pending'
      },
      {
        id: 'audio-setup',
        label: 'Setting up audio',
        description: 'Configuring audio recording and AI assistant',
        status: 'pending'
      },
      {
        id: 'start-recording',
        label: 'Starting recording',
        description: 'Beginning audio capture and transcription',
        status: 'pending'
      }
    ];

    meetingSetupModal.openModal({
      title: 'Starting Meeting',
      description: 'Setting up your meeting environment',
      steps,
      canCancel: true,
      canClose: false,
      icon: Settings,
      onCancel: () => {
        setIsStartingMeeting(false);
        meetingSetupModal.closeModal();
      }
    });

    try {
      // Step 1: Request microphone permission
      meetingSetupModal.updateProgress({
        steps: steps.map((step, index) => 
          index === 0 ? { ...step, status: 'running' } : step
        ),
        currentStep: 0,
        progress: 10
      });
      
      if (assistantReady) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          console.error('Microphone permission denied:', err);
          meetingSetupModal.updateProgress({
            hasError: true,
            errorMessage: 'Microphone access is required to record audio. Please allow microphone permissions and try again.',
            canClose: true
          });
          setIsStartingMeeting(false);
          return;
        }
      }
      
      // Step 2: Initialize meeting
      meetingSetupModal.updateProgress({
        steps: steps.map((step, index) => {
          if (index === 0) return { ...step, status: 'completed' };
          if (index === 1) return { ...step, status: 'running' };
          return step;
        }),
        currentStep: 1,
        progress: 35
      });
      
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate setup time
      
      // Start the meeting in the store
      await startMeeting({
        id: '',
        title: `Meeting - ${new Date().toLocaleString()}`,
        type: MeetingType.TEAM_STANDUP,
        status: 'active' as const,
        hostId: user.uid,
        createdBy: user.uid,
        participants: [{
          id: user.uid + '-participant',
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Host',
          displayName: user.displayName || user.email?.split('@')[0] || 'Host',
          email: user.email || '',
          voiceProfileId: 'default-voice-profile',
          role: 'host' as const,
          joinTime: new Date(),
          joinedAt: new Date(),
          speakingTime: 0,
          isActive: true
        }],
        keywords: [],
        notes: [],
        appliedRules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Step 3: Setup audio
      meetingSetupModal.updateProgress({
        steps: steps.map((step, index) => {
          if (index <= 1) return { ...step, status: 'completed' };
          if (index === 2) return { ...step, status: 'running' };
          return step;
        }),
        currentStep: 2,
        progress: 65
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 4: Start recording
      meetingSetupModal.updateProgress({
        steps: steps.map((step, index) => {
          if (index <= 2) return { ...step, status: 'completed' };
          if (index === 3) return { ...step, status: 'running' };
          return step;
        }),
        currentStep: 3,
        progress: 85
      });
      
      // Start audio recording with Universal Assistant
      await startAssistantRecording();
      startRecording();
      
      // Complete
      meetingSetupModal.updateProgress({
        steps: steps.map(step => ({ ...step, status: 'completed' })),
        currentStep: 3,
        progress: 100,
        isComplete: true,
        canClose: true,
        successMessage: 'Meeting started successfully! You can now speak and interact with the AI assistant.'
      });
      // Auto-close the setup modal so it doesn't block other controls (e.g., Stop Meeting)
      setTimeout(() => {
        meetingSetupModal.closeModal();
      }, 800);
      
    } catch (error) {
      console.error('Failed to start meeting:', error);
      meetingSetupModal.updateProgress({
        hasError: true,
        errorMessage: `Failed to start meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canClose: true,
        onRetry: () => {
          meetingSetupModal.closeModal();
          setTimeout(() => handleStartMeeting(), 100);
        }
      });
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const handleEndMeeting = async () => {
    setIsEndingMeeting(true);
    
    const steps: ProgressStep[] = [
      {
        id: 'stop-recording',
        label: 'Stopping recording',
        description: 'Ending audio capture and transcription',
        status: 'pending'
      },
      {
        id: 'save-data',
        label: 'Saving meeting data',
        description: 'Storing transcript and meeting information',
        status: 'pending'
      },
      {
        id: 'cleanup',
        label: 'Cleaning up',
        description: 'Finalizing meeting resources',
        status: 'pending'
      }
    ];

    meetingEndModal.openModal({
      title: 'Ending Meeting',
      description: 'Saving your meeting data and cleaning up resources',
      steps,
      canCancel: false,
      canClose: false,
      variant: 'warning'
    });

    try {
      // Step 1: Stop recording
      meetingEndModal.updateProgress({
        steps: steps.map((step, index) => 
          index === 0 ? { ...step, status: 'running' } : step
        ),
        currentStep: 0,
        progress: 20
      });
      
      stopAssistantRecording();
      stopRecording();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 2: Save data
      meetingEndModal.updateProgress({
        steps: steps.map((step, index) => {
          if (index === 0) return { ...step, status: 'completed' };
          if (index === 1) return { ...step, status: 'running' };
          return step;
        }),
        currentStep: 1,
        progress: 60
      });
      
      // End the meeting in the store
      await endMeeting();
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 3: Cleanup
      meetingEndModal.updateProgress({
        steps: steps.map((step, index) => {
          if (index <= 1) return { ...step, status: 'completed' };
          if (index === 2) return { ...step, status: 'running' };
          return step;
        }),
        currentStep: 2,
        progress: 90
      });
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Complete
      meetingEndModal.updateProgress({
        steps: steps.map(step => ({ ...step, status: 'completed' })),
        currentStep: 2,
        progress: 100,
        isComplete: true,
        canClose: true,
        successMessage: 'Meeting ended successfully. Your transcript and data have been saved.'
      });
      // Auto-close the ending modal to return control to the UI
      setTimeout(() => {
        meetingEndModal.closeModal();
      }, 800);
      
    } catch (error) {
      console.error('Failed to end meeting:', error);
      meetingEndModal.updateProgress({
        hasError: true,
        errorMessage: `Failed to end meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
        canClose: true
      });
    } finally {
      setIsEndingMeeting(false);
    }
  };

  const handleTriggerAISpeech = async () => {
    if (!isInMeeting) return;
    
    setIsTriggeringAI(true);
    try {
      // Trigger AI vocal interrupt to generate and speak response
      handleVocalInterrupt();
    } catch (error) {
      console.error('Failed to trigger AI speech:', error);
    } finally {
      setIsTriggeringAI(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header with Wave Background */}
        <div className="relative text-center p-8 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 wave-bg opacity-10" />
          <div className="relative">
            <h1 className="text-fluid-3xl font-bold text-gray-900 dark:text-white mb-4">
              Meeting Assistant
            </h1>
            <p className="text-fluid-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Distraction-free meeting experience with AI assistance and real-time transcription
            </p>
          </div>
        </div>

        {/* Error Display */}
        {(meetingError || assistantError) && (
          <div className="glass-morphism-dark border border-red-200/50 dark:border-red-800/50 rounded-xl p-5 bg-gradient-to-r from-red-50/80 to-pink-50/80 dark:from-red-900/30 dark:to-pink-900/30 shadow-soft">
            <div className="flex items-start justify-between">
              <div className="text-red-600 dark:text-red-400 flex-1">
                {meetingError && (
                  <>
                    <p className="font-semibold text-fluid-base mb-1">Meeting Error: {meetingError.message}</p>
                    <p className="text-sm opacity-80">Operation: {meetingError.operation}</p>
                  </>
                )}
                {assistantError && (
                  <p className="font-semibold text-fluid-base">Assistant Error: {assistantError}</p>
                )}
              </div>
              <button
                onClick={() => {
                  clearMeetingError();
                  // Note: assistantError clears automatically when operation succeeds
                }}
                className="ml-4 p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100/50 dark:hover:bg-red-800/20 rounded-lg transition-all duration-200 button-press"
              >
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Central Meeting Controls */}
        <div className="flex flex-col items-center space-y-6">
          
          {/* Primary Meeting Button */}
          <div className="flex flex-col items-center space-y-4">
            {!isInMeeting ? (
              <button
                onClick={handleStartMeeting}
                disabled={isStartingMeeting || isLoadingMeeting}
                className="group relative w-56 h-56 sm:w-64 sm:h-64 bg-gradient-success hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-glow hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-green-500/50 button-press overflow-hidden"
                aria-label="Start Meeting"
              >
                {/* Pulsing ring animation */}
                <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-green-400/20 animate-ping animation-delay-75" />
                
                <div className="relative text-center z-10">
                  {isStartingMeeting || isLoadingMeeting ? (
                    <LoadingSpinner size="xl" color="white" />
                  ) : (
                    <Play className="w-14 h-14 mb-3 mx-auto group-hover:scale-110 transition-transform duration-200" />
                  )}
                  <span className="text-fluid-xl font-bold tracking-wide">
                    {isStartingMeeting ? 'Starting...' : 'Start Meeting'}
                  </span>
                </div>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300" />
              </button>
            ) : (
              <button
                onClick={handleEndMeeting}
                disabled={isEndingMeeting}
                className="group relative w-56 h-56 sm:w-64 sm:h-64 bg-gradient-error hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all duration-300 shadow-glow hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-500/50 button-press overflow-hidden"
                aria-label="Stop Meeting"
              >
                {/* Pulsing ring animation for active recording */}
                <div className="absolute inset-0 rounded-full bg-red-400/30 pulse-soft" />
                
                <div className="relative text-center z-10">
                  {isEndingMeeting ? (
                    <LoadingSpinner size="xl" color="white" />
                  ) : (
                    <Square className="w-14 h-14 mb-3 mx-auto group-hover:scale-110 transition-transform duration-200" />
                  )}
                  <span className="text-fluid-xl font-bold tracking-wide">
                    {isEndingMeeting ? 'Stopping...' : 'Stop Meeting'}
                  </span>
                </div>
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300" />
              </button>
            )}
          </div>

          {/* Trigger AI Speech Button - Only visible during meeting */}
          {isInMeeting && (
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={handleTriggerAISpeech}
                disabled={isTriggeringAI || assistantIsProcessing}
                className="group px-10 py-5 bg-gradient-primary hover:scale-105 disabled:scale-100 disabled:opacity-50 text-white rounded-xl font-semibold transition-all duration-200 flex items-center space-x-3 shadow-glow hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 button-press"
                aria-label="Trigger AI Speech"
              >
                {isTriggeringAI || assistantIsProcessing ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : assistantIsPlaying ? (
                  <Volume2 className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                ) : (
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                )}
                <span className="text-fluid-lg">
                  {isTriggeringAI ? 'Processing...' : 
                   assistantIsProcessing ? 'Thinking...' :
                   assistantIsPlaying ? 'Speaking...' : 
                   'Trigger AI Speech'}
                </span>
              </button>
              
              {/* Audio Status Indicators */}
              <div className="glass-morphism dark:glass-morphism-dark rounded-xl p-4 shadow-soft border border-white/30 dark:border-gray-700/30">
                <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      assistantIsRecording ? 'bg-red-500 pulse-soft shadow-glow' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className={`font-medium transition-colors duration-200 ${
                      assistantIsRecording ? 'text-red-600 dark:text-red-400' : ''
                    }`}>Recording</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      assistantIsProcessing ? 'bg-yellow-500 pulse-soft shadow-glow' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className={`font-medium transition-colors duration-200 ${
                      assistantIsProcessing ? 'text-yellow-600 dark:text-yellow-400' : ''
                    }`}>Processing</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      assistantIsPlaying ? 'bg-green-500 pulse-soft shadow-glow' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                    <span className={`font-medium transition-colors duration-200 ${
                      assistantIsPlaying ? 'text-green-600 dark:text-green-400' : ''
                    }`}>Speaking</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Transcript Area */}
        <div className="space-y-6">
          <LiveTranscript />
        </div>

        {/* Past Meetings Section */}
        <div className="space-y-6">
          <PastMeetings />
        </div>
      </div>
      
      {/* Progress Modals */}
      <meetingSetupModal.ProgressModal />
      <meetingEndModal.ProgressModal />
    </MainLayout>
  );
}