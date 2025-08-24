/**
 * Speaker Profile Card Component
 * 
 * Individual speaker information display card with voice sample playback controls,
 * quality indicators, confidence scores, and manual identification options.
 * Provides a comprehensive view of a single voice profile with interactive controls.
 * 
 * Features:
 * - Voice profile information display
 * - Audio sample playback controls
 * - Quality indicators and confidence scores
 * - Manual speaker identification and editing
 * - Profile selection for bulk operations
 * - Contextual actions menu
 * 
 * @component
 * @example
 * ```tsx
 * <SpeakerProfileCard 
 *   profile={voiceProfile}
 *   onUpdate={(updates) => handleUpdate(updates)}
 *   onSelect={(selected) => handleSelection(selected)}
 * />
 * ```
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { 
  User as UserIcon, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Mic,
  Volume2,
  Edit3,
  Trash2,
  MoreHorizontal,
  Play,
  Pause,
  Calendar,
  TrendingUp,
  Badge,
  Settings
} from 'lucide-react';
import { VoiceSamplePlayer } from './VoiceSamplePlayer';
import type { VoiceLibraryEntry } from '@/types/database';

/**
 * Props for the Speaker Profile Card component
 */
interface SpeakerProfileCardProps {
  /** Voice profile data to display */
  profile: VoiceLibraryEntry;
  /** Whether this profile is currently selected for bulk operations */
  selected?: boolean;
  /** Callback fired when profile selection changes */
  onSelect?: (selected: boolean) => void;
  /** Callback fired when profile is updated */
  onUpdate?: (updates: Partial<VoiceLibraryEntry>) => void;
  /** Callback fired when profile should be deleted */
  onDelete?: () => void;
  /** Callback fired when edit mode should be activated */
  onEdit?: () => void;
  /** Whether to show admin-level controls */
  isAdmin?: boolean;
  /** Whether to show the audio player */
  showAudioPlayer?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Quality level indicators for voice samples
 */
const QUALITY_LEVELS = {
  excellent: { threshold: 0.9, color: 'text-green-600', bg: 'bg-green-100', label: 'Excellent' },
  good: { threshold: 0.7, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Good' },
  fair: { threshold: 0.5, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Fair' },
  poor: { threshold: 0, color: 'text-red-600', bg: 'bg-red-100', label: 'Poor' }
} as const;

export const SpeakerProfileCard: React.FC<SpeakerProfileCardProps> = ({
  profile,
  selected = false,
  onSelect,
  onUpdate,
  onDelete,
  onEdit,
  isAdmin = false,
  showAudioPlayer = true,
  className = ''
}) => {
  const [showFullTranscripts, setShowFullTranscripts] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile.userName || '');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  /**
   * Get quality level for the profile based on confidence and audio samples
   */
  const qualityLevel = useMemo(() => {
    const avgQuality = profile.audioSamples.length > 0
      ? profile.audioSamples.reduce((sum, sample) => sum + sample.quality, 0) / profile.audioSamples.length
      : 0;
    
    const combinedScore = (profile.confidence + avgQuality) / 2;
    
    if (combinedScore >= QUALITY_LEVELS.excellent.threshold) return QUALITY_LEVELS.excellent;
    if (combinedScore >= QUALITY_LEVELS.good.threshold) return QUALITY_LEVELS.good;
    if (combinedScore >= QUALITY_LEVELS.fair.threshold) return QUALITY_LEVELS.fair;
    return QUALITY_LEVELS.poor;
  }, [profile.confidence, profile.audioSamples]);

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

  /**
   * Format date for display
   */
  const formatDate = useCallback((date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  }, []);

  /**
   * Handle profile name update
   */
  const handleNameUpdate = useCallback(async () => {
    if (newName.trim() && newName !== profile.userName) {
      onUpdate?.({
        userName: newName.trim(),
        confirmed: true,
        confidence: 1.0
      });
    }
    setEditingName(false);
  }, [newName, profile.userName, onUpdate]);

  /**
   * Handle profile confirmation
   */
  const handleConfirmProfile = useCallback(() => {
    onUpdate?.({
      confirmed: true,
      confidence: Math.max(profile.confidence, 0.9)
    });
  }, [profile.confidence, onUpdate]);

  /**
   * Get the best audio sample for playback
   */
  const bestAudioSample = useMemo(() => {
    if (profile.audioSamples.length === 0) return null;
    
    return profile.audioSamples.reduce((best, sample) => 
      sample.quality > best.quality ? sample : best
    );
  }, [profile.audioSamples]);

  /**
   * Get recent transcript samples for display
   */
  const recentTranscripts = useMemo(() => {
    const transcripts = profile.audioSamples
      .filter(sample => sample.transcript && sample.transcript.trim().length > 0)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
    
    return transcripts;
  }, [profile.audioSamples]);

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-lg ${selected ? 'ring-2 ring-primary' : ''} ${className}`}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            aria-label={`Select ${profile.userName || 'Unknown Speaker'}`}
          />
        </div>
      )}

      {/* Actions Menu */}
      <div className="absolute top-3 right-3 z-10">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="h-8 w-8 p-0"
            aria-label="Profile actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          
          {showActionsMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[140px] z-20">
              <button
                onClick={() => {
                  onEdit?.();
                  setShowActionsMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </button>
              {!profile.confirmed && (
                <button
                  onClick={() => {
                    handleConfirmProfile();
                    setShowActionsMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    onDelete?.();
                    setShowActionsMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3 pt-2">
          {/* Profile Avatar */}
          <div className={`p-3 rounded-full ${qualityLevel.bg}`}>
            {profile.confirmed ? (
              <CheckCircle className={`h-6 w-6 ${qualityLevel.color}`} />
            ) : (
              <UserIcon className={`h-6 w-6 ${qualityLevel.color}`} />
            )}
          </div>
          
          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleNameUpdate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameUpdate();
                    if (e.key === 'Escape') {
                      setNewName(profile.userName || '');
                      setEditingName(false);
                    }
                  }}
                  className="flex-1 text-lg font-semibold bg-transparent border-b border-primary focus:outline-none"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleNameUpdate}
                  className="h-6 w-6 p-0"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {profile.userName || 'Unknown Speaker'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingName(true)}
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-1">
              {/* Status Badge */}
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${qualityLevel.bg} ${qualityLevel.color}`}>
                <Badge className="h-3 w-3 mr-1" />
                {profile.confirmed ? qualityLevel.label : 'Unconfirmed'}
              </div>
              
              {/* Voice ID */}
              <span className="text-xs text-muted-foreground font-mono truncate">
                ID: {profile.deepgramVoiceId.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <Clock className="h-4 w-4 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">{formatDuration(profile.totalSpeakingTime)}</div>
            <div className="text-xs text-muted-foreground">Speaking Time</div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">{profile.meetingsCount}</div>
            <div className="text-xs text-muted-foreground">Meetings</div>
          </div>
          
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-gray-600" />
            <div className="text-sm font-medium">{formatConfidence(profile.confidence)}</div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
        </div>

        {/* Audio Samples */}
        {showAudioPlayer && profile.audioSamples.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Audio Samples ({profile.audioSamples.length})
              </h4>
              <span className="text-xs text-muted-foreground">
                Best quality: {Math.round((bestAudioSample?.quality || 0) * 100)}%
              </span>
            </div>
            
            {bestAudioSample && (
              <VoiceSamplePlayer
                sample={{
                  id: `sample_${profile.deepgramVoiceId}_best`,
                  url: bestAudioSample.url,
                  transcript: bestAudioSample.transcript,
                  quality: bestAudioSample.quality,
                  duration: bestAudioSample.duration,
                  timestamp: bestAudioSample.timestamp
                }}
                compact={true}
                autoWaveform={false}
              />
            )}
          </div>
        )}

        {/* Recent Transcripts */}
        {recentTranscripts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Recent Quotes
            </h4>
            <div className="space-y-2">
              {recentTranscripts.slice(0, showFullTranscripts ? recentTranscripts.length : 2).map((sample, index) => (
                <div
                  key={index}
                  className="p-2 bg-gray-50 rounded-lg text-sm"
                >
                  <p className="text-gray-800 mb-1">
                    "{sample.transcript.length > 100 && !showFullTranscripts 
                      ? `${sample.transcript.slice(0, 100)}...` 
                      : sample.transcript}"
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(sample.timestamp)} • {formatDuration(sample.duration)}
                  </div>
                </div>
              ))}
              
              {recentTranscripts.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullTranscripts(!showFullTranscripts)}
                  className="w-full text-xs"
                >
                  {showFullTranscripts ? 'Show Less' : `Show ${recentTranscripts.length - 2} More`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Identification History */}
        {profile.identificationHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Last Identified</h4>
            <div className="text-xs text-muted-foreground">
              {formatDate(profile.identificationHistory[profile.identificationHistory.length - 1].timestamp)} via{' '}
              {profile.identificationHistory[profile.identificationHistory.length - 1].method}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {!profile.confirmed && (
            <Button
              size="sm"
              onClick={handleConfirmProfile}
              className="flex-1 flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Confirm
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingName(true)}
            className="flex-1 flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {profile.userName ? 'Rename' : 'Identify'}
          </Button>
        </div>
      </CardContent>

      {/* Click outside to close actions menu */}
      {showActionsMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowActionsMenu(false)}
        />
      )}
    </Card>
  );
};