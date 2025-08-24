/**
 * Cost Store Validation Module
 * Handles all validation logic for cost tracking operations
 */

import { CostBudget, APICall, CostPeriod } from '@/types/cost';
import { AIModel } from '@/types';

// Validation error messages
export const VALIDATION_ERRORS = {
  INVALID_BUDGET_LIMIT: 'Budget limit must be greater than 0',
  INVALID_BUDGET_NAME: 'Budget name must be at least 3 characters',
  INVALID_PERIOD: 'Invalid period specified',
  INVALID_MODEL: 'Invalid AI model specified',
  INVALID_COST: 'Cost must be a positive number',
  BUDGET_NOT_FOUND: 'Budget not found',
  TRACKER_UNAVAILABLE: 'Cost tracker is not available',
} as const;

/**
 * Validate budget data
 */
export const validateBudget = (budget: Partial<CostBudget>): string[] => {
  const errors: string[] = [];
  
  if (budget.name && budget.name.length < 3) {
    errors.push(VALIDATION_ERRORS.INVALID_BUDGET_NAME);
  }
  
  if (budget.limit !== undefined && budget.limit <= 0) {
    errors.push(VALIDATION_ERRORS.INVALID_BUDGET_LIMIT);
  }
  
  // Skip threshold validation as it's now part of budget.alerts.thresholds array
  // Individual thresholds are validated within the alerts structure
  
  return errors;
};

/**
 * Validate API call data
 */
export const validateAPICall = (call: Partial<APICall>): string[] => {
  const errors: string[] = [];
  
  if (call.cost !== undefined && call.cost < 0) {
    errors.push(VALIDATION_ERRORS.INVALID_COST);
  }
  
  if (call.model && !isValidAIModel(call.model)) {
    errors.push(VALIDATION_ERRORS.INVALID_MODEL);
  }
  
  if (call.latency !== undefined && call.latency < 0) {
    errors.push('Latency must be a positive number');
  }
  
  return errors;
};

/**
 * Validate cost period
 */
export const validatePeriod = (period: string): boolean => {
  const validPeriods: CostPeriod[] = ['hour', 'day', 'week', 'month', 'year'];
  return validPeriods.includes(period as CostPeriod);
};

/**
 * Check if AI model is valid
 */
const isValidAIModel = (model: string): boolean => {
  const validModels: AIModel[] = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'claude-3-5-sonnet',
    'claude-3-5-opus',
    'claude-3-7-sonnet',
    'claude-3-7-opus',
    'claude-3-haiku',
    'claude-3-opus'
  ];
  return validModels.includes(model as AIModel);
};

/**
 * Error boundary wrapper for store actions
 */
export const withErrorBoundary = <T extends any[], R>(
  action: (...args: T) => R,
  errorMessage: string
) => {
  return (...args: T): R => {
    try {
      return action(...args);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
};