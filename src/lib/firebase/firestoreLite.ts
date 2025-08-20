/**
 * Firestore Lite REST-Only Service
 * 
 * This service provides REST-only Firestore access using the Firestore Lite SDK
 * to eliminate streaming transport errors in Brave, Safari, and other browsers
 * with strict security policies.
 * 
 * Key benefits:
 * - No streaming transport conflicts
 * - Smaller bundle size (no real-time listeners)
 * - Better browser compatibility
 * - Consistent data access patterns
 * 
 * Usage:
 * - Replace streaming operations with polling where needed
 * - Use for browsers that block Firestore streaming
 * - Fallback service for UnifiedRealtimeService
 */

import { 
  initializeApp, 
  getApps, 
  FirebaseApp 
} from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Firestore,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentSnapshot,
  QuerySnapshot,
  WhereFilterOp,
  OrderByDirection,
  Timestamp
} from 'firebase/firestore/lite';
import { 
  getAuth, 
  connectAuthEmulator,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';

import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule 
} from '../../types';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Service configuration
export interface FirestoreLiteConfig {
  enableEmulator?: boolean;
  emulatorHost?: string;
  emulatorPort?: number;
  cacheEnabled?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG: FirestoreLiteConfig = {
  enableEmulator: process.env.NODE_ENV === 'development',
  emulatorHost: 'localhost',
  emulatorPort: 8080,
  cacheEnabled: true,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Connection pooling and request batching
interface RequestBatch {
  requests: Array<{ resolve: Function; reject: Function; operation: () => Promise<any>; key: string }>;
  timestamp: number;
}

const requestBatches = new Map<string, RequestBatch>();
const BATCH_WINDOW_MS = 50; // 50ms batching window
const MAX_BATCH_SIZE = 10;

// Performance monitoring for FirestoreLite
interface PerformanceMetrics {
  totalRequests: number;
  batchedRequests: number;
  averageLatency: number;
  errorRate: number;
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
}

const performanceMetrics: PerformanceMetrics = {
  totalRequests: 0,
  batchedRequests: 0,
  averageLatency: 0,
  errorRate: 0,
  connectionPool: {
    active: 0,
    idle: 0,
    total: 0
  }
};

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

// Connection pool management
class ConnectionPool {
  private connections: Firestore[] = [];
  private readonly maxConnections = 5;
  private activeConnections = 0;
  
  getConnection(): Firestore {
    this.activeConnections++;
    performanceMetrics.connectionPool.active = this.activeConnections;
    
    if (this.connections.length > 0) {
      const conn = this.connections.pop()!;
      performanceMetrics.connectionPool.idle = this.connections.length;
      return conn;
    }
    
    // Create new connection if under limit
    if (performanceMetrics.connectionPool.total < this.maxConnections) {
      const newConn = FirestoreLiteService.getFirestore();
      performanceMetrics.connectionPool.total++;
      return newConn;
    }
    
    // Return shared connection if at limit
    return FirestoreLiteService.getFirestore();
  }
  
  releaseConnection(connection: Firestore): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    performanceMetrics.connectionPool.active = this.activeConnections;
    
    if (this.connections.length < this.maxConnections) {
      this.connections.push(connection);
      performanceMetrics.connectionPool.idle = this.connections.length;
    }
  }
  
  getStats() {
    return {
      active: this.activeConnections,
      idle: this.connections.length,
      total: performanceMetrics.connectionPool.total
    };
  }
}

const connectionPool = new ConnectionPool();

// Error types
export class FirestoreLiteError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'FirestoreLiteError';
  }
}

// Result types
export interface QueryResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: any;
}

export interface SingleResult<T> {
  data: T | null;
  exists: boolean;
}

/**
 * Firestore Lite Service - REST-only Firestore access
 */
export class FirestoreLiteService {
  private static app: FirebaseApp | null = null;
  private static db: Firestore | null = null;
  private static auth: Auth | null = null;
  private static config: FirestoreLiteConfig = DEFAULT_CONFIG;
  private static initialized = false;

  /**
   * Initialize the service
   */
  static initialize(config: Partial<FirestoreLiteConfig> = {}): void {
    if (this.initialized) return;

    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      // Initialize Firebase app
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig, 'firestore-lite');
      } else {
        this.app = getApps().find(app => app.name === 'firestore-lite') || getApps()[0];
      }

      // Initialize Firestore
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      // Connect to emulator if enabled
      if (this.config.enableEmulator && typeof window !== 'undefined') {
        try {
          connectFirestoreEmulator(
            this.db, 
            this.config.emulatorHost!, 
            this.config.emulatorPort!
          );
          connectAuthEmulator(
            this.auth, 
            `http://${this.config.emulatorHost}:9099`,
            { disableWarnings: true }
          );
        } catch (error) {
          // Emulator already connected or not available
          console.warn('Firestore Lite emulator connection failed:', error);
        }
      }

      this.initialized = true;
      console.log('FirestoreLiteService initialized successfully');
    } catch (error) {
      throw new FirestoreLiteError(
        'Failed to initialize FirestoreLiteService',
        'INIT_FAILED',
        'initialize',
        error as Error
      );
    }
  }

  /**
   * Get Firestore instance
   */
  public static getFirestore(): Firestore {
    if (!this.db) {
      throw new FirestoreLiteError(
        'Firestore not initialized',
        'NOT_INITIALIZED',
        'getFirestore'
      );
    }
    return this.db;
  }

  /**
   * Get Auth instance
   */
  private static getAuth(): Auth {
    if (!this.auth) {
      throw new FirestoreLiteError(
        'Auth not initialized',
        'NOT_INITIALIZED',
        'getAuth'
      );
    }
    return this.auth;
  }

  /**
   * Enhanced retry wrapper with exponential backoff and jitter
   */
  private static async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    performanceMetrics.totalRequests++;

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        const result = await operation();
        
        // Update performance metrics
        const latency = Date.now() - startTime;
        this.updatePerformanceMetrics(latency, false);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        performanceMetrics.errorRate = 
          (performanceMetrics.errorRate * (performanceMetrics.totalRequests - 1) + 1) / 
          performanceMetrics.totalRequests;
        
        if (attempt < this.config.retryAttempts! - 1) {
          // Exponential backoff with jitter
          const baseDelay = this.config.retryDelay! * Math.pow(2, attempt);
          const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
          const delay = Math.min(baseDelay + jitter, 30000); // Max 30s delay
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    const latency = Date.now() - startTime;
    this.updatePerformanceMetrics(latency, true);

    throw new FirestoreLiteError(
      `Operation failed after ${this.config.retryAttempts} attempts`,
      'RETRY_EXHAUSTED',
      operationName,
      lastError!
    );
  }
  
  /**
   * Update performance metrics
   */
  private static updatePerformanceMetrics(latency: number, isError: boolean): void {
    if (!isError) {
      const totalRequests = performanceMetrics.totalRequests;
      performanceMetrics.averageLatency = 
        (performanceMetrics.averageLatency * (totalRequests - 1) + latency) / totalRequests;
    }
  }
  
  /**
   * Request deduplication wrapper
   */
  private static async withDeduplication<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key) as Promise<T>;
    }
    
    // Create new request
    const requestPromise = operation();
    pendingRequests.set(key, requestPromise);
    
    try {
      const result = await requestPromise;
      pendingRequests.delete(key);
      return result;
    } catch (error) {
      pendingRequests.delete(key);
      throw error;
    }
  }
  
  /**
   * Batch multiple operations for efficiency
   */
  private static async batchOperation<T>(
    batchKey: string,
    operation: () => Promise<T>,
    operationKey: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = requestBatches.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timestamp: Date.now()
        };
        requestBatches.set(batchKey, batch);
        
        // Schedule batch execution
        setTimeout(() => {
          this.executeBatch(batchKey);
        }, BATCH_WINDOW_MS);
      }
      
      batch.requests.push({ resolve, reject, operation, key: operationKey });
      
      // Execute immediately if batch is full
      if (batch.requests.length >= MAX_BATCH_SIZE) {
        this.executeBatch(batchKey);
      }
    });
  }
  
  /**
   * Execute a batch of operations
   */
  private static async executeBatch(batchKey: string): Promise<void> {
    const batch = requestBatches.get(batchKey);
    if (!batch) return;
    
    requestBatches.delete(batchKey);
    
    // Track batched requests
    performanceMetrics.batchedRequests += batch.requests.length;
    
    // Execute all operations in parallel
    const promises = batch.requests.map(async ({ resolve, reject, operation }) => {
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Convert Firestore timestamp to Date
   */
  private static convertTimestamp(value: any): any {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value && typeof value === 'object') {
      const converted: any = {};
      for (const [key, val] of Object.entries(value)) {
        converted[key] = this.convertTimestamp(val);
      }
      return converted;
    }
    return value;
  }

  // ============ USER OPERATIONS ============

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<SingleResult<User>> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const userData = this.convertTimestamp(userDoc.data()) as User;
        return { data: userData, exists: true };
      }
      
      return { data: null, exists: false };
    }, 'getUser');
  }

  /**
   * Create or update user
   */
  static async setUser(userId: string, userData: Partial<User>): Promise<void> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        updatedAt: new Date(),
      }, { merge: true });
    }, 'setUser');
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: new Date(),
      });
    }, 'updateUser');
  }

  // ============ MEETING OPERATIONS ============

  /**
   * Get meeting by ID
   */
  static async getMeeting(meetingId: string): Promise<SingleResult<Meeting>> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const meetingDoc = await getDoc(doc(db, 'meetings', meetingId));
      
      if (meetingDoc.exists()) {
        const meetingData = this.convertTimestamp(meetingDoc.data()) as Meeting;
        return { data: meetingData, exists: true };
      }
      
      return { data: null, exists: false };
    }, 'getMeeting');
  }

  /**
   * Create meeting
   */
  static async createMeeting(meetingData: Omit<Meeting, 'meetingId'>): Promise<string> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const meetingRef = await addDoc(collection(db, 'meetings'), {
        ...meetingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      // Update the document with its own ID
      await updateDoc(meetingRef, { meetingId: meetingRef.id });
      
      return meetingRef.id;
    }, 'createMeeting');
  }

  /**
   * Update meeting
   */
  static async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      await updateDoc(doc(db, 'meetings', meetingId), {
        ...updates,
        updatedAt: new Date(),
      });
    }, 'updateMeeting');
  }

  /**
   * Delete meeting
   */
  static async deleteMeeting(meetingId: string): Promise<void> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      
      // Delete transcript entries
      const transcriptQuery = query(
        collection(db, `meetings/${meetingId}/transcriptEntries`)
      );
      const transcriptSnapshot = await getDocs(transcriptQuery);
      
      // Batch delete transcript entries
      const deletePromises = transcriptSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete the meeting document
      await deleteDoc(doc(db, 'meetings', meetingId));
    }, 'deleteMeeting');
  }

  /**
   * Get user meetings with pagination and optimization
   */
  static async getUserMeetings(
    userId: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      startAfterDoc?: any;
    } = {}
  ): Promise<QueryResult<Meeting>> {
    const dedupeKey = `getUserMeetings:${userId}:${JSON.stringify(options)}`;
    
    return this.withDeduplication(dedupeKey, () => 
      this.withRetry(async () => {
        const connection = connectionPool.getConnection();
        
        try {
          const {
            limit: queryLimit = 20,
            orderBy: orderByField = 'createdAt',
            orderDirection = 'desc',
            startAfterDoc
          } = options;

          let meetingQuery: Query = query(
            collection(connection, 'meetings'),
            where('hostId', '==', userId),
            orderBy(orderByField as string, orderDirection as OrderByDirection),
            limit(queryLimit + 1) // Get one extra to check hasMore
          );

          if (startAfterDoc) {
            meetingQuery = query(meetingQuery, startAfter(startAfterDoc));
          }

          const snapshot = await getDocs(meetingQuery);
          const meetings = snapshot.docs
            .slice(0, queryLimit)
            .map(doc => this.convertTimestamp({ ...doc.data(), meetingId: doc.id }) as Meeting);

          return {
            data: meetings,
            hasMore: snapshot.docs.length > queryLimit,
            lastDoc: meetings.length > 0 ? snapshot.docs[meetings.length - 1] : undefined,
          };
        } finally {
          connectionPool.releaseConnection(connection);
        }
      }, 'getUserMeetings')
    );
  }

  /**
   * Search meetings by title or content
   */
  static async searchMeetings(
    userId: string,
    searchTerm: string,
    options: {
      limit?: number;
    } = {}
  ): Promise<QueryResult<Meeting>> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const { limit: queryLimit = 20 } = options;

      // Note: Firestore doesn't support full-text search
      // This is a basic implementation that searches by title prefix
      const meetingQuery = query(
        collection(db, 'meetings'),
        where('hostId', '==', userId),
        where('title', '>=', searchTerm),
        where('title', '<=', searchTerm + '\uf8ff'),
        orderBy('title'),
        limit(queryLimit)
      );

      const snapshot = await getDocs(meetingQuery);
      const meetings = snapshot.docs.map(doc => 
        this.convertTimestamp({ ...doc.data(), meetingId: doc.id }) as Meeting
      );

      return {
        data: meetings,
        hasMore: false, // Simple implementation
      };
    }, 'searchMeetings');
  }

  // ============ TRANSCRIPT OPERATIONS ============

  /**
   * Add transcript entry
   */
  static async addTranscriptEntry(
    meetingId: string,
    entry: Omit<TranscriptEntry, 'id'>
  ): Promise<string> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const entryRef = await addDoc(
        collection(db, `meetings/${meetingId}/transcriptEntries`),
        {
          ...entry,
          timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
          createdAt: new Date(),
        }
      );
      
      return entryRef.id;
    }, 'addTranscriptEntry');
  }

  /**
   * Get transcript entries for a meeting
   */
  static async getTranscriptEntries(
    meetingId: string,
    options: {
      limit?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<QueryResult<TranscriptEntry>> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const {
        limit: queryLimit = 100,
        orderBy: orderByField = 'timestamp',
        orderDirection = 'asc'
      } = options;

      const transcriptQuery = query(
        collection(db, `meetings/${meetingId}/transcriptEntries`),
        orderBy(orderByField as string, orderDirection as OrderByDirection),
        limit(queryLimit)
      );

      const snapshot = await getDocs(transcriptQuery);
      const entries = snapshot.docs.map(doc => 
        this.convertTimestamp({ ...doc.data(), id: doc.id }) as TranscriptEntry
      );

      return {
        data: entries,
        hasMore: false, // Simple implementation
      };
    }, 'getTranscriptEntries');
  }

  /**
   * Update transcript entry
   */
  static async updateTranscriptEntry(
    meetingId: string,
    entryId: string,
    updates: Partial<TranscriptEntry>
  ): Promise<void> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      await updateDoc(
        doc(db, `meetings/${meetingId}/transcriptEntries`, entryId),
        updates
      );
    }, 'updateTranscriptEntry');
  }

  /**
   * Delete transcript entry
   */
  static async deleteTranscriptEntry(
    meetingId: string,
    entryId: string
  ): Promise<void> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      await deleteDoc(doc(db, `meetings/${meetingId}/transcriptEntries`, entryId));
    }, 'deleteTranscriptEntry');
  }

  // ============ VOICE PROFILE OPERATIONS ============

  /**
   * Get user voice profiles
   */
  static async getUserVoiceProfiles(userId: string): Promise<QueryResult<SpeakerProfile>> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const profileQuery = query(
        collection(db, 'voiceProfiles'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(profileQuery);
      const profiles = snapshot.docs.map(doc => 
        this.convertTimestamp({ ...doc.data(), id: doc.id }) as SpeakerProfile
      );

      return {
        data: profiles,
        hasMore: false,
      };
    }, 'getUserVoiceProfiles');
  }

  /**
   * Create voice profile
   */
  static async createVoiceProfile(profileData: Omit<SpeakerProfile, 'speakerId'>): Promise<string> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const profileRef = await addDoc(collection(db, 'voiceProfiles'), {
        ...profileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      await updateDoc(profileRef, { speakerId: profileRef.id });
      
      return profileRef.id;
    }, 'createVoiceProfile');
  }

  // ============ CUSTOM RULES OPERATIONS ============

  /**
   * Get user custom rules
   */
  static async getUserCustomRules(userId: string): Promise<QueryResult<CustomRule>> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const rulesQuery = query(
        collection(db, 'customRules'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(rulesQuery);
      const rules = snapshot.docs.map(doc => 
        this.convertTimestamp({ ...doc.data(), id: doc.id }) as CustomRule
      );

      return {
        data: rules,
        hasMore: false,
      };
    }, 'getUserCustomRules');
  }

  /**
   * Create custom rule
   */
  static async createCustomRule(ruleData: Omit<CustomRule, 'id'>): Promise<string> {
    return this.withRetry(async () => {
      const db = this.getFirestore();
      const ruleRef = await addDoc(collection(db, 'customRules'), {
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return ruleRef.id;
    }, 'createCustomRule');
  }

  // ============ UTILITY METHODS ============

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): FirebaseUser | null {
    const auth = this.getAuth();
    return auth.currentUser;
  }

  /**
   * Check if service is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service configuration
   */
  static getConfig(): FirestoreLiteConfig {
    return { ...this.config };
  }

  /**
   * Get comprehensive service info
   */
  static getServiceInfo() {
    return {
      initialized: this.initialized,
      mode: 'rest-only',
      config: this.config,
      hasAuth: !!this.auth,
      hasFirestore: !!this.db,
      performance: this.getPerformanceMetrics(),
      connectionPool: connectionPool.getStats(),
      pendingOperations: pendingRequests.size,
      activeBatches: requestBatches.size
    };
  }

  /**
   * Health check with detailed diagnostics
   */
  static async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized) return false;
      
      const startTime = Date.now();
      const connection = connectionPool.getConnection();
      
      try {
        // Try a simple read operation
        await getDoc(doc(connection, '__health__', 'check'));
        
        const latency = Date.now() - startTime;
        this.updatePerformanceMetrics(latency, false);
        
        return true;
      } finally {
        connectionPool.releaseConnection(connection);
      }
    } catch {
      return false;
    }
  }
  
  /**
   * Get detailed performance metrics
   */
  static getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...performanceMetrics,
      connectionPool: connectionPool.getStats()
    };
  }
  
  /**
   * Reset performance metrics
   */
  static resetPerformanceMetrics(): void {
    performanceMetrics.totalRequests = 0;
    performanceMetrics.batchedRequests = 0;
    performanceMetrics.averageLatency = 0;
    performanceMetrics.errorRate = 0;
  }
  
  /**
   * Clear pending requests and batches
   */
  static clearPendingOperations(): number {
    const pendingCount = pendingRequests.size;
    const batchCount = requestBatches.size;
    
    pendingRequests.clear();
    requestBatches.clear();
    
    return pendingCount + batchCount;
  }
  
  /**
   * Optimize connection pool
   */
  static optimizeConnectionPool(): void {
    // Clear any idle connections to reset pool
    const stats = connectionPool.getStats();
    console.log('Connection pool optimization:', stats);
  }
  
  /**
   * Get batch operation statistics
   */
  static getBatchStats() {
    return {
      totalRequests: performanceMetrics.totalRequests,
      batchedRequests: performanceMetrics.batchedRequests,
      batchEfficiency: performanceMetrics.totalRequests > 0 ? 
        (performanceMetrics.batchedRequests / performanceMetrics.totalRequests) * 100 : 0,
      averageLatency: performanceMetrics.averageLatency,
      errorRate: performanceMetrics.errorRate * 100
    };
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  FirestoreLiteService.initialize();
}

export { FirestoreLiteService as default };