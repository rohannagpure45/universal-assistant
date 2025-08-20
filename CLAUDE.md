# CLAUDE.md

This file provides project-specific guidance to Claude Code (claude.ai/code) when working with the Universal Assistant codebase. For general development preferences and universal commands, see `/Users/rohan/CLAUDE.md`.

## Project-Specific Commands

### Core Development
- `npm run dev` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build the Next.js application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code linting

*See `/Users/rohan/CLAUDE.md` for universal development commands and preferences.*

### Testing Structure
- Tests are organized in `/tests/` directory with three levels:
  - `tests/unit/` - Unit tests
  - `tests/integration/` - Integration tests  
  - `tests/e2e/` - End-to-end tests
- Jest is configured but test command should be verified if needed

## Visual Development

### Design Principles
- Comprehensive design checklist in `/context/design-principles.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

## Architecture Overview

### Universal Assistant System
This is a sophisticated AI-powered meeting assistant built with Next.js 14. The system processes real-time audio, transcribes speech, identifies speakers, and provides contextual AI responses through a multi-agent architecture.

### Core Services Architecture
The system is organized around specialized services in `/src/services/universal-assistant/`:

**Audio Processing Pipeline:**
```
AudioManager → DeepgramSTT → FragmentProcessor → ConversationProcessor
```

**Key Service Files:**
- `AudioManager.ts` - Audio recording, playback, queue management
- `DeepgramSTT.ts` - Real-time speech-to-text with Deepgram
- `FragmentProcessor.ts` - Analyzes conversation fragments for completeness
- `ConversationProcessor.ts` - High-level conversation flow management
- `AIService.ts` / `EnhancedAIService.ts` - Multi-model AI response generation
- `SpeakerIdentificationService.ts` - Voice recognition and speaker profiles
- `GatekeeperService.ts` - Rule-based conversation filtering
- `InterruptOrchestrator.ts` - Manages conversation turn-taking
- `TTSApiClient.ts` - Production-ready TTS client with caching and auth
- `TTSCacheManager.ts` - Advanced TTS cache management and optimization
- `ElevenLabsTTS.ts` - ElevenLabs API integration for speech synthesis

### Agent System
Multi-agent architecture with specialized agents in `/src/services/agents/`:
- `ContextSourcingAgent` - Extracts context from conversations
- `MeetingInfoAgent` - Manages meeting metadata
- `NotesWriterAgent` / `NotesReaderAgent` - Meeting notes management
- `RulesetManagerAgent` - Custom rules and policies

### AI Model Configuration
- **Location:** `/src/config/modelConfigs.ts`
- **Supported Providers:** OpenAI (GPT-4o, GPT-5 variants) and Anthropic (Claude 3.5/3.7)
- **Features:** Cost optimization, fallback models, dynamic model selection
- **Model Types:** 12 different models configured with specific capabilities and pricing

### Type System
Core types are defined in `/src/types/index.ts`:
- `AIModel` - Union type of all supported AI models
- `Meeting` & `MeetingType` - 8 specialized meeting types
- `TranscriptEntry` & `SpeakerProfile` - Audio processing types
- `CustomRule` & `RuleCondition` - Rule-based filtering system
- `User` & `UserPreferences` - User management

### Technology Stack
**Core Framework:** Next.js 14 with App Router, TypeScript 5, React 18
**AI Services:** Anthropic Claude, OpenAI GPT, Deepgram (STT), ElevenLabs (TTS)
**Audio:** RecordRTC, WaveSurfer.js, Web Audio API
**Backend:** Firebase (Auth, Firestore, Storage), Firebase Admin SDK
**UI:** Tailwind CSS, Radix UI components, Lucide icons
**State:** Zustand with Immer
**Utilities:** Lodash, date-fns, uuid/nanoid

### Firebase Collections Structure
```
/users/{userId} - User profiles and preferences
/meetings/{meetingId} - Meeting data and metadata
/customRules/{ruleId} - User-defined rules
/voiceProfiles/{profileId} - Speaker voice profiles
/transcripts/{meetingId}/entries/{entryId} - Conversation transcripts
```

### Firebase Storage Structure
```
storage-bucket/
├── voice-samples/                          // Individual voice clips for identification
│   └── {deepgramVoiceId}/
│       └── {timestamp}_{meetingId}_{duration}s.webm
│           // Example: "1705315200000_mtg_abc123_8s.webm"
│
├── meeting-recordings/                     // Full meeting recordings
│   └── {meetingId}/
│       ├── full_recording.webm            // Complete meeting audio
│       ├── full_recording_compressed.mp3   // Compressed version
│       └── metadata.json                   // Recording metadata
│
├── meeting-clips/                          // Specific segments from meetings
│   └── {meetingId}/
│       └── {timestamp}_{speakerId}_{duration}s.webm
│           // Example: "1705315200000_dg_voice_xyz_15s.webm"
│
├── identification-samples/                 // Clips pending identification
│   └── {meetingId}/
│       └── {deepgramVoiceId}/
│           ├── best_sample.webm           // Highest quality clip
│           ├── sample_1.webm              // Alternative samples
│           └── sample_2.webm
│
├── user-uploads/                          // User-provided voice samples
│   └── {userId}/
│       └── voice-training/
│           ├── initial_sample.webm        // First voice sample
│           └── {timestamp}_sample.webm    // Additional samples
│
├── tts-cache/                             // Text-to-speech cached audio files
│   └── {sha256Hash}.mp3                   // Cached TTS audio (7-day expiration)
│
└── temp/                                   // Temporary processing files
    └── {sessionId}/
        └── {timestamp}_chunk.webm          // Live streaming chunks
```

### Real-Time Processing Flow
1. Audio capture via AudioManager
2. Transcription through DeepgramSTT  
3. Fragment analysis and buffering
4. Context-aware response generation

5. Rule-based filtering via GatekeeperEngine
6. AI response synthesis
7. Text-to-speech playback

### API Routes
- `/api/universal-assistant/ai-response` - AI response generation
- `/api/universal-assistant/transcribe` - Speech transcription
- `/api/universal-assistant/tts` - Text-to-speech synthesis (production-ready with caching)

## Important Development Notes

### Environment Configuration
- Requires Firebase configuration for authentication, database, and storage
- AI API keys needed for OpenAI and Anthropic services
- Deepgram API key for speech-to-text
- ElevenLabs API key for text-to-speech

### Firebase Storage Guidelines
**File Organization:**
- Use the predefined storage hierarchy for all audio file operations
- Voice samples are organized by Deepgram voice IDs for speaker identification
- Meeting recordings include both original and compressed versions
- TTS cache uses SHA-256 hashes for efficient lookup and deduplication
- Temporary files in `/temp/` should be cleaned up after processing

**Naming Conventions:**
- Timestamps use Unix milliseconds for consistent ordering
- Duration suffixes (e.g., `_8s`, `_15s`) indicate clip length
- Include meeting IDs and speaker IDs for traceability
- Use `.webm` for original recordings, `.mp3` for compressed versions

**File Management:**
- Implement automatic cleanup for temporary files older than 24 hours
- TTS cache files expire after 7 days (handled by existing TTSCacheManager)
- Voice samples should be retained for speaker identification accuracy
- Meeting recordings follow user data retention preferences

### Phase 2 Core Infrastructure (COMPLETED)
**Authentication System:**
- `AuthService.ts` - Complete Firebase Auth integration with email/password and Google OAuth
- `useAuth.ts` - Enhanced authentication hook with cross-store integration
- `LoginForm.tsx` / `SignupForm.tsx` - Production-ready authentication components

**Database Operations:**
- `DatabaseService.ts` - Comprehensive CRUD operations with type safety and error handling
- `RealtimeService.ts` - Real-time data synchronization with Firebase listeners
- Complete integration with Firebase client/admin SDKs

**State Management (Zustand + Immer):**
- `AuthStore` - Authentication state with automatic preference sync
- `MeetingStore` - Meeting lifecycle, transcript management, real-time sync
- `AppStore` - UI settings, audio preferences, global app state
- Cross-store integration utilities for seamless data flow

**Integration Features:**
- Real-time transcript processing with fragment aggregation
- Cross-store preference synchronization (Auth ↔ App)
- Universal Assistant coordinator integration
- Comprehensive error handling and performance monitoring

### Recent Development Focus
Current Phase 2 completion includes:
- Complete authentication and database infrastructure
- Production-ready state management with Zustand
- Real-time synchronization across all data types
- Comprehensive integration testing and validation

### Project-Specific Code Patterns
- Event-driven architecture with ConversationEvent types
- Plugin-based rule system for meeting customization
- Multi-modal AI integration with cost optimization
- Service-oriented design with clear boundaries
- Real-time audio processing with Web Audio API

*General code style preferences and TypeScript patterns are defined in `/Users/rohan/CLAUDE.md`.*

### Improvement areas
 // SDK (more features)
  const audioStream = await elevenlabs.textToSpeech.convert(voiceId,
  {
    text, modelId: "eleven_multilingual_v2"
  });


### Project-Specific Model Configuration
This project supports both OpenAI and Anthropic providers via the modelConfigs system in `/src/config/modelConfigs.ts`. Google/Gemini references have been removed. Use the modelConfigs system for adding new models or modifying existing ones.

*General AI assistant behavior preferences are defined in `/Users/rohan/CLAUDE.md`.*

## TTS System Architecture (Production-Ready)

### Comprehensive Text-to-Speech Implementation
The system includes a complete, production-ready TTS implementation with advanced caching and integration:

**TTS Service Stack:**
```
Client Request → TTSApiClient → TTS API Route → ElevenLabs → Firebase Storage → Cached Audio URL
                     ↓
              AudioManager Playback → Input Gating → User Experience
```

**Key TTS Components:**
- `TTSApiClient.ts` - Full-featured client with cancellation, retry logic, and Firebase Auth
- `TTSCacheManager.ts` - Advanced cache management with statistics and optimization
- `/api/universal-assistant/tts/route.ts` - Complete API with validation, caching, and error handling
- Firebase Storage integration for scalable audio file caching (7-day expiration)
- Voice profile integration for personalized voice settings

**TTS Features:**
- ✅ **Caching System**: SHA-256 cache keys, automatic expiration, and cleanup
- ✅ **Authentication**: Firebase ID token integration for secure access  
- ✅ **Error Handling**: Comprehensive ElevenLabs API error mapping and retries
- ✅ **Performance**: Request cancellation, retry logic, and cache optimization
- ✅ **Integration**: Seamless integration with AudioManager and voice profiles
- ✅ **Management**: Cache statistics, cleanup utilities, and monitoring tools

**Usage Examples:**
```typescript
// Generate speech with caching
const response = await generateSpeech("Hello world", {
  voiceId: "21m00Tcm4TlvDq8ikWAM",
  options: { useCache: true }
});

// Generate and play immediately  
const audio = await speakText("Hello world", {
  voiceProfileId: "user-voice-profile-id"
});

// Integration with AudioManager
const ttsIntegration = integrateWithAudioManager(audioManager);
await ttsIntegration.playTTS("Hello world", { speakerId: "user123" });
```

**Cache Management:**
```typescript
// Get cache statistics
const stats = await getCacheStats();

// Clean up expired files
const cleanup = await cleanupCache();

// Optimize cache size
const optimization = await optimizeCache(50 * 1024 * 1024); // 50MB limit
```



