# Phase 3 Production Deployment Guide

## Overview

This guide outlines the deployment process for Phase 3 enhanced audio/speech features in the Universal Assistant system. Phase 3 introduces advanced real-time audio processing capabilities optimized for sub-500ms latency with comprehensive semantic analysis.

## Phase 3 Architecture Summary

### Core Components

#### 1. Enhanced Services
- **EnhancedAudioManager**: Voice activity detection, audio processing
- **EnhancedDeepgramSTT**: Real-time speech-to-text with streaming
- **FragmentProcessor**: Semantic analysis, intent detection, entity extraction
- **EnhancedMessageQueueManager**: Priority-based message processing
- **StreamingTTSService**: Real-time text-to-speech generation
- **VocalInterruptService**: Voice command processing and interrupts
- **VoiceProfileManager**: Speaker identification and voice profiles

#### 2. Phase 3C Orchestration Layer
- **RealtimeAudioPipeline**: Central orchestrator for all audio processing
- **LatencyOptimizer**: Sub-500ms performance optimization
- **PerformanceMonitor**: Real-time performance tracking and alerting

### Key Features
- **Sub-500ms latency** end-to-end processing
- **Semantic analysis** with intent detection, sentiment analysis, action item extraction
- **Voice activity detection** and speaker identification
- **Real-time interrupts** and voice commands
- **Adaptive quality control** and performance optimization
- **Comprehensive monitoring** and alerting

## Deployment Prerequisites

### Environment Requirements
- **Node.js**: 18.x or higher
- **TypeScript**: 5.x
- **Firebase**: Authentication, Firestore, Storage configured
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **CPU**: Multi-core processor (4+ cores recommended)

### API Keys and Services
- **Deepgram API**: Speech-to-text service
- **ElevenLabs API**: Text-to-speech service
- **OpenAI API**: AI response generation
- **Anthropic API**: Alternative AI provider
- **Firebase Service Account**: Backend operations

### Environment Variables
```bash
# Core services
DEEPGRAM_API_KEY=your_deepgram_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Firebase configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Performance settings
UNIVERSAL_ASSISTANT_TARGET_LATENCY=350
UNIVERSAL_ASSISTANT_MAX_LATENCY=500
UNIVERSAL_ASSISTANT_ENABLE_OPTIMIZATION=true

# Production settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

## Pre-Deployment Testing

### 1. Run Test Suite
```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run integration tests specifically
npm run test:integration

# Run Phase 3 specific tests
npm test -- tests/integration/phase3-integration.test.ts
```

### 2. Build Validation
```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

### 3. Performance Validation
```bash
# Start development server for testing
npm run dev

# Test latency performance
# Use built-in performance monitor to verify sub-500ms targets
```

## Deployment Steps

### 1. Database Migration
Ensure Firebase collections are properly structured:
```
/users/{userId}
/meetings/{meetingId}
/voiceProfiles/{profileId}
/transcripts/{meetingId}/entries/{entryId}
/customRules/{ruleId}
/performanceMetrics/{sessionId}
```

### 2. Service Configuration

#### Audio Processing Configuration
```typescript
// Configure enhanced audio manager
const audioConfig = {
  bufferSize: 1024,
  sampleRate: 16000,
  enableEchoCancellation: true,
  enableNoiseSuppression: true,
  latencyHint: 'interactive'
};
```

#### STT Service Configuration
```typescript
// Configure Deepgram STT
const sttConfig = {
  streamingEnabled: true,
  model: 'nova-2-general',
  language: 'en-US',
  interimResults: true,
  punctuation: true,
  profanityFilter: false,
  smartFormatting: true
};
```

#### TTS Service Configuration
```typescript
// Configure ElevenLabs TTS
const ttsConfig = {
  streamingEnabled: true,
  latencyOptimization: 'speed',
  qualityLevel: 'high',
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.5
  }
};
```

### 3. Performance Monitoring Setup

#### Initialize Performance Monitor
```typescript
import { performanceMonitor } from '@/services/universal-assistant/PerformanceMonitor';

// Start monitoring in production
performanceMonitor.startMonitoring();

// Set up alert handlers
performanceMonitor.onAlert = (alert) => {
  // Send to your monitoring service (e.g., Sentry, DataDog)
  console.error('Performance Alert:', alert);
};
```

#### Configure Latency Optimizer
```typescript
import { latencyOptimizer } from '@/services/universal-assistant/LatencyOptimizer';

// Configure for production
latencyOptimizer.updateConfig({
  targetLatency: 350,
  aggressiveMode: false,
  adaptiveThresholds: true,
  prioritizeAccuracy: false,
  enablePredictiveProcessing: true,
  maxQualityReduction: 0.2
});
```

### 4. Real-time Pipeline Setup

#### Initialize Pipeline
```typescript
import { RealtimeAudioPipeline } from '@/services/universal-assistant/RealtimeAudioPipeline';

const pipeline = new RealtimeAudioPipeline({
  targetLatency: 350,
  maxLatency: 500,
  enableLatencyOptimization: true,
  enableSemanticAnalysis: true,
  enableVoiceActivityDetection: true,
  enableSpeakerIdentification: true,
  enableVocalInterrupts: true,
  enableStreamingTTS: true,
  audioQuality: 'high',
  adaptiveQuality: true,
  prioritizeLatency: true
});

// Set up event handlers
pipeline.setEventListeners({
  onLatencyMeasured: (metrics) => {
    // Log performance metrics
    console.log('Latency:', metrics.totalLatency, 'ms');
  },
  onError: (error) => {
    // Handle pipeline errors
    console.error('Pipeline Error:', error);
  }
});
```

## Production Monitoring

### Key Metrics to Monitor

#### Performance Metrics
- **End-to-end latency**: Target <350ms, Max <500ms
- **Audio-to-transcription**: Target <100ms
- **Transcription-to-analysis**: Target <75ms
- **Analysis-to-response**: Target <125ms
- **Response-to-audio**: Target <50ms

#### Quality Metrics
- **Transcription accuracy**: >95%
- **Speaker identification accuracy**: >90%
- **Intent detection accuracy**: >85%
- **Error rate**: <1%

#### System Metrics
- **Memory usage**: Monitor for leaks
- **CPU utilization**: Target <70%
- **Cache hit rates**: TTS >80%, Voice profiles >70%
- **WebSocket connections**: Monitor stability

### Alerting Rules

#### Critical Alerts
- Latency > 1000ms (2x max threshold)
- Error rate > 5%
- Service downtime
- Memory usage > 90%

#### Warning Alerts
- Latency > 500ms (max threshold)
- Error rate > 1%
- Target achievement rate < 80%
- Cache hit rate < 60%

### Performance Dashboard

Monitor the following in your production dashboard:

```typescript
// Example monitoring setup
setInterval(async () => {
  const report = performanceMonitor.generatePerformanceReport();
  
  // Send metrics to your monitoring service
  await sendMetrics({
    latency_mean: report.latencyStats.mean,
    latency_p95: report.latencyStats.p95,
    throughput: report.throughputStats.requestsPerSecond,
    error_rate: report.errorStats.errorRate,
    performance_score: report.score.overall
  });
}, 60000); // Every minute
```

## Troubleshooting

### Common Issues

#### High Latency
1. Check network connectivity to external APIs
2. Review audio buffer configuration
3. Verify TTS cache performance
4. Check semantic analysis depth setting

#### Poor Transcription Quality
1. Verify Deepgram API key and quotas
2. Check audio input quality
3. Review microphone permissions
4. Validate audio format configuration

#### Memory Leaks
1. Monitor fragment processor cache size
2. Check TTS cache cleanup
3. Verify voice profile memory usage
4. Review conversation history limits

#### Voice Command Issues
1. Verify VocalInterruptService configuration
2. Check keyword sensitivity settings
3. Review command detection thresholds
4. Validate interrupt handling logic

### Log Analysis

#### Key Log Patterns to Monitor
```bash
# Performance warnings
grep "exceeding target latency" logs/

# Error patterns
grep "ERROR" logs/ | grep -E "(STT|TTS|semantic|pipeline)"

# Memory warnings
grep "memory" logs/ | grep -i "warning\|error"

# Cache issues
grep "cache" logs/ | grep -E "(miss|error|full)"
```

## Rollback Procedures

### Quick Rollback
1. Disable Phase 3 features:
```typescript
// Emergency disable
realtimeAudioPipeline.updateConfig({
  enableSemanticAnalysis: false,
  enableLatencyOptimization: false,
  enableVocalInterrupts: false
});
```

2. Fall back to Phase 2 services if needed
3. Monitor system stability

### Full Rollback
1. Deploy previous version
2. Restore database state if needed
3. Update environment variables
4. Restart services

## Performance Optimization

### Production Tuning

#### For Low-Latency Priority
```typescript
// Aggressive latency optimization
latencyOptimizer.updateConfig({
  aggressiveMode: true,
  maxQualityReduction: 0.3
});

pipeline.updateConfig({
  audioQuality: 'medium',
  prioritizeLatency: true
});
```

#### For High-Quality Priority
```typescript
// Quality-focused configuration
pipeline.updateConfig({
  audioQuality: 'ultra',
  prioritizeLatency: false,
  adaptiveQuality: false
});
```

#### Adaptive Configuration
```typescript
// Automatically adjust based on performance
pipeline.setEventListeners({
  onLatencyMeasured: (metrics) => {
    if (metrics.performanceRating === 'poor') {
      latencyOptimizer.optimizeForTarget(metrics.targetLatency);
    }
  }
});
```

## Security Considerations

### API Key Security
- Store API keys in secure environment variables
- Rotate keys regularly
- Use least-privilege access patterns
- Monitor API usage for anomalies

### Data Privacy
- Ensure voice data is not logged inappropriately
- Implement proper data retention policies
- Follow GDPR/privacy compliance requirements
- Secure voice profile storage

### Network Security
- Use HTTPS for all external API calls
- Implement proper CORS policies
- Validate all input data
- Monitor for suspicious activity patterns

## Maintenance

### Regular Tasks

#### Daily
- Review performance metrics
- Check error logs
- Verify service health
- Monitor API quotas

#### Weekly
- Analyze performance trends
- Review cache statistics
- Update performance baselines
- Check for memory leaks

#### Monthly
- Performance optimization review
- API key rotation
- Dependency updates
- Capacity planning review

### Updates and Patches

1. Test updates in staging environment
2. Verify compatibility with Phase 3 services
3. Run full test suite
4. Monitor performance after deployment
5. Have rollback plan ready

## Support and Documentation

### Internal Documentation
- API reference documentation
- Service integration guides
- Troubleshooting runbooks
- Performance tuning guides

### External Resources
- Deepgram API documentation
- ElevenLabs API documentation
- Firebase documentation
- Next.js deployment guides

### Team Training
- Phase 3 architecture overview
- Performance monitoring procedures
- Troubleshooting workflows
- Emergency response procedures

## Success Criteria

### Launch Criteria
- [ ] All tests passing
- [ ] Performance targets met (sub-500ms)
- [ ] Monitoring and alerting configured
- [ ] Security review completed
- [ ] Team training completed
- [ ] Rollback procedures tested

### Post-Launch Metrics
- 95% of requests under 500ms latency
- 80% of requests under 350ms target
- <1% error rate
- >95% uptime
- User satisfaction scores maintained or improved

## Conclusion

Phase 3 represents a significant advancement in the Universal Assistant's real-time audio processing capabilities. The deployment requires careful attention to performance monitoring, proper configuration of all services, and ongoing optimization to maintain sub-500ms latency targets.

The comprehensive test suite, performance monitoring, and optimization tools provided ensure that the system can maintain high performance in production while providing advanced semantic analysis and voice interaction capabilities.

For additional support or questions during deployment, refer to the troubleshooting section or contact the development team.