/**
 * Additional Actions Module
 * Actions that were in the old implementation but not covered by main action slices
 */

import { StateCreator } from 'zustand';
import { CostStore } from './types';
import { CostPeriod, APICall, CostEstimation } from '@/types/cost';
import { AIModel } from '@/types';
import { getModelConfig, estimateTokens } from '@/config/modelConfigs';
import { withErrorBoundary } from './validation';

/**
 * Additional actions interface
 */
export interface AdditionalActions {
  // Estimation
  estimateCost: (prompt: string, model: AIModel, context?: string[]) => CostEstimation;
  
  // Event subscription
  subscribeToEvents: (callback: (event: any) => void) => () => void;
  clearEvents: () => void;
  
  // Tracking control
  startTracking: () => void;
  stopTracking: () => void;
  isTracking: boolean;
  
  // Error handling
  resetError: () => void;
  
  // Data refresh
  refresh: () => Promise<void>;
  
  // Additional filters
  filterService: string | null;
  setFilterService: (service: string | null) => void;
  clearFilters: () => void;
  
  // Historical data
  getUsageForPeriod: (period: CostPeriod) => { totalCost: number; callCount: number };
  
  // Config reset
  resetConfig: () => void;
  
  // Data export variations
  exportData: (format: 'json' | 'csv') => string;
}

/**
 * Create additional actions slice
 */
export const createAdditionalActions: StateCreator<
  CostStore,
  [],
  [],
  AdditionalActions
> = (set, get) => ({
  // Estimation
  estimateCost: (prompt: string, model: AIModel, context?: string[]) => {
    const config = getModelConfig(model);
    if (!config) {
      throw new Error(`Model ${model} not found in configurations`);
    }

    const fullPrompt = context ? [...context, prompt].join('\n') : prompt;
    const estimatedTokens = estimateTokens(fullPrompt);
    
    // Estimate based on model pricing
    const inputCost = (estimatedTokens.input / 1000) * config.pricing.input;
    const outputCost = (estimatedTokens.output / 1000) * config.pricing.output;
    const totalCost = inputCost + outputCost;

    const estimation: CostEstimation = {
      id: `est-${Date.now()}`,
      model,
      estimatedTokens,
      estimatedCost: totalCost,
      breakdown: {
        inputCost,
        outputCost
      },
      timestamp: new Date(),
      prompt: prompt.substring(0, 100) // Store first 100 chars for reference
    };

    // Store estimation
    set((state) => {
      state.estimations.push(estimation);
      if (state.estimations.length > 20) {
        state.estimations = state.estimations.slice(-20);
      }
    });

    return estimation;
  },

  // Event subscription
  subscribeToEvents: (callback) => {
    // Simple event subscription using store subscribe
    const unsubscribe = get().tracker.subscribeToEvents?.(callback) || (() => {});
    return unsubscribe;
  },

  clearEvents: () => {
    set((state) => {
      state.events = [];
    });
  },

  // Tracking control
  startTracking: () => {
    set((state) => {
      state.isTracking = true;
    });
  },

  stopTracking: () => {
    set((state) => {
      state.isTracking = false;
    });
  },

  isTracking: false,

  // Error handling
  resetError: () => {
    set((state) => {
      state.error = null;
    });
  },

  // Data refresh
  refresh: async () => {
    const { refreshAnalytics, tracker } = get();
    
    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      // Reload data from tracker
      if (tracker) {
        set((state) => {
          state.apiCalls = tracker.getAPICalls();
          state.budgets = tracker.getBudgets();
          state.events = tracker.getEvents();
        });
      }

      // Refresh analytics
      await refreshAnalytics(true);

      set((state) => {
        state.isLoading = false;
        state.lastUpdated = new Date();
      });
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to refresh';
        state.isLoading = false;
      });
      throw error;
    }
  },

  // Additional filters
  filterService: null,
  
  setFilterService: (service) => {
    set((state) => {
      state.filterService = service;
    });
  },

  clearFilters: () => {
    set((state) => {
      state.filterModel = 'all';
      state.filterService = null;
      state.filterDateRange = { start: null, end: null };
    });
  },

  // Historical data
  getUsageForPeriod: (period) => {
    const { apiCalls } = get();
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case 'hour':
        startTime = now - 60 * 60 * 1000;
        break;
      case 'day':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'year':
        startTime = now - 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = now - 24 * 60 * 60 * 1000;
    }

    const filteredCalls = apiCalls.filter(call => 
      call.timestamp.getTime() >= startTime
    );

    return {
      totalCost: filteredCalls.reduce((sum, call) => sum + call.cost, 0),
      callCount: filteredCalls.length
    };
  },

  // Config reset
  resetConfig: () => {
    set((state) => {
      state.config = {
        realTimeTracking: true,
        budgetAlertsEnabled: true,
        performanceMonitoring: true,
        autoExport: false,
        exportInterval: 3600000,
        retentionPeriod: 30,
        aggregationLevel: 'detailed'
      };
    });
  },

  // Enhanced export with format support
  exportData: (format) => {
    const state = get();
    const data = {
      apiCalls: state.apiCalls,
      budgets: state.budgets,
      events: state.events,
      analytics: state.analytics,
      config: state.config,
      exportDate: new Date().toISOString()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      // Simple CSV export of API calls
      const headers = ['Timestamp', 'Model', 'Cost', 'Tokens In', 'Tokens Out', 'Duration', 'Success'];
      const rows = state.apiCalls.map(call => [
        call.timestamp.toISOString(),
        call.model,
        call.cost.toFixed(6),
        call.tokensUsed.input,
        call.tokensUsed.output,
        call.duration || 0,
        call.success ? 'true' : 'false'
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
    }

    return JSON.stringify(data, null, 2);
  }
});