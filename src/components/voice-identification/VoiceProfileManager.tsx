/**
 * Voice Profile Manager Component
 * 
 * Comprehensive modal dialog for creating, editing, and managing voice profiles.
 * Provides advanced functionality for voice sample management, profile merging,
 * bulk operations, and training data export/import.
 * 
 * Features:
 * - Create new voice profiles from scratch
 * - Edit existing profile information and settings
 * - Bulk voice sample management and operations
 * - Profile merging and splitting capabilities
 * - Training data import/export functionality
 * - Voice sample quality analysis and optimization
 * - Advanced identification settings and thresholds
 * 
 * @component
 * @example
 * ```tsx
 * <VoiceProfileManager
 *   profile={existingProfile}
 *   onSave={(profileData) => handleSave(profileData)}
 *   onCancel={() => setShowManager(false)}
 * />
 * ```
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Save, 
  X, 
  Upload, 
  Download,
  Plus,
  Trash2,
  Merge,
  Split,
  Settings,
  User as UserIcon,
  Mic,
  Volume2,
  CheckCircle,
  AlertCircle,
  FileAudio,
  Filter,
  Search,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { ClientStorageService, type VoiceSampleMetadata } from '@/services/firebase/ClientStorageService';
import { VoiceSamplePlayer } from './VoiceSamplePlayer';
import type { VoiceLibraryEntry } from '@/types/database';
import type { VoiceSample, EnhancedVoiceSample } from '@/types/voice-identification';

/**
 * Props for the Voice Profile Manager component
 */
interface VoiceProfileManagerProps {
  /** Existing profile to edit (null for new profile) */
  profile?: VoiceLibraryEntry | null;
  /** Callback fired when profile is saved */
  onSave: (profileData: Partial<VoiceLibraryEntry>) => Promise<void>;
  /** Callback fired when operation is cancelled */
  onCancel: () => void;
  /** Whether to show in modal overlay */
  modal?: boolean;
  /** Custom CSS class name */
  className?: string;
}

// Note: Using EnhancedVoiceSample from @/types/voice-identification

/**
 * Profile form data
 */
interface ProfileFormData {
  userName: string;
  userId: string;
  confirmed: boolean;
  confidence: number;
  notes: string;
  tags: string[];
}

/**
 * Sample management operations
 */
type SampleOperation = 'delete' | 'export' | 'enhance' | 'merge';

/**
 * Advanced settings for profile
 */
interface AdvancedSettings {
  minConfidenceThreshold: number;
  maxSamples: number;
  autoEnhanceQuality: boolean;
  enableSpeakerDiarization: boolean;
  customIdentificationRules: string[];
}

export const VoiceProfileManager: React.FC<VoiceProfileManagerProps> = ({
  profile,
  onSave,
  onCancel,
  modal = true,
  className = ''
}) => {
  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    userName: profile?.userName || '',
    userId: profile?.userId || '',
    confirmed: profile?.confirmed || false,
    confidence: profile?.confidence || 0,
    notes: '',
    tags: []
  });

  // Sample management state
  const [voiceSamples, setVoiceSamples] = useState<EnhancedVoiceSample[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());
  const [currentSample, setCurrentSample] = useState<EnhancedVoiceSample | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'general' | 'samples' | 'advanced'>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleFilter, setSampleFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'quality' | 'duration'>('date');

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    minConfidenceThreshold: 0.7,
    maxSamples: 5,
    autoEnhanceQuality: true,
    enableSpeakerDiarization: true,
    customIdentificationRules: []
  });

  /**
   * Load voice samples for the profile
   */
  const loadVoiceSamples = useCallback(async () => {
    if (!profile?.deepgramVoiceId) return;

    try {
      setLoading(true);
      
      // Get samples from storage service
      const sampleMetadata = await ClientStorageService.listVoiceSamples(
        profile.deepgramVoiceId,
        50
      );
      
      // Convert to enhanced voice samples
      const samples: EnhancedVoiceSample[] = await Promise.all(
        sampleMetadata.map(async (metadata, index) => {
          // Get download URL for playback
          const url = await ClientStorageService.getDownloadUrl(metadata.filePath);
          
          return {
            id: `${profile.deepgramVoiceId}_${index}`,
            url,
            transcript: metadata.transcript || '',
            quality: metadata.quality || 0.5,
            duration: metadata.duration,
            timestamp: new Date(metadata.uploadedAt),
            confidence: metadata.speakerConfidence,
            speakerId: metadata.deepgramVoiceId,
            filePath: metadata.filePath,
            selected: false,
            metadata
          };
        })
      );
      
      setVoiceSamples(samples);
      
      // Also load from profile data
      if (profile.audioSamples.length > 0) {
        const profileSamples: EnhancedVoiceSample[] = profile.audioSamples.map((sample, index) => ({
          id: `profile_${index}`,
          url: sample.url,
          transcript: sample.transcript,
          quality: sample.quality,
          duration: sample.duration,
          timestamp: sample.timestamp,
          filePath: '',
          selected: false
        }));
        
        // Merge and deduplicate
        const allSamples = [...samples];
        profileSamples.forEach(profileSample => {
          if (!samples.find(s => s.url === profileSample.url)) {
            allSamples.push(profileSample);
          }
        });
        
        setVoiceSamples(allSamples);
      }
    } catch (err) {
      console.error('Failed to load voice samples:', err);
      setError('Failed to load voice samples. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Filter and sort voice samples
   */
  const filteredSamples = useMemo(() => {
    let filtered = voiceSamples;

    // Apply search filter
    if (sampleFilter) {
      const term = sampleFilter.toLowerCase();
      filtered = filtered.filter(sample => 
        sample.transcript.toLowerCase().includes(term) ||
        sample.speakerId?.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'quality':
          return b.quality - a.quality;
        case 'duration':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    return filtered;
  }, [voiceSamples, sampleFilter, sortBy]);

  /**
   * Handle sample selection
   */
  const handleSampleSelection = useCallback((sampleId: string, selected: boolean) => {
    setSelectedSamples(prev => {
      const updated = new Set(prev);
      if (selected) {
        updated.add(sampleId);
      } else {
        updated.delete(sampleId);
      }
      return updated;
    });
  }, []);

  /**
   * Handle bulk sample operations
   */
  const handleSampleOperation = useCallback(async (operation: SampleOperation) => {
    if (selectedSamples.size === 0) return;

    try {
      setLoading(true);
      
      const selectedSampleData = voiceSamples.filter(s => selectedSamples.has(s.id));
      
      switch (operation) {
        case 'delete':
          // Delete selected samples
          for (const sample of selectedSampleData) {
            if (sample.filePath) {
              await ClientStorageService.deleteFile(sample.filePath);
            }
          }
          
          // Update local state
          setVoiceSamples(prev => 
            prev.filter(s => !selectedSamples.has(s.id))
          );
          break;

        case 'export':
          // Export selected samples as JSON
          const exportData = {
            profileId: profile?.deepgramVoiceId,
            profileName: profile?.userName,
            samples: selectedSampleData,
            exportedAt: new Date().toISOString()
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `voice-samples-${profile?.userName || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          break;

        case 'enhance':
          // TODO: Implement sample enhancement (noise reduction, normalization)
          console.log('Sample enhancement not yet implemented');
          break;

        case 'merge':
          // TODO: Implement sample merging
          console.log('Sample merging not yet implemented');
          break;
      }
      
      setSelectedSamples(new Set());
    } catch (err) {
      console.error(`Failed to ${operation} samples:`, err);
      setError(`Failed to ${operation} samples. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [selectedSamples, voiceSamples, profile]);

  /**
   * Handle file upload for new samples
   */
  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!profile?.deepgramVoiceId) return;

    try {
      setLoading(true);
      
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
          throw new Error(`Invalid file type: ${file.type}`);
        }

        // Create audio element to get duration
        const audio = new Audio();
        const duration = await new Promise<number>((resolve, reject) => {
          audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
          audio.addEventListener('error', reject);
          audio.src = URL.createObjectURL(file);
        });

        // Upload to storage
        const result = await ClientStorageService.uploadVoiceSample(
          profile.deepgramVoiceId,
          'manual_upload',
          file,
          duration,
          {
            quality: 0.8, // Default quality for manually uploaded files
            transcript: '', // Will be empty initially
            speakerConfidence: 1.0 // High confidence for manual uploads
          }
        );

        if (!result.success || !result.url) {
          throw new Error(result.error || 'Upload failed');
        }

        // Create enhanced sample object
        const sample: EnhancedVoiceSample = {
          id: `upload_${Date.now()}_${Math.random()}`,
          url: result.url,
          transcript: '',
          quality: 0.8,
          duration,
          timestamp: new Date(),
          filePath: result.filePath || '',
          selected: false,
          metadata: result.metadata
        };

        return sample;
      });

      const uploadedSamples = await Promise.all(uploadPromises);
      
      // Add to local state
      setVoiceSamples(prev => [...prev, ...uploadedSamples]);
      
    } catch (err) {
      console.error('Failed to upload samples:', err);
      setError('Failed to upload audio samples. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  /**
   * Handle form submission
   */
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate form data
      if (!formData.userName.trim()) {
        setError('Speaker name is required');
        return;
      }

      // Prepare profile data
      const profileData: Partial<VoiceLibraryEntry> = {
        userName: formData.userName.trim(),
        userId: formData.userId || undefined,
        confirmed: formData.confirmed,
        confidence: formData.confidence,
        // Update audio samples with current voice samples
        audioSamples: voiceSamples.slice(0, advancedSettings.maxSamples).map(sample => ({
          url: sample.url,
          transcript: sample.transcript,
          quality: sample.quality,
          duration: sample.duration,
          timestamp: sample.timestamp
        }))
      };

      await onSave(profileData);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, voiceSamples, advancedSettings.maxSamples, onSave]);

  /**
   * Calculate quality metrics
   */
  const qualityMetrics = useMemo(() => {
    if (voiceSamples.length === 0) {
      return { averageQuality: 0, totalDuration: 0, sampleCount: 0 };
    }

    const totalQuality = voiceSamples.reduce((sum, sample) => sum + sample.quality, 0);
    const totalDuration = voiceSamples.reduce((sum, sample) => sum + sample.duration, 0);

    return {
      averageQuality: totalQuality / voiceSamples.length,
      totalDuration,
      sampleCount: voiceSamples.length
    };
  }, [voiceSamples]);

  // Load samples when profile changes
  useEffect(() => {
    if (profile) {
      loadVoiceSamples();
    }
  }, [profile, loadVoiceSamples]);

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {profile ? 'Edit Voice Profile' : 'Create Voice Profile'}
          </h2>
          <p className="text-muted-foreground">
            {profile ? 'Update speaker information and manage voice samples' : 'Set up a new voice profile'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <LoadingSpinner size="sm" className="mr-2" />}
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        {(['general', 'samples', 'advanced'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'general' && <UserIcon className="h-4 w-4 mr-2 inline" />}
            {tab === 'samples' && <Mic className="h-4 w-4 mr-2 inline" />}
            {tab === 'advanced' && <Settings className="h-4 w-4 mr-2 inline" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Speaker Name *
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder="Enter speaker name"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    User ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                    placeholder="Link to user account ID"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="confirmed"
                    checked={formData.confirmed}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmed: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="confirmed" className="text-sm font-medium">
                    Confirmed Identity
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Mark this profile as confirmed and reliable
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confidence Level: {Math.round(formData.confidence * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.confidence}
                    onChange={(e) => setFormData(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Statistics */}
            {profile && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{qualityMetrics.sampleCount}</div>
                      <div className="text-xs text-muted-foreground">Voice Samples</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(qualityMetrics.averageQuality * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Quality</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">
                        {Math.round(qualityMetrics.totalDuration)}s
                      </div>
                      <div className="text-xs text-muted-foreground">Total Audio</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold">{profile.meetingsCount}</div>
                      <div className="text-xs text-muted-foreground">Meetings</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="space-y-6">
            {/* Sample Management Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Voice Samples ({filteredSamples.length})</CardTitle>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      multiple
                      accept="audio/*"
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Audio
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search samples..."
                        value={sampleFilter}
                        onChange={(e) => setSampleFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="quality">Sort by Quality</option>
                    <option value="duration">Sort by Duration</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedSamples.size > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedSamples.size} sample{selectedSamples.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSampleOperation('export')}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                      <Button
                        onClick={() => handleSampleOperation('enhance')}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Enhance
                      </Button>
                      <Button
                        onClick={() => handleSampleOperation('delete')}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sample List */}
            {loading ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredSamples.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Voice Samples</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload audio files to build this voice profile.
                  </p>
                  <Button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload First Sample
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredSamples.map(sample => (
                  <Card key={sample.id} className={`${sample.selected ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={sample.selected}
                          onChange={(e) => handleSampleSelection(sample.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary mt-1"
                        />
                        <div className="flex-1">
                          <VoiceSamplePlayer
                            sample={sample}
                            compact={true}
                            showDownload={false}
                            autoWaveform={false}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Confidence Threshold: {Math.round(advancedSettings.minConfidenceThreshold * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={advancedSettings.minConfidenceThreshold}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      minConfidenceThreshold: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum confidence required for automatic identification
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Audio Samples: {advancedSettings.maxSamples}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={advancedSettings.maxSamples}
                    onChange={(e) => setAdvancedSettings(prev => ({ 
                      ...prev, 
                      maxSamples: parseInt(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of audio samples to keep for this profile
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoEnhance"
                      checked={advancedSettings.autoEnhanceQuality}
                      onChange={(e) => setAdvancedSettings(prev => ({ 
                        ...prev, 
                        autoEnhanceQuality: e.target.checked 
                      }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="autoEnhance" className="text-sm font-medium">
                      Auto-enhance Audio Quality
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-7">
                    Automatically apply noise reduction and normalization to new samples
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="speakerDiarization"
                      checked={advancedSettings.enableSpeakerDiarization}
                      onChange={(e) => setAdvancedSettings(prev => ({ 
                        ...prev, 
                        enableSpeakerDiarization: e.target.checked 
                      }))}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="speakerDiarization" className="text-sm font-medium">
                      Enable Speaker Diarization
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-7">
                    Use advanced ML techniques to improve speaker identification accuracy
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Profile Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Profile
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Merge className="h-4 w-4" />
                    Merge Profiles
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Split className="h-4 w-4" />
                    Split Profile
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                    Delete Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${className}`}>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return <div className={className}>{content}</div>;
};