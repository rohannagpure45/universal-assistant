/**
 * Cost Store Actions Module
 * Defines all actions for the cost store using Zustand's StateCreator pattern
 */

import { StateCreator } from 'zustand';
import { CostStore, CostStoreState, CostStoreActions } from './types';
import { 
  APICall, 
  CostBudget, 
  CostAnalytics, 
  CostEvent,
  CostEstimation,
  BatchCostAnalysis,
  CostPeriod,
  CostGranularity,
  CostTrackingConfig
} from '@/types/cost';
import { AIModel } from '@/types';
import { CostTracker } from '@/lib/costTracking';
import { 
  validateBudget, 
  validateAPICall, 
  validatePeriod,
  VALIDATION_ERRORS,
  withErrorBoundary 
} from './validation';
import { 
  BatchProcessor,
  RequestDeduplicator,
  createDebouncedActions 
} from './performance';

/**
 * Create tracking actions slice
 */
export const createTrackingActions: StateCreator<
  CostStore,
  [['zustand/immer', never]],
  [],
  Pick<CostStoreActions, 'trackAPICall' | 'batchTrackAPICalls' | 'recordEvent'>
> = (set, get) => {
  const batchProcessor = new BatchProcessor<Omit<APICall, 'id' | 'timestamp'>>();
  const deduplicator = new RequestDeduplicator();

  return {
    trackAPICall: withErrorBoundary(async (call) => {
      const validationErrors = validateAPICall(call);
      if (validationErrors.length > 0) {
        throw new Error(`Invalid API call: ${validationErrors.join(', ')}`);
      }

      const tracker = get().tracker;
      if (!tracker) {
        throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
      }

      set((state) => ({
        ...state,
        isLoading: true,
        error: null,
      }));

      try {
        const trackedCall = await tracker.trackAPICall(call);
        
        set((state) => ({
          ...state,
          apiCalls: tracker.getAPICalls(),
          events: tracker.getEvents(),
          lastUpdated: new Date(),
          isLoading: false,
        }));

        // Refresh analytics if real-time tracking is enabled
        if (get().config.realTimeTracking) {
          await get().refreshAnalytics();
        }

        return trackedCall;
      } catch (error) {
        set((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Failed to track API call',
          isLoading: false,
        }));
        throw error;
      }
    }, 'Failed to track API call'),

    batchTrackAPICalls: async (calls) => {
      await batchProcessor.add(calls, async (batch) => {
        for (const call of batch) {
          await get().trackAPICall(call);
        }
      });
    },

    recordEvent: (event) => {
      const tracker = get().tracker;
      if (!tracker) return;

      tracker.recordEvent(event);
      set((state) => ({
        ...state,
        events: tracker.getEvents(),
      }));
    }
  };
};

/**
 * Create budget management actions slice
 */
export const createBudgetActions: StateCreator<
  CostStore,
  [['zustand/immer', never]],
  [],
  Pick<CostStoreActions, 'createBudget' | 'updateBudget' | 'deleteBudget' | 'getBudgetStatus' | 'checkBudgetAlerts'>
> = (set, get) => ({
  createBudget: withErrorBoundary((budget) => {
    const validationErrors = validateBudget(budget);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid budget: ${validationErrors.join(', ')}`);
    }

    const tracker = get().tracker;
    if (!tracker) {
      throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
    }

    const newBudget = tracker.createBudget(budget);
    
    set((state) => ({
      ...state,
      budgets: tracker.getBudgets(),
      lastUpdated: new Date(),
      error: null,
    }));
    
    return newBudget;
  }, 'Failed to create budget'),

  updateBudget: withErrorBoundary((budgetId, updates) => {
    if (!budgetId || typeof budgetId !== 'string') {
      throw new Error('Invalid budget ID');
    }

    const validationErrors = validateBudget(updates);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid budget update: ${validationErrors.join(', ')}`);
    }

    const tracker = get().tracker;
    if (!tracker) {
      throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
    }

    const updated = tracker.updateBudget(budgetId, updates);
    
    if (updated) {
      set((state) => ({
        ...state,
        budgets: tracker.getBudgets(),
        lastUpdated: new Date(),
        error: null,
      }));
      return true;
    }
    
    return false;
  }, 'Failed to update budget'),

  deleteBudget: withErrorBoundary((budgetId) => {
    if (!budgetId || typeof budgetId !== 'string') {
      throw new Error('Invalid budget ID');
    }

    const budgetExists = get().budgets.some(b => b.id === budgetId);
    if (!budgetExists) {
      throw new Error(VALIDATION_ERRORS.BUDGET_NOT_FOUND);
    }

    set((state) => ({
      ...state,
      budgets: state.budgets.filter(b => b.id !== budgetId),
      lastUpdated: new Date(),
      error: null,
    }));
    
    return true;
  }, 'Failed to delete budget'),

  getBudgetStatus: (budgetId) => {
    if (!budgetId || typeof budgetId !== 'string') {
      return null;
    }

    const budget = get().budgets.find(b => b.id === budgetId);
    if (!budget) return null;

    const percentage = Math.min((budget.currentUsage / budget.limit) * 100, 100);
    const remaining = Math.max(budget.limit - budget.currentUsage, 0);
    
    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (percentage >= 95) status = 'danger';
    else if (percentage >= (budget.alerts.thresholds[1] || 80)) status = 'warning';

    return { percentage, remaining, status };
  },

  checkBudgetAlerts: () => {
    const budgets = get().budgets;
    const events: Array<Omit<CostEvent, 'id' | 'timestamp'>> = [];

    budgets.forEach(budget => {
      const status = get().getBudgetStatus(budget.id);
      if (!status) return;

      if (status.status === 'danger') {
        events.push({
          type: 'budget_alert',
          severity: 'error',
          message: `Budget "${budget.name}" is at ${status.percentage.toFixed(1)}% capacity`,
          data: budget
        });
      } else if (status.status === 'warning') {
        events.push({
          type: 'budget_alert',
          severity: 'warning',
          message: `Budget "${budget.name}" has exceeded ${budget.alerts.thresholds[1] || 80}% threshold`,
          data: budget
        });
      }
    });

    events.forEach(event => get().recordEvent(event));
  }
});

/**
 * Create analytics actions slice
 */
export const createAnalyticsActions: StateCreator<
  CostStore,
  [['zustand/immer', never]],
  [],
  Pick<CostStoreActions, 'refreshAnalytics' | 'getAnalytics' | 'getUsageMetrics' | 'generateEstimation' | 'analyzeBatch'>
> = (set, get) => {
  const deduplicator = new RequestDeduplicator();
  const debouncedActions = createDebouncedActions();

  return {
    refreshAnalytics: async (force = false) => {
      const state = get();
      
      // Check if already refreshing
      if (state.performance.isAnalyticsRefreshing && !force) {
        return;
      }

      // Throttle updates to once per 10 seconds unless forced
      const timeSinceLastUpdate = Date.now() - state.performance.lastAnalyticsUpdate;
      if (!force && timeSinceLastUpdate < 10000) {
        return;
      }

      // Use request deduplicator
      const key = `analytics-${state.selectedPeriod}`;
      
      await deduplicator.dedupe(key, async () => {
        set((state) => ({
          ...state,
          performance: {
            ...state.performance,
            isAnalyticsRefreshing: true
          }
        }));

        try {
          const tracker = get().tracker;
          if (!tracker) {
            throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
          }

          const analytics = tracker.getAnalytics(state.selectedPeriod);
          const metrics = tracker.getUsageMetrics();

          set((state) => ({
            ...state,
            analytics,
            usageMetrics: metrics,
            performance: {
              ...state.performance,
              isAnalyticsRefreshing: false,
              lastAnalyticsUpdate: Date.now(),
            },
            lastUpdated: new Date(),
          }));
        } catch (error) {
          set((state) => ({
            ...state,
            error: error instanceof Error ? error.message : 'Failed to refresh analytics',
            performance: {
              ...state.performance,
              isAnalyticsRefreshing: false
            }
          }));
        }
      });
    },

    getAnalytics: (period) => {
      const tracker = get().tracker;
      if (!tracker) return null;
      
      return tracker.getAnalytics(period || get().selectedPeriod);
    },

    getUsageMetrics: () => {
      const tracker = get().tracker;
      if (!tracker) return null;
      
      return tracker.getUsageMetrics();
    },

    generateEstimation: (params) => {
      const tracker = get().tracker;
      if (!tracker) {
        throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
      }

      const estimation = tracker.generateEstimation(params);
      
      set((state) => {
        const newEstimations = [...state.estimations, estimation];
        return {
          ...state,
          estimations: newEstimations.length > 10 ? newEstimations.slice(-10) : newEstimations
        };
      });

      return estimation;
    },

    analyzeBatch: (callIds) => {
      const tracker = get().tracker;
      if (!tracker) return null;

      const analysis = tracker.analyzeBatch(callIds);
      
      set((state) => ({
        ...state,
        batchAnalysis: analysis
      }));

      return analysis;
    }
  };
};

/**
 * Create filter and view actions slice
 */
export const createFilterActions: StateCreator<
  CostStore,
  [['zustand/immer', never]],
  [],
  Pick<CostStoreActions, 'setSelectedPeriod' | 'setSelectedGranularity' | 'setFilterModel' | 'setFilterDateRange'>
> = (set, get) => ({
  setSelectedPeriod: withErrorBoundary((period) => {
    if (!validatePeriod(period)) {
      throw new Error(VALIDATION_ERRORS.INVALID_PERIOD);
    }

    set((state) => ({
      ...state,
      selectedPeriod: period,
      error: null
    }));

    // Refresh analytics with new period
    get().refreshAnalytics();
  }, 'Failed to set period'),

  setSelectedGranularity: (granularity) => {
    set((state) => ({
      ...state,
      selectedGranularity: granularity
    }));
  },

  setFilterModel: withErrorBoundary((model) => {
    if (model !== 'all' && (!model || typeof model !== 'string')) {
      throw new Error(VALIDATION_ERRORS.INVALID_MODEL);
    }

    set((state) => ({
      ...state,
      filterModel: model,
      error: null
    }));
  }, 'Failed to set filter model'),

  setFilterDateRange: (range) => {
    set((state) => ({
      ...state,
      filterDateRange: range
    }));
  }
});

/**
 * Create data management actions slice
 */
export const createDataActions: StateCreator<
  CostStore,
  [['zustand/immer', never]],
  [],
  Pick<CostStoreActions, 'exportData' | 'importData' | 'clearData'>
> = (set, get) => ({
  exportData: () => {
    const tracker = get().tracker;
    if (!tracker) {
      throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
    }
    
    return tracker.exportData();
  },

  importData: withErrorBoundary(async (data) => {
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid import data: must be a non-empty string');
    }

    try {
      JSON.parse(data);
    } catch {
      throw new Error('Invalid import data: must be valid JSON');
    }

    const tracker = get().tracker;
    if (!tracker) {
      throw new Error(VALIDATION_ERRORS.TRACKER_UNAVAILABLE);
    }

    set((state) => ({
      ...state,
      isLoading: true,
      error: null
    }));

    try {
      tracker.importData(data);
      
      set((state) => ({
        ...state,
        apiCalls: tracker.getAPICalls(),
        budgets: tracker.getBudgets(),
        events: tracker.getEvents(),
        lastUpdated: new Date(),
        isLoading: false
      }));

      // Refresh analytics after import
      await get().refreshAnalytics();
      
      return true;
    } catch (error) {
      set((state) => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to import data',
        isLoading: false
      }));
      throw error;
    }
  }, 'Failed to import data'),

  clearData: withErrorBoundary((olderThan) => {
    if (olderThan && !(olderThan instanceof Date)) {
      throw new Error('Invalid date: olderThan must be a Date object');
    }

    set((state) => {
      if (olderThan) {
        const initialCallCount = state.apiCalls.length;
        const initialEventCount = state.events.length;
        
        const filteredApiCalls = state.apiCalls.filter(call => call.timestamp >= olderThan);
        const filteredEvents = state.events.filter(event => event.timestamp >= olderThan);
        
        console.log(`Cleared ${initialCallCount - filteredApiCalls.length} API calls and ${initialEventCount - filteredEvents.length} events older than ${olderThan.toISOString()}`);
        
        return {
          ...state,
          apiCalls: filteredApiCalls,
          events: filteredEvents,
          lastUpdated: new Date(),
          error: null
        };
      } else {
        const clearedCalls = state.apiCalls.length;
        const clearedEvents = state.events.length;
        
        console.log(`Cleared all data: ${clearedCalls} API calls and ${clearedEvents} events`);
        
        return {
          ...state,
          apiCalls: [],
          events: [],
          lastUpdated: new Date(),
          error: null
        };
      }
    });
  }, 'Failed to clear data')
});