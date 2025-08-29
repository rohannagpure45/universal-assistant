# API Routes Documentation

## Overview

The Universal Assistant API provides comprehensive endpoints for authentication, meeting management, audio processing, and voice identification. Built with Next.js 14 API routes, the system offers RESTful endpoints with TypeScript type safety and comprehensive error handling.

## Table of Contents

1. [API Architecture](#api-architecture)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Meeting Management](#meeting-management)
4. [Universal Assistant Core](#universal-assistant-core)
5. [Audio Processing](#audio-processing)
6. [Voice Identification](#voice-identification)
7. [Error Handling](#error-handling)
8. [Rate Limiting & Security](#rate-limiting--security)

## API Architecture

### Base URL Structure
```
Production:  https://universal-assistant.vercel.app/api
Development: http://localhost:3000/api
```

### Endpoint Categories
```
/api/
├── auth/                    # Authentication & user management
│   ├── signin/             # User sign-in
│   ├── signout/            # User sign-out
│   ├── signup/             # User registration
│   └── reset-password/     # Password reset
├── meetings/               # Meeting CRUD operations
│   ├── [meetingId]/        # Individual meeting operations
│   └── /                   # Meeting list and creation
├── universal-assistant/    # Core assistant functionality
│   ├── ai-response/        # AI response generation
│   ├── transcribe/         # Speech transcription
│   ├── tts/               # Text-to-speech
│   ├── deepgram-key/      # Deepgram API key management
│   └── deepgram-token/    # Deepgram authentication tokens
└── voice-identification/   # Voice ID specific endpoints (planned)
    ├── profiles/          # Voice profile management
    ├── training/          # Voice training sessions
    └── identification/    # Speaker identification requests
```

### Request/Response Format

#### Standard Request Headers
```typescript
interface StandardHeaders {
  'Content-Type': 'application/json';
  'Authorization': 'Bearer <firebase-id-token>';
  'X-Request-ID': string;                    // For request tracking
  'X-Client-Version': string;                // Client application version
}
```

#### Standard Response Format
```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

## Authentication Endpoints

### POST /api/auth/signin
User authentication with email and password.

```typescript
// Request
interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Response
interface SignInResponse {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  };
  token: string;
  expiresAt: string;
  refreshToken: string;
}

// Example
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "rememberMe": true
}

// Success Response (200)
{
  "success": true,
  "data": {
    "user": {
      "uid": "abc123xyz",
      "email": "user@example.com",
      "displayName": "John Doe",
      "photoURL": "https://example.com/avatar.jpg"
    },
    "token": "eyJhbGciOiJSUzI1NiIs...",
    "expiresAt": "2024-01-21T12:00:00Z",
    "refreshToken": "def456uvw"
  },
  "timestamp": "2024-01-21T11:00:00Z",
  "requestId": "req_12345"
}
```

### POST /api/auth/signup
User registration with email and password.

```typescript
// Request
interface SignUpRequest {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}

// Example
POST /api/auth/signup
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "newpassword123",
  "displayName": "Jane Smith",
  "acceptTerms": true
}

// Success Response (201)
{
  "success": true,
  "data": {
    "user": {
      "uid": "new123xyz",
      "email": "newuser@example.com",
      "displayName": "Jane Smith",
      "emailVerified": false
    },
    "verificationEmailSent": true
  },
  "timestamp": "2024-01-21T11:00:00Z",
  "requestId": "req_12346"
}
```

### POST /api/auth/signout
User sign-out and token invalidation.

```typescript
// Request - No body required
POST /api/auth/signout
Authorization: Bearer <firebase-id-token>

// Success Response (200)
{
  "success": true,
  "data": {
    "message": "Successfully signed out"
  },
  "timestamp": "2024-01-21T11:05:00Z",
  "requestId": "req_12347"
}
```

### POST /api/auth/reset-password
Password reset functionality.

```typescript
// Request
interface ResetPasswordRequest {
  email: string;
  redirectUrl?: string;
}

// Example
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "redirectUrl": "https://app.example.com/reset-complete"
}

// Success Response (200)
{
  "success": true,
  "data": {
    "message": "Password reset email sent",
    "emailSent": true
  },
  "timestamp": "2024-01-21T11:10:00Z",
  "requestId": "req_12348"
}
```

## Meeting Management

### GET /api/meetings
Retrieve user's meetings with filtering and pagination.

```typescript
// Query Parameters
interface MeetingQueryParams {
  page?: number;                    // Page number (default: 1)
  limit?: number;                   // Items per page (default: 20, max: 100)
  status?: 'active' | 'completed' | 'scheduled';
  type?: string;                    // Meeting type ID
  dateFrom?: string;                // ISO date string
  dateTo?: string;                  // ISO date string
  search?: string;                  // Search query
  sortBy?: 'date' | 'title' | 'duration';
  sortOrder?: 'asc' | 'desc';
}

// Example
GET /api/meetings?page=1&limit=10&status=completed&sortBy=date&sortOrder=desc
Authorization: Bearer <firebase-id-token>

// Success Response (200)
{
  "success": true,
  "data": {
    "meetings": [
      {
        "id": "meeting_123",
        "title": "Team Standup",
        "type": "standup",
        "status": "completed",
        "startTime": "2024-01-21T09:00:00Z",
        "endTime": "2024-01-21T09:30:00Z",
        "duration": 1800,
        "participantCount": 5,
        "transcriptAvailable": true,
        "recordingAvailable": true,
        "createdAt": "2024-01-21T08:45:00Z",
        "hostId": "user_abc123"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 47,
      "itemsPerPage": 10,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2024-01-21T11:15:00Z",
  "requestId": "req_12349"
}
```

### POST /api/meetings
Create a new meeting.

```typescript
// Request
interface CreateMeetingRequest {
  title: string;
  type: string;                     // Meeting type ID
  description?: string;
  scheduledTime?: string;           // ISO date string
  estimatedDuration?: number;       // Duration in seconds
  participants?: string[];          // Array of participant IDs
  settings?: {
    recordAudio?: boolean;
    enableTranscription?: boolean;
    enableVoiceIdentification?: boolean;
    autoStartRecording?: boolean;
  };
}

// Example
POST /api/meetings
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "title": "Project Planning Meeting",
  "type": "planning",
  "description": "Planning session for Q2 project deliverables",
  "scheduledTime": "2024-01-21T14:00:00Z",
  "estimatedDuration": 3600,
  "participants": ["user_def456", "user_ghi789"],
  "settings": {
    "recordAudio": true,
    "enableTranscription": true,
    "enableVoiceIdentification": true,
    "autoStartRecording": true
  }
}

// Success Response (201)
{
  "success": true,
  "data": {
    "meeting": {
      "id": "meeting_new456",
      "title": "Project Planning Meeting",
      "type": "planning",
      "status": "scheduled",
      "scheduledTime": "2024-01-21T14:00:00Z",
      "estimatedDuration": 3600,
      "participants": ["user_abc123", "user_def456", "user_ghi789"],
      "settings": {
        "recordAudio": true,
        "enableTranscription": true,
        "enableVoiceIdentification": true,
        "autoStartRecording": true
      },
      "createdAt": "2024-01-21T11:20:00Z",
      "hostId": "user_abc123"
    }
  },
  "timestamp": "2024-01-21T11:20:00Z",
  "requestId": "req_12350"
}
```

### GET /api/meetings/[meetingId]
Retrieve specific meeting details.

```typescript
// Example
GET /api/meetings/meeting_123
Authorization: Bearer <firebase-id-token>

// Success Response (200)
{
  "success": true,
  "data": {
    "meeting": {
      "id": "meeting_123",
      "title": "Team Standup",
      "type": "standup",
      "status": "completed",
      "startTime": "2024-01-21T09:00:00Z",
      "endTime": "2024-01-21T09:30:00Z",
      "duration": 1800,
      "participants": [
        {
          "id": "user_abc123",
          "name": "John Doe",
          "role": "host",
          "joinTime": "2024-01-21T09:00:00Z",
          "leaveTime": "2024-01-21T09:30:00Z",
          "speakingTime": 450
        },
        {
          "id": "user_def456", 
          "name": "Jane Smith",
          "role": "participant",
          "joinTime": "2024-01-21T09:01:00Z",
          "leaveTime": "2024-01-21T09:30:00Z",
          "speakingTime": 320
        }
      ],
      "transcript": {
        "available": true,
        "entryCount": 47,
        "wordCount": 1250,
        "identifiedSpeakers": 5,
        "confidence": 0.89
      },
      "recording": {
        "available": true,
        "url": "https://storage.googleapis.com/recordings/meeting_123.webm",
        "duration": 1800,
        "size": 15728640
      },
      "createdAt": "2024-01-21T08:45:00Z",
      "hostId": "user_abc123"
    }
  },
  "timestamp": "2024-01-21T11:25:00Z",
  "requestId": "req_12351"
}
```

### PUT /api/meetings/[meetingId]
Update meeting details.

```typescript
// Request
interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  settings?: Partial<MeetingSettings>;
  notes?: string;
}

// Example
PUT /api/meetings/meeting_123
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Great discussion on Q2 deliverables. Next meeting scheduled for next week."
}

// Success Response (200)
{
  "success": true,
  "data": {
    "meeting": {
      "id": "meeting_123",
      "status": "completed",
      "notes": "Great discussion on Q2 deliverables. Next meeting scheduled for next week.",
      "updatedAt": "2024-01-21T11:30:00Z"
    }
  },
  "timestamp": "2024-01-21T11:30:00Z",
  "requestId": "req_12352"
}
```

## Universal Assistant Core

### POST /api/universal-assistant/ai-response
Generate AI responses based on conversation context.

```typescript
// Request
interface AIResponseRequest {
  message: string;
  context?: {
    meetingId?: string;
    conversationHistory?: ConversationEntry[];
    currentSpeaker?: string;
    meetingType?: string;
    participants?: string[];
  };
  model?: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-sonnet' | 'claude-3-opus';
  responseType?: 'immediate' | 'thoughtful' | 'analytical';
  maxTokens?: number;
}

// Example
POST /api/universal-assistant/ai-response
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "message": "What are the key takeaways from our discussion about the project timeline?",
  "context": {
    "meetingId": "meeting_123",
    "conversationHistory": [
      {
        "speaker": "John Doe",
        "text": "I think we need to push back the Q2 deadline by two weeks",
        "timestamp": "2024-01-21T09:15:00Z"
      },
      {
        "speaker": "Jane Smith", 
        "text": "That would affect the client presentation scheduled for March 15th",
        "timestamp": "2024-01-21T09:16:00Z"
      }
    ],
    "currentSpeaker": "John Doe",
    "meetingType": "planning",
    "participants": ["John Doe", "Jane Smith", "Mike Johnson"]
  },
  "model": "gpt-4o",
  "responseType": "analytical"
}

// Success Response (200)
{
  "success": true,
  "data": {
    "response": "Based on the discussion, here are the key takeaways regarding the project timeline:\n\n1. **Timeline Adjustment**: There's a proposal to push back the Q2 deadline by two weeks\n2. **Client Impact**: This change would affect the client presentation scheduled for March 15th\n3. **Decision Needed**: The team needs to weigh the timeline adjustment against client commitments\n\nRecommendation: Consider discussing alternative solutions such as phased delivery or resource reallocation before finalizing the timeline change.",
    "model": "gpt-4o",
    "tokenCount": {
      "input": 234,
      "output": 89,
      "total": 323
    },
    "processingTime": 1.23,
    "confidence": 0.92,
    "responseId": "resp_789abc"
  },
  "timestamp": "2024-01-21T11:35:00Z",
  "requestId": "req_12353"
}
```

### POST /api/universal-assistant/transcribe
Real-time speech transcription using Deepgram.

```typescript
// Request - Multipart form data
interface TranscribeRequest {
  audio: File | Blob;                       // Audio file or blob
  language?: string;                        // Language code (default: 'en-US')
  model?: 'nova-2' | 'nova' | 'enhanced';  // Deepgram model
  diarize?: boolean;                        // Enable speaker diarization
  punctuate?: boolean;                      // Add punctuation
  smartFormat?: boolean;                    // Apply smart formatting
}

// Example
POST /api/universal-assistant/transcribe
Authorization: Bearer <firebase-id-token>
Content-Type: multipart/form-data

FormData:
- audio: [audio file]
- language: "en-US"
- model: "nova-2"
- diarize: true
- punctuate: true
- smartFormat: true

// Success Response (200)
{
  "success": true,
  "data": {
    "transcript": {
      "text": "Hello everyone, welcome to today's standup meeting. Let's start by going around and sharing what we accomplished yesterday.",
      "confidence": 0.94,
      "duration": 8.5,
      "wordCount": 19,
      "language": "en-US"
    },
    "speakers": [
      {
        "speaker": 0,
        "text": "Hello everyone, welcome to today's standup meeting.",
        "start": 0.0,
        "end": 3.2,
        "confidence": 0.96
      },
      {
        "speaker": 0,
        "text": "Let's start by going around and sharing what we accomplished yesterday.",
        "start": 3.5,
        "end": 8.1,
        "confidence": 0.92
      }
    ],
    "metadata": {
      "model": "nova-2",
      "processingTime": 0.89,
      "audioFormat": "webm",
      "sampleRate": 16000
    }
  },
  "timestamp": "2024-01-21T11:40:00Z",
  "requestId": "req_12354"
}
```

### POST /api/universal-assistant/tts
Text-to-speech generation using ElevenLabs.

```typescript
// Request
interface TTSRequest {
  text: string;
  voiceId?: string;                         // ElevenLabs voice ID
  model?: string;                           // TTS model to use
  stability?: number;                       // Voice stability (0-1)
  similarityBoost?: number;                 // Similarity boost (0-1)
  style?: number;                           // Style exaggeration (0-1)
  useCache?: boolean;                       // Use cached version if available
}

// Example
POST /api/universal-assistant/tts
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{
  "text": "Thank you for the update. Let's move on to the next agenda item.",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "model": "eleven_multilingual_v2",
  "stability": 0.75,
  "similarityBoost": 0.85,
  "useCache": true
}

// Success Response (200)
{
  "success": true,
  "data": {
    "audioUrl": "https://storage.googleapis.com/tts-cache/abc123def456.mp3",
    "duration": 4.2,
    "cacheHit": false,
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "model": "eleven_multilingual_v2",
    "settings": {
      "stability": 0.75,
      "similarityBoost": 0.85,
      "style": 0.0
    },
    "metadata": {
      "textLength": 64,
      "audioFormat": "mp3",
      "bitRate": 128000,
      "generationTime": 2.1
    }
  },
  "timestamp": "2024-01-21T11:45:00Z",
  "requestId": "req_12355"
}
```

### GET /api/universal-assistant/deepgram-token
Get temporary Deepgram authentication token for client-side usage.

```typescript
// Example
GET /api/universal-assistant/deepgram-token
Authorization: Bearer <firebase-id-token>

// Success Response (200)
{
  "success": true,
  "data": {
    "token": "temp_token_xyz789",
    "expiresAt": "2024-01-21T12:45:00Z",
    "expiresIn": 3600,
    "scope": ["transcription", "real-time"],
    "usage": {
      "remaining": 950,
      "limit": 1000,
      "resetAt": "2024-01-22T00:00:00Z"
    }
  },
  "timestamp": "2024-01-21T11:45:00Z",
  "requestId": "req_12356"
}
```

## Error Handling

### Standard Error Codes

```typescript
interface APIErrorCodes {
  // Authentication Errors (401)
  'AUTH_TOKEN_MISSING': 'Authentication token is required';
  'AUTH_TOKEN_INVALID': 'Invalid authentication token';
  'AUTH_TOKEN_EXPIRED': 'Authentication token has expired';
  'AUTH_USER_NOT_FOUND': 'User not found';
  'AUTH_INVALID_CREDENTIALS': 'Invalid email or password';
  
  // Authorization Errors (403)
  'FORBIDDEN_RESOURCE': 'Access to this resource is forbidden';
  'INSUFFICIENT_PERMISSIONS': 'Insufficient permissions';
  'ACCOUNT_SUSPENDED': 'Account has been suspended';
  
  // Validation Errors (400)
  'VALIDATION_ERROR': 'Request validation failed';
  'INVALID_REQUEST_FORMAT': 'Invalid request format';
  'MISSING_REQUIRED_FIELD': 'Required field is missing';
  'INVALID_FIELD_VALUE': 'Invalid field value';
  
  // Resource Errors (404)
  'RESOURCE_NOT_FOUND': 'Requested resource not found';
  'MEETING_NOT_FOUND': 'Meeting not found';
  'USER_NOT_FOUND': 'User not found';
  
  // Rate Limiting (429)
  'RATE_LIMIT_EXCEEDED': 'Rate limit exceeded';
  'QUOTA_EXCEEDED': 'API quota exceeded';
  
  // Server Errors (500)
  'INTERNAL_SERVER_ERROR': 'Internal server error';
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable';
  'EXTERNAL_SERVICE_ERROR': 'External service error';
  
  // Audio Processing Errors
  'AUDIO_PROCESSING_FAILED': 'Audio processing failed';
  'UNSUPPORTED_AUDIO_FORMAT': 'Unsupported audio format';
  'AUDIO_FILE_TOO_LARGE': 'Audio file exceeds size limit';
  'TRANSCRIPTION_FAILED': 'Speech transcription failed';
  'TTS_GENERATION_FAILED': 'Text-to-speech generation failed';
}
```

### Error Response Examples

```typescript
// Validation Error (400)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "issue": "Invalid email format",
      "received": "not-an-email"
    }
  },
  "timestamp": "2024-01-21T11:50:00Z",
  "requestId": "req_12357"
}

// Authentication Error (401)
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "Authentication token has expired",
    "details": {
      "expiredAt": "2024-01-21T10:30:00Z",
      "currentTime": "2024-01-21T11:50:00Z"
    }
  },
  "timestamp": "2024-01-21T11:50:00Z",
  "requestId": "req_12358"
}

// Resource Not Found (404)
{
  "success": false,
  "error": {
    "code": "MEETING_NOT_FOUND",
    "message": "Meeting not found",
    "details": {
      "meetingId": "nonexistent_meeting_123"
    }
  },
  "timestamp": "2024-01-21T11:50:00Z",
  "requestId": "req_12359"
}

// Rate Limit Error (429)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2024-01-21T12:00:00Z",
      "retryAfter": 600
    }
  },
  "timestamp": "2024-01-21T11:50:00Z",
  "requestId": "req_12360"
}
```

## Rate Limiting & Security

### Rate Limiting

```typescript
interface RateLimits {
  // General API rate limits per user
  general: {
    requests: 1000;              // Requests per hour
    window: 3600;                // Window in seconds
  };
  
  // AI response rate limits
  aiResponse: {
    requests: 100;               // Requests per hour
    window: 3600;
    tokenLimit: 50000;           // Tokens per hour
  };
  
  // Audio processing rate limits
  audioProcessing: {
    requests: 200;               // Requests per hour
    window: 3600;
    uploadSize: 100 * 1024 * 1024; // 100MB per hour
  };
  
  // Authentication rate limits
  authentication: {
    attempts: 5;                 // Login attempts per IP
    window: 900;                 // 15 minutes
  };
}
```

### Security Headers

```typescript
interface SecurityHeaders {
  'X-Content-Type-Options': 'nosniff';
  'X-Frame-Options': 'DENY';
  'X-XSS-Protection': '1; mode=block';
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains';
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'";
  'X-Rate-Limit-Limit': string;        // Rate limit per window
  'X-Rate-Limit-Remaining': string;    // Remaining requests
  'X-Rate-Limit-Reset': string;        // Reset timestamp
}
```

### Input Validation

```typescript
// Request validation schemas using Zod
import { z } from 'zod';

const CreateMeetingSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  scheduledTime: z.string().datetime().optional(),
  estimatedDuration: z.number().min(60).max(28800).optional(), // 1 minute to 8 hours
  participants: z.array(z.string()).max(50).optional(),
  settings: z.object({
    recordAudio: z.boolean().optional(),
    enableTranscription: z.boolean().optional(),
    enableVoiceIdentification: z.boolean().optional(),
    autoStartRecording: z.boolean().optional()
  }).optional()
});

const AIResponseSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.object({
    meetingId: z.string().optional(),
    conversationHistory: z.array(z.object({
      speaker: z.string(),
      text: z.string(),
      timestamp: z.string().datetime()
    })).max(50).optional(),
    currentSpeaker: z.string().optional(),
    meetingType: z.string().optional(),
    participants: z.array(z.string()).optional()
  }).optional(),
  model: z.enum(['gpt-4o', 'gpt-4o-mini', 'claude-3-sonnet', 'claude-3-opus']).optional(),
  responseType: z.enum(['immediate', 'thoughtful', 'analytical']).optional(),
  maxTokens: z.number().min(1).max(4000).optional()
});
```

---

*Last Updated: 2025-01-21*
*API Version: 3.0.0*
*Total Endpoints: 15+ active endpoints*
*Rate Limits: Implemented with Redis*
*Security: Firebase Auth + Custom middleware*