'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Users, 
  User, 
  Eye, 
  EyeOff, 
  Settings, 
  TrendingUp, 
  Clock,
  Mic,
  AlertTriangle,
  CheckCircle,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpeakerProfile, TranscriptEntry } from '@/types';
import { LiveSpeakerData } from './LiveSpeakerIndicator';

// Speaker identification event types
export interface SpeakerIdentificationEvent {
  type: 'speaker_detected' | 'speaker_changed' | 'confidence_updated' | 'identification_requested';
  speakerId: string;
  confidence: number;
  timestamp: Date;
  previousSpeakerId?: string;
  metadata?: {
    duration: number;
    audioLevel: number;
    transitionType: 'smooth' | 'abrupt' | 'overlap';
  };
}

// Overlay configuration
export interface OverlayConfig {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  minimizable: boolean;
  draggable: boolean;
  autoHide: boolean;
  autoHideDelay: number; // ms
  showConfidenceThreshold: number; // 0-1
  maxSpeakersDisplay: number;
  updateInterval: number; // ms
}

// Speaker session statistics
export interface SpeakerSessionStats {
  speakerId: string;
  speakerName: string;
  totalSpeakingTime: number;
  messageCount: number;
  averageConfidence: number;
  firstDetected: Date;
  lastActive: Date;
  voiceActivityPatterns: {
    averagePause: number;
    speakingVelocity: number;
    interruptionCount: number;
  };
}

export interface SpeakerIdentificationOverlayProps {
  // Real-time speaker data
  currentSpeaker: LiveSpeakerData | null;
  allSpeakers: LiveSpeakerData[];
  
  // Session statistics
  sessionStats: SpeakerSessionStats[];
  
  // Identification events
  identificationEvents: SpeakerIdentificationEvent[];
  
  // Configuration
  config?: Partial<OverlayConfig>;
  
  // Callbacks
  onSpeakerSelect?: (speakerId: string) => void;
  onIdentifyRequest?: (speakerId: string) => void;
  onConfigChange?: (config: OverlayConfig) => void;
  onOverlayToggle?: (visible: boolean) => void;
  
  // Display controls
  visible?: boolean;
  className?: string;
}

/**
 * SpeakerIdentificationOverlay - Non-intrusive real-time speaker overlay
 * 
 * Features:
 * - Real-time speaker identification display
 * - Confidence scores with visual indicators
 * - Speaker transition notifications
 * - Session statistics and analytics
 * - Minimizable/expandable interface
 * - Draggable positioning
 * - Auto-hide functionality
 */
export const SpeakerIdentificationOverlay: React.FC<SpeakerIdentificationOverlayProps> = ({
  currentSpeaker,
  allSpeakers,
  sessionStats,
  identificationEvents,
  config: userConfig,
  onSpeakerSelect,
  onIdentifyRequest,
  onConfigChange,
  onOverlayToggle,
  visible = true,
  className,
}) => {
  // Merge configuration with defaults
  const config: OverlayConfig = {
    position: 'top-right',
    minimizable: true,
    draggable: true,
    autoHide: false,
    autoHideDelay: 3000,
    showConfidenceThreshold: 0.5,
    maxSpeakersDisplay: 6,
    updateInterval: 100,
    ...userConfig,
  };

  // Component state
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [recentEvents, setRecentEvents] = useState<SpeakerIdentificationEvent[]>([]);

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const autoHideTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle auto-hide functionality
  useEffect(() => {
    if (config.autoHide && !isMinimized) {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      
      autoHideTimeoutRef.current = setTimeout(() => {
        setIsHidden(true);
      }, config.autoHideDelay);
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [config.autoHide, config.autoHideDelay, isMinimized, currentSpeaker]);

  // Track recent identification events
  useEffect(() => {
    if (identificationEvents.length > 0) {
      const recent = identificationEvents.slice(-5); // Keep last 5 events
      setRecentEvents(recent);
    }
  }, [identificationEvents]);

  // Position overlay based on config
  useEffect(() => {
    if (!config.draggable) {
      const getPosition = () => {
        switch (config.position) {
          case 'top-left':
            return { x: 20, y: 20 };
          case 'top-right':
            return { x: window.innerWidth - 320, y: 20 };
          case 'bottom-left':
            return { x: 20, y: window.innerHeight - 400 };
          case 'bottom-right':
            return { x: window.innerWidth - 320, y: window.innerHeight - 400 };
          case 'center':
            return { x: (window.innerWidth - 320) / 2, y: (window.innerHeight - 400) / 2 };
          default:
            return { x: 20, y: 20 };
        }
      };
      
      setPosition(getPosition());
      
      const handleResize = () => setPosition(getPosition());
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [config.position, config.draggable]);

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!config.draggable) return;
    
    setIsDragging(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, [config.draggable]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !config.draggable) return;
    
    setPosition({
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y,
    });
  }, [isDragging, config.draggable]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Show overlay on mouse activity
  const handleMouseEnter = useCallback(() => {
    if (config.autoHide) {
      setIsHidden(false);
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    }
  }, [config.autoHide]);

  // Format confidence percentage
  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get confidence color based on score
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    if (confidence >= 0.4) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get confidence background color
  const getConfidenceBackground = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 dark:bg-green-900';
    if (confidence >= 0.6) return 'bg-yellow-100 dark:bg-yellow-900';
    if (confidence >= 0.4) return 'bg-orange-100 dark:bg-orange-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Header component
  const OverlayHeader = () => (
    <div 
      className={cn(
        "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b cursor-move",
        config.draggable && "cursor-move"
      )}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center space-x-2">
        <Users className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Speaker ID
        </span>
        {allSpeakers.length > 0 && (
          <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
            {allSpeakers.length}
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        {config.minimizable && (
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </button>
        )}
        <button
          onClick={() => {
            setIsHidden(true);
            onOverlayToggle?.(false);
          }}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  // Current speaker display
  const CurrentSpeakerDisplay = () => {
    if (!currentSpeaker) {
      return (
        <div className="p-3 text-center text-gray-500 dark:text-gray-400">
          <Mic className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No active speaker</p>
        </div>
      );
    }

    const showConfidence = currentSpeaker.confidence >= config.showConfidenceThreshold;

    return (
      <div className={cn(
        "p-3 border-l-4 transition-colors",
        currentSpeaker.isActive 
          ? "border-green-500 bg-green-50 dark:bg-green-950" 
          : "border-gray-300 dark:border-gray-600"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                currentSpeaker.isIdentified 
                  ? "bg-blue-100 dark:bg-blue-900" 
                  : "bg-gray-100 dark:bg-gray-700"
              )}>
                <User className={cn(
                  "h-5 w-5",
                  currentSpeaker.isIdentified ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
                )} />
              </div>
              
              {currentSpeaker.isActive && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentSpeaker.speakerName}
                </span>
                {!currentSpeaker.isIdentified && (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {showConfidence && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    getConfidenceBackground(currentSpeaker.confidence),
                    getConfidenceColor(currentSpeaker.confidence)
                  )}>
                    {formatConfidence(currentSpeaker.confidence)}
                  </span>
                )}
                
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDuration(currentSpeaker.speakingDuration)}
                </span>
              </div>
            </div>
          </div>
          
          {!currentSpeaker.isIdentified && onIdentifyRequest && (
            <button
              onClick={() => onIdentifyRequest(currentSpeaker.speakerId)}
              className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              Identify
            </button>
          )}
        </div>
      </div>
    );
  };

  // All speakers list
  const SpeakersList = () => {
    if (isMinimized || allSpeakers.length <= 1) return null;
    
    const displaySpeakers = allSpeakers
      .filter(speaker => speaker.speakerId !== currentSpeaker?.speakerId)
      .slice(0, config.maxSpeakersDisplay - 1);

    return (
      <div className="max-h-48 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Other Speakers
        </div>
        
        {displaySpeakers.map((speaker) => (
          <div
            key={speaker.speakerId}
            className="flex items-center justify-between p-2 mx-3 mb-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            onClick={() => onSpeakerSelect?.(speaker.speakerId)}
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
              
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {speaker.speakerName}
              </span>
              
              {!speaker.isIdentified && (
                <AlertTriangle className="h-2 w-2 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              {speaker.confidence >= config.showConfidenceThreshold && (
                <span className={getConfidenceColor(speaker.confidence)}>
                  {formatConfidence(speaker.confidence)}
                </span>
              )}
              <span>{formatDuration(speaker.speakingDuration)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Recent events display
  const RecentEvents = () => {
    if (isMinimized || recentEvents.length === 0) return null;

    return (
      <div className="border-t">
        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Recent Activity
        </div>
        
        <div className="max-h-24 overflow-y-auto">
          {recentEvents.slice(-3).reverse().map((event, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 mx-3 text-xs">
              <div className={cn(
                "h-2 w-2 rounded-full flex-shrink-0",
                event.type === 'speaker_changed' ? "bg-blue-500" :
                event.type === 'speaker_detected' ? "bg-green-500" :
                event.type === 'confidence_updated' ? "bg-yellow-500" :
                "bg-gray-500"
              )} />
              
              <span className="text-gray-600 dark:text-gray-400 flex-1">
                {event.type === 'speaker_changed' && 'Speaker changed'}
                {event.type === 'speaker_detected' && 'New speaker detected'}
                {event.type === 'confidence_updated' && 'Confidence updated'}
                {event.type === 'identification_requested' && 'ID requested'}
              </span>
              
              <span className="text-gray-500 dark:text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString('en-US', { 
                  hour12: false, 
                  timeStyle: 'short' 
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Session stats summary
  const SessionStats = () => {
    if (isMinimized || sessionStats.length === 0) return null;

    const totalSpeakingTime = sessionStats.reduce((sum, stat) => sum + stat.totalSpeakingTime, 0);
    const identifiedCount = sessionStats.filter(stat => stat.speakerName !== stat.speakerId).length;

    return (
      <div className="border-t bg-gray-50 dark:bg-gray-800">
        <div className="p-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {sessionStats.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Speakers
              </div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {identifiedCount}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Identified
              </div>
            </div>
            
            <div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDuration(totalSpeakingTime)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Time
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!visible || isHidden) {
    return (
      <button
        onClick={() => {
          setIsHidden(false);
          onOverlayToggle?.(true);
        }}
        className="fixed top-4 right-4 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-colors z-50"
        title="Show Speaker Identification"
      >
        <Eye className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed z-40 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden",
        isDragging && "shadow-2xl scale-105",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging ? 'none' : 'transform 0.2s ease',
      }}
      onMouseEnter={handleMouseEnter}
    >
      <OverlayHeader />
      
      <div className="max-h-96 overflow-y-auto">
        <CurrentSpeakerDisplay />
        <SpeakersList />
        <RecentEvents />
        <SessionStats />
      </div>
    </div>
  );
};

// Hook for managing overlay state and events
export const useSpeakerIdentificationOverlay = () => {
  const [visible, setVisible] = useState(true);
  const [events, setEvents] = useState<SpeakerIdentificationEvent[]>([]);
  const [sessionStats, setSessionStats] = useState<SpeakerSessionStats[]>([]);

  // Add identification event
  const addEvent = useCallback((event: Omit<SpeakerIdentificationEvent, 'timestamp'>) => {
    const fullEvent: SpeakerIdentificationEvent = {
      ...event,
      timestamp: new Date(),
    };
    setEvents(prev => [...prev, fullEvent]);
  }, []);

  // Update session statistics
  const updateStats = useCallback((speakerId: string, updates: Partial<SpeakerSessionStats>) => {
    setSessionStats(prev => {
      const existingIndex = prev.findIndex(stat => stat.speakerId === speakerId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...updates };
        return updated;
      } else {
        const newStat: SpeakerSessionStats = {
          speakerId,
          speakerName: speakerId,
          totalSpeakingTime: 0,
          messageCount: 0,
          averageConfidence: 0,
          firstDetected: new Date(),
          lastActive: new Date(),
          voiceActivityPatterns: {
            averagePause: 0,
            speakingVelocity: 0,
            interruptionCount: 0,
          },
          ...updates,
        };
        return [...prev, newStat];
      }
    });
  }, []);

  // Clear session data
  const clearSession = useCallback(() => {
    setEvents([]);
    setSessionStats([]);
  }, []);

  return {
    visible,
    setVisible,
    events,
    sessionStats,
    addEvent,
    updateStats,
    clearSession,
  };
};

export default SpeakerIdentificationOverlay;