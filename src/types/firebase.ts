// Firebase TypeScript Interfaces
// Replace all generic 'object' types with these specific interfaces

export interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  speed: number;
  pitch?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

// Metadata Interfaces
export interface UserMetadata {
  language?: string;
  timezone?: string;
  lastLoginAt?: Date;
  signupMethod?: 'email' | 'google' | 'github';
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  features?: string[];
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
  };
}

export interface MeetingMetadata {
  duration?: number;
  participantCount?: number;
  recordingEnabled?: boolean;
  transcriptionEnabled?: boolean;
  language?: string;
  meetingType?: 'standup' | 'review' | 'planning' | 'interview' | 'presentation' | 'brainstorming' | 'training' | 'other';
  tags?: string[];
  location?: string;
  organizationId?: string;
  projectId?: string;
}

export interface VoiceProfileMetadata {
  language?: string;
  accent?: string;
  gender?: 'male' | 'female' | 'neutral';
  ageRange?: 'young' | 'adult' | 'mature' | 'senior';
  description?: string;
  voiceType?: 'natural' | 'synthetic' | 'cloned';
  emotionRange?: string[];
  usageCount?: number;
  lastUsedAt?: Date;
}

export interface AIResponseMetadata {
  model: string;
  provider: 'openai' | 'anthropic';
  tokensUsed?: number;
  responseTime?: number;
  temperature?: number;
  maxTokens?: number;
  confidence?: number;
  reasoning?: string;
  sourceContext?: string[];
  errorInfo?: {
    code?: string;
    message?: string;
    retryCount?: number;
  };
}

export interface AnalyticsMetadata {
  sessionId?: string;
  userId?: string;
  eventType: 'meeting_start' | 'meeting_end' | 'voice_generated' | 'error_occurred' | 'user_action';
  timestamp: Date;
  duration?: number;
  success?: boolean;
  errorDetails?: {
    errorType?: string;
    errorMessage?: string;
    stackTrace?: string;
  };
  performanceMetrics?: {
    memoryUsage?: number;
    cpuUsage?: number;
    latency?: number;
  };
}

// Context Interfaces
export interface AIResponseContext {
  conversationHistory?: Array<{
    speaker: string;
    message: string;
    timestamp: Date;
    confidence?: number;
  }>;
  currentSpeaker?: string;
  meetingContext?: {
    title?: string;
    agenda?: string[];
    participants?: string[];
    duration?: number;
  };
  userPreferences?: {
    responseStyle?: 'formal' | 'casual' | 'technical';
    maxResponseLength?: number;
    includeEmotions?: boolean;
  };
  systemState?: {
    inputGated?: boolean;
    audioPlaying?: boolean;
    processingQueue?: number;
  };
}

export interface FragmentContext {
  speakerId: string;
  confidence: number;
  audioQuality?: number;
  backgroundNoise?: number;
  speechRate?: number;
  previousFragments?: string[];
  contextualClues?: string[];
  emotionalTone?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'confused';
}

// Custom Rule Interfaces
export interface RuleCondition {
  type: 'speaker' | 'keyword' | 'time' | 'sentiment' | 'duration' | 'participant_count';
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals' | 'regex';
  value: string | number | boolean;
  caseSensitive?: boolean;
  weight?: number; // For scoring
}

export interface RuleAction {
  type: 'block' | 'modify' | 'redirect' | 'notify' | 'log' | 'prioritize';
  parameters?: {
    message?: string;
    redirectTo?: string;
    modifyWith?: string;
    priority?: number;
    logLevel?: 'info' | 'warn' | 'error';
  };
}

export interface CustomRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  metadata?: {
    category?: string;
    tags?: string[];
    usageCount?: number;
    lastTriggered?: Date;
  };
}

// Performance & Monitoring Interfaces
export interface PerformanceMetrics {
  processingTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkLatency?: number;
  errorRate?: number;
  throughput?: number;
  queueLength?: number;
  cacheHitRate?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime?: number;
  lastChecked: Date;
  services?: {
    database?: 'healthy' | 'degraded' | 'down';
    storage?: 'healthy' | 'degraded' | 'down';
    ai?: 'healthy' | 'degraded' | 'down';
    audio?: 'healthy' | 'degraded' | 'down';
  };
  metrics?: PerformanceMetrics;
  alerts?: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}