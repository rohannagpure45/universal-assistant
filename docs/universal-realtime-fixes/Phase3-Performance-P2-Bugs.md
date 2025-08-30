# Phase 3: Performance P2 Bugs - ✅ COMPLETED

## ✅ IMPLEMENTATION COMPLETED - August 30, 2025

**Status**: ALL P2 PERFORMANCE BUGS FIXED  
**Actual Duration**: 35 minutes  
**Approach**: Defensive enhancements following successful Phases 1 & 2 pattern  

### ✅ What Was Actually Implemented

**Bug #7: Fixed Polling Interval Inefficiency** - FIXED ✅
- **Issue**: Always 30-second polling regardless of data activity
- **Fix**: Simple activity-based adaptive intervals (15s active, 30s normal, 45s idle)
- **Code**: 25 lines of activity tracking and dynamic interval calculation
- **Location**: Enhanced existing polling logic in `UniversalRealtimeService.ts`
- **Result**: Polling responds intelligently to data changes, improving performance

**Bug #8: Missing Connection State Visibility** - FIXED ✅  
- **Issue**: Internal connection state not exposed for applications to show status
- **Fix**: Simple getter methods exposing existing internal tracking data
- **Code**: 20 lines of status exposure methods (`getConnectionStatus`, `getCurrentInterval`, `getActivityLevel`, `getAllConnectionStates`)
- **Location**: Added public methods to `UniversalRealtimeService` class
- **Result**: Complete visibility into connection status for UI indicators and monitoring

### Actual vs Planned Implementation

**✅ What We Did (Successful)**:
- Total: ~45 lines of simple enhancements to existing working code
- Duration: 35 minutes vs 2+ hours planned
- Approach: Defensive additions that preserve working functionality
- Risk: Minimal (enhancements to proven patterns)

**❌ What Original Complex Plan Called For (Avoided)**:
- Total: 400+ lines of complex polling algorithms and state management
- ActivityTracker class with time-based change arrays and complex hashing
- Multi-strategy polling with progressive, activity-based, and peak-hour detection
- Network monitoring, React hooks, and comprehensive UI components
- Risk: High (new architectural layers that could introduce bugs)

### Implementation Reality Check

**Problems with Our Approach**:
- **Limited sophistication**: Our activity tracking is very simple (just a counter), whereas the complex plan had time-window analysis
- **No peak-hour optimization**: We don't adjust for time-of-day usage patterns
- **Basic change detection**: Using JSON stringify hash instead of proper data diffing
- **No network state integration**: Missing automatic retry on network reconnection
- **Minimal UI integration**: Just basic getter methods, no React hooks or components provided

**Benefits of Our Approach**:
- **Reliable**: Builds on proven working patterns from Phases 1 & 2
- **Maintainable**: Simple code that's easy to debug and modify
- **Low risk**: Minimal chance of introducing new bugs
- **Fast implementation**: 35 minutes vs hours of complex development
- **Preserves simplicity**: Maintains the 87.5% code reduction achievement

**What This Means**:
- The P2 bugs are fixed and the service works better, but it's not as sophisticated as the complex plan would have made it
- Applications can now show connection status, but they'll need to build their own UI components
- Polling adapts to activity, but not as intelligently as a full activity analysis system would
- Good enough for production, but leaves room for future enhancement if needed

## ORIGINAL COMPLEX PLAN (Reference - Not Implemented)

**Note**: The following was the original complex architectural plan that we chose not to implement in favor of the defensive approach above.

### Original Overview
**Duration**: 2 hours  
**Priority**: MEDIUM - Performance optimization and UX improvements  
**Risk Level**: LOW - Enhancements that improve experience without breaking functionality  
**Prerequisites**: Phases 1 and 2 must be completed first

## Bug Details

### Bug #7: Fixed Polling Interval Inefficiency
**Severity**: P2 - Performance  
**Location**: `src/services/firebase/UniversalRealtimeService.ts:87`  
**Impact**: 30-second polling too slow for active data, wasteful for static data

### Bug #8: Missing Connection State Visibility
**Severity**: P2 - UX  
**Location**: Throughout `UniversalRealtimeService.ts`  
**Impact**: Applications cannot show connection status to users

## Implementation Steps

### Step 1: Implement Adaptive Polling (1 hour)

#### 1.1 Define Configuration Types
```typescript
// File: src/types/realtime.ts
// Add comprehensive configuration options

export interface AdaptivePollingConfig {
  // Base configuration
  baseInterval: number;        // Starting interval (default: 30000ms)
  minInterval: number;         // Minimum interval (default: 5000ms)
  maxInterval: number;         // Maximum interval (default: 300000ms)
  
  // Adaptive strategies
  strategy: 'fixed' | 'adaptive' | 'progressive' | 'activity-based';
  
  // Activity detection
  activityThreshold?: number;  // Changes per minute to consider "active"
  idleThreshold?: number;      // Minutes without changes to consider "idle"
  
  // Progressive scaling
  scaleUpFactor?: number;      // Factor to decrease interval (default: 0.5)
  scaleDownFactor?: number;    // Factor to increase interval (default: 1.5)
  
  // Smart detection
  detectPatterns?: boolean;    // Analyze usage patterns
  peakHours?: [number, number][]; // Peak activity hours [[9,12], [14,18]]
}

export interface ListenerConfig {
  maxRealtimeFailures?: number;
  pollingInterval?: number;
  pollingStrategy?: 'fixed' | 'adaptive' | 'progressive' | 'activity-based';
  minInterval?: number;
  maxInterval?: number;
  forcePollingMode?: boolean;
  
  // ADD: Advanced polling configuration
  adaptivePolling?: AdaptivePollingConfig;
  
  // ADD: Priority levels
  priority?: 'critical' | 'high' | 'normal' | 'low';
  
  // ADD: Data volatility hints
  dataVolatility?: 'static' | 'low' | 'medium' | 'high' | 'realtime';
}
```

#### 1.2 Implement Activity Tracker
```typescript
// File: src/services/firebase/UniversalRealtimeService.ts
// Add activity tracking class

class ActivityTracker {
  private changes: Date[] = [];
  private lastDataHash: string = '';
  
  recordChange(data: any): boolean {
    const now = new Date();
    const dataHash = this.hashData(data);
    
    // Check if data actually changed
    const changed = dataHash !== this.lastDataHash;
    
    if (changed) {
      this.changes.push(now);
      this.lastDataHash = dataHash;
      
      // Clean old changes (keep last hour)
      const oneHourAgo = new Date(now.getTime() - 3600000);
      this.changes = this.changes.filter(d => d > oneHourAgo);
    }
    
    return changed;
  }
  
  getActivityLevel(): 'idle' | 'low' | 'medium' | 'high' {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 300000);
    const recentChanges = this.changes.filter(d => d > fiveMinutesAgo).length;
    
    if (recentChanges === 0) return 'idle';
    if (recentChanges <= 2) return 'low';
    if (recentChanges <= 10) return 'medium';
    return 'high';
  }
  
  getChangesPerMinute(): number {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    return this.changes.filter(d => d > oneMinuteAgo).length;
  }
  
  getTimeSinceLastChange(): number {
    if (this.changes.length === 0) return Infinity;
    const lastChange = this.changes[this.changes.length - 1];
    return Date.now() - lastChange.getTime();
  }
  
  private hashData(data: any): string {
    // Simple hash for change detection
    return JSON.stringify(data).length + '-' + 
           JSON.stringify(data).substring(0, 100);
  }
}

// Add to UniversalRealtimeService class
private static activityTrackers = new Map<string, ActivityTracker>();
```

#### 1.3 Implement Adaptive Polling Logic
```typescript
// File: src/services/firebase/UniversalRealtimeService.ts
// Enhanced polling with adaptive intervals

const startAdaptivePolling = (
  query: Query<T>,
  callback: (data: T[]) => void,
  config: ListenerConfig
) => {
  const tracker = new ActivityTracker();
  this.activityTrackers.set(listenerId, tracker);
  
  const adaptive = config.adaptivePolling || {
    baseInterval: config.pollingInterval || 30000,
    minInterval: config.minInterval || 5000,
    maxInterval: config.maxInterval || 300000,
    strategy: config.pollingStrategy || 'adaptive',
    scaleUpFactor: 0.5,
    scaleDownFactor: 1.5
  };
  
  let currentInterval = adaptive.baseInterval;
  let consecutiveNoChanges = 0;
  let pollHandle: NodeJS.Timeout | null = null;
  
  const calculateNextInterval = (): number => {
    const activityLevel = tracker.getActivityLevel();
    const timeSinceChange = tracker.getTimeSinceLastChange();
    
    switch (adaptive.strategy) {
      case 'fixed':
        return adaptive.baseInterval;
        
      case 'adaptive':
        // Adjust based on activity
        if (activityLevel === 'high') {
          return Math.max(adaptive.minInterval, currentInterval * adaptive.scaleUpFactor!);
        } else if (activityLevel === 'idle' && timeSinceChange > 300000) {
          return Math.min(adaptive.maxInterval, currentInterval * adaptive.scaleDownFactor!);
        }
        return currentInterval;
        
      case 'progressive':
        // Progressive backoff/speedup
        if (consecutiveNoChanges > 3) {
          return Math.min(
            adaptive.maxInterval,
            adaptive.baseInterval * Math.pow(adaptive.scaleDownFactor!, consecutiveNoChanges - 3)
          );
        }
        return adaptive.baseInterval;
        
      case 'activity-based':
        // Dynamic based on changes per minute
        const changesPerMinute = tracker.getChangesPerMinute();
        if (changesPerMinute > 5) {
          return adaptive.minInterval; // Very active
        } else if (changesPerMinute > 2) {
          return adaptive.baseInterval / 2; // Active
        } else if (changesPerMinute > 0) {
          return adaptive.baseInterval; // Normal
        } else {
          return Math.min(adaptive.maxInterval, adaptive.baseInterval * 2); // Idle
        }
        
      default:
        return adaptive.baseInterval;
    }
  };
  
  const poll = async () => {
    try {
      const snapshot = await getDocs(query);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      // Track activity
      const changed = tracker.recordChange(data);
      
      if (changed) {
        consecutiveNoChanges = 0;
        callback(data);
        
        // Speed up if we're seeing changes
        if (adaptive.strategy === 'adaptive') {
          currentInterval = calculateNextInterval();
          console.log(`Polling interval adjusted to ${currentInterval}ms (data changing)`);
        }
      } else {
        consecutiveNoChanges++;
        
        // Slow down if no changes
        if (consecutiveNoChanges > 3 && adaptive.strategy !== 'fixed') {
          currentInterval = calculateNextInterval();
          console.log(`Polling interval adjusted to ${currentInterval}ms (no changes)`);
        }
      }
      
      // Update connection state
      this.updateState(listenerId, {
        mode: 'polling',
        lastUpdate: new Date(),
        errorCount: 0,
        isHealthy: true,
        metadata: {
          interval: currentInterval,
          activityLevel: tracker.getActivityLevel(),
          changesPerMinute: tracker.getChangesPerMinute()
        }
      });
      
    } catch (error) {
      console.error(`Adaptive polling error:`, error);
      
      // Slow down on errors
      currentInterval = Math.min(currentInterval * 2, adaptive.maxInterval);
      
      this.updateState(listenerId, {
        mode: 'polling',
        errorCount: (this.connectionStates.get(listenerId)?.errorCount || 0) + 1,
        isHealthy: false
      });
    }
    
    // Schedule next poll with new interval
    scheduleNextPoll();
  };
  
  const scheduleNextPoll = () => {
    pollHandle = setTimeout(() => {
      poll();
    }, currentInterval);
    
    // Track for cleanup
    const resources = this.allResources.get(listenerId) || {};
    resources.pollingInterval = pollHandle;
    this.allResources.set(listenerId, resources);
  };
  
  // Initial poll
  poll();
  
  // Cleanup function
  this.listeners.set(listenerId, () => {
    if (pollHandle) clearTimeout(pollHandle);
    this.activityTrackers.delete(listenerId);
  });
};
```

### Step 2: Add Connection State Tracking (1 hour)

#### 2.1 Define State Types
```typescript
// File: src/types/realtime.ts

export type ConnectionMode = 
  | 'connecting'      // Initial connection attempt
  | 'realtime'        // Real-time listener active
  | 'polling'         // Polling fallback active
  | 'error'           // Error state
  | 'disconnected'    // Explicitly disconnected
  | 'reconnecting';   // Attempting to reconnect

export interface ConnectionState {
  mode: ConnectionMode;
  lastUpdate: Date;
  lastSuccess?: Date;
  errorCount: number;
  isHealthy: boolean;
  
  // Additional metadata
  metadata?: {
    interval?: number;          // Current polling interval
    activityLevel?: string;     // Activity level
    changesPerMinute?: number;  // Recent change rate
    failureReason?: string;     // Last error message
    retryAttempt?: number;      // Current retry attempt
  };
}

export interface ConnectionStateListener {
  (state: ConnectionState): void;
}
```

#### 2.2 Implement State Management
```typescript
// File: src/services/firebase/UniversalRealtimeService.ts
// Add comprehensive state tracking

export class UniversalRealtimeService {
  // State management
  private static connectionStates = new Map<string, ConnectionState>();
  private static stateChangeCallbacks = new Map<string, Set<ConnectionStateListener>>();
  
  /**
   * Subscribe to connection state changes
   */
  static onStateChange(
    listenerId: string,
    callback: ConnectionStateListener
  ): () => void {
    if (!this.stateChangeCallbacks.has(listenerId)) {
      this.stateChangeCallbacks.set(listenerId, new Set());
    }
    
    this.stateChangeCallbacks.get(listenerId)!.add(callback);
    
    // Send current state immediately
    const currentState = this.connectionStates.get(listenerId);
    if (currentState) {
      callback(currentState);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.stateChangeCallbacks.get(listenerId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.stateChangeCallbacks.delete(listenerId);
        }
      }
    };
  }
  
  /**
   * Get current connection state
   */
  static getConnectionState(listenerId: string): ConnectionState | undefined {
    return this.connectionStates.get(listenerId);
  }
  
  /**
   * Get all connection states
   */
  static getAllConnectionStates(): Map<string, ConnectionState> {
    return new Map(this.connectionStates);
  }
  
  /**
   * Update connection state and notify listeners
   */
  private static updateState(
    listenerId: string,
    updates: Partial<ConnectionState>
  ): void {
    const current = this.connectionStates.get(listenerId) || {
      mode: 'disconnected',
      lastUpdate: new Date(),
      errorCount: 0,
      isHealthy: false
    };
    
    const newState: ConnectionState = {
      ...current,
      ...updates,
      lastUpdate: new Date()
    };
    
    // Track last success
    if (newState.isHealthy && newState.errorCount === 0) {
      newState.lastSuccess = new Date();
    }
    
    // Calculate health based on error count
    if (updates.errorCount !== undefined) {
      newState.isHealthy = updates.errorCount < 3;
    }
    
    this.connectionStates.set(listenerId, newState);
    
    // Notify all callbacks for this listener
    const callbacks = this.stateChangeCallbacks.get(listenerId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(newState);
        } catch (error) {
          console.error('Error in state change callback:', error);
        }
      });
    }
  }
  
  /**
   * Get health score for monitoring
   */
  static getHealthScore(): number {
    const states = Array.from(this.connectionStates.values());
    if (states.length === 0) return 100;
    
    const healthyCount = states.filter(s => s.isHealthy).length;
    const realtimeCount = states.filter(s => s.mode === 'realtime').length;
    const errorCount = states.filter(s => s.mode === 'error').length;
    
    const healthyPercentage = (healthyCount / states.length) * 50;
    const realtimePercentage = (realtimeCount / states.length) * 30;
    const errorPenalty = (errorCount / states.length) * 20;
    
    return Math.max(0, Math.min(100, healthyPercentage + realtimePercentage - errorPenalty + 20));
  }
}
```

#### 2.3 Update State Throughout Lifecycle
```typescript
// Update state at key points in the listener lifecycle

// In createListener, at the start:
this.updateState(listenerId, {
  mode: 'connecting',
  errorCount: 0,
  isHealthy: false
});

// When real-time connects successfully:
this.updateState(listenerId, {
  mode: 'realtime',
  errorCount: 0,
  isHealthy: true
});

// When falling back to polling:
this.updateState(listenerId, {
  mode: 'polling',
  errorCount: failureCount,
  isHealthy: true,
  metadata: {
    failureReason: 'Real-time connection failed after 3 attempts'
  }
});

// When errors occur:
this.updateState(listenerId, {
  mode: 'error',
  errorCount: failureCount,
  isHealthy: false,
  metadata: {
    failureReason: error.message
  }
});

// When cleaning up:
this.updateState(listenerId, {
  mode: 'disconnected',
  isHealthy: false
});
```

#### 2.4 Create React Hook for State
```typescript
// File: src/hooks/useRealtimeConnectionState.ts

import { useEffect, useState } from 'react';
import { UniversalRealtimeService } from '@/services/firebase/UniversalRealtimeService';
import type { ConnectionState } from '@/types/realtime';

export function useRealtimeConnectionState(listenerId?: string): {
  state: ConnectionState | undefined;
  allStates: Map<string, ConnectionState>;
  healthScore: number;
} {
  const [state, setState] = useState<ConnectionState | undefined>();
  const [allStates, setAllStates] = useState<Map<string, ConnectionState>>(new Map());
  const [healthScore, setHealthScore] = useState(100);
  
  useEffect(() => {
    // Update function
    const updateStates = () => {
      if (listenerId) {
        setState(UniversalRealtimeService.getConnectionState(listenerId));
      }
      setAllStates(UniversalRealtimeService.getAllConnectionStates());
      setHealthScore(UniversalRealtimeService.getHealthScore());
    };
    
    // Subscribe to specific listener if provided
    let unsubscribe: (() => void) | undefined;
    
    if (listenerId) {
      unsubscribe = UniversalRealtimeService.onStateChange(listenerId, (newState) => {
        setState(newState);
        updateStates(); // Also update global state
      });
    }
    
    // Initial state
    updateStates();
    
    // Poll for global state changes
    const interval = setInterval(updateStates, 5000);
    
    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [listenerId]);
  
  return { state, allStates, healthScore };
}
```

#### 2.5 Create Connection Status Component
```typescript
// File: src/components/ConnectionStatus.tsx

import React from 'react';
import { useRealtimeConnectionState } from '@/hooks/useRealtimeConnectionState';

export function ConnectionStatus({ listenerId }: { listenerId?: string }) {
  const { state, healthScore } = useRealtimeConnectionState(listenerId);
  
  if (!state) return null;
  
  const getStatusColor = () => {
    if (!state.isHealthy) return 'text-red-500';
    if (state.mode === 'realtime') return 'text-green-500';
    if (state.mode === 'polling') return 'text-yellow-500';
    return 'text-gray-500';
  };
  
  const getStatusIcon = () => {
    if (state.mode === 'realtime') return '🟢';
    if (state.mode === 'polling') return '🟡';
    if (state.mode === 'error') return '🔴';
    if (state.mode === 'reconnecting') return '🔄';
    return '⚫';
  };
  
  const getStatusText = () => {
    switch (state.mode) {
      case 'realtime': return 'Real-time';
      case 'polling': 
        return `Polling (${state.metadata?.interval ? Math.round(state.metadata.interval / 1000) + 's' : '30s'})`;
      case 'error': return 'Connection Error';
      case 'reconnecting': return 'Reconnecting...';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-lg">{getStatusIcon()}</span>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {state.metadata?.activityLevel && (
        <span className="text-xs text-gray-500">
          ({state.metadata.activityLevel} activity)
        </span>
      )}
      {!state.isHealthy && state.metadata?.failureReason && (
        <span className="text-xs text-red-400" title={state.metadata.failureReason}>
          ⚠️
        </span>
      )}
    </div>
  );
}
```

## Validation Steps

### 1. Unit Tests
```typescript
describe('Phase 3: P2 Performance Fixes', () => {
  describe('Adaptive Polling', () => {
    it('should speed up polling when data changes frequently', async () => {
      const intervals: number[] = [];
      let dataCounter = 0;
      
      // Mock getDocs to return changing data
      jest.spyOn(firestore, 'getDocs').mockImplementation(() => {
        dataCounter++;
        return Promise.resolve({
          docs: [{ id: `doc-${dataCounter}`, data: () => ({ value: dataCounter }) }]
        });
      });
      
      const cleanup = UniversalRealtimeService.createListener(
        'adaptive-test',
        testQuery,
        jest.fn(),
        {
          forcePollingMode: true,
          pollingStrategy: 'adaptive',
          pollingInterval: 1000,
          minInterval: 100,
          maxInterval: 5000
        }
      );
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Should have sped up due to frequent changes
      const state = UniversalRealtimeService.getConnectionState('adaptive-test');
      expect(state?.metadata?.interval).toBeLessThan(1000);
      
      cleanup();
    });
    
    it('should slow down polling when data is static', async () => {
      // Mock getDocs to return same data
      jest.spyOn(firestore, 'getDocs').mockResolvedValue({
        docs: [{ id: 'static-doc', data: () => ({ value: 'unchanged' }) }]
      });
      
      const cleanup = UniversalRealtimeService.createListener(
        'idle-test',
        testQuery,
        jest.fn(),
        {
          forcePollingMode: true,
          pollingStrategy: 'progressive',
          pollingInterval: 100,
          maxInterval: 5000
        }
      );
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Should have slowed down due to no changes
      const state = UniversalRealtimeService.getConnectionState('idle-test');
      expect(state?.metadata?.interval).toBeGreaterThan(100);
      
      cleanup();
    });
  });
  
  describe('Connection State Tracking', () => {
    it('should track state changes throughout lifecycle', async () => {
      const states: ConnectionState[] = [];
      
      const unsubscribe = UniversalRealtimeService.onStateChange(
        'state-test',
        (state) => states.push(state)
      );
      
      const cleanup = UniversalRealtimeService.createListener(
        'state-test',
        testQuery,
        jest.fn()
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      cleanup();
      unsubscribe();
      
      // Should have tracked: connecting -> realtime/polling -> disconnected
      expect(states.length).toBeGreaterThanOrEqual(2);
      expect(states[0].mode).toBe('connecting');
      expect(states[states.length - 1].mode).toBe('disconnected');
    });
    
    it('should calculate health score correctly', () => {
      // Mock some connection states
      UniversalRealtimeService['connectionStates'].set('l1', {
        mode: 'realtime',
        isHealthy: true,
        errorCount: 0,
        lastUpdate: new Date()
      });
      
      UniversalRealtimeService['connectionStates'].set('l2', {
        mode: 'polling',
        isHealthy: true,
        errorCount: 1,
        lastUpdate: new Date()
      });
      
      UniversalRealtimeService['connectionStates'].set('l3', {
        mode: 'error',
        isHealthy: false,
        errorCount: 5,
        lastUpdate: new Date()
      });
      
      const score = UniversalRealtimeService.getHealthScore();
      
      // Should be between 0-100, penalized for error
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });
});
```

### 2. Performance Benchmarks
```javascript
// File: scripts/benchmark-adaptive-polling.js

async function benchmarkAdaptivePolling() {
  const scenarios = [
    { name: 'High Activity', changesPerPoll: 10 },
    { name: 'Medium Activity', changesPerPoll: 2 },
    { name: 'Low Activity', changesPerPoll: 0.2 },
    { name: 'No Activity', changesPerPoll: 0 }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\nTesting: ${scenario.name}`);
    
    const listener = UniversalRealtimeService.createListener(
      `benchmark-${scenario.name}`,
      testQuery,
      (data) => {
        // Track updates
      },
      {
        forcePollingMode: true,
        pollingStrategy: 'activity-based',
        pollingInterval: 30000,
        minInterval: 5000,
        maxInterval: 300000
      }
    );
    
    // Simulate activity
    for (let i = 0; i < 60; i++) {
      if (Math.random() < scenario.changesPerPoll / 10) {
        // Simulate data change
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const state = UniversalRealtimeService.getConnectionState(`benchmark-${scenario.name}`);
    console.log(`Final interval: ${state?.metadata?.interval}ms`);
    console.log(`Activity level: ${state?.metadata?.activityLevel}`);
    
    listener();
  }
}
```

## Success Criteria

### Adaptive Polling
- ✅ Interval adjusts based on data volatility
- ✅ Respects min/max interval bounds
- ✅ Different strategies work correctly
- ✅ Activity tracking accurate

### Connection State
- ✅ All state transitions tracked
- ✅ Callbacks notified promptly
- ✅ Health score meaningful
- ✅ React hook works correctly

### Performance
- ✅ State updates < 1ms
- ✅ Activity tracking overhead < 5ms
- ✅ Memory usage stable
- ✅ No performance regression

## Time Tracking

| Task | Estimated | Actual | Notes |
|------|-----------|--------|-------|
| Setup | 10 min | ___ | Review previous phases |
| Adaptive Polling | 60 min | ___ | Complex logic |
| State Tracking | 60 min | ___ | State management |
| Testing | 20 min | ___ | Unit & integration |
| **Total** | **2.5h** | ___ | With buffer |

## Next Phase

After completing Phase 3:
1. Verify Phases 1 & 2 still working
2. Run performance benchmarks
3. Commit: `feat(realtime): add adaptive polling and connection state tracking`
4. Move to [Phase 4: Testing & Validation](./Phase4-Testing-Validation.md)

---

*This phase significantly improves UX by making the service intelligent and observable. Take time to test the adaptive algorithms thoroughly.*