/**
 * Simple query result cache with timestamp-based TTL invalidation
 * Following reviewer-approved simple approach for Firebase query optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes as recommended

  /**
   * Get cached result if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > this.CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Store result in cache with current timestamp
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Generate cache key from query parameters
   */
  generateKey(collection: string, userId: string, queryParams: Record<string, any>): string {
    const params = Object.keys(queryParams)
      .sort()
      .map(key => `${key}:${queryParams[key]}`)
      .join('|');
    
    return `${collection}_${userId}_${params}`;
  }

  /**
   * Clear expired entries (automatic cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    return {
      entryCount: this.cache.size,
      cacheHitRate: 0, // Could be tracked with counters if needed
      totalSizeMB: 0  // Could be estimated if needed
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();

// Auto-cleanup every 10 minutes with proper cleanup on unload
if (typeof window !== 'undefined') {
  const intervalId = setInterval(() => {
    queryCache.cleanup();
  }, 10 * 60 * 1000);
  
  // Clean up interval on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(intervalId);
  });
}