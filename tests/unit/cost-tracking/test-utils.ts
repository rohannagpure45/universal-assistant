/**
 * Test utilities for cost tracking system
 * Provides comprehensive mocks, factories, and test helpers
 */

import { APICall, CostBudget, CostEvent, TokenUsage, CostAnalytics, UsageMetrics, CostEstimation, BatchCostAnalysis, CostTrackingConfig } from '@/types/cost';
import { AIModel } from '@/types';
import { CostTracker } from '@/lib/costTracking';

// Mock data factories
export const createMockTokenUsage = (overrides?: Partial<TokenUsage>): TokenUsage => ({
  inputTokens: 1000,
  outputTokens: 500,
  totalTokens: 1500,
  ...overrides,
});

export const createMockAPICall = (overrides?: Partial<APICall>): APICall => ({
  id: `call-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  timestamp: new Date(),
  model: 'gpt-4o-mini',
  service: 'openai',
  operation: 'chat_completion',
  tokenUsage: createMockTokenUsage(),
  latency: 250,
  cost: 0.0015,
  requestSize: 1024,
  responseSize: 512,
  metadata: {
    meetingId: 'meeting-123',
    userId: 'user-456',
    contextLength: 100,
    temperature: 0.7,
    maxTokens: 2000,
  },
  ...overrides,
});

export const createMockCostBudget = (overrides?: Partial<CostBudget>): CostBudget => ({
  id: `budget-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  name: 'Test Budget',
  userId: 'user-123',
  limit: 100.0,
  period: 'monthly',
  currentUsage: 25.0,
  alerts: {
    thresholds: [50, 80, 95],
    notified: [],
  },
  resetDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCostEvent = (overrides?: Partial<CostEvent>): CostEvent => ({
  type: 'api_call',
  timestamp: new Date(),
  data: createMockAPICall(),
  severity: 'info',
  message: 'Mock cost event',
  ...overrides,
});

export const createMockUsageMetrics = (overrides?: Partial<UsageMetrics>): UsageMetrics => ({
  totalAPICalls: 10,
  totalTokens: createMockTokenUsage({ inputTokens: 10000, outputTokens: 5000, totalTokens: 15000 }),
  totalCost: 0.015,
  averageLatency: 250,
  averageCostPerCall: 0.0015,
  costByModel: {
    'gpt-4o': { inputCost: 0.02, outputCost: 0.01, totalCost: 0.03, currency: 'USD' },
    'gpt-4o-mini': { inputCost: 0.01, outputCost: 0.005, totalCost: 0.015, currency: 'USD' },
    'claude-3-5-sonnet': { inputCost: 0.015, outputCost: 0.0075, totalCost: 0.0225, currency: 'USD' },
    'claude-3-5-opus': { inputCost: 0.03, outputCost: 0.015, totalCost: 0.045, currency: 'USD' },
    'claude-3-7-sonnet': { inputCost: 0.025, outputCost: 0.0125, totalCost: 0.0375, currency: 'USD' },
    'claude-3-7-opus': { inputCost: 0.05, outputCost: 0.025, totalCost: 0.075, currency: 'USD' },
    'gpt-5-mini': { inputCost: 0.008, outputCost: 0.004, totalCost: 0.012, currency: 'USD' },
    'gpt-5-nano': { inputCost: 0.005, outputCost: 0.0025, totalCost: 0.0075, currency: 'USD' },
    'gpt-5': { inputCost: 0.06, outputCost: 0.03, totalCost: 0.09, currency: 'USD' },
    'gpt-4.1-nano': { inputCost: 0.006, outputCost: 0.003, totalCost: 0.009, currency: 'USD' },
  },
  costByService: {
    openai: { inputCost: 0.01, outputCost: 0.005, totalCost: 0.015, currency: 'USD' },
  },
  costByOperation: {
    chat_completion: { inputCost: 0.01, outputCost: 0.005, totalCost: 0.015, currency: 'USD' },
  },
  ...overrides,
});

export const createMockCostAnalytics = (overrides?: Partial<CostAnalytics>): CostAnalytics => ({
  totalSpend: 100.50,
  dailyUsage: [],
  weeklyUsage: [],
  monthlyUsage: [],
  topModels: [
    {
      model: 'gpt-4o-mini',
      usage: createMockUsageMetrics(),
      percentage: 75.5,
    },
  ],
  costTrends: {
    direction: 'up',
    percentage: 15.2,
    period: 'week',
  },
  projectedMonthlySpend: 300.0,
  efficiency: {
    averageTokensPerDollar: 15000,
    mostEfficientModel: 'gpt-4o-mini',
    leastEfficientModel: 'gpt-4o',
  },
  ...overrides,
});

export const createMockCostEstimation = (overrides?: Partial<CostEstimation>): CostEstimation => ({
  estimatedTokens: 1500,
  estimatedCost: 0.0015,
  confidence: 0.85,
  factors: {
    promptLength: 200,
    contextSize: 2,
    modelComplexity: 0.001,
    historicalAverage: 0.0012,
  },
  ...overrides,
});

export const createMockBatchCostAnalysis = (overrides?: Partial<BatchCostAnalysis>): BatchCostAnalysis => ({
  requests: [createMockAPICall(), createMockAPICall()],
  totalCost: 0.003,
  averageCost: 0.0015,
  costDistribution: {
    min: 0.001,
    max: 0.002,
    median: 0.0015,
    p95: 0.0019,
  },
  recommendations: {
    suggestedModel: 'gpt-4o-mini',
    potentialSavings: 0.0005,
    optimizationTips: [
      'Use smaller models for simple tasks',
      'Implement prompt caching',
      'Batch similar requests',
    ],
  },
  ...overrides,
});

export const createMockCostConfig = (overrides?: Partial<CostTrackingConfig>): CostTrackingConfig => ({
  enabled: true,
  trackingLevel: 'detailed',
  retentionDays: 90,
  budgetAlerts: true,
  realTimeTracking: true,
  aggregationInterval: 5,
  exportFormat: 'json',
  ...overrides,
});

// Mock collections for testing
export const createMockAPICallCollection = (count: number = 10): APICall[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockAPICall({
      id: `call-${index}`,
      timestamp: new Date(Date.now() - (count - index) * 60000), // Spread over time
      cost: 0.001 + (index * 0.0005), // Varying costs
      model: index % 2 === 0 ? 'gpt-4o-mini' : 'gpt-4o' as AIModel,
      service: index % 3 === 0 ? 'anthropic' : 'openai',
    })
  );
};

export const createMockBudgetCollection = (count: number = 3): CostBudget[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockCostBudget({
      id: `budget-${index}`,
      name: `Test Budget ${index + 1}`,
      limit: 50 + (index * 25),
      currentUsage: 10 + (index * 15),
      period: ['daily', 'weekly', 'monthly'][index % 3] as any,
    })
  );
};

// Test helpers
export const waitForAsync = async (fn: () => Promise<void>, timeout: number = 5000): Promise<void> => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await fn();
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  throw new Error(`Async operation timed out after ${timeout}ms`);
};

export const expectWithinRange = (actual: number, expected: number, tolerance: number = 0.001): void => {
  expect(actual).toBeGreaterThanOrEqual(expected - tolerance);
  expect(actual).toBeLessThanOrEqual(expected + tolerance);
};

export const measurePerformance = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

// Mock implementations
export const createMockCostTracker = (): Partial<CostTracker> => ({
  trackAPICall: jest.fn().mockResolvedValue(createMockAPICall()),
  estimateCost: jest.fn().mockReturnValue(createMockCostEstimation()),
  getCostAnalytics: jest.fn().mockReturnValue(createMockCostAnalytics()),
  getUsageMetrics: jest.fn().mockReturnValue(createMockUsageMetrics()),
  createBudget: jest.fn().mockReturnValue(createMockCostBudget()),
  updateBudget: jest.fn().mockReturnValue(createMockCostBudget()),
  getBudgets: jest.fn().mockReturnValue(createMockBudgetCollection()),
  getAPICalls: jest.fn().mockReturnValue(createMockAPICallCollection()),
  getEvents: jest.fn().mockReturnValue([createMockCostEvent()]),
  analyzeBatch: jest.fn().mockReturnValue(createMockBatchCostAnalysis()),
  exportData: jest.fn().mockReturnValue('{"mock": "data"}'),
  importData: jest.fn(),
  clearCaches: jest.fn(),
  getCacheStats: jest.fn().mockReturnValue({ size: 5, entries: ['key1', 'key2'] }),
});

// Performance testing utilities
export const createPerformanceTestSuite = () => {
  const measurements: Array<{ name: string; duration: number }> = [];
  
  const measure = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const { result, duration } = await measurePerformance(fn);
    measurements.push({ name, duration });
    return result;
  };
  
  const getReport = () => ({
    measurements: [...measurements],
    averages: measurements.reduce((acc, m) => {
      if (!acc[m.name]) acc[m.name] = [];
      acc[m.name].push(m.duration);
      return acc;
    }, {} as Record<string, number[]>),
    getTotalTime: () => measurements.reduce((sum, m) => sum + m.duration, 0),
    getAverageTime: (name: string) => {
      const times = measurements.filter(m => m.name === name).map(m => m.duration);
      return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    },
  });
  
  const clear = () => measurements.length = 0;
  
  return { measure, getReport, clear };
};

// Memory testing utilities
export const createMemoryTestSuite = () => {
  const snapshots: Array<{ name: string; heapUsed: number; heapTotal: number }> = [];
  
  const snapshot = (name: string) => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      snapshots.push({
        name,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      });
    }
  };
  
  const getReport = () => ({
    snapshots: [...snapshots],
    getMemoryDiff: (name1: string, name2: string) => {
      const snap1 = snapshots.find(s => s.name === name1);
      const snap2 = snapshots.find(s => s.name === name2);
      if (!snap1 || !snap2) return null;
      
      return {
        heapUsedDiff: snap2.heapUsed - snap1.heapUsed,
        heapTotalDiff: snap2.heapTotal - snap1.heapTotal,
      };
    },
  });
  
  const clear = () => snapshots.length = 0;
  
  return { snapshot, getReport, clear };
};

// Error simulation utilities
export const createErrorSimulator = () => {
  const simulateNetworkError = () => {
    throw new Error('Network request failed');
  };
  
  const simulateValidationError = (message: string = 'Validation failed') => {
    throw new Error(message);
  };
  
  const simulateTimeoutError = () => {
    throw new Error('Request timeout');
  };
  
  const simulateBudgetExceededError = (budgetName: string) => {
    throw new Error(`Budget "${budgetName}" exceeded`);
  };
  
  return {
    simulateNetworkError,
    simulateValidationError,
    simulateTimeoutError,
    simulateBudgetExceededError,
  };
};

// Cache testing utilities
export const createCacheTestSuite = () => {
  const cacheHits: string[] = [];
  const cacheMisses: string[] = [];
  
  const recordHit = (key: string) => cacheHits.push(key);
  const recordMiss = (key: string) => cacheMisses.push(key);
  
  const getStats = () => ({
    hits: cacheHits.length,
    misses: cacheMisses.length,
    hitRate: cacheHits.length > 0 ? cacheHits.length / (cacheHits.length + cacheMisses.length) : 0,
    missRate: cacheMisses.length > 0 ? cacheMisses.length / (cacheHits.length + cacheMisses.length) : 0,
  });
  
  const clear = () => {
    cacheHits.length = 0;
    cacheMisses.length = 0;
  };
  
  return { recordHit, recordMiss, getStats, clear };
};

// Data validation utilities
export const validateAPICall = (call: APICall): string[] => {
  const errors: string[] = [];
  
  if (!call.id) errors.push('Missing id');
  if (!call.timestamp) errors.push('Missing timestamp');
  if (!call.model) errors.push('Missing model');
  if (!call.service) errors.push('Missing service');
  if (!call.operation) errors.push('Missing operation');
  if (call.cost < 0) errors.push('Cost cannot be negative');
  if (call.latency < 0) errors.push('Latency cannot be negative');
  if (!call.tokenUsage) errors.push('Missing token usage');
  if (call.tokenUsage && call.tokenUsage.totalTokens !== call.tokenUsage.inputTokens + call.tokenUsage.outputTokens) {
    errors.push('Token usage totals do not match');
  }
  
  return errors;
};

export const validateCostBudget = (budget: CostBudget): string[] => {
  const errors: string[] = [];
  
  if (!budget.id) errors.push('Missing id');
  if (!budget.name || budget.name.length < 3) errors.push('Name must be at least 3 characters');
  if (!budget.userId) errors.push('Missing userId');
  if (budget.limit <= 0) errors.push('Limit must be greater than 0');
  if (budget.currentUsage < 0) errors.push('Current usage cannot be negative');
  if (!budget.period) errors.push('Missing period');
  if (!budget.alerts || !budget.alerts.thresholds) errors.push('Missing alert configuration');
  
  return errors;
};

// Test data generators for stress testing
export const generateLargeAPICallDataset = (size: number): APICall[] => {
  const calls: APICall[] = [];
  const models: AIModel[] = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet', 'claude-3-5-haiku'];
  const services = ['openai', 'anthropic'];
  const operations = ['chat_completion', 'embeddings'];
  
  for (let i = 0; i < size; i++) {
    calls.push(createMockAPICall({
      id: `stress-call-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      model: models[Math.floor(Math.random() * models.length)],
      service: services[Math.floor(Math.random() * services.length)] as any,
      operation: operations[Math.floor(Math.random() * operations.length)] as any,
      cost: Math.random() * 0.01,
      latency: Math.random() * 1000,
      tokenUsage: createMockTokenUsage({
        inputTokens: Math.floor(Math.random() * 4000),
        outputTokens: Math.floor(Math.random() * 2000),
      }),
    }));
  }
  
  return calls;
};

export const generateConcurrentOperations = (count: number) => {
  return Array.from({ length: count }, (_, index) => 
    () => createMockAPICall({ id: `concurrent-${index}` })
  );
};

// Export all utilities
export default {
  // Factories
  createMockTokenUsage,
  createMockAPICall,
  createMockCostBudget,
  createMockCostEvent,
  createMockUsageMetrics,
  createMockCostAnalytics,
  createMockCostEstimation,
  createMockBatchCostAnalysis,
  createMockCostConfig,
  createMockAPICallCollection,
  createMockBudgetCollection,
  createMockCostTracker,
  
  // Test utilities
  waitForAsync,
  expectWithinRange,
  measurePerformance,
  
  // Test suites
  createPerformanceTestSuite,
  createMemoryTestSuite,
  createErrorSimulator,
  createCacheTestSuite,
  
  // Validation
  validateAPICall,
  validateCostBudget,
  
  // Data generation
  generateLargeAPICallDataset,
  generateConcurrentOperations,
};