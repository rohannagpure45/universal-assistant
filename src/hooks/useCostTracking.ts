'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { 
  useCostStore,
  useCostAnalytics,
  useCostMetrics,
  useCostBudgets,
  useCostConfig,
  useCostLoading,
  useCostError,
  useFilteredAPICalls,
  useCostSummary,
  type CostStore
} from '@/stores/costStore';
import { CostPeriod, CostGranularity, APICall, CostEstimation } from '@/types/cost';
import { AIModel } from '@/types';

// Hook for comprehensive cost tracking functionality
export const useCostTracking = () => {
  const store = useCostStore();
  
  // Selectors for performance
  const analytics = useCostAnalytics();
  const metrics = useCostMetrics();
  const budgets = useCostBudgets();
  const config = useCostConfig();
  const loading = useCostLoading();
  const error = useCostError();
  const filteredCalls = useFilteredAPICalls();
  const summary = useCostSummary();

  // Store actions
  const {
    trackAPICall,
    estimateCost,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetStatus,
    refreshAnalytics,
    getUsageForPeriod,
    analyzeBatch,
    exportData,
    importData,
    updateConfig,
    resetConfig,
    setSelectedPeriod,
    setSelectedGranularity,
    setFilterModel,
    setFilterService,
    clearFilters,
    clearData,
    subscribeToEvents,
    clearEvents,
    startTracking,
    stopTracking,
    resetError,
    refresh,
    selectedPeriod,
    selectedGranularity,
    filterModel,
    filterService,
  } = store;

  // Initialize and refresh data on mount
  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  // Real-time tracking subscription
  useEffect(() => {
    if (!config.realTimeTracking) return;

    const unsubscribe = subscribeToEvents((event) => {
      console.log('Cost tracking event:', event);
      
      // Handle budget alerts
      if (event.type === 'budget_alert' && event.severity === 'error') {
        // Could integrate with notification system here
        console.warn('Budget alert:', event.message);
      }
    });

    return unsubscribe;
  }, [config.realTimeTracking, subscribeToEvents]);

  // Memoized calculations for performance
  const costTrends = useMemo(() => {
    if (!analytics?.costTrends) return null;
    
    return {
      ...analytics.costTrends,
      formattedPercentage: `${analytics.costTrends.percentage.toFixed(1)}%`,
      icon: analytics.costTrends.direction === 'up' ? '📈' : 
            analytics.costTrends.direction === 'down' ? '📉' : '➡️'
    };
  }, [analytics?.costTrends]);

  const efficiency = useMemo(() => {
    if (!analytics?.efficiency) return null;
    
    return {
      ...analytics.efficiency,
      formattedTokensPerDollar: Math.round(analytics.efficiency.averageTokensPerDollar).toLocaleString(),
      efficiencyGrade: analytics.efficiency.averageTokensPerDollar > 10000 ? 'A' :
                      analytics.efficiency.averageTokensPerDollar > 5000 ? 'B' :
                      analytics.efficiency.averageTokensPerDollar > 2000 ? 'C' : 'D'
    };
  }, [analytics?.efficiency]);

  const budgetAlerts = useMemo(() => {
    if (!budgets.length) return [];
    
    return budgets
      .map(budget => {
        const status = getBudgetStatus(budget.id);
        return status ? { budget, status } : null;
      })
      .filter(Boolean)
      .filter(item => item!.status.status !== 'safe')
      .sort((a, b) => {
        const severityOrder = { danger: 3, warning: 2, safe: 1 };
        return severityOrder[b!.status.status] - severityOrder[a!.status.status];
      });
  }, [budgets, getBudgetStatus]);

  // Enhanced tracking function with validation and error handling
  const trackAPICallEnhanced = useCallback(async (
    call: Omit<APICall, 'id' | 'timestamp'>,
    options?: {
      skipBudgetCheck?: boolean;
      estimateFirst?: boolean;
    }
  ) => {
    try {
      if (options?.estimateFirst && call.model) {
        const estimation = estimateCost('', call.model);
        console.log('Cost estimation:', estimation);
      }

      const trackedCall = await trackAPICall(call);
      
      if (!options?.skipBudgetCheck) {
        // Check if any budgets were exceeded
        const alerts = budgetAlerts;
        if (alerts.length > 0) {
          console.warn(`Budget alerts triggered: ${alerts.length}`);
        }
      }

      return trackedCall;
    } catch (error) {
      console.error('Failed to track API call:', error);
      throw error;
    }
  }, [trackAPICall, estimateCost, budgetAlerts]);

  // Enhanced cost estimation with historical context
  const estimateCostEnhanced = useCallback((
    prompt: string,
    model: AIModel,
    context?: string[],
    options?: {
      includeHistorical?: boolean;
      adjustForComplexity?: boolean;
    }
  ): CostEstimation & { historicalAverage?: number; complexityFactor?: number } => {
    const baseEstimation = estimateCost(prompt, model, context);
    
    let historicalAverage: number | undefined;
    let complexityFactor: number | undefined;
    
    if (options?.includeHistorical) {
      const historicalCalls = filteredCalls.filter(call => call.model === model);
      if (historicalCalls.length > 0) {
        historicalAverage = historicalCalls.reduce((acc, call) => acc + call.cost, 0) / historicalCalls.length;
      }
    }
    
    if (options?.adjustForComplexity) {
      // Simple complexity heuristic based on prompt characteristics
      const hasCode = /```|function|class|import/.test(prompt);
      const hasQuestions = /\?/.test(prompt);
      const isLong = prompt.length > 1000;
      
      complexityFactor = 1.0;
      if (hasCode) complexityFactor += 0.2;
      if (hasQuestions) complexityFactor += 0.1;
      if (isLong) complexityFactor += 0.15;
    }
    
    return {
      ...baseEstimation,
      historicalAverage,
      complexityFactor,
      ...(complexityFactor && {
        estimatedCost: baseEstimation.estimatedCost * complexityFactor
      })
    };
  }, [estimateCost, filteredCalls]);

  // Batch operations for multiple API calls
  const trackBatch = useCallback(async (calls: Array<Omit<APICall, 'id' | 'timestamp'>>) => {
    const results = [];
    for (const call of calls) {
      try {
        const result = await trackAPICallEnhanced(call, { skipBudgetCheck: true });
        results.push(result);
      } catch (error) {
        console.error('Failed to track call in batch:', error);
      }
    }
    
    // Refresh analytics after batch
    await refreshAnalytics();
    
    return results;
  }, [trackAPICallEnhanced, refreshAnalytics]);

  // Budget management helpers
  const createBudgetWithDefaults = useCallback((
    budget: {
      name: string;
      userId: string;
      limit: number;
      period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    }
  ) => {
    return createBudget({
      ...budget,
      alerts: {
        thresholds: [50, 80, 95],
        notified: []
      },
      resetDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }, [createBudget]);

  // Data export with formatting options
  const exportDataEnhanced = useCallback((
    format: 'json' | 'csv',
    options?: {
      includeMetadata?: boolean;
      dateRange?: { start: Date; end: Date };
      includeCharts?: boolean;
    }
  ) => {
    try {
      let data = exportData();
      
      if (options?.includeMetadata && format === 'json') {
        const metadata = {
          exportedAt: new Date().toISOString(),
          totalCalls: summary.totalCalls,
          totalCost: summary.totalCost,
          dateRange: options.dateRange,
          filters: {
            period: selectedPeriod,
            granularity: selectedGranularity,
            model: filterModel,
            service: filterService
          },
          config
        };
        
        const parsed = JSON.parse(data);
        data = JSON.stringify({ ...parsed, metadata }, null, 2);
      }
      
      return data;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, [exportData, summary, selectedPeriod, selectedGranularity, filterModel, filterService, config]);

  // Data refresh with error handling
  const refreshData = useCallback(async () => {
    try {
      resetError();
      await refresh();
    } catch (error) {
      console.error('Failed to refresh cost data:', error);
    }
  }, [refresh, resetError]);

  // Configuration management
  const updateTrackingConfig = useCallback((updates: Partial<typeof config>) => {
    updateConfig(updates);
    
    // If tracking was enabled/disabled, update tracking state
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        startTracking();
      } else {
        stopTracking();
      }
    }
  }, [updateConfig, startTracking, stopTracking]);

  // Cleanup old data
  const cleanupOldData = useCallback((days?: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (days || config.retentionDays));
    clearData(cutoffDate);
  }, [clearData, config.retentionDays]);

  return {
    // Data
    analytics,
    metrics,
    budgets,
    config,
    loading,
    error,
    filteredCalls,
    summary,
    
    // Enhanced computed data
    costTrends,
    efficiency,
    budgetAlerts,
    
    // State
    selectedPeriod,
    selectedGranularity,
    filterModel,
    filterService,
    
    // Core tracking actions
    trackAPICall: trackAPICallEnhanced,
    estimateCost: estimateCostEnhanced,
    trackBatch,
    
    // Budget management
    createBudget: createBudgetWithDefaults,
    updateBudget,
    deleteBudget,
    getBudgetStatus,
    
    // Analytics
    refreshAnalytics,
    getUsageForPeriod,
    analyzeBatch,
    
    // Data management
    exportData: exportDataEnhanced,
    importData,
    clearData,
    cleanupOldData,
    refreshData,
    
    // Configuration
    updateConfig: updateTrackingConfig,
    resetConfig,
    
    // Filters
    setSelectedPeriod,
    setSelectedGranularity,
    setFilterModel,
    setFilterService,
    clearFilters,
    
    // Events
    subscribeToEvents,
    clearEvents,
    
    // Control
    startTracking,
    stopTracking,
    resetError,
    
    // Utility
    isTracking: summary.isTracking,
    hasData: summary.totalCalls > 0,
    lastUpdated: summary.lastUpdated
  };
};

export default useCostTracking;