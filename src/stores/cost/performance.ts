/**
 * Cost Store Performance Module
 * Handles caching, memoization, and performance optimizations
 */

import { UsageMetrics, CostAnalytics, CostBudget } from '@/types/cost';
import { debounce } from 'lodash';

/**
 * Performance cache with TTL support
 */
export class PerformanceCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(ttl: number = 300000) { // 5 minutes default
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.misses++;
      return null;
    }

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }
}

/**
 * Virtual scroll helper for large datasets
 */
export class VirtualScrollHelper<T> {
  private items: T[] = [];
  private itemHeight: number;
  private containerHeight: number;
  private overscan: number;

  constructor(itemHeight: number = 50, containerHeight: number = 600, overscan: number = 3) {
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.overscan = overscan;
  }

  setItems(items: T[]): void {
    this.items = items;
  }

  getVisibleItems(scrollTop: number): { items: T[]; startIndex: number; endIndex: number } {
    const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const endIndex = Math.min(this.items.length, startIndex + visibleCount + this.overscan * 2);

    return {
      items: this.items.slice(startIndex, endIndex),
      startIndex,
      endIndex
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }
}

/**
 * Request deduplicator
 */
export class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  async dedupe<T>(key: string, request: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      return existing;
    }

    const promise = request().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

/**
 * Memoized selectors
 */
export const createMemoizedSelectors = () => {
  const cache = new PerformanceCache<any>(60000); // 1 minute cache

  return {
    getFilteredAPICalls: (calls: any[], model: string | 'all') => {
      const key = `filtered-${model}-${calls.length}`;
      const cached = cache.get(key);
      if (cached) return cached;

      const result = model === 'all' ? calls : calls.filter(c => c.model === model);
      cache.set(key, result);
      return result;
    },

    getActiveBudgets: (budgets: CostBudget[]) => {
      const key = `active-budgets-${budgets.length}`;
      const cached = cache.get(key);
      if (cached) return cached;

      const now = new Date();
      const result = budgets.filter(b => {
        if (!b.endDate) return true;
        return new Date(b.endDate) > now;
      });
      cache.set(key, result);
      return result;
    },

    getTotalCost: (metrics: UsageMetrics | null) => {
      if (!metrics) return 0;
      const key = `total-cost-${metrics.totalCost}`;
      const cached = cache.get(key);
      if (cached) return cached;

      cache.set(key, metrics.totalCost);
      return metrics.totalCost;
    },

    clearCache: () => cache.clear(),
    getCacheStats: () => cache.getStats()
  };
};

/**
 * Create debounced actions
 */
export const createDebouncedActions = () => {
  return {
    refreshAnalytics: debounce((action: () => void) => {
      action();
    }, 500),

    updateBudget: debounce((action: (id: string, updates: any) => void, id: string, updates: any) => {
      action(id, updates);
    }, 300),

    trackAPICall: debounce((action: (call: any) => void, call: any) => {
      action(call);
    }, 100)
  };
};

/**
 * Batch processor for API calls
 */
export class BatchProcessor<T> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private processDelay: number;

  constructor(batchSize: number = 50, processDelay: number = 100) {
    this.batchSize = batchSize;
    this.processDelay = processDelay;
  }

  async add(items: T[], processor: (batch: T[]) => Promise<void>): Promise<void> {
    this.queue.push(...items);
    
    if (this.processing) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      await processor(batch);
      
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processDelay));
      }
    }
    
    this.processing = false;
  }

  clear(): void {
    this.queue = [];
    this.processing = false;
  }
}