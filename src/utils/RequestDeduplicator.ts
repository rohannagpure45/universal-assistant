/**
 * RequestDeduplicator - Prevent duplicate concurrent API requests
 * 
 * Surgical fix for preventing duplicate API calls when multiple
 * components request the same data simultaneously.
 */

export class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL: number;
  
  constructor(cacheTTL: number = 1000) { // 1 second default cache
    this.cacheTTL = cacheTTL;
  }
  
  /**
   * Deduplicate async requests by key
   * Returns existing promise if request is already pending
   */
  async dedupe<T>(
    key: string, 
    fetcher: () => Promise<T>,
    options?: {
      cache?: boolean;
      cacheTTL?: number;
    }
  ): Promise<T> {
    const { cache = false, cacheTTL = this.cacheTTL } = options || {};
    
    // Check if we have a cached result
    if (cache) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data as T;
      }
    }
    
    // Return existing promise if request is pending
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }
    
    // Create new request
    const promise = fetcher()
      .then(result => {
        // Cache successful result if requested
        if (cache) {
          this.cache.set(key, {
            data: result,
            timestamp: Date.now()
          });
        }
        return result;
      })
      .finally(() => {
        // Clean up pending request
        this.pending.delete(key);
      });
    
    // Store pending promise
    this.pending.set(key, promise);
    
    return promise;
  }
  
  /**
   * Clear specific cache entry
   */
  clearCache(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get statistics about deduplication
   */
  getStats(): {
    pendingRequests: number;
    cachedEntries: number;
  } {
    return {
      pendingRequests: this.pending.size,
      cachedEntries: this.cache.size
    };
  }
  
  /**
   * Check if a request is currently pending
   */
  isPending(key: string): boolean {
    return this.pending.has(key);
  }
  
  /**
   * Clean up expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Global instance for shared use
export const globalRequestDeduplicator = new RequestDeduplicator();

// React hook for using the deduplicator
export function useRequestDeduplicator(): RequestDeduplicator {
  return globalRequestDeduplicator;
}

// Decorator for automatic deduplication
export function deduplicate(keyGenerator?: (...args: any[]) => string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      
      return globalRequestDeduplicator.dedupe(
        key,
        () => originalMethod.apply(this, args)
      );
    };
    
    return descriptor;
  };
}