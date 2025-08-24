'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertTriangle,
  Clock,
  AudioWaveform,
  Settings,
  Info,
  Trash2,
  Download
} from 'lucide-react';
import { AudioManager } from '@/services/universal-assistant/AudioManager';
import { ClientStorageService } from '@/services/firebase/ClientStorageService';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { friendlyError, processCatchError, type UserError, isFirebaseError } from '@/utils/errorMessages';
import { handleFirebaseError } from '@/utils/firebaseErrorHandler';

// Recording state types
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped' | 'playing';

// Audio quality metrics
interface AudioQualityMetrics {
  averageVolume: number;
  peakVolume: number;
  signalToNoiseRatio: number;
  clarity: number;
  steadiness: number;
  overallScore: number;
}

// Recording session data
interface RecordingSession {
  id: string;
  blob?: Blob;
  url?: string;
  duration: number;
  startTime: Date;
  endTime?: Date;
  transcript?: string;
  qualityMetrics: AudioQualityMetrics;
  isGoodQuality: boolean;
}

// Guided prompt interface
interface GuidedPrompt {
  id: string;
  text: string;
  category: 'greeting' | 'conversation' | 'reading' | 'numbers' | 'names';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedDuration: number;
  tips?: string;
}

// Props interface
interface VoiceRecordingInterfaceProps {
  onRecordingComplete?: (sessions: RecordingSession[]) => void;
  onRecordingUpdate?: (session: RecordingSession) => void;
  speakerName?: string;
  guidedMode?: boolean;
  minimumSessions?: number;
  maximumDuration?: number;
  qualityThreshold?: number;
  className?: string;
}

// Guided prompts for voice training
const GUIDED_PROMPTS: GuidedPrompt[] = [
  {
    id: 'greeting-1',
    text: "Hello, my name is [SPEAKER_NAME]. I'm participating in voice training to help improve speaker identification.",
    category: 'greeting',
    difficulty: 'easy',
    expectedDuration: 8,
    tips: 'Speak clearly and at a natural pace. State your full name where indicated.'
  },
  {
    id: 'conversation-1',
    text: "I think the weather today is quite pleasant. What do you think about the current season and how it affects your daily activities?",
    category: 'conversation',
    difficulty: 'easy',
    expectedDuration: 12,
    tips: 'Use your natural conversational tone, as if talking to a friend.'
  },
  {
    id: 'reading-1',
    text: "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for voice testing.",
    category: 'reading',
    difficulty: 'medium',
    expectedDuration: 10,
    tips: 'Focus on clear pronunciation of each word.'
  },
  {
    id: 'numbers-1',
    text: "Please count from one to twenty, then say these numbers: 42, 157, 2,834, and 10,569.",
    category: 'numbers',
    difficulty: 'medium',
    expectedDuration: 15,
    tips: 'Speak numbers clearly, pausing between different sequences.'
  },
  {
    id: 'conversation-2',
    text: "In my opinion, technology has significantly changed how we communicate. I particularly enjoy using voice assistants because they make daily tasks more convenient.",
    category: 'conversation',
    difficulty: 'hard',
    expectedDuration: 18,
    tips: 'Express natural emotions and emphasis as you would in real conversation.'
  }
];

/**
 * VoiceRecordingInterface - Live voice recording with real-time monitoring
 */
export const VoiceRecordingInterface: React.FC<VoiceRecordingInterfaceProps> = ({
  onRecordingComplete,
  onRecordingUpdate,
  speakerName = 'Speaker',
  guidedMode = true,
  minimumSessions = 3,
  maximumDuration = 30,
  qualityThreshold = 0.7,
  className
}) => {
  // State management
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const [completedSessions, setCompletedSessions] = useState<RecordingSession[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [error, setError] = useState<UserError | string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const audioManagerRef = useRef<AudioManager | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio
  useEffect(() => {
    initializeAudio();
    
    return () => {
      cleanup();
    };
  }, []);

  // Update recording time
  useEffect(() => {
    if (recordingState === 'recording') {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [recordingState]);

  const initializeAudio = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Initialize audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserNodeRef.current = audioContextRef.current.createAnalyser();
      analyserNodeRef.current.fftSize = 256;
      
      source.connect(analyserNodeRef.current);

      // Initialize MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = handleRecordingStop;

      // Start audio level monitoring
      startAudioLevelMonitoring();
      
      setIsPermissionGranted(true);
      setError(null);
    } catch (err) {
      const processedError = processCatchError(err);
      
      // Use Firebase-aware error handling if this involves Firebase operations
      const userMessage = isFirebaseError(processedError)
        ? handleFirebaseError(err, 'Audio initialization')
        : friendlyError(processedError, 'Audio initialization');
      
      setError(userMessage);
    }
  };

  const startAudioLevelMonitoring = () => {
    if (!analyserNodeRef.current) return;

    const dataArray = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
    
    const updateAudioLevel = () => {
      if (analyserNodeRef.current && recordingState !== 'idle') {
        analyserNodeRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = average / 255;
        
        setAudioLevel(normalizedLevel);
      }
    };

    audioLevelIntervalRef.current = setInterval(updateAudioLevel, 50);
  };

  const startRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isPermissionGranted) {
      setError(friendlyError('Recording not available. Microphone permissions required.', 'Recording start'));
      return;
    }

    try {
      // Clear previous chunks
      audioChunksRef.current = [];
      
      // Create new session
      const session: RecordingSession = {
        id: `session_${Date.now()}`,
        duration: 0,
        startTime: new Date(),
        qualityMetrics: {
          averageVolume: 0,
          peakVolume: 0,
          signalToNoiseRatio: 0,
          clarity: 0,
          steadiness: 0,
          overallScore: 0
        },
        isGoodQuality: false
      };

      setCurrentSession(session);
      setRecordingTime(0);
      setRecordingState('recording');

      // Start recording
      mediaRecorderRef.current.start(100); // 100ms chunks
      
      setError(null);
    } catch (err) {
      const processedError = processCatchError(err);
      
      // Use Firebase-aware error handling for recording operations
      const userMessage = isFirebaseError(processedError)
        ? handleFirebaseError(err, 'Voice recording start')
        : friendlyError(processedError, 'Recording start');
      
      setError(userMessage);
    }
  }, [isPermissionGranted]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState('stopped');
    }
  }, [recordingState]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  }, [recordingState]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  }, [recordingState]);

  const handleRecordingStop = useCallback(async () => {
    if (!currentSession || audioChunksRef.current.length === 0) return;

    try {
      // Create blob from chunks
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      
      // Calculate quality metrics
      const qualityMetrics = calculateQualityMetrics(audioLevel, recordingTime);
      
      const completedSession: RecordingSession = {
        ...currentSession,
        blob,
        url,
        duration: recordingTime,
        endTime: new Date(),
        qualityMetrics,
        isGoodQuality: qualityMetrics.overallScore >= qualityThreshold
      };

      setCurrentSession(completedSession);
      setCompletedSessions(prev => [...prev, completedSession]);
      
      // Notify parent component
      onRecordingUpdate?.(completedSession);
      
      setRecordingState('stopped');
    } catch (err) {
      const processedError = processCatchError(err);
      
      // Recording processing may involve Firebase storage operations
      const userMessage = isFirebaseError(processedError)
        ? handleFirebaseError(err, 'Voice recording processing')
        : friendlyError(processedError, 'Recording processing');
      
      setError(userMessage);
    }
  }, [currentSession, audioLevel, recordingTime, qualityThreshold, onRecordingUpdate]);

  const calculateQualityMetrics = (avgLevel: number, duration: number): AudioQualityMetrics => {
    // Simplified quality calculation
    const averageVolume = avgLevel;
    const peakVolume = Math.min(avgLevel * 1.3, 1);
    const signalToNoiseRatio = avgLevel > 0.05 ? avgLevel / 0.05 : 0;
    const clarity = avgLevel > 0.1 ? Math.min(avgLevel * 2, 1) : avgLevel * 5;
    const steadiness = duration > 3 ? Math.min(duration / 10, 1) : duration / 3;
    
    const overallScore = (
      averageVolume * 0.3 + 
      signalToNoiseRatio * 0.2 + 
      clarity * 0.3 + 
      steadiness * 0.2
    );

    return {
      averageVolume,
      peakVolume,
      signalToNoiseRatio,
      clarity,
      steadiness,
      overallScore: Math.min(overallScore, 1)
    };
  };

  const playRecording = useCallback(async (session: RecordingSession) => {
    if (!session.url) return;

    try {
      const audio = new Audio(session.url);
      audio.play();
      setRecordingState('playing');
      
      audio.onended = () => {
        setRecordingState('stopped');
      };
    } catch (err) {
      const processedError = processCatchError(err);
      
      // Audio playback errors are typically local, but could involve Firebase
      const userMessage = isFirebaseError(processedError)
        ? handleFirebaseError(err, 'Audio playback')
        : friendlyError(processedError, 'Audio playback');
      
      setError(userMessage);
    }
  }, []);

  const deleteRecording = useCallback((sessionId: string) => {
    setCompletedSessions(prev => {
      const updated = prev.filter(session => session.id !== sessionId);
      // Clean up blob URL
      const deleted = prev.find(session => session.id === sessionId);
      if (deleted?.url) {
        URL.revokeObjectURL(deleted.url);
      }
      return updated;
    });
  }, []);

  const retryRecording = useCallback(() => {
    if (currentSession?.url) {
      URL.revokeObjectURL(currentSession.url);
    }
    setCurrentSession(null);
    setRecordingTime(0);
    setRecordingState('idle');
  }, [currentSession]);

  const nextPrompt = useCallback(() => {
    if (currentPromptIndex < GUIDED_PROMPTS.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
      retryRecording();
    }
  }, [currentPromptIndex, retryRecording]);

  const previousPrompt = useCallback(() => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(prev => prev - 1);
      retryRecording();
    }
  }, [currentPromptIndex, retryRecording]);

  const handleComplete = useCallback(() => {
    const goodQualitySessions = completedSessions.filter(session => session.isGoodQuality);
    onRecordingComplete?.(goodQualitySessions);
  }, [completedSessions, onRecordingComplete]);

  const cleanup = () => {
    // Stop all timers
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    // Stop recording if active
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Clean up blob URLs
    completedSessions.forEach(session => {
      if (session.url) {
        URL.revokeObjectURL(session.url);
      }
    });
  };

  const currentPrompt = guidedMode ? GUIDED_PROMPTS[currentPromptIndex] : null;
  const canComplete = completedSessions.filter(s => s.isGoodQuality).length >= minimumSessions;
  const progressPercentage = (completedSessions.filter(s => s.isGoodQuality).length / minimumSessions) * 100;

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Permission check */}
      {!isPermissionGranted && (
        <Card className="p-6 border-warning-200 bg-warning-50 dark:bg-warning-900/20">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-warning-600" />
            <div>
              <h3 className="font-semibold text-warning-800 dark:text-warning-200">
                Microphone Access Required
              </h3>
              <p className="text-warning-700 dark:text-warning-300">
                Please allow microphone access to begin voice recording.
              </p>
            </div>
          </div>
          <Button 
            onClick={initializeAudio}
            variant="outline"
            className="mt-4"
            leftIcon={<Mic className="w-4 h-4" />}
          >
            Grant Microphone Access
          </Button>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <ErrorDisplay 
          error={error}
          onRetry={() => {
            setError(null);
            initializeAudio();
          }}
          onDismiss={() => setError(null)}
          showActionHint={true}
        />
      )}

      {/* Progress indicator */}
      {isPermissionGranted && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Voice Recording Progress
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                {completedSessions.filter(s => s.isGoodQuality).length} of {minimumSessions} quality recordings completed
              </p>
            </div>
            
            <Button
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Settings
            </Button>
          </div>

          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 mb-2">
            <motion.div
              className="bg-primary-600 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
            <span>Progress: {Math.round(progressPercentage)}%</span>
            <span>{canComplete ? 'Ready to continue' : `${minimumSessions - completedSessions.filter(s => s.isGoodQuality).length} more needed`}</span>
          </div>
        </Card>
      )}

      {/* Guided prompt display */}
      {guidedMode && currentPrompt && isPermissionGranted && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Recording {currentPromptIndex + 1} of {GUIDED_PROMPTS.length}
              </h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                {currentPrompt.category} • {currentPrompt.difficulty} • ~{currentPrompt.expectedDuration}s
              </span>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={previousPrompt}
                disabled={currentPromptIndex === 0}
                leftIcon={<RotateCcw className="w-3 h-3" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextPrompt}
                disabled={currentPromptIndex === GUIDED_PROMPTS.length - 1}
                rightIcon={<RotateCcw className="w-3 h-3" />}
              >
                Next
              </Button>
            </div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
            <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed">
              {currentPrompt.text.replace('[SPEAKER_NAME]', speakerName)}
            </p>
          </div>

          {currentPrompt.tips && (
            <div className="flex items-start space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
              <Info className="w-4 h-4 mt-0.5 text-primary-500" />
              <p>{currentPrompt.tips}</p>
            </div>
          )}
        </Card>
      )}

      {/* Recording controls */}
      {isPermissionGranted && (
        <Card className="p-6">
          <div className="flex flex-col items-center space-y-6">
            {/* Audio level visualizer */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Audio Level</span>
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {recordingState === 'recording' && (
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{recordingTime.toFixed(1)}s</span>
                    </span>
                  )}
                </span>
              </div>
              
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-4 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors ${
                    audioLevel < 0.1 
                      ? 'bg-neutral-400' 
                      : audioLevel < 0.5 
                        ? 'bg-warning-500'
                        : 'bg-success-500'
                  }`}
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            </div>

            {/* Recording button */}
            <div className="flex items-center space-x-4">
              {recordingState === 'idle' && (
                <PrimaryButton
                  onClick={startRecording}
                  size="lg"
                  leftIcon={<Mic className="w-5 h-5" />}
                  className="px-8"
                >
                  Start Recording
                </PrimaryButton>
              )}

              {recordingState === 'recording' && (
                <>
                  <Button
                    onClick={pauseRecording}
                    size="lg"
                    variant="warning"
                    leftIcon={<Pause className="w-5 h-5" />}
                  >
                    Pause
                  </Button>
                  <DangerButton
                    onClick={stopRecording}
                    size="lg"
                    leftIcon={<Square className="w-5 h-5" />}
                  >
                    Stop
                  </DangerButton>
                </>
              )}

              {recordingState === 'paused' && (
                <>
                  <PrimaryButton
                    onClick={resumeRecording}
                    size="lg"
                    leftIcon={<Mic className="w-5 h-5" />}
                  >
                    Resume
                  </PrimaryButton>
                  <DangerButton
                    onClick={stopRecording}
                    size="lg"
                    leftIcon={<Square className="w-5 h-5" />}
                  >
                    Stop
                  </DangerButton>
                </>
              )}

              {recordingState === 'stopped' && currentSession && (
                <>
                  <Button
                    onClick={() => playRecording(currentSession)}
                    size="lg"
                    variant="outline"
                    leftIcon={<Play className="w-5 h-5" />}
                  >
                    Play
                  </Button>
                  <SecondaryButton
                    onClick={retryRecording}
                    size="lg"
                    leftIcon={<RotateCcw className="w-5 h-5" />}
                  >
                    Retry
                  </SecondaryButton>
                  <PrimaryButton
                    onClick={startRecording}
                    size="lg"
                    leftIcon={<Mic className="w-5 h-5" />}
                  >
                    New Recording
                  </PrimaryButton>
                </>
              )}
            </div>

            {/* Quality indicator */}
            {currentSession && recordingState === 'stopped' && (
              <div className={`
                p-4 rounded-lg w-full max-w-md text-center
                ${currentSession.isGoodQuality
                  ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'
                  : 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800'
                }
              `}>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {currentSession.isGoodQuality ? (
                    <CheckCircle className="w-5 h-5 text-success-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-warning-600" />
                  )}
                  <span className={`font-medium ${
                    currentSession.isGoodQuality 
                      ? 'text-success-800 dark:text-success-200'
                      : 'text-warning-800 dark:text-warning-200'
                  }`}>
                    {currentSession.isGoodQuality ? 'Good Quality' : 'Could Be Better'}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  <p className={currentSession.isGoodQuality ? 'text-success-700 dark:text-success-300' : 'text-warning-700 dark:text-warning-300'}>
                    Duration: {currentSession.duration.toFixed(1)}s
                  </p>
                  <p className={currentSession.isGoodQuality ? 'text-success-700 dark:text-success-300' : 'text-warning-700 dark:text-warning-300'}>
                    Quality Score: {(currentSession.qualityMetrics.overallScore * 100).toFixed(0)}%
                  </p>
                </div>

                {!currentSession.isGoodQuality && (
                  <p className="text-xs text-warning-600 dark:text-warning-400 mt-2">
                    Try speaking closer to the microphone or in a quieter environment
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Completed recordings */}
      {completedSessions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Completed Recordings ({completedSessions.length})
          </h3>
          
          <div className="space-y-3">
            {completedSessions.map((session, index) => (
              <div 
                key={session.id}
                className={`
                  p-4 rounded-lg border
                  ${session.isGoodQuality
                    ? 'border-success-200 bg-success-50 dark:bg-success-900/10'
                    : 'border-warning-200 bg-warning-50 dark:bg-warning-900/10'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        Recording {index + 1}
                      </span>
                      {session.isGoodQuality ? (
                        <CheckCircle className="w-4 h-4 text-success-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-warning-600" />
                      )}
                    </div>
                    
                    <div className="text-sm text-neutral-600 dark:text-neutral-400 space-x-4">
                      <span>{session.duration.toFixed(1)}s</span>
                      <span>Quality: {(session.qualityMetrics.overallScore * 100).toFixed(0)}%</span>
                      <span>{session.endTime?.toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playRecording(session)}
                      leftIcon={<Play className="w-3 h-3" />}
                    >
                      Play
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRecording(session.id)}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                      className="text-danger-600 hover:text-danger-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Complete button */}
      {canComplete && (
        <div className="flex justify-center">
          <PrimaryButton
            onClick={handleComplete}
            size="lg"
            leftIcon={<CheckCircle className="w-5 h-5" />}
            className="px-8"
          >
            Complete Voice Recording ({completedSessions.filter(s => s.isGoodQuality).length} recordings)
          </PrimaryButton>
        </div>
      )}
    </div>
  );
};

export default VoiceRecordingInterface;