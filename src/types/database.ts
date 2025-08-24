/**
 * Database types for the new Firestore schema
 * Matches the structure defined in firestoredb.txt
 */

import { AIModel } from './index';

// ============================================
// VOICE LIBRARY
// ============================================

export interface VoiceLibraryEntry {
  deepgramVoiceId: string;           // Document ID
  userId?: string | null;            // null until confirmed
  userName?: string | null;           // Display name for this voice
  confirmed: boolean;                 // Whether identity is confirmed
  confidence: number;                 // 0-1 confidence score
  firstHeard: Date;
  lastHeard: Date;
  meetingsCount: number;
  totalSpeakingTime: number;         // in seconds
  audioSamples: AudioSample[];       // Keep 3-5 best samples
  identificationHistory: IdentificationRecord[]; // How voice was identified
}

// ============================================
// MEETING TYPES
// ============================================

export interface MeetingTypeConfig {
  id?: string;                       // Document ID
  name: string;                      // e.g., "Daily Standup", "Client Review"
  ownerId: string;                   // User who created this type
  regularParticipants: string[];     // Expected userIds (max ~5)
  systemPrompt: string;              // AI behavior for this meeting type
  contextRules: string;              // Simple text rules/context
  files: string[];                   // Document URLs or empty array
  aiSettings: {
    enableTranscription: boolean;
    enableSummaries: boolean;
    summaryStyle: 'bullets' | 'narrative' | 'action-items';
    autoIdentifySpeakers: boolean;
  };
  defaultModel: AIModel;
  modelOverrides: Record<string, {   // User-specific preferences
    preferredModel: string;
    lastUsed: Date;
  }>;
  modelSpecificPrompts: {            // Different prompts per model
    'gpt-4o'?: string;
    'gpt-4o-mini'?: string;
    'gpt-5'?: string;
    'gpt-5-mini'?: string;
    'gpt-5-nano'?: string;
    'claude-3-5-sonnet'?: string;
    'claude-3-5-opus'?: string;
    'claude-3-7-sonnet'?: string;
    'claude-3-7-opus'?: string;
  };
  modelCompatibility: ModelCompatibility; // Track what works best
  createdAt: Date;
}

// ============================================
// MEETINGS (Updated)
// ============================================

export interface MeetingParticipant {
  deepgramVoiceId: string;
  userId?: string | null;           // null if unidentified
  name: string;                      // "John" or "Unknown Speaker 1"
  confirmed: boolean;
  confidence: number;                // 0-1
  joinTime: Date;
  lastActiveTime: Date;
  totalSpoken: number;               // seconds
  wordCount: number;
}

export interface MeetingUpdate {
  meetingTypeId: string;
  hostId: string;                    // Meeting organizer
  participantIds: string[];          // All userIds who participated (for access control)
  title: string;
  date: Date;
  duration?: number;                 // in minutes
  status: 'scheduled' | 'active' | 'ended' | 'processed';
  aiModelHistory: AIModelHistory[];  // Track model changes
  currentModel: string;              // Active model for this meeting
  modelContext?: ModelContext;       // Preserve context across model switches
  participants: Record<string, MeetingParticipant>; // Keyed by deepgramVoiceId
  notes?: string;                   // AI-generated summary/notes in markdown
  keyPoints?: string[];              // Max 10 bullet points
  actionItems?: ActionItem[];        // Meeting action items
  transcript: TranscriptEntry[];     // Full transcript
}

// ============================================
// NEEDS IDENTIFICATION
// ============================================

export interface NeedsIdentification {
  id?: string;                       // Document ID: {meetingId}_{deepgramVoiceId}
  meetingId: string;
  meetingTitle: string;
  meetingDate: Date;
  meetingTypeId: string;
  hostId: string;                    // Who to notify for review
  deepgramVoiceId: string;           // Primary voice identifier (consistent naming)
  voiceId: string;                   // Alias for deepgramVoiceId (for backward compatibility)
  speakerLabel: string;              // Current label (e.g., "Unknown Speaker 2")
  sampleTranscripts: SampleTranscript[]; // 2-3 clear examples
  audioUrl: string;                  // Best quality clip
  suggestedMatches?: SuggestedMatch[]; // AI suggestions
  status: 'pending' | 'identified' | 'skipped';
  resolvedUserId?: string;           // Set when status is 'identified'
  resolvedUserName?: string;         // Set when status is 'identified'
  resolvedAt?: Date;                 // When it was resolved
  createdAt: Date;
}

// ============================================
// VOICE MATCHES (Cache)
// ============================================

export interface VoiceMatch {
  deepgramVoiceId: string;           // Document ID
  confirmedUserId?: string | null;
  lastUpdated: Date;
  meetingHistory: MeetingHistoryEntry[]; // Last 10 meetings
}

// ============================================
// USERS (Updated)
// ============================================

export interface UserUpdate {
  email: string;
  displayName: string;
  createdAt: Date;
  isAdmin: boolean;                  // Admin flag for access control
  primaryVoiceId?: string | null;    // Links to voice_library
  settings: {
    ttsSpeed: number;
    llmModel: string;
    maxResponseTokens: number;
    preferredLanguage: string;
    timezone: string;
  };
}

// ============================================
// MEETING ANALYTICS & PERFORMANCE TRACKING
// ============================================

export interface ModelPerformanceHistory {
  model: string;
  avgResponseTime: number;
  successRate: number;
  userSatisfaction: number;
}

export interface ModelCompatibility {
  recommendedModel: string;
  performanceHistory: ModelPerformanceHistory[];
}

export interface AIModelHistory {
  model: string;                     // e.g., "gpt-4", "claude-3"
  switchedAt: Date;
  switchedBy: string;                // userId
  reason?: string | null;            // Optional reason for switch
  transcriptIndex: number;           // Where in transcript the switch occurred
}

export interface ModelContext {
  summary: string;                   // What's been discussed so far
  speakers: object;                  // Speaker identification up to this point
  topics: string[];                  // Key topics covered
  lastPrompt: string;                // Last system prompt used
}

// ============================================
// ENHANCED TRANSCRIPT TYPES
// ============================================

export interface TranscriptEntry {
  voiceId: string;                   // deepgramVoiceId
  speakerName: string;               // Display name at time of meeting
  text: string;
  timestamp: Date;
  confidence: number;                // Transcription confidence
}

export interface ActionItem {
  text: string;
  assignedTo?: string | null;        // userId or name
  dueDate?: Date | null;
  completed: boolean;
}

// ============================================
// IDENTIFICATION SYSTEM
// ============================================

export interface AudioSample {
  url: string;                       // Firebase Storage URL
  transcript: string;                // What was said
  quality: number;                   // Audio quality score
  duration: number;                  // Length in seconds
  timestamp: Date;
}

export interface IdentificationRecord {
  method: 'self' | 'mentioned' | 'manual' | 'pattern';
  timestamp: Date;
  meetingId: string;
  confidence: number;
  details: string;                   // e.g., "User confirmed post-meeting"
}

export interface SuggestedMatch {
  userId: string;
  userName: string;
  confidence: number;
  reason: string;                    // Why AI thinks this
}

export interface SampleTranscript {
  text: string;
  timestamp: Date;
}

// ============================================
// MEETING HISTORY TRACKING
// ============================================

export interface MeetingHistoryEntry {
  meetingId: string;
  confidence: number;
  date: Date;
}