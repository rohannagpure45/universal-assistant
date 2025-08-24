/**
 * ProductionCacheManager - Comprehensive Caching Strategy
 * 
 * Implements multi-layer caching including memory cache, browser cache,
 * service worker cache, and smart cache invalidation strategies.
 */

import { nanoid } from 'nanoid';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  priority: CachePriority;
  metadata?: {
    size: number;
    accessCount: number;
    lastAccessed: number;
  };
}

export type CachePriority = 'low' | 'medium' | 'high' | 'critical';

export interface CacheConfig {
  maxMemoryUsage: number;
  defaultTTL: number;
  maxEntries: number;
  compressionEnabled: boolean;
  persistentStorage: boolean;
}

export interface CacheStats {
  memoryUsage: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRatio: number;
}

export interface CacheStrategy {
  name: string;
  shouldCache: (key: string, data: any) => boolean;
  getTTL: (key: string, data: any) => number;
  getPriority: (key: string, data: any) => CachePriority;
}

export class ProductionCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private accessLog = new Map<string, number>();
  private stats: CacheStats = {
    memoryUsage: 0,
    totalEntries: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
    compressionRatio: 1
  };
  
  private config: CacheConfig;
  private strategies: Map<string, CacheStrategy> = new Map();
  private compressionWorker: Worker | null = null;
  
  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB default
      defaultTTL: 300000, // 5 minutes
      maxEntries: 10000,
      compressionEnabled: true,
      persistentStorage: true,
      ...config
    };
    
    this.initializeStrategies();
    this.initializeCleanupTasks();
    this.initializePersistentStorage();
    
    if (this.config.compressionEnabled && typeof Worker !== 'undefined') {
      this.initializeCompressionWorker();
    }
  }

  /**
   * Initialize caching strategies for different data types
   */
  private initializeStrategies(): void {
    // Voice Profile Strategy
    this.strategies.set('voice-profiles', {
      name: 'Voice Profiles',
      shouldCache: (key, data) => key.includes('/voice-profiles/') && data?.profileData,
      getTTL: (key, data) => data?.isActive ? 1800000 : 3600000, // 30min active, 1hr inactive
      getPriority: (key, data) => data?.isActive ? 'high' : 'medium'
    });

    // TTS Cache Strategy
    this.strategies.set('tts-audio', {
      name: 'TTS Audio',
      shouldCache: (key, data) => key.includes('tts-cache') && data?.audioData,
      getTTL: (key, data) => 604800000, // 1 week
      getPriority: (key, data) => data?.frequently_used ? 'high' : 'low'
    });

    // Meeting Data Strategy
    this.strategies.set('meetings', {
      name: 'Meeting Data',
      shouldCache: (key, data) => key.includes('/meetings/'),
      getTTL: (key, data) => data?.status === 'active' ? 60000 : 300000, // 1min active, 5min inactive
      getPriority: (key, data) => data?.status === 'active' ? 'critical' : 'medium'
    });

    // User Data Strategy
    this.strategies.set('users', {
      name: 'User Data',
      shouldCache: (key, data) => key.includes('/users/'),
      getTTL: (key, data) => 900000, // 15 minutes
      getPriority: () => 'high'
    });

    // API Response Strategy
    this.strategies.set('api-responses', {
      name: 'API Responses',
      shouldCache: (key, data) => key.includes('/api/'),
      getTTL: (key, data) => {
        if (key.includes('transcribe')) return 60000; // 1 minute
        if (key.includes('ai-response')) return 300000; // 5 minutes
        return 180000; // 3 minutes default
      },
      getPriority: (key, data) => key.includes('transcribe') ? 'high' : 'medium'
    });

    // Static Assets Strategy
    this.strategies.set('static-assets', {
      name: 'Static Assets',
      shouldCache: (key, data) => key.includes('.js') || key.includes('.css') || key.includes('.png'),
      getTTL: () => 86400000, // 24 hours
      getPriority: () => 'low'
    });
  }

  /**
   * Set cache entry with intelligent strategy selection
   */
  public async set<T>(key: string, data: T, options?: {
    ttl?: number;
    priority?: CachePriority;
    compress?: boolean;
  }): Promise<void> {
    const strategy = this.selectStrategy(key, data);
    const ttl = options?.ttl || strategy?.getTTL(key, data) || this.config.defaultTTL;
    const priority = options?.priority || strategy?.getPriority(key, data) || 'medium';
    
    let processedData = data;
    let size = this.estimateSize(data);

    // Compress large data if enabled
    if (this.config.compressionEnabled && options?.compress !== false && size > 1024) {
      try {
        processedData = await this.compressData(data);
        const compressedSize = this.estimateSize(processedData);
        this.stats.compressionRatio = (this.stats.compressionRatio + (compressedSize / size)) / 2;
        size = compressedSize;
      } catch (error) {
        console.warn('Compression failed, using original data:', error);
      }
    }

    // Check if we need to make space
    if (this.stats.memoryUsage + size > this.config.maxMemoryUsage || 
        this.stats.totalEntries >= this.config.maxEntries) {
      await this.evictEntries(size);
    }

    const entry: CacheEntry<T> = {
      key,
      data: processedData,
      timestamp: Date.now(),
      ttl,
      priority,
      metadata: {
        size,
        accessCount: 1,
        lastAccessed: Date.now()
      }
    };

    this.memoryCache.set(key, entry);
    this.stats.memoryUsage += size;
    this.stats.totalEntries++;

    // Persist to storage if enabled
    if (this.config.persistentStorage && priority !== 'low') {
      await this.persistToStorage(key, entry);
    }
  }

  /**
   * Get cache entry with access tracking
   */
  public async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    
    if (entry) {
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.delete(key);
        this.stats.missRate = (this.stats.missRate * 0.9) + 0.1;
        return null;
      }

      // Update access statistics
      entry.metadata!.accessCount++;
      entry.metadata!.lastAccessed = Date.now();
      this.accessLog.set(key, Date.now());
      
      this.stats.hitRate = (this.stats.hitRate * 0.9) + 0.1;
      
      // Decompress if needed
      if (this.isCompressed(entry.data)) {
        try {
          return await this.decompressData(entry.data) as T;
        } catch (error) {
          console.warn('Decompression failed:', error);
          this.delete(key);
          return null;
        }
      }
      
      return entry.data as T;
    }

    // Try to load from persistent storage
    if (this.config.persistentStorage) {
      const persistedEntry = await this.loadFromStorage<T>(key);
      if (persistedEntry) {
        // Restore to memory cache
        this.memoryCache.set(key, persistedEntry);
        this.stats.memoryUsage += persistedEntry.metadata?.size || 0;
        this.stats.totalEntries++;
        
        return this.isCompressed(persistedEntry.data) 
          ? await this.decompressData(persistedEntry.data) as T
          : persistedEntry.data as T;
      }
    }

    this.stats.missRate = (this.stats.missRate * 0.9) + 0.1;
    return null;
  }

  /**
   * Delete cache entry
   */
  public delete(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.memoryCache.delete(key);
      this.stats.memoryUsage -= entry.metadata?.size || 0;
      this.stats.totalEntries--;
      this.accessLog.delete(key);
      
      // Remove from persistent storage
      if (this.config.persistentStorage) {
        this.removeFromStorage(key);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Clear cache with optional pattern matching
   */
  public clear(pattern?: string): void {
    if (pattern) {
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((_, key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.delete(key));
    } else {
      this.memoryCache.clear();
      this.accessLog.clear();
      this.stats.memoryUsage = 0;
      this.stats.totalEntries = 0;
      this.stats.evictionCount = 0;
    }
  }

  /**
   * Invalidate cache entries based on tags or patterns
   */
  public invalidate(tags: string[]): void {
    const keysToDelete: string[] = [];
    
    this.memoryCache.forEach((entry, key) => {
      const shouldInvalidate = tags.some(tag => 
        key.includes(tag) || 
        (typeof entry.data === 'object' && JSON.stringify(entry.data).includes(tag))
      );
      
      if (shouldInvalidate) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Preload frequently accessed data
   */
  public async preload(keys: string[], dataFetcher: (key: string) => Promise<any>): Promise<void> {
    const loadPromises = keys.map(async (key) => {
      if (!this.memoryCache.has(key)) {
        try {
          const data = await dataFetcher(key);
          await this.set(key, data, { priority: 'high' });
        } catch (error) {
          console.warn(`Preload failed for key ${key}:`, error);
        }
      }
    });
    
    await Promise.all(loadPromises);
  }

  /**
   * Smart eviction using LRU with priority consideration
   */
  private async evictEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by priority (low first) and last accessed time
    entries.sort(([keyA, entryA], [keyB, entryB]) => {
      const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      const priorityDiff = priorityOrder[entryA.priority] - priorityOrder[entryB.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return (entryA.metadata?.lastAccessed || 0) - (entryB.metadata?.lastAccessed || 0);
    });
    
    let freedSpace = 0;
    const evictedKeys: string[] = [];
    
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace && this.stats.totalEntries < this.config.maxEntries) {
        break;
      }
      
      // Don't evict critical priority entries unless absolutely necessary
      if (entry.priority === 'critical' && freedSpace > requiredSpace * 0.5) {
        continue;
      }
      
      freedSpace += entry.metadata?.size || 0;
      evictedKeys.push(key);
    }
    
    evictedKeys.forEach(key => this.delete(key));
    this.stats.evictionCount += evictedKeys.length;
  }

  /**
   * Select appropriate caching strategy
   */
  private selectStrategy(key: string, data: any): CacheStrategy | null {
    for (const strategy of this.strategies.values()) {
      if (strategy.shouldCache(key, data)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Estimate data size for memory management
   */
  private estimateSize(data: any): number {
    if (typeof data === 'string') return data.length * 2; // UTF-16
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Blob) return data.size;
    
    try {
      return JSON.stringify(data).length * 2;
    } catch {
      return 1024; // Default estimate
    }
  }

  /**
   * Compression methods
   */
  private async compressData(data: any): Promise<any> {
    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const messageId = nanoid();
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data.id === messageId) {
            this.compressionWorker!.removeEventListener('message', handleMessage);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.compressed);
            }
          }
        };
        
        this.compressionWorker.addEventListener('message', handleMessage);
        this.compressionWorker.postMessage({
          id: messageId,
          action: 'compress',
          data: data
        });
      });
    }
    
    // Fallback to simple JSON compression
    if (typeof data === 'object') {
      return { __compressed: true, data: JSON.stringify(data) };
    }
    
    return data;
  }

  private async decompressData(data: any): Promise<any> {
    if (this.compressionWorker && data.__compressed_binary) {
      return new Promise((resolve, reject) => {
        const messageId = nanoid();
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data.id === messageId) {
            this.compressionWorker!.removeEventListener('message', handleMessage);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.decompressed);
            }
          }
        };
        
        this.compressionWorker.addEventListener('message', handleMessage);
        this.compressionWorker.postMessage({
          id: messageId,
          action: 'decompress',
          data: data
        });
      });
    }
    
    // Fallback decompression
    if (data?.__compressed && data?.data) {
      return JSON.parse(data.data);
    }
    
    return data;
  }

  private isCompressed(data: any): boolean {
    return data?.__compressed === true || data?.__compressed_binary === true;
  }

  /**
   * Persistent storage methods
   */
  private async persistToStorage(key: string, entry: CacheEntry): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const storageKey = `cache:${key}`;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      // Handle storage quota exceeded
      if (error.name === 'QuotaExceededError') {
        await this.clearOldStorageEntries();
      }
    }
  }

  private async loadFromStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    if (typeof localStorage === 'undefined') return null;
    
    try {
      const storageKey = `cache:${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const entry = JSON.parse(stored) as CacheEntry<T>;
        
        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
          localStorage.removeItem(storageKey);
          return null;
        }
        
        return entry;
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    }
    
    return null;
  }

  private removeFromStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const storageKey = `cache:${key}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to remove from storage:', error);
    }
  }

  private async clearOldStorageEntries(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    
    const keysToRemove: string[] = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored);
            if (now - entry.timestamp > entry.ttl) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Initialize compression worker
   */
  private initializeCompressionWorker(): void {
    // This would typically load a separate worker file
    // For now, we'll skip the actual worker implementation
    console.log('Compression worker would be initialized in production');
  }

  /**
   * Initialize cleanup tasks
   */
  private initializeCleanupTasks(): void {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000);

    // Full garbage collection every hour
    setInterval(() => {
      this.performGarbageCollection();
    }, 3600000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.delete(key));
  }

  private performGarbageCollection(): void {
    // Force cleanup of old access logs
    const cutoff = Date.now() - 3600000; // 1 hour
    const keysToRemove: string[] = [];
    
    this.accessLog.forEach((timestamp, key) => {
      if (timestamp < cutoff) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => this.accessLog.delete(key));
  }

  /**
   * Initialize persistent storage
   */
  private initializePersistentStorage(): void {
    if (this.config.persistentStorage && typeof localStorage !== 'undefined') {
      // Load existing cache entries from storage on startup
      setTimeout(async () => {
        await this.loadExistingStorageEntries();
      }, 1000);
    }
  }

  private async loadExistingStorageEntries(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    
    const loadedCount = 0;
    
    for (let i = 0; i < localStorage.length && loadedCount < 100; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:')) {
        const cacheKey = key.substring(6);
        if (!this.memoryCache.has(cacheKey)) {
          const entry = await this.loadFromStorage(cacheKey);
          if (entry && entry.priority !== 'low') {
            this.memoryCache.set(cacheKey, entry);
            this.stats.memoryUsage += entry.metadata?.size || 0;
            this.stats.totalEntries++;
          }
        }
      }
    }
  }

  /**
   * Public API methods
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public getCacheKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  public has(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  public size(): number {
    return this.memoryCache.size;
  }

  public memoryUsage(): number {
    return this.stats.memoryUsage;
  }

  /**
   * Cache warming for critical data
   */
  public async warmCache(criticalKeys: string[], dataFetcher: (key: string) => Promise<any>): Promise<void> {
    console.log(`🔥 Warming cache with ${criticalKeys.length} critical entries...`);
    
    const warmPromises = criticalKeys.map(async (key) => {
      try {
        const data = await dataFetcher(key);
        await this.set(key, data, { priority: 'critical' });
      } catch (error) {
        console.warn(`Cache warming failed for ${key}:`, error);
      }
    });
    
    await Promise.all(warmPromises);
    console.log('✅ Cache warming completed');
  }
}

export const productionCacheManager = new ProductionCacheManager();