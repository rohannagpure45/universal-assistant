import { AIModel } from '@/types';
import { ModelConfig, modelConfigs, getModelConfig, estimateTokens, calculateCost } from '@/config/modelConfigs';
import {
  APICall,
  TokenUsage,
  CostBreakdown,
  UsageMetrics,
  CostBudget,
  TimeBasedUsage,
  CostAnalytics,
  CostEvent,
  CostEstimation,
  BatchCostAnalysis,
  CostPeriod,
  CostGranularity,
  DeepgramCost,
  ElevenLabsCost
} from '@/types/cost';
import { nanoid } from 'nanoid';

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Simple cache implementation
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return item.data as T;
  }
  
  set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

const trackingCache = new SimpleCache();

export class CostTracker {
  private apiCalls: APICall[] = [];
  private budgets: CostBudget[] = [];
  private events: CostEvent[] = [];
  private readonly retentionDays: number = 30;
  
  // Performance optimizations
  private callsIndex = new Map<string, APICall>(); // O(1) lookups
  private budgetsIndex = new Map<string, CostBudget>();
  private modelStatsCache = new Map<AIModel, { totalCost: number; count: number; lastUpdated: number }>();
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
  
  // Debounced cleanup to avoid frequent expensive operations
  private debouncedCleanup = debounce(() => this.cleanup(), 5000);
  
  // Batch operations
  private pendingOperations: (() => void)[] = [];
  private processingBatch = false;

  constructor(retentionDays: number = 30) {
    this.retentionDays = retentionDays;
    this.cleanup();
    
    // Periodic cleanup
    setInterval(() => {
      if (Date.now() - this.lastCleanup > this.cleanupInterval) {
        this.cleanup();
      }
    }, this.cleanupInterval);
  }

  // Core tracking methods
  async trackAPICall(call: Omit<APICall, 'id' | 'cost'>): Promise<APICall> {
    const cost = this.calculateCostFromCall(call);
    const fullCall: APICall = {
      ...call,
      id: nanoid(),
      cost,
    };

    this.apiCalls.push(fullCall);
    
    // Check budget alerts
    await this.checkBudgetAlerts(fullCall);
    
    // Emit cost event
    this.emitEvent({
      type: 'api_call',
      timestamp: new Date(),
      data: fullCall,
      severity: 'info',
      message: `API call tracked: ${call.service}/${call.operation} - $${cost.toFixed(4)}`,
    });

    return fullCall;
  }

  // Cost calculation methods
  calculateCostFromCall(call: Omit<APICall, 'id' | 'cost'>): number {
    switch (call.service) {
      case 'openai':
      case 'anthropic':
        return calculateCost(call.model, call.tokenUsage.inputTokens, call.tokenUsage.outputTokens);
      
      case 'deepgram':
        // Deepgram pricing: $0.0125 per minute
        const audioMinutes = (call.requestSize || 0) / (16000 * 2 * 60); // Assuming 16kHz, 16-bit
        return audioMinutes * 0.0125;
      
      case 'elevenlabs':
        // ElevenLabs pricing: $0.30 per 1K characters
        const characters = call.requestSize || 0;
        return (characters / 1000) * 0.30;
      
      default:
        return 0;
    }
  }

  estimateCost(prompt: string, model: AIModel, context?: string[]): CostEstimation {
    const config = getModelConfig(model);
    const fullPrompt = context ? [prompt, ...context].join('\n') : prompt;
    const estimatedInputTokens = estimateTokens(fullPrompt);
    
    // Estimate output tokens based on historical data or defaults
    const estimatedOutputTokens = Math.min(
      estimatedInputTokens * 0.5, // Rough heuristic
      config.maxTokens * 0.8
    );
    
    const estimatedCost = calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
    
    return {
      estimatedTokens: estimatedInputTokens + estimatedOutputTokens,
      estimatedCost,
      confidence: 0.7, // Medium confidence for estimates
      factors: {
        promptLength: fullPrompt.length,
        contextSize: context?.length || 0,
        modelComplexity: config.pricing.inputTokenCost + config.pricing.outputTokenCost,
        historicalAverage: this.getHistoricalAverage(model),
      },
    };
  }

  // Usage metrics and analytics
  getUsageMetrics(
    period?: { start: Date; end: Date },
    granularity: CostGranularity = 'global'
  ): UsageMetrics {
    let filteredCalls = this.apiCalls;
    
    if (period) {
      filteredCalls = this.apiCalls.filter(
        call => call.timestamp >= period.start && call.timestamp <= period.end
      );
    }

    const totalAPICalls = filteredCalls.length;
    const totalTokens: TokenUsage = filteredCalls.reduce(
      (acc, call) => ({
        inputTokens: acc.inputTokens + call.tokenUsage.inputTokens,
        outputTokens: acc.outputTokens + call.tokenUsage.outputTokens,
        totalTokens: acc.totalTokens + call.tokenUsage.totalTokens,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    );

    const totalCost = filteredCalls.reduce((acc, call) => acc + call.cost, 0);
    const averageLatency = totalAPICalls > 0 
      ? filteredCalls.reduce((acc, call) => acc + call.latency, 0) / totalAPICalls 
      : 0;

    const costByModel = this.aggregateCostsByDimension(filteredCalls, 'model');
    const costByService = this.aggregateCostsByDimension(filteredCalls, 'service');
    const costByOperation = this.aggregateCostsByDimension(filteredCalls, 'operation');

    return {
      totalAPICalls,
      totalTokens,
      totalCost,
      averageLatency,
      averageCostPerCall: totalAPICalls > 0 ? totalCost / totalAPICalls : 0,
      costByModel,
      costByService,
      costByOperation,
    };
  }

  getCostAnalytics(): CostAnalytics {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentCalls = this.apiCalls.filter(call => call.timestamp >= thirtyDaysAgo);
    const totalSpend = recentCalls.reduce((acc, call) => acc + call.cost, 0);

    // Generate time-based usage
    const dailyUsage = this.generateTimeBasedUsage(recentCalls, 'day');
    const weeklyUsage = this.generateTimeBasedUsage(recentCalls, 'week');
    const monthlyUsage = this.generateTimeBasedUsage(recentCalls, 'month');

    // Calculate top models
    const modelUsage = this.aggregateCostsByDimension(recentCalls, 'model');
    const topModels = Object.entries(modelUsage)
      .map(([model, breakdown]) => ({
        model: model as AIModel,
        usage: {
          totalAPICalls: 0,
          totalTokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          totalCost: breakdown.totalCost,
          averageLatency: 0,
          averageCostPerCall: 0,
          costByModel: {},
          costByService: {},
          costByOperation: {},
        } as UsageMetrics,
        percentage: (breakdown.totalCost / totalSpend) * 100,
      }))
      .sort((a, b) => b.usage.totalCost - a.usage.totalCost)
      .slice(0, 5);

    // Calculate cost trends
    const costTrends = this.calculateCostTrends(dailyUsage);

    // Project monthly spend
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const dailyAverage = totalSpend / Math.min(currentDay, 30);
    const projectedMonthlySpend = dailyAverage * daysInMonth;

    // Calculate efficiency metrics
    const efficiency = this.calculateEfficiencyMetrics(recentCalls);

    return {
      totalSpend,
      dailyUsage,
      weeklyUsage,
      monthlyUsage,
      topModels,
      costTrends,
      projectedMonthlySpend,
      efficiency,
    };
  }

  // Budget management
  createBudget(budget: Omit<CostBudget, 'id' | 'currentUsage' | 'createdAt' | 'updatedAt'>): CostBudget {
    const newBudget: CostBudget = {
      ...budget,
      id: nanoid(),
      currentUsage: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.budgets.push(newBudget);
    return newBudget;
  }

  updateBudget(budgetId: string, updates: Partial<CostBudget>): CostBudget | null {
    const budget = this.budgets.find(b => b.id === budgetId);
    if (!budget) return null;

    Object.assign(budget, updates, { updatedAt: new Date() });
    return budget;
  }

  async checkBudgetAlerts(call: APICall): Promise<void> {
    for (const budget of this.budgets) {
      if (call.metadata?.userId !== budget.userId) continue;

      const periodUsage = this.calculateBudgetPeriodUsage(budget);
      budget.currentUsage = periodUsage;

      const percentage = (periodUsage / budget.limit) * 100;
      
      for (const threshold of budget.alerts.thresholds) {
        if (percentage >= threshold && !budget.alerts.notified.includes(threshold)) {
          budget.alerts.notified.push(threshold);
          
          this.emitEvent({
            type: 'budget_alert',
            timestamp: new Date(),
            data: budget,
            severity: percentage >= 95 ? 'error' : percentage >= 80 ? 'warning' : 'info',
            message: `Budget "${budget.name}" is at ${percentage.toFixed(1)}% of limit`,
          });
        }
      }
    }
  }

  // Batch analysis
  analyzeBatch(calls: APICall[]): BatchCostAnalysis {
    const totalCost = calls.reduce((acc, call) => acc + call.cost, 0);
    const averageCost = calls.length > 0 ? totalCost / calls.length : 0;
    
    const costs = calls.map(call => call.cost).sort((a, b) => a - b);
    const costDistribution = {
      min: costs[0] || 0,
      max: costs[costs.length - 1] || 0,
      median: costs[Math.floor(costs.length / 2)] || 0,
      p95: costs[Math.floor(costs.length * 0.95)] || 0,
    };

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(calls);

    return {
      requests: calls,
      totalCost,
      averageCost,
      costDistribution,
      recommendations,
    };
  }

  // Service-specific cost tracking
  trackDeepgramUsage(audioLength: number, model: string = 'general', language: string = 'en'): DeepgramCost {
    const cost = (audioLength / 60) * 0.0125; // $0.0125 per minute
    
    const apiCall: Omit<APICall, 'id' | 'cost'> = {
      timestamp: new Date(),
      model: 'gpt-4o-mini', // Placeholder as Deepgram doesn't use our AI models
      service: 'deepgram',
      operation: 'speech_to_text',
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      latency: 0,
      requestSize: audioLength,
      metadata: { contextLength: Math.floor(audioLength) },
    };

    this.trackAPICall(apiCall);

    return {
      audioLength,
      model,
      language,
      features: [],
      cost,
    };
  }

  trackElevenLabsUsage(characterCount: number, voiceId: string, model: string = 'eleven_multilingual_v2'): ElevenLabsCost {
    const cost = (characterCount / 1000) * 0.30; // $0.30 per 1K characters
    
    const apiCall: Omit<APICall, 'id' | 'cost'> = {
      timestamp: new Date(),
      model: 'gpt-4o-mini', // Placeholder
      service: 'elevenlabs',
      operation: 'text_to_speech',
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      latency: 0,
      requestSize: characterCount,
    };

    this.trackAPICall(apiCall);

    return {
      characterCount,
      voiceId,
      model,
      cost,
    };
  }

  // Utility methods
  private getHistoricalAverage(model: AIModel): number {
    const modelCalls = this.apiCalls.filter(call => call.model === model);
    if (modelCalls.length === 0) return 0;
    
    return modelCalls.reduce((acc, call) => acc + call.cost, 0) / modelCalls.length;
  }

  private aggregateCostsByDimension(
    calls: APICall[], 
    dimension: keyof APICall
  ): Record<string, CostBreakdown> {
    const aggregated: Record<string, CostBreakdown> = {};
    
    for (const call of calls) {
      const key = String(call[dimension]);
      if (!aggregated[key]) {
        aggregated[key] = { inputCost: 0, outputCost: 0, totalCost: 0, currency: 'USD' };
      }
      
      const config = dimension === 'model' ? getModelConfig(call.model) : null;
      if (config && (call.service === 'openai' || call.service === 'anthropic')) {
        aggregated[key].inputCost += (call.tokenUsage.inputTokens / 1000) * config.pricing.inputTokenCost;
        aggregated[key].outputCost += (call.tokenUsage.outputTokens / 1000) * config.pricing.outputTokenCost;
      }
      
      aggregated[key].totalCost += call.cost;
    }
    
    return aggregated;
  }

  private generateTimeBasedUsage(calls: APICall[], period: CostPeriod): TimeBasedUsage[] {
    const grouped: Record<string, APICall[]> = {};
    
    for (const call of calls) {
      const key = this.getPeriodKey(call.timestamp, period);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(call);
    }
    
    return Object.entries(grouped).map(([periodKey, periodCalls]) => ({
      period: periodKey,
      usage: this.getUsageMetrics({ 
        start: new Date(0), 
        end: new Date() 
      }, 'global'),
    }));
  }

  private getPeriodKey(date: Date, period: CostPeriod): string {
    switch (period) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        const week = new Date(date);
        week.setDate(date.getDate() - date.getDay());
        return week.toISOString().split('T')[0];
      case 'month':
        return date.toISOString().substring(0, 7);
      case 'year':
        return date.getFullYear().toString();
      default:
        return date.toISOString();
    }
  }

  private calculateCostTrends(dailyUsage: TimeBasedUsage[]): CostAnalytics['costTrends'] {
    if (dailyUsage.length < 2) {
      return { direction: 'stable', percentage: 0, period: 'day' };
    }
    
    const recent = dailyUsage.slice(-7);
    const previous = dailyUsage.slice(-14, -7);
    
    const recentAvg = recent.reduce((acc, day) => acc + day.usage.totalCost, 0) / recent.length;
    const previousAvg = previous.reduce((acc, day) => acc + day.usage.totalCost, 0) / previous.length;
    
    const percentage = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
    
    return {
      direction: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable',
      percentage: Math.abs(percentage),
      period: 'week',
    };
  }

  private calculateEfficiencyMetrics(calls: APICall[]): CostAnalytics['efficiency'] {
    const modelEfficiency: Record<AIModel, { tokens: number; cost: number }> = {} as any;
    
    for (const call of calls) {
      if (!modelEfficiency[call.model]) {
        modelEfficiency[call.model] = { tokens: 0, cost: 0 };
      }
      modelEfficiency[call.model].tokens += call.tokenUsage.totalTokens;
      modelEfficiency[call.model].cost += call.cost;
    }
    
    let mostEfficient: AIModel = 'gpt-4o-mini';
    let leastEfficient: AIModel = 'gpt-4o-mini';
    let bestRatio = 0;
    let worstRatio = Infinity;
    
    for (const [model, data] of Object.entries(modelEfficiency)) {
      const ratio = data.cost > 0 ? data.tokens / data.cost : 0;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        mostEfficient = model as AIModel;
      }
      if (ratio < worstRatio && ratio > 0) {
        worstRatio = ratio;
        leastEfficient = model as AIModel;
      }
    }
    
    const totalTokens = Object.values(modelEfficiency).reduce((acc, data) => acc + data.tokens, 0);
    const totalCost = Object.values(modelEfficiency).reduce((acc, data) => acc + data.cost, 0);
    
    return {
      averageTokensPerDollar: totalCost > 0 ? totalTokens / totalCost : 0,
      mostEfficientModel: mostEfficient,
      leastEfficientModel: leastEfficient,
    };
  }

  private generateOptimizationRecommendations(calls: APICall[]): BatchCostAnalysis['recommendations'] {
    const modelUsage = this.aggregateCostsByDimension(calls, 'model');
    const sortedModels = Object.entries(modelUsage).sort((a, b) => b[1].totalCost - a[1].totalCost);
    
    const recommendations: string[] = [];
    let potentialSavings = 0;
    let suggestedModel: AIModel | undefined;
    
    // Analyze most expensive model
    if (sortedModels.length > 0) {
      const [expensiveModel] = sortedModels[0];
      const cheaperAlternatives = Object.keys(modelConfigs).filter(model => {
        const expensiveConfig = getModelConfig(expensiveModel as AIModel);
        const alternativeConfig = getModelConfig(model as AIModel);
        return alternativeConfig.pricing.inputTokenCost < expensiveConfig.pricing.inputTokenCost;
      });
      
      if (cheaperAlternatives.length > 0) {
        suggestedModel = cheaperAlternatives[0] as AIModel;
        const savings = modelUsage[expensiveModel].totalCost * 0.3; // Estimate 30% savings
        potentialSavings += savings;
        recommendations.push(`Consider using ${suggestedModel} instead of ${expensiveModel} for routine tasks`);
      }
    }
    
    // Add general recommendations
    recommendations.push('Implement prompt caching for repeated queries');
    recommendations.push('Use smaller models for simple tasks');
    recommendations.push('Batch similar requests when possible');
    
    return {
      suggestedModel,
      potentialSavings,
      optimizationTips: recommendations,
    };
  }

  private calculateBudgetPeriodUsage(budget: CostBudget): number {
    const now = new Date();
    let start: Date;
    
    switch (budget.period) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    return this.apiCalls
      .filter(call => 
        call.timestamp >= start && 
        call.metadata?.userId === budget.userId
      )
      .reduce((acc, call) => acc + call.cost, 0);
  }

  private emitEvent(event: CostEvent): void {
    this.events.push(event);
    // In a real implementation, this would emit to event listeners
    console.log(`[CostTracker] ${event.severity.toUpperCase()}: ${event.message}`);
  }


  // Export/import methods
  exportData(): string {
    return JSON.stringify({
      apiCalls: this.apiCalls,
      budgets: this.budgets,
      events: this.events,
      exportedAt: new Date(),
    }, null, 2);
  }

  importData(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.apiCalls) this.apiCalls = parsed.apiCalls;
      if (parsed.budgets) this.budgets = parsed.budgets;
      if (parsed.events) this.events = parsed.events;
    } catch (error) {
      console.error('Failed to import cost tracking data:', error);
    }
  }

  // Getters for data access
  getAPICalls(): APICall[] {
    return [...this.apiCalls];
  }

  getBudgets(): CostBudget[] {
    return [...this.budgets];
  }

  getEvents(): CostEvent[] {
    return [...this.events];
  }
  
  // Fast lookup methods
  getAPICallById(id: string): APICall | undefined {
    return this.callsIndex.get(id);
  }
  
  getBudgetById(id: string): CostBudget | undefined {
    return this.budgetsIndex.get(id);
  }
  
  // Performance monitoring
  getCacheStats() {
    return trackingCache.getStats();
  }
  
  clearCaches(): void {
    trackingCache.clear();
    this.modelStatsCache.clear();
  }

  // Performance optimized private methods
  private updateModelStatsCache(call: APICall): void {
    const existing = this.modelStatsCache.get(call.model);
    if (existing) {
      existing.totalCost += call.cost;
      existing.count++;
      existing.lastUpdated = Date.now();
    } else {
      this.modelStatsCache.set(call.model, {
        totalCost: call.cost,
        count: 1,
        lastUpdated: Date.now()
      });
    }
  }
  
  private addToPendingOperations(operation: () => void): void {
    this.pendingOperations.push(operation);
  }
  
  private async processPendingOperations(): Promise<void> {
    if (this.processingBatch || this.pendingOperations.length === 0) {
      return;
    }
    
    this.processingBatch = true;
    
    try {
      // Process operations in chunks
      const chunkSize = 10;
      while (this.pendingOperations.length > 0) {
        const chunk = this.pendingOperations.splice(0, chunkSize);
        await Promise.all(chunk.map(op => {
          try {
            return op();
          } catch (error) {
            console.error('Error in pending operation:', error);
          }
        }));
        
        // Yield control if more operations pending
        if (this.pendingOperations.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } finally {
      this.processingBatch = false;
    }
  }
  
  private getRecentCallsOptimized(cutoff: Date): APICall[] {
    // Use binary search for better performance on large datasets
    const result = [];
    for (let i = this.apiCalls.length - 1; i >= 0; i--) {
      const call = this.apiCalls[i];
      if (call.timestamp >= cutoff) {
        result.unshift(call);
      } else {
        // Since calls are typically added chronologically, we can break early
        break;
      }
    }
    return result;
  }
  
  private generateTimeBasedUsageOptimized(calls: APICall[], period: CostPeriod): TimeBasedUsage[] {
    const cacheKey = `time_based_${period}_${calls.length}`;
    const cached = trackingCache.get<TimeBasedUsage[]>(cacheKey);
    if (cached) return cached;
    
    const grouped: Record<string, APICall[]> = {};
    
    for (const call of calls) {
      const key = this.getPeriodKey(call.timestamp, period);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(call);
    }
    
    const result = Object.entries(grouped).map(([periodKey, periodCalls]) => ({
      period: periodKey,
      usage: this.getUsageMetrics({ 
        start: new Date(0), 
        end: new Date() 
      }, 'global'),
    }));
    
    trackingCache.set(cacheKey, result, 120000); // 2 minutes
    return result;
  }
  
  private getTopModelsFromCache(totalSpend: number): CostAnalytics['topModels'] {
    const result = [];
    
    for (const [model, stats] of this.modelStatsCache.entries()) {
      result.push({
        model,
        usage: {
          totalAPICalls: stats.count,
          totalTokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          totalCost: stats.totalCost,
          averageLatency: 0,
          averageCostPerCall: stats.totalCost / stats.count,
          costByModel: {},
          costByService: {},
          costByOperation: {},
        } as UsageMetrics,
        percentage: totalSpend > 0 ? (stats.totalCost / totalSpend) * 100 : 0,
      });
    }
    
    return result
      .sort((a, b) => b.usage.totalCost - a.usage.totalCost)
      .slice(0, 5);
  }
  
  private getCachedAggregation(
    calls: APICall[], 
    dimension: keyof APICall
  ): Record<string, CostBreakdown> {
    const cacheKey = `aggregation_${dimension}_${calls.length}`;
    const cached = trackingCache.get<Record<string, CostBreakdown>>(cacheKey);
    if (cached) return cached;
    
    const result = this.aggregateCostsByDimension(calls, dimension);
    trackingCache.set(cacheKey, result, 60000); // 1 minute
    return result;
  }
  
  private clearBudgetCaches(): void {
    // Clear budget-related cache entries
    const stats = trackingCache.getStats();
    // In a real implementation, you'd clear specific cache keys
    // For now, we'll just note that caches should be cleared
  }
  
  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    const initialCallsLength = this.apiCalls.length;
    const initialEventsLength = this.events.length;
    
    // Filter and update indices
    this.apiCalls = this.apiCalls.filter(call => {
      const keep = call.timestamp >= cutoff;
      if (!keep) {
        this.callsIndex.delete(call.id);
      }
      return keep;
    });
    
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    
    // Clear caches after cleanup
    if (this.apiCalls.length !== initialCallsLength || this.events.length !== initialEventsLength) {
      trackingCache.clear();
    }
    
    this.lastCleanup = Date.now();
  }
}

// Export performance utilities  
export const CostTrackingCache = trackingCache;