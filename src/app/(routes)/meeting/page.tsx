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
  Volume2
} from 'lucide-react';
import { MeetingType } from '@/types';

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
        <div className="text-center">
          <Mic className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>Start a meeting to see live transcript</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Live Transcript
        </h3>
      </div>
      
      <div className="p-4 h-80 overflow-y-auto">
        {transcript.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-green-500 rounded-full inline-block mr-2"></div>
                <span>Listening...</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {transcript.map((entry, index) => (
              <div 
                key={entry.id || index} 
                className="border-l-2 border-blue-200 dark:border-blue-700 pl-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {entry.speakerId || 'Speaker'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      {entry.confidence && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          ({Math.round(entry.confidence * 100)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900 dark:text-white leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="past-meetings-content"
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Past Meetings
          </h3>
          {recentMeetings.length > 0 && (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm px-2 py-1 rounded-full">
              {recentMeetings.length}
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div id="past-meetings-content" className="border-t border-gray-200 dark:border-gray-700">
          {isLoadingRecentMeetings ? (
            <div className="p-4 flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
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
                  className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => console.log('View meeting:', meeting.meetingId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {meeting.title}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(meeting.createdAt).toLocaleDateString()}
                        </div>
                        {meeting.endTime && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60))} min
                          </div>
                        )}
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {meeting.participants.length}
                        </div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      meeting.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {meeting.status}
                    </div>
                  </div>
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

  // Clear errors on component mount
  useEffect(() => {
    clearMeetingError();
  }, [clearMeetingError]);

  const handleStartMeeting = async () => {
    if (!user?.uid) return;
    
    setIsStartingMeeting(true);
    try {
      // Request microphone permission first
      if (assistantReady) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          console.error('Microphone permission denied:', err);
          alert('Please allow microphone access to record audio');
          setIsStartingMeeting(false);
          return;
        }
      }
      
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

      // Start audio recording with Universal Assistant
      await startAssistantRecording();
      startRecording();
      
    } catch (error) {
      console.error('Failed to start meeting:', error);
    } finally {
      setIsStartingMeeting(false);
    }
  };

  const handleEndMeeting = async () => {
    setIsEndingMeeting(true);
    try {
      // Stop audio recording first
      stopAssistantRecording();
      stopRecording();
      
      // End the meeting in the store
      await endMeeting();
    } catch (error) {
      console.error('Failed to end meeting:', error);
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
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Meeting Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Distraction-free meeting experience with AI assistance
          </p>
        </div>

        {/* Error Display */}
        {(meetingError || assistantError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 dark:text-red-400">
                {meetingError && (
                  <>
                    <p className="font-medium">Meeting Error: {meetingError.message}</p>
                    <p className="text-sm mt-1">Operation: {meetingError.operation}</p>
                  </>
                )}
                {assistantError && (
                  <p className="font-medium">Assistant Error: {assistantError}</p>
                )}
              </div>
              <button
                onClick={() => {
                  clearMeetingError();
                  // Note: assistantError clears automatically when operation succeeds
                }}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
                className="w-48 h-48 sm:w-56 sm:h-56 bg-green-500 hover:bg-green-600 disabled:bg-green-400 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-500/50"
                aria-label="Start Meeting"
              >
                <div className="text-center">
                  {isStartingMeeting || isLoadingMeeting ? (
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  ) : (
                    <Play className="w-12 h-12 mb-2 mx-auto" />
                  )}
                  <span className="text-xl font-semibold">
                    {isStartingMeeting ? 'Starting...' : 'Start Meeting'}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={handleEndMeeting}
                disabled={isEndingMeeting}
                className="w-48 h-48 sm:w-56 sm:h-56 bg-red-500 hover:bg-red-600 disabled:bg-red-400 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-red-500/50"
                aria-label="Stop Meeting"
              >
                <div className="text-center">
                  {isEndingMeeting ? (
                    <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                  ) : (
                    <Square className="w-12 h-12 mb-2 mx-auto" />
                  )}
                  <span className="text-xl font-semibold">
                    {isEndingMeeting ? 'Stopping...' : 'Stop Meeting'}
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Trigger AI Speech Button - Only visible during meeting */}
          {isInMeeting && (
            <div className="flex flex-col items-center space-y-3">
              <button
                onClick={handleTriggerAISpeech}
                disabled={isTriggeringAI || assistantIsProcessing}
                className="px-8 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                aria-label="Trigger AI Speech"
              >
                {isTriggeringAI || assistantIsProcessing ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : assistantIsPlaying ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
                <span>
                  {isTriggeringAI ? 'Processing...' : 
                   assistantIsProcessing ? 'Thinking...' :
                   assistantIsPlaying ? 'Speaking...' : 
                   'Trigger AI Speech'}
                </span>
              </button>
              
              {/* Audio Status Indicators */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${assistantIsRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span>Recording</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${assistantIsProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span>Processing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${assistantIsPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span>Speaking</span>
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
    </MainLayout>
  );
}