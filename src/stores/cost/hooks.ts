/**
 * Cost Store Hooks Module
 * Provides selector hooks for accessing specific parts of the cost store
 */

import { useCostStore } from './index';
import { useShallow } from 'zustand/react/shallow';

// Analytics hooks
export const useCostAnalytics = () => {
  return useCostStore(state => state.analytics);
};

export const useCostMetrics = () => {
  return useCostStore(state => state.usageMetrics);
};

// Budget hooks
export const useCostBudgets = () => {
  return useCostStore(state => state.budgets);
};

// Configuration hooks
export const useCostConfig = () => {
  return useCostStore(state => state.config);
};

// Loading and error state hooks
export const useCostLoading = () => {
  return useCostStore(state => state.isLoading);
};

export const useCostError = () => {
  return useCostStore(state => state.error);
};

// Filter hooks
export const useFilteredAPICalls = () => {
  return useCostStore(
    useShallow(state => {
      const { apiCalls, filterModel } = state;
      if (filterModel === 'all') return apiCalls;
      return apiCalls.filter(call => call.model === filterModel);
    })
  );
};

// Summary hook
export const useCostSummary = () => {
  return useCostStore(
    useShallow(state => {
      const { apiCalls, budgets, isLoading, lastUpdated } = state;
      const totalCalls = apiCalls.length;
      const totalCost = apiCalls.reduce((sum, call) => sum + call.cost, 0);
      const averageCost = totalCalls > 0 ? totalCost / totalCalls : 0;
      
      // Get unique models
      const modelsUsed = Array.from(new Set(apiCalls.map(call => call.model)));
      
      // Get cost by model
      const costByModel = modelsUsed.reduce((acc, model) => {
        const modelCalls = apiCalls.filter(call => call.model === model);
        acc[model] = {
          count: modelCalls.length,
          cost: modelCalls.reduce((sum, call) => sum + call.cost, 0)
        };
        return acc;
      }, {} as Record<string, { count: number; cost: number }>);
      
      // Count active budgets that need attention
      const activeBudgets = budgets.filter(budget => {
        const percentage = (budget.currentUsage / budget.limit) * 100;
        return percentage >= budget.threshold;
      }).length;
      
      return {
        totalCalls,
        totalCost,
        averageCost,
        modelsUsed,
        costByModel,
        activeBudgets,
        isTracking: !isLoading,
        lastUpdated
      };
    })
  );
};

// Period and granularity hooks
export const useSelectedPeriod = () => {
  return useCostStore(state => state.selectedPeriod);
};

export const useSelectedGranularity = () => {
  return useCostStore(state => state.selectedGranularity);
};

// Filter model hook
export const useFilterModel = () => {
  return useCostStore(state => state.filterModel);
};

// Performance metrics hook
export const usePerformanceMetrics = () => {
  return useCostStore(state => state.performance);
};

// Events hook
export const useCostEvents = () => {
  return useCostStore(state => state.events);
};

// Estimations hook
export const useCostEstimations = () => {
  return useCostStore(state => state.estimations);
};

// Batch analysis hook
export const useBatchAnalysis = () => {
  return useCostStore(state => state.batchAnalysis);
};

// Combined state hook for complex selectors
export const useCostState = () => {
  return useCostStore(
    useShallow(state => ({
      apiCalls: state.apiCalls,
      budgets: state.budgets,
      events: state.events,
      analytics: state.analytics,
      usageMetrics: state.usageMetrics,
      estimations: state.estimations,
      batchAnalysis: state.batchAnalysis,
      isLoading: state.isLoading,
      error: state.error,
      lastUpdated: state.lastUpdated,
      selectedPeriod: state.selectedPeriod,
      selectedGranularity: state.selectedGranularity,
      filterModel: state.filterModel,
      filterDateRange: state.filterDateRange,
      config: state.config,
      performance: state.performance
    }))
  );
};

// Actions hook
export const useCostActions = () => {
  return useCostStore(
    useShallow(state => ({
      initialize: state.initialize,
      reset: state.reset,
      trackAPICall: state.trackAPICall,
      batchTrackAPICalls: state.batchTrackAPICalls,
      createBudget: state.createBudget,
      updateBudget: state.updateBudget,
      deleteBudget: state.deleteBudget,
      getBudgetStatus: state.getBudgetStatus,
      checkBudgetAlerts: state.checkBudgetAlerts,
      refreshAnalytics: state.refreshAnalytics,
      getAnalytics: state.getAnalytics,
      getUsageMetrics: state.getUsageMetrics,
      generateEstimation: state.generateEstimation,
      analyzeBatch: state.analyzeBatch,
      recordEvent: state.recordEvent,
      getEvents: state.getEvents,
      setSelectedPeriod: state.setSelectedPeriod,
      setSelectedGranularity: state.setSelectedGranularity,
      setFilterModel: state.setFilterModel,
      setFilterDateRange: state.setFilterDateRange,
      updateConfig: state.updateConfig,
      exportData: state.exportData,
      importData: state.importData,
      clearData: state.clearData,
      getPerformanceMetrics: state.getPerformanceMetrics,
      clearCache: state.clearCache,
      optimizePerformance: state.optimizePerformance,
      preloadHistoricalData: state.preloadHistoricalData
    }))
  );
};