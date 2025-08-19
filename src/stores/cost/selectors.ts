/**
 * Cost Store Selectors Module
 * Computed values and data selectors for the cost store
 */

import { CostStoreState } from './types';
import { CostPeriod, CostAnalytics, UsageMetrics } from '@/types/cost';
import { createMemoizedSelectors } from './performance';

const memoizedSelectors = createMemoizedSelectors();

/**
 * Get filtered API calls based on current filters
 */
export const selectFilteredAPICalls = (state: CostStoreState) => {
  return memoizedSelectors.getFilteredAPICalls(
    state.apiCalls,
    state.filterModel
  );
};

/**
 * Get active budgets
 */
export const selectActiveBudgets = (state: CostStoreState) => {
  return memoizedSelectors.getActiveBudgets(state.budgets);
};

/**
 * Get total cost for the selected period
 */
export const selectTotalCost = (state: CostStoreState) => {
  return memoizedSelectors.getTotalCost(state.usageMetrics);
};

/**
 * Get cost by model for the selected period
 */
export const selectCostByModel = (state: CostStoreState) => {
  if (!state.usageMetrics) return {};
  return state.usageMetrics.costByModel;
};

/**
 * Get budget utilization
 */
export const selectBudgetUtilization = (state: CostStoreState) => {
  return state.budgets.map(budget => {
    const percentage = (budget.currentUsage / budget.limit) * 100;
    const remaining = budget.limit - budget.currentUsage;
    
    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (percentage >= 95) status = 'danger';
    else if (percentage >= (budget.alerts.thresholds[1] || 80)) status = 'warning';
    
    return {
      ...budget,
      percentage,
      remaining,
      status
    };
  });
};

/**
 * Get cost trend for the selected period
 */
export const selectCostTrend = (state: CostStoreState) => {
  const { selectedPeriod, apiCalls } = state;
  const now = Date.now();
  
  // Define time ranges based on period
  const ranges = getCostPeriodRanges(selectedPeriod, now);
  
  return ranges.map(range => {
    const callsInRange = apiCalls.filter(call => {
      const timestamp = call.timestamp.getTime();
      return timestamp >= range.start && timestamp < range.end;
    });
    
    const totalCost = callsInRange.reduce((sum, call) => sum + call.cost, 0);
    
    return {
      period: range.label,
      cost: totalCost,
      calls: callsInRange.length
    };
  });
};

/**
 * Get performance metrics
 */
export const selectPerformanceMetrics = (state: CostStoreState) => {
  if (!state.usageMetrics) return null;
  
  return {
    averageLatency: state.usageMetrics.averageLatency,
    throughput: state.usageMetrics.totalAPICalls / 60, // calls per minute estimate
    errorRate: 0, // Would need to be calculated from actual error data
    successRate: 1 // Would need to be calculated from actual success data
  };
};

/**
 * Get cost alerts based on budget thresholds
 */
export const selectCostAlerts = (state: CostStoreState) => {
  const alerts: Array<{
    type: 'warning' | 'danger';
    message: string;
    budgetId: string;
  }> = [];
  
  state.budgets.forEach(budget => {
    const percentage = (budget.currentUsage / budget.limit) * 100;
    
    if (percentage >= 95) {
      alerts.push({
        type: 'danger',
        message: `Budget "${budget.name}" is at ${percentage.toFixed(1)}% capacity`,
        budgetId: budget.id
      });
    } else if (percentage >= (budget.alerts.thresholds[1] || 80)) {
      alerts.push({
        type: 'warning',
        message: `Budget "${budget.name}" has exceeded ${budget.alerts.thresholds[1] || 80}% threshold`,
        budgetId: budget.id
      });
    }
  });
  
  return alerts;
};

/**
 * Get optimization suggestions
 */
export const selectOptimizationSuggestions = (state: CostStoreState) => {
  const suggestions: string[] = [];
  
  if (state.usageMetrics) {
    const { averageCostPerCall, totalAPICalls } = state.usageMetrics;
    
    if (averageCostPerCall > 0.01) {
      suggestions.push('Consider using cheaper models for simple tasks');
    }
    
    if (totalAPICalls > 1000) {
      suggestions.push('Implement response caching to reduce API calls');
    }
    
    // Check for expensive models
    const expensiveModels = Object.entries(state.usageMetrics.costByModel)
      .filter(([_, cost]) => cost.totalCost > state.usageMetrics!.totalCost * 0.5);
    
    if (expensiveModels.length > 0) {
      suggestions.push(`Model ${expensiveModels[0][0]} accounts for over 50% of costs`);
    }
  }
  
  return suggestions;
};

/**
 * Helper function to get cost period ranges
 */
function getCostPeriodRanges(period: CostPeriod, now: number) {
  const ranges = [];
  const msPerHour = 60 * 60 * 1000;
  const msPerDay = 24 * msPerHour;
  
  switch (period) {
    case 'hour':
      for (let i = 23; i >= 0; i--) {
        ranges.push({
          start: now - (i + 1) * msPerHour,
          end: now - i * msPerHour,
          label: `${i}h ago`
        });
      }
      break;
      
    case 'day':
      for (let i = 6; i >= 0; i--) {
        ranges.push({
          start: now - (i + 1) * msPerDay,
          end: now - i * msPerDay,
          label: i === 0 ? 'Today' : `${i}d ago`
        });
      }
      break;
      
    case 'week':
      for (let i = 3; i >= 0; i--) {
        ranges.push({
          start: now - (i + 1) * 7 * msPerDay,
          end: now - i * 7 * msPerDay,
          label: `Week ${i + 1}`
        });
      }
      break;
      
    case 'month':
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        ranges.push({
          start: date.getTime(),
          end: i === 0 ? now : new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime(),
          label: date.toLocaleString('default', { month: 'short' })
        });
      }
      break;
      
    case 'year':
      for (let i = 4; i >= 0; i--) {
        const date = new Date(now);
        date.setFullYear(date.getFullYear() - i);
        ranges.push({
          start: date.getTime(),
          end: i === 0 ? now : new Date(date.getFullYear() + 1, 0, 1).getTime(),
          label: date.getFullYear().toString()
        });
      }
      break;
  }
  
  return ranges;
}