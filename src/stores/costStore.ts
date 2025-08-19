import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  APICall, 
  CostBudget, 
  CostAnalytics, 
  UsageMetrics, 
  CostEvent, 
  CostEstimation,
  BatchCostAnalysis,
  CostTrackingConfig,
  CostPeriod,
  CostGranularity
} from '@/types/cost';
import { AIModel } from '@/types';
import { CostTracker } from '@/lib/costTracking';
import { debounce } from 'lodash';
import React from 'react';

// Performance utilities
class PerformanceCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static instance: PerformanceCache;
  
  static getInstance(): PerformanceCache {
    if (!PerformanceCache.instance) {
      PerformanceCache.instance = new PerformanceCache();
    }
    return PerformanceCache.instance;
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl: number = 5000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  size(): number {
    return this.cache.size;
  }
}

// Request deduplication utility
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }
    
    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
  
  clear(): void {
    this.pendingRequests.clear();
  }
}

// Batch processor for API calls
class BatchProcessor {
  private batches = new Map<string, APICall[]>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private readonly batchSize = 50;
  private readonly batchTimeout = 1000; // 1 second
  
  addToBatch(key: string, call: APICall, processFn: (calls: APICall[]) => void): void {
    if (!this.batches.has(key)) {
      this.batches.set(key, []);
    }
    
    const batch = this.batches.get(key)!;
    batch.push(call);
    
    // Clear existing timeout
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Process batch if it reaches size limit or set timeout
    if (batch.length >= this.batchSize) {
      this.processBatch(key, processFn);
    } else {
      const timeout = setTimeout(() => {
        this.processBatch(key, processFn);
      }, this.batchTimeout);
      this.timeouts.set(key, timeout);
    }
  }
  
  private processBatch(key: string, processFn: (calls: APICall[]) => void): void {
    const batch = this.batches.get(key);
    if (batch && batch.length > 0) {
      processFn([...batch]);
      this.batches.set(key, []);
    }
    
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }
}

// Virtual scrolling helper
interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

class VirtualScrollHelper {
  static calculateVisibleRange(
    scrollTop: number,
    config: VirtualScrollConfig,
    totalItems: number
  ): { start: number; end: number; offsetY: number } {
    const { itemHeight, containerHeight, overscan = 5 } = config;
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);
    const offsetY = start * itemHeight;
    
    return { start, end, offsetY };
  }
  
  static getSlicedData<T>(data: T[], start: number, end: number): T[] {
    return data.slice(start, end);
  }
}

// Performance monitoring
class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  
  static time<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const times = this.metrics.get(label)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    return result;
  }
  
  static getAverageTime(label: string): number {
    const times = this.metrics.get(label) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
  
  static getMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};
    
    for (const [label, times] of this.metrics.entries()) {
      result[label] = {
        average: times.reduce((a, b) => a + b, 0) / times.length,
        count: times.length
      };
    }
    
    return result;
  }
}

const performanceCache = PerformanceCache.getInstance();
const requestDeduplicator = new RequestDeduplicator();
const batchProcessor = new BatchProcessor();

// Validation schemas and utilities
const VALIDATION_ERRORS = {
  INVALID_BUDGET_LIMIT: 'Budget limit must be greater than 0',
  INVALID_BUDGET_NAME: 'Budget name must be at least 3 characters',
  INVALID_PERIOD: 'Invalid period specified',
  INVALID_MODEL: 'Invalid AI model specified',
  INVALID_COST: 'Cost must be a positive number',
  BUDGET_NOT_FOUND: 'Budget not found',
  TRACKER_UNAVAILABLE: 'Cost tracker is not available',
} as const;

// Input validation utilities
const validateBudget = (budget: Partial<CostBudget>): string[] => {
  const errors: string[] = [];
  
  if (budget.name && budget.name.length < 3) {
    errors.push(VALIDATION_ERRORS.INVALID_BUDGET_NAME);
  }
  
  if (budget.limit !== undefined && budget.limit <= 0) {
    errors.push(VALIDATION_ERRORS.INVALID_BUDGET_LIMIT);
  }
  
  return errors;
};

const validateAPICall = (call: Partial<APICall>): string[] => {
  const errors: string[] = [];
  
  if (call.cost !== undefined && call.cost < 0) {
    errors.push(VALIDATION_ERRORS.INVALID_COST);
  }
  
  return errors;
};

// Error boundary wrapper for store actions
const withErrorBoundary = <T extends any[], R>(
  action: (...args: T) => R,
  errorMessage: string
) => {
  return (...args: T): R => {
    try {
      return PerformanceMonitor.time(errorMessage, () => action(...args));
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
};

// Memoization utility for expensive calculations
const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  getKey: (...args: Parameters<T>) => string,
  ttl: number = 5000
): T => {
  return ((...args: Parameters<T>) => {
    const key = getKey(...args);
    const cached = performanceCache.get<ReturnType<T>>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const result = fn(...args);
    performanceCache.set(key, result, ttl);
    return result;
  }) as T;
};

// Debounced action wrapper
const createDebouncedAction = <T extends any[]>(
  action: (...args: T) => void | Promise<void>,
  delay: number = 300
) => {
  return debounce(action, delay, { leading: false, trailing: true });
};

// Cost store state interface
export interface CostState {
  // Core tracking data
  tracker: CostTracker;
  apiCalls: APICall[];
  budgets: CostBudget[];
  events: CostEvent[];
  
  // Analytics and metrics
  currentAnalytics: CostAnalytics | null;
  usageMetrics: UsageMetrics | null;
  
  // UI state
  isLoading: boolean;
  isTracking: boolean;
  lastUpdated: Date | null;
  
  // Performance state
  isPreloading: boolean;
  cacheStats: { size: number; hitRate: number; missRate: number };
  lastAnalyticsUpdate: Date | null;
  selectiveUpdateFlags: {
    analytics: boolean;
    budgets: boolean;
    events: boolean;
  };
  
  // Configuration
  config: CostTrackingConfig;
  
  // Filters and views
  selectedPeriod: CostPeriod;
  selectedGranularity: CostGranularity;
  filterModel: AIModel | 'all';
  filterService: string | 'all';
  
  // Errors
  error: string | null;
}

// Cost store actions interface
export interface CostActions {
  // Core tracking actions
  trackAPICall: (call: Omit<APICall, 'id' | 'cost'>) => Promise<APICall>;
  estimateCost: (prompt: string, model: AIModel, context?: string[]) => CostEstimation;
  
  // Budget management
  createBudget: (budget: Omit<CostBudget, 'id' | 'currentUsage' | 'createdAt' | 'updatedAt'>) => CostBudget;
  updateBudget: (budgetId: string, updates: Partial<CostBudget>) => boolean;
  deleteBudget: (budgetId: string) => boolean;
  getBudgetStatus: (budgetId: string) => { percentage: number; remaining: number; status: 'safe' | 'warning' | 'danger' } | null;
  
  // Analytics and reporting
  refreshAnalytics: (selective?: boolean) => Promise<void>;
  getUsageForPeriod: (start: Date, end: Date) => UsageMetrics;
  analyzeBatch: (calls: APICall[]) => BatchCostAnalysis;
  exportData: (format: 'json' | 'csv') => string;
  
  // Performance optimized methods
  refreshAnalyticsDebounced: () => void;
  batchTrackAPICalls: (calls: Omit<APICall, 'id' | 'cost'>[]) => Promise<APICall[]>;
  getVirtualScrollData: (scrollTop: number, config: VirtualScrollConfig) => { items: APICall[]; totalHeight: number; offsetY: number };
  preloadHistoricalData: (period: CostPeriod) => Promise<void>;
  clearCache: () => void;
  getPerformanceMetrics: () => Record<string, { average: number; count: number }>;
  
  // Configuration
  updateConfig: (config: Partial<CostTrackingConfig>) => void;
  resetConfig: () => void;
  
  // Filters and views
  setSelectedPeriod: (period: CostPeriod) => void;
  setSelectedGranularity: (granularity: CostGranularity) => void;
  setFilterModel: (model: AIModel | 'all') => void;
  setFilterService: (service: string | 'all') => void;
  clearFilters: () => void;
  
  // Data management
  importData: (data: string) => Promise<boolean>;
  clearData: (olderThan?: Date) => void;
  
  // Event handling
  subscribeToEvents: (callback: (event: CostEvent) => void) => () => void;
  clearEvents: () => void;
  
  // Utility actions
  startTracking: () => void;
  stopTracking: () => void;
  resetError: () => void;
  refresh: () => Promise<void>;
}

// Default configuration
const defaultConfig: CostTrackingConfig = {
  enabled: true,
  trackingLevel: 'detailed',
  retentionDays: 90,
  budgetAlerts: true,
  realTimeTracking: true,
  aggregationInterval: 5, // 5 minutes
  exportFormat: 'json',
};

// Optimized selectors with memoization
const createMemoizedAnalytics = memoize(
  (apiCalls: APICall[], budgets: CostBudget[], tracker: CostTracker) => {
    return tracker.getCostAnalytics();
  },
  (apiCalls, budgets) => `analytics-${apiCalls.length}-${budgets.length}-${Date.now() - (Date.now() % 60000)}`, // Cache for 1 minute
  60000
);

const createMemoizedUsageMetrics = memoize(
  (apiCalls: APICall[], tracker: CostTracker, start?: Date, end?: Date) => {
    return tracker.getUsageMetrics(start && end ? { start, end } : undefined);
  },
  (apiCalls, tracker, start, end) => 
    `usage-${apiCalls.length}-${start?.getTime()}-${end?.getTime()}-${Date.now() - (Date.now() % 30000)}`, // Cache for 30 seconds
  30000
);

const createMemoizedFilteredCalls = memoize(
  (apiCalls: APICall[], filterModel: AIModel | 'all', filterService: string | 'all') => {
    let calls = apiCalls;
    
    if (filterModel !== 'all') {
      calls = calls.filter(call => call.model === filterModel);
    }
    
    if (filterService !== 'all') {
      calls = calls.filter(call => call.service === filterService);
    }
    
    return calls;
  },
  (apiCalls, filterModel, filterService) => `filtered-${apiCalls.length}-${filterModel}-${filterService}`,
  10000
);

// Create the cost store
export const useCostStore = create<CostState & CostActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          tracker: new CostTracker(90),
          apiCalls: [],
          budgets: [],
          events: [],
          
          currentAnalytics: null,
          usageMetrics: null,
          
          isLoading: false,
          isTracking: true,
          lastUpdated: null,
          
          // Performance state
          isPreloading: false,
          cacheStats: { size: 0, hitRate: 0, missRate: 0 },
          lastAnalyticsUpdate: null,
          selectiveUpdateFlags: {
            analytics: false,
            budgets: false,
            events: false,
          },
          
          config: defaultConfig,
          
          selectedPeriod: 'day',
          selectedGranularity: 'global',
          filterModel: 'all',
          filterService: 'all',
          
          error: null,

          // Core tracking actions
          trackAPICall: withErrorBoundary(async (call) => {
            // Input validation
            const validationErrors = validateAPICall(call);
            if (validationErrors.length > 0) {
              const error = new Error(`Invalid API call data: ${validationErrors.join(', ')}`);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            // Check if tracker is available
            const tracker = get().tracker;
            if (!tracker) {
              const error = new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              const trackedCall = await tracker.trackAPICall(call);
              
              set((state) => {
                state.apiCalls = state.tracker.getAPICalls();
                state.events = state.tracker.getEvents();
                state.lastUpdated = new Date();
                state.isLoading = false;
              });

              // Refresh analytics if tracking is enabled
              if (get().config.realTimeTracking) {
                await get().refreshAnalytics();
              }

              return trackedCall;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to track API call';
                state.isLoading = false;
              });
              throw error;
            }
          }, 'Failed to track API call'),

          estimateCost: (prompt, model, context) => {
            return get().tracker.estimateCost(prompt, model, context);
          },

          // Budget management
          createBudget: withErrorBoundary((budget) => {
            // Input validation
            const validationErrors = validateBudget(budget);
            if (validationErrors.length > 0) {
              const error = new Error(`Invalid budget data: ${validationErrors.join(', ')}`);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const tracker = get().tracker;
            if (!tracker) {
              const error = new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const newBudget = tracker.createBudget(budget);
            
            set((state) => {
              state.budgets = state.tracker.getBudgets();
              state.lastUpdated = new Date();
              state.error = null;
            });
            
            return newBudget;
          }, 'Failed to create budget'),

          updateBudget: withErrorBoundary((budgetId, updates) => {
            // Input validation
            if (!budgetId || typeof budgetId !== 'string') {
              const error = new Error('Invalid budget ID');
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const validationErrors = validateBudget(updates);
            if (validationErrors.length > 0) {
              const error = new Error(`Invalid budget update data: ${validationErrors.join(', ')}`);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const tracker = get().tracker;
            if (!tracker) {
              const error = new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const updated = tracker.updateBudget(budgetId, updates);
            
            if (updated) {
              set((state) => {
                state.budgets = state.tracker.getBudgets();
                state.lastUpdated = new Date();
                state.error = null;
              });
              return true;
            } else {
              const error = new Error(VALIDATION_ERRORS.BUDGET_NOT_FOUND);
              set((state) => {
                state.error = error.message;
              });
              return false;
            }
          }, 'Failed to update budget'),

          deleteBudget: withErrorBoundary((budgetId) => {
            // Input validation
            if (!budgetId || typeof budgetId !== 'string') {
              const error = new Error('Invalid budget ID');
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const budgetExists = get().budgets.some(b => b.id === budgetId);
            if (!budgetExists) {
              const error = new Error(VALIDATION_ERRORS.BUDGET_NOT_FOUND);
              set((state) => {
                state.error = error.message;
              });
              return false;
            }

            set((state) => {
              const index = state.budgets.findIndex(b => b.id === budgetId);
              if (index !== -1) {
                state.budgets.splice(index, 1);
                state.lastUpdated = new Date();
                state.error = null;
              }
            });
            
            return true;
          }, 'Failed to delete budget'),

          getBudgetStatus: withErrorBoundary((budgetId) => {
            // Input validation
            if (!budgetId || typeof budgetId !== 'string') {
              return null;
            }

            const budget = get().budgets.find(b => b.id === budgetId);
            if (!budget) return null;

            // Validate budget data integrity
            if (typeof budget.currentUsage !== 'number' || typeof budget.limit !== 'number' || budget.limit <= 0) {
              console.warn(`Invalid budget data for budget ${budgetId}`);
              return null;
            }

            const percentage = Math.min((budget.currentUsage / budget.limit) * 100, 100);
            const remaining = Math.max(budget.limit - budget.currentUsage, 0);
            
            let status: 'safe' | 'warning' | 'danger' = 'safe';
            if (percentage >= 95) status = 'danger';
            else if (percentage >= 80) status = 'warning';

            return { percentage, remaining, status };
          }, 'Failed to get budget status'),

          // Analytics and reporting with performance optimizations
          refreshAnalytics: async (selective = false) => {
            const cacheKey = 'analytics_refresh';
            return await requestDeduplicator.deduplicate(cacheKey, async () => {
              try {
                set((state) => {
                  state.isLoading = true;
                  state.error = null;
                });

                const state = get();
                const now = new Date();
                
                // Check if we need to update based on selective flags
                if (selective && state.lastAnalyticsUpdate) {
                  const timeSinceLastUpdate = now.getTime() - state.lastAnalyticsUpdate.getTime();
                  if (timeSinceLastUpdate < 10000) { // 10 seconds throttle
                    set((state) => {
                      state.isLoading = false;
                    });
                    return;
                  }
                }

                // Use memoized analytics for better performance
                const analytics = createMemoizedAnalytics(
                  state.apiCalls,
                  state.budgets,
                  state.tracker
                );
                
                const usageMetrics = createMemoizedUsageMetrics(
                  state.apiCalls,
                  state.tracker
                );

                set((state) => {
                  state.currentAnalytics = analytics;
                  state.usageMetrics = usageMetrics;
                  state.lastUpdated = now;
                  state.lastAnalyticsUpdate = now;
                  state.isLoading = false;
                  
                  // Update cache stats
                  state.cacheStats = {
                    size: performanceCache.size(),
                    hitRate: 0.85, // Mock calculation - would be real in production
                    missRate: 0.15
                  };
                });
              } catch (error) {
                set((state) => {
                  state.error = error instanceof Error ? error.message : 'Failed to refresh analytics';
                  state.isLoading = false;
                });
              }
            });
          },

          getUsageForPeriod: (start, end) => {
            return get().tracker.getUsageMetrics({ start, end });
          },

          analyzeBatch: (calls) => {
            return get().tracker.analyzeBatch(calls);
          },

          exportData: (format) => {
            if (format === 'csv') {
              // Convert to CSV format (simplified)
              const calls = get().apiCalls;
              const headers = ['timestamp', 'model', 'service', 'operation', 'cost', 'inputTokens', 'outputTokens'];
              const rows = calls.map(call => [
                call.timestamp.toISOString(),
                call.model,
                call.service,
                call.operation,
                call.cost.toString(),
                call.tokenUsage.inputTokens.toString(),
                call.tokenUsage.outputTokens.toString(),
              ]);
              
              return [headers, ...rows].map(row => row.join(',')).join('\n');
            }
            
            return get().tracker.exportData();
          },

          // Configuration
          updateConfig: (updates) => {
            set((state) => {
              Object.assign(state.config, updates);
              state.lastUpdated = new Date();
            });
          },

          resetConfig: () => {
            set((state) => {
              state.config = { ...defaultConfig };
              state.lastUpdated = new Date();
            });
          },

          // Filters and views
          setSelectedPeriod: withErrorBoundary((period) => {
            // Validate period
            const validPeriods: CostPeriod[] = ['hour', 'day', 'week', 'month', 'year'];
            if (!validPeriods.includes(period)) {
              const error = new Error(VALIDATION_ERRORS.INVALID_PERIOD);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            set((state) => {
              state.selectedPeriod = period;
              state.error = null;
            });
          }, 'Failed to set selected period'),

          setSelectedGranularity: (granularity) => {
            set((state) => {
              state.selectedGranularity = granularity;
            });
          },

          setFilterModel: withErrorBoundary((model) => {
            // Validate model if not 'all'
            if (model !== 'all') {
              // Note: This would need to be updated based on actual AIModel type validation
              // For now, we'll do basic validation
              if (!model || typeof model !== 'string') {
                const error = new Error(VALIDATION_ERRORS.INVALID_MODEL);
                set((state) => {
                  state.error = error.message;
                });
                throw error;
              }
            }

            set((state) => {
              state.filterModel = model;
              state.error = null;
            });
          }, 'Failed to set filter model'),

          setFilterService: (service) => {
            set((state) => {
              state.filterService = service;
            });
          },

          clearFilters: () => {
            set((state) => {
              state.selectedPeriod = 'day';
              state.selectedGranularity = 'global';
              state.filterModel = 'all';
              state.filterService = 'all';
            });
          },

          // Data management
          importData: withErrorBoundary(async (data) => {
            // Input validation
            if (!data || typeof data !== 'string') {
              const error = new Error('Invalid import data: data must be a non-empty string');
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            // Validate JSON format
            try {
              JSON.parse(data);
            } catch {
              const error = new Error('Invalid import data: data must be valid JSON');
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            const tracker = get().tracker;
            if (!tracker) {
              const error = new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            try {
              tracker.importData(data);
              
              set((state) => {
                state.apiCalls = state.tracker.getAPICalls();
                state.budgets = state.tracker.getBudgets();
                state.events = state.tracker.getEvents();
                state.lastUpdated = new Date();
                state.isLoading = false;
              });

              // Refresh analytics after import
              await get().refreshAnalytics();
              
              return true;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to import data';
                state.isLoading = false;
              });
              throw error;
            }
          }, 'Failed to import data'),

          clearData: withErrorBoundary((olderThan) => {
            // Input validation
            if (olderThan && !(olderThan instanceof Date)) {
              const error = new Error('Invalid date: olderThan must be a Date object');
              set((state) => {
                state.error = error.message;
              });
              throw error;
            }

            set((state) => {
              if (olderThan) {
                const initialCallCount = state.apiCalls.length;
                const initialEventCount = state.events.length;
                
                state.apiCalls = state.apiCalls.filter(call => call.timestamp >= olderThan);
                state.events = state.events.filter(event => event.timestamp >= olderThan);
                
                console.log(`Cleared ${initialCallCount - state.apiCalls.length} API calls and ${initialEventCount - state.events.length} events older than ${olderThan.toISOString()}`);
              } else {
                const clearedCalls = state.apiCalls.length;
                const clearedEvents = state.events.length;
                
                state.apiCalls = [];
                state.events = [];
                
                console.log(`Cleared all data: ${clearedCalls} API calls and ${clearedEvents} events`);
              }
              state.lastUpdated = new Date();
              state.error = null;
            });
          }, 'Failed to clear data'),

          // Event handling
          subscribeToEvents: (callback) => {
            // In a real implementation, this would set up event listeners
            const interval = setInterval(() => {
              const newEvents = get().events.filter(event => 
                !event.timestamp || event.timestamp > (get().lastUpdated || new Date(0))
              );
              newEvents.forEach(callback);
            }, get().config.aggregationInterval * 60 * 1000);

            return () => clearInterval(interval);
          },

          clearEvents: () => {
            set((state) => {
              state.events = [];
              state.lastUpdated = new Date();
            });
          },

          // Performance optimized methods
          refreshAnalyticsDebounced: createDebouncedAction(async () => {
            await get().refreshAnalytics(true);
          }, 500),
          
          batchTrackAPICalls: async (calls) => {
            const results: APICall[] = [];
            const batchSize = 10;
            
            try {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });
              
              // Process in batches to avoid overwhelming the system
              for (let i = 0; i < calls.length; i += batchSize) {
                const batch = calls.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                  batch.map(call => get().trackAPICall(call))
                );
                results.push(...batchResults);
                
                // Add small delay between batches
                if (i + batchSize < calls.length) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
              
              // Refresh analytics once at the end
              await get().refreshAnalytics(true);
              
              set((state) => {
                state.isLoading = false;
              });
              
              return results;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to batch track API calls';
                state.isLoading = false;
              });
              throw error;
            }
          },
          
          getVirtualScrollData: (scrollTop, config) => {
            const calls = get().apiCalls;
            const { start, end, offsetY } = VirtualScrollHelper.calculateVisibleRange(
              scrollTop,
              config,
              calls.length
            );
            
            return {
              items: VirtualScrollHelper.getSlicedData(calls, start, end),
              totalHeight: calls.length * config.itemHeight,
              offsetY
            };
          },
          
          preloadHistoricalData: async (period) => {
            const cacheKey = `historical_${period}`;
            return await requestDeduplicator.deduplicate(cacheKey, async () => {
              try {
                set((state) => {
                  state.isPreloading = true;
                });
                
                // Simulate loading historical data based on period
                const now = new Date();
                let startDate: Date;
                
                switch (period) {
                  case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                  case 'month':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  case 'year':
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                  default:
                    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                }
                
                // Cache the preloaded data
                const historicalData = get().getUsageForPeriod(startDate, now);
                performanceCache.set(`historical_data_${period}`, historicalData, 300000); // 5 minutes
                
                set((state) => {
                  state.isPreloading = false;
                });
              } catch (error) {
                set((state) => {
                  state.error = error instanceof Error ? error.message : 'Failed to preload historical data';
                  state.isPreloading = false;
                });
              }
            });
          },
          
          clearCache: () => {
            performanceCache.clear();
            requestDeduplicator.clear();
            set((state) => {
              state.cacheStats = { size: 0, hitRate: 0, missRate: 0 };
            });
          },
          
          getPerformanceMetrics: () => {
            return PerformanceMonitor.getMetrics();
          },

          // Utility actions
          startTracking: () => {
            set((state) => {
              state.isTracking = true;
              state.config.enabled = true;
            });
          },

          stopTracking: () => {
            set((state) => {
              state.isTracking = false;
              state.config.enabled = false;
            });
          },

          resetError: () => {
            set((state) => {
              state.error = null;
            });
          },

          refresh: async () => {
            try {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });

              // Update local state with tracker data
              set((state) => {
                state.apiCalls = state.tracker.getAPICalls();
                state.budgets = state.tracker.getBudgets();
                state.events = state.tracker.getEvents();
              });

              // Refresh analytics with selective update
              await get().refreshAnalytics(true);

              set((state) => {
                state.lastUpdated = new Date();
                state.isLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to refresh data';
                state.isLoading = false;
              });
            }
          },
        }))
      ),
      {
        name: 'cost-store',
        storage: createJSONStorage(() => localStorage),
        // Only persist configuration and budgets, not the large datasets
        partialize: (state) => ({
          config: state.config,
          budgets: state.budgets,
          selectedPeriod: state.selectedPeriod,
          selectedGranularity: state.selectedGranularity,
          filterModel: state.filterModel,
          filterService: state.filterService,
        }),
      }
    ),
    {
      name: 'cost-store',
    }
  )
);

// Selector hooks for better performance
export const useCostAnalytics = () => useCostStore((state) => state.currentAnalytics);
export const useCostMetrics = () => useCostStore((state) => state.usageMetrics);
export const useCostBudgets = () => useCostStore((state) => state.budgets);
export const useCostConfig = () => useCostStore((state) => state.config);
export const useCostLoading = () => useCostStore((state) => state.isLoading);
export const useCostError = () => useCostStore((state) => state.error);

// Performance optimized computed selectors
export const useFilteredAPICalls = () => 
  useCostStore((state) => {
    return createMemoizedFilteredCalls(
      state.apiCalls,
      state.filterModel,
      state.filterService
    );
  });

// Memoized cost summary for better performance
const createMemoizedCostSummary = memoize(
  (apiCalls: APICall[], budgets: CostBudget[], isTracking: boolean, lastUpdated: Date | null, getBudgetStatus: any) => {
    const totalCalls = apiCalls.length;
    const totalCost = apiCalls.reduce((acc, call) => acc + call.cost, 0);
    const budgetCount = budgets.length;
    const activeBudgets = budgets.filter(b => {
      const status = getBudgetStatus?.(b.id);
      return status && status.status !== 'safe';
    }).length;
    
    return {
      totalCalls,
      totalCost,
      budgetCount,
      activeBudgets,
      isTracking,
      lastUpdated,
    };
  },
  (apiCalls, budgets, isTracking, lastUpdated) => 
    `summary-${apiCalls.length}-${budgets.length}-${isTracking}-${lastUpdated?.getTime()}`,
  30000 // Cache for 30 seconds
);

export const useCostSummary = () => 
  useCostStore((state) => {
    return createMemoizedCostSummary(
      state.apiCalls,
      state.budgets,
      state.isTracking,
      state.lastUpdated,
      state.getBudgetStatus
    );
  });

// Additional performance optimized selectors
export const useCostTrends = () =>
  useCostStore((state) => {
    const cacheKey = `trends-${state.apiCalls.length}-${state.lastUpdated?.getTime()}`;
    const cached = performanceCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const trends = state.currentAnalytics?.costTrends || {
      direction: 'stable' as const,
      percentage: 0,
      period: 'day' as const
    };
    
    performanceCache.set(cacheKey, trends, 60000); // Cache for 1 minute
    return trends;
  });

export const useTopModels = () =>
  useCostStore((state) => {
    const cacheKey = `topmodels-${state.apiCalls.length}`;
    const cached = performanceCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const topModels = state.currentAnalytics?.topModels || [];
    performanceCache.set(cacheKey, topModels, 120000); // Cache for 2 minutes
    return topModels;
  });

export const useBudgetAlerts = () =>
  useCostStore((state) => {
    const alerts = state.budgets
      .map(budget => {
        const status = state.getBudgetStatus?.(budget.id);
        return status && status.status !== 'safe' ? { budget, status } : null;
      })
      .filter(Boolean);
    
    return alerts;
  });

// Virtual scrolling hooks
export const useVirtualScrollData = (scrollTop: number, config: VirtualScrollConfig) =>
  useCostStore((state) => {
    return state.getVirtualScrollData(scrollTop, config);
  });

// Performance metrics hook
export const usePerformanceStats = () =>
  useCostStore((state) => ({
    cacheStats: state.cacheStats,
    isPreloading: state.isPreloading,
    lastAnalyticsUpdate: state.lastAnalyticsUpdate,
    performanceMetrics: state.getPerformanceMetrics(),
  }));

// Efficient pagination hook
export const usePaginatedAPICalls = (page: number = 0, pageSize: number = 50) =>
  useCostStore((state) => {
    const filteredCalls = createMemoizedFilteredCalls(
      state.apiCalls,
      state.filterModel,
      state.filterService
    );
    
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCalls = filteredCalls.slice(startIndex, endIndex);
    
    return {
      calls: paginatedCalls,
      totalCount: filteredCalls.length,
      hasMore: endIndex < filteredCalls.length,
      currentPage: page,
      pageSize,
    };
  });

// Lazy loading hook for historical data
export const useHistoricalData = (period: CostPeriod) => {
  const store = useCostStore();
  
  React.useEffect(() => {
    const cacheKey = `historical_data_${period}`;
    const cached = performanceCache.get(cacheKey);
    
    if (!cached && !store.isPreloading) {
      store.preloadHistoricalData(period);
    }
  }, [period, store]);
  
  return useCostStore((state) => {
    const cacheKey = `historical_data_${period}`;
    return performanceCache.get(cacheKey) || null;
  });
};

// Export utility functions for external use
export { PerformanceMonitor, VirtualScrollHelper };

// Performance utilities export
export const CostStoreUtils = {
  clearCache: () => {
    performanceCache.clear();
    requestDeduplicator.clear();
  },
  getCacheStats: () => ({
    size: performanceCache.size(),
    // Mock stats - would be real in production
    hitRate: 0.85,
    missRate: 0.15
  }),
  getPerformanceMetrics: () => PerformanceMonitor.getMetrics(),
  
  // Batch operations
  batchUpdateBudgets: async (store: CostStore, updates: Array<{ id: string; updates: Partial<CostBudget> }>) => {
    const results = [];
    for (const { id, updates: budgetUpdates } of updates) {
      try {
        const result = store.updateBudget(id, budgetUpdates);
        results.push({ id, success: result });
      } catch (error) {
        results.push({ id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    // Trigger a single analytics refresh at the end
    await store.refreshAnalytics(true);
    
    return results;
  },
  
  // Memory optimization
  optimizeMemoryUsage: (store: CostStore) => {
    // Clear old cached data
    performanceCache.clear();
    
    // Trigger cleanup of old data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    store.clearData(thirtyDaysAgo);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
};

export type CostStore = CostState & CostActions;