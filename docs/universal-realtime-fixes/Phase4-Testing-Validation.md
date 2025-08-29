# Phase 4: Testing & Validation - Detailed Implementation Plan

## Overview
**Duration**: 3 hours  
**Priority**: CRITICAL - Quality assurance before production  
**Risk Level**: LOW - Testing phase, no production changes  
**Prerequisites**: Phases 1, 2, and 3 must be completed

## Testing Objectives

1. **Verify all bug fixes work correctly**
2. **Ensure no regressions introduced**
3. **Validate performance improvements**
4. **Confirm memory stability**
5. **Test cross-browser compatibility**
6. **Load test with realistic scenarios**

## Test Implementation

### Step 1: Unit Test Suite (1 hour)

#### 1.1 Create Comprehensive Test File
```typescript
// File: src/services/firebase/__tests__/UniversalRealtimeService.test.ts

import { UniversalRealtimeService } from '../UniversalRealtimeService';
import * as firestore from 'firebase/firestore';
import { waitFor } from '@testing-library/react';

// Mock Firebase
jest.mock('firebase/firestore');

describe('UniversalRealtimeService - Complete Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clean service state
    UniversalRealtimeService.cleanupAll();
  });
  
  afterEach(() => {
    UniversalRealtimeService.cleanupAll();
  });
  
  describe('Core Functionality', () => {
    test('should create listener successfully', () => {
      const cleanup = UniversalRealtimeService.createListener(
        'test-1',
        {} as any,
        jest.fn()
      );
      
      expect(UniversalRealtimeService.getListenerCount()).toBe(1);
      expect(UniversalRealtimeService.isListenerActive('test-1')).toBe(true);
      
      cleanup();
      expect(UniversalRealtimeService.getListenerCount()).toBe(0);
    });
    
    test('should handle document listeners', async () => {
      const mockDoc = { exists: () => true, id: 'doc1', data: () => ({ test: true }) };
      (firestore.getDoc as jest.Mock).mockResolvedValue(mockDoc);
      
      const callback = jest.fn();
      const cleanup = UniversalRealtimeService.createDocumentListener(
        'doc-test',
        {} as any,
        callback
      );
      
      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(expect.objectContaining({ id: 'doc1' }));
      });
      
      cleanup();
    });
  });
  
  describe('P0 Bug Fixes', () => {
    describe('Bug #1: Document Listener Method', () => {
      test('should use getDoc for documents in polling mode', async () => {
        const getDocSpy = jest.spyOn(firestore, 'getDoc');
        const getDocsSpy = jest.spyOn(firestore, 'getDocs');
        
        // Force polling mode by making onSnapshot fail
        (firestore.onSnapshot as jest.Mock).mockImplementation(
          (query, options, onNext, onError) => {
            setTimeout(() => onError(new Error('Force polling')), 0);
            setTimeout(() => onError(new Error('Force polling')), 100);
            setTimeout(() => onError(new Error('Force polling')), 200);
            return jest.fn();
          }
        );
        
        const cleanup = UniversalRealtimeService.createDocumentListener(
          'doc-method-test',
          {} as any,
          jest.fn()
        );
        
        await waitFor(() => {
          expect(getDocSpy).toHaveBeenCalled();
        }, { timeout: 5000 });
        
        expect(getDocsSpy).not.toHaveBeenCalled();
        
        cleanup();
      });
    });
    
    describe('Bug #2: Race Condition', () => {
      test('should handle rapid listener recreation without race conditions', async () => {
        const listeners: (() => void)[] = [];
        const listenerId = 'race-test';
        
        // Rapidly create and recreate
        for (let i = 0; i < 10; i++) {
          const cleanup = UniversalRealtimeService.createListener(
            listenerId,
            {} as any,
            jest.fn()
          );
          listeners.push(cleanup);
          
          // Small delay between recreations
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Should only have one active listener
        expect(UniversalRealtimeService.getListenerCount()).toBe(1);
        expect(UniversalRealtimeService.isListenerActive(listenerId)).toBe(true);
        
        // Cleanup all
        listeners.forEach(cleanup => cleanup());
        
        // Should be fully cleaned up
        expect(UniversalRealtimeService.getListenerCount()).toBe(0);
      });
      
      test('should not leak resources during concurrent operations', async () => {
        const operations = [];
        
        // Create multiple listeners concurrently
        for (let i = 0; i < 20; i++) {
          operations.push(
            new Promise(resolve => {
              const cleanup = UniversalRealtimeService.createListener(
                `concurrent-${i}`,
                {} as any,
                jest.fn()
              );
              setTimeout(() => {
                cleanup();
                resolve(null);
              }, Math.random() * 100);
            })
          );
        }
        
        await Promise.all(operations);
        
        // All should be cleaned up
        expect(UniversalRealtimeService.getListenerCount()).toBe(0);
      });
    });
    
    describe('Bug #3: Memory Leaks', () => {
      test('should cleanup all timeouts on listener cleanup', async () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
        
        // Create listener that will fail and retry
        (firestore.onSnapshot as jest.Mock).mockImplementation(
          (query, options, onNext, onError) => {
            setTimeout(() => onError(new Error('Test error')), 10);
            return jest.fn();
          }
        );
        
        const cleanup = UniversalRealtimeService.createListener(
          'leak-test',
          {} as any,
          jest.fn()
        );
        
        // Wait for retry to be scheduled
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Cleanup should clear all timeouts
        cleanup();
        
        expect(clearTimeoutSpy).toHaveBeenCalled();
        
        // Verify internal state is clean
        expect(UniversalRealtimeService['retryTimeouts'].size).toBe(0);
        expect(UniversalRealtimeService['pollingIntervals'].size).toBe(0);
      });
    });
  });
  
  describe('P1 Bug Fixes', () => {
    describe('Bug #6: Polling Error Recovery', () => {
      test('should retry polling with exponential backoff', async () => {
        let attemptCount = 0;
        const attempts: number[] = [];
        
        (firestore.getDocs as jest.Mock).mockImplementation(() => {
          attempts.push(Date.now());
          attemptCount++;
          
          if (attemptCount <= 3) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve({ docs: [] });
        });
        
        const cleanup = UniversalRealtimeService.createListener(
          'retry-test',
          {} as any,
          jest.fn(),
          { forcePollingMode: true, pollingInterval: 100 }
        );
        
        await waitFor(() => {
          expect(attemptCount).toBeGreaterThan(3);
        }, { timeout: 5000 });
        
        // Check intervals are increasing
        if (attempts.length > 2) {
          const interval1 = attempts[1] - attempts[0];
          const interval2 = attempts[2] - attempts[1];
          expect(interval2).toBeGreaterThan(interval1);
        }
        
        cleanup();
      });
    });
  });
  
  describe('P2 Performance Enhancements', () => {
    describe('Adaptive Polling', () => {
      test('should adjust interval based on data changes', async () => {
        let dataVersion = 0;
        
        (firestore.getDocs as jest.Mock).mockImplementation(() => {
          dataVersion++;
          return Promise.resolve({
            docs: [{ id: 'doc1', data: () => ({ version: dataVersion }) }]
          });
        });
        
        const cleanup = UniversalRealtimeService.createListener(
          'adaptive-test',
          {} as any,
          jest.fn(),
          {
            forcePollingMode: true,
            pollingStrategy: 'adaptive',
            pollingInterval: 500,
            minInterval: 100,
            maxInterval: 2000
          }
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const state = UniversalRealtimeService.getConnectionState('adaptive-test');
        
        // Should have adjusted interval
        expect(state?.metadata?.interval).toBeDefined();
        expect(state?.metadata?.activityLevel).toBeDefined();
        
        cleanup();
      });
    });
    
    describe('Connection State Tracking', () => {
      test('should track all state transitions', async () => {
        const states: string[] = [];
        
        const unsubscribe = UniversalRealtimeService.onStateChange(
          'state-tracking-test',
          (state) => {
            states.push(state.mode);
          }
        );
        
        const cleanup = UniversalRealtimeService.createListener(
          'state-tracking-test',
          {} as any,
          jest.fn()
        );
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        cleanup();
        unsubscribe();
        
        expect(states).toContain('connecting');
        expect(states[states.length - 1]).toBe('disconnected');
      });
      
      test('should provide accurate health score', () => {
        // Setup mock states
        UniversalRealtimeService['connectionStates'] = new Map([
          ['healthy-1', { mode: 'realtime', isHealthy: true, errorCount: 0, lastUpdate: new Date() }],
          ['healthy-2', { mode: 'polling', isHealthy: true, errorCount: 1, lastUpdate: new Date() }],
          ['unhealthy', { mode: 'error', isHealthy: false, errorCount: 5, lastUpdate: new Date() }]
        ]);
        
        const score = UniversalRealtimeService.getHealthScore();
        
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThan(100);
      });
    });
  });
});
```

### Step 2: Integration Tests (1 hour)

#### 2.1 MeetingStore Integration Test
```typescript
// File: src/stores/__tests__/meetingStore.integration.test.ts

import { useMeetingStore } from '../meetingStore';
import { UniversalRealtimeService } from '@/services/firebase/UniversalRealtimeService';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('MeetingStore Integration with UniversalRealtimeService', () => {
  beforeEach(() => {
    // Reset store
    useMeetingStore.setState({
      currentMeeting: null,
      transcript: [],
      participants: []
    });
    
    // Clean up services
    UniversalRealtimeService.cleanupAll();
  });
  
  test('should preserve participant data during updates', async () => {
    const { result } = renderHook(() => useMeetingStore());
    
    const mockMeeting = {
      meetingId: 'test-meeting',
      participants: [
        {
          id: 'p1',
          userId: 'u1',
          displayName: 'User One',
          role: 'host',
          joinTime: new Date(),
          speakingTime: 120,
          voiceProfileId: 'voice1',
          isActive: true,
          isMuted: false
        }
      ]
    };
    
    await act(async () => {
      result.current.setupRealtimeListeners(mockMeeting.meetingId);
    });
    
    // Simulate real-time update
    // ... trigger update ...
    
    await waitFor(() => {
      const participant = result.current.participants[0];
      expect(participant.metadata?.role).toBe('host');
      expect(participant.speakingTime).toBe(120);
    });
  });
  
  test('should handle transcript race conditions correctly', async () => {
    const { result } = renderHook(() => useMeetingStore());
    
    // Add optimistic entry
    await act(async () => {
      await result.current.addTranscriptEntry({
        text: 'User typing...',
        speakerId: 'user1',
        timestamp: new Date(),
        isOptimistic: true
      });
    });
    
    expect(result.current.transcript).toHaveLength(1);
    expect(result.current.transcript[0].isOptimistic).toBe(true);
    
    // Simulate server update
    // ... trigger real-time update ...
    
    // Optimistic entry should still be present
    const optimisticEntry = result.current.transcript.find(e => e.isOptimistic);
    expect(optimisticEntry).toBeDefined();
  });
});
```

### Step 3: Load Testing (1 hour)

#### 3.1 Load Test Script
```typescript
// File: scripts/load-test-universal-realtime.ts

import { UniversalRealtimeService } from '../src/services/firebase/UniversalRealtimeService';
import { collection, query, limit } from 'firebase/firestore';
import { db } from '../src/lib/firebase/client';

interface LoadTestConfig {
  listenerCount: number;
  duration: number; // milliseconds
  failureRate: number; // 0-1
  dataChangeRate: number; // changes per minute
}

interface LoadTestResults {
  startMemory: number;
  endMemory: number;
  memoryGrowth: number;
  listenerSuccessRate: number;
  averageSetupTime: number;
  averageCleanupTime: number;
  errorCount: number;
  stateTransitions: Map<string, number>;
}

async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
  console.log('Starting load test with config:', config);
  
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  const listeners: (() => void)[] = [];
  const setupTimes: number[] = [];
  const cleanupTimes: number[] = [];
  const errors: Error[] = [];
  const stateTransitions = new Map<string, number>();
  
  // Track state transitions
  const stateTrackers = new Map<string, () => void>();
  
  // Create listeners
  for (let i = 0; i < config.listenerCount; i++) {
    const listenerId = `load-test-${i}`;
    const setupStart = performance.now();
    
    try {
      // Track state changes
      const unsubscribe = UniversalRealtimeService.onStateChange(
        listenerId,
        (state) => {
          const key = state.mode;
          stateTransitions.set(key, (stateTransitions.get(key) || 0) + 1);
        }
      );
      stateTrackers.set(listenerId, unsubscribe);
      
      // Create listener
      const cleanup = UniversalRealtimeService.createListener(
        listenerId,
        query(collection(db, 'test-collection'), limit(10)),
        (data) => {
          // Simulate processing
        },
        {
          // Vary configuration for realistic load
          pollingStrategy: i % 3 === 0 ? 'adaptive' : 'fixed',
          pollingInterval: 30000 + (i % 10) * 1000
        }
      );
      
      listeners.push(cleanup);
      setupTimes.push(performance.now() - setupStart);
      
      // Simulate random failures
      if (Math.random() < config.failureRate) {
        setTimeout(() => {
          // Force a failure scenario
          cleanup();
          // Recreate
          const newCleanup = UniversalRealtimeService.createListener(
            listenerId,
            query(collection(db, 'test-collection'), limit(10)),
            (data) => {}
          );
          const index = listeners.indexOf(cleanup);
          if (index !== -1) {
            listeners[index] = newCleanup;
          }
        }, Math.random() * config.duration);
      }
      
    } catch (error) {
      errors.push(error as Error);
    }
    
    // Stagger creation to avoid thundering herd
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`Created ${listeners.length} listeners`);
  
  // Monitor memory during test
  const memorySnapshots: number[] = [];
  const memoryInterval = setInterval(() => {
    memorySnapshots.push(process.memoryUsage().heapUsed);
  }, 5000);
  
  // Simulate data changes
  let changeCount = 0;
  const changeInterval = setInterval(() => {
    changeCount++;
    // Trigger data change simulation
    // This would normally come from Firebase
  }, 60000 / config.dataChangeRate);
  
  // Run for specified duration
  await new Promise(resolve => setTimeout(resolve, config.duration));
  
  // Cleanup
  clearInterval(memoryInterval);
  clearInterval(changeInterval);
  
  console.log('Cleaning up listeners...');
  
  // Measure cleanup times
  for (const cleanup of listeners) {
    const cleanupStart = performance.now();
    cleanup();
    cleanupTimes.push(performance.now() - cleanupStart);
  }
  
  // Cleanup state trackers
  stateTrackers.forEach(unsubscribe => unsubscribe());
  
  // Final measurements
  const endMemory = process.memoryUsage().heapUsed;
  const endTime = Date.now();
  
  // Calculate results
  const results: LoadTestResults = {
    startMemory,
    endMemory,
    memoryGrowth: endMemory - startMemory,
    listenerSuccessRate: (listeners.length - errors.length) / config.listenerCount,
    averageSetupTime: setupTimes.reduce((a, b) => a + b, 0) / setupTimes.length,
    averageCleanupTime: cleanupTimes.reduce((a, b) => a + b, 0) / cleanupTimes.length,
    errorCount: errors.length,
    stateTransitions
  };
  
  return results;
}

// Run different load scenarios
async function runAllLoadTests() {
  const scenarios = [
    {
      name: 'Light Load',
      config: {
        listenerCount: 10,
        duration: 60000, // 1 minute
        failureRate: 0.1,
        dataChangeRate: 5
      }
    },
    {
      name: 'Medium Load',
      config: {
        listenerCount: 50,
        duration: 300000, // 5 minutes
        failureRate: 0.2,
        dataChangeRate: 10
      }
    },
    {
      name: 'Heavy Load',
      config: {
        listenerCount: 100,
        duration: 600000, // 10 minutes
        failureRate: 0.3,
        dataChangeRate: 20
      }
    },
    {
      name: 'Stress Test',
      config: {
        listenerCount: 500,
        duration: 60000, // 1 minute burst
        failureRate: 0.5,
        dataChangeRate: 50
      }
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${scenario.name}`);
    console.log('='.repeat(50));
    
    const results = await runLoadTests(scenario.config);
    
    console.log('\nResults:');
    console.log(`- Memory growth: ${(results.memoryGrowth / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Success rate: ${(results.listenerSuccessRate * 100).toFixed(1)}%`);
    console.log(`- Avg setup time: ${results.averageSetupTime.toFixed(2)}ms`);
    console.log(`- Avg cleanup time: ${results.averageCleanupTime.toFixed(2)}ms`);
    console.log(`- Error count: ${results.errorCount}`);
    console.log('- State transitions:', Object.fromEntries(results.stateTransitions));
    
    // Pass/Fail criteria
    const passed = 
      results.memoryGrowth < 50 * 1024 * 1024 && // Less than 50MB growth
      results.listenerSuccessRate > 0.95 && // 95% success rate
      results.averageSetupTime < 100 && // Setup under 100ms
      results.averageCleanupTime < 10; // Cleanup under 10ms
    
    console.log(`\n${scenario.name}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Clean up between scenarios
    UniversalRealtimeService.cleanupAll();
    
    // Wait between scenarios
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

// Run if executed directly
if (require.main === module) {
  runAllLoadTests()
    .then(() => {
      console.log('\n✅ All load tests completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    });
}
```

### Step 4: Browser Compatibility Testing

#### 4.1 Browser Test Matrix
```typescript
// File: src/app/test-universal-realtime/browser-test.tsx

'use client';

import { useEffect, useState } from 'react';
import { UniversalRealtimeService } from '@/services/firebase/UniversalRealtimeService';

interface BrowserTestResult {
  browser: string;
  userAgent: string;
  realtimeWorks: boolean;
  pollingWorks: boolean;
  fallbackTime?: number;
  errorCount: number;
  finalMode: string;
}

export default function BrowserTestPage() {
  const [results, setResults] = useState<BrowserTestResult | null>(null);
  const [testing, setTesting] = useState(true);
  
  useEffect(() => {
    runBrowserTest().then(setResults).finally(() => setTesting(false));
  }, []);
  
  async function runBrowserTest(): Promise<BrowserTestResult> {
    const startTime = Date.now();
    const result: BrowserTestResult = {
      browser: detectBrowser(),
      userAgent: navigator.userAgent,
      realtimeWorks: false,
      pollingWorks: false,
      errorCount: 0,
      finalMode: 'unknown'
    };
    
    // Track state changes
    const states: string[] = [];
    const unsubscribe = UniversalRealtimeService.onStateChange(
      'browser-test',
      (state) => {
        states.push(state.mode);
        if (state.mode === 'realtime') result.realtimeWorks = true;
        if (state.mode === 'polling') {
          result.pollingWorks = true;
          result.fallbackTime = Date.now() - startTime;
        }
        result.errorCount = state.errorCount;
        result.finalMode = state.mode;
      }
    );
    
    // Create test listener
    const cleanup = UniversalRealtimeService.createListener(
      'browser-test',
      testQuery,
      (data) => {
        console.log('Data received:', data);
      }
    );
    
    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    cleanup();
    unsubscribe();
    
    return result;
  }
  
  function detectBrowser(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('brave')) return 'Brave';
    return 'Unknown';
  }
  
  if (testing) {
    return <div>Testing browser compatibility...</div>;
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Browser Compatibility Test</h1>
      
      {results && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold">Browser: {results.browser}</h2>
            <p className="text-sm text-gray-600">{results.userAgent}</p>
          </div>
          
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold">Test Results</h2>
            <ul className="space-y-2">
              <li>Real-time Support: {results.realtimeWorks ? '✅' : '❌'}</li>
              <li>Polling Support: {results.pollingWorks ? '✅' : '❌'}</li>
              <li>Final Mode: {results.finalMode}</li>
              <li>Error Count: {results.errorCount}</li>
              {results.fallbackTime && (
                <li>Fallback Time: {results.fallbackTime}ms</li>
              )}
            </ul>
          </div>
          
          <div className={`p-4 rounded ${
            results.realtimeWorks || results.pollingWorks 
              ? 'bg-green-100' 
              : 'bg-red-100'
          }`}>
            <h2 className="font-semibold">
              {results.realtimeWorks || results.pollingWorks ? '✅ PASS' : '❌ FAIL'}
            </h2>
            <p>
              The Universal Realtime Service {
                results.realtimeWorks || results.pollingWorks 
                  ? 'works correctly' 
                  : 'failed'
              } in {results.browser}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Validation Checklist

### Unit Tests
- [ ] All P0 bug fixes tested
- [ ] All P1 bug fixes tested
- [ ] All P2 enhancements tested
- [ ] No test failures
- [ ] Coverage > 90%

### Integration Tests
- [ ] MeetingStore integration works
- [ ] Participant data preserved
- [ ] Transcript race conditions handled
- [ ] State tracking accurate

### Load Tests
- [ ] Light load passes (10 listeners)
- [ ] Medium load passes (50 listeners)
- [ ] Heavy load passes (100 listeners)
- [ ] Memory growth < 50MB/hour
- [ ] No memory leaks detected

### Browser Tests
- [ ] Chrome: Real-time works
- [ ] Firefox: Real-time works
- [ ] Safari: Works (real-time or polling)
- [ ] Edge: Real-time works
- [ ] Brave: Works (real-time or polling)

### Performance Benchmarks
- [ ] Listener setup < 100ms
- [ ] Cleanup < 10ms
- [ ] State updates < 1ms
- [ ] Memory per listener < 1KB

## Success Criteria

### Quality Gates
- ✅ Zero P0/P1 bugs
- ✅ All tests passing
- ✅ Memory stable over 1 hour
- ✅ Works on all major browsers
- ✅ Performance targets met

### Metrics
- ✅ Test coverage > 90%
- ✅ Load test success rate > 95%
- ✅ Average setup time < 100ms
- ✅ Memory growth < 10MB/hour
- ✅ Zero critical bugs

## Time Tracking

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Unit Tests | 60 min | ___ | Comprehensive suite |
| Integration Tests | 60 min | ___ | Store integration |
| Load Tests | 60 min | ___ | Performance validation |
| Browser Tests | 30 min | ___ | Compatibility check |
| Documentation | 30 min | ___ | Test reports |
| **Total** | **4h** | ___ | With buffer |

## Test Reports

### Generate Test Report
```bash
# Run all tests and generate report
npm test -- --coverage --json --outputFile=test-results.json

# Generate HTML report
npx jest-html-reporter -o test-report.html -i test-results.json

# Run load tests
npm run test:load

# Check memory leaks
npm run test:memory
```

## Next Phase

After completing Phase 4:
1. Review all test results
2. Fix any failing tests
3. Generate test report
4. Commit: `test(realtime): comprehensive test suite for UniversalRealtimeService`
5. Move to [Phase 5: Deployment Preparation](./Phase5-Deployment-Preparation.md)

---

*Testing is critical - do not skip any tests. If any test fails, fix the issue before proceeding to deployment.*