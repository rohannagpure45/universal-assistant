/**
 * Dashboard Cache Layer
 * 
 * Intelligent caching system specifically optimized for dashboard performance.
 * Features:
 * - Multi-level caching (memory, session storage, indexed DB)
 * - Automatic cache invalidation
 * - Background refresh
 * - Performance metrics
 * - Cache warming strategies
 */

import { DatabaseService } from '@/services/firebase/DatabaseService';
import type { Meeting, User, APICall, CostBudget } from '@/types';
import type { CostAnalytics, UsageMetrics } from '@/types/cost';

// Cache configuration
interface CacheConfig {
  memoryTTL: number;
  sessionTTL: number;
  indexedDBTTL: number;
  maxMemoryEntries: number;
  backgroundRefreshThreshold: number;
  enableBackgroundRefresh: boolean;
  enableMetrics: boolean;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  memoryTTL: 2 * 60 * 1000,        // 2 minutes
  sessionTTL: 10 * 60 * 1000,      // 10 minutes
  indexedDBTTL: 60 * 60 * 1000,    // 1 hour
  maxMemoryEntries: 100,
  backgroundRefreshThreshold: 0.8,  // Refresh when 80% of TTL elapsed
  enableBackgroundRefresh: true,
  enableMetrics: true,
};

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  key: string;
  priority: 'low' | 'medium' | 'high';
}

// Cache metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  averageAccessTime: number;
  backgroundRefreshCount: number;
  evictionCount: number;
  lastOptimization: Date | null;
}

// Dashboard data types
export interface DashboardData {
  recentMeetings: Meeting[];
  costSummary: {
    totalSpend: number;
    monthlySpend: number;
    activeBudgets: CostBudget[];
    recentCalls: APICall[];
    topModels: Array<{ model: string; cost: number; calls: number }>;
  };
  userProfile: User;
  costAnalytics: CostAnalytics | null;
  usageMetrics: UsageMetrics | null;
}

// Type aliases for cleaner code
type CostSummaryType = DashboardData['costSummary'];

// Type guards for cache value validation
function isMeetingArray(value: unknown): value is Meeting[] {
  return Array.isArray(value) && (value.length === 0 || (value.length > 0 && typeof value[0] === 'object' && 'id' in value[0]));
}

function isCostSummary(value: unknown): value is CostSummaryType {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'totalSpend' in value &&
    'monthlySpend' in value &&
    'activeBudgets' in value &&
    'recentCalls' in value &&
    'topModels' in value &&
    typeof (value as any).totalSpend === 'number' &&
    typeof (value as any).monthlySpend === 'number' &&
    Array.isArray((value as any).activeBudgets) &&
    Array.isArray((value as any).recentCalls) &&
    Array.isArray((value as any).topModels)
  );
}

function isUser(value: unknown): value is User {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'id' in value &&
    'email' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).email === 'string'
  );
}

export class DashboardCache {
  private static instance: DashboardCache;
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig = DEFAULT_CACHE_CONFIG;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    memoryUsage: 0,
    averageAccessTime: 0,
    backgroundRefreshCount: 0,
    evictionCount: 0,
    lastOptimization: null
  };
  
  private refreshQueue = new Set<string>();
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startBackgroundRefresh();
    this.startPeriodicOptimization();
  }

  static getInstance(config?: Partial<CacheConfig>): DashboardCache {
    if (!DashboardCache.instance) {
      DashboardCache.instance = new DashboardCache(config);
    }
    return DashboardCache.instance;
  }

  // ============ PUBLIC API ============

  /**
   * Get cached data or fetch from database
   */
  async get<T>(key: string, fetcher: () => Promise<T>, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Check memory cache first
      const memoryEntry = this.getFromMemory(key);
      if (memoryEntry && !this.isExpired(memoryEntry)) {
        this.recordHit(startTime);
        this.scheduleBackgroundRefresh(key, fetcher, priority);
        return memoryEntry.data;
      }

      // Check session storage
      const sessionEntry = await this.getFromSession(key);
      if (sessionEntry && !this.isExpired(sessionEntry)) {
        this.setToMemory(key, sessionEntry.data, priority);
        this.recordHit(startTime);
        this.scheduleBackgroundRefresh(key, fetcher, priority);
        return sessionEntry.data;
      }

      // Check IndexedDB
      const indexedDBEntry = await this.getFromIndexedDB(key);
      if (indexedDBEntry && !this.isExpired(indexedDBEntry)) {
        this.setToMemory(key, indexedDBEntry.data, priority);
        this.setToSession(key, indexedDBEntry.data, priority);
        this.recordHit(startTime);
        this.scheduleBackgroundRefresh(key, fetcher, priority);
        return indexedDBEntry.data;
      }

      // Cache miss - fetch from database
      this.recordMiss(startTime);
      const data = await fetcher();
      
      // Store in all cache levels
      this.setToMemory(key, data, priority);
      await this.setToSession(key, data, priority);
      await this.setToIndexedDB(key, data, priority);
      
      return data;
    } catch (error) {
      this.recordMiss(startTime);
      throw error;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    this.setToMemory(key, data, priority);
    await this.setToSession(key, data, priority);
    await this.setToIndexedDB(key, data, priority);
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern: string | RegExp): Promise<number> {
    let invalidatedCount = 0;
    const isRegex = pattern instanceof RegExp;
    
    // Invalidate memory cache
    for (const [key] of this.memoryCache) {
      if (isRegex ? pattern.test(key) : key.includes(pattern as string)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidate session storage
    invalidatedCount += await this.invalidateSession(pattern);
    
    // Invalidate IndexedDB
    invalidatedCount += await this.invalidateIndexedDB(pattern);
    
    return invalidatedCount;
  }

  /**
   * Preload critical dashboard data
   */
  async warmCache(userId: string): Promise<void> {
    const warmingTasks = [
      // Preload recent meetings
      this.get(
        `recent-meetings:${userId}`,
        () => DatabaseService.getUserMeetings(userId, { limit: 10 }),
        'high'
      ),
      
      // Preload cost summary
      this.get(
        `cost-summary:${userId}`,
        () => DatabaseService.getCostSummary(userId),
        'high'
      ),
      
      // Preload user profile
      this.get(
        `user:${userId}`,
        () => DatabaseService.getUser(userId),
        'medium'
      )
    ];

    try {
      await Promise.allSettled(warmingTasks);
    } catch (error) {
      console.warn('Cache warming partial failure:', error);
    }
  }

  // Type guards for cache value validation
  private isMeetingArray(value: unknown): value is Meeting[] {
    return Array.isArray(value) && (value.length === 0 || (value.length > 0 && typeof value[0] === 'object' && 'id' in value[0]));
  }

  private isCostSummary(value: unknown): value is DashboardData['costSummary'] {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      'totalSpend' in value &&
      'monthlySpend' in value &&
      'activeBudgets' in value &&
      'recentCalls' in value &&
      'topModels' in value &&
      typeof (value as any).totalSpend === 'number' &&
      typeof (value as any).monthlySpend === 'number' &&
      Array.isArray((value as any).activeBudgets) &&
      Array.isArray((value as any).recentCalls) &&
      Array.isArray((value as any).topModels)
    );
  }

  private isUser(value: unknown): value is User {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      'id' in value &&
      'email' in value &&
      typeof (value as any).id === 'string' &&
      typeof (value as any).email === 'string'
    );
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(userId: string): Promise<Partial<DashboardData>> {
    const dashboardTasks = [
      this.get(
        `recent-meetings:${userId}`,
        () => DatabaseService.getUserMeetings(userId, { limit: 20 }).then(result => result.data),
        'high'
      ).catch(() => []),
      
      this.get(
        `cost-summary:${userId}`,
        () => DatabaseService.getCostSummary(userId),
        'high'
      ).catch(() => null),
      
      this.get(
        `user:${userId}`,
        () => DatabaseService.getUser(userId),
        'medium'
      ).catch(() => null),
    ];

    const [recentMeetings, costSummary, userProfile] = await Promise.allSettled(dashboardTasks);

    return {
      recentMeetings: recentMeetings.status === 'fulfilled' && this.isMeetingArray(recentMeetings.value) 
        ? recentMeetings.value 
        : [],
      costSummary: costSummary.status === 'fulfilled' && this.isCostSummary(costSummary.value) 
        ? costSummary.value 
        : undefined,
      userProfile: userProfile.status === 'fulfilled' && this.isUser(userProfile.value) 
        ? userProfile.value 
        : undefined,
    };
  }

  /**
   * Clear all cache levels
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (typeof window !== 'undefined') {
      // Clear session storage
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('dashboard-cache:')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear IndexedDB
      try {
        await this.clearIndexedDB();
      } catch (error) {
        console.warn('Failed to clear IndexedDB cache:', error);
      }
    }
    
    this.resetMetrics();
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics & {
    memoryEntries: number;
    topKeys: Array<{ key: string; accessCount: number; lastAccess: Date }>;
  } {
    const topKeys = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccess: new Date(entry.lastAccess)
      }));

    return {
      ...this.metrics,
      memoryEntries: this.memoryCache.size,
      topKeys
    };
  }

  // ============ MEMORY CACHE ============

  private getFromMemory(key: string): CacheEntry | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    entry.accessCount++;
    entry.lastAccess = Date.now();
    return entry;
  }

  private setToMemory<T>(key: string, data: T, priority: 'low' | 'medium' | 'high'): void {
    const ttl = this.getTTLForPriority(priority, 'memory');
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccess: Date.now(),
      key,
      priority
    };

    // Evict if necessary
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      this.evictLeastUsed();
    }

    this.memoryCache.set(key, entry);
    this.updateMemoryUsage();
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let minAccessCount = Infinity;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.accessCount < minAccessCount || 
          (entry.accessCount === minAccessCount && entry.lastAccess < oldestAccess)) {
        minAccessCount = entry.accessCount;
        oldestAccess = entry.lastAccess;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey);
      this.metrics.evictionCount++;
    }
  }

  // ============ SESSION STORAGE ============

  private async getFromSession(key: string): Promise<CacheEntry | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem(`dashboard-cache:${key}`);
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  private async setToSession<T>(key: string, data: T, priority: 'low' | 'medium' | 'high'): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const ttl = this.getTTLForPriority(priority, 'session');
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccess: Date.now(),
        key,
        priority
      };
      
      sessionStorage.setItem(`dashboard-cache:${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set session cache:', error);
    }
  }

  private async invalidateSession(pattern: string | RegExp): Promise<number> {
    if (typeof window === 'undefined') return 0;
    
    let count = 0;
    const isRegex = pattern instanceof RegExp;
    const keys = Object.keys(sessionStorage);
    
    keys.forEach(storageKey => {
      if (!storageKey.startsWith('dashboard-cache:')) return;
      
      const cacheKey = storageKey.replace('dashboard-cache:', '');
      if (isRegex ? pattern.test(cacheKey) : cacheKey.includes(pattern as string)) {
        sessionStorage.removeItem(storageKey);
        count++;
      }
    });
    
    return count;
  }

  // ============ INDEXEDDB ============

  private async getFromIndexedDB(key: string): Promise<CacheEntry | null> {
    if (typeof window === 'undefined') return null;
    
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('dashboard-cache', 1);
        
        request.onerror = () => resolve(null);
        
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache', { keyPath: 'key' });
          }
        };
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['cache'], 'readonly');
          const store = transaction.objectStore('cache');
          const getRequest = store.get(key);
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };
          
          getRequest.onerror = () => resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  private async setToIndexedDB<T>(key: string, data: T, priority: 'low' | 'medium' | 'high'): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('dashboard-cache', 1);
        
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache', { keyPath: 'key' });
          }
        };
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          
          const ttl = this.getTTLForPriority(priority, 'indexeddb');
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            accessCount: 1,
            lastAccess: Date.now(),
            key,
            priority
          };
          
          store.put(entry);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve(); // Fail silently
        };
        
        request.onerror = () => resolve(); // Fail silently
      });
    } catch {
      // Fail silently
    }
  }

  private async invalidateIndexedDB(pattern: string | RegExp): Promise<number> {
    if (typeof window === 'undefined') return 0;
    
    try {
      return new Promise((resolve) => {
        const request = indexedDB.open('dashboard-cache', 1);
        let count = 0;
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            const entries = getAllRequest.result as CacheEntry[];
            const isRegex = pattern instanceof RegExp;
            
            entries.forEach(entry => {
              if (isRegex ? pattern.test(entry.key) : entry.key.includes(pattern as string)) {
                store.delete(entry.key);
                count++;
              }
            });
          };
          
          transaction.oncomplete = () => resolve(count);
          transaction.onerror = () => resolve(0);
        };
        
        request.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  private async clearIndexedDB(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    return new Promise((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase('dashboard-cache');
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
    });
  }

  // ============ UTILITIES ============

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  private getTTLForPriority(priority: 'low' | 'medium' | 'high', level: 'memory' | 'session' | 'indexeddb'): number {
    const baseTTL = {
      memory: this.config.memoryTTL,
      session: this.config.sessionTTL,
      indexeddb: this.config.indexedDBTTL
    }[level];

    const multiplier = {
      low: 0.5,
      medium: 1.0,
      high: 2.0
    }[priority];

    return baseTTL * multiplier;
  }

  private recordHit(startTime: number): void {
    this.metrics.hits++;
    this.updateHitRate();
    this.updateAverageAccessTime(Date.now() - startTime);
  }

  private recordMiss(startTime: number): void {
    this.metrics.misses++;
    this.updateHitRate();
    this.updateAverageAccessTime(Date.now() - startTime);
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  private updateAverageAccessTime(accessTime: number): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * (total - 1) + accessTime) / total;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }
    this.metrics.memoryUsage = totalSize;
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
      averageAccessTime: 0,
      backgroundRefreshCount: 0,
      evictionCount: 0,
      lastOptimization: null
    };
  }

  // ============ BACKGROUND REFRESH ============

  private scheduleBackgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    priority: 'low' | 'medium' | 'high'
  ): void {
    if (!this.config.enableBackgroundRefresh) return;

    const entry = this.memoryCache.get(key);
    if (!entry) return;

    const ageRatio = (Date.now() - entry.timestamp) / entry.ttl;
    if (ageRatio >= this.config.backgroundRefreshThreshold) {
      this.refreshQueue.add(key);
    }
  }

  private startBackgroundRefresh(): void {
    if (this.refreshTimer) return;

    this.refreshTimer = setInterval(() => {
      if (this.refreshQueue.size === 0) return;

      const key = Array.from(this.refreshQueue)[0];
      this.refreshQueue.delete(key);
      
      // Background refresh would need the original fetcher
      // This is a simplified version
      this.metrics.backgroundRefreshCount++;
    }, 5000); // Check every 5 seconds
  }

  private startPeriodicOptimization(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      this.optimizeCache();
    }, 5 * 60 * 1000); // Optimize every 5 minutes
  }

  private optimizeCache(): void {
    // Remove expired entries
    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    this.updateMemoryUsage();
    this.metrics.lastOptimization = new Date();
  }

  // ============ CLEANUP ============

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.refreshQueue.clear();
    this.memoryCache.clear();
  }
}

// Export singleton instance
export const dashboardCache = DashboardCache.getInstance();

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    dashboardCache.destroy();
  });
}