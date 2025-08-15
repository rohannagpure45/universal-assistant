// User types
export interface User {
    id: string;
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
    lastActive: Date;
    lastLoginAt: Date;
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
    hostId: string;
    createdBy: string;
    title: string;
    description?: string;
    type: MeetingType;
    participants: Participant[];
    transcript: TranscriptEntry[];
    notes: string[];
    keywords: string[];
    appliedRules: string[];
    startTime: Date;
    endTime?: Date;
    startedAt?: Date;
    endedAt?: Date;
    scheduledFor?: Date;
    status: 'scheduled' | 'active' | 'ended' | 'cancelled';
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
    metadata?: {
      totalWords: number;
      totalSpeakers: number;
      averageWPM: number;
      topics: string[];
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
    content: string;
    speaker: string;
    speakerId: string;
    speakerName: string;
    text: string;
    timestamp: Date;
    duration: number;
    confidence: number;
    language: string;
    isFragment: boolean;
    isComplete: boolean;
    isProcessed: boolean;
    metadata?: {
      volume: number;
      pace: number;
      sentiment: string;
      keywords: string[];
    };
  }
  
  // AI types
  export type AIModel = 
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'claude-3-5-sonnet'
    | 'claude-3-5-opus'
    | 'claude-3-7-sonnet'
    | 'claude-3-7-opus'
    | 'claude-3-7-sonnet'
    | 'gpt-5-mini'
    | 'gpt-5-nano'
    | 'gpt-5'
    | 'gpt-4.1-nano'
  
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

  // Re-export Firebase-specific types
  export * from './firebase';