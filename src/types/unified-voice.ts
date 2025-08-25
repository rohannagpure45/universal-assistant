/**
 * Unified Voice Sample Types
 * 
 * CRITICAL: This file attempts to unify the competing type systems:
 * - AudioSample from database.ts (6 properties)
 * - VoiceSample from voice-identification.ts (6 interfaces with 30+ properties)
 * 
 * PROBLEM: These types are fundamentally incompatible. Components expect
 * different shapes depending on their import source.
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * The actual shape of data from Firebase
 * This is what VoiceLibraryService.convertFromFirestore returns
 */
export interface FirebaseVoiceSample {
  // Core properties that always exist
  url: string;
  transcript: string;
  quality: number;
  duration: number;
  timestamp: Date | Timestamp | { toDate(): Date };
  
  // Properties that sometimes exist in Firebase
  id?: string;
  deepgramVoiceId?: string;
  meetingId?: string;
  speakerId?: string;
  confidence?: number;
  filePath?: string;
  
  // Properties components add at runtime
  isStarred?: boolean;
  isActive?: boolean;
  selected?: boolean;
  qualityLevel?: string;
  
  // Metadata that may or may not exist
  metadata?: {
    deepgramVoiceId: string;
    meetingId: string;
    duration: number;
    quality?: number;
    transcript?: string;
    uploadedAt: string;
    filePath?: string;
  };
}

/**
 * ATTEMPT at unified type - but this is a lie
 * Components using VoiceSample expect 30+ properties
 * Components using AudioSample expect 6 properties
 */
export interface UnifiedVoiceSample {
  // Required (but often missing from Firebase)
  id: string;
  url: string;
  transcript: string;
  quality: number;
  duration: number;
  timestamp: Date;
  
  // Optional (but components assume they exist)
  speakerId?: string;
  meetingId?: string;
  source?: 'live-recording' | 'file-upload' | 'meeting-extract' | 'training-session' | 'upload' | 'meeting' | 'training';
  confidence?: number;
  qualityLevel?: 'poor' | 'fair' | 'good' | 'excellent' | 'low' | 'medium' | 'high';
  qualityAssessment?: any; // Circular dependency if we import VoiceQualityAssessment
  isStarred?: boolean;
  isActive?: boolean;
  selected?: boolean;
  filePath?: string;
  blob?: Blob;
  metadata?: any; // VoiceSampleStorageMetadata creates circular dependency
  tags?: string[];
  notes?: string;
  method?: 'self-recording' | 'upload' | 'meeting-clips';
}

/**
 * Type aliases for migration - THIS WILL BREAK THINGS
 * 
 * WARNING: AudioSample in database.ts has 6 properties
 * WARNING: VoiceSample in voice-identification.ts has 30+ properties
 * WARNING: These are NOT compatible
 */
export type VoiceSample = UnifiedVoiceSample;
export type AudioSample = UnifiedVoiceSample;

/**
 * REALITY CHECK: This unification is impossible without breaking changes
 * - 28 files import VoiceSample expecting complex type
 * - VoiceLibraryEntry uses AudioSample[] expecting simple type
 * - Firebase returns neither - it returns partial data
 */