'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { sanitizeVoiceSample } from '@/utils/sanitization';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Upload,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Star,
  StarOff,
  Download,
  FileAudio,
  AudioWaveform,
  Clock,
  BarChart,
  Settings,
  Filter,
  Search,
  ArrowUpDown,
  MoreVertical,
  Volume2,
  Info,
  Target,
  TrendingUp,
  FileX,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { ClientStorageService, VoiceSampleMetadata } from '@/services/firebase/ClientStorageService';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import type { VoiceLibraryEntry } from '@/types/database';
import { VoiceSample } from '@/types/voice-identification';

// Sample quality levels (legacy compatibility)
type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'low' | 'medium' | 'high';

// Sample source types (legacy compatibility)  
type SampleSource = 'live-recording' | 'file-upload' | 'meeting-extract' | 'training-session' | 'upload' | 'meeting' | 'training';

// Speaker profile interface
interface SpeakerProfile {
  deepgramVoiceId: string;
  userId?: string;
  userName: string;
  samples: VoiceSample[];
  averageQuality: number;
  totalDuration: number;
  lastUpdated: Date;
  trainingCompleteness: number;
  recommendedActions: string[];
}

// Filter and sort options
interface FilterOptions {
  qualityLevel?: QualityLevel[];
  source?: SampleSource[];
  duration?: { min: number; max: number };
  starred?: boolean;
  active?: boolean;
  searchTerm?: string;
}

interface SortOptions {
  field: 'timestamp' | 'quality' | 'duration' | 'transcript';
  order: 'asc' | 'desc';
}

// Props interface
interface VoiceTrainingSampleManagerProps {
  speakerProfile?: SpeakerProfile;
  deepgramVoiceId?: string;
  allowBulkOperations?: boolean;
  allowFileUpload?: boolean;
  allowMeetingImport?: boolean;
  onSamplesUpdate?: (samples: VoiceSample[]) => void;
  onProfileUpdate?: (profile: SpeakerProfile) => void;
  className?: string;
}

// Quality level configurations
const QUALITY_CONFIGS = {
  excellent: { 
    color: 'success', 
    threshold: 0.85, 
    label: 'Excellent',
    icon: <Star className="w-4 h-4" />
  },
  good: { 
    color: 'primary', 
    threshold: 0.7, 
    label: 'Good',
    icon: <CheckCircle className="w-4 h-4" />
  },
  fair: { 
    color: 'warning', 
    threshold: 0.5, 
    label: 'Fair',
    icon: <AlertTriangle className="w-4 h-4" />
  },
  poor: { 
    color: 'danger', 
    threshold: 0, 
    label: 'Poor',
    icon: <FileX className="w-4 h-4" />
  },
  // Adding aliases for VoiceSampleAnalysis qualityLevel values
  high: { 
    color: 'success', 
    threshold: 0.85, 
    label: 'High',
    icon: <Star className="w-4 h-4" />
  },
  medium: { 
    color: 'warning', 
    threshold: 0.5, 
    label: 'Medium',
    icon: <AlertTriangle className="w-4 h-4" />
  },
  low: { 
    color: 'danger', 
    threshold: 0, 
    label: 'Low',
    icon: <FileX className="w-4 h-4" />
  }
};

/**
 * VoiceTrainingSampleManager - Manage existing training samples for speakers
 */
export const VoiceTrainingSampleManager: React.FC<VoiceTrainingSampleManagerProps> = ({
  speakerProfile: initialProfile,
  deepgramVoiceId,
  allowBulkOperations = true,
  allowFileUpload = true,
  allowMeetingImport = true,
  onSamplesUpdate,
  onProfileUpdate,
  className
}) => {
  // State management
  const [profile, setProfile] = useState<SpeakerProfile | null>(initialProfile || null);
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'timestamp', order: 'desc' });
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Initialize data
  useEffect(() => {
    if (deepgramVoiceId && !initialProfile) {
      loadSpeakerProfile();
    } else if (initialProfile) {
      setSamples(initialProfile.samples);
    }
  }, [deepgramVoiceId, initialProfile]);

  // Update parent when samples change
  useEffect(() => {
    onSamplesUpdate?.(samples);
    if (profile) {
      const updatedProfile = {
        ...profile,
        samples,
        averageQuality: calculateAverageQuality(samples),
        totalDuration: samples.reduce((sum, sample) => sum + sample.duration, 0),
        lastUpdated: new Date(),
        trainingCompleteness: calculateTrainingCompleteness(samples)
      };
      setProfile(updatedProfile);
      onProfileUpdate?.(updatedProfile);
    }
  }, [samples, profile, onSamplesUpdate, onProfileUpdate]);

  const loadSpeakerProfile = async () => {
    if (!deepgramVoiceId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load from VoiceLibraryService
      const voiceEntry = await VoiceLibraryService.getOrCreateVoiceEntry(deepgramVoiceId);
      
      // Convert to speaker profile format
      const profileData: SpeakerProfile = {
        deepgramVoiceId,
        userId: voiceEntry.userId || undefined,
        userName: voiceEntry.userName || 'Unknown Speaker',
        samples: voiceEntry.audioSamples.map(convertToVoiceSample),
        averageQuality: 0,
        totalDuration: 0,
        lastUpdated: voiceEntry.lastHeard,
        trainingCompleteness: 0,
        recommendedActions: []
      };

      profileData.averageQuality = calculateAverageQuality(profileData.samples);
      profileData.totalDuration = profileData.samples.reduce((sum, s) => sum + s.duration, 0);
      profileData.trainingCompleteness = calculateTrainingCompleteness(profileData.samples);
      profileData.recommendedActions = generateRecommendations(profileData);

      setProfile(profileData);
      setSamples(profileData.samples);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load speaker profile');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToVoiceSample = (audioSample: any): VoiceSample => {
    const quality = audioSample.quality || 0.5;
    return {
      id: `sample_${Date.now()}_${Math.random()}`,
      url: audioSample.url,
      transcript: audioSample.transcript || '',
      quality,
      duration: audioSample.duration || 0,
      source: 'meeting-extract' as SampleSource,
      timestamp: audioSample.timestamp || new Date(),
      metadata: {
        deepgramVoiceId: deepgramVoiceId!,
        meetingId: 'unknown',
        duration: audioSample.duration || 0,
        uploadedAt: audioSample.timestamp?.toISOString() || new Date().toISOString(),
        filePath: audioSample.url
      },
      isStarred: false,
      isActive: true,
      qualityLevel: getQualityLevel(quality),
      tags: [],
      notes: undefined
    };
  };

  const calculateAverageQuality = (sampleList: VoiceSample[]): number => {
    if (sampleList.length === 0) return 0;
    return sampleList.reduce((sum, sample) => sum + sample.quality, 0) / sampleList.length;
  };

  const calculateTrainingCompleteness = (sampleList: VoiceSample[]): number => {
    const activeHighQualitySamples = sampleList.filter(s => 
      s.isActive && s.quality >= 0.7
    ).length;
    
    // Target is 5 high-quality samples
    return Math.min(activeHighQualitySamples / 5, 1);
  };

  const generateRecommendations = (profileData: SpeakerProfile): string[] => {
    const recommendations: string[] = [];
    const activeSamples = profileData.samples.filter(s => s.isActive);
    const highQualitySamples = activeSamples.filter(s => s.quality >= 0.7);
    
    if (activeSamples.length < 3) {
      recommendations.push('Add more voice samples (minimum 3 recommended)');
    }
    
    if (highQualitySamples.length < 2) {
      recommendations.push('Improve sample quality - record in quiet environment');
    }
    
    if (profileData.totalDuration < 30) {
      recommendations.push('Record longer samples for better training');
    }
    
    const sourceDiversity = new Set(activeSamples.map(s => s.source)).size;
    if (sourceDiversity < 2) {
      recommendations.push('Use multiple recording sources for better coverage');
    }
    
    return recommendations;
  };

  const getQualityLevel = (quality: number): QualityLevel => {
    if (quality >= QUALITY_CONFIGS.excellent.threshold) return 'excellent';
    if (quality >= QUALITY_CONFIGS.good.threshold) return 'good';
    if (quality >= QUALITY_CONFIGS.fair.threshold) return 'fair';
    return 'poor';
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files.length) return;

    const newSamples: VoiceSample[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('audio/')) {
        continue;
      }

      try {
        setIsLoading(true);

        // Create blob URL for preview
        const url = URL.createObjectURL(file);
        
        // Get duration
        const audio = new Audio(url);
        await new Promise((resolve) => {
          audio.onloadedmetadata = resolve;
        });

        // Calculate quality based on file properties
        const quality = Math.min(
          (file.size / (1024 * 1024)) * 0.1 + 0.5, // File size factor
          1
        );

        const sample: VoiceSample = {
          id: `upload_${Date.now()}_${i}`,
          url,
          blob: file,
          transcript: `Uploaded audio: ${file.name}`,
          quality,
          duration: audio.duration,
          source: 'file-upload',
          timestamp: new Date(),
          metadata: {
            deepgramVoiceId: deepgramVoiceId || 'unknown',
            meetingId: 'upload',
            duration: audio.duration,
            uploadedAt: new Date().toISOString(),
            filePath: file.name
          },
          isStarred: false,
          isActive: true,
          qualityLevel: getQualityLevel(quality),
          tags: ['uploaded'],
          notes: `Original filename: ${file.name}`
        };

        newSamples.push(sample);
      } catch (err) {
        console.error('Error processing uploaded file:', err);
      }
    }

    setSamples(prev => [...prev, ...newSamples]);
    setIsLoading(false);
  }, [deepgramVoiceId]);

  const playSample = useCallback(async (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    // Stop current audio if playing
    if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
      audioRefs.current[currentlyPlaying].pause();
      audioRefs.current[currentlyPlaying].currentTime = 0;
    }

    try {
      if (!audioRefs.current[sampleId]) {
        audioRefs.current[sampleId] = new Audio(sample.url);
        audioRefs.current[sampleId].onended = () => {
          setCurrentlyPlaying(null);
        };
      }

      const audio = audioRefs.current[sampleId];
      await audio.play();
      setCurrentlyPlaying(sampleId);
    } catch (err) {
      setError('Unable to play audio sample');
      console.error('Audio playback error:', err);
    }
  }, [samples, currentlyPlaying]);

  const stopPlayback = useCallback(() => {
    if (currentlyPlaying && audioRefs.current[currentlyPlaying]) {
      audioRefs.current[currentlyPlaying].pause();
      audioRefs.current[currentlyPlaying].currentTime = 0;
      setCurrentlyPlaying(null);
    }
  }, [currentlyPlaying]);

  const toggleSampleStar = useCallback((sampleId: string) => {
    setSamples(prev => prev.map(sample => 
      sample.id === sampleId 
        ? { ...sample, isStarred: !sample.isStarred }
        : sample
    ));
  }, []);

  const toggleSampleActive = useCallback((sampleId: string) => {
    setSamples(prev => prev.map(sample => 
      sample.id === sampleId 
        ? { ...sample, isActive: !sample.isActive }
        : sample
    ));
  }, []);

  const deleteSample = useCallback((sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (sample?.url.startsWith('blob:')) {
      URL.revokeObjectURL(sample.url);
    }
    
    setSamples(prev => prev.filter(sample => sample.id !== sampleId));
    
    if (audioRefs.current[sampleId]) {
      audioRefs.current[sampleId].pause();
      delete audioRefs.current[sampleId];
    }

    if (currentlyPlaying === sampleId) {
      setCurrentlyPlaying(null);
    }
  }, [samples, currentlyPlaying]);

  const handleBulkAction = useCallback((action: 'delete' | 'activate' | 'deactivate' | 'star' | 'unstar') => {
    setSamples(prev => {
      const updated = prev.map(sample => {
        if (!selectedSamples.has(sample.id)) return sample;
        
        switch (action) {
          case 'activate':
            return { ...sample, isActive: true };
          case 'deactivate':
            return { ...sample, isActive: false };
          case 'star':
            return { ...sample, isStarred: true };
          case 'unstar':
            return { ...sample, isStarred: false };
          default:
            return sample;
        }
      });

      if (action === 'delete') {
        // Clean up blob URLs and audio refs
        prev.forEach(sample => {
          if (selectedSamples.has(sample.id)) {
            if (sample.url.startsWith('blob:')) {
              URL.revokeObjectURL(sample.url);
            }
            if (audioRefs.current[sample.id]) {
              audioRefs.current[sample.id].pause();
              delete audioRefs.current[sample.id];
            }
          }
        });

        return updated.filter(sample => !selectedSamples.has(sample.id));
      }

      return updated;
    });

    setSelectedSamples(new Set());
    setShowBulkActions(false);
  }, [selectedSamples]);

  const filteredAndSortedSamples = samples
    .filter(sample => {
      // Apply filters
      if (filters.qualityLevel?.length && sample.qualityLevel && !filters.qualityLevel.includes(sample.qualityLevel)) {
        return false;
      }
      if (filters.source?.length && sample.source && !filters.source.includes(sample.source)) {
        return false;
      }
      if (filters.duration) {
        if (sample.duration < filters.duration.min || sample.duration > filters.duration.max) {
          return false;
        }
      }
      if (filters.starred !== undefined && sample.isStarred !== filters.starred) {
        return false;
      }
      if (filters.active !== undefined && sample.isActive !== filters.active) {
        return false;
      }
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return sample.transcript.toLowerCase().includes(searchLower) ||
               sample.notes?.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .sort((a, b) => {
      const { field, order } = sortOptions;
      let aVal, bVal;
      
      switch (field) {
        case 'timestamp':
          aVal = a.timestamp.getTime();
          bVal = b.timestamp.getTime();
          break;
        case 'quality':
          aVal = a.quality;
          bVal = b.quality;
          break;
        case 'duration':
          aVal = a.duration;
          bVal = b.duration;
          break;
        case 'transcript':
          aVal = a.transcript.toLowerCase();
          bVal = b.transcript.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header with profile overview */}
      {profile && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Voice Training Samples
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Managing samples for {profile.userName}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm text-neutral-500">Training Progress</div>
                <div className="text-lg font-semibold text-primary-600">
                  {Math.round(profile.trainingCompleteness * 100)}%
                </div>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${profile.trainingCompleteness * 100}, 100`}
                    className="text-primary-600"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-neutral-200 dark:text-neutral-700"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {samples.filter(s => s.isActive).length}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Active Samples</div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {Math.round(profile.averageQuality * 100)}%
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Avg Quality</div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {Math.round(profile.totalDuration)}s
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Duration</div>
            </div>
            
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {samples.filter(s => s.isStarred).length}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Starred</div>
            </div>
          </div>

          {/* Recommendations */}
          {profile.recommendedActions.length > 0 && (
            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <TrendingUp className="w-5 h-5 text-warning-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-warning-800 dark:text-warning-200 mb-2">
                    Recommendations to improve training
                  </h3>
                  <ul className="text-sm text-warning-700 dark:text-warning-300 space-y-1">
                    {profile.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Target className="w-3 h-3 mt-0.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Error display */}
      {error && (
        <Card className="p-4 border-danger-200 bg-danger-50 dark:bg-danger-900/20">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
            <p className="text-danger-800 dark:text-danger-200">{error}</p>
          </div>
        </Card>
      )}

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Left side: Add samples */}
          <div className="flex items-center space-x-3">
            {allowFileUpload && (
              <>
                <PrimaryButton
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload className="w-4 h-4" />}
                  disabled={isLoading}
                >
                  Upload Audio
                </PrimaryButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
              </>
            )}

            {allowMeetingImport && (
              <SecondaryButton
                leftIcon={<FileAudio className="w-4 h-4" />}
                disabled={isLoading}
              >
                Import from Meetings
              </SecondaryButton>
            )}
          </div>

          {/* Right side: View controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filters
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              leftIcon={viewMode === 'grid' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            >
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </Button>

            {allowBulkOperations && selectedSamples.size > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBulkActions(!showBulkActions)}
                leftIcon={<MoreVertical className="w-4 h-4" />}
              >
                Bulk Actions ({selectedSamples.size})
              </Button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search transcripts..."
                      className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                               bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
                               focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      value={filters.searchTerm || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Quality Level
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                             bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
                             focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    value={filters.qualityLevel?.[0] || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      qualityLevel: e.target.value ? [e.target.value as QualityLevel] : undefined 
                    }))}
                  >
                    <option value="">All Qualities</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Sort By
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                             bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100
                             focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    value={`${sortOptions.field}-${sortOptions.order}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortOptions({ 
                        field: field as SortOptions['field'], 
                        order: order as SortOptions['order'] 
                      });
                    }}
                  >
                    <option value="timestamp-desc">Newest First</option>
                    <option value="timestamp-asc">Oldest First</option>
                    <option value="quality-desc">Best Quality</option>
                    <option value="quality-asc">Worst Quality</option>
                    <option value="duration-desc">Longest</option>
                    <option value="duration-asc">Shortest</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk actions panel */}
        <AnimatePresence>
          {showBulkActions && selectedSamples.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('activate')}
                  leftIcon={<CheckCircle className="w-3 h-3" />}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('deactivate')}
                  leftIcon={<EyeOff className="w-3 h-3" />}
                >
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('star')}
                  leftIcon={<Star className="w-3 h-3" />}
                >
                  Star
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('unstar')}
                  leftIcon={<StarOff className="w-3 h-3" />}
                >
                  Unstar
                </Button>
                <DangerButton
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  leftIcon={<Trash2 className="w-3 h-3" />}
                >
                  Delete
                </DangerButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Samples display */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading samples...</p>
        </Card>
      ) : filteredAndSortedSamples.length === 0 ? (
        <Card className="p-12 text-center">
          <FileAudio className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            No voice samples found
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Upload audio files or record new samples to get started with voice training.
          </p>
          {allowFileUpload && (
            <PrimaryButton
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Your First Sample
            </PrimaryButton>
          )}
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        }>
          {filteredAndSortedSamples.map((sample) => (
            <SampleCard
              key={sample.id}
              sample={sample}
              isSelected={selectedSamples.has(sample.id)}
              isPlaying={currentlyPlaying === sample.id}
              viewMode={viewMode}
              allowBulkOperations={allowBulkOperations}
              onSelect={(selected) => {
                const newSelection = new Set(selectedSamples);
                if (selected) {
                  newSelection.add(sample.id);
                } else {
                  newSelection.delete(sample.id);
                }
                setSelectedSamples(newSelection);
              }}
              onPlay={() => playSample(sample.id)}
              onStop={stopPlayback}
              onToggleStar={() => toggleSampleStar(sample.id)}
              onToggleActive={() => toggleSampleActive(sample.id)}
              onDelete={() => deleteSample(sample.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual sample card component
interface SampleCardProps {
  sample: VoiceSample;
  isSelected: boolean;
  isPlaying: boolean;
  viewMode: 'grid' | 'list';
  allowBulkOperations: boolean;
  onSelect: (selected: boolean) => void;
  onPlay: () => void;
  onStop: () => void;
  onToggleStar: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

const SampleCard: React.FC<SampleCardProps> = ({
  sample,
  isSelected,
  isPlaying,
  viewMode,
  allowBulkOperations,
  onSelect,
  onPlay,
  onStop,
  onToggleStar,
  onToggleActive,
  onDelete
}) => {
  const qualityConfig = sample.qualityLevel ? QUALITY_CONFIGS[sample.qualityLevel] : QUALITY_CONFIGS.fair;

  return (
    <Card className={`
      p-4 transition-all cursor-pointer
      ${isSelected ? 'ring-2 ring-primary-600 border-primary-600' : ''}
      ${!sample.isActive ? 'opacity-60' : ''}
    `}>
      <div className={`
        ${viewMode === 'list' ? 'flex items-center space-x-4' : 'space-y-3'}
      `}>
        {/* Selection checkbox */}
        {allowBulkOperations && (
          <div className={viewMode === 'list' ? '' : 'flex justify-between items-start'}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Sample info */}
        <div className={viewMode === 'list' ? 'flex-1' : ''}>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`
              inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
              ${qualityConfig.color === 'success' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                qualityConfig.color === 'primary' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' :
                qualityConfig.color === 'warning' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300'
              }
            `}>
              {qualityConfig.icon}
              <span>{qualityConfig.label}</span>
            </span>
            
            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              <Clock className="w-3 h-3" />
              <span>{sample.duration.toFixed(1)}s</span>
            </span>

            {sample.isStarred && (
              <Star className="w-4 h-4 text-warning-500" />
            )}
            
            {!sample.isActive && (
              <EyeOff className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-2">
            {sample.transcript}
          </p>

          <div className="text-xs text-neutral-500 mt-1">
            {sample.source} • {sample.timestamp.toLocaleDateString()}
          </div>
        </div>

        {/* Actions */}
        <div className={`
          flex items-center space-x-2
          ${viewMode === 'list' ? '' : 'justify-end'}
        `}>
          <Button
            size="sm"
            variant="outline"
            onClick={isPlaying ? onStop : onPlay}
            leftIcon={isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleStar}
            className={sample.isStarred ? 'text-warning-600' : 'text-neutral-400'}
          >
            <Star className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleActive}
            className={sample.isActive ? 'text-success-600' : 'text-neutral-400'}
          >
            {sample.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-danger-600 hover:text-danger-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default VoiceTrainingSampleManager;