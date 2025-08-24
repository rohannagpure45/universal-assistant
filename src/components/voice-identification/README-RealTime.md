# Real-Time Voice Identification Components (Phase 3)

This document provides comprehensive guidance on using the real-time voice identification UI components for Phase 3 of the Universal Assistant project.

## Overview

The real-time voice identification system consists of four main components that work together to provide seamless speaker identification during live meetings:

1. **LiveSpeakerIndicator** - Shows current speaker with confidence indicators
2. **VoiceActivityVisualizer** - Real-time audio waveform and VAD visualization
3. **SpeakerIdentificationOverlay** - Non-intrusive overlay with comprehensive speaker info
4. **UnknownSpeakerAlert** - Intelligent alerts for unknown speaker detection

## Components

### 1. LiveSpeakerIndicator

Displays the current active speaker with real-time updates and confidence indicators.

**Key Features:**
- Real-time speaker identification display
- Voice activity visualization (speaking/not speaking states)
- Speaker transition animations
- Multi-speaker session overview
- Integration with DeepgramSTT speaker diarization data

**Usage:**
```tsx
import { LiveSpeakerIndicator, useLiveSpeakerData } from '@/components/voice-identification';

const MyComponent = () => {
  const liveSpeakerData = useLiveSpeakerData();
  
  // Update from transcript entries (typically from DeepgramSTT)
  const handleTranscriptUpdate = (entry: TranscriptEntry) => {
    liveSpeakerData.updateFromTranscript(entry);
  };
  
  return (
    <LiveSpeakerIndicator
      currentSpeaker={liveSpeakerData.currentSpeaker}
      allSpeakers={liveSpeakerData.allSpeakers}
      voiceActivity={liveSpeakerData.voiceActivity}
      audioLevel={liveSpeakerData.audioLevel}
      onSpeakerClick={handleSpeakerSelect}
      onIdentifySpeaker={handleIdentifyRequest}
      showAllSpeakers={true}
      showConfidence={true}
      showVoiceActivity={true}
    />
  );
};
```

### 2. VoiceActivityVisualizer

Provides real-time audio visualization with waveform display and voice activity detection.

**Key Features:**
- Real-time waveform visualization
- Voice activity detection indicators
- Frequency spectrum analysis
- Audio level monitoring
- Performance-optimized canvas rendering

**Usage:**
```tsx
import { VoiceActivityVisualizer, useVoiceActivity } from '@/components/voice-identification';

const MyComponent = () => {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const voiceActivity = useVoiceActivity(audioStream);
  
  const handleVoiceActivityChange = (isActive: boolean, level: number) => {
    console.log('Voice activity:', isActive, 'Level:', level);
  };
  
  return (
    <VoiceActivityVisualizer
      audioStream={audioStream}
      onVoiceActivityChange={handleVoiceActivityChange}
      showControls={true}
      showDebugInfo={false}
      enabled={true}
      style={{
        height: 120,
        showWaveform: true,
        showFrequencyBars: true,
        showVolumeIndicator: true
      }}
    />
  );
};
```

### 3. SpeakerIdentificationOverlay

A comprehensive, draggable overlay showing real-time speaker information and session statistics.

**Key Features:**
- Non-intrusive overlay interface
- Real-time confidence scores
- Speaker transition notifications
- Session statistics and analytics
- Minimizable/expandable design
- Draggable positioning

**Usage:**
```tsx
import { 
  SpeakerIdentificationOverlay, 
  useSpeakerIdentificationOverlay 
} from '@/components/voice-identification';

const MyComponent = () => {
  const overlayState = useSpeakerIdentificationOverlay();
  
  // Add events as they happen
  const addIdentificationEvent = (type, speakerId, confidence) => {
    overlayState.addEvent({ type, speakerId, confidence });
  };
  
  return (
    <SpeakerIdentificationOverlay
      currentSpeaker={currentSpeaker}
      allSpeakers={allSpeakers}
      sessionStats={overlayState.sessionStats}
      identificationEvents={overlayState.events}
      onSpeakerSelect={handleSpeakerSelect}
      onIdentifyRequest={handleIdentifyRequest}
      visible={true}
      config={{
        position: 'top-right',
        minimizable: true,
        draggable: true,
        autoHide: false
      }}
    />
  );
};
```

### 4. UnknownSpeakerAlert

Intelligent alerting system for unknown speaker detection with configurable thresholds and batching.

**Key Features:**
- Smart alerting that avoids spam
- Batch similar events within time windows
- Context-aware identification suggestions
- Quick action buttons for voice training
- Integration with NeedsIdentificationService
- Configurable behavior and thresholds

**Usage:**
```tsx
import { 
  UnknownSpeakerAlert, 
  useUnknownSpeakerDetection 
} from '@/components/voice-identification';

const MyComponent = () => {
  const detection = useUnknownSpeakerDetection();
  
  // Update unknown speakers as they're detected
  const handleUnknownSpeaker = (speakerData: LiveSpeakerData) => {
    if (!speakerData.isIdentified) {
      detection.updateUnknownSpeaker(speakerData);
    }
  };
  
  const handleIdentificationAction = (action: IdentificationAction) => {
    console.log('Identification action:', action);
    // Integrate with your identification service
  };
  
  return (
    <UnknownSpeakerAlert
      unknownSpeakers={detection.unknownSpeakers}
      config={detection.config}
      onIdentificationAction={handleIdentificationAction}
      onRequestVoiceTraining={handleVoiceTraining}
      onRequestManualId={handleManualIdentification}
      enabled={true}
    />
  );
};
```

## Integration Guide

### Complete Integration Example

Here's how to integrate all components together:

```tsx
import {
  LiveSpeakerIndicator,
  VoiceActivityVisualizer,
  SpeakerIdentificationOverlay,
  UnknownSpeakerAlert,
  useLiveSpeakerData,
  useVoiceActivity,
  useSpeakerIdentificationOverlay,
  useUnknownSpeakerDetection
} from '@/components/voice-identification';

const RealTimeVoiceIdentification = () => {
  // Component state hooks
  const liveSpeakerData = useLiveSpeakerData();
  const voiceActivity = useVoiceActivity();
  const overlayState = useSpeakerIdentificationOverlay();
  const unknownDetection = useUnknownSpeakerDetection();
  
  // Audio stream state
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Integration with existing services
  useEffect(() => {
    const coordinator = new VoiceIdentificationCoordinator(meeting, deepgramService);
    
    // Set up transcript processing callback
    deepgramService.setTranscriptionHandler((result) => {
      const transcriptEntry = convertToTranscriptEntry(result);
      
      // Update live speaker data
      liveSpeakerData.updateFromTranscript(transcriptEntry);
      
      // Update voice activity
      voiceActivity.updateVoiceActivity(true, result.audioLevel || 0.5);
      
      // Handle unknown speakers
      if (!transcriptEntry.isIdentified) {
        const speakerData = createLiveSpeakerData(transcriptEntry);
        unknownDetection.updateUnknownSpeaker(speakerData);
      }
      
      // Add overlay event
      overlayState.addEvent({
        type: 'speaker_detected',
        speakerId: transcriptEntry.speakerId,
        confidence: transcriptEntry.confidence
      });
    });
  }, []);
  
  return (
    <div className="relative">
      {/* Main UI */}
      <div className="grid grid-cols-2 gap-4">
        <LiveSpeakerIndicator
          currentSpeaker={liveSpeakerData.currentSpeaker}
          allSpeakers={liveSpeakerData.allSpeakers}
          voiceActivity={liveSpeakerData.voiceActivity}
          audioLevel={liveSpeakerData.audioLevel}
        />
        
        <VoiceActivityVisualizer
          audioStream={audioStream}
          enabled={isRecording}
        />
      </div>
      
      {/* Overlay Components */}
      <SpeakerIdentificationOverlay
        currentSpeaker={liveSpeakerData.currentSpeaker}
        allSpeakers={liveSpeakerData.allSpeakers}
        sessionStats={overlayState.sessionStats}
        identificationEvents={overlayState.events}
      />
      
      <UnknownSpeakerAlert
        unknownSpeakers={unknownDetection.unknownSpeakers}
        config={unknownDetection.config}
        onIdentificationAction={handleIdentificationAction}
      />
    </div>
  );
};
```

### Service Integration Points

#### 1. AudioManager Integration

```tsx
// Connect with AudioManager for audio stream
const audioManager = new AudioManager();

audioManager.startRecording((audioChunk) => {
  // Audio chunk processing happens automatically
  // Voice activity is detected via Web Audio API
});

// Get audio stream for visualization
const audioStream = audioManager.getAudioStream();
```

#### 2. DeepgramSTT Integration

```tsx
// Set up Deepgram transcription handler
deepgramService.setTranscriptionHandler((result) => {
  const transcriptEntry: TranscriptEntry = {
    id: generateId(),
    meetingId: meeting.id,
    text: result.transcript,
    speakerId: result.speaker?.toString() || 'unknown',
    speakerName: getSpeakerName(result.speaker),
    confidence: result.confidence,
    timestamp: new Date(),
    // ... other properties
  };
  
  // Update all components
  liveSpeakerData.updateFromTranscript(transcriptEntry);
});
```

#### 3. VoiceIdentificationCoordinator Integration

```tsx
// Initialize coordinator
const coordinator = new VoiceIdentificationCoordinator(meeting, deepgramService);

// Process transcripts through coordinator
coordinator.processTranscript({
  speaker: result.speaker,
  text: result.transcript,
  confidence: result.confidence,
  timestamp: Date.now()
});
```

## Configuration

### Component Configuration Options

Each component supports extensive configuration:

```tsx
// Voice Activity Visualizer Configuration
const visualizerConfig = {
  fftSize: 512,
  smoothingTimeConstant: 0.8,
  voiceFrequencyRange: [300, 3400], // Hz
  updateInterval: 50, // ms
};

// Unknown Speaker Alert Configuration
const alertConfig = {
  minimumDuration: 5, // seconds
  minimumConfidence: 0.6,
  minimumMessages: 2,
  alertDelay: 2000, // ms
  batchSimilarAlerts: true,
  suppressRepeatedAlerts: true,
};

// Overlay Configuration
const overlayConfig = {
  position: 'top-right',
  minimizable: true,
  draggable: true,
  autoHide: false,
  maxSpeakersDisplay: 6,
};
```

## Performance Considerations

### Optimization Tips

1. **Canvas Rendering**: The VoiceActivityVisualizer uses optimized canvas rendering with requestAnimationFrame
2. **Audio Processing**: Voice activity detection is throttled to reduce CPU usage
3. **Event Batching**: Unknown speaker alerts batch similar events to prevent spam
4. **Memory Management**: All components properly clean up resources on unmount

### Browser Compatibility

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Limited Web Audio API support
- **Edge**: Full support

## Testing

### Demo Component

Use the `RealTimeVoiceIdentificationDemo` component to test all features:

```tsx
import { RealTimeVoiceIdentificationDemo } from '@/components/voice-identification';

// Comprehensive demo with simulated data
<RealTimeVoiceIdentificationDemo />
```

### Unit Testing

Each component includes comprehensive TypeScript types and can be tested using React Testing Library:

```tsx
import { render, screen } from '@testing-library/react';
import { LiveSpeakerIndicator } from '@/components/voice-identification';

test('displays current speaker information', () => {
  const mockSpeaker = {
    speakerId: 'test-speaker',
    speakerName: 'John Doe',
    confidence: 0.95,
    isIdentified: true,
    // ... other properties
  };
  
  render(
    <LiveSpeakerIndicator
      currentSpeaker={mockSpeaker}
      allSpeakers={[mockSpeaker]}
      voiceActivity="speaking"
    />
  );
  
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

1. **Microphone Access Denied**: Components gracefully handle permission errors
2. **Audio Context Issues**: Web Audio API requires user interaction to start
3. **Performance Issues**: Adjust update intervals and visualization complexity
4. **Memory Leaks**: Ensure proper component cleanup on unmount

### Debug Mode

Enable debug information in components:

```tsx
<VoiceActivityVisualizer
  showDebugInfo={true}
  // Shows sample rate, buffer size, RMS level, etc.
/>
```

## Future Enhancements

Planned improvements for these components:

1. **Machine Learning**: Enhanced speaker recognition with ML models
2. **Multi-language**: Support for multiple languages and accents
3. **Cloud Integration**: Direct integration with cloud speech services
4. **Advanced Analytics**: Deeper speaker behavior analysis
5. **Accessibility**: Enhanced screen reader and keyboard navigation support

---

For more information, see the individual component documentation and the comprehensive demo implementation.