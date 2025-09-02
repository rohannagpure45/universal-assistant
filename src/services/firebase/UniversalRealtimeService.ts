/**
 * Universal real-time service that works on ALL browsers
 * No browser detection, no complex fallbacks, just reliable data
 */
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  Query,
  DocumentData,
  DocumentReference,
  SnapshotOptions,
  QuerySnapshot,
  DocumentSnapshot,
  FirestoreError
} from 'firebase/firestore';

export class UniversalRealtimeService {
  private static listeners = new Map<string, () => void>();
  private static retryTimeouts = new Map<string, NodeJS.Timeout>();
  // Simple activity tracking for adaptive polling
  private static activityTracker = new Map<string, { 
    lastDataHash: string; 
    recentChanges: number; 
    currentMode: 'realtime' | 'polling' | 'error';
    currentInterval?: number;
  }>();

  // Simple helper for activity-based polling intervals
  private static getAdaptiveInterval(listenerId: string, hasChanged: boolean): number {
    const tracker = this.activityTracker.get(listenerId);
    if (!tracker) return 30000; // Default 30s
    
    if (hasChanged) {
      tracker.recentChanges = Math.min(tracker.recentChanges + 1, 5); // Cap at 5
      return tracker.recentChanges >= 2 ? 15000 : 30000; // 15s if active, 30s normal
    } else {
      tracker.recentChanges = Math.max(tracker.recentChanges - 1, 0); // Decay
      return tracker.recentChanges === 0 ? 45000 : 30000; // 45s if idle, 30s normal
    }
  }
  
  static createListener<T extends DocumentData>(
    listenerId: string,
    query: Query<T>,
    callback: (data: T[]) => void
  ): () => void {
    // Clean up any existing listener with defensive approach
    this.cleanup(listenerId);
    
    // Initialize simple activity tracker
    this.activityTracker.set(listenerId, {
      lastDataHash: '',
      recentChanges: 0,
      currentMode: 'realtime',
      currentInterval: 30000
    });
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // Try real-time first (works on 90% of browsers)
    const tryRealtime = () => {
      const unsubscribe = onSnapshot(
        query,
        { includeMetadataChanges: false, source: 'default' },
        (snapshot) => {
          // Success! Reset failure count and update activity tracker
          failureCount = 0;
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          
          // Simple activity tracking - just track data changes
          const tracker = this.activityTracker.get(listenerId);
          if (tracker) {
            const currentHash = JSON.stringify(data.map(d => d.id).sort());
            const hasChanged = currentHash !== tracker.lastDataHash;
            if (hasChanged) {
              tracker.lastDataHash = currentHash;
            }
            tracker.currentMode = 'realtime';
          }
          
          callback(data);
        },
        (error) => {
          failureCount++;
          console.warn(`Listener error (${failureCount}/${MAX_FAILURES}):`, error);
          
          if (failureCount >= MAX_FAILURES) {
            // Fall back to polling
            console.log(`Falling back to polling for ${listenerId}`);
            const tracker = this.activityTracker.get(listenerId);
            if (tracker) tracker.currentMode = 'polling';
            this.cleanup(listenerId);
            startPolling();
          } else {
            // Retry with exponential backoff
            const retryDelay = Math.min(1000 * Math.pow(2, failureCount), 10000);
            const timeout = setTimeout(() => {
              this.cleanup(listenerId);
              tryRealtime();
            }, retryDelay);
            this.retryTimeouts.set(listenerId, timeout);
          }
        }
      );
      
      this.listeners.set(listenerId, unsubscribe);
    };
    
    // Simple polling fallback with adaptive intervals (works on 100% of browsers)
    const startPolling = () => {
      let pollErrorCount = 0;
      let pollInterval: NodeJS.Timeout | null = null;
      const MAX_POLL_ERRORS = 5;
      
      const poll = async () => {
        try {
          const snapshot = await getDocs(query);
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          
          // Activity-based adaptive interval
          const tracker = this.activityTracker.get(listenerId);
          let hasChanged = false;
          if (tracker) {
            const currentHash = JSON.stringify(data.map(d => d.id).sort());
            hasChanged = currentHash !== tracker.lastDataHash;
            if (hasChanged) {
              tracker.lastDataHash = currentHash;
            }
          }
          
          callback(data);
          
          // Success - reset error count and schedule next poll with adaptive interval
          pollErrorCount = 0;
          const nextInterval = this.getAdaptiveInterval(listenerId, hasChanged);
          if (tracker) tracker.currentInterval = nextInterval;
          
          // Schedule next poll with new interval
          if (pollInterval) clearTimeout(pollInterval);
          pollInterval = setTimeout(poll, nextInterval);
          
        } catch (error) {
          pollErrorCount++;
          console.error(`Polling error ${pollErrorCount}/${MAX_POLL_ERRORS}:`, error);
          
          if (pollErrorCount >= MAX_POLL_ERRORS) {
            console.warn(`Too many polling errors for ${listenerId}, stopping`);
            const tracker = this.activityTracker.get(listenerId);
            if (tracker) tracker.currentMode = 'error';
            this.cleanup(listenerId);
            return;
          }
          
          // Retry with same interval on error
          if (pollInterval) clearTimeout(pollInterval);
          pollInterval = setTimeout(poll, 30000);
        }
      };
      
      poll(); // Initial poll
      this.listeners.set(listenerId, () => {
        if (pollInterval) clearTimeout(pollInterval);
      });
    };
    
    tryRealtime(); // Start with real-time
    return () => this.cleanup(listenerId); // Return cleanup function
  }

  /**
   * Create a listener for a single document
   */
  static createDocumentListener<T extends DocumentData>(
    listenerId: string,
    docRef: any, // Using any to avoid complex type issues with doc()
    callback: (data: T | null) => void
  ): () => void {
    // Clean up any existing listener with defensive approach
    this.cleanup(listenerId);
    
    // Initialize simple activity tracker
    this.activityTracker.set(listenerId, {
      lastDataHash: '',
      recentChanges: 0,
      currentMode: 'realtime',
      currentInterval: 30000
    });
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // Try real-time first
    const tryRealtime = () => {
      const unsubscribe = onSnapshot(
        docRef,
        { includeMetadataChanges: false, source: 'default' },
        (snapshot: DocumentSnapshot) => {
          // Success! Reset failure count and update activity tracker
          failureCount = 0;
          
          let data: T | null = null;
          if (snapshot.exists()) {
            const docData = snapshot.data() || {};
            data = {
              id: snapshot.id,
              ...docData
            } as unknown as T;
          }
          
          // Simple activity tracking for documents
          const tracker = this.activityTracker.get(listenerId);
          if (tracker) {
            const currentHash = data ? JSON.stringify(data).substring(0, 100) : 'null';
            const hasChanged = currentHash !== tracker.lastDataHash;
            if (hasChanged) {
              tracker.lastDataHash = currentHash;
            }
            tracker.currentMode = 'realtime';
          }
          
          callback(data);
        },
        (error: FirestoreError) => {
          failureCount++;
          console.warn(`Document listener error (${failureCount}/${MAX_FAILURES}):`, error);
          
          if (failureCount >= MAX_FAILURES) {
            // Fall back to polling
            console.log(`Falling back to polling for document ${listenerId}`);
            const tracker = this.activityTracker.get(listenerId);
            if (tracker) tracker.currentMode = 'polling';
            this.cleanup(listenerId);
            startPolling();
          } else {
            // Retry with exponential backoff
            const retryDelay = Math.min(1000 * Math.pow(2, failureCount), 10000);
            const timeout = setTimeout(() => {
              this.cleanup(listenerId);
              tryRealtime();
            }, retryDelay);
            this.retryTimeouts.set(listenerId, timeout);
          }
        }
      );
      
      this.listeners.set(listenerId, unsubscribe);
    };
    
    // Simple polling fallback for documents with adaptive intervals
    const startPolling = () => {
      let pollErrorCount = 0;
      let pollInterval: NodeJS.Timeout | null = null;
      const MAX_POLL_ERRORS = 5;
      
      const poll = async () => {
        try {
          const snapshot = await getDoc(docRef);
          let data: T | null = null;
          
          if (snapshot.exists()) {
            const docData = snapshot.data() as Record<string, any> | undefined;
            data = {
              id: snapshot.id,
              ...(docData || {})
            } as unknown as T;
          }
          
          // Activity-based adaptive interval for documents
          const tracker = this.activityTracker.get(listenerId);
          let hasChanged = false;
          if (tracker) {
            const currentHash = data ? JSON.stringify(data).substring(0, 100) : 'null';
            hasChanged = currentHash !== tracker.lastDataHash;
            if (hasChanged) {
              tracker.lastDataHash = currentHash;
            }
          }
          
          callback(data);
          
          // Success - reset error count and schedule next poll with adaptive interval
          pollErrorCount = 0;
          const nextInterval = this.getAdaptiveInterval(listenerId, hasChanged);
          if (tracker) tracker.currentInterval = nextInterval;
          
          // Schedule next poll with new interval
          if (pollInterval) clearTimeout(pollInterval);
          pollInterval = setTimeout(poll, nextInterval);
          
        } catch (error) {
          pollErrorCount++;
          console.error(`Document polling error ${pollErrorCount}/${MAX_POLL_ERRORS}:`, error);
          
          if (pollErrorCount >= MAX_POLL_ERRORS) {
            console.warn(`Too many document polling errors for ${listenerId}, stopping`);
            const tracker = this.activityTracker.get(listenerId);
            if (tracker) tracker.currentMode = 'error';
            this.cleanup(listenerId);
            return;
          }
          
          // Retry with same interval on error
          if (pollInterval) clearTimeout(pollInterval);
          pollInterval = setTimeout(poll, 30000);
        }
      };
      
      poll(); // Initial poll
      this.listeners.set(listenerId, () => {
        if (pollInterval) clearTimeout(pollInterval);
      });
    };
    
    tryRealtime(); // Start with real-time
    return () => this.cleanup(listenerId); // Return cleanup function
  }
  
  private static cleanup(listenerId: string): void {
    // Enhanced defensive cleanup - handle all resources safely
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (error) {
        console.error(`Error cleaning up listener ${listenerId}:`, error);
      }
      this.listeners.delete(listenerId);
    }
    
    // Clean up retry timeouts with error handling
    const timeout = this.retryTimeouts.get(listenerId);
    if (timeout) {
      try {
        clearTimeout(timeout);
      } catch (error) {
        console.error(`Error clearing timeout for ${listenerId}:`, error);
      }
      this.retryTimeouts.delete(listenerId);
    }
    
    // Clean up activity tracker
    this.activityTracker.delete(listenerId);
    
    // Log cleanup for debugging memory leaks
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Cleaned up resources for listener: ${listenerId}`);
    }
  }

  /**
   * Get current listener count for monitoring
   */
  static getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Clean up all listeners (useful for app shutdown)
   */
  static cleanupAll(): void {
    // Clean up all listeners
    const listenerIds = Array.from(this.listeners.keys());
    for (const listenerId of listenerIds) {
      this.cleanup(listenerId);
    }
    
    // Emergency cleanup - clear any remaining timeouts directly
    const timeouts = Array.from(this.retryTimeouts.values());
    for (const timeout of timeouts) {
      try {
        clearTimeout(timeout);
      } catch (error) {
        console.error('Error during emergency timeout cleanup:', error);
      }
    }
    this.retryTimeouts.clear();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Cleaned up ${listenerIds.length} listeners during shutdown`);
    }
  }

  /**
   * Check if a listener is active
   */
  static isListenerActive(listenerId: string): boolean {
    return this.listeners.has(listenerId);
  }

  /**
   * Get connection status for a listener (Bug #8 fix)
   */
  static getConnectionStatus(listenerId: string): 'realtime' | 'polling' | 'error' | 'disconnected' {
    const tracker = this.activityTracker.get(listenerId);
    if (!tracker) return 'disconnected';
    return tracker.currentMode;
  }

  /**
   * Get current polling interval for a listener (Bug #8 fix) 
   */
  static getCurrentInterval(listenerId: string): number {
    const tracker = this.activityTracker.get(listenerId);
    return tracker?.currentInterval || 30000;
  }

  /**
   * Get activity level for a listener (Bug #8 fix)
   */
  static getActivityLevel(listenerId: string): 'idle' | 'low' | 'medium' | 'high' {
    const tracker = this.activityTracker.get(listenerId);
    if (!tracker) return 'idle';
    
    const changes = tracker.recentChanges;
    if (changes === 0) return 'idle';
    if (changes <= 1) return 'low';
    if (changes <= 3) return 'medium';
    return 'high';
  }

  /**
   * Get all connection states for monitoring (Bug #8 fix)
   */
  static getAllConnectionStates(): Record<string, {
    status: 'realtime' | 'polling' | 'error' | 'disconnected';
    interval: number;
    activity: 'idle' | 'low' | 'medium' | 'high';
  }> {
    const states: Record<string, any> = {};
    
    this.activityTracker.forEach((tracker, listenerId) => {
      states[listenerId] = {
        status: tracker.currentMode,
        interval: tracker.currentInterval || 30000,
        activity: this.getActivityLevel(listenerId)
      };
    });
    
    return states;
  }

  /**
   * Phase 5: Minimal monitoring - Get health metrics (defensive approach)
   */
  static getHealthMetrics(): {
    listenerCount: number;
    errorCount: number;
    healthScore: number;
    timestamp: Date;
  } {
    const states = this.getAllConnectionStates();
    const totalCount = Object.keys(states).length;
    const errorCount = Object.values(states).filter(s => s.status === 'error').length;
    
    return {
      listenerCount: totalCount,
      errorCount: errorCount,
      healthScore: totalCount > 0 ? ((totalCount - errorCount) / totalCount) * 100 : 100,
      timestamp: new Date()
    };
  }

  /**
   * Phase 5: Simple feature flag (defensive approach)
   */
  static isEnabled(): boolean {
    // Simple environment variable check
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_USE_UNIVERSAL_REALTIME === 'false') {
      return false;
    }
    return true; // Default to enabled
  }

  /**
   * Phase 5: Debug logging for development only (defensive approach)
   */
  static logHealth(): void {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      const metrics = this.getHealthMetrics();
      console.log('[UniversalRealtime]', {
        listeners: metrics.listenerCount,
        health: `${metrics.healthScore.toFixed(0)}%`,
        errors: metrics.errorCount
      });
    }
  }
}