# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server (runs on http://localhost:3000)
- `npm run build` - Build the Next.js application
- `npm run start` - Start production server
- `npm run lint` - Run ESLint code linting

### Testing Structure
- Tests are organized in `/tests/` directory with three levels:
  - `tests/unit/` - Unit tests
  - `tests/integration/` - Integration tests  
  - `tests/e2e/` - End-to-end tests
- Jest is configured but test command should be verified if needed

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
- Requires Firebase configuration for authentication and database
- AI API keys needed for OpenAI and Anthropic services
- Deepgram API key for speech-to-text
- ElevenLabs API key for text-to-speech

### Recent Development Focus
Based on git status, active development includes:
- ConversationProcessor enhancement
- FragmentProcessor improvements  
- NameRecognitionService implementation
- SpeakerIdentificationService updates

### Code Architecture Patterns
- Event-driven architecture with ConversationEvent types
- Plugin-based rule system for meeting customization
- Multi-modal AI integration with cost optimization
- Service-oriented design with clear boundaries
- Type-safe development with comprehensive TypeScript types

### Improvement areas
 // SDK (more features)
  const audioStream = await elevenlabs.textToSpeech.convert(voiceId,
  {
    text, modelId: "eleven_multilingual_v2"
  });


### Model Configuration
When working with AI models, the system supports both OpenAI and Anthropic providers. Google/Gemini references have been removed from the codebase. Use the modelConfigs system for adding new models or modifying existing ones.

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



