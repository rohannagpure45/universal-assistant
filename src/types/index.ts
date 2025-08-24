// User types
export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
    isAdmin: boolean;                        // NEW: Admin flag for access control
    primaryVoiceId?: string | null;          // NEW: Links to voice_library
    preferences: UserPreferences;
    createdAt: Date;
    lastActive: Date;
    emailVerified?: boolean;
    lastLoginAt?: string;
  }
  
  export interface UserPreferences {
    defaultModel: AIModel;
    ttsVoice: string;
    ttsSpeed: number;
    autoTranscribe: boolean;
    saveTranscripts: boolean;
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      emailNotifications: boolean;
      pushNotifications: boolean;
      desktopNotifications: boolean;
    };
    privacy: {
      dataRetention: number;
      allowAnalytics: boolean;
      shareImprovement: boolean;
    };
    accessibility: {
      highContrast: boolean;
      largeText: boolean;
      keyboardNavigation: boolean;
    };
    ai?: {
      defaultModel: AIModel;
      temperature: number;
      maxTokens: number;
      enableFallback: boolean;
    };
    tts?: {
      voice: string;
      speed: number;
      pitch: number;
      volume: number;
    };
    ui?: {
      theme: 'light' | 'dark' | 'system';
      language: string;
      fontSize: number;
      compactMode: boolean;
    };
  }
  
  // Audio types
  export interface AudioConfig {
    sampleRate: number;
    channels: number;
    encoding: string;
    chunkDuration: number;
    silenceThreshold: number;
    silenceDuration: number;
  }
  
  // Speaker types
  export interface SpeakerProfile {
    speakerId: string;
    voiceId: string;
    userName?: string;
    voiceEmbedding: number[];
    lastSeen: Date;
    confidence: number;
    sessionCount: number;
  }
  
  // Meeting types
  export enum MeetingType {
    BRAINSTORMING = 'brainstorming',
    STATUS_UPDATE = 'status_update',
    TECHNICAL_DISCUSSION = 'technical_discussion',
    CASUAL_CONVERSATION = 'casual_conversation',
    FORMAL_PRESENTATION = 'formal_presentation',
    ONE_ON_ONE = 'one_on_one',
    TEAM_STANDUP = 'team_standup',
    CLIENT_MEETING = 'client_meeting',
    GENERAL = 'general',
    STANDUP = 'standup',
    PLANNING = 'planning',
    RETROSPECTIVE = 'retrospective',
    INTERVIEW = 'interview',
    PRESENTATION = 'presentation',
    TRAINING = 'training'
  }
  
  export interface Meeting {
    id: string;
    meetingId: string;
    meetingTypeId: string;                    // NEW: Links to meeting_types collection
    hostId: string;
    participantIds: string[];                 // NEW: For access control - all userIds who participated
    createdBy: string;
    title: string;
    description?: string;
    type: MeetingType;
    participants: Participant[];              // Detailed participant info
    transcript: TranscriptEntry[];
    notes: string[];
    keywords: string[];
    appliedRules: string[];
    startTime: Date;
    endTime?: Date;
    startedAt?: Date;
    endedAt?: Date;
    scheduledFor?: Date;
    status: 'scheduled' | 'active' | 'ended' | 'cancelled' | 'processed';  // Added 'processed'
    duration?: number;
    recording?: {
      url: string;
      duration: number;
    };
    settings?: {
      isPublic: boolean;
      allowRecording: boolean;
      autoTranscribe: boolean;
      language: string;
      maxParticipants: number;
    };
    aiModelHistory?: Array<{                  // NEW: Track model changes
      model: string;
      switchedAt: Date;
      switchedBy: string;
      reason?: string | null;
      transcriptIndex: number;
    }>;
    currentModel?: string;                    // NEW: Active AI model
    modelContext?: {                          // NEW: Context across model switches
      summary: string;
      speakers: object;
      topics: string[];
      lastPrompt: string;
    };
    metadata?: {
      totalWords: number;
      totalSpeakers: number;
      averageWPM: number;
      topics: string[];
    };
    // Voice tracking fields
    speakerCount?: number;                    // Number of unique speakers detected
    lastVoiceActivity?: Date;                 // Timestamp of last voice activity
    voiceIdentification?: {
      unidentifiedSpeakers: string[];         // deepgramVoiceIds needing identification
      identifiedSpeakers: Record<string, {   // deepgramVoiceId -> user info
        userId: string;
        userName: string;
        confidence: number;
        method: 'self' | 'mentioned' | 'pattern' | 'manual';
      }>;
      totalSpeakingTime: Record<string, number>; // deepgramVoiceId -> seconds
    };
    summary?: string;
    actionItems?: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Participant {
    id: string;
    userId: string;
    userName: string;
    displayName: string;
    email: string;
    voiceProfileId: string;
    role: 'host' | 'participant' | 'guest';
    joinTime: Date;
    joinedAt: Date;
    speakingTime: number;
    isActive: boolean;
  }

  // Type alias for meeting participant context
  export type MeetingParticipant = Participant;
  
  // Transcript types
  export interface TranscriptEntry {
    id: string;
    meetingId: string;
    text: string;                        // Primary text field
    content?: string;                    // Alias for text (deprecated, use text)
    speakerId: string;                   // Deepgram voice ID (primary)
    voiceId?: string;                    // Alias for speakerId (deprecated)
    speaker?: string;                    // Display name (deprecated, use speakerName)
    speakerName: string;                 // Current speaker display name
    timestamp: Date;
    duration: number;
    confidence: number;                  // Transcription confidence (0-1)
    language: string;
    isFragment: boolean;                 // Is this a partial transcript?
    isComplete: boolean;                 // Is transcription complete?
    isProcessed: boolean;                // Has been processed by AI?
    metadata?: {
      volume: number;
      pace: number;
      sentiment: string;
      keywords: string[];
      audioUrl?: string;                 // URL to audio clip
      quality?: number;                  // Audio quality score
    };
  }
  
  // AI types
  export type AIModel = 
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'gpt-4-turbo'
    | 'claude-3-5-sonnet'
    | 'claude-3-haiku'
    | 'claude-3-opus'
    | 'claude-3-5-opus'
    | 'claude-3-7-sonnet'
    | 'claude-3-7-opus'
  
  export interface AIResponse {
    text: string;
    model: AIModel;
    tokensUsed: number;
    latency: number;
    timestamp: Date;
  }
  
  // Rule types
  export interface CustomRule {
    ruleId: string;
    userId: string;
    name: string;
    description: string;
    meetingTypes: MeetingType[];
    conditions: RuleCondition[];
    actions: RuleAction[];
    priority: number;
    enabled: boolean;
    createdAt: Date;
    lastUsed?: Date;
  }
  
  export interface RuleCondition {
    type: 'keyword' | 'speaker' | 'time' | 'pattern';
    value: string | number | RegExp;
    operator: 'contains' | 'equals' | 'matches' | 'greater' | 'less';
  }
  
  export interface RuleAction {
    type: 'respond' | 'summarize' | 'ignore' | 'highlight' | 'notify';
    parameters?: Record<string, any>;
  }

  // Voice Identification types
  export interface IdentificationResult {
    deepgramVoiceId: string;
    userId: string;
    userName: string;
    confidence: number;
    method: 'self' | 'mentioned' | 'pattern' | 'manual';
    evidence: string;
    timestamp?: Date;
  }

  export interface VoiceIdentificationStrategy {
    name: string;
    confidence: number;
    execute(): Promise<IdentificationResult | null>;
  }

  export interface UnidentifiedSpeaker {
    deepgramVoiceId: string;
    sampleUrls: string[];
    transcriptSamples: string[];
    duration: number;
    occurrences: number;
    firstSeen: Date;
    lastSeen: Date;
  }

  // Query result types for pagination
  export interface QueryResult<T> {
    data: T[];
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
  }

  export interface PaginatedResult<T> {
    data: T[];
    lastDoc?: any; // DocumentSnapshot from Firebase
    hasMore: boolean;
  }

  export interface PaginationOptions {
    limit?: number;
    startAfterDoc?: any; // DocumentSnapshot from Firebase
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
  }

  export interface TranscriptQueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: 'timestamp' | 'confidence';
    orderDirection?: 'asc' | 'desc';
  }

  export interface BatchUpdateEntry<T = any> {
    id: string;
    data: Partial<T>;
  }

  // Cost tracking types removed

  // Re-export Firebase-specific types
  export * from './firebase';
  export * from './database';
  export * from './admin';