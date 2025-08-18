import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
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

// Cost store state interface
export interface CostState {
  // Core tracking data
  tracker: CostTracker;
  apiCalls: APICall[];
  budgets: CostBudget[];
  events: CostEvent[];
  
  // Analytics and metrics
  currentAnalytics: CostAnalytics | null;
  usageMetrics: UsageMetrics | null;
  
  // UI state
  isLoading: boolean;
  isTracking: boolean;
  lastUpdated: Date | null;
  
  // Configuration
  config: CostTrackingConfig;
  
  // Filters and views
  selectedPeriod: CostPeriod;
  selectedGranularity: CostGranularity;
  filterModel: AIModel | 'all';
  filterService: string | 'all';
  
  // Errors
  error: string | null;
}

// Cost store actions interface
export interface CostActions {
  // Core tracking actions
  trackAPICall: (call: Omit<APICall, 'id' | 'cost'>) => Promise<APICall>;
  estimateCost: (prompt: string, model: AIModel, context?: string[]) => CostEstimation;
  
  // Budget management
  createBudget: (budget: Omit<CostBudget, 'id' | 'currentUsage' | 'createdAt' | 'updatedAt'>) => CostBudget;
  updateBudget: (budgetId: string, updates: Partial<CostBudget>) => boolean;
  deleteBudget: (budgetId: string) => boolean;
  getBudgetStatus: (budgetId: string) => { percentage: number; remaining: number; status: 'safe' | 'warning' | 'danger' } | null;
  
  // Analytics and reporting
  refreshAnalytics: () => Promise<void>;
  getUsageForPeriod: (start: Date, end: Date) => UsageMetrics;
  analyzeBatch: (calls: APICall[]) => BatchCostAnalysis;
  exportData: (format: 'json' | 'csv') => string;
  
  // Configuration
  updateConfig: (config: Partial<CostTrackingConfig>) => void;
  resetConfig: () => void;
  
  // Filters and views
  setSelectedPeriod: (period: CostPeriod) => void;
  setSelectedGranularity: (granularity: CostGranularity) => void;
  setFilterModel: (model: AIModel | 'all') => void;
  setFilterService: (service: string | 'all') => void;
  clearFilters: () => void;
  
  // Data management
  importData: (data: string) => Promise<boolean>;
  clearData: (olderThan?: Date) => void;
  
  // Event handling
  subscribeToEvents: (callback: (event: CostEvent) => void) => () => void;
  clearEvents: () => void;
  
  // Utility actions
  startTracking: () => void;
  stopTracking: () => void;
  resetError: () => void;
  refresh: () => Promise<void>;
}

// Default configuration
const defaultConfig: CostTrackingConfig = {
  enabled: true,
  trackingLevel: 'detailed',
  retentionDays: 90,
  budgetAlerts: true,
  realTimeTracking: true,
  aggregationInterval: 5, // 5 minutes
  exportFormat: 'json',
};

// Create the cost store
export const useCostStore = create<CostState & CostActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          tracker: new CostTracker(90),
          apiCalls: [],
          budgets: [],
          events: [],
          
          currentAnalytics: null,
          usageMetrics: null,
          
          isLoading: false,
          isTracking: true,
          lastUpdated: null,
          
          config: defaultConfig,
          
          selectedPeriod: 'day',
          selectedGranularity: 'global',
          filterModel: 'all',
          filterService: 'all',
          
          error: null,

          // Core tracking actions
          trackAPICall: async (call) => {
            try {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });

              const trackedCall = await get().tracker.trackAPICall(call);
              
              set((state) => {
                state.apiCalls = state.tracker.getAPICalls();
                state.events = state.tracker.getEvents();
                state.lastUpdated = new Date();
                state.isLoading = false;
              });

              // Refresh analytics if tracking is enabled
              if (get().config.realTimeTracking) {
                get().refreshAnalytics();
              }

              return trackedCall;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to track API call';
                state.isLoading = false;
              });
              throw error;
            }
          },

          estimateCost: (prompt, model, context) => {
            return get().tracker.estimateCost(prompt, model, context);
          },

          // Budget management
          createBudget: (budget) => {
            const newBudget = get().tracker.createBudget(budget);
            
            set((state) => {
              state.budgets = state.tracker.getBudgets();
              state.lastUpdated = new Date();
            });
            
            return newBudget;
          },

          updateBudget: (budgetId, updates) => {
            const updated = get().tracker.updateBudget(budgetId, updates);
            
            if (updated) {
              set((state) => {
                state.budgets = state.tracker.getBudgets();
                state.lastUpdated = new Date();
              });
              return true;
            }
            
            return false;
          },

          deleteBudget: (budgetId) => {
            set((state) => {
              const index = state.budgets.findIndex(b => b.id === budgetId);
              if (index !== -1) {
                state.budgets.splice(index, 1);
                state.lastUpdated = new Date();
                return;
              }
            });
            
            return get().budgets.some(b => b.id === budgetId);
          },

          getBudgetStatus: (budgetId) => {
            const budget = get().budgets.find(b => b.id === budgetId);
            if (!budget) return null;

            const percentage = (budget.currentUsage / budget.limit) * 100;
            const remaining = budget.limit - budget.currentUsage;
            
            let status: 'safe' | 'warning' | 'danger' = 'safe';
            if (percentage >= 95) status = 'danger';
            else if (percentage >= 80) status = 'warning';

            return { percentage, remaining, status };
          },

          // Analytics and reporting
          refreshAnalytics: async () => {
            try {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });

              const analytics = get().tracker.getCostAnalytics();
              const usageMetrics = get().tracker.getUsageMetrics();

              set((state) => {
                state.currentAnalytics = analytics;
                state.usageMetrics = usageMetrics;
                state.lastUpdated = new Date();
                state.isLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to refresh analytics';
                state.isLoading = false;
              });
            }
          },

          getUsageForPeriod: (start, end) => {
            return get().tracker.getUsageMetrics({ start, end });
          },

          analyzeBatch: (calls) => {
            return get().tracker.analyzeBatch(calls);
          },

          exportData: (format) => {
            if (format === 'csv') {
              // Convert to CSV format (simplified)
              const calls = get().apiCalls;
              const headers = ['timestamp', 'model', 'service', 'operation', 'cost', 'inputTokens', 'outputTokens'];
              const rows = calls.map(call => [
                call.timestamp.toISOString(),
                call.model,
                call.service,
                call.operation,
                call.cost.toString(),
                call.tokenUsage.inputTokens.toString(),
                call.tokenUsage.outputTokens.toString(),
              ]);
              
              return [headers, ...rows].map(row => row.join(',')).join('\n');
            }
            
            return get().tracker.exportData();
          },

          // Configuration
          updateConfig: (updates) => {
            set((state) => {
              Object.assign(state.config, updates);
              state.lastUpdated = new Date();
            });
          },

          resetConfig: () => {
            set((state) => {
              state.config = { ...defaultConfig };
              state.lastUpdated = new Date();
            });
          },

          // Filters and views
          setSelectedPeriod: (period) => {
            set((state) => {
              state.selectedPeriod = period;
            });
          },

          setSelectedGranularity: (granularity) => {
            set((state) => {
              state.selectedGranularity = granularity;
            });
          },

          setFilterModel: (model) => {
            set((state) => {
              state.filterModel = model;
            });
          },

          setFilterService: (service) => {
            set((state) => {
              state.filterService = service;
            });
          },

          clearFilters: () => {
            set((state) => {
              state.selectedPeriod = 'day';
              state.selectedGranularity = 'global';
              state.filterModel = 'all';
              state.filterService = 'all';
            });
          },

          // Data management
          importData: async (data) => {
            try {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });

              get().tracker.importData(data);
              
              set((state) => {
                state.apiCalls = state.tracker.getAPICalls();
                state.budgets = state.tracker.getBudgets();
                state.events = state.tracker.getEvents();
                state.lastUpdated = new Date();
                state.isLoading = false;
              });

              // Refresh analytics after import
              await get().refreshAnalytics();
              
              return true;
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to import data';
                state.isLoading = false;
              });
              return false;
            }
          },

          clearData: (olderThan) => {
            set((state) => {
              if (olderThan) {
                state.apiCalls = state.apiCalls.filter(call => call.timestamp >= olderThan);
                state.events = state.events.filter(event => event.timestamp >= olderThan);
              } else {
                state.apiCalls = [];
                state.events = [];
              }
              state.lastUpdated = new Date();
            });
          },

          // Event handling
          subscribeToEvents: (callback) => {
            // In a real implementation, this would set up event listeners
            const interval = setInterval(() => {
              const newEvents = get().events.filter(event => 
                !event.timestamp || event.timestamp > (get().lastUpdated || new Date(0))
              );
              newEvents.forEach(callback);
            }, get().config.aggregationInterval * 60 * 1000);

            return () => clearInterval(interval);
          },

          clearEvents: () => {
            set((state) => {
              state.events = [];
              state.lastUpdated = new Date();
            });
          },

          // Utility actions
          startTracking: () => {
            set((state) => {
              state.isTracking = true;
              state.config.enabled = true;
            });
          },

          stopTracking: () => {
            set((state) => {
              state.isTracking = false;
              state.config.enabled = false;
            });
          },

          resetError: () => {
            set((state) => {
              state.error = null;
            });
          },

          refresh: async () => {
            try {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });

              // Update local state with tracker data
              set((state) => {
                state.apiCalls = state.tracker.getAPICalls();
                state.budgets = state.tracker.getBudgets();
                state.events = state.tracker.getEvents();
              });

              // Refresh analytics
              await get().refreshAnalytics();

              set((state) => {
                state.lastUpdated = new Date();
                state.isLoading = false;
              });
            } catch (error) {
              set((state) => {
                state.error = error instanceof Error ? error.message : 'Failed to refresh data';
                state.isLoading = false;
              });
            }
          },
        }))
      ),
      {
        name: 'cost-store',
        storage: createJSONStorage(() => localStorage),
        // Only persist configuration and budgets, not the large datasets
        partialize: (state) => ({
          config: state.config,
          budgets: state.budgets,
          selectedPeriod: state.selectedPeriod,
          selectedGranularity: state.selectedGranularity,
          filterModel: state.filterModel,
          filterService: state.filterService,
        }),
      }
    ),
    {
      name: 'cost-store',
    }
  )
);

// Selector hooks for better performance
export const useCostAnalytics = () => useCostStore((state) => state.currentAnalytics);
export const useCostMetrics = () => useCostStore((state) => state.usageMetrics);
export const useCostBudgets = () => useCostStore((state) => state.budgets);
export const useCostConfig = () => useCostStore((state) => state.config);
export const useCostLoading = () => useCostStore((state) => state.isLoading);
export const useCostError = () => useCostStore((state) => state.error);

// Computed selectors
export const useFilteredAPICalls = () => 
  useCostStore((state) => {
    let calls = state.apiCalls;
    
    if (state.filterModel !== 'all') {
      calls = calls.filter(call => call.model === state.filterModel);
    }
    
    if (state.filterService !== 'all') {
      calls = calls.filter(call => call.service === state.filterService);
    }
    
    return calls;
  });

export const useCostSummary = () => 
  useCostStore((state) => {
    const totalCalls = state.apiCalls.length;
    const totalCost = state.apiCalls.reduce((acc, call) => acc + call.cost, 0);
    const budgetCount = state.budgets.length;
    const activeBudgets = state.budgets.filter(b => {
      const status = state.getBudgetStatus?.(b.id);
      return status && status.status !== 'safe';
    }).length;
    
    return {
      totalCalls,
      totalCost,
      budgetCount,
      activeBudgets,
      isTracking: state.isTracking,
      lastUpdated: state.lastUpdated,
    };
  });

export type CostStore = CostState & CostActions;