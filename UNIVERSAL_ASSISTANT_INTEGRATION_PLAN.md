# Universal Assistant Services Integration Plan

## Objective
Connect the actual Universal Assistant services (AudioManager, DeepgramSTT, FragmentProcessor, etc.) for real-time speech-to-text transcription while resolving SSR issues.

## Current State Analysis

### Working Components
- ✅ Basic meeting start/stop functionality
- ✅ Microphone permission handling
- ✅ UI state management (recording indicators)
- ✅ Meeting store integration
- ✅ Firebase authentication

### Issues to Resolve
- ❌ SSR errors with audio services accessing `window`/`AudioContext`
- ❌ Services trying to initialize on server side
- ❌ useUniversalAssistant hook not properly connected
- ❌ No actual audio processing or transcription

## Architecture Overview

```
User Speech → Microphone → AudioManager → DeepgramSTT → FragmentProcessor 
                                ↓                              ↓
                          Audio Buffers              Transcript Fragments
                                                              ↓
                                                   ConversationProcessor
                                                              ↓
                                                   Meeting Store → Firebase
```

## Implementation Strategy

### Phase 1: Service Isolation (Client-Only)
**Goal**: Ensure all audio services only run on client side

1. **Create Service Factory Pattern**
   - Build a service factory that lazy-loads services
   - Only initialize after component mount
   - Use dynamic imports for heavy services

2. **Wrap Browser APIs**
   - Create safe wrappers for AudioContext, MediaRecorder
   - Check for `window` existence before access
   - Provide mock implementations for SSR

### Phase 2: Service Integration
**Goal**: Connect all services in proper sequence

1. **AudioManager Integration**
   - Initialize with proper error handling
   - Connect to MediaStream from getUserMedia
   - Setup audio processing pipeline

2. **DeepgramSTT Connection**
   - Configure WebSocket connection
   - Handle authentication (API key from env)
   - Stream audio chunks for transcription

3. **Fragment Processing**
   - Connect FragmentProcessor to STT output
   - Aggregate fragments into sentences
   - Handle speaker diarization

4. **Store Synchronization**
   - Update meeting store with transcripts
   - Persist to Firebase in real-time
   - Handle offline scenarios

### Phase 3: Testing & Validation
**Goal**: Ensure reliable transcription

1. **Playwright Testing**
   - Mock microphone input for testing
   - Verify transcript appears in UI
   - Check Firebase persistence

2. **Error Recovery**
   - Handle network disconnections
   - Recover from service failures
   - Provide user feedback

## Technical Implementation Steps

### Step 1: Create Client-Only Service Container
```typescript
// services/universal-assistant/ClientServiceContainer.ts
class ClientServiceContainer {
  private services: Map<string, any> = new Map();
  private initialized = false;
  
  async initialize() {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    
    // Lazy load services
    const [
      { AudioManager },
      { DeepgramSTT },
      { FragmentProcessor },
      { ConversationProcessor }
    ] = await Promise.all([
      import('./AudioManager'),
      import('./DeepgramSTT'),
      import('./FragmentProcessor'),
      import('./ConversationProcessor')
    ]);
    
    // Initialize in sequence
    this.services.set('audio', new AudioManager());
    this.services.set('stt', new DeepgramSTT());
    this.services.set('fragment', new FragmentProcessor());
    this.services.set('conversation', new ConversationProcessor());
    
    this.initialized = true;
  }
  
  getService(name: string) {
    return this.services.get(name);
  }
}
```

### Step 2: Update useUniversalAssistant Hook
```typescript
// hooks/useUniversalAssistant.ts
export function useUniversalAssistant() {
  const [container] = useState(() => new ClientServiceContainer());
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      container.initialize().then(() => {
        setIsReady(true);
      });
    }
  }, []);
  
  // Return safe methods that check isReady
  return {
    isReady,
    startRecording: async () => {
      if (!isReady) return;
      const audio = container.getService('audio');
      await audio.startRecording();
    },
    // ... other methods
  };
}
```

### Step 3: Fix SSR Issues in Services

For each service that uses browser APIs:

1. **AudioManager.ts**
   - Wrap AudioContext creation in client check
   - Use dynamic import for RecordRTC
   - Provide stub methods for SSR

2. **StreamingTTSService.ts**
   - Move AudioContext to lazy initialization
   - Check window before accessing
   - Use conditional loading

3. **VocalInterruptService.ts**
   - Defer command loading to client
   - Use dynamic imports for dependencies

### Step 4: Connect Services Pipeline

1. **Audio Flow**
   ```typescript
   AudioManager.onAudioData((buffer) => {
     deepgramSTT.processAudio(buffer);
   });
   ```

2. **Transcription Flow**
   ```typescript
   deepgramSTT.onTranscript((transcript) => {
     fragmentProcessor.addFragment(transcript);
     meetingStore.addTranscriptEntry(transcript);
   });
   ```

3. **Fragment Aggregation**
   ```typescript
   fragmentProcessor.onComplete((sentence) => {
     conversationProcessor.processSentence(sentence);
   });
   ```

## Subagent Utilization Plan

### 1. **codebase-navigator**
- Map all service dependencies
- Trace audio data flow
- Identify SSR problem areas

### 2. **architect-reviewer**
- Review service architecture
- Validate client/server separation
- Ensure proper error boundaries

### 3. **frontend-developer**
- Implement client-only wrappers
- Update React components
- Handle loading states

### 4. **backend-architect**
- Ensure API routes are SSR-safe
- Validate Deepgram integration
- Check Firebase configuration

### 5. **debugging-specialist**
- Fix SSR errors
- Resolve AudioContext issues
- Debug WebSocket connections

### 6. **test-automator**
- Create Playwright tests
- Mock audio inputs
- Verify transcription flow

### 7. **performance-engineer**
- Optimize service initialization
- Reduce bundle size
- Improve audio latency

## Playwright Testing Strategy

### Test Scenarios
1. **Service Initialization**
   - Verify services load on client only
   - Check for SSR errors
   - Confirm ready state

2. **Audio Recording**
   - Mock microphone input
   - Verify audio buffer creation
   - Check recording state

3. **Transcription Flow**
   - Inject test audio
   - Verify transcript appears
   - Check Firebase persistence

4. **Error Handling**
   - Simulate network failure
   - Test service recovery
   - Verify user feedback

### Mock Setup
```javascript
// playwright/mocks/audio.js
await page.evaluateOnNewDocument(() => {
  // Mock getUserMedia
  navigator.mediaDevices.getUserMedia = async () => {
    return createMockMediaStream();
  };
  
  // Mock AudioContext
  window.AudioContext = MockAudioContext;
});
```

## Context7 Integration

### Documentation Needs
1. **Deepgram SDK**
   - WebSocket API setup
   - Audio streaming format
   - Error handling

2. **RecordRTC**
   - Browser compatibility
   - Audio configuration
   - Buffer management

3. **Firebase Realtime**
   - Transcript structure
   - Offline persistence
   - Security rules

## Success Criteria

1. **Functionality**
   - [ ] Real-time transcription appears in UI
   - [ ] No SSR errors in console
   - [ ] Transcripts persist to Firebase
   - [ ] Audio indicators work correctly

2. **Performance**
   - [ ] < 500ms transcription latency
   - [ ] Smooth audio streaming
   - [ ] No memory leaks

3. **Reliability**
   - [ ] Graceful error handling
   - [ ] Service recovery
   - [ ] Offline support

## Risk Mitigation

1. **SSR Issues**
   - Risk: Services crash on server
   - Mitigation: Strict client-only checks

2. **API Keys**
   - Risk: Deepgram key exposed
   - Mitigation: Server-side proxy

3. **Browser Compatibility**
   - Risk: Audio APIs not supported
   - Mitigation: Feature detection & fallbacks

## Implementation Order

1. Fix SSR issues in existing services
2. Create client-only service container
3. Update useUniversalAssistant hook
4. Connect service pipeline
5. Test with Playwright
6. Deploy and monitor

## Monitoring & Debugging

- Console logs for service initialization
- Network tab for WebSocket traffic
- React DevTools for state updates
- Firebase console for data persistence

This plan ensures a systematic approach to integrating the Universal Assistant services while maintaining stability and preventing SSR issues.