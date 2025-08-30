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
  
  static createListener<T extends DocumentData>(
    listenerId: string,
    query: Query<T>,
    callback: (data: T[]) => void
  ): () => void {
    // Clean up any existing listener with defensive approach
    this.cleanup(listenerId);
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // Try real-time first (works on 90% of browsers)
    const tryRealtime = () => {
      const unsubscribe = onSnapshot(
        query,
        { includeMetadataChanges: false, source: 'default' },
        (snapshot) => {
          // Success! Reset failure count
          failureCount = 0;
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          callback(data);
        },
        (error) => {
          failureCount++;
          console.warn(`Listener error (${failureCount}/${MAX_FAILURES}):`, error);
          
          if (failureCount >= MAX_FAILURES) {
            // Fall back to polling
            console.log(`Falling back to polling for ${listenerId}`);
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
    
    // Simple polling fallback (works on 100% of browsers)
    const startPolling = () => {
      let pollErrorCount = 0;
      const MAX_POLL_ERRORS = 5;
      
      const poll = async () => {
        try {
          const snapshot = await getDocs(query);
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as T[];
          callback(data);
          
          // Success - reset error count
          pollErrorCount = 0;
        } catch (error) {
          pollErrorCount++;
          console.error(`Polling error ${pollErrorCount}/${MAX_POLL_ERRORS}:`, error);
          
          if (pollErrorCount >= MAX_POLL_ERRORS) {
            console.warn(`Too many polling errors for ${listenerId}, stopping`);
            this.cleanup(listenerId);
            return;
          }
        }
      };
      
      poll(); // Initial poll
      const interval = setInterval(poll, 30000); // Poll every 30s
      this.listeners.set(listenerId, () => clearInterval(interval));
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
    
    let failureCount = 0;
    const MAX_FAILURES = 3;
    
    // Try real-time first
    const tryRealtime = () => {
      const unsubscribe = onSnapshot(
        docRef,
        { includeMetadataChanges: false, source: 'default' },
        (snapshot: DocumentSnapshot) => {
          // Success! Reset failure count
          failureCount = 0;
          if (snapshot.exists()) {
            const docData = snapshot.data() || {};
            const data = {
              id: snapshot.id,
              ...docData
            } as unknown as T;
            callback(data);
          } else {
            callback(null);
          }
        },
        (error: FirestoreError) => {
          failureCount++;
          console.warn(`Document listener error (${failureCount}/${MAX_FAILURES}):`, error);
          
          if (failureCount >= MAX_FAILURES) {
            // Fall back to polling
            console.log(`Falling back to polling for document ${listenerId}`);
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
    
    // Simple polling fallback for documents
    const startPolling = () => {
      let pollErrorCount = 0;
      const MAX_POLL_ERRORS = 5;
      
      const poll = async () => {
        try {
          const snapshot = await getDoc(docRef);
          if (snapshot.exists()) {
            const docData = snapshot.data() as Record<string, any> | undefined;
            const data = {
              id: snapshot.id,
              ...(docData || {})
            } as unknown as T;
            callback(data);
          } else {
            callback(null);
          }
          
          // Success - reset error count
          pollErrorCount = 0;
        } catch (error) {
          pollErrorCount++;
          console.error(`Document polling error ${pollErrorCount}/${MAX_POLL_ERRORS}:`, error);
          
          if (pollErrorCount >= MAX_POLL_ERRORS) {
            console.warn(`Too many document polling errors for ${listenerId}, stopping`);
            this.cleanup(listenerId);
            return;
          }
        }
      };
      
      poll(); // Initial poll
      const interval = setInterval(poll, 30000); // Poll every 30s
      this.listeners.set(listenerId, () => clearInterval(interval));
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
}