# Universal Assistant Architecture Overview

## System Architecture

The Universal Assistant employs a sophisticated, service-oriented architecture designed for real-time audio processing, speaker identification, and AI-powered meeting assistance.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Core Services Architecture](#core-services-architecture)
3. [Audio Processing Pipeline](#audio-processing-pipeline)
4. [State Management](#state-management)
5. [Data Flow](#data-flow)
6. [Service Integration](#service-integration)
7. [Scalability Considerations](#scalability-considerations)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL ASSISTANT                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14 + React 18)                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   UI Components │ │  State Stores   │ │   Custom Hooks  │   │
│  │   - Voice ID    │ │  - Auth Store   │ │   - useAuth     │   │
│  │   - Meetings    │ │  - Meeting Store│ │   - useVoice    │   │
│  │   - Dashboard   │ │  - App Store    │ │   - useMeeting  │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ Universal Assist│ │ Firebase Services│ │Audio Processing │   │
│  │ - Coordinator   │ │ - Auth Service  │ │ - AudioManager  │   │
│  │ - AI Service    │ │ - Database Svc  │ │ - STT Service   │   │
│  │ - Fragment Proc │ │ - Storage Svc   │ │ - TTS Service   │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │   Firebase      │ │   AI Providers  │ │ Audio Services  │   │
│  │ - Firestore     │ │ - OpenAI        │ │ - Deepgram      │   │
│  │ - Auth          │ │ - Anthropic     │ │ - ElevenLabs    │   │
│  │ - Storage       │ │ - Model Router  │ │ - Web Audio API │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Services Architecture

### Universal Assistant Services

Located in `/src/services/universal-assistant/`, these services form the heart of the system:

#### Primary Services
```typescript
// Core orchestration
UniversalAssistantCoordinator → Central coordination of all services
AudioManager                 → Audio recording, playback, queue management
ConversationProcessor        → High-level conversation flow management

// Speech Processing
DeepgramSTT                  → Real-time speech-to-text with Deepgram
FragmentProcessor            → Analyzes conversation fragments for completeness
SpeakerIdentificationService → Voice recognition and speaker profiles

// AI Integration
AIService / EnhancedAIService → Multi-model AI response generation
GatekeeperService            → Rule-based conversation filtering
InterruptOrchestrator        → Manages conversation turn-taking

// Audio Output
ElevenLabsTTS                → ElevenLabs API integration for speech synthesis
TTSApiClient                 → Production-ready TTS client with caching
TTSCacheManager              → Advanced TTS cache management
```

#### Audio Processing Pipeline Flow
```
Audio Input → AudioManager → DeepgramSTT → FragmentProcessor → ConversationProcessor
                    ↓              ↓              ↓                ↓
            Audio Queue    Transcript    Fragment Analysis   AI Processing
                    ↓              ↓              ↓                ↓
            Playback Mgmt  Speaker ID    Context Building    Response Gen
                    ↓              ↓              ↓                ↓
            TTS Output     Voice Library  Gatekeeper Filter   User Output
```

### Firebase Services

Located in `/src/services/firebase/`, these handle all backend operations:

```typescript
// Authentication & User Management
AuthService              → Firebase Auth integration with OAuth
DatabaseService          → Comprehensive CRUD operations with type safety
RealtimeService          → Real-time data synchronization

// Voice & Audio Management
VoiceLibraryService      → Speaker profile and voice sample management
StorageService           → Firebase Storage for audio files and samples
NeedsIdentificationService → Manages unresolved speaker identification requests

// Meeting Management
MeetingTypeService       → Meeting type configuration and management
VoiceMatchService        → Voice comparison and matching algorithms
```

### Audio Processing Services

Located in `/src/services/audio-processing/`:

```typescript
// Core Audio Processing
EnhancedAudioProcessor   → Advanced audio processing and analysis
AudioSegmentExtractor    → Extract specific audio segments
VoiceActivityDetection   → Detect speech activity in audio streams

// Data Management
AudioChunkBuffer         → Efficient audio chunk buffering
AudioFormatConverter     → Convert between audio formats
```

## State Management Architecture

The system uses Zustand with Immer for state management, organized into specialized stores:

### Store Structure
```typescript
// Authentication State
AuthStore: {
  user: User | null
  preferences: UserPreferences
  authStatus: 'loading' | 'authenticated' | 'unauthenticated'
  signIn, signOut, updatePreferences
}

// Meeting State
MeetingStore: {
  activeMeeting: Meeting | null
  transcript: TranscriptEntry[]
  participants: Participant[]
  recordings: AudioRecording[]
  // Real-time transcript processing
  // Fragment aggregation
  // Speaker identification
}

// Application State
AppStore: {
  audioSettings: AudioSettings
  uiSettings: UISettings
  systemStatus: SystemStatus
  // Cross-store integration
  // Performance monitoring
}
```

### Cross-Store Integration
```typescript
// Automatic synchronization between stores
AuthStore.preferences ↔ AppStore.audioSettings
MeetingStore.participants ↔ AuthStore.user
AppStore.systemStatus ← All stores (monitoring)
```

## Data Flow Architecture

### Real-Time Audio Processing Flow

```
1. Audio Capture (Web Audio API)
   ↓
2. Audio Manager (chunk processing)
   ↓
3. Deepgram STT (real-time transcription)
   ↓
4. Fragment Processor (completeness analysis)
   ↓
5. Speaker Identification (voice matching)
   ↓
6. Conversation Processor (context building)
   ↓
7. AI Service (response generation)
   ↓
8. Gatekeeper (rule-based filtering)
   ↓
9. TTS Service (speech synthesis)
   ↓
10. Audio Output (playback)
```

### Database Synchronization Flow

```
Frontend State Changes → Service Layer → Firebase Operations → Real-time Updates
                                              ↓
                                    Firestore/Storage
                                              ↓
                                    Real-time Listeners
                                              ↓
                                    State Store Updates
                                              ↓
                                    UI Re-rendering
```

## Voice Identification System Architecture

### Component Hierarchy
```
VoiceLibraryDashboard
├── SpeakerDirectoryView
│   ├── SpeakerProfileCard
│   ├── VoiceSamplePlayer
│   └── SpeakerAnalyticsDashboard
├── PostMeetingIdentificationDashboard
│   ├── UnidentifiedSpeakersPanel
│   ├── VoiceMatchingInterface
│   └── IdentificationHistoryView
└── VoiceTrainingWizard
    ├── VoiceRecordingInterface
    ├── SpeakerProfileTraining
    └── TrainingProgressDashboard
```

### Service Integration
```
Voice Components ↔ VoiceLibraryService ↔ Firebase Storage
                                      ↔ Firebase Firestore
                                      ↔ Speaker Identification Service
                                      ↔ Audio Processing Services
```

## Multi-Agent System Architecture

The system employs specialized agents for different tasks:

### Agent Architecture
```typescript
// Context Management
ContextSourcingAgent     → Extracts context from conversations
MeetingInfoAgent         → Manages meeting metadata and information

// Content Management
NotesWriterAgent         → Generates and manages meeting notes
NotesReaderAgent         → Retrieves and processes existing notes

// Rule Management
RulesetManagerAgent      → Manages custom rules and policies
```

### Agent Coordination
```
UniversalAssistantCoordinator
├── Agent Registration & Discovery
├── Task Distribution & Load Balancing
├── Result Aggregation & Processing
└── Error Handling & Recovery
```

## API Architecture

### Route Structure
```
/api/
├── auth/                    # Authentication endpoints
│   ├── signin/
│   ├── signout/
│   └── signup/
├── meetings/               # Meeting management
│   └── [meetingId]/
├── universal-assistant/    # Core assistant APIs
│   ├── ai-response/
│   ├── transcribe/
│   ├── tts/
│   └── deepgram-token/
```

### Service Layer Integration
```
API Routes → Service Layer → Firebase Services → External APIs
     ↓              ↓               ↓                ↓
Request Validation  Business Logic  Data Persistence  AI Processing
     ↓              ↓               ↓                ↓
Response Formatting Result Processing Real-time Updates Response Generation
```

## Security Architecture

### Authentication Flow
```
Client Request → Firebase Auth Token → Service Validation → Resource Access
                        ↓
                   Token Verification
                        ↓
                   User Role & Permissions
                        ↓
                   Database Security Rules
```

### Data Protection
```
1. Firebase Security Rules (Firestore/Storage)
2. API Route Authentication Middleware
3. Service-Level Authorization Checks
4. Client-Side Permission Validation
5. Encrypted Audio Storage
```

## Performance Architecture

### Optimization Strategies
```
1. Caching Layers
   - TTS Response Caching (Firebase Storage)
   - Database Query Caching (RealtimeService)
   - Audio Processing Caching (AudioManager)

2. Real-time Optimization
   - Fragment-based Processing (reduce latency)
   - Streaming Audio Processing (reduce memory)
   - Incremental State Updates (reduce re-renders)

3. Resource Management
   - Audio Buffer Pooling
   - Connection Pooling (Firebase)
   - Memory Management (audio processing)
```

### Monitoring & Analytics
```
PerformanceMonitor → Metrics Collection → Analytics Dashboard
                            ↓
                    Performance Insights
                            ↓
                    Optimization Recommendations
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API design for easy horizontal scaling
- Firebase auto-scaling for database and storage
- CDN integration for audio file distribution

### Vertical Scaling
- Efficient memory management for audio processing
- Optimized database queries and indexing
- Smart caching strategies for reduced load

### Future Architecture Enhancements
1. **Microservices Migration**: Break down services into independent microservices
2. **WebRTC Integration**: Direct peer-to-peer audio streaming
3. **Edge Computing**: Process audio closer to users for reduced latency
4. **ML Model Optimization**: Custom models for speaker identification
5. **Real-time Collaboration**: Multi-user simultaneous meeting participation

---

*Last Updated: 2025-01-21*
*Architecture Version: 3.0.0*