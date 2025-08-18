# Phase 3 Transcription Pipeline Fix - Comprehensive Implementation Plan

## Executive Summary
The current Phase 3 implementation has the architecture but lacks actual working connections between services. This plan details how to fix the audio recording → transcription → display pipeline using the right subagents, continuous testing with Playwright, and Context7 for documentation.

## Current State Analysis

### What's Working ✅
- Service architecture exists (ClientServiceContainer)
- UI displays recording states correctly
- Firebase integration for persistence
- Meeting lifecycle management

### What's Broken ❌
- No actual audio capture from microphone
- No WebSocket connection to Deepgram
- Services not connected in working pipeline
- No transcripts appearing in UI

### Root Causes
1. `AudioManager.startRecording()` doesn't create MediaRecorder
2. `DeepgramSTT` doesn't establish WebSocket connection
3. Service pipeline not wired together
4. Simplified hook implementation bypasses real services

---

## Implementation Strategy

### Core Principle: Incremental Fix with Continuous Validation
- Fix one service at a time
- Test after each change with Playwright
- Verify with visual screenshots
- Check console logs for errors
- Monitor network tab for connections

---

## Detailed Implementation Plan

### STAGE 1: Audio Capture Fix
**Duration**: 2-3 hours  
**Risk Level**: Medium  
**Subagent**: `frontend-developer`

#### Step 1.1: Fix AudioManager Recording
**Subagent**: `frontend-developer`
**Context7**: Search for "MediaRecorder API" and "Web Audio API" documentation

```typescript
// Fix in AudioManager.ts
- Create actual MediaRecorder instance
- Capture audio chunks properly
- Set up proper audio constraints
- Handle chunk collection
```

**Testing with Playwright**:
```javascript
// Test microphone permission
await page.evaluate(() => navigator.mediaDevices.getUserMedia({ audio: true }));
// Check for MediaRecorder instance
await page.evaluate(() => window.MediaRecorder !== undefined);
// Verify audio context creation
await page.evaluate(() => new AudioContext().state);
```

**Visual Validation**:
- Screenshot recording indicator when active
- Check console for "MediaRecorder started" message
- Verify no permission errors

#### Step 1.2: Verify Audio Chunks
**Subagent**: `debugger`
**Task**: Add logging to verify audio chunks are being captured

```typescript
// Add debug logging
onDataAvailable: (event) => {
  console.log('Audio chunk captured:', event.data.size, 'bytes');
  if (this.onChunkCallback) {
    this.onChunkCallback(event.data);
  }
}
```

**Playwright Validation**:
```javascript
// Monitor console for chunk messages
await page.on('console', msg => {
  if (msg.text().includes('Audio chunk captured')) {
    console.log('✅ Audio chunks being captured');
  }
});
```

---

### STAGE 2: Deepgram WebSocket Connection
**Duration**: 3-4 hours  
**Risk Level**: High  
**Subagent**: `backend-architect`

#### Step 2.1: Fix Deepgram Connection
**Subagent**: `backend-architect`
**Context7**: Query "Deepgram WebSocket API" and "Deepgram SDK live transcription"

```typescript
// Fix in DeepgramSTT.ts
- Establish WebSocket connection properly
- Handle connection lifecycle
- Implement reconnection logic
- Add connection status tracking
```

**Implementation Tasks**:
1. Ensure API key is accessible
2. Create WebSocket with proper URL
3. Handle connection events
4. Implement heartbeat/keepalive

**Testing with Playwright**:
```javascript
// Check for WebSocket connection
await page.evaluate(() => {
  const sockets = [];
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(...args) {
    const ws = new OriginalWebSocket(...args);
    sockets.push({ url: args[0], readyState: ws.readyState });
    console.log('WebSocket created:', args[0]);
    return ws;
  };
});

// Wait and check network tab
await page.waitForTimeout(2000);
const requests = await page.evaluate(() => performance.getEntriesByType('resource'));
const wsConnection = requests.find(r => r.name.includes('deepgram'));
```

**Network Monitoring**:
```javascript
// Use Playwright network monitoring
page.on('websocket', ws => {
  console.log('WebSocket opened:', ws.url());
  ws.on('framereceived', frame => {
    console.log('WS frame received:', frame.payload);
  });
});
```

#### Step 2.2: Audio Chunk Transmission
**Subagent**: `integration-test-architect`
**Task**: Ensure audio chunks are sent to Deepgram

```typescript
// Connect AudioManager to DeepgramSTT
audioManager.onChunkCallback = (chunk) => {
  chunk.arrayBuffer().then(buffer => {
    deepgramSTT.sendAudioChunk(buffer);
    console.log('Sent audio chunk to Deepgram:', buffer.byteLength);
  });
};
```

**Playwright Validation**:
- Monitor WebSocket frames
- Check for outgoing binary data
- Verify chunk size and frequency

---

### STAGE 3: Transcript Processing Pipeline
**Duration**: 2-3 hours  
**Risk Level**: Low  
**Subagent**: `codebase-navigator`

#### Step 3.1: Connect Deepgram to FragmentProcessor
**Subagent**: `codebase-navigator`
**Task**: Trace data flow and connect services

```typescript
// In DeepgramSTT.ts
connection.on(LiveTranscriptionEvents.Transcript, (data) => {
  const transcript = data.channel?.alternatives?.[0]?.transcript;
  if (transcript) {
    // Send to FragmentProcessor
    this.onTranscription?.({
      transcript,
      confidence: data.channel?.alternatives?.[0]?.confidence || 0,
      timestamp: Date.now(),
      isFinal: data.is_final || false,
      speaker: data.channel?.alternatives?.[0]?.words?.[0]?.speaker
    });
  }
});
```

#### Step 3.2: Wire FragmentProcessor to Store
**Subagent**: `frontend-developer`
**Task**: Connect transcript updates to UI

use context7 to get documentation and playwright mcp to constantly check ui changes and make revisions.

```typescript
// In ClientServiceContainer.ts
fragmentProcessor.onCompleteFragment = (fragment) => {
  // Send to conversation processor
  conversationProcessor.processFragment(fragment);
  
  // Update meeting store
  const entry = {
    id: nanoid(),
    text: fragment.text,
    speakerId: fragment.speaker || 'Unknown',
    timestamp: new Date(),
    confidence: fragment.confidence,
    isFinal: true
  };
  
  onTranscriptEntry?.(entry);
};
```

**Playwright Testing**:
```javascript
// Wait for transcript to appear
await page.waitForSelector('[data-testid="transcript-entry"]', { timeout: 10000 });

// Check transcript content
const transcriptText = await page.textContent('.transcript-entry');
console.log('Transcript received:', transcriptText);

// Screenshot the transcript area
await page.screenshot({ 
  path: 'transcript-working.png',
  clip: { x: 0, y: 300, width: 800, height: 400 }
});
```

---

### STAGE 4: Integration Testing
**Duration**: 2 hours  
**Risk Level**: Low  
**Subagent**: `test-automator`

#### Step 4.1: End-to-End Test Suite
**Subagent**: `test-automator`
**Context7**: Query "Playwright audio testing" and "mock media devices"

```javascript
// Create comprehensive test suite
describe('Audio Transcription Pipeline', () => {
  test('Should capture and transcribe audio', async () => {
    // 1. Start meeting
    await page.click('[data-testid="start-meeting"]');
    
    // 2. Grant microphone permission
    await context.grantPermissions(['microphone']);
    
    // 3. Verify recording started
    await expect(page.locator('.recording-indicator')).toBeVisible();
    
    // 4. Inject test audio
    await page.evaluate(() => {
      // Create mock audio stream
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      oscillator.connect(audioContext.destination);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 1000);
    });
    
    // 5. Wait for transcript
    await page.waitForSelector('.transcript-entry', { timeout: 5000 });
    
    // 6. Verify transcript in Firebase
    const transcript = await page.textContent('.transcript-entry');
    expect(transcript).toBeTruthy();
  });
});
```

#### Step 4.2: Visual Regression Testing
**Subagent**: `test-automator` with Playwright

```javascript
// Visual regression tests
const scenarios = [
  { name: 'idle', action: null },
  { name: 'recording', action: () => page.click('[data-testid="start-meeting"]') },
  { name: 'transcript-visible', action: () => page.waitForSelector('.transcript-entry') },
  { name: 'multiple-transcripts', action: () => page.waitForSelector('.transcript-entry:nth-child(3)') }
];

for (const scenario of scenarios) {
  if (scenario.action) await scenario.action();
  await page.screenshot({ 
    path: `visual-test-${scenario.name}.png`,
    fullPage: true 
  });
}
```

---

### STAGE 5: Performance & Reliability
**Duration**: 2 hours  
**Risk Level**: Low  
**Subagent**: `performance-engineer`

#### Step 5.1: Optimize Audio Processing
**Subagent**: `performance-engineer`
**Task**: Ensure < 500ms latency

```typescript
// Performance monitoring
const startTime = performance.now();
audioManager.onChunkCallback = (chunk) => {
  const processingStart = performance.now();
  // ... process chunk
  const processingTime = performance.now() - processingStart;
  if (processingTime > 100) {
    console.warn(`Slow chunk processing: ${processingTime}ms`);
  }
};
```

#### Step 5.2: Add Resilience
**Subagent**: `backend-architect`
**Task**: Implement reconnection and error recovery

```typescript
// Reconnection logic for Deepgram
let reconnectAttempts = 0;
const maxReconnects = 5;

const connectWithRetry = async () => {
  try {
    await deepgramSTT.connect();
    reconnectAttempts = 0;
  } catch (error) {
    if (reconnectAttempts < maxReconnects) {
      reconnectAttempts++;
      setTimeout(connectWithRetry, 1000 * Math.pow(2, reconnectAttempts));
    }
  }
};
```

---

### STAGE 6: Firebase Verification
**Duration**: 1 hour  
**Risk Level**: Low  
**Subagent**: `database-optimizer`

#### Step 6.1: Verify Transcript Persistence
**Subagent**: `database-optimizer`
**Task**: Ensure transcripts save to Firebase

```javascript
// Playwright test for Firebase
await page.evaluate(async () => {
  const { getFirestore, collection, onSnapshot } = await import('firebase/firestore');
  const db = getFirestore();
  
  return new Promise((resolve) => {
    onSnapshot(collection(db, 'transcripts'), (snapshot) => {
      const transcripts = snapshot.docs.map(doc => doc.data());
      console.log('Firebase transcripts:', transcripts);
      resolve(transcripts.length > 0);
    });
  });
});
```

---

## Testing Protocol

### After Each Stage:
1. **Build Check**: `npm run build` - Must pass
2. **Lint Check**: `npm run lint` - No errors
3. **Console Check**: No errors in browser console
4. **Network Check**: Verify expected connections
5. **Visual Check**: Screenshot with Playwright
6. **Data Check**: Verify Firebase updates

### Continuous Monitoring with Playwright:
```javascript
// Run this continuously during development
const monitorPage = async () => {
  // Console monitoring
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ Console error:', msg.text());
    }
  });
  
  // Network monitoring
  page.on('response', response => {
    if (!response.ok() && !response.url().includes('analytics')) {
      console.error('❌ Network error:', response.url(), response.status());
    }
  });
  
  // WebSocket monitoring
  page.on('websocket', ws => {
    console.log('🔌 WebSocket:', ws.url());
    ws.on('close', () => console.log('🔌 WebSocket closed'));
    ws.on('framereceived', frame => {
      if (frame.payload.includes('transcript')) {
        console.log('✅ Transcript received via WebSocket');
      }
    });
  });
};
```

---

## Subagent Assignment Summary

| Stage | Primary Subagent | Supporting Subagents | Context7 Queries |
|-------|-----------------|---------------------|------------------|
| Audio Capture | `frontend-developer` | `debugger` | MediaRecorder API, Web Audio API |
| Deepgram Connection | `backend-architect` | `integration-test-architect` | Deepgram WebSocket API, SDK docs |
| Pipeline Wiring | `codebase-navigator` | `frontend-developer` | - |
| Integration Testing | `test-automator` | - | Playwright audio testing |
| Performance | `performance-engineer` | `backend-architect` | - |
| Firebase | `database-optimizer` | - | Firestore real-time |

---

## Success Criteria

### Stage 1 Success:
- [ ] Console shows "Audio chunk captured" messages
- [ ] MediaRecorder instance exists
- [ ] No permission errors

### Stage 2 Success:
- [ ] WebSocket connection to wss://api.deepgram.com visible
- [ ] Outgoing binary frames in network tab
- [ ] Connection stays alive for > 30 seconds

### Stage 3 Success:
- [ ] Transcript entries appear in UI
- [ ] Console shows transcript text
- [ ] Meeting store updates with entries

### Stage 4 Success:
- [ ] All integration tests pass
- [ ] Visual regression tests complete
- [ ] No console errors

### Stage 5 Success:
- [ ] < 500ms from speech to transcript display
- [ ] Automatic reconnection works
- [ ] No memory leaks after 5 minutes

### Stage 6 Success:
- [ ] Transcripts visible in Firebase console
- [ ] Real-time sync working
- [ ] Persistence across page refreshes

---

## Rollback Strategy

If any stage fails:
1. Git stash current changes
2. Revert to last working commit
3. Re-run build to verify stability
4. Analyze failure logs
5. Adjust approach and retry

---

## Time Estimate

- **Stage 1**: 2-3 hours
- **Stage 2**: 3-4 hours
- **Stage 3**: 2-3 hours
- **Stage 4**: 2 hours
- **Stage 5**: 2 hours
- **Stage 6**: 1 hour
- **Total**: 12-15 hours

---

## Context Recovery

If implementation is interrupted:
1. Check current git status
2. Review last successful Playwright screenshot
3. Check console for last successful stage
4. Review this plan for next step
5. Continue from last checkpoint

---

## Notes

- Each stage is independently valuable
- Can pause after any stage with working system
- Playwright tests provide continuous validation
- Context7 provides real-time documentation support
- Subagents handle specialized tasks for efficiency