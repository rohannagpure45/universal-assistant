// User types
export interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    preferences: UserPreferences;
    createdAt: Date;
    lastActive: Date;
  }
  
  export interface UserPreferences {
    defaultModel: AIModel;
    ttsVoice: string;
    ttsSpeed: number;
    autoTranscribe: boolean;
    saveTranscripts: boolean;
    theme: 'light' | 'dark' | 'system';
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
    CLIENT_MEETING = 'client_meeting'
  }
  
  export interface Meeting {
    meetingId: string;
    hostId: string;
    title: string;
    type: MeetingType;
    participants: Participant[];
    transcript: TranscriptEntry[];
    notes: string[];
    keywords: string[];
    appliedRules: string[];
    startTime: Date;
    endTime?: Date;
    recording?: {
      url: string;
      duration: number;
    };
  }
  
  export interface Participant {
    userId: string;
    userName: string;
    voiceProfileId: string;
    joinTime: Date;
    speakingTime: number;
  }
  
  // Transcript types
  export interface TranscriptEntry {
    id: string;
    speaker: string;
    speakerId: string;
    text: string;
    timestamp: Date;
    confidence: number;
    isFragment: boolean;
    isComplete: boolean;
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