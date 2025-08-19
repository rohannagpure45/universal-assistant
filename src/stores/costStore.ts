/**
 * Cost Store
 * Re-exports the modularized cost store implementation
 * 
 * This file maintains backward compatibility while the actual implementation
 * has been modularized into separate files in the ./cost directory
 */

export { useCostStore } from './cost';
export type { CostStore, CostStoreState, CostStoreActions } from './cost';

// Re-export hooks
export {
  useCostAnalytics,
  useCostMetrics,
  useCostBudgets,
  useCostConfig,
  useCostLoading,
  useCostError,
  useFilteredAPICalls,
  useCostSummary,
  useSelectedPeriod,
  useSelectedGranularity,
  useFilterModel,
  usePerformanceMetrics,
  useCostEvents,
  useCostEstimations,
  useBatchAnalysis,
  useCostState,
  useCostActions
} from './cost';

// Re-export selectors
export {
  selectFilteredAPICalls,
  selectActiveBudgets,
  selectTotalCost,
  selectCostByModel,
  selectBudgetUtilization,
  selectCostTrend,
  selectPerformanceMetrics,
  selectCostAlerts,
  selectOptimizationSuggestions
} from './cost';

// Re-export performance utilities
export {
  PerformanceCache,
  VirtualScrollHelper,
  RequestDeduplicator,
  BatchProcessor
} from './cost';

// Re-export validation utilities
export {
  validateBudget,
  validateAPICall,
  validatePeriod,
  VALIDATION_ERRORS
} from './cost';