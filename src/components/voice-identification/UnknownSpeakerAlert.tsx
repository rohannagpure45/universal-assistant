'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  AlertTriangle, 
  User, 
  UserPlus, 
  X, 
  Clock, 
  Mic,
  Volume2,
  CheckCircle,
  Settings,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveSpeakerData } from './LiveSpeakerIndicator';

// Unknown speaker detection data
export interface UnknownSpeakerDetection {
  speakerId: string;
  voiceId: string;
  detectedAt: Date;
  lastActive: Date;
  confidence: number;
  audioLevel: number;
  duration: number;
  messageCount: number;
  contextClues: string[]; // Potential identification clues from speech
  voiceCharacteristics: {
    pitch: 'low' | 'medium' | 'high';
    pace: 'slow' | 'normal' | 'fast';
    accent?: string;
    language?: string;
  };
}

// Alert configuration
export interface AlertConfig {
  // Detection thresholds
  minimumDuration: number; // Minimum speaking duration before alert (seconds)
  minimumConfidence: number; // Minimum confidence threshold (0-1)
  minimumMessages: number; // Minimum number of messages before alert
  
  // Alert behavior
  alertDelay: number; // Delay before showing alert (ms)
  autoHideDelay: number; // Auto-hide after this duration (ms, 0 = never)
  maxSimultaneousAlerts: number; // Maximum alerts shown at once
  
  // Batching settings
  batchSimilarAlerts: boolean; // Batch similar speakers together
  batchTimeWindow: number; // Time window for batching (ms)
  
  // Smart filtering
  suppressRepeatedAlerts: boolean; // Suppress repeated alerts for same speaker
  suppressionDuration: number; // How long to suppress (ms)
  
  // Position and styling
  position: 'top' | 'bottom' | 'center';
  theme: 'light' | 'dark' | 'auto';
}

// Identification action
export interface IdentificationAction {
  type: 'manual_identify' | 'voice_training' | 'dismiss' | 'defer';
  speakerId: string;
  userData?: {
    name: string;
    email?: string;
    role?: string;
    notes?: string;
  };
  voiceTraining?: {
    sampleDuration: number;
    quality: 'low' | 'medium' | 'high';
    backgroundNoise: boolean;
  };
}

export interface UnknownSpeakerAlertProps {
  // Current unknown speaker detections
  unknownSpeakers: UnknownSpeakerDetection[];
  
  // Configuration
  config?: Partial<AlertConfig>;
  
  // Callbacks
  onIdentificationAction?: (action: IdentificationAction) => void;
  onDismissAlert?: (speakerId: string) => void;
  onDeferAlert?: (speakerId: string, duration: number) => void; // duration in minutes
  onConfigUpdate?: (config: AlertConfig) => void;
  
  // Integration with NeedsIdentificationService
  onRequestVoiceTraining?: (speakerId: string) => void;
  onRequestManualId?: (speakerId: string) => void;
  
  // Display controls
  enabled?: boolean;
  className?: string;
}

/**
 * UnknownSpeakerAlert - Intelligent alerts for unknown speaker detection
 * 
 * Features:
 * - Smart alerting that doesn't spam
 * - Batch similar events within time windows
 * - Context-aware identification suggestions
 * - Quick action buttons for voice training
 * - Integration with NeedsIdentificationService
 * - Configurable thresholds and behavior
 */
export const UnknownSpeakerAlert: React.FC<UnknownSpeakerAlertProps> = ({
  unknownSpeakers,
  config: userConfig,
  onIdentificationAction,
  onDismissAlert,
  onDeferAlert,
  onConfigUpdate,
  onRequestVoiceTraining,
  onRequestManualId,
  enabled = true,
  className,
}) => {
  // Merge configuration with defaults
  const config: AlertConfig = {
    minimumDuration: 5,
    minimumConfidence: 0.6,
    minimumMessages: 2,
    alertDelay: 2000,
    autoHideDelay: 0,
    maxSimultaneousAlerts: 3,
    batchSimilarAlerts: true,
    batchTimeWindow: 30000,
    suppressRepeatedAlerts: true,
    suppressionDuration: 300000, // 5 minutes
    position: 'top',
    theme: 'auto',
    ...userConfig,
  };

  // Component state
  const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
  const [dismissedSpeakers, setDismissedSpeakers] = useState<Map<string, number>>(new Map());
  const [deferredSpeakers, setDeferredSpeakers] = useState<Map<string, number>>(new Map());
  const [batchedAlerts, setBatchedAlerts] = useState<Map<string, UnknownSpeakerDetection[]>>(new Map());
  const [showIdentificationForm, setShowIdentificationForm] = useState<string | null>(null);
  
  // Refs for timers
  const alertTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const autoHideTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Filter speakers that meet alert criteria
  const getFilteredSpeakers = useCallback(() => {
    if (!enabled) return [];

    const now = Date.now();
    
    return unknownSpeakers.filter(speaker => {
      // Check if speaker meets minimum thresholds
      if (speaker.duration < config.minimumDuration) return false;
      if (speaker.confidence < config.minimumConfidence) return false;
      if (speaker.messageCount < config.minimumMessages) return false;
      
      // Check if speaker is dismissed
      const dismissedUntil = dismissedSpeakers.get(speaker.speakerId);
      if (dismissedUntil && now < dismissedUntil) return false;
      
      // Check if speaker is deferred
      const deferredUntil = deferredSpeakers.get(speaker.speakerId);
      if (deferredUntil && now < deferredUntil) return false;
      
      // Check suppression for repeated alerts
      if (config.suppressRepeatedAlerts) {
        const lastAlertTime = dismissedSpeakers.get(`${speaker.speakerId}_last_alert`);
        if (lastAlertTime && (now - lastAlertTime) < config.suppressionDuration) {
          return false;
        }
      }
      
      return true;
    });
  }, [unknownSpeakers, config, enabled, dismissedSpeakers, deferredSpeakers]);

  // Batch similar alerts together
  const getBatchedAlerts = useCallback((filteredSpeakers: UnknownSpeakerDetection[]) => {
    if (!config.batchSimilarAlerts) {
      return new Map(filteredSpeakers.map(speaker => [speaker.speakerId, [speaker]]));
    }

    const batches = new Map<string, UnknownSpeakerDetection[]>();
    const now = Date.now();

    filteredSpeakers.forEach(speaker => {
      // Find existing batch within time window
      let batchKey: string | null = null;
      
      for (const [key, batch] of batches.entries()) {
        const batchTime = batch[0].detectedAt.getTime();
        if (now - batchTime <= config.batchTimeWindow) {
          // Check similarity criteria (voice characteristics)
          const similar = batch.some(batchedSpeaker => 
            batchedSpeaker.voiceCharacteristics.pitch === speaker.voiceCharacteristics.pitch &&
            batchedSpeaker.voiceCharacteristics.pace === speaker.voiceCharacteristics.pace
          );
          
          if (similar) {
            batchKey = key;
            break;
          }
        }
      }
      
      if (batchKey) {
        batches.get(batchKey)!.push(speaker);
      } else {
        batches.set(speaker.speakerId, [speaker]);
      }
    });

    return batches;
  }, [config.batchSimilarAlerts, config.batchTimeWindow]);

  // Process and show alerts
  useEffect(() => {
    const filteredSpeakers = getFilteredSpeakers();
    const batched = getBatchedAlerts(filteredSpeakers);
    
    setBatchedAlerts(batched);
    
    // Schedule alerts with delay
    batched.forEach((speakers, batchKey) => {
      if (activeAlerts.includes(batchKey)) return;
      
      // Clear existing timer for this batch
      const existingTimer = alertTimersRef.current.get(batchKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      // Schedule new alert
      const timer = setTimeout(() => {
        setActiveAlerts(prev => {
          if (prev.length >= config.maxSimultaneousAlerts) {
            // Remove oldest alert to make room
            const newAlerts = [...prev.slice(1), batchKey];
            return newAlerts;
          }
          return [...prev, batchKey];
        });
        
        // Schedule auto-hide if configured
        if (config.autoHideDelay > 0) {
          const autoHideTimer = setTimeout(() => {
            setActiveAlerts(prev => prev.filter(id => id !== batchKey));
          }, config.autoHideDelay);
          
          autoHideTimersRef.current.set(batchKey, autoHideTimer);
        }
      }, config.alertDelay);
      
      alertTimersRef.current.set(batchKey, timer);
    });
    
    // Clean up alerts for speakers that no longer meet criteria
    setActiveAlerts(prev => 
      prev.filter(alertKey => batched.has(alertKey))
    );
  }, [getFilteredSpeakers, getBatchedAlerts, config, activeAlerts]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      alertTimersRef.current.forEach(timer => clearTimeout(timer));
      autoHideTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Handle speaker dismissal
  const handleDismiss = useCallback((speakerId: string, duration: number = 0) => {
    const dismissUntil = duration > 0 ? Date.now() + duration : 0;
    setDismissedSpeakers(prev => new Map(prev).set(speakerId, dismissUntil));
    setActiveAlerts(prev => prev.filter(id => id !== speakerId));
    
    if (config.suppressRepeatedAlerts) {
      setDismissedSpeakers(prev => new Map(prev).set(`${speakerId}_last_alert`, Date.now()));
    }
    
    onDismissAlert?.(speakerId);
  }, [config.suppressRepeatedAlerts, onDismissAlert]);

  // Handle speaker deferral
  const handleDefer = useCallback((speakerId: string, minutes: number) => {
    const deferUntil = Date.now() + (minutes * 60 * 1000);
    setDeferredSpeakers(prev => new Map(prev).set(speakerId, deferUntil));
    setActiveAlerts(prev => prev.filter(id => id !== speakerId));
    
    onDeferAlert?.(speakerId, minutes);
  }, [onDeferAlert]);

  // Handle identification action
  const handleIdentificationAction = useCallback((action: IdentificationAction) => {
    onIdentificationAction?.(action);
    
    if (action.type === 'manual_identify' || action.type === 'voice_training') {
      handleDismiss(action.speakerId);
    }
    
    setShowIdentificationForm(null);
  }, [onIdentificationAction, handleDismiss]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Get voice characteristics description
  const getVoiceDescription = (characteristics: UnknownSpeakerDetection['voiceCharacteristics']): string => {
    const parts = [];
    if (characteristics.pitch !== 'medium') parts.push(`${characteristics.pitch} pitch`);
    if (characteristics.pace !== 'normal') parts.push(`${characteristics.pace} pace`);
    if (characteristics.accent) parts.push(`${characteristics.accent} accent`);
    
    return parts.length > 0 ? parts.join(', ') : 'Standard voice';
  };

  // Individual alert component
  const AlertCard = ({ batchKey, speakers }: { batchKey: string; speakers: UnknownSpeakerDetection[] }) => {
    const primarySpeaker = speakers[0];
    const isBatch = speakers.length > 1;
    
    return (
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 border-yellow-500 p-4 max-w-md",
        "animate-in slide-in-from-right-5 duration-300"
      )}>
        {/* Alert header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {isBatch ? `${speakers.length} Unknown Speakers` : 'Unknown Speaker Detected'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Active for {formatDuration(primarySpeaker.duration)}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => handleDismiss(batchKey)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Speaker info */}
        <div className="space-y-2 mb-4">
          {speakers.slice(0, 2).map((speaker) => (
            <div key={speaker.speakerId} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Speaker {speaker.speakerId.slice(-4)}
                  </span>
                  <span className="text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                    {Math.round(speaker.confidence * 100)}% confident
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  <Mic className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {speaker.messageCount} messages
                  </span>
                  <Volume2 className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getVoiceDescription(speaker.voiceCharacteristics)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {speakers.length > 2 && (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400 p-2">
              +{speakers.length - 2} more speakers
            </div>
          )}
        </div>

        {/* Context clues */}
        {primarySpeaker.contextClues.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-1 mb-2">
              <MessageSquare className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Context Clues
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {primarySpeaker.contextClues.slice(0, 3).map((clue, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
                >
                  {clue}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowIdentificationForm(batchKey)}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              <span>Identify</span>
            </button>
            
            <button
              onClick={() => onRequestVoiceTraining?.(primarySpeaker.speakerId)}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
            >
              <Mic className="h-3 w-3" />
              <span>Train</span>
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleDefer(batchKey, 5)}
              className="flex-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Defer 5min
            </button>
            
            <button
              onClick={() => handleDefer(batchKey, 30)}
              className="flex-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Defer 30min
            </button>
            
            <button
              onClick={() => handleDismiss(batchKey, 24 * 60 * 60 * 1000)} // 24 hours
              className="flex-1 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Quick identification form
  const IdentificationForm = ({ batchKey, speakers }: { batchKey: string; speakers: UnknownSpeakerDetection[] }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      handleIdentificationAction({
        type: 'manual_identify',
        speakerId: speakers[0].speakerId,
        userData: {
          name: name.trim(),
          email: email.trim() || undefined,
          role: role.trim() || undefined,
        },
      });
    };
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border p-4 max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Identify Speaker
          </h3>
          <button
            onClick={() => setShowIdentificationForm(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter speaker's name"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="speaker@example.com"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role (optional)
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Manager, Developer"
            />
          </div>
          
          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              Identify Speaker
            </button>
            
            <button
              type="button"
              onClick={() => setShowIdentificationForm(null)}
              className="px-3 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  if (!enabled || activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "fixed z-50 right-4 space-y-4",
      config.position === 'top' && "top-4",
      config.position === 'bottom' && "bottom-4",
      config.position === 'center' && "top-1/2 -translate-y-1/2",
      className
    )}>
      {activeAlerts.map(batchKey => {
        const speakers = batchedAlerts.get(batchKey);
        if (!speakers) return null;
        
        if (showIdentificationForm === batchKey) {
          return (
            <IdentificationForm
              key={`${batchKey}-form`}
              batchKey={batchKey}
              speakers={speakers}
            />
          );
        }
        
        return (
          <AlertCard
            key={batchKey}
            batchKey={batchKey}
            speakers={speakers}
          />
        );
      })}
    </div>
  );
};

// Hook for managing unknown speaker detection state
export const useUnknownSpeakerDetection = () => {
  const [unknownSpeakers, setUnknownSpeakers] = useState<UnknownSpeakerDetection[]>([]);
  const [config, setConfig] = useState<AlertConfig>({
    minimumDuration: 5,
    minimumConfidence: 0.6,
    minimumMessages: 2,
    alertDelay: 2000,
    autoHideDelay: 0,
    maxSimultaneousAlerts: 3,
    batchSimilarAlerts: true,
    batchTimeWindow: 30000,
    suppressRepeatedAlerts: true,
    suppressionDuration: 300000,
    position: 'top',
    theme: 'auto',
  });

  // Add or update unknown speaker
  const updateUnknownSpeaker = useCallback((speakerData: LiveSpeakerData) => {
    if (speakerData.isIdentified) return; // Skip identified speakers
    
    setUnknownSpeakers(prev => {
      const existingIndex = prev.findIndex(speaker => speaker.speakerId === speakerData.speakerId);
      
      const detection: UnknownSpeakerDetection = {
        speakerId: speakerData.speakerId,
        voiceId: speakerData.voiceId,
        detectedAt: existingIndex >= 0 ? prev[existingIndex].detectedAt : new Date(),
        lastActive: speakerData.lastSpeakTime,
        confidence: speakerData.confidence,
        audioLevel: speakerData.volume || 0,
        duration: speakerData.speakingDuration,
        messageCount: existingIndex >= 0 ? prev[existingIndex].messageCount + 1 : 1,
        contextClues: [], // TODO: Extract from transcript
        voiceCharacteristics: {
          pitch: 'medium', // TODO: Analyze from audio
          pace: 'normal', // TODO: Calculate from speech rate
        },
      };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = detection;
        return updated;
      } else {
        return [...prev, detection];
      }
    });
  }, []);

  // Remove identified speaker
  const removeIdentifiedSpeaker = useCallback((speakerId: string) => {
    setUnknownSpeakers(prev => prev.filter(speaker => speaker.speakerId !== speakerId));
  }, []);

  // Clear all detections
  const clearDetections = useCallback(() => {
    setUnknownSpeakers([]);
  }, []);

  return {
    unknownSpeakers,
    config,
    setConfig,
    updateUnknownSpeaker,
    removeIdentifiedSpeaker,
    clearDetections,
  };
};

export default UnknownSpeakerAlert;