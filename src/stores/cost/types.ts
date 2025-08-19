/**
 * Cost Store Types Module
 * Type definitions for the cost store
 */

import { 
  APICall, 
  CostBudget, 
  CostAnalytics, 
  UsageMetrics, 
  CostEvent, 
  CostEstimation,
  BatchCostAnalysis,
  CostTrackingConfig,
  CostPeriod,
  CostGranularity
} from '@/types/cost';
import { AIModel } from '@/types';
import { CostTracker } from '@/lib/costTracking';

/**
 * Performance state for cost tracking
 */
export interface PerformanceState {
  isAnalyticsRefreshing: boolean;
  lastAnalyticsUpdate: number;
  cacheHitRate: number;
  batchQueueSize: number;
  requestDedupeActive: boolean;
}

/**
 * Cost store state interface
 */
export interface CostStoreState {
  // Core data
  apiCalls: APICall[];
  budgets: CostBudget[];
  events: CostEvent[];
  
  // Analytics
  analytics: CostAnalytics | null;
  usageMetrics: UsageMetrics | null;
  estimations: CostEstimation[];
  batchAnalysis: BatchCostAnalysis | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Filters and views
  selectedPeriod: CostPeriod;
  selectedGranularity: CostGranularity;
  filterModel: AIModel | 'all';
  filterDateRange: { start: Date | null; end: Date | null };
  filterService: string | null;
  
  // Configuration
  config: CostTrackingConfig;
  
  // Performance
  performance: PerformanceState;
  
  // Tracking state
  isTracking: boolean;
  
  // Tracker instance
  tracker: CostTracker;
}

/**
 * Cost store actions interface
 */
export interface CostStoreActions {
  // Initialization
  initialize: () => Promise<void>;
  reset: () => void;
  
  // Core tracking actions
  trackAPICall: (call: Omit<APICall, 'id' | 'timestamp'>) => Promise<APICall>;
  batchTrackAPICalls: (calls: Omit<APICall, 'id' | 'timestamp'>[]) => Promise<void>;
  
  // Budget management
  createBudget: (budget: Omit<CostBudget, 'id' | 'currentUsage'>) => CostBudget;
  updateBudget: (budgetId: string, updates: Partial<CostBudget>) => boolean;
  deleteBudget: (budgetId: string) => boolean;
  getBudgetStatus: (budgetId: string) => {
    percentage: number;
    remaining: number;
    status: 'safe' | 'warning' | 'danger';
  } | null;
  checkBudgetAlerts: () => void;
  
  // Analytics
  refreshAnalytics: (force?: boolean) => Promise<void>;
  getAnalytics: (period?: CostPeriod) => CostAnalytics | null;
  getUsageMetrics: () => UsageMetrics | null;
  generateEstimation: (params: {
    model: AIModel;
    estimatedCalls: number;
    period: CostPeriod;
  }) => CostEstimation;
  analyzeBatch: (callIds: string[]) => BatchCostAnalysis | null;
  
  // Event tracking
  recordEvent: (event: Omit<CostEvent, 'id' | 'timestamp'>) => void;
  getEvents: (filter?: { type?: string; severity?: string }) => CostEvent[];
  
  // Filters and views
  setSelectedPeriod: (period: CostPeriod) => void;
  setSelectedGranularity: (granularity: CostGranularity) => void;
  setFilterModel: (model: AIModel | 'all') => void;
  setFilterDateRange: (range: { start: Date | null; end: Date | null }) => void;
  
  // Configuration
  updateConfig: (config: Partial<CostTrackingConfig>) => void;
  
  // Data management
  exportData: () => string;
  importData: (data: string) => Promise<boolean>;
  clearData: (olderThan?: Date) => void;
  
  // Performance
  getPerformanceMetrics: () => PerformanceState;
  clearCache: () => void;
  optimizePerformance: () => void;
  
  // Historical data
  preloadHistoricalData: (period: CostPeriod) => Promise<void>;
  getUsageForPeriod: (period: CostPeriod) => { totalCost: number; callCount: number };
  
  // Additional actions
  estimateCost: (prompt: string, model: AIModel, context?: string[]) => CostEstimation;
  subscribeToEvents: (callback: (event: any) => void) => () => void;
  clearEvents: () => void;
  startTracking: () => void;
  stopTracking: () => void;
  resetError: () => void;
  refresh: () => Promise<void>;
  setFilterService: (service: string | null) => void;
  clearFilters: () => void;
  resetConfig: () => void;
}

/**
 * Combined cost store type
 */
export type CostStore = CostStoreState & CostStoreActions;