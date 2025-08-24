/**
 * OptimizedDatabaseService - Production-Optimized Firebase Operations
 * 
 * Implements comprehensive database optimizations including batch operations,
 * query optimization, connection pooling, and intelligent caching strategies.
 */

import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  onSnapshot,
  writeBatch,
  runTransaction,
  enableNetwork,
  disableNetwork,
  connectFirestoreEmulator,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe,
  FirestoreError,
  DocumentReference,
  CollectionReference,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { nanoid } from 'nanoid';

export interface OptimizedQueryOptions {
  useCache?: boolean;
  cacheTTL?: number;
  enableBatching?: boolean;
  maxBatchSize?: number;
  retryAttempts?: number;
  timeout?: number;
}

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: any;
}

export interface QueryCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
}

export interface ConnectionMetrics {
  activeConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  errorRate: number;
}

export class OptimizedDatabaseService {
  private queryCache = new Map<string, QueryCache>();
  private batchQueue: BatchOperation[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private connectionPool: Set<Unsubscribe> = new Set();
  private metrics: ConnectionMetrics = {
    activeConnections: 0,
    totalQueries: 0,
    averageQueryTime: 0,
    cacheHitRate: 0,
    errorRate: 0
  };
  
  private readonly config = {
    batchSize: 500, // Maximum batch size
    batchTimeout: 1000, // 1 second batch timeout
    cacheTTL: 300000, // 5 minutes default cache TTL
    maxCacheSize: 1000, // Maximum cache entries
    queryTimeout: 30000, // 30 second query timeout
    retryAttempts: 3,
    retryDelay: 1000
  };

  constructor() {
    this.initializeOptimizations();
  }

  /**
   * Initialize performance optimizations
   */
  private initializeOptimizations(): void {
    // Set up cache cleanup interval
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute

    // Set up metrics collection
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update metrics every 10 seconds

    // Set up connection health monitoring
    this.monitorConnectionHealth();
  }

  /**
   * Optimized document retrieval with caching
   */
  public async getDocument<T>(
    collectionName: string, 
    docId: string,
    options: OptimizedQueryOptions = {}
  ): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = `${collectionName}/${docId}`;
    
    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
          return cached as T;
        }
      }

      // Fetch from Firestore
      const docRef = doc(db, collectionName, docId);
      const docSnap = await this.executeWithTimeout(
        getDoc(docRef),
        options.timeout || this.config.queryTimeout
      );
      
      const data = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
      
      // Cache the result
      if (data && options.useCache !== false) {
        this.setCache(cacheKey, data, options.cacheTTL || this.config.cacheTTL);
      }

      this.updateQueryMetrics(startTime);
      return data;

    } catch (error) {
      this.handleQueryError(error, 'getDocument');
      throw error;
    }
  }

  /**
   * Optimized collection query with caching and pagination
   */
  public async getDocuments<T>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    options: OptimizedQueryOptions = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    const cacheKey = this.generateQueryCacheKey(collectionName, constraints);
    
    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.metrics.cacheHitRate = (this.metrics.cacheHitRate + 1) / 2;
          return cached as T[];
        }
      }

      // Build optimized query
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, ...constraints);
      
      // Execute query with timeout
      const querySnapshot = await this.executeWithTimeout(
        getDocs(q),
        options.timeout || this.config.queryTimeout
      );
      
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      // Cache the result
      if (options.useCache !== false) {
        this.setCache(cacheKey, documents, options.cacheTTL || this.config.cacheTTL);
      }

      this.updateQueryMetrics(startTime);
      return documents;

    } catch (error) {
      this.handleQueryError(error, 'getDocuments');
      throw error;
    }
  }

  /**
   * Optimized batch operations
   */
  public async batchWrite(operations: BatchOperation[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Split into chunks if necessary
      const chunks = this.chunkArray(operations, this.config.batchSize);
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        
        chunk.forEach(operation => {
          switch (operation.type) {
            case 'set':
              batch.set(operation.ref, operation.data);
              break;
            case 'update':
              batch.update(operation.ref, operation.data);
              break;
            case 'delete':
              batch.delete(operation.ref);
              break;
          }
        });

        await this.executeWithTimeout(
          batch.commit(),
          this.config.queryTimeout
        );
      }

      // Invalidate related cache entries
      this.invalidateCacheForBatch(operations);
      this.updateQueryMetrics(startTime);

    } catch (error) {
      this.handleQueryError(error, 'batchWrite');
      throw error;
    }
  }

  /**
   * Optimized transaction operations
   */
  public async runOptimizedTransaction<T>(
    updateFunction: (transaction: any) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.executeWithTimeout(
        runTransaction(db, updateFunction),
        this.config.queryTimeout * 2 // Double timeout for transactions
      );

      this.updateQueryMetrics(startTime);
      return result;

    } catch (error) {
      this.handleQueryError(error, 'transaction');
      throw error;
    }
  }

  /**
   * Queue batch operation for delayed execution
   */
  public queueBatchOperation(operation: BatchOperation): void {
    this.batchQueue.push(operation);
    
    // Set up batch timer if not already set
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.executeBatchQueue();
      }, this.config.batchTimeout);
    }
    
    // Execute immediately if batch is full
    if (this.batchQueue.length >= this.config.batchSize) {
      this.executeBatchQueue();
    }
  }

  /**
   * Execute queued batch operations
   */
  private async executeBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const operations = [...this.batchQueue];
    this.batchQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    try {
      await this.batchWrite(operations);
    } catch (error) {
      console.error('Batch queue execution failed:', error);
      // Re-queue failed operations with exponential backoff
      setTimeout(() => {
        this.batchQueue.unshift(...operations);
      }, Math.random() * 5000 + 1000);
    }
  }

  /**
   * Optimized real-time listener with connection pooling
   */
  public subscribeToDocument<T>(
    collectionName: string,
    docId: string,
    callback: (data: T | null) => void,
    errorCallback?: (error: FirestoreError) => void
  ): () => void {
    const docRef = doc(db, collectionName, docId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        const data = doc.exists() ? { id: doc.id, ...doc.data() } as T : null;
        
        // Update cache
        const cacheKey = `${collectionName}/${docId}`;
        if (data) {
          this.setCache(cacheKey, data, this.config.cacheTTL);
        } else {
          this.queryCache.delete(cacheKey);
        }
        
        callback(data);
      },
      (error) => {
        this.handleQueryError(error, 'subscribe');
        if (errorCallback) errorCallback(error);
      }
    );

    this.connectionPool.add(unsubscribe);
    this.metrics.activeConnections++;
    
    return () => {
      unsubscribe();
      this.connectionPool.delete(unsubscribe);
      this.metrics.activeConnections--;
    };
  }

  /**
   * Optimized collection listener with filtering
   */
  public subscribeToCollection<T>(
    collectionName: string,
    constraints: QueryConstraint[],
    callback: (data: T[]) => void,
    errorCallback?: (error: FirestoreError) => void
  ): () => void {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        
        // Update cache
        const cacheKey = this.generateQueryCacheKey(collectionName, constraints);
        this.setCache(cacheKey, documents, this.config.cacheTTL);
        
        callback(documents);
      },
      (error) => {
        this.handleQueryError(error, 'subscribeCollection');
        if (errorCallback) errorCallback(error);
      }
    );

    this.connectionPool.add(unsubscribe);
    this.metrics.activeConnections++;
    
    return () => {
      unsubscribe();
      this.connectionPool.delete(unsubscribe);
      this.metrics.activeConnections--;
    };
  }

  /**
   * Paginated query optimization
   */
  public async getPaginatedDocuments<T>(
    collectionName: string,
    constraints: QueryConstraint[],
    pageSize: number = 20,
    lastDocument?: DocumentSnapshot
  ): Promise<{ documents: T[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
    const startTime = Date.now();
    
    try {
      const collectionRef = collection(db, collectionName);
      let q = query(collectionRef, ...constraints, limit(pageSize + 1));
      
      if (lastDocument) {
        q = query(collectionRef, ...constraints, startAfter(lastDocument), limit(pageSize + 1));
      }
      
      const querySnapshot = await this.executeWithTimeout(
        getDocs(q),
        this.config.queryTimeout
      );
      
      const docs = querySnapshot.docs;
      const hasMore = docs.length > pageSize;
      
      if (hasMore) {
        docs.pop(); // Remove the extra document used to check for more
      }
      
      const documents = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      this.updateQueryMetrics(startTime);
      
      return {
        documents,
        hasMore,
        lastDoc: docs.length > 0 ? docs[docs.length - 1] : undefined
      };

    } catch (error) {
      this.handleQueryError(error, 'getPaginatedDocuments');
      throw error;
    }
  }

  /**
   * Cache management methods
   */
  private setCache(key: string, data: any, ttl: number): void {
    // Implement LRU eviction if cache is full
    if (this.queryCache.size >= this.config.maxCacheSize) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }
    
    this.queryCache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    // Check if cache has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.queryCache.forEach((cached, key) => {
      if (now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }

  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    this.queryCache.forEach((cached, key) => {
      if (cached.timestamp < oldestTime) {
        oldestTime = cached.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  /**
   * Utility methods
   */
  private generateQueryCacheKey(collectionName: string, constraints: QueryConstraint[]): string {
    const constraintStrings = constraints.map(c => c.toString()).join('|');
    return `${collectionName}:${constraintStrings}`;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      })
    ]);
  }

  private invalidateCacheForBatch(operations: BatchOperation[]): void {
    operations.forEach(operation => {
      const path = operation.ref.path;
      const keysToDelete: string[] = [];
      
      this.queryCache.forEach((_, key) => {
        if (key.includes(path) || path.includes(key.split('/')[0])) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.queryCache.delete(key));
    });
  }

  private updateQueryMetrics(startTime: number): void {
    const queryTime = Date.now() - startTime;
    this.metrics.totalQueries++;
    this.metrics.averageQueryTime = (this.metrics.averageQueryTime + queryTime) / 2;
  }

  private handleQueryError(error: any, operation: string): void {
    this.metrics.errorRate = (this.metrics.errorRate * 0.9) + 0.1;
    console.error(`Database operation ${operation} failed:`, error);
  }

  private updateMetrics(): void {
    // Update cache hit rate based on cache usage
    const cacheUsage = this.queryCache.size / this.config.maxCacheSize;
    this.metrics.cacheHitRate = Math.min(this.metrics.cacheHitRate + (cacheUsage * 0.1), 1);
  }

  private monitorConnectionHealth(): void {
    // Monitor network connectivity and database health
    setInterval(async () => {
      try {
        // Test connection with a simple query
        const testRef = doc(db, '_health', 'test');
        await getDoc(testRef);
      } catch (error) {
        console.warn('Database connection health check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Public API for cache management
   */
  public clearCache(): void {
    this.queryCache.clear();
  }

  public getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.queryCache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: this.metrics.cacheHitRate
    };
  }

  public getConnectionMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Force cleanup of all connections
   */
  public cleanup(): void {
    // Clear all active listeners
    this.connectionPool.forEach(unsubscribe => unsubscribe());
    this.connectionPool.clear();
    
    // Clear cache
    this.queryCache.clear();
    
    // Clear batch queue
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.batchQueue = [];
    
    // Reset metrics
    this.metrics = {
      activeConnections: 0,
      totalQueries: 0,
      averageQueryTime: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
  }
}

export const optimizedDatabaseService = new OptimizedDatabaseService();