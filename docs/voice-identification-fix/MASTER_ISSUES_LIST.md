# Voice Identification System - Master Issues List
## Generated: 2025-08-21

## Critical Architecture Issues

### 1. DeepgramSTT Integration Mismatch
**Severity:** CRITICAL
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/01-deepgram-integration.md`
- VoiceCapture and VoiceIdentificationCoordinator assume event emitter pattern
- DeepgramSTT uses callback properties (onTranscription, onInterimTranscription)
- No integration point between transcript flow and voice capture

### 2. Missing Firebase Storage Implementation
**Severity:** HIGH
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/02-firebase-storage.md`
- StorageService.uploadVoiceSample() not properly implemented
- No method to list/query voice samples by speaker
- Missing metadata storage for voice samples
- No cleanup/retention policy

### 3. VoiceLibraryService Method Mismatches
**Severity:** HIGH
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/03-voice-library-methods.md`
- Called methods that don't exist: getVoiceIdentity(), isVoiceIdentified(), updateLastSeen()
- Inconsistent return types and parameters
- Missing user ID mapping functionality

### 4. Type System Inconsistencies
**Severity:** MEDIUM
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/04-type-inconsistencies.md`
- TranscriptEntry missing fields in various places
- Meeting type doesn't support speaker tracking fields
- NeedsIdentification interface mismatches

### 5. UniversalAssistantCoordinator Integration Gap
**Severity:** CRITICAL
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/05-coordinator-integration.md`
- No connection between main coordinator and voice identification
- Transcript processing doesn't trigger voice capture
- Speaker changes not detected or processed

### 6. Audio Capture Pipeline Missing
**Severity:** HIGH
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/06-audio-capture.md`
- No actual audio chunk collection from DeepgramSTT
- Missing WebRTC/MediaRecorder integration
- No audio quality validation

### 7. Firebase Security Rules
**Severity:** HIGH
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/07-firebase-security.md`
- 403 errors on Firestore operations
- Missing rules for new collections
- Storage bucket permissions not configured

### 8. Speaker Identification Strategies Incomplete
**Severity:** MEDIUM
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/08-identification-strategies.md`
- Self-introduction detection not tested
- Name mention strategy has no user database
- Pattern matching has no training data

### 9. Post-Meeting Identification UI Issues
**Severity:** LOW
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/09-ui-integration.md`
- Component created but not integrated into meeting flow
- No route or navigation to the component
- Missing state management integration

### 10. Meeting Type Configuration Missing
**Severity:** MEDIUM
**Status:** OPEN
**File:** `/docs/voice-identification-fix/issues/10-meeting-type-config.md`
- meetingTypeId is required but not always provided
- No default meeting type configuration
- Meeting creation fails without proper type

## Dependencies Between Issues
- Issue #1 blocks #5, #6
- Issue #2 blocks #6
- Issue #3 blocks #8
- Issue #5 blocks #6, #8
- Issue #7 blocks all database operations
- Issue #10 blocks meeting creation

## Priority Order
1. Fix Issue #7 (Firebase Security) - Enable basic operations
2. Fix Issue #1 & #5 (Integration) - Core architecture
3. Fix Issue #2 & #6 (Audio Pipeline) - Data collection
4. Fix Issue #3 & #4 (Type System) - Code consistency
5. Fix Issue #8 (Strategies) - Functionality
6. Fix Issue #9 & #10 (UI/Config) - User experience