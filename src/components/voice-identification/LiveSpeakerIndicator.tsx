'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { User, Mic, MicOff, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpeakerProfile, TranscriptEntry } from '@/types';

// Real-time speaker data interface
export interface LiveSpeakerData {
  speakerId: string;
  voiceId: string;
  speakerName: string;
  isIdentified: boolean;
  confidence: number;
  isActive: boolean;
  lastSpeakTime: Date;
  speakingDuration: number;
  volume?: number;
}

// Voice activity states
export type VoiceActivityState = 'silent' | 'speaking' | 'transitioning';

export interface LiveSpeakerIndicatorProps {
  // Current active speaker data
  currentSpeaker: LiveSpeakerData | null;
  
  // All detected speakers in the session
  allSpeakers: LiveSpeakerData[];
  
  // Voice activity state
  voiceActivity: VoiceActivityState;
  
  // Audio level for visualization (0-1)
  audioLevel?: number;
  
  // Callbacks for user interactions
  onSpeakerClick?: (speakerId: string) => void;
  onIdentifySpeaker?: (speakerId: string) => void;
  
  // Display configuration
  showAllSpeakers?: boolean;
  showConfidence?: boolean;
  showVoiceActivity?: boolean;
  maxSpeakersDisplay?: number;
  
  // Styling
  className?: string;
  compact?: boolean;
}

/**
 * LiveSpeakerIndicator - Real-time speaker identification display
 * 
 * Features:
 * - Real-time current speaker display with confidence
 * - Voice activity visualization
 * - Speaker transition animations
 * - Multi-speaker session overview
 * - Integration with DeepgramSTT speaker diarization
 */
export const LiveSpeakerIndicator: React.FC<LiveSpeakerIndicatorProps> = ({
  currentSpeaker,
  allSpeakers,
  voiceActivity,
  audioLevel = 0,
  onSpeakerClick,
  onIdentifySpeaker,
  showAllSpeakers = true,
  showConfidence = true,
  showVoiceActivity = true,
  maxSpeakersDisplay = 5,
  className,
  compact = false,
}) => {
  // Animation state for speaker transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevSpeakerId, setPrevSpeakerId] = useState<string | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle speaker transitions with smooth animations
  useEffect(() => {
    if (currentSpeaker?.speakerId !== prevSpeakerId) {
      setIsTransitioning(true);
      setPrevSpeakerId(currentSpeaker?.speakerId || null);
      
      // Clear existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // End transition after animation
      transitionTimeoutRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentSpeaker?.speakerId, prevSpeakerId]);

  // Format speaking duration for display
  const formatDuration = useCallback((duration: number): string => {
    if (duration < 60) return `${Math.round(duration)}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.round(duration % 60);
    return `${minutes}m ${seconds}s`;
  }, []);

  // Get confidence color based on score
  const getConfidenceColor = useCallback((confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  }, []);

  // Voice activity indicator component
  const VoiceActivityIndicator = () => {
    if (!showVoiceActivity) return null;
    
    return (
      <div className="flex items-center space-x-2">
        {voiceActivity === 'speaking' ? (
          <div className="flex items-center">
            <Mic className={cn(
              "h-4 w-4 animate-pulse",
              isTransitioning ? "text-blue-500" : "text-green-500"
            )} />
            {audioLevel > 0 && (
              <div className="ml-2 flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 bg-green-500 rounded-full transition-all duration-100",
                      audioLevel > i * 0.2 ? "h-4 opacity-100" : "h-2 opacity-30"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ) : voiceActivity === 'transitioning' ? (
          <div className="flex items-center">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-2 text-sm text-blue-500">Detecting...</span>
          </div>
        ) : (
          <MicOff className="h-4 w-4 text-gray-400" />
        )}
      </div>
    );
  };

  // Current speaker display
  const CurrentSpeakerDisplay = () => {
    if (!currentSpeaker) {
      return (
        <div className={cn(
          "flex items-center justify-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800",
          compact ? "p-2" : "p-4"
        )}>
          <Users className="h-6 w-6 text-gray-400 mr-2" />
          <span className="text-gray-500 dark:text-gray-400">
            No active speaker
          </span>
        </div>
      );
    }

    return (
      <div className={cn(
        "relative p-4 rounded-lg border-2 transition-all duration-300",
        currentSpeaker.isActive 
          ? "border-green-500 bg-green-50 dark:bg-green-950" 
          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
        isTransitioning && "scale-105 shadow-lg",
        compact ? "p-2" : "p-4"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Speaker avatar/icon */}
            <div className={cn(
              "relative flex items-center justify-center rounded-full",
              compact ? "h-8 w-8" : "h-12 w-12",
              currentSpeaker.isIdentified 
                ? "bg-blue-100 dark:bg-blue-900" 
                : "bg-gray-100 dark:bg-gray-700"
            )}>
              <User className={cn(
                currentSpeaker.isIdentified ? "text-blue-600 dark:text-blue-400" : "text-gray-500",
                compact ? "h-4 w-4" : "h-6 w-6"
              )} />
              
              {/* Active indicator */}
              {currentSpeaker.isActive && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            
            {/* Speaker info */}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={cn(
                  "font-semibold",
                  compact ? "text-sm" : "text-base",
                  currentSpeaker.isIdentified ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                )}>
                  {currentSpeaker.speakerName}
                </span>
                
                {!currentSpeaker.isIdentified && (
                  <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                    Unknown
                  </span>
                )}
              </div>
              
              {!compact && (
                <div className="flex items-center space-x-4 mt-1">
                  {showConfidence && (
                    <span className={cn(
                      "text-sm",
                      getConfidenceColor(currentSpeaker.confidence)
                    )}>
                      {Math.round(currentSpeaker.confidence * 100)}% confident
                    </span>
                  )}
                  
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(currentSpeaker.speakingDuration)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <VoiceActivityIndicator />
            
            {!currentSpeaker.isIdentified && onIdentifySpeaker && (
              <button
                onClick={() => onIdentifySpeaker(currentSpeaker.speakerId)}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
              >
                Identify
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // All speakers overview
  const AllSpeakersOverview = () => {
    if (!showAllSpeakers || allSpeakers.length <= 1) return null;
    
    const displaySpeakers = allSpeakers.slice(0, maxSpeakersDisplay);
    
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          All Speakers ({allSpeakers.length})
        </h3>
        
        <div className="grid grid-cols-1 gap-2">
          {displaySpeakers.map((speaker) => (
            <div
              key={speaker.speakerId}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all duration-200",
                speaker.speakerId === currentSpeaker?.speakerId
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600",
                "hover:shadow-sm"
              )}
              onClick={() => onSpeakerClick?.(speaker.speakerId)}
            >
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center",
                  speaker.isIdentified 
                    ? "bg-blue-100 dark:bg-blue-900" 
                    : "bg-gray-100 dark:bg-gray-700"
                )}>
                  <User className={cn(
                    "h-3 w-3",
                    speaker.isIdentified ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
                  )} />
                </div>
                
                <span className={cn(
                  "text-sm font-medium",
                  speaker.isIdentified ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
                )}>
                  {speaker.speakerName}
                </span>
                
                {speaker.speakerId === currentSpeaker?.speakerId && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Speaking
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                {showConfidence && (
                  <span className={getConfidenceColor(speaker.confidence)}>
                    {Math.round(speaker.confidence * 100)}%
                  </span>
                )}
                <span>{formatDuration(speaker.speakingDuration)}</span>
              </div>
            </div>
          ))}
          
          {allSpeakers.length > maxSpeakersDisplay && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
              +{allSpeakers.length - maxSpeakersDisplay} more speakers
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <CurrentSpeakerDisplay />
      <AllSpeakersOverview />
    </div>
  );
};

// Hook for managing live speaker data with real-time updates
export const useLiveSpeakerData = () => {
  const [currentSpeaker, setCurrentSpeaker] = useState<LiveSpeakerData | null>(null);
  const [allSpeakers, setAllSpeakers] = useState<LiveSpeakerData[]>([]);
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivityState>('silent');
  const [audioLevel, setAudioLevel] = useState(0);

  // Update speaker data from transcript entries
  const updateFromTranscript = useCallback((entry: TranscriptEntry) => {
    const speakerData: LiveSpeakerData = {
      speakerId: entry.speakerId,
      voiceId: entry.voiceId || entry.speakerId,
      speakerName: entry.speakerName || entry.speaker || `Speaker ${entry.speakerId}`,
      isIdentified: !!entry.speakerName && entry.speakerName !== `Speaker ${entry.speakerId}`,
      confidence: entry.confidence,
      isActive: true,
      lastSpeakTime: entry.timestamp,
      speakingDuration: entry.duration,
      volume: entry.metadata?.volume,
    };

    setCurrentSpeaker(speakerData);
    setVoiceActivity('speaking');

    // Update all speakers list
    setAllSpeakers(prev => {
      const existingIndex = prev.findIndex(s => s.speakerId === speakerData.speakerId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...speakerData };
        return updated;
      } else {
        return [...prev, speakerData];
      }
    });
  }, []);

  // Update voice activity and audio levels
  const updateVoiceActivity = useCallback((activity: VoiceActivityState, level?: number) => {
    setVoiceActivity(activity);
    if (level !== undefined) {
      setAudioLevel(level);
    }
    
    // Clear current speaker if silence detected
    if (activity === 'silent') {
      setCurrentSpeaker(prev => prev ? { ...prev, isActive: false } : null);
    }
  }, []);

  // Clear speaker data (e.g., when meeting ends)
  const clearSpeakerData = useCallback(() => {
    setCurrentSpeaker(null);
    setAllSpeakers([]);
    setVoiceActivity('silent');
    setAudioLevel(0);
  }, []);

  return {
    currentSpeaker,
    allSpeakers,
    voiceActivity,
    audioLevel,
    updateFromTranscript,
    updateVoiceActivity,
    clearSpeakerData,
  };
};

export default LiveSpeakerIndicator;