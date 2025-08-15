# Firebase Setup Guide for Universal Assistant

> **Note**: This file contains detailed Firebase configuration and should not be committed to git.

## Table of Contents
1. [Firebase Storage Layout Setup](#firebase-storage-layout-setup)
2. [Firestore Database Structure](#firestore-database-structure)
3. [Security Rules](#security-rules)
4. [Helper Functions](#helper-functions)
5. [Environment Configuration](#environment-configuration)
6. [Initial Setup Steps](#initial-setup-steps)

---

# Firebase Storage Layout Setup

## 1. Storage Bucket Structure

Based on your Universal Assistant architecture, here's the recommended Firebase Storage layout:

```
your-project-id.appspot.com/
├── tts-cache/                          # TTS audio cache (7-day expiration)
│   └── {sha256-hash}.mp3              # Cached TTS audio files
├── voice-samples/                      # User voice samples for profiles
│   └── {userId}/
│       └── {profileId}/
│           ├── sample.mp3             # Voice sample audio
│           ├── sample.wav             # Alternative format
│           └── metadata.json          # Sample metadata
├── meeting-recordings/                 # Meeting audio recordings
│   └── {meetingId}/
│       ├── full-recording.mp3         # Complete meeting audio
│       ├── segments/                  # Audio segments
│       │   ├── segment_001.mp3
│       │   └── segment_002.mp3
│       └── transcripts/               # Transcript exports
│           ├── transcript.txt
│           └── transcript.srt
├── user-uploads/                       # User-uploaded files
│   └── {userId}/
│       ├── avatars/
│       │   └── avatar.jpg            # Profile pictures
│       ├── documents/                 # Meeting materials
│       │   ├── {meetingId}/
│       │   │   ├── agenda.pdf
│       │   │   └── presentation.pptx
│       └── audio-clips/              # Custom audio clips
│           └── {clipId}.mp3
├── exports/                           # Generated exports
│   └── {userId}/
│       ├── meeting-summaries/
│       │   └── {meetingId}/
│       │       ├── summary.pdf
│       │       ├── action-items.json
│       │       └── transcript.docx
│       └── analytics/
│           ├── monthly-report.pdf
│           └── usage-stats.json
└── system/                           # System files
    ├── voice-models/                 # AI voice model files
    │   └── {modelId}.bin
    ├── templates/                    # Document templates
    │   ├── meeting-summary.html
    │   └── transcript.html
    └── backups/                      # System backups
        └── {timestamp}/
            └── config.json
```

## 2. Storage Security Rules

Create these security rules in Firebase Console:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // TTS Cache - Read-only for authenticated users
    match /tts-cache/{cacheFile} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
    
    // Voice Samples - User owns their profiles
    match /voice-samples/{userId}/{profileId}/{file} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Meeting Recordings - User owns their meetings
    match /meeting-recordings/{meetingId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        resource.metadata.ownerId == request.auth.uid;
    }
    
    // User Uploads - User owns their files
    match /user-uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Exports - User owns their exports
    match /exports/{userId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only server can write exports
    }
    
    // System files - Admin only
    match /system/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only server/admin can write
    }
  }
}
```

## 3. Storage Helper Functions

Create `/src/lib/firebase/storage.ts`:

```typescript
import { storage, adminStorage } from '@/lib/firebase/admin';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export class StorageService {
  // Upload voice sample
  static async uploadVoiceSample(
    userId: string, 
    profileId: string, 
    audioFile: Buffer,
    mimeType: string
  ): Promise<string> {
    const fileName = `voice-samples/${userId}/${profileId}/sample.${mimeType.split('/')[1]}`;
    const file = adminStorage.bucket().file(fileName);
    
    await file.save(audioFile, {
      metadata: {
        contentType: mimeType,
        metadata: { userId, profileId, uploadedAt: new Date().toISOString() }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return url;
  }
  
  // Upload meeting recording
  static async uploadMeetingRecording(
    meetingId: string,
    audioFile: Buffer,
    ownerId: string
  ): Promise<string> {
    const fileName = `meeting-recordings/${meetingId}/full-recording.mp3`;
    const file = adminStorage.bucket().file(fileName);
    
    await file.save(audioFile, {
      metadata: {
        contentType: 'audio/mpeg',
        metadata: { meetingId, ownerId, recordedAt: new Date().toISOString() }
      }
    });
    
    return fileName;
  }
  
  // Clean up expired TTS cache
  static async cleanupTTSCache(): Promise<void> {
    const [files] = await adminStorage.bucket().getFiles({
      prefix: 'tts-cache/',
    });
    
    const now = new Date();
    const expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const created = new Date(metadata.timeCreated);
      
      if (now.getTime() - created.getTime() > expirationMs) {
        await file.delete().catch(console.error);
      }
    }
  }
  
  // Upload user avatar
  static async uploadUserAvatar(
    userId: string,
    imageFile: Buffer,
    mimeType: string
  ): Promise<string> {
    const extension = mimeType.split('/')[1];
    const fileName = `user-uploads/${userId}/avatars/avatar.${extension}`;
    const file = adminStorage.bucket().file(fileName);
    
    await file.save(imageFile, {
      metadata: {
        contentType: mimeType,
        metadata: { userId, type: 'avatar', uploadedAt: new Date().toISOString() }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
    });
    
    return url;
  }
  
  // Upload meeting document
  static async uploadMeetingDocument(
    userId: string,
    meetingId: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const filePath = `user-uploads/${userId}/documents/${meetingId}/${fileName}`;
    const file = adminStorage.bucket().file(filePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: { 
          userId, 
          meetingId, 
          originalName: fileName,
          uploadedAt: new Date().toISOString() 
        }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    return url;
  }
  
  // Generate meeting export
  static async generateMeetingExport(
    userId: string,
    meetingId: string,
    exportType: 'summary' | 'transcript' | 'analytics',
    content: Buffer,
    format: 'pdf' | 'docx' | 'json'
  ): Promise<string> {
    const fileName = `exports/${userId}/meeting-summaries/${meetingId}/${exportType}.${format}`;
    const file = adminStorage.bucket().file(fileName);
    
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      json: 'application/json'
    };
    
    await file.save(content, {
      metadata: {
        contentType: mimeTypes[format],
        metadata: { 
          userId, 
          meetingId, 
          exportType,
          generatedAt: new Date().toISOString() 
        }
      }
    });
    
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return url;
  }
}
```

---

# Firestore Database Structure

## 1. Database Collections Structure

```
your-project-id (Firestore Database)
├── users/                                    # User profiles and settings
│   └── {userId}/                            # Document per user
│       ├── profile: {                       # User profile data
│       │   email: string,
│       │   displayName: string,
│       │   avatar: string,
│       │   createdAt: timestamp,
│       │   lastLoginAt: timestamp,
│       │   preferences: {
│       │     language: string,
│       │     timezone: string,
│       │     theme: string,
│       │     notifications: boolean
│       │   }
│       │ }
│       ├── voiceProfiles/                   # Subcollection: Voice profiles
│       │   └── {profileId}/                 # Document per voice profile
│       │       ├── name: string,
│       │       ├── voiceId: string,         # ElevenLabs voice ID
│       │       ├── voiceSettings: object,
│       │       ├── isDefault: boolean,
│       │       ├── createdAt: timestamp,
│       │       └── metadata: object
│       ├── meetings/                        # Subcollection: User's meetings
│       │   └── {meetingId}/                 # Document per meeting
│       │       ├── title: string,
│       │       ├── type: string,            # Type from MeetingType enum
│       │       ├── participants: array,
│       │       ├── startTime: timestamp,
│       │       ├── endTime: timestamp,
│       │       ├── status: string,
│       │       ├── settings: object,
│       │       └── summary: string
│       ├── customRules/                     # Subcollection: Custom conversation ules
│       │   └── {ruleId}/                    # Document per rule
│       │       ├── name: string,
│       │       ├── conditions: array,
│       │       ├── actions: array,
│       │       ├── priority: number,
│       │       ├── isActive: boolean,
│       │       └── createdAt: timestamp
│       └── analytics/                       # Subcollection: User analytics
│           └── {period}/                    # Document per time period
│               ├── totalMeetings: number,
│               ├── totalDuration: number,
│               ├── averageParticipants: number,
│               ├── topMeetingTypes: array,
│               └── period: string
│
├── meetings/                                # Global meetings collection
│   └── {meetingId}/                        # Document per meeting
│       ├── title: string,
│       ├── organizerId: string,             # Reference to users/{userId}
│       ├── participants: array of {
│       │   userId: string,
│       │   role: string,                    # organizer, participant, observer
│       │   joinedAt: timestamp,
│       │   leftAt?: timestamp
│       │ },
│       ├── type: string,                    # MeetingType enum value
│       ├── startTime: timestamp,
│       ├── endTime?: timestamp,
│       ├── status: string,                  # scheduled, active, completed, cancelled
│       ├── settings: {
│       │   enableRecording: boolean,
│       │   enableTranscription: boolean,
│       │   enableAI: boolean,
│       │   language: string,
│       │   maxParticipants: number
│       │ },
│       ├── metadata: {
│       │   tags: array,
│       │   department: string,
│       │   project: string,
│       │   confidentiality: string
│       │ },
│       ├── transcripts/                     # Subcollection: Meeting transcripts
│       │   └── entries/                     # Subcollection: Transcript entries
│       │       └── {entryId}/               # Document per transcript entry
│       │           ├── text: string,
│       │           ├── speakerId: string,
│       │           ├── confidence: number,
│       │           ├── timestamp: timestamp,
│       │           ├── duration: number,
│       │           └── metadata: object
│       ├── speakers/                        # Subcollection: Speaker profiles
│       │   └── {speakerId}/                 # Document per speaker
│       │       ├── name: string,
│       │       ├── userId?: string,         # Link to users if identified
│       │       ├── voiceProfile: object,
│       │       ├── statistics: {
│       │         totalSpeakTime: number,
│       │         averageConfidence: number,
│       │         wordCount: number
│       │       },
│       │       └── firstDetected: timestamp
│       ├── aiResponses/                     # Subcollection: AI responses
│       │   └── {responseId}/                # Document per AI response
│       │       ├── prompt: string,
│       │       ├── response: string,
│       │       ├── model: string,
│       │       ├── timestamp: timestamp,
│       │       ├── context: object,
│       │       └── metadata: object
│       ├── notes/                           # Subcollection: Meeting notes
│       │   └── {noteId}/                    # Document per note
│       │       ├── content: string,
│       │       ├── authorId: string,
│       │       ├── type: string,            # manual, ai-generated, action-item
│       │       ├── tags: array,
│       │       ├── timestamp: timestamp,
│       │       └── isPublic: boolean
│       └── analytics/                       # Subcollection: Meeting analytics
│           ├── speaking-time/               # Document: Speaking time analysis
│           │   ├── totalDuration: number,
│           │   ├── speakers: object,        # speakerId -> duration mapping
│           │   └── calculatedAt: timestamp
│           ├── sentiment/                   # Document: Sentiment analysis
│           │   ├── overall: string,
│           │   ├── timeline: array,
│           │   └── speakers: object
│           └── topics/                      # Document: Topic analysis
│               ├── mainTopics: array,
│               ├── keywords: array,
│               └── categories: array
│
├── voiceProfiles/                          # Global voice profiles
│   └── {profileId}/                        # Document per voice profile
│       ├── name: string,
│       ├── ownerId: string,                # Reference to users/{userId}
│       ├── voiceId: string,                # ElevenLabs voice ID
│       ├── voiceSettings: {
│       │   stability: number,
│       │   similarityBoost: number,
│       │   speed: number,
│       │   pitch?: number
│       │ },
│       ├── embedding: array,               # Voice embedding for recognition
│       ├── isPublic: boolean,
│       ├── isDefault: boolean,
│       ├── metadata: {
│       │   language: string,
│       │   accent: string,
│       │   gender: string,
│       │   description: string
│       │ },
│       ├── sampleAudioUrl: string,
│       ├── createdAt: timestamp,
│       └── updatedAt: timestamp
│
├── customRules/                            # Global custom rules
│   └── {ruleId}/                          # Document per rule
│       ├── name: string,
│       ├── description: string,
│       ├── ownerId: string,               # Reference to users/{userId}
│       ├── conditions: array of {
│       │   field: string,
│       │   operator: string,
│       │   value: any,
│       │   logic?: string                  # AND, OR
│       │ },
│       ├── actions: array of {
│       │   type: string,                   # mute, respond, redirect, etc.
│       │   parameters: object
│       │ },
│       ├── priority: number,
│       ├── isActive: boolean,
│       ├── isPublic: boolean,
│       ├── usageCount: number,
│       ├── tags: array,
│       ├── createdAt: timestamp,
│       └── updatedAt: timestamp
│
├── systemConfig/                           # System configuration
│   ├── aiModels/                          # Document: AI model configurations
│   │   ├── models: array of {
│   │     id: string,
│   │     name: string,
│   │     provider: string,
│   │     capabilities: array,
│   │     pricing: object,
│   │     isActive: boolean
│   │   },
│   │   └── updatedAt: timestamp
│   ├── features/                          # Document: Feature flags
│   │   ├── voiceCloning: boolean,
│   │   ├── realtimeTranscription: boolean,
│   │   ├── aiSummaries: boolean,
│   │   └── updatedAt: timestamp
│   └── limits/                            # Document: System limits
│       ├── maxMeetingDuration: number,
│       ├── maxParticipants: number,
│       ├── maxStoragePerUser: number,
│       └── updatedAt: timestamp
│
├── analytics/                              # Global analytics
│   ├── daily/                             # Collection: Daily metrics
│   │   └── {date}/                        # Document per day (YYYY-MM-DD)
│   │       ├── totalUsers: number,
│   │       ├── totalMeetings: number,
│   │       ├── totalDuration: number,
│   │       ├── newUsers: number,
│   │       ├── activeUsers: number,
│   │       └── metrics: object
│   ├── weekly/                            # Collection: Weekly aggregates
│   │   └── {week}/                        # Document per week
│   └── monthly/                           # Collection: Monthly aggregates
│       └── {month}/                       # Document per month
│
└── cache/                                  # Temporary cache documents
    ├── ttsCache/                          # Collection: TTS cache metadata
    │   └── {cacheKey}/                    # Document per cache entry
    │       ├── text: string,
    │       ├── voiceId: string,
    │       ├── settings: object,
    │       ├── storageUrl: string,
    │       ├── size: number,
    │       ├── createdAt: timestamp,
    │       └── expiresAt: timestamp
    └── sessions/                          # Collection: User sessions
        └── {sessionId}/                   # Document per session
            ├── userId: string,
            ├── startTime: timestamp,
            ├── lastActivity: timestamp,
            ├── meetingId?: string,
            └── metadata: object
```

## 2. Firestore Security Rules

Create these security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User's voice profiles
      match /voiceProfiles/{profileId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's meetings
      match /meetings/{meetingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's custom rules
      match /customRules/{ruleId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // User's analytics (read-only)
      match /analytics/{period} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow write: if false; // Only server can write analytics
      }
    }
    
    // Global meetings - participants can read, organizer can write
    match /meetings/{meetingId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.organizerId ||
         request.auth.uid in resource.data.participants);
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.organizerId;
        
      // Meeting transcripts - participants can read
      match /transcripts/entries/{entryId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/meetings/$(meetingId)).data.participants;
        allow write: if false; // Only server can write transcripts
      }
      
      // Meeting speakers - participants can read
      match /speakers/{speakerId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/meetings/$(meetingId)).data.participants;
        allow write: if false; // Only server can write speaker data
      }
      
      // AI responses - participants can read
      match /aiResponses/{responseId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/meetings/$(meetingId)).data.participants;
        allow write: if false; // Only server can write AI responses
      }
      
      // Meeting notes - participants can read/write
      match /notes/{noteId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/meetings/$(meetingId)).data.participants;
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/meetings/$(meetingId)).data.participants;
        allow update: if request.auth != null && 
          request.auth.uid == resource.data.authorId;
      }
      
      // Meeting analytics - participants can read
      match /analytics/{analysisType} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/meetings/$(meetingId)).data.participants;
        allow write: if false; // Only server can write analytics
      }
    }
    
    // Global voice profiles - owner can read/write, others can read public ones
    match /voiceProfiles/{profileId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || resource.data.isPublic == true);
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
    
    // Custom rules - owner can read/write, others can read public ones
    match /customRules/{ruleId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.ownerId || resource.data.isPublic == true);
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
    
    // System config - read-only for authenticated users
    match /systemConfig/{configType} {
      allow read: if request.auth != null;
      allow write: if false; // Only admin/server can write
    }
    
    // Analytics - read-only for authenticated users
    match /analytics/{period}/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write analytics
    }
    
    // Cache - users can read relevant cache entries
    match /cache/ttsCache/{cacheKey} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write cache
    }
    
    match /cache/sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 3. Database Helper Functions

Create `/src/lib/firebase/firestore.ts`:

```typescript
import { adminDb } from '@/lib/firebase/admin';
import type { VoiceProfile } from '@/services/universal-assistant/VoiceProfileService';

export interface UserProfile {
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
  preferences: {
    language: string;
    timezone: string;
    theme: string;
    notifications: boolean;
  };
}

export interface Meeting {
  title: string;
  organizerId: string;
  participants: Array<{
    userId: string;
    role: 'organizer' | 'participant' | 'observer';
    joinedAt: Date;
    leftAt?: Date;
  }>;
  type: string;
  startTime: Date;
  endTime?: Date;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  settings: {
    enableRecording: boolean;
    enableTranscription: boolean;
    enableAI: boolean;
    language: string;
    maxParticipants: number;
  };
  metadata: {
    tags: string[];
    department?: string;
    project?: string;
    confidentiality: 'public' | 'internal' | 'confidential';
  };
}

export interface TranscriptEntry {
  text: string;
  speakerId: string;
  confidence: number;
  timestamp: Date;
  duration: number;
  metadata: Record<string, any>;
}

export interface SpeakerProfile {
  name: string;
  userId?: string;
  voiceProfile: Record<string, any>;
  statistics: {
    totalSpeakTime: number;
    averageConfidence: number;
    wordCount: number;
  };
  firstDetected: Date;
}

export interface MeetingNote {
  content: string;
  authorId: string;
  type: 'manual' | 'ai-generated' | 'action-item';
  tags: string[];
  timestamp: Date;
  isPublic: boolean;
}

export class FirestoreService {
  // User Management
  static async createUserProfile(userId: string, userData: Omit<UserProfile, 'createdAt' | 'lastLoginAt'>): Promise<void> {
    await adminDb.collection('users').doc(userId).set({
      ...userData,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
  }
  
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const doc = await adminDb.collection('users').doc(userId).get();
    return doc.exists ? doc.data() as UserProfile : null;
  }
  
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await adminDb.collection('users').doc(userId).update({
      ...updates,
      lastLoginAt: new Date(),
    });
  }
  
  // Meeting Management
  static async createMeeting(meetingData: Omit<Meeting, 'createdAt' | 'status'>): Promise<string> {
    const meetingRef = await adminDb.collection('meetings').add({
      ...meetingData,
      createdAt: new Date(),
      status: 'scheduled',
    });
    return meetingRef.id;
  }
  
  static async getMeeting(meetingId: string): Promise<Meeting | null> {
    const doc = await adminDb.collection('meetings').doc(meetingId).get();
    return doc.exists ? doc.data() as Meeting : null;
  }
  
  static async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<void> {
    await adminDb.collection('meetings').doc(meetingId).update({
      status,
      updatedAt: new Date(),
    });
  }
  
  static async getUserMeetings(userId: string, limit: number = 20): Promise<Meeting[]> {
    const snapshot = await adminDb
      .collection('meetings')
      .where('participants', 'array-contains', userId)
      .orderBy('startTime', 'desc')
      .limit(limit)
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Meeting[];
  }
  
  // Transcript Management
  static async addTranscriptEntry(
    meetingId: string, 
    entryData: Omit<TranscriptEntry, 'timestamp'>
  ): Promise<string> {
    const entryRef = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('transcripts')
      .collection('entries')
      .add({
        ...entryData,
        timestamp: new Date(),
      });
    return entryRef.id;
  }
  
  static async getTranscriptEntries(
    meetingId: string, 
    startTime?: Date, 
    endTime?: Date
  ): Promise<TranscriptEntry[]> {
    let query = adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('transcripts')
      .collection('entries')
      .orderBy('timestamp', 'asc');
    
    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }
    
    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as TranscriptEntry[];
  }
  
  // Speaker Management
  static async addSpeaker(
    meetingId: string, 
    speakerId: string, 
    speakerData: Omit<SpeakerProfile, 'firstDetected'>
  ): Promise<void> {
    await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('speakers')
      .doc(speakerId)
      .set({
        ...speakerData,
        firstDetected: new Date(),
      });
  }
  
  static async updateSpeakerStatistics(
    meetingId: string, 
    speakerId: string, 
    statistics: Partial<SpeakerProfile['statistics']>
  ): Promise<void> {
    await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('speakers')
      .doc(speakerId)
      .update({
        statistics,
        updatedAt: new Date(),
      });
  }
  
  // Voice Profile Management
  static async getUserVoiceProfiles(userId: string): Promise<VoiceProfile[]> {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as VoiceProfile[];
  }
  
  static async createVoiceProfile(
    userId: string, 
    profileData: Omit<VoiceProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const profileRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('voiceProfiles')
      .add({
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return profileRef.id;
  }
  
  // Meeting Notes
  static async addMeetingNote(
    meetingId: string, 
    noteData: Omit<MeetingNote, 'timestamp'>
  ): Promise<string> {
    const noteRef = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('notes')
      .add({
        ...noteData,
        timestamp: new Date(),
      });
    return noteRef.id;
  }
  
  static async getMeetingNotes(meetingId: string): Promise<MeetingNote[]> {
    const snapshot = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('notes')
      .orderBy('timestamp', 'desc')
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as MeetingNote[];
  }
  
  // Analytics
  static async updateMeetingAnalytics(
    meetingId: string, 
    analysisType: 'speaking-time' | 'sentiment' | 'topics',
    analytics: Record<string, any>
  ): Promise<void> {
    await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('analytics')
      .doc(analysisType)
      .set({
        ...analytics,
        calculatedAt: new Date(),
      });
  }
  
  static async getMeetingAnalytics(
    meetingId: string, 
    analysisType: 'speaking-time' | 'sentiment' | 'topics'
  ): Promise<Record<string, any> | null> {
    const doc = await adminDb
      .collection('meetings')
      .doc(meetingId)
      .collection('analytics')
      .doc(analysisType)
      .get();
    
    return doc.exists ? doc.data() || null : null;
  }
  
  // Cache Management
  static async cacheTTSEntry(
    cacheKey: string,
    metadata: {
      text: string;
      voiceId: string;
      settings: Record<string, any>;
      storageUrl: string;
      size: number;
    }
  ): Promise<void> {
    await adminDb.collection('cache').collection('ttsCache').doc(cacheKey).set({
      ...metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  }
  
  static async getTTSCacheEntry(cacheKey: string): Promise<any | null> {
    const doc = await adminDb.collection('cache').collection('ttsCache').doc(cacheKey).get();
    return doc.exists ? doc.data() : null;
  }
  
  // System Configuration
  static async getSystemConfig(configType: 'aiModels' | 'features' | 'limits'): Promise<any | null> {
    const doc = await adminDb.collection('systemConfig').doc(configType).get();
    return doc.exists ? doc.data() : null;
  }
  
  static async updateSystemConfig(
    configType: 'aiModels' | 'features' | 'limits',
    config: Record<string, any>
  ): Promise<void> {
    await adminDb.collection('systemConfig').doc(configType).set({
      ...config,
      updatedAt: new Date(),
    });
  }
  
  // Analytics Aggregation
  static async updateDailyAnalytics(
    date: string, // YYYY-MM-DD format
    metrics: {
      totalUsers: number;
      totalMeetings: number;
      totalDuration: number;
      newUsers: number;
      activeUsers: number;
    }
  ): Promise<void> {
    await adminDb.collection('analytics').collection('daily').doc(date).set({
      ...metrics,
      date,
      updatedAt: new Date(),
    });
  }
  
  // Batch Operations
  static async batchUpdateSpeakerStats(
    meetingId: string,
    speakerUpdates: Array<{
      speakerId: string;
      statistics: Partial<SpeakerProfile['statistics']>;
    }>
  ): Promise<void> {
    const batch = adminDb.batch();
    
    speakerUpdates.forEach(({ speakerId, statistics }) => {
      const speakerRef = adminDb
        .collection('meetings')
        .doc(meetingId)
        .collection('speakers')
        .doc(speakerId);
      
      batch.update(speakerRef, {
        statistics,
        updatedAt: new Date(),
      });
    });
    
    await batch.commit();
  }
  
  // Cleanup Operations
  static async cleanupExpiredCache(): Promise<number> {
    const now = new Date();
    const expiredSnapshot = await adminDb
      .collection('cache')
      .collection('ttsCache')
      .where('expiresAt', '<', now)
      .get();
    
    const batch = adminDb.batch();
    expiredSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return expiredSnapshot.size;
  }
}
```

---

# Environment Configuration

## Environment Variables Setup

Add these to your `.env.local` (create if it doesn't exist):

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----\n"

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Environment Variables for Production

For production deployment, set these same variables in your hosting platform:

### Vercel
```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add FIREBASE_ADMIN_PROJECT_ID
vercel env add FIREBASE_ADMIN_CLIENT_EMAIL
vercel env add FIREBASE_ADMIN_PRIVATE_KEY
vercel env add ELEVENLABS_API_KEY
vercel env add DEEPGRAM_API_KEY
vercel env add OPENAI_API_KEY
vercel env add ANTHROPIC_API_KEY
```

### Netlify
Add through the Netlify dashboard or CLI:
```bash
netlify env:set NEXT_PUBLIC_FIREBASE_API_KEY "your_value"
# ... repeat for all variables
```

---

# Initial Setup Steps

## 1. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project or use existing
   - Enable Authentication, Firestore, and Storage

2. **Enable Authentication**
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google (optional)
   - Configure authorized domains

3. **Setup Firestore Database**
   - Go to Firestore Database
   - Create database (start in test mode)
   - Apply security rules from above

4. **Setup Storage**
   - Go to Storage
   - Create default bucket
   - Apply storage rules from above

5. **Generate Service Account**
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Download JSON and extract values for environment variables

## 2. Initial Data Setup

Run these commands to set up initial system configuration:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init firestore storage

# Deploy security rules
firebase deploy --only firestore:rules,storage
```

## 3. Run Database Setup Scripts

### A. Create Initial System Configuration

Run the setup script to create AI models, features, and system limits:

```bash
node scripts/setup-firebase.js
```

This script creates:
- **AI Models Configuration** with all 10 current models (gpt-4o, claude-3-5-sonnet, etc.)
- **Feature Flags** for all Universal Assistant features
- **System Limits** for meetings, storage, and performance
- **Voice Settings** defaults and meeting types

### B. Create Firestore Collections and Sample Data

#### Option 1: Automated Setup (Recommended)

Run the collections setup script to create the complete database structure:

```bash
node scripts/setup-firestore-collections.js
```

#### Option 2: Manual Collection Creation

Generate Firebase Console links for manual collection creation:

```bash
node scripts/generate-collection-links.js
```

This script provides:
- **Direct links** to Firebase Console for each collection
- **Sample document templates** for proper data structure
- **Step-by-step instructions** for manual setup
- **Subcollection creation links** for hierarchical data

This script creates:
- **Complete collection structure** with all required collections and subcollections
- **Sample documents** to demonstrate the data schema
- **User profiles** with voice profiles and custom rules
- **Meeting data** with transcripts, speakers, AI responses, and analytics
- **Analytics data** (daily/weekly/monthly)
- **Cache collections** for TTS and sessions

**Created Collections:**
- `users/` with subcollections: `voiceProfiles/`, `customRules/`
- `meetings/` with subcollections: `transcripts/`, `speakers/`, `aiResponses/`, `notes/`, `analytics/`
- `voiceProfiles/` - Global voice profiles
- `customRules/` - Global custom rules  
- `dailyAnalytics/`, `weeklyAnalytics/`, `monthlyAnalytics/` - Analytics data
- `ttsCache/`, `sessions/` - Cache and session data
- `systemConfig/` - System configuration

### C. Original Setup Config Code (Reference)

For reference, here's the original setup configuration:

```javascript
const { adminDb } = require('../src/lib/firebase/admin');

async function setupInitialConfig() {
  try {
    // Setup AI Models Configuration
    await adminDb.collection('systemConfig').doc('aiModels').set({
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation'],
          pricing: { inputTokens: 0.03, outputTokens: 0.06 },
          isActive: true
        },
        {
          id: 'claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          capabilities: ['text-generation', 'conversation', 'analysis'],
          pricing: { inputTokens: 0.003, outputTokens: 0.015 },
          isActive: true
        }
      ],
      updatedAt: new Date()
    });

    // Setup Feature Flags
    await adminDb.collection('systemConfig').doc('features').set({
      voiceCloning: true,
      realtimeTranscription: true,
      aiSummaries: true,
      advancedAnalytics: true,
      multiLanguageSupport: true,
      updatedAt: new Date()
    });

    // Setup System Limits
    await adminDb.collection('systemConfig').doc('limits').set({
      maxMeetingDuration: 180, // 3 hours in minutes
      maxParticipants: 50,
      maxStoragePerUser: 5368709120, // 5GB in bytes
      maxVoiceProfiles: 10,
      maxCustomRules: 25,
      updatedAt: new Date()
    });

    console.log('✅ Initial system configuration created');
  } catch (error) {
    console.error('❌ Error setting up initial config:', error);
  }
}

setupInitialConfig();
```

## 4. Test Firebase Connection

Run the test script to verify all Firebase services are working:

```bash
node scripts/test-firebase.js
```

This script will test:
- **Firestore** connection and document operations
- **Storage** bucket access
- **Authentication** service availability  
- **System configuration** verification

For reference, here's the test script code (`scripts/test-firebase.js`):

```javascript
const { adminDb, adminStorage, adminAuth } = require('../src/lib/firebase/admin');

async function testFirebaseConnection() {
  try {
    // Test Firestore
    await adminDb.collection('test').doc('connection').set({
      timestamp: new Date(),
      status: 'connected'
    });
    console.log('✅ Firestore connection successful');

    // Test Storage
    const [buckets] = await adminStorage.getBuckets();
    console.log('✅ Storage connection successful');

    // Test Auth
    const userRecord = await adminAuth.getUserByEmail('test@example.com').catch(() => null);
    console.log('✅ Auth connection successful');

    // Cleanup
    await adminDb.collection('test').doc('connection').delete();
    
    console.log('🎉 All Firebase services connected successfully!');
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
  }
}

testFirebaseConnection();
```

## 5. Database Indexes

### A. Generate Index Creation Links

Run the index generation script to get the exact links for creating required indexes:

```bash
node scripts/generate-index-links.js
```

This script will:
- **Run sample queries** that require composite indexes
- **Generate Firebase Console links** for creating each required index
- **Show you exactly which indexes are needed** for optimal performance

### B. Manual Index Creation

If the generated links don't work, follow the manual guide:

```bash
# View the manual index creation guide
cat firebase-indexes-guide.md
```

### C. Required Indexes Reference

Create these Firestore indexes for optimal performance:

```javascript
// Create these indexes in Firebase Console > Firestore > Indexes

// Meetings by user and time
meetings: [
  { fields: ['organizerId', 'startTime'], order: 'descending' },
  { fields: ['participants', 'startTime'], order: 'descending' },
  { fields: ['status', 'startTime'], order: 'descending' }
]

// Transcript entries by meeting and time
meetings/{meetingId}/transcripts/entries: [
  { fields: ['speakerId', 'timestamp'], order: 'ascending' },
  { fields: ['confidence', 'timestamp'], order: 'ascending' }
]

// Voice profiles by user
users/{userId}/voiceProfiles: [
  { fields: ['isDefault', 'createdAt'], order: 'descending' }
]

// Custom rules by user
customRules: [
  { fields: ['ownerId', 'priority', 'isActive'], order: 'descending' },
  { fields: ['isPublic', 'usageCount'], order: 'descending' }
]

// Analytics by date
analytics/daily: [
  { fields: ['date'], order: 'descending' }
]

// Cache by expiration
cache/ttsCache: [
  { fields: ['expiresAt'], order: 'ascending' }
]
```

## 6. Monitoring and Alerts

Set up Firebase monitoring:

1. **Performance Monitoring**
   - Enable Performance Monitoring in Firebase Console
   - Add performance SDK to your app

2. **Crashlytics** (optional)
   - Enable Crashlytics for error tracking
   - Configure error reporting

3. **Usage Monitoring**
   - Set up Cloud Monitoring alerts for:
     - High storage usage
     - Unusual API usage
     - Error rates
     - Performance degradation

## 7. Backup Strategy

Set up automated backups:

```bash
# Install gcloud CLI
gcloud auth login

# Create backup schedule
gcloud firestore databases create-schedule \
  --database="(default)" \
  --schedule="WEEKLY" \
  --retention="4w"

# Export specific collections
gcloud firestore export gs://your-backup-bucket/$(date +%Y%m%d) \
  --collection-ids=users,meetings,voiceProfiles
```

---

## Security Checklist

- [ ] Environment variables are properly set and secured
- [ ] Firebase security rules are deployed and tested
- [ ] Storage security rules restrict access appropriately
- [ ] Authentication is properly configured
- [ ] API keys have appropriate restrictions
- [ ] Firestore indexes are created for performance
- [ ] Backup strategy is implemented
- [ ] Monitoring and alerts are configured
- [ ] Rate limiting is configured for API endpoints
- [ ] Data retention policies are defined

---

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Check Firestore security rules
   - Verify user authentication
   - Ensure proper document ownership

2. **Storage upload failures**
   - Check storage security rules
   - Verify file size limits
   - Check storage quota

3. **Performance issues**
   - Review Firestore indexes
   - Monitor query performance
   - Consider denormalization for read-heavy operations

4. **Environment variable issues**
   - Ensure all variables are set correctly
   - Check for newline characters in private keys
   - Verify project IDs match

### Performance Optimization

1. **Firestore Optimization**
   - Use subcollections for hierarchical data
   - Implement proper pagination
   - Cache frequently accessed data
   - Use composite indexes for complex queries

2. **Storage Optimization**
   - Implement automatic cleanup for expired files
   - Use appropriate file formats and compression
   - Set proper cache headers
   - Consider CDN for frequently accessed files

3. **Real-time Optimization**
   - Limit real-time listeners scope
   - Use offline persistence where appropriate
   - Implement connection state monitoring

---

This guide provides a comprehensive setup for your Universal Assistant's Firebase infrastructure. The structure is designed to be scalable, secure, and optimized for your specific use case.