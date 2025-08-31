/**
 * Minimal smoke test - Verify service doesn't break existing functionality
 * Target: Confirm basic operations work, no complex scenarios
 */
import { UniversalRealtimeService } from '@/services/firebase/UniversalRealtimeService';

// Mock Firebase to avoid real connections
jest.mock('firebase/firestore', () => ({
  onSnapshot: jest.fn((q, opts, onNext) => {
    // Check if it's a document or collection listener
    if (typeof opts === 'object' && onNext) {
      // For documents
      if (!q.type) {
        onNext({ exists: () => false, id: 'test-doc', data: () => null });
      } else {
        // For collections
        onNext({ docs: [] });
      }
    }
    return jest.fn(); // unsubscribe function
  }),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, id: 'test-doc', data: () => null }))
}));

describe('UniversalRealtimeService - Smoke Test', () => {
  afterEach(() => {
    UniversalRealtimeService.cleanupAll();
  });

  test('Can create and cleanup listeners without crashes', () => {
    // Basic functionality test
    const cleanup = UniversalRealtimeService.createListener(
      'smoke-test',
      {} as any,
      jest.fn()
    );
    
    expect(UniversalRealtimeService.getListenerCount()).toBe(1);
    expect(UniversalRealtimeService.isListenerActive('smoke-test')).toBe(true);
    
    cleanup();
    expect(UniversalRealtimeService.getListenerCount()).toBe(0);
  });

  test('Multiple concurrent listeners work', async () => {
    const cleanups = [];
    
    // Create 5 listeners (realistic scenario)
    for (let i = 0; i < 5; i++) {
      const cleanup = UniversalRealtimeService.createListener(
        `concurrent-${i}`,
        {} as any,
        jest.fn()
      );
      cleanups.push(cleanup);
    }
    
    expect(UniversalRealtimeService.getListenerCount()).toBe(5);
    
    // Clean them up
    cleanups.forEach(cleanup => cleanup());
    expect(UniversalRealtimeService.getListenerCount()).toBe(0);
  });

  test('cleanupAll() removes everything', () => {
    // Create multiple listeners
    for (let i = 0; i < 3; i++) {
      UniversalRealtimeService.createListener(`all-${i}`, {} as any, jest.fn());
      UniversalRealtimeService.createDocumentListener(`doc-${i}`, {} as any, jest.fn());
    }
    
    expect(UniversalRealtimeService.getListenerCount()).toBe(6);
    
    // One call should clean everything
    UniversalRealtimeService.cleanupAll();
    expect(UniversalRealtimeService.getListenerCount()).toBe(0);
    
    // Verify internal maps are also clean
    expect(UniversalRealtimeService['listeners'].size).toBe(0);
    expect(UniversalRealtimeService['retryTimeouts'].size).toBe(0);
    expect(UniversalRealtimeService['activityTracker'].size).toBe(0);
  });
});