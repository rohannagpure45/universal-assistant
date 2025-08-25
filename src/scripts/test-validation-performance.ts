/**
 * Performance Test for Voice Validation
 * 
 * This test reveals the ACTUAL performance impact of validation
 */

import { VoiceValidator, validationCache } from '../utils/voice-validation';

// Simulate real Firebase data
const mockFirebaseSample = {
  url: '/audio/sample_123.webm',
  transcript: 'This is a test voice sample with typical transcript length for meeting recording',
  quality: 0.85,
  duration: 12.5,
  timestamp: { 
    toDate: () => new Date('2024-01-20T10:30:00Z') 
  },
  deepgramVoiceId: 'dg_voice_abc123',
  meetingId: 'meeting_xyz789',
  confidence: 0.92
};

// Test with varying data sizes
const testScenarios = [
  { name: 'Single sample', count: 1 },
  { name: 'Small meeting (10 samples)', count: 10 },
  { name: 'Medium meeting (50 samples)', count: 50 },
  { name: 'Large meeting (100 samples)', count: 100 },
  { name: 'Very large dataset (500 samples)', count: 500 }
];

console.log('Voice Validation Performance Test\n');
console.log('=================================\n');

// Warm up JIT
for (let i = 0; i < 100; i++) {
  VoiceValidator.sanitize(mockFirebaseSample);
}
validationCache.clear();

// Run tests
for (const scenario of testScenarios) {
  const samples = Array(scenario.count).fill(null).map((_, i) => ({
    ...mockFirebaseSample,
    id: `sample_${i}`,
    url: `/audio/sample_${i}.webm`
  }));
  
  // Test without cache
  validationCache.clear();
  const startNoCache = performance.now();
  for (const sample of samples) {
    VoiceValidator.sanitize(sample);
  }
  const durationNoCache = performance.now() - startNoCache;
  
  // Test with cache (second pass)
  const startWithCache = performance.now();
  for (const sample of samples) {
    const cached = validationCache.get(sample.id);
    if (!cached) {
      VoiceValidator.sanitize(sample);
    }
  }
  const durationWithCache = performance.now() - startWithCache;
  
  // Calculate overhead
  const perSampleNoCache = durationNoCache / scenario.count;
  const perSampleWithCache = durationWithCache / scenario.count;
  
  console.log(`${scenario.name}:`);
  console.log(`  Total time (no cache): ${durationNoCache.toFixed(2)}ms`);
  console.log(`  Total time (with cache): ${durationWithCache.toFixed(2)}ms`);
  console.log(`  Per sample (no cache): ${perSampleNoCache.toFixed(3)}ms`);
  console.log(`  Per sample (with cache): ${perSampleWithCache.toFixed(3)}ms`);
  
  // Show performance warnings
  if (perSampleNoCache > 10) {
    console.log(`  ⚠️  WARNING: Validation exceeds 10ms per sample!`);
  }
  if (durationNoCache > 100) {
    console.log(`  🔴 CRITICAL: Total validation time exceeds 100ms!`);
  }
  console.log('');
}

// Show metrics
const metrics = VoiceValidator.getMetrics();
console.log('Aggregate Metrics:');
console.log(`  Total validations: ${metrics.totalCalls}`);
console.log(`  Average time: ${metrics.averageTime.toFixed(3)}ms`);
console.log(`  Slow validations (>10ms): ${metrics.slowValidations.length}`);

const cacheStats = validationCache.getStats();
console.log('\nCache Statistics:');
console.log(`  Cache size: ${cacheStats.size}`);
console.log(`  Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);

// Memory usage estimate
const estimatedMemoryPerSample = 500; // bytes (conservative estimate)
const totalMemory = cacheStats.size * estimatedMemoryPerSample;
console.log(`  Estimated memory usage: ${(totalMemory / 1024).toFixed(2)} KB`);

// Real-world impact calculation
console.log('\nReal-World Impact:');
console.log('During a 2-hour meeting with 5 participants:');
const meetingSamples = 500; // Typical for 2-hour meeting
const validationOverhead = meetingSamples * metrics.averageTime;
console.log(`  Expected validation overhead: ${validationOverhead.toFixed(0)}ms`);
console.log(`  UI blocking potential: ${(validationOverhead / 1000).toFixed(1)} seconds`);

if (validationOverhead > 5000) {
  console.log(`  🔴 UNACCEPTABLE: Over 5 seconds of blocking time!`);
}