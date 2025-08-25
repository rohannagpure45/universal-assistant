'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  LiveSpeakerIndicator, 
  VoiceActivityVisualizer, 
  SpeakerIdentificationOverlay, 
  UnknownSpeakerAlert,
  useLiveSpeakerData,
  useVoiceActivity,
  useSpeakerIdentificationOverlay,
  useUnknownSpeakerDetection,
  LiveSpeakerData,
  VoiceActivityData,
  SpeakerIdentificationEvent,
  UnknownSpeakerDetection,
  IdentificationAction
} from './index';
import { cn } from '@/lib/utils';
import { Settings, Play, Square, Mic, MicOff, Eye, EyeOff, Activity, AlertTriangle } from 'lucide-react';
import { secureDeepgramTokenClient } from '@/services/universal-assistant/SecureDeepgramTokenClient';
import { AudioManager } from '@/services/universal-assistant/AudioManager';
import { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';
import { VoiceIdentificationCoordinator } from '@/services/voice-identification/VoiceIdentificationCoordinator';
import type { Meeting, TranscriptEntry } from '@/types';

/**
 * RealTimeVoiceIdentificationDemo - Comprehensive integration demo
 * 
 * This component demonstrates how all the real-time voice identification
 * components work together in a live meeting scenario.
 * 
 * Features:
 * - Live audio recording and analysis
 * - Real-time speaker detection and identification
 * - Voice activity visualization
 * - Unknown speaker alerts with identification workflow
 * - Speaker identification overlay
 * - Integration with existing services
 */
export const RealTimeVoiceIdentificationDemo: React.FC = () => {
  // Demo state
  const [isRecording, setIsRecording] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  
  // Service instances
  const audioManagerRef = useRef<AudioManager | null>(null);
  const deepgramRef = useRef<DeepgramSTT | null>(null);
  const coordinatorRef = useRef<VoiceIdentificationCoordinator | null>(null);
  
  // Demo meeting data
  const demoMeeting: Meeting = {
    id: `demo-meeting-${Date.now()}`,
    meetingId: `demo-meeting-${Date.now()}`,
    title: 'Voice Identification Demo',
    description: 'Real-time voice identification demonstration',
    meetingTypeId: 'demo-meeting-type',
    hostId: 'demo-user',
    createdBy: 'demo-user',
    participantIds: ['demo-user'],
    participants: [],
    transcript: [],
    notes: [],
    keywords: [],
    appliedRules: [],
    type: 'general' as any,
    status: 'active',
    startTime: new Date(),
    endTime: undefined,
    duration: 0,
    settings: {
      isPublic: false,
      allowRecording: true,
      autoTranscribe: true,
      language: 'en',
      maxParticipants: 10,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      totalWords: 0,
      totalSpeakers: 0,
      averageWPM: 0,
      topics: [],
    }
  };

  // Custom hooks for managing component state
  const liveSpeakerData = useLiveSpeakerData();
  const voiceActivity = useVoiceActivity(audioStream || undefined);
  const overlayState = useSpeakerIdentificationOverlay();
  const unknownSpeakerDetection = useUnknownSpeakerDetection();

  // Demo transcript entries for simulation
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([]);

  // Initialize services
  const initializeServices = useCallback(async () => {
    try {
      // Initialize AudioManager
      audioManagerRef.current = new AudioManager({
        enableInputGating: false,
        enableConcurrentProcessing: false,
        voiceActivityDetection: { 
          enabled: true, 
          threshold: 0.05, 
          minSilenceDuration: 500, 
          bufferSilentChunks: 2 
        }
      });

      // Initialize DeepgramSTT with secure token authentication
      deepgramRef.current = new DeepgramSTT('secure-token-placeholder');

      // Initialize VoiceIdentificationCoordinator
      if (deepgramRef.current) {
        coordinatorRef.current = new VoiceIdentificationCoordinator(
          demoMeeting,
          deepgramRef.current
        );
      }

      console.log('[VoiceIDDemo] Services initialized');
    } catch (error) {
      console.error('[VoiceIDDemo] Failed to initialize services:', error);
    }
  }, []);

  // Start recording and analysis
  const startRecording = useCallback(async () => {
    try {
      await initializeServices();
      
      if (!audioManagerRef.current) {
        throw new Error('AudioManager not initialized');
      }

      // Request microphone access and start recording
      await audioManagerRef.current.startRecording((audioChunk) => {
        // Process audio chunk (would normally send to Deepgram)
        console.log('[VoiceIDDemo] Audio chunk received:', audioChunk.size, 'bytes');
        
        // Simulate transcript processing for demo
        simulateTranscriptProcessing();
      });

      // Get the audio stream for visualization
      const stream = (audioManagerRef.current as any).audioStream as MediaStream;
      setAudioStream(stream);
      setIsRecording(true);

      console.log('[VoiceIDDemo] Recording started');
    } catch (error) {
      console.error('[VoiceIDDemo] Failed to start recording:', error);
      alert(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [initializeServices]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioManagerRef.current) {
      audioManagerRef.current.stopRecording();
      audioManagerRef.current.cleanup();
      audioManagerRef.current = null;
    }
    
    if (deepgramRef.current) {
      deepgramRef.current.cleanup();
      deepgramRef.current = null;
    }

    setAudioStream(null);
    setIsRecording(false);
    
    // Clear all state
    liveSpeakerData.clearSpeakerData();
    voiceActivity.clearVoiceActivity();
    overlayState.clearSession();
    unknownSpeakerDetection.clearDetections();

    console.log('[VoiceIDDemo] Recording stopped');
  }, []);

  // Simulate transcript processing for demo purposes
  const simulateTranscriptProcessing = useCallback(() => {
    // Create mock speakers for demo
    const mockSpeakers = [
      {
        speakerId: 'speaker_001',
        voiceId: 'voice_001',
        name: 'John Smith',
        identified: true,
      },
      {
        speakerId: 'speaker_002',
        voiceId: 'voice_002',
        name: 'Speaker 002',
        identified: false,
      },
      {
        speakerId: 'speaker_003',
        voiceId: 'voice_003',
        name: 'Alice Johnson',
        identified: true,
      },
    ];

    // Randomly select a speaker
    const speaker = mockSpeakers[Math.floor(Math.random() * mockSpeakers.length)];
    const now = new Date();

    // Create mock transcript entry
    const mockEntry: TranscriptEntry = {
      id: `entry_${Date.now()}_${Math.random()}`,
      meetingId: demoMeeting.meetingId,
      text: `This is a simulated transcript from ${speaker.name}`,
      content: `This is a simulated transcript from ${speaker.name}`,
      speakerId: speaker.speakerId,
      voiceId: speaker.voiceId,
      speaker: speaker.name,
      speakerName: speaker.name,
      timestamp: now,
      duration: Math.random() * 5 + 1, // 1-6 seconds
      confidence: 0.7 + Math.random() * 0.3, // 70-100%
      language: 'en',
      isFragment: false,
      isComplete: true,
      isProcessed: false,
      metadata: {
        volume: Math.random(),
        pace: 1.0,
        sentiment: 'neutral',
        keywords: ['demo', 'voice', 'identification'],
      }
    };

    // Update transcript entries
    setTranscriptEntries(prev => [...prev.slice(-10), mockEntry]); // Keep last 10

    // Update live speaker data
    const liveSpeaker: LiveSpeakerData = {
      speakerId: speaker.speakerId,
      voiceId: speaker.voiceId,
      speakerName: speaker.identified ? speaker.name : `Speaker ${speaker.speakerId}`,
      isIdentified: speaker.identified,
      confidence: mockEntry.confidence,
      isActive: true,
      lastSpeakTime: now,
      speakingDuration: mockEntry.duration,
      volume: mockEntry.metadata?.volume,
    };

    liveSpeakerData.updateFromTranscript(mockEntry);

    // Update voice activity
    voiceActivity.updateVoiceActivity(true, mockEntry.metadata?.volume || 0.5);

    // Update unknown speaker detection if speaker is not identified
    if (!speaker.identified) {
      unknownSpeakerDetection.updateUnknownSpeaker(liveSpeaker);
    }

    // Add event to overlay
    overlayState.addEvent({
      type: speaker.identified ? 'confidence_updated' : 'speaker_detected',
      speakerId: speaker.speakerId,
      confidence: mockEntry.confidence,
    });

    // Update session stats
    overlayState.updateStats(speaker.speakerId, {
      speakerId: speaker.speakerId,
      speakerName: speaker.name,
      totalSpeakingTime: mockEntry.duration,
      messageCount: 1,
      averageConfidence: mockEntry.confidence,
      firstDetected: now,
      lastActive: now,
      voiceActivityPatterns: {
        averagePause: 1.0,
        speakingVelocity: 150, // words per minute
        interruptionCount: 0,
      },
    });
  }, [liveSpeakerData, voiceActivity, overlayState, unknownSpeakerDetection]);

  // Simulate periodic transcript updates during recording
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      simulateTranscriptProcessing();
    }, 3000 + Math.random() * 4000); // Every 3-7 seconds

    return () => clearInterval(interval);
  }, [isRecording, simulateTranscriptProcessing]);

  // Handle voice activity changes
  const handleVoiceActivityChange = useCallback((isActive: boolean, level: number) => {
    liveSpeakerData.updateVoiceActivity(isActive ? 'speaking' : 'silent', level);
  }, [liveSpeakerData]);

  // Handle speaker selection
  const handleSpeakerSelect = useCallback((speakerId: string) => {
    console.log('[VoiceIDDemo] Speaker selected:', speakerId);
  }, []);

  // Handle identification request
  const handleIdentifyRequest = useCallback((speakerId: string) => {
    console.log('[VoiceIDDemo] Identification requested for:', speakerId);
  }, []);

  // Handle identification action
  const handleIdentificationAction = useCallback((action: IdentificationAction) => {
    console.log('[VoiceIDDemo] Identification action:', action);
    
    if (action.type === 'manual_identify' && action.userData) {
      // Update the speaker as identified
      const speaker = unknownSpeakerDetection.unknownSpeakers.find(s => s.speakerId === action.speakerId);
      if (speaker) {
        // Update live speaker data
        liveSpeakerData.updateFromTranscript({
          id: `update_${Date.now()}`,
          meetingId: demoMeeting.meetingId,
          text: 'Identification update',
          speakerId: action.speakerId,
          voiceId: speaker.voiceId,
          speakerName: action.userData.name,
          speaker: action.userData.name,
          timestamp: new Date(),
          duration: 0,
          confidence: 1.0,
          language: 'en',
          isFragment: false,
          isComplete: true,
          isProcessed: true,
        });

        // Remove from unknown speakers
        unknownSpeakerDetection.removeIdentifiedSpeaker(action.speakerId);

        // Add success event
        overlayState.addEvent({
          type: 'identification_requested',
          speakerId: action.speakerId,
          confidence: 1.0,
        });
      }
    }
  }, [unknownSpeakerDetection, liveSpeakerData, overlayState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Demo Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Real-Time Voice Identification Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comprehensive demonstration of Phase 3 voice identification components
          </p>
          
          {/* Control Panel */}
          <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors",
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              )}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4" />
                  <span>Stop Recording</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Start Recording</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              {isRecording ? (
                <Mic className="h-5 w-5 text-green-500 animate-pulse" />
              ) : (
                <MicOff className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isRecording ? 'Recording...' : 'Ready to record'}
              </span>
            </div>

            {/* Toggle Controls */}
            <div className="flex items-center space-x-2 ml-auto">
              <button
                onClick={() => setShowVisualizer(!showVisualizer)}
                className={cn(
                  "p-2 rounded transition-colors",
                  showVisualizer ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" : "text-gray-400 hover:text-gray-600"
                )}
                title="Toggle Visualizer"
              >
                <Activity className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setShowOverlay(!showOverlay)}
                className={cn(
                  "p-2 rounded transition-colors",
                  showOverlay ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" : "text-gray-400 hover:text-gray-600"
                )}
                title="Toggle Overlay"
              >
                {showOverlay ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className={cn(
                  "p-2 rounded transition-colors",
                  showAlerts ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400" : "text-gray-400 hover:text-gray-600"
                )}
                title="Toggle Alerts"
              >
                <AlertTriangle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Demo Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Live Speaker Indicator */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Live Speaker Indicator
              </h2>
              <LiveSpeakerIndicator
                currentSpeaker={liveSpeakerData.currentSpeaker}
                allSpeakers={liveSpeakerData.allSpeakers}
                voiceActivity={liveSpeakerData.voiceActivity}
                audioLevel={liveSpeakerData.audioLevel}
                onSpeakerClick={handleSpeakerSelect}
                onIdentifySpeaker={handleIdentifyRequest}
                showAllSpeakers={true}
                showConfidence={true}
                showVoiceActivity={true}
              />
            </div>

            {/* Recent Transcripts */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Transcripts
              </h2>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {transcriptEntries.slice(-5).map((entry) => (
                  <div key={entry.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {entry.speakerName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(entry.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{entry.text}</p>
                  </div>
                ))}
                {transcriptEntries.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">
                    Start recording to see transcripts
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center Column - Voice Activity Visualizer */}
          <div className="lg:col-span-2">
            {showVisualizer && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Voice Activity Visualizer
                </h2>
                <VoiceActivityVisualizer
                  audioStream={audioStream || undefined}
                  voiceActivityData={voiceActivity.voiceActivityData || undefined}
                  onVoiceActivityChange={handleVoiceActivityChange}
                  showControls={true}
                  showDebugInfo={true}
                  enabled={isRecording}
                />
              </div>
            )}

            {/* Demo Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Demo Instructions
              </h3>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <p>1. <strong>Click "Start Recording"</strong> to begin the demo</p>
                <p>2. <strong>Grant microphone access</strong> when prompted</p>
                <p>3. <strong>Speak or play audio</strong> to see real-time voice identification</p>
                <p>4. <strong>Watch the visualizer</strong> show voice activity and waveforms</p>
                <p>5. <strong>Observe unknown speaker alerts</strong> and try identifying them</p>
                <p>6. <strong>Use the overlay</strong> to see comprehensive speaker information</p>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900 rounded border-l-4 border-blue-500">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> This demo simulates real-time voice identification with mock data.
                  In production, it integrates with Deepgram STT and the VoiceIdentificationCoordinator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Speaker Identification Overlay */}
      {showOverlay && (
        <SpeakerIdentificationOverlay
          currentSpeaker={liveSpeakerData.currentSpeaker}
          allSpeakers={liveSpeakerData.allSpeakers}
          sessionStats={overlayState.sessionStats}
          identificationEvents={overlayState.events}
          onSpeakerSelect={handleSpeakerSelect}
          onIdentifyRequest={handleIdentifyRequest}
          onOverlayToggle={setShowOverlay}
          visible={showOverlay}
        />
      )}

      {/* Unknown Speaker Alerts */}
      {showAlerts && (
        <UnknownSpeakerAlert
          unknownSpeakers={unknownSpeakerDetection.unknownSpeakers}
          config={unknownSpeakerDetection.config}
          onIdentificationAction={handleIdentificationAction}
          onRequestVoiceTraining={(speakerId) => console.log('Voice training requested:', speakerId)}
          onRequestManualId={(speakerId) => console.log('Manual ID requested:', speakerId)}
          enabled={showAlerts}
        />
      )}
    </div>
  );
};

export default RealTimeVoiceIdentificationDemo;