/**
 * Voice Library Dashboard Component
 * 
 * Comprehensive dashboard for managing voice profiles and speaker identification.
 * Provides overview of all known speakers with voice profiles, sample management,
 * and bulk operations for efficient voice library management.
 * 
 * Features:
 * - Real-time display of all voice profiles with statistics
 * - Search and filtering capabilities
 * - Manual speaker name assignment and management
 * - Voice sample quality metrics and confidence scores
 * - Import/export functionality for voice profiles
 * - Bulk operations for managing multiple profiles
 * 
 * @component
 * @example
 * ```tsx
 * <VoiceLibraryDashboard 
 *   userId="user123"
 *   onProfileUpdate={(profileId, updates) => console.log('Profile updated')}
 * />
 * ```
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Users, 
  Mic,
  Clock,
  Volume2,
  CheckCircle,
  AlertCircle,
  Plus,
  Settings,
  Trash2,
  Edit3,
  MoreHorizontal,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { ClientStorageService } from '@/services/firebase/ClientStorageService';
import { SpeakerProfileCard } from './SpeakerProfileCard';
import { VoiceProfileManager } from './VoiceProfileManager';
import type { VoiceLibraryEntry } from '@/types/database';

/**
 * Props for the Voice Library Dashboard component
 */
interface VoiceLibraryDashboardProps {
  /** Current user ID for access control */
  userId: string;
  /** Callback fired when a voice profile is updated */
  onProfileUpdate?: (profileId: string, updates: Partial<VoiceLibraryEntry>) => void;
  /** Callback fired when a profile is deleted */
  onProfileDelete?: (profileId: string) => void;
  /** Whether to show admin features */
  isAdmin?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Filter and sort options for voice profiles
 */
interface FilterOptions {
  searchTerm: string;
  confirmationStatus: 'all' | 'confirmed' | 'unconfirmed';
  sortBy: 'name' | 'lastHeard' | 'meetingsCount' | 'confidence';
  sortOrder: 'asc' | 'desc';
  minConfidence: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Statistics for voice library overview
 */
interface VoiceLibraryStats {
  totalVoices: number;
  confirmedVoices: number;
  unconfirmedVoices: number;
  totalSamples: number;
  averageConfidence: number;
  recentActivity: number;
}

export const VoiceLibraryDashboard: React.FC<VoiceLibraryDashboardProps> = ({
  userId,
  onProfileUpdate,
  onProfileDelete,
  isAdmin = false,
  className = ''
}) => {
  // State management
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<VoiceLibraryEntry | null>(null);
  
  // Filter and search state
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    confirmationStatus: 'all',
    sortBy: 'lastHeard',
    sortOrder: 'desc',
    minConfidence: 0
  });
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  /**
   * Load all voice profiles from the database
   */
  const loadVoiceProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get both confirmed and unconfirmed voices
      const [confirmed, unconfirmed] = await Promise.all([
        VoiceLibraryService.getUserVoiceProfiles(userId),
        VoiceLibraryService.getUnconfirmedVoices(50)
      ]);
      
      // Combine and deduplicate
      const allProfiles = [...confirmed];
      unconfirmed.forEach(profile => {
        if (!allProfiles.find(p => p.deepgramVoiceId === profile.deepgramVoiceId)) {
          allProfiles.push(profile);
        }
      });
      
      setVoiceProfiles(allProfiles);
    } catch (err) {
      console.error('Failed to load voice profiles:', err);
      setError('Failed to load voice profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Calculate library statistics
   */
  const libraryStats = useMemo<VoiceLibraryStats>(() => {
    const confirmed = voiceProfiles.filter(p => p.confirmed);
    const unconfirmed = voiceProfiles.filter(p => !p.confirmed);
    const totalSamples = voiceProfiles.reduce((sum, p) => sum + p.audioSamples.length, 0);
    const avgConfidence = voiceProfiles.length > 0 
      ? voiceProfiles.reduce((sum, p) => sum + p.confidence, 0) / voiceProfiles.length 
      : 0;
    const recent = voiceProfiles.filter(p => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return p.lastHeard > dayAgo;
    }).length;

    return {
      totalVoices: voiceProfiles.length,
      confirmedVoices: confirmed.length,
      unconfirmedVoices: unconfirmed.length,
      totalSamples,
      averageConfidence: avgConfidence,
      recentActivity: recent
    };
  }, [voiceProfiles]);

  /**
   * Filter and sort voice profiles based on current filters
   */
  const filteredProfiles = useMemo(() => {
    let filtered = [...voiceProfiles];

    // Apply search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(profile => 
        profile.userName?.toLowerCase().includes(term) ||
        profile.deepgramVoiceId.toLowerCase().includes(term) ||
        profile.audioSamples.some(sample => 
          sample.transcript.toLowerCase().includes(term)
        )
      );
    }

    // Apply confirmation status filter
    if (filters.confirmationStatus !== 'all') {
      filtered = filtered.filter(profile => 
        filters.confirmationStatus === 'confirmed' ? profile.confirmed : !profile.confirmed
      );
    }

    // Apply confidence filter
    filtered = filtered.filter(profile => profile.confidence >= filters.minConfidence);

    // Apply date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(profile => 
        profile.lastHeard >= filters.dateRange!.start && 
        profile.lastHeard <= filters.dateRange!.end
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = (a.userName || 'Unknown').localeCompare(b.userName || 'Unknown');
          break;
        case 'lastHeard':
          comparison = a.lastHeard.getTime() - b.lastHeard.getTime();
          break;
        case 'meetingsCount':
          comparison = a.meetingsCount - b.meetingsCount;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [voiceProfiles, filters]);

  /**
   * Handle profile selection for bulk operations
   */
  const handleProfileSelection = useCallback((profileId: string, selected: boolean) => {
    setSelectedProfiles(prev => {
      const updated = new Set(prev);
      if (selected) {
        updated.add(profileId);
      } else {
        updated.delete(profileId);
      }
      return updated;
    });
  }, []);

  /**
   * Handle profile updates from child components
   */
  const handleProfileUpdate = useCallback(async (
    profileId: string, 
    updates: Partial<VoiceLibraryEntry>
  ) => {
    try {
      // Update in database if needed
      if (updates.userName || updates.userId) {
        await VoiceLibraryService.identifyVoice(
          profileId,
          updates.userId || '',
          updates.userName || '',
          'manual',
          '', // No specific meeting ID for manual updates
          updates.confidence || 1.0
        );
      }

      // Update local state
      setVoiceProfiles(prev => 
        prev.map(profile => 
          profile.deepgramVoiceId === profileId 
            ? { ...profile, ...updates }
            : profile
        )
      );

      // Call external callback
      onProfileUpdate?.(profileId, updates);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
    }
  }, [onProfileUpdate]);

  /**
   * Handle profile deletion
   */
  const handleProfileDelete = useCallback(async (profileId: string) => {
    try {
      // TODO: Add delete method to VoiceLibraryService
      // For now, just remove from local state
      setVoiceProfiles(prev => 
        prev.filter(profile => profile.deepgramVoiceId !== profileId)
      );
      
      onProfileDelete?.(profileId);
    } catch (err) {
      console.error('Failed to delete profile:', err);
      setError('Failed to delete profile. Please try again.');
    }
  }, [onProfileDelete]);

  /**
   * Handle bulk operations
   */
  const handleBulkOperation = useCallback(async (operation: 'delete' | 'confirm' | 'export') => {
    if (selectedProfiles.size === 0) return;

    try {
      switch (operation) {
        case 'delete':
          for (const profileId of selectedProfiles) {
            await handleProfileDelete(profileId);
          }
          break;
        case 'confirm':
          // Bulk confirm selected profiles
          for (const profileId of selectedProfiles) {
            await handleProfileUpdate(profileId, { confirmed: true, confidence: 1.0 });
          }
          break;
        case 'export':
          // Export selected profiles as JSON
          const selectedData = voiceProfiles.filter(p => 
            selectedProfiles.has(p.deepgramVoiceId)
          );
          const blob = new Blob([JSON.stringify(selectedData, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `voice-profiles-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          break;
      }
      
      setSelectedProfiles(new Set());
    } catch (err) {
      console.error(`Failed to perform bulk ${operation}:`, err);
      setError(`Failed to perform bulk ${operation}. Please try again.`);
    }
  }, [selectedProfiles, voiceProfiles, handleProfileDelete, handleProfileUpdate]);

  /**
   * Format time duration for display
   */
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${Math.round(remainingSeconds)}s`;
  }, []);

  /**
   * Format confidence score as percentage
   */
  const formatConfidence = useCallback((confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadVoiceProfiles();
  }, [loadVoiceProfiles]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Voice Library</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadVoiceProfiles} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Voice Library Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and identify speakers across your meetings
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowProfileManager(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Profile
              </Button>
              <Button
                onClick={loadVoiceProfiles}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{libraryStats.totalVoices}</div>
            <div className="text-xs text-muted-foreground">Total Voices</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{libraryStats.confirmedVoices}</div>
            <div className="text-xs text-muted-foreground">Confirmed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{libraryStats.unconfirmedVoices}</div>
            <div className="text-xs text-muted-foreground">Unconfirmed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Mic className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{libraryStats.totalSamples}</div>
            <div className="text-xs text-muted-foreground">Audio Samples</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Volume2 className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
            <div className="text-2xl font-bold">{formatConfidence(libraryStats.averageConfidence)}</div>
            <div className="text-xs text-muted-foreground">Avg Confidence</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-teal-500" />
            <div className="text-2xl font-bold">{libraryStats.recentActivity}</div>
            <div className="text-xs text-muted-foreground">Active Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, voice ID, or transcript..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Filter Controls */}
            <div className="flex gap-2">
              <select
                value={filters.confirmationStatus}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  confirmationStatus: e.target.value as FilterOptions['confirmationStatus']
                }))}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Speakers</option>
                <option value="confirmed">Confirmed Only</option>
                <option value="unconfirmed">Unconfirmed Only</option>
              </select>
              
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [FilterOptions['sortBy'], FilterOptions['sortOrder']];
                  setFilters(prev => ({ ...prev, sortBy, sortOrder }));
                }}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="lastHeard-desc">Recently Active</option>
                <option value="lastHeard-asc">Least Recent</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="confidence-desc">Highest Confidence</option>
                <option value="confidence-asc">Lowest Confidence</option>
                <option value="meetingsCount-desc">Most Meetings</option>
                <option value="meetingsCount-asc">Fewest Meetings</option>
              </select>
              
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum Confidence: {formatConfidence(filters.minConfidence)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={filters.minConfidence}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minConfidence: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedProfiles.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedProfiles.size} profile{selectedProfiles.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkOperation('confirm')}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm All
                </Button>
                <Button
                  onClick={() => handleBulkOperation('export')}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  onClick={() => handleBulkOperation('delete')}
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

      {/* Voice Profiles Grid */}
      {filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Voice Profiles Found</h3>
            <p className="text-muted-foreground mb-4">
              {voiceProfiles.length === 0
                ? "Start by having some meetings to build your voice library."
                : "Try adjusting your search or filter criteria."}
            </p>
            {voiceProfiles.length === 0 && (
              <Button
                onClick={() => setShowProfileManager(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Profile
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map(profile => (
            <SpeakerProfileCard
              key={profile.deepgramVoiceId}
              profile={profile}
              selected={selectedProfiles.has(profile.deepgramVoiceId)}
              onSelect={(selected) => 
                handleProfileSelection(profile.deepgramVoiceId, selected)
              }
              onUpdate={(updates) => 
                handleProfileUpdate(profile.deepgramVoiceId, updates)
              }
              onDelete={() => 
                handleProfileDelete(profile.deepgramVoiceId)
              }
              onEdit={() => {
                setCurrentProfile(profile);
                setShowProfileManager(true);
              }}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Voice Profile Manager Modal */}
      {showProfileManager && (
        <VoiceProfileManager
          profile={currentProfile}
          onSave={async (profileData) => {
            if (currentProfile) {
              await handleProfileUpdate(currentProfile.deepgramVoiceId, profileData);
            }
            setShowProfileManager(false);
            setCurrentProfile(null);
          }}
          onCancel={() => {
            setShowProfileManager(false);
            setCurrentProfile(null);
          }}
        />
      )}
    </div>
  );
};