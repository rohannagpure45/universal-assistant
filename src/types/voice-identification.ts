/**
 * Voice Identification Types
 * 
 * Comprehensive type definitions for the voice identification and library
 * management system. Includes types for voice profiles, audio samples,
 * identification requests, and UI components.
 * 
 * @fileoverview Voice identification type definitions
 */

import type { VoiceLibraryEntry, NeedsIdentification } from './database';

// ============================================
// CORE VOICE TYPES
// ============================================

/**
 * Voice quality levels with associated metadata
 */
export interface VoiceQualityLevel {
  /** Minimum confidence threshold for this quality level */
  threshold: number;
  /** CSS color for visual representation */
  color: string;
  /** Background color for badges/indicators */
  backgroundColor: string;
  /** Human-readable label */
  label: string;
  /** Recommended confidence for automatic identification */
  autoIdentifyThreshold: number;
}

/**
 * Voice quality assessment result
 */
export interface VoiceQualityAssessment {
  /** Overall quality score (0-1) */
  overallScore: number;
  /** Audio clarity score (0-1) */
  clarity: number;
  /** Background noise level (0-1, lower is better) */
  noiseLevel: number;
  /** Speaker volume consistency (0-1) */
  volumeConsistency: number;
  /** Recording duration adequacy (0-1) */
  durationAdequacy: number;
  /** Recommended quality level */
  qualityLevel: VoiceQualityLevel;
  /** Specific recommendations for improvement */
  recommendations: string[];
}

/**
 * Unified voice sample interface for all components
 * Combines all variants to ensure compatibility across the codebase
 * Most properties are optional to support partial objects during construction
 */
export interface VoiceSample {
  /** Unique identifier for the sample */
  id: string;
  /** URL to the audio file */
  url: string;
  /** Optional blob for in-memory samples */
  blob?: Blob;
  /** Transcript text of the audio */
  transcript: string;
  /** Quality score (0-1) */
  quality: number;
  /** Duration in seconds */
  duration: number;
  /** Sample source type (optional, defaults based on context) */
  source?: 'live-recording' | 'file-upload' | 'meeting-extract' | 'training-session' | 'upload' | 'meeting' | 'training';
  /** Timestamp when recorded */
  timestamp: Date;
  /** Additional metadata from storage (optional) */
  metadata?: VoiceSampleStorageMetadata;
  /** Whether sample is starred (optional, defaults to false) */
  isStarred?: boolean;
  /** Active state for UI (optional, defaults to false) */
  isActive?: boolean;
  /** Quality level indicator (optional, computed from quality score) */
  qualityLevel?: 'poor' | 'fair' | 'good' | 'excellent' | 'low' | 'medium' | 'high';
  /** Organizational tags (optional, defaults to empty array) */
  tags?: string[];
  /** Optional notes */
  notes?: string;
  /** Speaker confidence score */
  confidence?: number;
  /** Speaker ID who recorded this */
  speakerId?: string;
  /** Meeting ID where this was recorded */
  meetingId?: string;
  /** Training method used (for training components) */
  method?: 'self-recording' | 'upload' | 'meeting-clips';
  /** File path in storage */
  filePath?: string;
  /** Whether this sample is selected in UI */
  selected?: boolean;
  /** Quality assessment details */
  qualityAssessment?: VoiceQualityAssessment;
}

/**
 * Enhanced voice sample with metadata and analysis (legacy compatibility)
 */
export interface EnhancedVoiceSample extends VoiceSample {
  /** File path in storage */
  filePath: string;
  /** Whether this sample is selected in UI */
  selected: boolean;
}

/**
 * Voice sample storage metadata from Firebase
 */
export interface VoiceSampleStorageMetadata {
  /** Deepgram voice ID */
  deepgramVoiceId: string;
  /** Meeting ID where recorded */
  meetingId: string;
  /** Sample duration in seconds */
  duration: number;
  /** Quality score */
  quality?: number;
  /** Transcript text */
  transcript?: string;
  /** Speaker identification confidence */
  speakerConfidence?: number;
  /** Upload timestamp */
  uploadedAt: string;
  /** File path in storage */
  filePath: string;
  /** File size in bytes */
  size?: number;
  /** Audio format/codec */
  format?: string;
  /** Sample rate */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;
}

// ============================================
// VOICE PROFILE TYPES
// ============================================

/**
 * Enhanced voice profile with computed properties
 */
export interface EnhancedVoiceProfile extends VoiceLibraryEntry {
  /** Number of unresolved identification requests */
  pendingRequests: number;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Audio samples metadata summary */
  samplesMetadata?: VoiceSamplesMetadata;
  /** Quality assessment for the profile */
  profileQuality?: VoiceQualityAssessment;
  /** Whether this profile is currently selected in UI */
  selected?: boolean;
  /** Profile tags for organization */
  tags?: string[];
  /** Custom notes about this speaker */
  notes?: string;
}

/**
 * Voice samples metadata summary
 */
export interface VoiceSamplesMetadata {
  /** Total storage size in bytes */
  totalSize: number;
  /** Average quality across all samples */
  averageQuality: number;
  /** Total duration of all samples */
  totalDuration: number;
  /** Timestamp of oldest sample */
  oldestSample: Date;
  /** Timestamp of newest sample */
  newestSample: Date;
  /** Number of samples */
  count: number;
  /** Best quality sample */
  bestSample?: EnhancedVoiceSample;
  /** Most recent sample */
  latestSample?: EnhancedVoiceSample;
}

/**
 * Voice profile statistics for dashboard
 */
export interface VoiceProfileStatistics {
  /** Total number of voice profiles */
  totalProfiles: number;
  /** Number of confirmed profiles */
  confirmedProfiles: number;
  /** Number of unconfirmed profiles */
  unconfirmedProfiles: number;
  /** Number of profiles active in last 24 hours */
  recentlyActive: number;
  /** Total number of audio samples across all profiles */
  totalSamples: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Total speaking time across all profiles (seconds) */
  totalSpeakingTime: number;
  /** Number of pending identification requests */
  pendingIdentifications: number;
}

// ============================================
// IDENTIFICATION REQUEST TYPES
// ============================================

/**
 * Enhanced identification request with metadata
 */
export interface EnhancedIdentificationRequest extends NeedsIdentification {
  /** Quality assessment of the voice sample */
  sampleQuality?: VoiceQualityAssessment;
  /** Suggested matches from AI/ML analysis */
  aiSuggestions?: VoiceMatchSuggestion[];
  /** Priority level for manual review */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Time since request was created */
  ageInHours: number;
  /** Whether this request is currently being reviewed */
  inReview?: boolean;
  /** Reviewer user ID if in review */
  reviewerId?: string;
}

/**
 * Voice match suggestion from AI analysis
 */
export interface VoiceMatchSuggestion {
  /** Suggested user ID */
  userId: string;
  /** Suggested user name */
  userName: string;
  /** Match confidence score (0-1) */
  confidence: number;
  /** Explanation for the suggestion */
  reason: string;
  /** Supporting evidence for the match */
  evidence: VoiceMatchEvidence[];
}

/**
 * Evidence supporting a voice match suggestion
 */
export interface VoiceMatchEvidence {
  /** Type of evidence */
  type: 'acoustic_similarity' | 'speaking_pattern' | 'vocabulary_match' | 'temporal_pattern' | 'meeting_context';
  /** Strength of this evidence (0-1) */
  strength: number;
  /** Human-readable description */
  description: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

// ============================================
// UI COMPONENT TYPES
// ============================================

/**
 * Filter options for voice profiles
 */
export interface VoiceProfileFilters {
  /** Text search term */
  searchTerm: string;
  /** Confirmation status filter */
  confirmationStatus: 'all' | 'confirmed' | 'unconfirmed';
  /** Sort field */
  sortBy: 'name' | 'lastHeard' | 'meetingsCount' | 'confidence' | 'quality';
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
  /** Minimum confidence threshold */
  minConfidence: number;
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Quality level filter */
  qualityLevel?: VoiceQualityLevel['label'];
  /** Tag filter */
  tags?: string[];
}

/**
 * Bulk operation types for voice profiles
 */
export type VoiceProfileBulkOperation = 
  | 'confirm' 
  | 'delete' 
  | 'export' 
  | 'merge' 
  | 'tag' 
  | 'update_confidence'
  | 'enhance_quality';

/**
 * Voice sample operation types
 */
export type VoiceSampleOperation = 
  | 'delete' 
  | 'export' 
  | 'enhance' 
  | 'merge'
  | 'transcribe'
  | 'analyze_quality';

/**
 * Voice library dashboard view modes
 */
export type VoiceLibraryViewMode = 'grid' | 'list' | 'table';

/**
 * Voice sample player state
 */
export interface VoiceSamplePlayerState {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Volume level (0-1) */
  volume: number;
  /** Whether audio is muted */
  muted: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Playback rate/speed */
  playbackRate: number;
}

/**
 * Waveform visualization data
 */
export interface WaveformData {
  /** Array of peak values for visualization */
  peaks: number[];
  /** Duration of the audio */
  duration: number;
  /** Sample rate of the audio */
  sampleRate?: number;
  /** Number of channels */
  channels?: number;
}

// ============================================
// SERVICE OPERATION TYPES
// ============================================

/**
 * Voice library service operation result
 */
export interface VoiceLibraryOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: any;
  /** Error message if failed */
  error?: string;
  /** Operation metadata */
  metadata?: {
    duration: number;
    affectedItems: number;
    warnings?: string[];
  };
}

/**
 * Batch operation progress
 */
export interface BatchOperationProgress {
  /** Total number of items to process */
  total: number;
  /** Number of items processed */
  completed: number;
  /** Number of items that failed */
  failed: number;
  /** Current operation status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Current operation message */
  message: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
}

/**
 * Voice identification analytics data
 */
export interface VoiceIdentificationAnalytics {
  /** Identification accuracy over time */
  accuracyTrend: {
    date: Date;
    accuracy: number;
  }[];
  /** Most frequently identified speakers */
  topSpeakers: {
    speakerId: string;
    speakerName: string;
    identificationCount: number;
    averageConfidence: number;
  }[];
  /** Identification method effectiveness */
  methodEffectiveness: {
    method: 'self' | 'mentioned' | 'manual' | 'pattern';
    successRate: number;
    averageConfidence: number;
    usageCount: number;
  }[];
  /** Quality distribution */
  qualityDistribution: {
    qualityLevel: VoiceQualityLevel['label'];
    count: number;
    percentage: number;
  }[];
}

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Voice identification system configuration
 */
export interface VoiceIdentificationConfig {
  /** Quality thresholds for different levels */
  qualityLevels: Record<string, VoiceQualityLevel>;
  /** Minimum confidence for auto-identification */
  autoIdentifyThreshold: number;
  /** Maximum number of samples per profile */
  maxSamplesPerProfile: number;
  /** Audio sample duration limits */
  sampleDurationLimits: {
    min: number;
    max: number;
    optimal: number;
  };
  /** Supported audio formats */
  supportedFormats: string[];
  /** Maximum file size for uploads (bytes) */
  maxFileSize: number;
  /** Default settings for new profiles */
  defaultProfileSettings: {
    confidence: number;
    confirmed: boolean;
    maxSamples: number;
  };
}

// ============================================
// EVENT TYPES
// ============================================

/**
 * Voice identification system events
 */
export type VoiceIdentificationEvent = 
  | { type: 'profile_created'; payload: { profileId: string; profile: VoiceLibraryEntry } }
  | { type: 'profile_updated'; payload: { profileId: string; updates: Partial<VoiceLibraryEntry> } }
  | { type: 'profile_deleted'; payload: { profileId: string } }
  | { type: 'sample_added'; payload: { profileId: string; sample: EnhancedVoiceSample } }
  | { type: 'sample_removed'; payload: { profileId: string; sampleId: string } }
  | { type: 'identification_requested'; payload: { request: NeedsIdentification } }
  | { type: 'identification_resolved'; payload: { requestId: string; resolution: 'identified' | 'skipped' } }
  | { type: 'bulk_operation_started'; payload: { operation: VoiceProfileBulkOperation; itemCount: number } }
  | { type: 'bulk_operation_completed'; payload: { operation: VoiceProfileBulkOperation; result: VoiceLibraryOperationResult } };

/**
 * Voice identification event handler type
 */
export type VoiceIdentificationEventHandler = (event: VoiceIdentificationEvent) => void;

// ============================================
// POST-MEETING IDENTIFICATION TYPES
// ============================================

/**
 * Meeting with pending identification requests
 */
export interface MeetingWithPending {
  /** Meeting data */
  meeting: import('./index').Meeting;
  /** Number of pending identification requests */
  pendingCount: number;
  /** Array of pending requests */
  pendingRequests: import('./database').NeedsIdentification[];
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Dashboard statistics for post-meeting identification
 */
export interface PostMeetingDashboardStats {
  /** Total meetings with pending requests */
  totalMeetings: number;
  /** Meetings with pending identification */
  meetingsWithPending: number;
  /** Total pending identification requests */
  totalPendingRequests: number;
  /** Average requests per meeting */
  averageRequestsPerMeeting: number;
  /** Recently processed count */
  recentlyProcessed: number;
  /** Overall identification rate */
  identificationRate: number;
}

/**
 * Enhanced identification request with additional metadata
 */
export interface EnhancedIdentificationRequest {
  /** Base needs identification data */
  base: import('./database').NeedsIdentification;
  /** Voice samples with metadata */
  voiceSamples: EnhancedVoiceSample[];
  /** Quality assessment */
  qualityScore: number;
  /** Clustering suggestions */
  clusteringSuggestions: VoiceMatchSuggestion[];
  /** Priority level */
  priority: 'urgent' | 'high' | 'medium' | 'low';
  /** Selected state for bulk operations */
  selected: boolean;
  /** Loading state */
  loading: boolean;
}

// ============================================
// WORKFLOW TYPES
// ============================================

/**
 * Identification workflow result
 */
export interface IdentificationResult {
  /** Request ID that was processed */
  requestId: string;
  /** Action taken */
  action: 'identified' | 'skipped' | 'deferred';
  /** User ID if identified */
  userId?: string;
  /** User name if identified */
  userName?: string;
  /** Confidence score */
  confidence?: number;
  /** Identification method used */
  method?: 'manual' | 'suggested' | 'matched';
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** Component to render */
  component: string;
  /** Whether step can be skipped */
  canSkip: boolean;
  /** Whether step is optional */
  isOptional: boolean;
}

/**
 * Current request in workflow
 */
export interface CurrentWorkflowRequest {
  /** The identification request */
  request: import('./database').NeedsIdentification;
  /** Available voice samples */
  voiceSamples: EnhancedVoiceSample[];
  /** AI suggestions for identification */
  suggestions: VoiceMatchSuggestion[];
  /** Available profiles for comparison */
  availableProfiles: import('./database').VoiceLibraryEntry[];
  /** Quality score */
  qualityScore: number;
}

/**
 * Workflow mode
 */
export type WorkflowMode = 'single' | 'batch' | 'review';

// ============================================
// VOICE MATCHING TYPES
// ============================================

/**
 * Audio state for voice matching
 */
export interface AudioState {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current playback time */
  currentTime: number;
  /** Total duration */
  duration: number;
  /** Volume level */
  volume: number;
  /** Whether muted */
  muted: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Voice comparison analysis result
 */
export interface ComparisonResult {
  /** Overall similarity score */
  overallScore: number;
  /** Acoustic similarity score */
  acousticSimilarity: number;
  /** Rhythm similarity score */
  rhythmSimilarity: number;
  /** Pitch similarity score */
  pitchSimilarity: number;
  /** Confidence level */
  confidenceLevel: 'low' | 'medium' | 'high';
  /** Recommendation */
  recommendation: 'accept' | 'reject' | 'uncertain';
  /** Analysis factors */
  factors: string[];
}

// ============================================
// HISTORY TYPES
// ============================================

/**
 * Historical identification entry
 */
export interface HistoryEntry {
  /** Unique entry ID */
  id: string;
  /** Original request ID */
  requestId: string;
  /** Speaker label */
  speakerLabel: string;
  /** Meeting title */
  meetingTitle: string;
  /** Meeting date */
  meetingDate: Date;
  /** Action taken */
  action: 'identified' | 'skipped' | 'undone';
  /** Method used */
  method: 'manual' | 'suggested' | 'matched';
  /** User ID if identified */
  userId?: string;
  /** User name if identified */
  userName?: string;
  /** Confidence score */
  confidence: number;
  /** Timestamp of action */
  timestamp: Date;
  /** Whether action can be undone */
  undoable: boolean;
  /** Original request data */
  originalRequest?: import('./database').NeedsIdentification;
}

/**
 * History statistics
 */
export interface HistoryStats {
  /** Total entries */
  totalEntries: number;
  /** Count of identified entries */
  identifiedCount: number;
  /** Count of skipped entries */
  skippedCount: number;
  /** Count of undone entries */
  undoneCount: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Accuracy trend */
  accuracyTrend: number;
  /** Breakdown by method */
  methodBreakdown: {
    manual: number;
    suggested: number;
    matched: number;
  };
  /** Daily activity data */
  dailyActivity: Array<{
    date: Date;
    count: number;
    accuracy: number;
  }>;
}

/**
 * History filter options
 */
export interface HistoryFilterOptions {
  /** Search term */
  searchTerm: string;
  /** Action filter */
  actionFilter: 'all' | 'identified' | 'skipped' | 'undone';
  /** Method filter */
  methodFilter: 'all' | 'manual' | 'suggested' | 'matched';
  /** Confidence range */
  confidenceRange: [number, number];
  /** Date range */
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  /** Meeting filter */
  meetingFilter: string;
  /** User filter */
  userFilter: string;
}

/**
 * History sort options
 */
export type HistorySortField = 'timestamp' | 'confidence' | 'meeting' | 'speaker' | 'method';
export type HistorySortOrder = 'asc' | 'desc';

// ============================================
// COMPONENT PROP TYPES
// ============================================

/**
 * Common props for voice identification components
 */
export interface VoiceIdentificationComponentProps {
  /** Custom CSS classes */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Props for components that handle identification requests
 */
export interface IdentificationRequestHandlerProps extends VoiceIdentificationComponentProps {
  /** Identification requests to process */
  identificationRequests: import('./database').NeedsIdentification[];
  /** Callback when identification is completed */
  onIdentificationComplete?: (results: IdentificationResult[]) => void;
  /** Callback when process is cancelled */
  onCancel?: () => void;
}

/**
 * Props for components that handle voice profile selection
 */
export interface VoiceProfileSelectorProps extends VoiceIdentificationComponentProps {
  /** Available voice profiles */
  availableProfiles: import('./database').VoiceLibraryEntry[];
  /** Currently selected profile */
  selectedProfile?: import('./database').VoiceLibraryEntry | null;
  /** Callback when profile is selected */
  onProfileSelect?: (profile: import('./database').VoiceLibraryEntry | null) => void;
}

/**
 * Props for audio playback components
 */
export interface AudioPlaybackProps extends VoiceIdentificationComponentProps {
  /** Audio URL to play */
  audioUrl: string;
  /** Audio sample metadata */
  sample?: EnhancedVoiceSample;
  /** Callback when playback starts */
  onPlayStart?: () => void;
  /** Callback when playback ends */
  onPlayEnd?: () => void;
  /** Callback when playback fails */
  onPlayError?: (error: string) => void;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

/**
 * Return type for voice identification hooks
 */
export interface VoiceIdentificationHookReturn {
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh function */
  refresh: () => Promise<void>;
  /** Clear error function */
  clearError: () => void;
}

/**
 * Return type for post-meeting identification hooks
 */
export interface PostMeetingIdentificationHookReturn extends VoiceIdentificationHookReturn {
  /** Meetings with pending requests */
  meetingsWithPending: MeetingWithPending[];
  /** Dashboard statistics */
  stats: PostMeetingDashboardStats;
  /** Process identification requests */
  processRequests: (requestIds: string[]) => Promise<IdentificationResult[]>;
}

/**
 * Return type for identification history hooks
 */
export interface IdentificationHistoryHookReturn extends VoiceIdentificationHookReturn {
  /** History entries */
  historyEntries: HistoryEntry[];
  /** History statistics */
  stats: HistoryStats;
  /** Filter options */
  filters: HistoryFilterOptions;
  /** Update filters */
  updateFilters: (filters: Partial<HistoryFilterOptions>) => void;
  /** Undo identification */
  undoIdentification: (entryId: string) => Promise<void>;
  /** Redo identification */
  redoIdentification: () => Promise<void>;
  /** Export history */
  exportHistory: (format: 'csv' | 'json') => void;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Omit certain keys and make some optional
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties of T optional except for specified keys
 */
export type OptionalExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

/**
 * Extract function parameter types
 */
export type ExtractFunctionParams<T> = T extends (...args: infer P) => any ? P : never;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Branded type for IDs
 */
export type Branded<T, B> = T & { __brand: B };

/**
 * Voice identification request ID
 */
export type VoiceIdentificationRequestId = Branded<string, 'VoiceIdentificationRequestId'>;

/**
 * Voice profile ID
 */
export type VoiceProfileId = Branded<string, 'VoiceProfileId'>;

/**
 * Meeting ID for voice identification
 */
export type VoiceMeetingId = Branded<string, 'VoiceMeetingId'>;

// ============================================
// COMPONENT COMPATIBILITY TYPE ALIASES
// ============================================

// Note: VoiceSample is now defined as the unified interface above

/**
 * Training-specific VoiceSample type
 * For components focused on voice profile training
 */
export type TrainingVoiceSample = Pick<EnhancedVoiceSample,
  'id' | 'url' | 'transcript' | 'quality' | 'duration' | 'timestamp' | 'source' | 'isStarred'
> & {
  /** Training-specific metadata */
  metadata?: VoiceSampleStorageMetadata;
  /** Quality level for training assessment */
  qualityLevel?: 'low' | 'medium' | 'high' | 'excellent';
  /** Optional blob for immediate processing */
  blob?: Blob;
};

/**
 * Playback-compatible VoiceSample type  
 * Minimal interface for audio playback components
 */
export type PlaybackVoiceSample = Pick<EnhancedVoiceSample,
  'url' | 'transcript' | 'quality' | 'duration'
> & {
  /** Optional ID for tracking */
  id?: string;
  /** Optional timestamp for ordering */
  timestamp?: Date;
};