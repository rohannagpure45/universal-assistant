/**
 * Voice Identification Components
 * 
 * Barrel export file for all voice identification and library management components.
 * Provides a clean public API for importing voice identification functionality.
 * 
 * @fileoverview Voice identification components export
 */

import React from 'react';
import { SimpleErrorBoundary } from '@/components/error-boundaries/SimpleErrorBoundary';

/**
 * Higher-Order Component to wrap voice identification components with error boundaries
 * Provides graceful error handling for voice identification component failures
 * Enhanced with better error context and recovery mechanisms
 */
function withVoiceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  const WrappedComponent = (props: P) => (
    <SimpleErrorBoundary
      fallback={
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Voice Identification Unavailable
              </h3>
              <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                <p>The {componentName} component encountered an error.</p>
                <p className="mt-1">
                  <strong>Impact:</strong> Voice identification features may be limited, but core meeting functionality continues.
                </p>
                <p className="mt-1">
                  <strong>Recovery:</strong> Try refreshing the page or contact support if the issue persists.
                </p>
              </div>
            </div>
          </div>
        </div>
      }
      onError={(error) => {
        // Enhanced error logging with context
        const errorContext = {
          component: componentName,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
          errorMessage: error.message,
          errorStack: error.stack,
          props: Object.keys(props || {}).filter(key => typeof (props as any)[key] !== 'function')
        };
        
        console.group(`🎙️ Voice Identification Error (${componentName})`);
        console.error('Error details:', errorContext);
        console.error('Original error:', error);
        console.groupEnd();
        
        // Could integrate with error monitoring service here
        // Example: sendToErrorMonitoring('voice-identification', errorContext);
      }}
    >
      <Component {...props} />
    </SimpleErrorBoundary>
  );
  
  WrappedComponent.displayName = `withVoiceErrorBoundary(${componentName})`;
  return WrappedComponent;
}

// Import raw components for wrapping
import { VoiceLibraryDashboard as _VoiceLibraryDashboard } from './VoiceLibraryDashboard';
import { SpeakerProfileCard as _SpeakerProfileCard } from './SpeakerProfileCard';
import { VoiceSamplePlayer as _VoiceSamplePlayer } from './VoiceSamplePlayer';
import { VoiceProfileManager as _VoiceProfileManager } from './VoiceProfileManager';
import { PostMeetingIdentification as _PostMeetingIdentification } from './PostMeetingIdentification';

// Main Dashboard Component - Wrapped with error boundary
export const VoiceLibraryDashboard = withVoiceErrorBoundary(_VoiceLibraryDashboard, 'Voice Library Dashboard');

// Individual Profile Components
export const SpeakerProfileCard = withVoiceErrorBoundary(_SpeakerProfileCard, 'Speaker Profile Card');

// Audio Player Component - High risk for audio processing errors
export const VoiceSamplePlayer = withVoiceErrorBoundary(_VoiceSamplePlayer, 'Voice Sample Player');

// Profile Management Component
export const VoiceProfileManager = withVoiceErrorBoundary(_VoiceProfileManager, 'Voice Profile Manager');

// Post-Meeting Identification Components - High risk for processing errors
export const PostMeetingIdentification = withVoiceErrorBoundary(_PostMeetingIdentification, 'Post-Meeting Identification');

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

// Import high-risk voice training components for wrapping
import { VoiceTrainingWizard as _VoiceTrainingWizard } from './VoiceTrainingWizard';
import { VoiceRecordingInterface as _VoiceRecordingInterface } from './VoiceRecordingInterface';
import { VoiceTrainingSampleManager as _VoiceTrainingSampleManager } from './VoiceTrainingSampleManager';
import { SpeakerProfileTraining as _SpeakerProfileTraining } from './SpeakerProfileTraining';
import { TrainingProgressDashboard as _TrainingProgressDashboard } from './TrainingProgressDashboard';

// Phase 3 Voice Training Components - High risk for audio processing and training failures
export const VoiceTrainingWizard = withVoiceErrorBoundary(_VoiceTrainingWizard, 'Voice Training Wizard');
export const VoiceRecordingInterface = withVoiceErrorBoundary(_VoiceRecordingInterface, 'Voice Recording Interface');
export const VoiceTrainingSampleManager = withVoiceErrorBoundary(_VoiceTrainingSampleManager, 'Voice Training Sample Manager');
export const SpeakerProfileTraining = withVoiceErrorBoundary(_SpeakerProfileTraining, 'Speaker Profile Training');
export const TrainingProgressDashboard = withVoiceErrorBoundary(_TrainingProgressDashboard, 'Training Progress Dashboard');

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