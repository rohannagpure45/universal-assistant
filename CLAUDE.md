# CLAUDE.md

This file provides project-specific guidance to Claude Code (claude.ai/code) when working with the Universal Assistant codebase. For general development preferences and universal commands, see `/Users/rohan/CLAUDE.md`.

## ⚠️ CRITICAL PROJECT STATUS - August 2025

### 🚨 DO NOT DEPLOY - CRITICAL ISSUES PRESENT

**Current State**: The codebase has 79 TypeScript compilation errors and critical implementation flaws that make it non-functional.

**Major Issues**:
1. **XSS Prevention Implementation BROKEN** - URL sanitization returns empty strings for all valid URLs
2. **Performance Regression** - 57+ second processing time for large inputs (expected <1 second)
3. **Bundle Size Issue** - Recent changes added 836KB (DOMPurify: 812KB)
4. **Test Suite Failing** - 30% of XSS prevention tests failing
5. **TypeScript Errors** - 79 compilation errors preventing build

**Recent Failed Attempts**:
- Interface segregation created type conflicts
- ValidationResult discriminated unions incomplete
- Migration helpers over-engineered
- XSS prevention implementation has critical bugs

**Before ANY work**:
1. Review `/CRITICAL_ISSUES_TRACKER.md` for current blockers
2. Check TypeScript errors: `npm run typecheck 2>&1 | grep -c "error TS"`
3. Do NOT add new features until core issues resolved
4. Focus on fixing compilation errors first

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
-use only port 3000

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


## Voice Sample Validation System

The voice sample validation system has been simplified to reduce over-engineering while maintaining all functionality:

### Simple Validation Approach
- Use `isValidVoiceSample()` for basic validation (returns boolean, no exceptions)
- Use `createVoiceSample()` to create samples with safe defaults
- Use `getQualityLevel()` to map numeric quality scores to human-readable labels
- Use `isHighQuality()` to check quality thresholds (matches component patterns)

### Component Usage Patterns
Components use simple fallback patterns that are now supported by helpers:
```typescript
// What components actually do:
const quality = sample.quality || 0.5;  // Now: withSafeFallbacks(sample)
const level = quality >= 0.8 ? 'excellent' : 'good';  // Now: getQualityLevel(quality)
```

### Migration from Complex Validation
The previous 235-line VoiceSampleValidator with exception-based validation has been removed as it was unused. The simplified approach matches how components actually handle voice samples with safe defaults and return-based validation.

**Location**: `/src/utils/voice-sample-helpers.ts`

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

---

# COMPREHENSIVE DEBUGGING REPORT - UPDATED AUGUST 2025
## Universal Assistant Application - Critical Flaws and Issues Analysis

**⚠️ CRITICAL STATUS: This application has significant stability, security, and functionality issues that require immediate attention before any production deployment.**

## LATEST ASSESSMENT (August 2025)

### Recently Attempted Fixes That FAILED:
1. **Runtime Validation** - Added but created circular dependencies
2. **Interface Segregation** - Caused more type conflicts than it solved
3. **XSS Prevention with DOMPurify** - Completely broken, blocks all valid URLs
4. **Migration Helpers** - Over-engineered, adds complexity without solving issues

### Current Error Count: 79 TypeScript Errors
- Down from 115 initially
- But core functionality is MORE broken than before
- URL sanitization prevents ANY URLs from working
- Performance degraded by 57x

Based on detailed debugging analysis, numerous critical bugs, type errors, runtime issues, and architectural problems have been identified:

## 1. CRITICAL TYPESCRIPT COMPILATION ERRORS

### Voice Identification Components (Critical)
**Location**: `/src/components/voice-identification/`

1. **VoiceSample Type Mismatch** - `SpeakerProfileTraining.tsx:993`
   - **Error**: `Type 'VoiceSample[]' is not assignable to type 'VoiceSample[]'`
   - **Root Cause**: Two different VoiceSample type definitions exist in the codebase
   - **Impact**: Complete failure of voice profile training functionality
   - **Code**: `VoiceSample` type missing properties: `source`, `metadata`, `isStarred`, `qualityLevel`, `tags`

2. **Invalid Assignment Type** - `VoiceLibraryDemo.tsx:159`
   - **Error**: `Type '"automatic"' is not assignable to type '"self" | "mentioned" | "pattern" | "manual"'`
   - **Root Cause**: Enum mismatch in voice identification modes
   - **Impact**: Voice identification mode selection fails

3. **Missing Lucide React Exports** - Multiple files
   - **Error**: `Module '"lucide-react"' has no exported member 'Waveform'` and `'Sort'`
   - **Impact**: UI icons fail to render, causing component crashes
   - **Files Affected**: 
     - `VoiceRecordingInterface.tsx:20`
     - `VoiceTrainingSampleManager.tsx:20,26`

4. **Unknown Type Assignments** - `VoiceRecordingInterface.tsx`
   - **Error**: `Argument of type 'unknown' is not assignable to parameter of type 'string | Error'`
   - **Lines**: 224, 283, 337, 378
   - **Root Cause**: Improper error handling in async operations
   - **Impact**: Runtime crashes during voice recording

### Hook Implementation Issues (High Priority)

5. **useLoadingState Hook Error** - `hooks/useLoadingState.ts:44`
   - **Error**: `Expected 0 arguments, but got 1`
   - **Root Cause**: Function signature mismatch
   - **Impact**: Loading state management fails across the application

6. **Missing Type Declarations** - `hooks/usePerformanceOptimization.ts:18`
   - **Error**: `Could not find a declaration file for module 'lodash-es'`
   - **Root Cause**: Missing `@types/lodash-es` dependency
   - **Impact**: Performance optimization features unavailable

### Security Module Failures (Critical)

7. **Type Safety Violations** - `/src/lib/security/`
   - **Error**: Multiple implicit 'any' types and type mismatches
   - **Files Affected**:
     - `index.ts:275,296` - Parameter types undefined
     - `monitoring.ts:556` - Status type mismatch
     - `middleware.ts:244` - Undefined `decodedToken` variable
     - `rateLimit.ts:76,105,276,288` - Redis configuration errors

8. **Missing Module Exports** - `security/testing.ts`
   - **Error**: Multiple missing exports from security modules
   - **Impact**: Security testing infrastructure completely broken

### Service Integration Problems (High Priority)

9. **React Hook Usage in Non-React Code** - `OptimizedRealtimeManager.ts`
   - **Error**: `Cannot find name 'useState'`, `'useEffect'`
   - **Lines**: 620, 621, 623, 631
   - **Root Cause**: React hooks called outside React component context
   - **Impact**: Real-time service fails to initialize

10. **Missing Service Methods** - `MeetingServiceIntegration.ts:56`
    - **Error**: `Property 'startMeeting' does not exist on type '[]'`
    - **Root Cause**: Incorrect type assertion or missing service initialization
    - **Impact**: Meeting management completely broken

### Store Integration Failures (High Priority)

11. **Incomplete Type Definitions** - `stores/tests/storeIntegration.test.ts`
    - **Multiple Missing Properties**:
      - UserPreferences missing: `language`, `notifications`, `privacy`, `accessibility`
      - TranscriptEntry missing: `duration`, `meetingId`, `speakerName`, `language`, `isProcessed`
    - **Lines**: 114, 138, 163, 229, 252, 275, 353, 390
    - **Impact**: Store integration tests fail, data consistency issues

## 2. RUNTIME AND LOGIC ERRORS

### AI Service Integration Issues

12. **AIService Configuration Problems** - `services/universal-assistant/AIService.ts`
    - **Issue**: Hard-coded model mappings may fail for new model versions
    - **Risk**: Service fails when API models are updated
    - **Code Example**:
    ```typescript
    'claude-3-7-opus': 'claude-3-opus-20240229', // Incorrect mapping
    ```

13. **EnhancedAIService Rate Limiting** - `services/universal-assistant/EnhancedAIService.ts`
    - **Issue**: Rate limiting implementation doesn't account for provider-specific limits
    - **Impact**: Services may exceed rate limits causing API failures
    - **Root Cause**: Generic rate limiting applied to different providers

### Authentication Flow Problems

14. **AuthService Admin Claims Race Condition** - `services/firebase/AuthService.ts`
    - **Issue**: Admin claims API call may fail silently
    - **Lines**: 413-439
    - **Impact**: Admin users may not receive proper permissions
    - **Root Cause**: Missing error handling for claims API failures

15. **Firebase Authentication State Issues** - `AuthService.ts`
    - **Issue**: Token refresh logic may fail under poor network conditions
    - **Impact**: Users get logged out unexpectedly
    - **Line**: 452 - `getIdTokenResult(true)` force refresh

### State Management Inconsistencies

16. **Meeting Store Type Mismatches** - Multiple store files
    - **Issue**: Meeting type definitions inconsistent across stores
    - **Impact**: Data synchronization failures between different store modules
    - **Examples**: Meeting.transcript vs Meeting.transcriptEntries confusion

17. **Real-time Synchronization Problems** - `FirestoreRestService.ts`
    - **Issue**: Polling-based updates may miss rapid changes
    - **Lines**: 132-178 - Polling manager implementation
    - **Impact**: Real-time features not truly real-time, leading to stale data

### Audio Processing Issues

18. **UniversalAssistantCoordinator Memory Leaks** - `UniversalAssistantCoordinator.ts`
    - **Issue**: WebSocket connections and audio streams not properly cleaned up
    - **Lines**: 374-377, 386-394
    - **Impact**: Memory usage grows over time, eventual browser crashes
    - **Root Cause**: Incomplete cleanup in error scenarios

19. **Audio Manager Concurrency Issues** - `hooks/useUniversalAssistantClient.ts`
    - **Issue**: Race conditions in audio recording start/stop operations
    - **Lines**: 159-200, 202-224
    - **Impact**: Recording state inconsistencies, audio data corruption

## 3. ARCHITECTURAL AND DESIGN FLAWS

### Service Layer Problems

20. **Circular Dependencies** - Multiple service files
    - **Issue**: Services have circular import dependencies
    - **Impact**: Module initialization failures, undefined references
    - **Example**: AudioManager ↔ ConversationProcessor ↔ UniversalAssistantCoordinator

21. **Singleton Pattern Violations** - Various service classes
    - **Issue**: Multiple instances of services that should be singletons
    - **Impact**: State inconsistencies, resource waste
    - **Examples**: AuthService, AIService instances

### Error Handling Deficiencies

22. **Insufficient Error Boundaries** - Component tree
    - **Issue**: Many components lack proper error boundary wrapping
    - **Impact**: Single component failures crash entire app sections
    - **Solution Needed**: More granular error boundaries

23. **Firebase Error Handling** - Multiple files
    - **Issue**: Permission denied errors not gracefully handled
    - **Impact**: App crashes instead of showing user-friendly messages
    - **Files**: Most Firebase service integrations

### Performance Issues

24. **Inefficient Re-renders** - `hooks/useDashboard.ts`
    - **Issue**: Dashboard data refetched unnecessarily
    - **Lines**: 129-172 - loadDashboardData callback
    - **Impact**: Poor user experience, excessive API calls

25. **Memory Leaks in Polling** - `FirestoreRestService.ts`
    - **Issue**: Polling intervals not cleaned up on component unmount
    - **Lines**: 147-232 - PollingManager implementation
    - **Impact**: Background processes consume resources indefinitely

## 4. SECURITY VULNERABILITIES

### Authentication Bypass Risks

26. **Weak Token Validation** - Multiple API routes
    - **Issue**: Some routes don't properly validate Firebase ID tokens
    - **Impact**: Potential unauthorized access
    - **Risk Level**: High

27. **Admin Claims Validation** - `AuthService.ts`
    - **Issue**: Admin status determined by hardcoded email list
    - **Lines**: 324-325, 406-407
    - **Security Risk**: Easy to bypass if email spoofing occurs

### Data Exposure Issues

28. **Client-Side Secret Storage** - Environment configuration
    - **Issue**: Sensitive configuration exposed in client-side code
    - **Impact**: API keys and configuration potentially exposed
    - **Files**: Various config files

## 5. FIREBASE INTEGRATION PROBLEMS

### Database Query Issues

29. **Inefficient Queries** - `FirestoreRestService.ts`
    - **Issue**: Queries without proper indexing, client-side sorting
    - **Lines**: 429-450 - User meetings query
    - **Impact**: Poor performance, high read costs

30. **Transaction Failures** - Database operations
    - **Issue**: Complex operations not wrapped in transactions
    - **Impact**: Data inconsistency during concurrent operations

### Storage Integration Issues

31. **File Upload Race Conditions** - Storage services
    - **Issue**: Multiple file uploads may overwrite each other
    - **Impact**: Data loss, corrupted file states

## 6. API ROUTE VULNERABILITIES

### Input Validation Gaps

32. **TTS Route Input Validation** - `/api/universal-assistant/tts/route.ts`
    - **Issue**: Incomplete text validation, potential for abuse
    - **Lines**: 170-185
    - **Impact**: Service abuse, resource exhaustion

33. **AI Response Route** - `/api/universal-assistant/ai-response/route.ts`
    - **Issue**: Context injection vulnerabilities
    - **Lines**: 110-120
    - **Impact**: Potential prompt injection attacks

## 7. BROWSER COMPATIBILITY ISSUES

### WebRTC Implementation Problems

34. **Audio Context Management** - Audio processing services
    - **Issue**: Audio context not properly suspended/resumed
    - **Impact**: Safari/iOS compatibility issues

35. **MediaRecorder API Usage** - Recording components
    - **Issue**: Browser-specific codec handling not implemented
    - **Impact**: Recording failures on older browsers

## IMMEDIATE CRITICAL FIXES REQUIRED

### Priority 1 (Service Breaking)
1. Fix VoiceSample type definitions
2. Add missing lodash-es types
3. Fix React hooks usage in non-React contexts
4. Implement proper cleanup in UniversalAssistantCoordinator
5. Fix store type mismatches

### Priority 2 (User Experience)
1. Add comprehensive error boundaries
2. Fix authentication token refresh logic
3. Implement proper polling cleanup
4. Fix dashboard re-render issues
5. Add missing Lucide icon exports

### Priority 3 (Security & Performance)
1. Implement proper input validation
2. Fix admin claims validation
3. Add transaction wrapping for complex operations
4. Implement efficient database queries
5. Add proper browser compatibility checks

## ESTIMATED IMPACT

- **Critical Issues**: 15+ (Complete service failures)
- **High Priority Issues**: 20+ (Major functionality broken)
- **Medium Priority Issues**: 10+ (Performance and UX degradation)
- **Total Compilation Errors**: 50+
- **Runtime Failure Risk**: Very High
- **Security Risk Level**: High
- **User Experience Impact**: Severe

**⚠️ WARNING: This application requires extensive debugging and fixes before it can be safely deployed to production. Many core features are non-functional due to these critical issues.**



