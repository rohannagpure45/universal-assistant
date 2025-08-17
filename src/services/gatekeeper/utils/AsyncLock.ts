/**
 * AsyncLock - Thread-safe locking mechanism for preventing concurrent operations
 * Provides speaker-specific locking to prevent race conditions in message processing
 */

export interface LockOptions {
  timeout: number;
  maxWaitingOperations: number;
  enableDeadlockDetection: boolean;
  deadlockTimeout: number;
}

export interface LockInfo {
  lockId: string;
  acquiredAt: number;
  acquiredBy: string;
  timeout: number;
  isExpired: boolean;
}

export interface LockStats {
  totalAcquisitions: number;
  totalReleases: number;
  totalTimeouts: number;
  totalDeadlocks: number;
  averageHoldTime: number;
  activeLocks: number;
  waitingOperations: number;
}

interface PendingOperation {
  resolve: () => void;
  reject: (error: Error) => void;
  acquiredBy: string;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

/**
 * AsyncLock provides mutual exclusion for async operations
 * Prevents race conditions by ensuring only one operation can execute at a time per key
 */
export class AsyncLock {
  private locks: Map<string, LockInfo> = new Map();
  private pending: Map<string, PendingOperation[]> = new Map();
  private options: LockOptions;
  private stats: LockStats = {
    totalAcquisitions: 0,
    totalReleases: 0,
    totalTimeouts: 0,
    totalDeadlocks: 0,
    averageHoldTime: 0,
    activeLocks: 0,
    waitingOperations: 0,
  };
  private holdTimes: number[] = [];
  private deadlockDetectionInterval?: NodeJS.Timeout;

  constructor(options: Partial<LockOptions> = {}) {
    this.options = {
      timeout: 30000, // 30 seconds default timeout
      maxWaitingOperations: 50, // Max operations that can wait for a lock
      enableDeadlockDetection: true,
      deadlockTimeout: 60000, // 1 minute deadlock detection
      ...options,
    };

    if (this.options.enableDeadlockDetection) {
      this.startDeadlockDetection();
    }
  }

  /**
   * Acquires a lock for the given key
   * Returns a promise that resolves when the lock is acquired
   */
  async acquire(key: string, acquiredBy: string = 'unknown', timeout?: number): Promise<() => void> {
    const lockTimeout = timeout || this.options.timeout;
    const lockId = this.generateLockId();

    // Check if we can acquire immediately
    if (!this.locks.has(key)) {
      return this.acquireImmediately(key, lockId, acquiredBy, lockTimeout);
    }

    // Need to wait - check if we can add to pending queue
    const pendingOps = this.pending.get(key) || [];
    if (pendingOps.length >= this.options.maxWaitingOperations) {
      throw new Error(`Too many operations waiting for lock '${key}'. Maximum: ${this.options.maxWaitingOperations}`);
    }

    return this.queueForLock(key, lockId, acquiredBy, lockTimeout);
  }

  /**
   * Attempts to acquire a lock without waiting
   * Returns the release function if successful, null if lock is busy
   */
  tryAcquire(key: string, acquiredBy: string = 'unknown', timeout?: number): (() => void) | null {
    if (this.locks.has(key)) {
      return null;
    }

    const lockTimeout = timeout || this.options.timeout;
    const lockId = this.generateLockId();
    
    return this.acquireImmediately(key, lockId, acquiredBy, lockTimeout);
  }

  /**
   * Checks if a key is currently locked
   */
  isLocked(key: string): boolean {
    const lock = this.locks.get(key);
    if (!lock) return false;
    
    if (this.isLockExpired(lock)) {
      this.forceRelease(key);
      return false;
    }
    
    return true;
  }

  /**
   * Gets information about a specific lock
   */
  getLockInfo(key: string): LockInfo | null {
    const lock = this.locks.get(key);
    if (!lock) return null;
    
    return {
      ...lock,
      isExpired: this.isLockExpired(lock),
    };
  }

  /**
   * Gets all currently active locks
   */
  getActiveLocks(): Map<string, LockInfo> {
    const activeLocks = new Map<string, LockInfo>();
    
    for (const [key, lock] of this.locks) {
      if (!this.isLockExpired(lock)) {
        activeLocks.set(key, {
          ...lock,
          isExpired: false,
        });
      }
    }
    
    return activeLocks;
  }

  /**
   * Forces release of a lock (use with caution)
   */
  forceRelease(key: string): boolean {
    const lock = this.locks.get(key);
    if (!lock) return false;

    this.performRelease(key, lock);
    return true;
  }

  /**
   * Gets lock statistics
   */
  getStats(): LockStats {
    this.stats.activeLocks = this.locks.size;
    this.stats.waitingOperations = Array.from(this.pending.values())
      .reduce((sum, pending) => sum + pending.length, 0);
    
    return { ...this.stats };
  }

  /**
   * Cleans up expired locks and cancels pending operations
   */
  cleanup(): void {
    // Clean up expired locks
    for (const [key, lock] of this.locks) {
      if (this.isLockExpired(lock)) {
        this.forceRelease(key);
      }
    }

    // Cancel timed out pending operations
    for (const [key, pendingOps] of this.pending) {
      const now = Date.now();
      const validOps = pendingOps.filter(op => {
        if (now - op.timestamp > this.options.timeout) {
          clearTimeout(op.timeout);
          op.reject(new Error(`Lock acquisition timed out for key '${key}'`));
          this.stats.totalTimeouts++;
          return false;
        }
        return true;
      });
      
      if (validOps.length !== pendingOps.length) {
        this.pending.set(key, validOps);
      }
    }
  }

  /**
   * Shuts down the lock manager
   */
  shutdown(): void {
    if (this.deadlockDetectionInterval) {
      clearInterval(this.deadlockDetectionInterval);
    }

    // Cancel all pending operations
    for (const [key, pendingOps] of this.pending) {
      for (const op of pendingOps) {
        clearTimeout(op.timeout);
        op.reject(new Error('Lock manager is shutting down'));
      }
    }

    this.pending.clear();
    this.locks.clear();
  }

  /**
   * Executes a function with a lock acquired
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    acquiredBy: string = 'unknown',
    timeout?: number
  ): Promise<T> {
    const release = await this.acquire(key, acquiredBy, timeout);
    
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Acquires lock immediately (when no contention)
   */
  private acquireImmediately(key: string, lockId: string, acquiredBy: string, timeout: number): () => void {
    const now = Date.now();
    const lock: LockInfo = {
      lockId,
      acquiredAt: now,
      acquiredBy,
      timeout,
      isExpired: false,
    };

    this.locks.set(key, lock);
    this.stats.totalAcquisitions++;
    this.stats.activeLocks++;

    // Return release function
    return () => this.release(key, lockId);
  }

  /**
   * Queues an operation to wait for lock
   */
  private async queueForLock(key: string, lockId: string, acquiredBy: string, timeout: number): Promise<() => void> {
    return new Promise<() => void>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.removePendingOperation(key, acquiredBy);
        reject(new Error(`Lock acquisition timed out for key '${key}' after ${timeout}ms`));
        this.stats.totalTimeouts++;
      }, timeout);

      const pendingOp: PendingOperation = {
        resolve: () => {
          clearTimeout(timeoutHandle);
          const release = this.acquireImmediately(key, lockId, acquiredBy, timeout);
          resolve(release);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          reject(error);
        },
        acquiredBy,
        timestamp: Date.now(),
        timeout: timeoutHandle,
      };

      if (!this.pending.has(key)) {
        this.pending.set(key, []);
      }
      
      this.pending.get(key)!.push(pendingOp);
      this.stats.waitingOperations++;
    });
  }

  /**
   * Releases a lock
   */
  private release(key: string, lockId: string): void {
    const lock = this.locks.get(key);
    if (!lock || lock.lockId !== lockId) {
      return; // Lock already released or different lock
    }

    this.performRelease(key, lock);
  }

  /**
   * Performs the actual lock release and processes pending operations
   */
  private performRelease(key: string, lock: LockInfo): void {
    // Update statistics
    const holdTime = Date.now() - lock.acquiredAt;
    this.holdTimes.push(holdTime);
    if (this.holdTimes.length > 100) {
      this.holdTimes.shift();
    }
    this.stats.averageHoldTime = this.holdTimes.reduce((sum, time) => sum + time, 0) / this.holdTimes.length;
    this.stats.totalReleases++;
    this.stats.activeLocks--;

    // Remove the lock
    this.locks.delete(key);

    // Process next pending operation
    const pendingOps = this.pending.get(key);
    if (pendingOps && pendingOps.length > 0) {
      const nextOp = pendingOps.shift()!;
      this.stats.waitingOperations--;
      
      if (pendingOps.length === 0) {
        this.pending.delete(key);
      }
      
      // Grant lock to next operation
      nextOp.resolve();
    }
  }

  /**
   * Removes a pending operation from the queue
   */
  private removePendingOperation(key: string, acquiredBy: string): void {
    const pendingOps = this.pending.get(key);
    if (!pendingOps) return;

    const index = pendingOps.findIndex(op => op.acquiredBy === acquiredBy);
    if (index !== -1) {
      pendingOps.splice(index, 1);
      this.stats.waitingOperations--;
      
      if (pendingOps.length === 0) {
        this.pending.delete(key);
      }
    }
  }

  /**
   * Checks if a lock has expired
   */
  private isLockExpired(lock: LockInfo): boolean {
    return Date.now() - lock.acquiredAt > lock.timeout;
  }

  /**
   * Starts deadlock detection
   */
  private startDeadlockDetection(): void {
    this.deadlockDetectionInterval = setInterval(() => {
      this.detectAndResolveDeadlocks();
    }, this.options.deadlockTimeout);
  }

  /**
   * Detects and resolves potential deadlocks
   */
  private detectAndResolveDeadlocks(): void {
    const now = Date.now();
    
    // Find locks that have been held for too long
    for (const [key, lock] of this.locks) {
      if (now - lock.acquiredAt > this.options.deadlockTimeout) {
        console.warn(`Potential deadlock detected for lock '${key}', forcing release`);
        this.forceRelease(key);
        this.stats.totalDeadlocks++;
      }
    }

    // Find pending operations that have been waiting too long
    for (const [key, pendingOps] of this.pending) {
      const expiredOps = pendingOps.filter(op => now - op.timestamp > this.options.deadlockTimeout);
      
      for (const op of expiredOps) {
        clearTimeout(op.timeout);
        op.reject(new Error(`Deadlock detected for lock '${key}', operation cancelled`));
        this.stats.totalDeadlocks++;
      }
      
      const validOps = pendingOps.filter(op => now - op.timestamp <= this.options.deadlockTimeout);
      if (validOps.length !== pendingOps.length) {
        this.pending.set(key, validOps);
        this.stats.waitingOperations -= (pendingOps.length - validOps.length);
      }
    }
  }

  /**
   * Generates a unique lock ID
   */
  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * SpeakerLockManager - Specialized lock manager for speaker-specific operations
 */
export class SpeakerLockManager {
  private lockManager: AsyncLock;
  private speakerLocks: Map<string, string> = new Map();

  constructor(options: Partial<LockOptions> = {}) {
    this.lockManager = new AsyncLock({
      timeout: 15000, // Shorter timeout for speaker operations
      maxWaitingOperations: 20,
      ...options,
    });
  }

  /**
   * Acquires a lock for a specific speaker
   */
  async acquireSpeakerLock(speakerId: string, operationType: string = 'processing'): Promise<() => void> {
    const lockKey = `speaker:${speakerId}`;
    const acquiredBy = `${operationType}:${speakerId}`;
    
    return this.lockManager.acquire(lockKey, acquiredBy);
  }

  /**
   * Executes an operation with speaker lock
   */
  async withSpeakerLock<T>(
    speakerId: string,
    fn: () => Promise<T>,
    operationType: string = 'processing'
  ): Promise<T> {
    const lockKey = `speaker:${speakerId}`;
    const acquiredBy = `${operationType}:${speakerId}`;
    
    return this.lockManager.withLock(lockKey, fn, acquiredBy);
  }

  /**
   * Checks if a speaker is currently locked
   */
  isSpeakerLocked(speakerId: string): boolean {
    return this.lockManager.isLocked(`speaker:${speakerId}`);
  }

  /**
   * Gets all locked speakers
   */
  getLockedSpeakers(): string[] {
    const activeLocks = this.lockManager.getActiveLocks();
    const speakerIds: string[] = [];
    
    for (const key of activeLocks.keys()) {
      if (key.startsWith('speaker:')) {
        speakerIds.push(key.replace('speaker:', ''));
      }
    }
    
    return speakerIds;
  }

  /**
   * Gets lock statistics
   */
  getStats(): LockStats {
    return this.lockManager.getStats();
  }

  /**
   * Cleanup and shutdown
   */
  cleanup(): void {
    this.lockManager.cleanup();
  }

  shutdown(): void {
    this.lockManager.shutdown();
  }
}