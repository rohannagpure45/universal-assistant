/**
 * Voice Identification Components
 * 
 * Barrel export file for all voice identification and library management components.
 * Provides a clean public API for importing voice identification functionality.
 * 
 * @fileoverview Voice identification components export
 */

// Main Dashboard Component
export { VoiceLibraryDashboard } from './VoiceLibraryDashboard';

// Individual Profile Components
export { SpeakerProfileCard } from './SpeakerProfileCard';

// Audio Player Component
export { VoiceSamplePlayer } from './VoiceSamplePlayer';

// Profile Management Component
export { VoiceProfileManager } from './VoiceProfileManager';

// Post-Meeting Identification Components
export { PostMeetingIdentification } from './PostMeetingIdentification';

// Phase 3 Post-Meeting Identification Components
export { PostMeetingIdentificationDashboard } from './PostMeetingIdentificationDashboard';
export { UnidentifiedSpeakersPanel } from './UnidentifiedSpeakersPanel';
export { SpeakerIdentificationWorkflow } from './SpeakerIdentificationWorkflow';
export { VoiceMatchingInterface } from './VoiceMatchingInterface';
export { IdentificationHistoryView } from './IdentificationHistoryView';

// Layout and Responsive Components
export { VoiceLibraryLayout } from './VoiceLibraryLayout';

// Demo Components
export { VoiceLibraryDemo } from './VoiceLibraryDemo';
export { RealTimeVoiceIdentificationDemo } from './RealTimeVoiceIdentificationDemo';
export { PostMeetingIdentificationDemo } from './PostMeetingIdentificationDemo';

// Real-time Voice Identification Components (Phase 3)
export { LiveSpeakerIndicator, useLiveSpeakerData } from './LiveSpeakerIndicator';
export type { LiveSpeakerData, VoiceActivityState } from './LiveSpeakerIndicator';

export { VoiceActivityVisualizer, useVoiceActivity } from './VoiceActivityVisualizer';
export type { 
  VoiceActivityData, 
  AudioAnalysisConfig, 
  VisualizationStyle 
} from './VoiceActivityVisualizer';

export { SpeakerIdentificationOverlay, useSpeakerIdentificationOverlay } from './SpeakerIdentificationOverlay';
export type { 
  SpeakerIdentificationEvent, 
  OverlayConfig, 
  SpeakerSessionStats 
} from './SpeakerIdentificationOverlay';

export { UnknownSpeakerAlert, useUnknownSpeakerDetection } from './UnknownSpeakerAlert';
export type { 
  UnknownSpeakerDetection, 
  AlertConfig, 
  IdentificationAction 
} from './UnknownSpeakerAlert';

// Phase 3 Voice Training Components
export { VoiceTrainingWizard } from './VoiceTrainingWizard';
export { VoiceRecordingInterface } from './VoiceRecordingInterface';
export { VoiceTrainingSampleManager } from './VoiceTrainingSampleManager';
export { SpeakerProfileTraining } from './SpeakerProfileTraining';
export { TrainingProgressDashboard } from './TrainingProgressDashboard';

// Phase 3 Speaker Management Dashboard Components
export { SpeakerManagementDashboard } from './SpeakerManagementDashboard';
export { SpeakerDirectoryView } from './SpeakerDirectoryView';
export { SpeakerAnalyticsDashboard } from './SpeakerAnalyticsDashboard';
export { SpeakerMergeInterface } from './SpeakerMergeInterface';
export { SpeakerSettingsPanel } from './SpeakerSettingsPanel';

// Re-export related hooks and types
export { useVoiceLibrary } from '../../hooks/useVoiceLibrary';
export type { 
  VoiceSample,
  EnhancedVoiceProfile,
  VoiceProfileFilters,
  VoiceProfileBulkOperation,
  VoiceSampleOperation,
  VoiceLibraryViewMode,
  VoiceSamplePlayerState,
  WaveformData,
  VoiceIdentificationConfig,
  VoiceIdentificationEvent,
  VoiceIdentificationEventHandler,
  // Post-Meeting Identification Types
  MeetingWithPending,
  PostMeetingDashboardStats,
  EnhancedIdentificationRequest,
  // Workflow Types
  IdentificationResult,
  WorkflowStep,
  CurrentWorkflowRequest,
  WorkflowMode,
  // Voice Matching Types
  AudioState,
  ComparisonResult,
  // History Types
  HistoryEntry,
  HistoryStats,
  HistoryFilterOptions,
  HistorySortField,
  HistorySortOrder,
  // Component Prop Types
  VoiceIdentificationComponentProps,
  IdentificationRequestHandlerProps,
  VoiceProfileSelectorProps,
  AudioPlaybackProps,
  // Hook Return Types
  VoiceIdentificationHookReturn,
  PostMeetingIdentificationHookReturn,
  IdentificationHistoryHookReturn
} from '../../types/voice-identification';