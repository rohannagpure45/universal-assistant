'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceSample } from '@/types/voice-identification';
import { Button, PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/Button';
import { sanitizeVoiceSample } from '@/utils/sanitization';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  User, 
  Mic, 
  AudioWaveform, 
  Brain, 
  Target,
  CheckCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  BarChart,
  Settings,
  Save,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  FileAudio,
  Eye,
  EyeOff,
  Edit,
  Copy,
  Share,
  Info,
  Zap,
  Database,
  Layers,
  Activity
} from 'lucide-react';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { ClientStorageService } from '@/services/firebase/ClientStorageService';
import { VoiceRecordingInterface } from './VoiceRecordingInterface';
import { VoiceTrainingSampleManager } from './VoiceTrainingSampleManager';
import type { VoiceLibraryEntry } from '@/types/database';

// Voice characteristics analysis
interface VoiceCharacteristics {
  pitch: {
    average: number;
    range: number;
    stability: number;
  };
  tempo: {
    wordsPerMinute: number;
    pauseFrequency: number;
    consistency: number;
  };
  tone: {
    clarity: number;
    resonance: number;
    breathiness: number;
  };
  patterns: {
    speechRhythm: number;
    inflectionVariance: number;
    volumeConsistency: number;
  };
  uniqueness: {
    distinctiveness: number;
    recognizability: number;
    confidenceScore: number;
  };
}

// Training progress tracking
interface TrainingProgress {
  samplesCount: number;
  qualityScore: number;
  diversityScore: number;
  completeness: number;
  readiness: number;
  lastImproved: Date;
  milestones: TrainingMilestone[];
  recommendations: string[];
}

interface TrainingMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
  requiredFor: 'basic' | 'advanced' | 'expert';
}

// Speaker profile data
interface SpeakerProfile {
  deepgramVoiceId: string;
  userId?: string;
  userName: string;
  email?: string;
  displayName: string;
  avatar?: string;
  voiceCharacteristics: VoiceCharacteristics;
  trainingProgress: TrainingProgress;
  samples: VoiceSample[];
  settings: ProfileSettings;
  metadata: {
    createdAt: Date;
    lastUpdated: Date;
    lastTrained: Date;
    version: string;
    backupCount: number;
  };
  status: 'draft' | 'training' | 'active' | 'archived';
  tags: string[];
  notes?: string;
}

interface ProfileSettings {
  autoUpdate: boolean;
  qualityThreshold: number;
  maxSamples: number;
  enableAdaptiveLearning: boolean;
  privacyLevel: 'public' | 'private' | 'restricted';
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  notificationPreferences: {
    trainingReminders: boolean;
    qualityAlerts: boolean;
    progressUpdates: boolean;
  };
}


// Training session result
interface TrainingResult {
  success: boolean;
  newSamples: number;
  qualityImprovement: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// Props interface
interface SpeakerProfileTrainingProps {
  profileId?: string;
  initialProfile?: Partial<SpeakerProfile>;
  mode?: 'create' | 'edit' | 'view';
  allowAdvancedOptions?: boolean;
  onSave?: (profile: SpeakerProfile) => void;
  onCancel?: () => void;
  onDelete?: (profileId: string) => void;
  onExport?: (profile: SpeakerProfile) => void;
  className?: string;
}

// Default training milestones
const DEFAULT_MILESTONES: TrainingMilestone[] = [
  {
    id: 'first-sample',
    title: 'First Voice Sample',
    description: 'Record your first voice sample',
    completed: false,
    requiredFor: 'basic'
  },
  {
    id: 'quality-threshold',
    title: 'Quality Threshold',
    description: 'Achieve 70% average quality score',
    completed: false,
    requiredFor: 'basic'
  },
  {
    id: 'sample-diversity',
    title: 'Sample Diversity',
    description: 'Record samples from different sources',
    completed: false,
    requiredFor: 'advanced'
  },
  {
    id: 'duration-target',
    title: 'Duration Target',
    description: 'Accumulate 2+ minutes of high-quality audio',
    completed: false,
    requiredFor: 'advanced'
  },
  {
    id: 'consistency-check',
    title: 'Consistency Check',
    description: 'Maintain consistent voice characteristics',
    completed: false,
    requiredFor: 'expert'
  }
];

/**
 * SpeakerProfileTraining - Complete speaker profile creation/editing
 */
export const SpeakerProfileTraining: React.FC<SpeakerProfileTrainingProps> = ({
  profileId,
  initialProfile,
  mode = 'create',
  allowAdvancedOptions = true,
  onSave,
  onCancel,
  onDelete,
  onExport,
  className
}) => {
  // State management
  const [profile, setProfile] = useState<SpeakerProfile>(() => ({
    deepgramVoiceId: profileId || `profile_${Date.now()}`,
    userId: initialProfile?.userId,
    userName: initialProfile?.userName || '',
    email: initialProfile?.email,
    displayName: initialProfile?.displayName || initialProfile?.userName || '',
    voiceCharacteristics: {
      pitch: { average: 0, range: 0, stability: 0 },
      tempo: { wordsPerMinute: 0, pauseFrequency: 0, consistency: 0 },
      tone: { clarity: 0, resonance: 0, breathiness: 0 },
      patterns: { speechRhythm: 0, inflectionVariance: 0, volumeConsistency: 0 },
      uniqueness: { distinctiveness: 0, recognizability: 0, confidenceScore: 0 }
    },
    trainingProgress: {
      samplesCount: 0,
      qualityScore: 0,
      diversityScore: 0,
      completeness: 0,
      readiness: 0,
      lastImproved: new Date(),
      milestones: DEFAULT_MILESTONES,
      recommendations: []
    },
    samples: [],
    settings: {
      autoUpdate: true,
      qualityThreshold: 0.7,
      maxSamples: 20,
      enableAdaptiveLearning: true,
      privacyLevel: 'private',
      backupFrequency: 'weekly',
      notificationPreferences: {
        trainingReminders: true,
        qualityAlerts: true,
        progressUpdates: true
      }
    },
    metadata: {
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastTrained: new Date(),
      version: '1.0.0',
      backupCount: 0
    },
    status: mode === 'create' ? 'draft' : 'active',
    tags: [],
    notes: initialProfile?.notes,
    ...initialProfile
  }));

  const [activeTab, setActiveTab] = useState<'overview' | 'recording' | 'samples' | 'analysis' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);

  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing profile
  useEffect(() => {
    if (profileId && mode !== 'create') {
      loadProfile();
    }
  }, [profileId, mode]);

  // Auto-save functionality
  useEffect(() => {
    if (mode !== 'view' && profile.settings.autoUpdate) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, 2000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [profile, mode]);

  const loadProfile = async () => {
    if (!profileId) return;

    try {
      setIsLoading(true);
      setError(null);

      const voiceEntry = await VoiceLibraryService.getOrCreateVoiceEntry(profileId);
      
      // Convert to full profile format
      const loadedProfile: SpeakerProfile = {
        ...profile,
        deepgramVoiceId: profileId,
        userId: voiceEntry.userId || undefined,
        userName: voiceEntry.userName || 'Unknown Speaker',
        displayName: voiceEntry.userName || 'Unknown Speaker',
        samples: voiceEntry.audioSamples.map(convertToVoiceSample),
        metadata: {
          ...profile.metadata,
          lastUpdated: voiceEntry.lastHeard
        },
        status: voiceEntry.confirmed ? 'active' : 'training'
      };

      // Update training progress
      loadedProfile.trainingProgress = calculateTrainingProgress(loadedProfile.samples);
      loadedProfile.voiceCharacteristics = analyzeVoiceCharacteristics(loadedProfile.samples);

      setProfile(loadedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToVoiceSample = (audioSample: any): VoiceSample => ({
    id: `sample_${Date.now()}_${Math.random()}`,
    url: audioSample.url,
    transcript: audioSample.transcript || '',
    quality: audioSample.quality || 0.5,
    duration: audioSample.duration || 0,
    timestamp: audioSample.timestamp || new Date(),
    isActive: true
  });

  const calculateTrainingProgress = (samples: VoiceSample[]): TrainingProgress => {
    const activeSamples = samples.filter(s => s.isActive);
    const highQualitySamples = activeSamples.filter(s => s.quality >= 0.7);
    
    const progress: TrainingProgress = {
      samplesCount: activeSamples.length,
      qualityScore: activeSamples.length > 0 
        ? activeSamples.reduce((sum, s) => sum + s.quality, 0) / activeSamples.length 
        : 0,
      diversityScore: calculateDiversityScore(activeSamples),
      completeness: Math.min(activeSamples.length / 5, 1), // Target: 5 samples
      readiness: 0,
      lastImproved: new Date(),
      milestones: updateMilestones(activeSamples),
      recommendations: generateRecommendations(activeSamples)
    };

    // Calculate overall readiness
    progress.readiness = (
      progress.completeness * 0.4 + 
      progress.qualityScore * 0.3 + 
      progress.diversityScore * 0.3
    );

    return progress;
  };

  const calculateDiversityScore = (samples: VoiceSample[]): number => {
    if (samples.length === 0) return 0;
    
    // Simple diversity calculation based on transcript variation
    const uniqueWords = new Set();
    samples.forEach(sample => {
      const words = sample.transcript.toLowerCase().split(/\s+/);
      words.forEach(word => uniqueWords.add(word));
    });
    
    return Math.min(uniqueWords.size / 50, 1); // Target: 50 unique words
  };

  const updateMilestones = (samples: VoiceSample[]): TrainingMilestone[] => {
    return DEFAULT_MILESTONES.map(milestone => {
      let completed = milestone.completed;
      
      switch (milestone.id) {
        case 'first-sample':
          completed = samples.length > 0;
          break;
        case 'quality-threshold':
          completed = samples.length > 0 && 
            samples.reduce((sum, s) => sum + s.quality, 0) / samples.length >= 0.7;
          break;
        case 'sample-diversity':
          completed = calculateDiversityScore(samples) >= 0.6;
          break;
        case 'duration-target':
          completed = samples.reduce((sum, s) => sum + s.duration, 0) >= 120; // 2 minutes
          break;
        case 'consistency-check':
          completed = samples.length >= 3 && 
            Math.abs(Math.max(...samples.map(s => s.quality)) - 
                     Math.min(...samples.map(s => s.quality))) < 0.3;
          break;
      }

      return {
        ...milestone,
        completed,
        completedAt: completed && !milestone.completed ? new Date() : milestone.completedAt
      };
    });
  };

  const generateRecommendations = (samples: VoiceSample[]): string[] => {
    const recommendations: string[] = [];
    
    if (samples.length < 3) {
      recommendations.push('Record at least 3 voice samples for better accuracy');
    }
    
    const avgQuality = samples.length > 0 
      ? samples.reduce((sum, s) => sum + s.quality, 0) / samples.length 
      : 0;
    
    if (avgQuality < 0.7) {
      recommendations.push('Improve recording quality - use a quiet environment and speak clearly');
    }
    
    const totalDuration = samples.reduce((sum, s) => sum + s.duration, 0);
    if (totalDuration < 60) {
      recommendations.push('Record longer samples - aim for at least 1 minute total');
    }
    
    if (calculateDiversityScore(samples) < 0.5) {
      recommendations.push('Include more varied speech content for better recognition');
    }
    
    return recommendations;
  };

  const analyzeVoiceCharacteristics = (samples: VoiceSample[]): VoiceCharacteristics => {
    // Simplified voice analysis - in production this would use audio processing
    const avgQuality = samples.length > 0 
      ? samples.reduce((sum, s) => sum + s.quality, 0) / samples.length 
      : 0;
    
    const avgDuration = samples.length > 0 
      ? samples.reduce((sum, s) => sum + s.duration, 0) / samples.length 
      : 0;
    
    return {
      pitch: {
        average: 0.5 + (avgQuality - 0.5) * 0.3,
        range: avgQuality * 0.8,
        stability: avgQuality * 0.9
      },
      tempo: {
        wordsPerMinute: Math.max(100 + (avgDuration - 5) * 2, 80),
        pauseFrequency: 0.3 + avgQuality * 0.4,
        consistency: avgQuality * 0.8
      },
      tone: {
        clarity: avgQuality,
        resonance: avgQuality * 0.9,
        breathiness: (1 - avgQuality) * 0.5
      },
      patterns: {
        speechRhythm: avgQuality * 0.8,
        inflectionVariance: 0.4 + avgQuality * 0.3,
        volumeConsistency: avgQuality * 0.9
      },
      uniqueness: {
        distinctiveness: Math.min(samples.length * 0.2, 1),
        recognizability: avgQuality,
        confidenceScore: avgQuality * Math.min(samples.length / 5, 1)
      }
    };
  };

  const autoSave = async () => {
    if (mode === 'view' || isSaving) return;

    try {
      const updatedProfile = {
        ...profile,
        metadata: {
          ...profile.metadata,
          lastUpdated: new Date()
        }
      };

      // Save to VoiceLibraryService
      if (updatedProfile.samples.length > 0) {
        for (const sample of updatedProfile.samples.slice(0, 5)) {
          await VoiceLibraryService.addAudioSample(updatedProfile.deepgramVoiceId, {
            url: sample.url,
            transcript: sample.transcript,
            quality: sample.quality,
            duration: sample.duration
          });
        }
      }

      setProfile(updatedProfile);
    } catch (err) {
      console.warn('Auto-save failed:', err);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const savedProfile = {
        ...profile,
        metadata: {
          ...profile.metadata,
          lastUpdated: new Date(),
          lastTrained: new Date()
        },
        status: 'active' as const
      };

      // Save profile data
      await saveProfileToFirebase(savedProfile);
      
      setProfile(savedProfile);
      onSave?.(savedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileToFirebase = async (profileToSave: SpeakerProfile) => {
    // Update voice identification
    if (profileToSave.userId) {
      await VoiceLibraryService.identifyVoice(
        profileToSave.deepgramVoiceId,
        profileToSave.userId,
        profileToSave.userName,
        'manual',
        'training_session',
        profileToSave.trainingProgress.readiness
      );
    }

    // Add all samples
    for (const sample of profileToSave.samples) {
      await VoiceLibraryService.addAudioSample(profileToSave.deepgramVoiceId, {
        url: sample.url,
        transcript: sample.transcript,
        quality: sample.quality,
        duration: sample.duration
      });
    }
  };

  const handleSamplesUpdate = useCallback((samples: VoiceSample[]) => {
    setProfile(prev => {
      const updated = {
        ...prev,
        samples,
        trainingProgress: calculateTrainingProgress(samples),
        voiceCharacteristics: analyzeVoiceCharacteristics(samples),
        metadata: {
          ...prev.metadata,
          lastUpdated: new Date()
        }
      };
      
      return updated;
    });
  }, []);

  const handleRecordingComplete = useCallback((newSamples: any[]) => {
    const voiceSamples: VoiceSample[] = newSamples.map(session => ({
      id: session.id,
      url: session.url!,
      transcript: session.transcript || `Recording ${new Date().toLocaleString()}`,
      quality: session.qualityMetrics.overallScore,
      duration: session.duration,
      timestamp: session.endTime || new Date(),
      isActive: true
    }));

    setProfile(prev => ({
      ...prev,
      samples: [...prev.samples, ...voiceSamples]
    }));

    setTrainingResult({
      success: true,
      newSamples: voiceSamples.length,
      qualityImprovement: 0.1, // Simplified
      errors: [],
      warnings: [],
      recommendations: ['Great job! Continue with more diverse samples.']
    });
  }, []);

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsLoading(true);
      await onDelete(profile.deepgramVoiceId);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError('Failed to delete profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    onExport?.(profile);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'recording', label: 'Recording', icon: <Mic className="w-4 h-4" /> },
    { id: 'samples', label: 'Samples', icon: <FileAudio className="w-4 h-4" /> },
    { id: 'analysis', label: 'Analysis', icon: <BarChart className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {mode === 'create' ? 'Create Voice Profile' : profile.displayName}
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  {mode === 'create' 
                    ? 'Set up a new speaker voice profile' 
                    : `${profile.samples.length} samples • ${Math.round(profile.trainingProgress.readiness * 100)}% ready`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
              ${profile.status === 'active' 
                ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                : profile.status === 'training'
                  ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }
            `}>
              {profile.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
              {profile.status === 'training' && <Activity className="w-3 h-3 mr-1" />}
              {profile.status === 'draft' && <Edit className="w-3 h-3 mr-1" />}
              {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
            </span>

            {mode !== 'view' && (
              <PrimaryButton
                onClick={handleSave}
                loading={isSaving}
                leftIcon={<Save className="w-4 h-4" />}
                disabled={profile.samples.length === 0}
              >
                Save Profile
              </PrimaryButton>
            )}

            {mode === 'edit' && (
              <DangerButton
                onClick={() => setShowDeleteConfirm(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </DangerButton>
            )}

            {onCancel && (
              <SecondaryButton onClick={onCancel}>
                {mode === 'view' ? 'Close' : 'Cancel'}
              </SecondaryButton>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Samples</span>
              <FileAudio className="w-4 h-4 text-primary-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {profile.trainingProgress.samplesCount}
            </div>
            <div className="text-xs text-neutral-500">Target: 5+</div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quality</span>
              <Star className="w-4 h-4 text-warning-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {Math.round(profile.trainingProgress.qualityScore * 100)}%
            </div>
            <div className="text-xs text-neutral-500">Target: 70%+</div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Diversity</span>
              <TrendingUp className="w-4 h-4 text-success-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {Math.round(profile.trainingProgress.diversityScore * 100)}%
            </div>
            <div className="text-xs text-neutral-500">Target: 60%+</div>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Readiness</span>
              <Target className="w-4 h-4 text-primary-600" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {Math.round(profile.trainingProgress.readiness * 100)}%
            </div>
            <div className="text-xs text-neutral-500">Target: 80%+</div>
          </div>
        </div>
      </Card>

      {/* Error display */}
      {error && (
        <Card className="p-4 border-danger-200 bg-danger-50 dark:bg-danger-900/20">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
            <p className="text-danger-800 dark:text-danger-200">{error}</p>
          </div>
        </Card>
      )}

      {/* Training result */}
      <AnimatePresence>
        {trainingResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 z-50"
          >
            <Card className="p-4 border-success-200 bg-success-50 dark:bg-success-900/20">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-success-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-success-800 dark:text-success-200">
                    Training Complete!
                  </h3>
                  <p className="text-sm text-success-700 dark:text-success-300">
                    Added {trainingResult.newSamples} samples
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTrainingResult(null)}
                    className="mt-2 text-success-700 hover:text-success-800"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Card className="p-0">
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic information */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                               bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                               focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      placeholder="Enter display name"
                      disabled={mode === 'view'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={profile.email || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                               bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                               focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      placeholder="speaker@example.com"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={profile.notes || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                             bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                             focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    rows={3}
                    placeholder="Additional notes about this speaker..."
                    disabled={mode === 'view'}
                  />
                </div>
              </div>

              {/* Training milestones */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Training Progress
                </h3>
                
                <div className="space-y-3">
                  {profile.trainingProgress.milestones.map((milestone) => (
                    <div 
                      key={milestone.id}
                      className={`
                        flex items-center space-x-3 p-3 rounded-lg border
                        ${milestone.completed 
                          ? 'border-success-200 bg-success-50 dark:bg-success-900/20'
                          : 'border-neutral-200 bg-neutral-50 dark:bg-neutral-800'
                        }
                      `}
                    >
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center
                        ${milestone.completed 
                          ? 'bg-success-600 text-white'
                          : 'border-2 border-neutral-300 bg-white'
                        }
                      `}>
                        {milestone.completed && <CheckCircle className="w-4 h-4" />}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                          {milestone.title}
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {milestone.description}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${milestone.requiredFor === 'basic'
                            ? 'bg-primary-100 text-primary-700'
                            : milestone.requiredFor === 'advanced'
                              ? 'bg-warning-100 text-warning-700'
                              : 'bg-danger-100 text-danger-700'
                          }
                        `}>
                          {milestone.requiredFor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {profile.trainingProgress.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    Recommendations
                  </h3>
                  
                  <div className="space-y-2">
                    {profile.trainingProgress.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Target className="w-4 h-4 text-primary-600 mt-0.5" />
                        <p className="text-neutral-700 dark:text-neutral-300">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recording Tab */}
          {activeTab === 'recording' && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Voice Recording
              </h3>
              
              <VoiceRecordingInterface
                speakerName={profile.displayName}
                onRecordingComplete={handleRecordingComplete}
                minimumSessions={3}
                qualityThreshold={0.7}
              />
            </div>
          )}

          {/* Samples Tab */}
          {activeTab === 'samples' && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Voice Samples Management
              </h3>
              
              <VoiceTrainingSampleManager
                speakerProfile={{
                  deepgramVoiceId: profile.deepgramVoiceId,
                  userId: profile.userId,
                  userName: profile.userName,
                  samples: profile.samples.map(sample => sanitizeVoiceSample({
                    ...sample,
                    blob: undefined,
                    source: 'training-session' as const,
                    metadata: {
                      deepgramVoiceId: profile.deepgramVoiceId,
                      meetingId: '',
                      duration: sample.duration,
                      quality: sample.quality,
                      transcript: sample.transcript,
                      uploadedAt: sample.timestamp.toISOString(),
                      filePath: sample.url,
                    },
                    isStarred: false,
                    qualityLevel: (sample.quality >= 0.8 ? 'excellent' : 
                                 sample.quality >= 0.6 ? 'good' : 
                                 sample.quality >= 0.4 ? 'fair' : 'poor') as 'excellent' | 'good' | 'fair' | 'poor',
                    tags: [],
                    notes: undefined
                  })),
                  averageQuality: profile.trainingProgress.qualityScore,
                  totalDuration: profile.samples.reduce((sum, s) => sum + s.duration, 0),
                  lastUpdated: profile.metadata.lastUpdated,
                  trainingCompleteness: profile.trainingProgress.completeness,
                  recommendedActions: profile.trainingProgress.recommendations
                }}
                onSamplesUpdate={handleSamplesUpdate}
                allowBulkOperations={mode !== 'view'}
                allowFileUpload={mode !== 'view'}
                allowMeetingImport={mode !== 'view'}
              />
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Voice Analysis
              </h3>

              {/* Voice characteristics visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                    Voice Characteristics
                  </h4>
                  
                  <div className="space-y-4">
                    {Object.entries(profile.voiceCharacteristics).map(([category, values]) => (
                      <div key={category}>
                        <h5 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 capitalize">
                          {category}
                        </h5>
                        <div className="space-y-2">
                          {Object.entries(values).map(([metric, value]) => (
                            <div key={metric} className="flex items-center justify-between">
                              <span className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                                {metric.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                                  <div 
                                    className="bg-primary-600 h-2 rounded-full"
                                    style={{ width: `${(value as number) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm text-neutral-600 dark:text-neutral-400 w-10">
                                  {Math.round((value as number) * 100)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                    Training Statistics
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Samples</span>
                      <span className="font-medium">{profile.samples.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Active Samples</span>
                      <span className="font-medium">{profile.samples.filter(s => s.isActive).length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Average Quality</span>
                      <span className="font-medium">{Math.round(profile.trainingProgress.qualityScore * 100)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Duration</span>
                      <span className="font-medium">
                        {Math.round(profile.samples.reduce((sum, s) => sum + s.duration, 0))}s
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Training Readiness</span>
                      <span className={`
                        font-medium
                        ${profile.trainingProgress.readiness >= 0.8 
                          ? 'text-success-600' 
                          : profile.trainingProgress.readiness >= 0.6 
                            ? 'text-warning-600' 
                            : 'text-danger-600'
                        }
                      `}>
                        {Math.round(profile.trainingProgress.readiness * 100)}%
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Profile Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                    Training Settings
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Auto Update
                        </label>
                        <p className="text-xs text-neutral-500">
                          Automatically save changes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={profile.settings.autoUpdate}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          settings: { ...prev.settings, autoUpdate: e.target.checked }
                        }))}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        disabled={mode === 'view'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Quality Threshold ({Math.round(profile.settings.qualityThreshold * 100)}%)
                      </label>
                      <input
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.05"
                        value={profile.settings.qualityThreshold}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          settings: { ...prev.settings, qualityThreshold: parseFloat(e.target.value) }
                        }))}
                        className="w-full"
                        disabled={mode === 'view'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Maximum Samples
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={profile.settings.maxSamples}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          settings: { ...prev.settings, maxSamples: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                                 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                                 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                    Privacy & Notifications
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Privacy Level
                      </label>
                      <select
                        value={profile.settings.privacyLevel}
                        onChange={(e) => setProfile(prev => ({
                          ...prev,
                          settings: { ...prev.settings, privacyLevel: e.target.value as any }
                        }))}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                                 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                                 focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                        disabled={mode === 'view'}
                      >
                        <option value="private">Private</option>
                        <option value="restricted">Restricted</option>
                        <option value="public">Public</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Training Reminders</span>
                        <input
                          type="checkbox"
                          checked={profile.settings.notificationPreferences.trainingReminders}
                          onChange={(e) => setProfile(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              notificationPreferences: {
                                ...prev.settings.notificationPreferences,
                                trainingReminders: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          disabled={mode === 'view'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Quality Alerts</span>
                        <input
                          type="checkbox"
                          checked={profile.settings.notificationPreferences.qualityAlerts}
                          onChange={(e) => setProfile(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              notificationPreferences: {
                                ...prev.settings.notificationPreferences,
                                qualityAlerts: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          disabled={mode === 'view'}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">Progress Updates</span>
                        <input
                          type="checkbox"
                          checked={profile.settings.notificationPreferences.progressUpdates}
                          onChange={(e) => setProfile(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              notificationPreferences: {
                                ...prev.settings.notificationPreferences,
                                progressUpdates: e.target.checked
                              }
                            }
                          }))}
                          className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                          disabled={mode === 'view'}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-danger-600" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Delete Voice Profile?
                </h3>
              </div>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                This will permanently delete the voice profile for "{profile.displayName}" and all associated voice samples. 
                This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <SecondaryButton
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </SecondaryButton>
                <DangerButton
                  onClick={handleDelete}
                  loading={isLoading}
                  className="flex-1"
                >
                  Delete Profile
                </DangerButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpeakerProfileTraining;