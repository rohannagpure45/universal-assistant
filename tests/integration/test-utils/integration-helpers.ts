/**
 * Integration Test Utilities
 * Comprehensive utilities for testing integration between services and stores
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  TestAuthStateManager, 
  TestDatabaseStateManager,
  createMockUser,
  createMockFirebaseUser,
  createMockMeeting,
  createMockTranscriptEntry,
  createAuthError,
  createFirestoreError
} from '../../setup/firebase-test-utils';
import { useAuthStore } from '@/stores/authStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAppStore } from '@/stores/appStore';
import type { User, Meeting, TranscriptEntry, UserPreferences } from '@/types';

// Global test managers
export const testAuth = TestAuthStateManager.getInstance();
export const testDatabase = TestDatabaseStateManager.getInstance();

/**
 * Integration test scenario builder
 */
export class IntegrationTestScenario {
  private scenario: string;
  private steps: Array<() => Promise<void>> = [];
  private cleanup: Array<() => void> = [];

  constructor(scenario: string) {
    this.scenario = scenario;
  }

  step(description: string, action: () => Promise<void>) {
    this.steps.push(async () => {
      console.log(`  → ${description}`);
      await action();
    });
    return this;
  }

  addCleanup(cleanup: () => void) {
    this.cleanup.push(cleanup);
    return this;
  }

  async run() {
    console.log(`🧪 Running scenario: ${this.scenario}`);
    
    try {
      for (const step of this.steps) {
        await step();
      }
      console.log(`✅ Scenario completed: ${this.scenario}`);
    } catch (error) {
      console.error(`❌ Scenario failed: ${this.scenario}`, error);
      throw error;
    } finally {
      // Run cleanup
      this.cleanup.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.warn('Cleanup error:', error);
        }
      });
    }
  }
}

/**
 * Store state snapshot utilities
 */
export interface StoreSnapshot {
  auth: ReturnType<typeof useAuthStore.getState>;
  meeting: ReturnType<typeof useMeetingStore.getState>;
  app: ReturnType<typeof useAppStore.getState>;
  timestamp: number;
}

export const captureStoreSnapshot = (): StoreSnapshot => ({
  auth: useAuthStore.getState(),
  meeting: useMeetingStore.getState(),
  app: useAppStore.getState(),
  timestamp: Date.now()
});

export const compareStoreSnapshots = (
  before: StoreSnapshot, 
  after: StoreSnapshot
): { changed: string[]; details: Record<string, any> } => {
  const changed: string[] = [];
  const details: Record<string, any> = {};

  // Check auth store changes
  if (before.auth.user !== after.auth.user) {
    changed.push('auth.user');
    details['auth.user'] = { before: before.auth.user, after: after.auth.user };
  }

  if (before.auth.isAuthenticated !== after.auth.isAuthenticated) {
    changed.push('auth.isAuthenticated');
    details['auth.isAuthenticated'] = { 
      before: before.auth.isAuthenticated, 
      after: after.auth.isAuthenticated 
    };
  }

  // Check meeting store changes
  if (before.meeting.currentMeeting !== after.meeting.currentMeeting) {
    changed.push('meeting.currentMeeting');
    details['meeting.currentMeeting'] = {
      before: before.meeting.currentMeeting?.meetingId,
      after: after.meeting.currentMeeting?.meetingId
    };
  }

  if (before.meeting.transcript.length !== after.meeting.transcript.length) {
    changed.push('meeting.transcript');
    details['meeting.transcript'] = {
      before: before.meeting.transcript.length,
      after: after.meeting.transcript.length
    };
  }

  // Check app store changes
  if (JSON.stringify(before.app.aiSettings) !== JSON.stringify(after.app.aiSettings)) {
    changed.push('app.aiSettings');
    details['app.aiSettings'] = {
      before: before.app.aiSettings,
      after: after.app.aiSettings
    };
  }

  return { changed, details };
};

/**
 * Authentication integration helpers
 */
export const createAuthScenario = () => {
  const mockUser = createMockUser();
  const mockFirebaseUser = createMockFirebaseUser({ uid: mockUser.uid });

  return {
    mockUser,
    mockFirebaseUser,
    
    async signUp() {
      await act(async () => {
        testAuth.setAuthState(mockFirebaseUser);
        testDatabase.setDocument('users', mockUser.uid, mockUser);
      });
    },

    async signIn() {
      await act(async () => {
        testAuth.setAuthState(mockFirebaseUser);
      });
    },

    async signOut() {
      await act(async () => {
        testAuth.setAuthState(null);
      });
    },

    async updateProfile(updates: Partial<User>) {
      const updatedUser = { ...mockUser, ...updates };
      await act(async () => {
        testDatabase.setDocument('users', mockUser.uid, updatedUser);
      });
      return updatedUser;
    }
  };
};

/**
 * Meeting integration helpers
 */
export const createMeetingScenario = () => {
  const mockMeeting = createMockMeeting();

  return {
    mockMeeting,

    async createMeeting() {
      await act(async () => {
        testDatabase.setDocument('meetings', mockMeeting.meetingId, mockMeeting);
      });
      return mockMeeting;
    },

    async addTranscriptEntry(entry?: Partial<TranscriptEntry>) {
      const transcriptEntry = createMockTranscriptEntry(entry);
      await act(async () => {
        testDatabase.setDocument(
          `meetings/${mockMeeting.meetingId}/transcripts`,
          transcriptEntry.id,
          transcriptEntry
        );
      });
      return transcriptEntry;
    },

    async updateMeeting(updates: Partial<Meeting>) {
      const updated = { ...mockMeeting, ...updates };
      await act(async () => {
        testDatabase.setDocument('meetings', mockMeeting.meetingId, updated);
      });
      return updated;
    }
  };
};

/**
 * Cross-store synchronization testing
 */
export const testCrossStoreSync = async (
  action: () => Promise<void>,
  expectedChanges: string[]
) => {
  const beforeSnapshot = captureStoreSnapshot();
  
  await action();
  
  // Wait for state propagation
  await waitFor(() => {
    const afterSnapshot = captureStoreSnapshot();
    const { changed } = compareStoreSnapshots(beforeSnapshot, afterSnapshot);
    
    expectedChanges.forEach(expectedChange => {
      if (!changed.includes(expectedChange)) {
        throw new Error(`Expected change '${expectedChange}' not detected`);
      }
    });
  }, { timeout: 5000 });
};

/**
 * Performance testing utilities
 */
export const measurePerformance = async <T>(
  operation: () => Promise<T>,
  label: string
): Promise<{ result: T; duration: number; memory?: number }> => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize;
  
  const result = await operation();
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize;
  
  const duration = endTime - startTime;
  const memory = startMemory && endMemory ? endMemory - startMemory : undefined;
  
  console.log(`⏱️ Performance [${label}]: ${duration.toFixed(2)}ms`, 
    memory ? `(Memory: ${(memory / 1024 / 1024).toFixed(2)}MB)` : ''
  );
  
  return { result, duration, memory };
};

/**
 * Concurrency testing utilities
 */
export const testConcurrency = async (
  operations: Array<() => Promise<void>>,
  expectedState: () => boolean,
  timeout = 10000
) => {
  // Execute all operations concurrently
  const promises = operations.map(op => op());
  
  // Wait for all to complete
  await Promise.all(promises);
  
  // Wait for expected state
  await waitFor(() => {
    if (!expectedState()) {
      throw new Error('Expected state not reached');
    }
  }, { timeout });
};

/**
 * Error scenario testing
 */
export const createErrorScenario = () => ({
  simulateAuthError(code: string) {
    const error = createAuthError(code);
    testAuth.setAuthState(null);
    throw error;
  },

  simulateFirestoreError(code: string) {
    const error = createFirestoreError(code);
    throw error;
  },

  simulateNetworkError() {
    throw new Error('Network request failed');
  },

  simulateTimeout() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), 100);
    });
  }
});

/**
 * Test environment setup and teardown
 */
export const setupIntegrationTest = () => {
  beforeEach(() => {
    // Reset all stores to initial state
    useAuthStore.getState().setUser(null);
    useAuthStore.getState().setError(null);
    useAuthStore.getState().setInitialized(false);
    
    useMeetingStore.getState().resetMeetingState();
    useAppStore.getState().clearGlobalErrors();
    
    // Reset test managers
    testAuth.reset();
    testDatabase.reset();
    testDatabase.setupMockOperations();
    
    // Reset timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Additional cleanup
    testAuth.reset();
    testDatabase.reset();
    
    // Clear any pending timers
    jest.runOnlyPendingTimers();
  });
};

/**
 * Mock real-time updates
 */
export const simulateRealtimeUpdate = async <T>(
  collection: string,
  documentId: string,
  data: T,
  changeType: 'added' | 'modified' | 'removed' = 'modified'
) => {
  await act(async () => {
    if (changeType === 'removed') {
      testDatabase.deleteDocument(collection, documentId);
    } else {
      testDatabase.setDocument(collection, documentId, data);
    }
    
    // Simulate real-time listener callback
    await new Promise(resolve => setTimeout(resolve, 10));
  });
};

/**
 * Batch operation testing
 */
export const testBatchOperations = async (
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
  }>
) => {
  await act(async () => {
    operations.forEach(({ type, collection, id, data }) => {
      switch (type) {
        case 'create':
        case 'update':
          testDatabase.setDocument(collection, id, data);
          break;
        case 'delete':
          testDatabase.deleteDocument(collection, id);
          break;
      }
    });
  });
};

/**
 * Assertion helpers for integration tests
 */
export const expectStoreState = {
  authUser: (expected: User | null) => {
    const { user } = useAuthStore.getState();
    if (expected === null) {
      expect(user).toBeNull();
    } else {
      expect(user).toMatchObject(expected);
    }
  },

  authError: (expectedCode?: string) => {
    const { error } = useAuthStore.getState();
    if (expectedCode) {
      expect(error).toBeTruthy();
      expect(error?.code).toBe(expectedCode);
    } else {
      expect(error).toBeNull();
    }
  },

  meetingState: (expected: Partial<ReturnType<typeof useMeetingStore.getState>>) => {
    const state = useMeetingStore.getState();
    expect(state).toMatchObject(expected);
  },

  appSettings: (expected: Partial<ReturnType<typeof useAppStore.getState>>) => {
    const state = useAppStore.getState();
    expect(state).toMatchObject(expected);
  },

  crossStoreSync: async () => {
    const authUser = useAuthStore.getState().user;
    const appSettings = useAppStore.getState();
    
    if (authUser?.preferences) {
      // Check if preferences are synced
      expect(appSettings.aiSettings.defaultModel).toBe(authUser.preferences.defaultModel);
      expect(appSettings.uiSettings.theme).toBe(authUser.preferences.theme);
    }
  }
};

/**
 * Comprehensive test runner for complex scenarios
 */
export const runIntegrationTestSuite = async (
  suiteName: string,
  tests: Array<{
    name: string;
    test: () => Promise<void>;
    timeout?: number;
  }>
) => {
  console.log(`🧪 Running integration test suite: ${suiteName}`);
  
  for (const { name, test, timeout = 30000 } of tests) {
    console.log(`  → Running test: ${name}`);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout: ${name}`)), timeout);
    });
    
    try {
      await Promise.race([test(), timeoutPromise]);
      console.log(`    ✅ Passed: ${name}`);
    } catch (error) {
      console.error(`    ❌ Failed: ${name}`, error);
      throw error;
    }
  }
  
  console.log(`✅ Test suite completed: ${suiteName}`);
};

/**
 * Memory leak detection utility
 */
export class MemoryLeakDetector {
  private initialHeapSize: number = 0;
  private monitoringInterval?: NodeJS.Timeout;
  private samples: number[] = [];

  startMonitoring() {
    this.initialHeapSize = this.getHeapSize();
    this.samples = [];
    
    this.monitoringInterval = setInterval(() => {
      this.samples.push(this.getHeapSize());
    }, 100);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  detectLeaks(): Array<{ type: string; size: number; description: string }> {
    const leaks: Array<{ type: string; size: number; description: string }> = [];
    const currentHeapSize = this.getHeapSize();
    const growth = currentHeapSize - this.initialHeapSize;
    const threshold = 10 * 1024 * 1024; // 10MB threshold

    if (growth > threshold) {
      leaks.push({
        type: 'MEMORY_GROWTH',
        size: growth,
        description: `Memory growth of ${(growth / 1024 / 1024).toFixed(2)}MB detected`
      });
    }

    return leaks;
  }

  cleanup() {
    this.stopMonitoring();
  }

  private getHeapSize(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }
}

/**
 * Performance benchmark utility
 */
export class PerformanceBenchmark {
  private results: Array<{
    name: string;
    duration: number;
    target: number;
    passed: boolean;
  }> = [];

  async runAll(benchmarks: Array<{
    name: string;
    operation: () => Promise<void>;
    target: number;
    description: string;
  }>): Promise<typeof this.results> {
    this.results = [];

    for (const benchmark of benchmarks) {
      const startTime = performance.now();
      await benchmark.operation();
      const duration = performance.now() - startTime;
      const passed = duration <= benchmark.target;

      this.results.push({
        name: benchmark.name,
        duration,
        target: benchmark.target,
        passed
      });
    }

    return this.results;
  }

  getResults() {
    return this.results;
  }

  cleanup() {
    this.results = [];
  }
}

export default {
  IntegrationTestScenario,
  createAuthScenario,
  createMeetingScenario,
  testCrossStoreSync,
  measurePerformance,
  testConcurrency,
  createErrorScenario,
  setupIntegrationTest,
  simulateRealtimeUpdate,
  testBatchOperations,
  expectStoreState,
  runIntegrationTestSuite,
  captureStoreSnapshot,
  compareStoreSnapshots,
  MemoryLeakDetector,
  PerformanceBenchmark,
};