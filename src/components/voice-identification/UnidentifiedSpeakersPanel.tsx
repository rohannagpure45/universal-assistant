/**
 * Unidentified Speakers Panel
 * 
 * Displays all unidentified speakers from recent meetings with voice sample
 * playback, quality indicators, and quick identification actions. Supports
 * speaker clustering suggestions and bulk operations.
 * 
 * Features:
 * - Voice sample playback with quality indicators
 * - Speaker clustering and similarity suggestions
 * - Quick identification actions
 * - Confidence scores and quality ratings
 * - Batch operations for multiple speakers
 * - Advanced filtering and sorting
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Play,
  Pause,
  Volume2,
  VolumeX,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  Filter,
  SortAsc,
  SortDesc,
  Download,
  Trash2,
  Link,
  Star
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { VoiceSamplePlayer } from './VoiceSamplePlayer';
import { NeedsIdentificationService } from '../../services/firebase/NeedsIdentificationService';
import { ClientStorageService } from '../../services/firebase/ClientStorageService';
import { VoiceLibraryService } from '../../services/firebase/VoiceLibraryService';
import type { NeedsIdentification } from '../../types/database';
import type { EnhancedVoiceSample, VoiceMatchSuggestion } from '../../types/voice-identification';

interface UnidentifiedSpeakersPanelProps {
  /** List of identification requests to display */
  identificationRequests?: NeedsIdentification[];
  /** Whether to show clustering suggestions */
  showClustering?: boolean;
  /** Whether to enable bulk operations */
  enableBulkOperations?: boolean;
  /** Callback when speaker is identified */
  onSpeakerIdentified?: (requestId: string, userId: string, userName: string) => void;
  /** Callback when speakers are selected for workflow */
  onStartWorkflow?: (requestIds: string[]) => void;
  /** Custom CSS classes */
  className?: string;
}

interface EnhancedIdentificationRequest extends NeedsIdentification {
  /** Voice samples with metadata */
  voiceSamples: EnhancedVoiceSample[];
  /** Quality assessment */
  qualityScore: number;
  /** Clustering suggestions */
  clusteringSuggestions: VoiceMatchSuggestion[];
  /** Priority level */
  priority: 'high' | 'medium' | 'low';
  /** Selected state for bulk operations */
  selected: boolean;
  /** Loading state */
  loading: boolean;
}

type SortField = 'quality' | 'date' | 'duration' | 'priority' | 'meeting';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'high' | 'medium' | 'low';

/**
 * Unidentified Speakers Panel Component
 */
export const UnidentifiedSpeakersPanel: React.FC<UnidentifiedSpeakersPanelProps> = ({
  identificationRequests = [],
  showClustering = true,
  enableBulkOperations = true,
  onSpeakerIdentified,
  onStartWorkflow,
  className = ''
}) => {
  // State management
  const [enhancedRequests, setEnhancedRequests] = useState<EnhancedIdentificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  
  // Refs
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  /**
   * Calculate quality score based on various factors
   */
  const calculateQualityScore = useCallback((request: NeedsIdentification): number => {
    let score = 0.5; // Base score
    
    // Audio URL availability
    if (request.audioUrl) score += 0.2;
    
    // Sample transcript quality
    const avgTranscriptLength = request.sampleTranscripts.reduce(
      (sum, t) => sum + t.text.length, 0
    ) / Math.max(request.sampleTranscripts.length, 1);
    
    if (avgTranscriptLength > 50) score += 0.2;
    if (avgTranscriptLength > 100) score += 0.1;
    
    // Number of sample transcripts
    if (request.sampleTranscripts.length > 2) score += 0.1;
    if (request.sampleTranscripts.length > 4) score += 0.1;
    
    // Suggested matches availability
    if (request.suggestedMatches && request.suggestedMatches.length > 0) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }, []);

  /**
   * Determine priority based on quality, age, and context
   */
  const calculatePriority = useCallback((request: NeedsIdentification, quality: number): 'high' | 'medium' | 'low' => {
    const hoursOld = (Date.now() - request.createdAt.getTime()) / (1000 * 60 * 60);
    const hasSuggestions = request.suggestedMatches && request.suggestedMatches.length > 0;
    
    // High priority: Good quality + suggestions OR very old
    if ((quality > 0.7 && hasSuggestions) || hoursOld > 48) {
      return 'high';
    }
    
    // Medium priority: Decent quality OR has suggestions OR moderately old
    if (quality > 0.5 || hasSuggestions || hoursOld > 24) {
      return 'medium';
    }
    
    return 'low';
  }, []);

  /**
   * Load voice samples for a request
   */
  const loadVoiceSamples = useCallback(async (request: NeedsIdentification): Promise<EnhancedVoiceSample[]> => {
    try {
      const samples = await ClientStorageService.listVoiceSamples(request.deepgramVoiceId, 5);
      
      return samples.map(sample => ({
        id: `${sample.deepgramVoiceId}_${sample.uploadedAt}`,
        url: '', // Would need to get download URL
        transcript: sample.transcript || '',
        quality: sample.quality || 0.5,
        duration: sample.duration,
        timestamp: new Date(sample.uploadedAt),
        filePath: sample.filePath,
        selected: false,
        confidence: sample.speakerConfidence,
        speakerId: sample.deepgramVoiceId,
        meetingId: sample.meetingId
      }));
    } catch (error) {
      console.warn('Failed to load voice samples:', error);
      return [];
    }
  }, []);

  /**
   * Get clustering suggestions for similar voices
   */
  const getClusteringSuggestions = useCallback(async (request: NeedsIdentification): Promise<VoiceMatchSuggestion[]> => {
    if (!showClustering) return [];
    
    try {
      const matches = await VoiceLibraryService.findPotentialMatches(request.deepgramVoiceId, 0.6);
      
      return matches.map(match => ({
        userId: match.voiceId,
        userName: match.userName || 'Unknown User',
        confidence: match.confidence,
        reason: 'Voice pattern similarity',
        evidence: [
          {
            type: 'acoustic_similarity' as const,
            strength: match.confidence,
            description: `Voice characteristics match with ${Math.round(match.confidence * 100)}% confidence`
          }
        ]
      }));
    } catch (error) {
      console.warn('Failed to get clustering suggestions:', error);
      return [];
    }
  }, [showClustering]);

  /**
   * Enhance identification requests with additional data
   */
  const enhanceRequests = useCallback(async (requests: NeedsIdentification[]) => {
    setLoading(true);
    try {
      const enhanced: EnhancedIdentificationRequest[] = await Promise.all(
        requests.map(async (request) => {
          const qualityScore = calculateQualityScore(request);
          const priority = calculatePriority(request, qualityScore);
          
          // Load additional data
          const [voiceSamples, clusteringSuggestions] = await Promise.all([
            loadVoiceSamples(request),
            getClusteringSuggestions(request)
          ]);

          return {
            ...request,
            voiceSamples,
            qualityScore,
            clusteringSuggestions,
            priority,
            selected: false,
            loading: false
          };
        })
      );

      setEnhancedRequests(enhanced);
    } catch (err) {
      console.error('Failed to enhance requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load speaker data');
    } finally {
      setLoading(false);
    }
  }, [calculateQualityScore, calculatePriority, loadVoiceSamples, getClusteringSuggestions]);

  /**
   * Sort and filter requests
   */
  const processedRequests = enhancedRequests
    .filter(request => {
      if (filterStatus === 'all') return true;
      return request.priority === filterStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'quality':
          aValue = a.qualityScore;
          bValue = b.qualityScore;
          break;
        case 'date':
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
        case 'duration':
          aValue = a.voiceSamples.reduce((sum, s) => sum + s.duration, 0);
          bValue = b.voiceSamples.reduce((sum, s) => sum + s.duration, 0);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'meeting':
          aValue = a.meetingTitle;
          bValue = b.meetingTitle;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  /**
   * Handle audio playback
   */
  const handleAudioPlay = useCallback(async (requestId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (playingAudio) {
      const currentAudio = audioRefs.current.get(playingAudio);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    if (playingAudio === requestId) {
      setPlayingAudio(null);
      return;
    }

    try {
      let audio = audioRefs.current.get(requestId);
      if (!audio) {
        audio = new Audio(audioUrl);
        audioRefs.current.set(requestId, audio);
        
        audio.addEventListener('ended', () => {
          setPlayingAudio(null);
        });
        
        audio.addEventListener('error', () => {
          setError('Failed to play audio sample');
          setPlayingAudio(null);
        });
      }

      await audio.play();
      setPlayingAudio(requestId);
    } catch (err) {
      console.error('Audio playback error:', err);
      setError('Failed to play audio sample');
    }
  }, [playingAudio]);

  /**
   * Handle speaker identification
   */
  const handleIdentification = useCallback(async (
    request: EnhancedIdentificationRequest,
    userId: string,
    userName: string
  ) => {
    try {
      // Update local state
      setEnhancedRequests(prev =>
        prev.map(req =>
          req.id === request.id
            ? { ...req, loading: true }
            : req
        )
      );

      // Resolve the identification request
      await NeedsIdentificationService.resolveRequest(
        request.id!,
        'identified',
        userId,
        userName
      );

      // Notify parent component
      if (onSpeakerIdentified) {
        onSpeakerIdentified(request.id!, userId, userName);
      }

      // Remove from local state
      setEnhancedRequests(prev =>
        prev.filter(req => req.id !== request.id)
      );
    } catch (err) {
      console.error('Failed to identify speaker:', err);
      setError(err instanceof Error ? err.message : 'Failed to identify speaker');
      
      // Reset loading state
      setEnhancedRequests(prev =>
        prev.map(req =>
          req.id === request.id
            ? { ...req, loading: false }
            : req
        )
      );
    }
  }, [onSpeakerIdentified]);

  /**
   * Handle bulk selection
   */
  const handleBulkSelection = useCallback((requestIds: string[], selected: boolean) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      requestIds.forEach(id => {
        if (selected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  }, []);

  /**
   * Handle workflow start
   */
  const handleStartWorkflow = useCallback(() => {
    const selectedIds = Array.from(selectedRequests);
    if (onStartWorkflow && selectedIds.length > 0) {
      onStartWorkflow(selectedIds);
    }
  }, [selectedRequests, onStartWorkflow]);

  /**
   * Get quality badge styles
   */
  const getQualityBadgeStyles = (quality: number) => {
    if (quality >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (quality >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  /**
   * Get priority badge styles
   */
  const getPriorityBadgeStyles = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  // Initialize enhanced requests when props change
  useEffect(() => {
    if (identificationRequests.length > 0) {
      enhanceRequests(identificationRequests);
    } else {
      setEnhancedRequests([]);
      setLoading(false);
    }
  }, [identificationRequests, enhanceRequests]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('error', () => {});
      });
      audioRefs.current.clear();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Unidentified Speakers ({processedRequests.length})
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Review and identify unknown speakers from recent meetings
          </p>
        </div>

        {enableBulkOperations && selectedRequests.size > 0 && (
          <Button
            onClick={handleStartWorkflow}
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Process Selected ({selectedRequests.size})</span>
          </Button>
        )}
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="priority">Priority</option>
              <option value="quality">Quality</option>
              <option value="date">Date</option>
              <option value="duration">Duration</option>
              <option value="meeting">Meeting</option>
            </select>
          </div>
        </div>

        {enableBulkOperations && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allIds = processedRequests.map(r => r.id!);
                const allSelected = allIds.every(id => selectedRequests.has(id));
                handleBulkSelection(allIds, !allSelected);
              }}
            >
              {processedRequests.every(r => selectedRequests.has(r.id!)) ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Speakers List */}
      <div className="space-y-4">
        {processedRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Unidentified Speakers
            </h3>
            <p className="text-gray-600">
              All speakers from recent meetings have been identified.
            </p>
          </Card>
        ) : (
          processedRequests.map((request) => {
            const isSelected = selectedRequests.has(request.id!);
            const isExpanded = expandedRequests.has(request.id!);
            
            return (
              <Card 
                key={request.id}
                className={`p-6 transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    {enableBulkOperations && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleBulkSelection([request.id!], e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.speakerLabel}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeStyles(request.priority)}`}>
                          {request.priority}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getQualityBadgeStyles(request.qualityScore)}`}>
                          {Math.round(request.qualityScore * 100)}% quality
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span>Meeting: {request.meetingTitle}</span>
                        <span>•</span>
                        <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                        {request.voiceSamples.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{request.voiceSamples.length} samples</span>
                          </>
                        )}
                      </div>
                      
                      {/* Sample Transcripts Preview */}
                      <div className="space-y-2 mb-4">
                        {request.sampleTranscripts.slice(0, isExpanded ? undefined : 2).map((sample, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-700 italic">
                              "{sample.text}"
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {sample.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                        
                        {request.sampleTranscripts.length > 2 && !isExpanded && (
                          <button
                            onClick={() => setExpandedRequests(prev => new Set(prev).add(request.id!))}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Show {request.sampleTranscripts.length - 2} more samples...
                          </button>
                        )}
                      </div>
                      
                      {/* Clustering Suggestions */}
                      {request.clusteringSuggestions.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Suggested Matches:</p>
                          <div className="space-y-2">
                            {request.clusteringSuggestions.slice(0, 3).map((suggestion, index) => (
                              <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{suggestion.userName}</p>
                                  <p className="text-xs text-gray-600">{suggestion.reason}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-blue-600 font-medium">
                                    {Math.round(suggestion.confidence * 100)}% match
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleIdentification(request, suggestion.userId, suggestion.userName)}
                                    disabled={request.loading}
                                  >
                                    {request.loading ? <LoadingSpinner size="sm" /> : 'Accept'}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Audio Playback */}
                    {request.audioUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAudioPlay(request.id!, request.audioUrl)}
                        className="flex items-center space-x-2"
                      >
                        {playingAudio === request.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span>Play Sample</span>
                      </Button>
                    )}
                    
                    {/* Manual Identification */}
                    <Button
                      size="sm"
                      onClick={() => {
                        // This would open a manual identification modal
                        // For now, we'll use a simple prompt
                        const userName = prompt('Enter speaker name:');
                        if (userName) {
                          handleIdentification(request, `user_${Date.now()}`, userName);
                        }
                      }}
                      disabled={request.loading}
                      className="flex items-center space-x-2"
                    >
                      {request.loading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span>Identify</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UnidentifiedSpeakersPanel;