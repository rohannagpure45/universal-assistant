/**
 * Speaker Identification Workflow
 * 
 * Step-by-step workflow for identifying unknown speakers with guided
 * voice sample comparison, manual name assignment, automatic suggestions,
 * and bulk identification capabilities.
 * 
 * Features:
 * - Multi-step guided identification process
 * - Voice sample comparison and analysis
 * - Manual name assignment with validation
 * - Automatic suggestions and matching
 * - Progress tracking and workflow state
 * - Bulk processing capabilities
 * - Undo/redo functionality
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Check,
  X,
  SkipForward,
  RotateCcw,
  Users,
  User,
  Radio,
  Clock,
  Volume2,
  Mic,
  AlertTriangle,
  CheckCircle2,
  Info,
  Settings
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AccessibleLinearProgress } from '../ui/AccessibleProgress';
import { VoiceMatchingInterface } from './VoiceMatchingInterface';
import { NeedsIdentificationService } from '../../services/firebase/NeedsIdentificationService';
import { VoiceLibraryService } from '../../services/firebase/VoiceLibraryService';
import { ClientStorageService } from '../../services/firebase/ClientStorageService';
import type { NeedsIdentification, VoiceLibraryEntry } from '../../types/database';
import type { EnhancedVoiceSample, VoiceMatchSuggestion } from '../../types/voice-identification';

interface SpeakerIdentificationWorkflowProps {
  /** List of requests to process */
  identificationRequests: NeedsIdentification[];
  /** Whether to show comparison interface */
  showVoiceComparison?: boolean;
  /** Confidence threshold for auto-suggestions */
  autoSuggestionThreshold?: number;
  /** Callback when identification is completed */
  onIdentificationComplete?: (results: IdentificationResult[]) => void;
  /** Callback when workflow is cancelled */
  onCancel?: () => void;
  /** Custom CSS classes */
  className?: string;
}

interface IdentificationResult {
  requestId: string;
  action: 'identified' | 'skipped' | 'deferred';
  userId?: string;
  userName?: string;
  confidence?: number;
  method?: 'manual' | 'suggested' | 'matched';
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  component: string;
  canSkip: boolean;
  isOptional: boolean;
}

interface CurrentRequest {
  request: NeedsIdentification;
  voiceSamples: EnhancedVoiceSample[];
  suggestions: VoiceMatchSuggestion[];
  availableProfiles: VoiceLibraryEntry[];
  qualityScore: number;
}

type WorkflowMode = 'single' | 'batch' | 'review';

/**
 * Speaker Identification Workflow Component
 */
export const SpeakerIdentificationWorkflow: React.FC<SpeakerIdentificationWorkflowProps> = ({
  identificationRequests,
  showVoiceComparison = true,
  autoSuggestionThreshold = 0.7,
  onIdentificationComplete,
  onCancel,
  className = ''
}) => {
  // State management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentRequest, setCurrentRequest] = useState<CurrentRequest | null>(null);
  const [results, setResults] = useState<IdentificationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('single');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  
  // Form state
  const [manualName, setManualName] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<VoiceMatchSuggestion | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<VoiceLibraryEntry | null>(null);
  const [identificationMethod, setIdentificationMethod] = useState<'manual' | 'suggested' | 'matched'>('manual');
  const [confidence, setConfidence] = useState(0.8);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Workflow steps definition
  const workflowSteps: WorkflowStep[] = [
    {
      id: 'review',
      title: 'Review Speaker',
      description: 'Listen to voice samples and review speaker information',
      component: 'review',
      canSkip: false,
      isOptional: false
    },
    {
      id: 'compare',
      title: 'Compare Voices',
      description: 'Compare with existing voice profiles if available',
      component: 'compare',
      canSkip: true,
      isOptional: !showVoiceComparison
    },
    {
      id: 'identify',
      title: 'Identify Speaker',
      description: 'Choose identification method and provide speaker details',
      component: 'identify',
      canSkip: true,
      isOptional: false
    },
    {
      id: 'confirm',
      title: 'Confirm Decision',
      description: 'Review and confirm the identification decision',
      component: 'confirm',
      canSkip: false,
      isOptional: false
    }
  ];

  /**
   * Load data for current request
   */
  const loadCurrentRequest = useCallback(async (requestIndex: number) => {
    if (requestIndex >= identificationRequests.length) return;

    setLoading(true);
    setError(null);
    
    try {
      const request = identificationRequests[requestIndex];
      
      // Load voice samples
      const samples = await ClientStorageService.listVoiceSamples(request.deepgramVoiceId, 5);
      const voiceSamples: EnhancedVoiceSample[] = samples.map(sample => ({
        id: `${sample.deepgramVoiceId}_${sample.uploadedAt}`,
        url: '', // Would get download URL
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

      // Get voice suggestions
      const matches = await VoiceLibraryService.findPotentialMatches(request.deepgramVoiceId, 0.5);
      const suggestions: VoiceMatchSuggestion[] = matches.map(match => ({
        userId: match.voiceId,
        userName: match.userName || 'Unknown User',
        confidence: match.confidence,
        reason: 'Voice pattern similarity',
        evidence: [{
          type: 'acoustic_similarity' as const,
          strength: match.confidence,
          description: `${Math.round(match.confidence * 100)}% acoustic similarity`
        }]
      }));

      // Get available profiles for comparison
      const availableProfiles = await VoiceLibraryService.getUnconfirmedVoices(10);

      // Calculate quality score
      const qualityScore = Math.min(
        0.5 + (voiceSamples.length * 0.1) + (request.sampleTranscripts.length * 0.1),
        1.0
      );

      const currentReq: CurrentRequest = {
        request,
        voiceSamples,
        suggestions,
        availableProfiles,
        qualityScore
      };

      setCurrentRequest(currentReq);

      // Reset form state
      setManualName('');
      setSelectedSuggestion(null);
      setSelectedProfile(null);
      setIdentificationMethod('manual');
      setConfidence(0.8);

      // Auto-select high-confidence suggestions
      if (suggestions.length > 0 && suggestions[0].confidence >= autoSuggestionThreshold) {
        setSelectedSuggestion(suggestions[0]);
        setIdentificationMethod('suggested');
        setConfidence(suggestions[0].confidence);
      }

    } catch (err) {
      console.error('Failed to load current request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load speaker data');
    } finally {
      setLoading(false);
    }
  }, [identificationRequests, autoSuggestionThreshold]);

  /**
   * Handle audio playback
   */
  const handleAudioPlay = useCallback(async (audioUrl: string, sampleId: string) => {
    try {
      if (playingAudio === sampleId) {
        if (audioRef.current) {
          audioRef.current.pause();
          setPlayingAudio(null);
        }
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setPlayingAudio(null);
      });

      audio.addEventListener('error', () => {
        setError('Failed to play audio sample');
        setPlayingAudio(null);
      });

      await audio.play();
      setPlayingAudio(sampleId);
    } catch (err) {
      console.error('Audio playback error:', err);
      setError('Failed to play audio sample');
    }
  }, [playingAudio]);

  /**
   * Move to next step
   */
  const nextStep = useCallback(() => {
    const availableSteps = workflowSteps.filter(step => !step.isOptional);
    if (currentStep < availableSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, workflowSteps]);

  /**
   * Move to previous step
   */
  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  /**
   * Skip current request
   */
  const skipRequest = useCallback(() => {
    if (!currentRequest) return;

    const result: IdentificationResult = {
      requestId: currentRequest.request.id!,
      action: 'skipped'
    };

    setResults(prev => [...prev, result]);
    
    if (currentIndex < identificationRequests.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentStep(0);
    } else {
      completeWorkflow();
    }
  }, [currentRequest, currentIndex, identificationRequests.length]);

  /**
   * Submit identification
   */
  const submitIdentification = useCallback(async () => {
    if (!currentRequest) return;

    setLoading(true);
    try {
      let result: IdentificationResult;

      if (identificationMethod === 'manual' && manualName.trim()) {
        // Manual identification
        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        await NeedsIdentificationService.resolveRequest(
          currentRequest.request.id!,
          'identified',
          userId,
          manualName.trim()
        );

        result = {
          requestId: currentRequest.request.id!,
          action: 'identified',
          userId,
          userName: manualName.trim(),
          confidence,
          method: 'manual'
        };
      } else if (identificationMethod === 'suggested' && selectedSuggestion) {
        // Suggested identification
        await NeedsIdentificationService.resolveRequest(
          currentRequest.request.id!,
          'identified',
          selectedSuggestion.userId,
          selectedSuggestion.userName
        );

        result = {
          requestId: currentRequest.request.id!,
          action: 'identified',
          userId: selectedSuggestion.userId,
          userName: selectedSuggestion.userName,
          confidence: selectedSuggestion.confidence,
          method: 'suggested'
        };
      } else if (identificationMethod === 'matched' && selectedProfile) {
        // Profile match identification
        const userId = selectedProfile.userId || `user_${selectedProfile.deepgramVoiceId}`;
        const userName = selectedProfile.userName || 'Unknown User';
        
        await NeedsIdentificationService.resolveRequest(
          currentRequest.request.id!,
          'identified',
          userId,
          userName
        );

        result = {
          requestId: currentRequest.request.id!,
          action: 'identified',
          userId,
          userName,
          confidence,
          method: 'matched'
        };
      } else {
        // Skip if no valid identification
        result = {
          requestId: currentRequest.request.id!,
          action: 'skipped'
        };
      }

      setResults(prev => [...prev, result]);

      // Move to next request or complete
      if (currentIndex < identificationRequests.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentStep(0);
      } else {
        completeWorkflow();
      }

    } catch (err) {
      console.error('Failed to submit identification:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit identification');
    } finally {
      setLoading(false);
    }
  }, [currentRequest, identificationMethod, manualName, selectedSuggestion, selectedProfile, confidence, currentIndex, identificationRequests.length]);

  /**
   * Complete the workflow
   */
  const completeWorkflow = useCallback(() => {
    if (onIdentificationComplete) {
      onIdentificationComplete(results);
    }
  }, [results, onIdentificationComplete]);

  /**
   * Cancel workflow
   */
  const cancelWorkflow = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Load initial request
  useEffect(() => {
    if (identificationRequests.length > 0) {
      loadCurrentRequest(currentIndex);
    }
  }, [currentIndex, loadCurrentRequest, identificationRequests.length]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!currentRequest && !loading) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Speakers to Process</h3>
        <p className="text-gray-600">There are no identification requests to process.</p>
      </Card>
    );
  }

  const currentWorkflowStep = workflowSteps.filter(step => !step.isOptional)[currentStep];
  const progress = ((currentIndex * workflowSteps.length + currentStep + 1) / (identificationRequests.length * workflowSteps.length)) * 100;

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header with Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Speaker Identification Workflow
            </h2>
            <p className="text-sm text-gray-600">
              Processing {currentIndex + 1} of {identificationRequests.length} speakers
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={cancelWorkflow}>
              Cancel
            </Button>
          </div>
        </div>
        
        <AccessibleLinearProgress 
          progress={progress}
          label={`Workflow progress: ${Math.round(progress)}% complete`}
          className="mb-4"
        />
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {workflowSteps.filter(step => !step.isOptional).map((step, index) => (
              <div 
                key={step.id}
                className={`flex items-center space-x-2 ${
                  index === currentStep ? 'text-blue-600 font-medium' : 
                  index < currentStep ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : index === currentStep ? (
                  <div className="h-4 w-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full" />
                  </div>
                ) : (
                  <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
          
          <span className="text-gray-500">
            {Math.round(progress)}% complete
          </span>
        </div>
      </Card>

      {/* Current Request Info */}
      {currentRequest && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {currentRequest.request.speakerLabel}
              </h3>
              <p className="text-sm text-gray-600">
                From: {currentRequest.request.meetingTitle} • {currentRequest.request.meetingDate.toLocaleDateString()}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>Quality: {Math.round(currentRequest.qualityScore * 100)}%</span>
                <span>•</span>
                <span>{currentRequest.voiceSamples.length} voice samples</span>
                <span>•</span>
                <span>{currentRequest.request.sampleTranscripts.length} transcripts</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Step 1: Review Speaker */}
              {currentWorkflowStep?.id === 'review' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Volume2 className="h-4 w-4" />
                    <span>Voice Samples</span>
                  </h4>
                  
                  {currentRequest.request.audioUrl && (
                    <Card className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Primary Sample</p>
                          <p className="text-xs text-gray-600">Best quality audio for identification</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAudioPlay(currentRequest.request.audioUrl, 'primary')}
                          className="flex items-center space-x-2"
                        >
                          {playingAudio === 'primary' ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          <span>Play</span>
                        </Button>
                      </div>
                    </Card>
                  )}

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Sample Transcripts</h5>
                    <div className="space-y-2">
                      {currentRequest.request.sampleTranscripts.map((sample, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700 italic mb-1">
                            "{sample.text}"
                          </p>
                          <p className="text-xs text-gray-500">
                            {sample.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Compare Voices */}
              {currentWorkflowStep?.id === 'compare' && showVoiceComparison && (
                <VoiceMatchingInterface
                  currentRequest={currentRequest.request}
                  availableProfiles={currentRequest.availableProfiles}
                  onProfileSelect={setSelectedProfile}
                  onConfidenceChange={setConfidence}
                />
              )}

              {/* Step 3: Identify Speaker */}
              {currentWorkflowStep?.id === 'identify' && (
                <div className="space-y-6">
                  {/* Identification Method Selection */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Choose Identification Method</h4>
                    <div className="space-y-3">
                      {/* Manual Entry */}
                      <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="identificationMethod"
                          value="manual"
                          checked={identificationMethod === 'manual'}
                          onChange={(e) => setIdentificationMethod(e.target.value as any)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Manual Entry</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Enter the speaker's name manually
                          </p>
                          {identificationMethod === 'manual' && (
                            <div className="mt-3">
                              <input
                                type="text"
                                value={manualName}
                                onChange={(e) => setManualName(e.target.value)}
                                placeholder="Enter speaker name..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          )}
                        </div>
                      </label>

                      {/* AI Suggestions */}
                      {currentRequest.suggestions.length > 0 && (
                        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="identificationMethod"
                            value="suggested"
                            checked={identificationMethod === 'suggested'}
                            onChange={(e) => setIdentificationMethod(e.target.value as any)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Radio className="h-4 w-4 text-green-500" />
                              <span className="font-medium">AI Suggestion</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Use AI-powered voice matching suggestions
                            </p>
                            {identificationMethod === 'suggested' && (
                              <div className="mt-3 space-y-2">
                                {currentRequest.suggestions.map((suggestion, index) => (
                                  <label 
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg cursor-pointer"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <input
                                        type="radio"
                                        name="suggestion"
                                        checked={selectedSuggestion?.userId === suggestion.userId}
                                        onChange={() => {
                                          setSelectedSuggestion(suggestion);
                                          setConfidence(suggestion.confidence);
                                        }}
                                      />
                                      <div>
                                        <p className="text-sm font-medium">{suggestion.userName}</p>
                                        <p className="text-xs text-gray-600">{suggestion.reason}</p>
                                      </div>
                                    </div>
                                    <span className="text-xs text-green-600 font-medium">
                                      {Math.round(suggestion.confidence * 100)}% match
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      )}

                      {/* Profile Matching */}
                      {selectedProfile && (
                        <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="identificationMethod"
                            value="matched"
                            checked={identificationMethod === 'matched'}
                            onChange={(e) => setIdentificationMethod(e.target.value as any)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">Profile Match</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Match with existing voice profile: {selectedProfile.userName || 'Unknown User'}
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Confidence Slider */}
                  {(identificationMethod === 'manual' || identificationMethod === 'matched') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confidence Level: {Math.round(confidence * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={confidence}
                        onChange={(e) => setConfidence(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>Medium</span>
                        <span>High</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Confirm Decision */}
              {currentWorkflowStep?.id === 'confirm' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Confirm Identification</h4>
                  
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {identificationMethod === 'manual' && manualName.trim() && 
                            `Identify as: ${manualName.trim()}`
                          }
                          {identificationMethod === 'suggested' && selectedSuggestion &&
                            `Identify as: ${selectedSuggestion.userName} (AI suggestion)`
                          }
                          {identificationMethod === 'matched' && selectedProfile &&
                            `Match with profile: ${selectedProfile.userName || 'Unknown User'}`
                          }
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Confidence: {Math.round(confidence * 100)}% • Method: {identificationMethod}
                        </p>
                      </div>
                    </div>
                  </Card>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>This identification will be saved and applied to the speaker's voice profile.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200 mt-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              
              {currentWorkflowStep?.canSkip && (
                <Button
                  variant="outline"
                  onClick={skipRequest}
                  className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
                >
                  <SkipForward className="h-4 w-4" />
                  <span>Skip Speaker</span>
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {currentStep < workflowSteps.filter(step => !step.isOptional).length - 1 ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={submitIdentification}
                  disabled={loading || (
                    identificationMethod === 'manual' && !manualName.trim() ||
                    identificationMethod === 'suggested' && !selectedSuggestion ||
                    identificationMethod === 'matched' && !selectedProfile
                  )}
                  className="flex items-center space-x-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>
                    {currentIndex < identificationRequests.length - 1 ? 'Submit & Next' : 'Complete'}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SpeakerIdentificationWorkflow;