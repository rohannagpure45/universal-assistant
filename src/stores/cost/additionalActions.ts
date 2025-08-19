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
  exportDataWithFormat: (format: 'json' | 'csv') => string;
}

/**
 * Create additional actions slice
 */
export const createAdditionalActions: StateCreator<
  CostStore,
  [['zustand/immer', never]],
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
    const totalEstimatedTokens = estimateTokens(fullPrompt);
    
    // Estimate input/output split (assume 70% input, 30% output)
    const estimatedInputTokens = Math.ceil(totalEstimatedTokens * 0.7);
    const estimatedOutputTokens = Math.ceil(totalEstimatedTokens * 0.3);
    
    // Estimate based on model pricing
    const inputCost = (estimatedInputTokens / 1000) * config.pricing.inputTokenCost;
    const outputCost = (estimatedOutputTokens / 1000) * config.pricing.outputTokenCost;
    const totalCost = inputCost + outputCost;

    const estimation: CostEstimation = {
      estimatedTokens: totalEstimatedTokens,
      estimatedCost: totalCost,
      confidence: 0.7, // Medium confidence for estimate
      factors: {
        promptLength: fullPrompt.length,
        contextSize: context?.length || 0,
        modelComplexity: config.pricing.inputTokenCost + config.pricing.outputTokenCost,
        historicalAverage: totalCost // Use current estimate as historical average fallback
      }
    };

    // Store estimation
    set((state) => {
      const newEstimations = [...state.estimations, estimation];
      return {
        ...state,
        estimations: newEstimations.length > 20 ? newEstimations.slice(-20) : newEstimations
      };
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
    set((state) => ({
      ...state,
      events: []
    }));
  },

  // Tracking control
  startTracking: () => {
    set((state) => ({
      ...state,
      isTracking: true
    }));
  },

  stopTracking: () => {
    set((state) => ({
      ...state,
      isTracking: false
    }));
  },

  isTracking: false,

  // Error handling
  resetError: () => {
    set((state) => ({
      ...state,
      error: null
    }));
  },

  // Data refresh
  refresh: async () => {
    const { refreshAnalytics, tracker } = get();
    
    set((state) => ({
      ...state,
      isLoading: true,
      error: null
    }));

    try {
      // Reload data from tracker
      if (tracker) {
        set((state) => ({
          ...state,
          apiCalls: tracker.getAPICalls(),
          budgets: tracker.getBudgets(),
          events: tracker.getEvents()
        }));
      }

      // Refresh analytics
      await refreshAnalytics(true);

      set((state) => ({
        ...state,
        isLoading: false,
        lastUpdated: new Date()
      }));
    } catch (error) {
      set((state) => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to refresh',
        isLoading: false
      }));
      throw error;
    }
  },

  // Additional filters
  filterService: null,
  
  setFilterService: (service) => {
    set((state) => ({
      ...state,
      filterService: service
    }));
  },

  clearFilters: () => {
    set((state) => ({
      ...state,
      filterModel: 'all',
      filterService: null,
      filterDateRange: { start: null, end: null }
    }));
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
    set((state) => ({
      ...state,
      config: {
        ...state.config,
        enabled: true,
        trackingLevel: 'detailed' as const,
        retentionDays: 30,
        budgetAlerts: true,
        realTimeTracking: true,
        aggregationInterval: 60,
        exportFormat: 'json' as const
      }
    }));
  },

  // Enhanced export with format support
  exportDataWithFormat: (format) => {
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
        call.tokenUsage.inputTokens,
        call.tokenUsage.outputTokens,
        call.latency || 0,
        'true' // API calls in the system are assumed successful
      ]);

      return [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
    }

    return JSON.stringify(data, null, 2);
  }
});