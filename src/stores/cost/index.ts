/**
 * Cost Store Module
 * Main store file that combines all slices using Zustand's composition pattern
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { CostTracker } from '@/lib/costTracking';
import { CostStore } from './types';
import { 
  createTrackingActions,
  createBudgetActions,
  createAnalyticsActions,
  createFilterActions,
  createDataActions
} from './actions';
import { createAdditionalActions } from './additionalActions';
import { createMemoizedSelectors } from './performance';

/**
 * Initialize the cost tracker instance
 */
const initializeCostTracker = () => {
  return new CostTracker({
    enablePersistence: true,
    storageKey: 'universal-assistant-cost-data',
    autoSave: true,
    autoSaveInterval: 30000,
    maxHistorySize: 1000,
    enableAnalytics: true,
    enableBudgetAlerts: true,
    enablePerformanceMonitoring: true
  });
};

/**
 * Create the combined cost store using Zustand's slices pattern
 */
export const useCostStore = create<CostStore>()(
  devtools(
    immer((set, get, store) => {
      // Initialize tracker
      const tracker = initializeCostTracker();
      
      // Initial state
      const initialState = {
        // Core data
        apiCalls: tracker.getAPICalls(),
        budgets: tracker.getBudgets(),
        events: tracker.getEvents(),
        
        // Analytics
        analytics: null,
        usageMetrics: null,
        estimations: [],
        batchAnalysis: null,
        
        // UI state
        isLoading: false,
        error: null,
        lastUpdated: null,
        
        // Filters and views
        selectedPeriod: 'day' as const,
        selectedGranularity: 'hour' as const,
        filterModel: 'all' as const,
        filterDateRange: { start: null, end: null },
        filterService: null,
        
        // Configuration
        config: {
          realTimeTracking: true,
          budgetAlertsEnabled: true,
          performanceMonitoring: true,
          autoExport: false,
          exportInterval: 3600000,
          retentionPeriod: 30,
          aggregationLevel: 'detailed' as const
        },
        
        // Performance
        performance: {
          isAnalyticsRefreshing: false,
          lastAnalyticsUpdate: 0,
          cacheHitRate: 0,
          batchQueueSize: 0,
          requestDedupeActive: false
        },
        
        // Tracking state
        isTracking: false,
        
        // Tracker instance
        tracker
      };

      // Combine all slices
      return {
        ...initialState,
        
        // Tracking actions
        ...createTrackingActions(set, get, store),
        
        // Budget management actions
        ...createBudgetActions(set, get, store),
        
        // Analytics actions
        ...createAnalyticsActions(set, get, store),
        
        // Filter and view actions
        ...createFilterActions(set, get, store),
        
        // Data management actions
        ...createDataActions(set, get, store),
        
        // Additional actions
        ...createAdditionalActions(set, get, store),
        
        // Additional actions not in slices
        initialize: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Load persisted data
            const tracker = get().tracker;
            if (tracker) {
              const persistedData = tracker.loadFromStorage();
              if (persistedData) {
                set((state) => {
                  state.apiCalls = tracker.getAPICalls();
                  state.budgets = tracker.getBudgets();
                  state.events = tracker.getEvents();
                });
              }
            }

            // Initial analytics refresh
            await get().refreshAnalytics(true);

            set((state) => {
              state.isLoading = false;
              state.lastUpdated = new Date();
            });
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to initialize';
              state.isLoading = false;
            });
          }
        },

        reset: () => {
          const newTracker = initializeCostTracker();
          
          set((state) => {
            // Reset to initial state
            Object.assign(state, {
              ...initialState,
              tracker: newTracker
            });
          });
        },

        getEvents: (filter) => {
          const events = get().events;
          if (!filter) return events;

          return events.filter(event => {
            if (filter.type && event.type !== filter.type) return false;
            if (filter.severity && event.severity !== filter.severity) return false;
            return true;
          });
        },

        updateConfig: (config) => {
          set((state) => {
            state.config = { ...state.config, ...config };
          });

          // Apply config changes to tracker
          const tracker = get().tracker;
          if (tracker && config.budgetAlertsEnabled !== undefined) {
            tracker.updateConfig({
              enableBudgetAlerts: config.budgetAlertsEnabled
            });
          }
        },

        getPerformanceMetrics: () => {
          return get().performance;
        },

        clearCache: () => {
          const selectors = createMemoizedSelectors();
          selectors.clearCache();
          
          set((state) => {
            state.performance.cacheHitRate = 0;
          });
        },

        optimizePerformance: () => {
          const state = get();
          
          // Clear old data
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          get().clearData(thirtyDaysAgo);
          
          // Clear cache
          get().clearCache();
          
          // Update performance state
          set((state) => {
            state.performance.cacheHitRate = 0;
            state.performance.batchQueueSize = 0;
          });
        },

        preloadHistoricalData: async (period) => {
          set((state) => {
            state.isLoading = true;
          });

          try {
            // Preload analytics for the specified period
            const tracker = get().tracker;
            if (tracker) {
              const analytics = tracker.getAnalytics(period);
              const metrics = tracker.getUsageMetrics();
              
              set((state) => {
                state.analytics = analytics;
                state.usageMetrics = metrics;
                state.isLoading = false;
                state.lastUpdated = new Date();
              });
            }
          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to preload data';
              state.isLoading = false;
            });
          }
        }
      };
    }),
    {
      name: 'cost-store',
      // Redux DevTools configuration
      trace: true,
      serialize: {
        options: {
          map: true,
          set: true,
          date: true,
          symbol: true,
          function: (fn: any) => fn.toString()
        }
      }
    }
  )
);

// Export selectors
export * from './selectors';
export * from './types';

// Export hooks
export * from './hooks';

// Export performance utilities
export { 
  PerformanceCache,
  VirtualScrollHelper,
  RequestDeduplicator,
  BatchProcessor 
} from './performance';

// Export validation utilities
export { 
  validateBudget,
  validateAPICall,
  validatePeriod,
  VALIDATION_ERRORS 
} from './validation';