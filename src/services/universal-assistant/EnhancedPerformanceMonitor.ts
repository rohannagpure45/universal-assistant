/**
 * EnhancedPerformanceMonitor - Advanced Performance Monitoring with Composition
 * 
 * Uses SOLID principles and composition over inheritance for better maintainability
 * and extensibility. Provides enhanced monitoring capabilities including fallback
 * tracking, cost correlation, and intelligent optimizations.
 */

import { nanoid } from 'nanoid';
import { PerformanceMonitor } from './PerformanceMonitor';
import {
  PerformanceMetrics,
  PerformanceTrend,
  PerformanceScore,
  PerformanceAlert,
  PerformanceThreshold,
  FallbackTracking,
  ModelPerformanceAnalysis,
  ResourceMonitoring,
  PerformanceAnalytics,
  PerformanceOptimization,
  CostPerformanceCorrelation,
  PerformanceMonitoringConfig,
  PerformancePeriod,
  PerformanceRecommendation
} from '@/types/performance';
import { AIModel } from '@/types';
import { APICall } from '@/types/cost';

/**
 * Interface for enhanced monitoring capabilities
 */
interface IEnhancedMonitoring {
  recordEnhancedMetrics(metrics: PerformanceMetrics): void;
  trackFallbackMetrics(context: FallbackContext): void;
  recordFallback(fallback: FallbackTracking): void;
  recordCostData(apiCall: APICall): void;
  getEnhancedPerformanceScore(): PerformanceScore | null;
  getPerformanceTrends(period?: PerformancePeriod): PerformanceTrend[];
  getModelAnalytics(model?: AIModel): ModelPerformanceAnalysis[];
  generateOptimizationPlan(): PerformanceOptimization[];
  emergencyPerformanceCheck(): EmergencyCheckResult;
}

interface FallbackContext {
  operation: string;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
}

interface EmergencyCheckResult {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  recommendations: string[];
}

/**
 * Enhanced Performance Analytics Service
 * Uses composition to extend monitoring capabilities
 */
class EnhancedAnalyticsService {
  private extendedMetrics: PerformanceMetrics[] = [];
  private modelAnalytics: Map<AIModel, ModelPerformanceAnalysis> = new Map();
  private trends: Map<string, PerformanceTrend> = new Map();
  private performanceScore: PerformanceScore | null = null;

  constructor(private targetLatency: number = 350) {}

  /**
   * Record and analyze enhanced metrics
   */
  public recordMetrics(metrics: PerformanceMetrics): void {
    this.extendedMetrics.push(metrics);
    
    // Maintain history size
    if (this.extendedMetrics.length > 10000) {
      this.extendedMetrics = this.extendedMetrics.slice(-10000);
    }
    
    this.updateModelAnalytics(metrics);
    this.updatePerformanceScore();
  }

  /**
   * Get current performance score
   */
  public getPerformanceScore(): PerformanceScore | null {
    return this.performanceScore;
  }

  /**
   * Get performance trends
   */
  public getTrends(period?: PerformancePeriod): PerformanceTrend[] {
    if (period) {
      const trend = this.trends.get(period);
      return trend ? [trend] : [];
    }
    return Array.from(this.trends.values());
  }

  /**
   * Get model-specific analytics
   */
  public getModelAnalytics(model?: AIModel): ModelPerformanceAnalysis[] {
    if (model) {
      const analysis = this.modelAnalytics.get(model);
      return analysis ? [analysis] : [];
    }
    return Array.from(this.modelAnalytics.values());
  }

  /**
   * Analyze trends for different periods
   */
  public analyzeTrends(): void {
    const now = Date.now();
    const periods: { name: string; duration: number }[] = [
      { name: 'hourly', duration: 3600000 },
      { name: 'daily', duration: 86400000 },
      { name: 'weekly', duration: 604800000 }
    ];
    
    periods.forEach(period => {
      const startTime = now - period.duration;
      const periodMetrics = this.extendedMetrics.filter(m => m.timestamp >= startTime);
      
      if (periodMetrics.length > 0) {
        const trend = this.calculateTrend(periodMetrics, period.name);
        this.trends.set(period.name, trend);
      }
    });
  }

  /**
   * Get comprehensive analytics
   */
  public getAnalytics(timeRange?: { start: number; end: number }): PerformanceAnalytics {
    const start = timeRange?.start || Date.now() - 86400000;
    const end = timeRange?.end || Date.now();
    
    const metrics = this.extendedMetrics.filter(m => m.timestamp >= start && m.timestamp <= end);
    const successfulRequests = metrics.filter(m => m.context.retryCount === 0).length;
    const failedRequests = metrics.length - successfulRequests;
    
    const latencies = metrics.map(m => m.latency.total);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    
    const throughput = metrics.length / ((end - start) / 1000);
    const uptime = successfulRequests / Math.max(metrics.length, 1) * 100;
    
    return {
      timeRange: { start, end, duration: end - start },
      summary: {
        totalRequests: metrics.length,
        successfulRequests,
        failedRequests,
        averageLatency,
        p95Latency,
        throughput,
        uptime
      },
      trends: this.getTrends(),
      scores: this.performanceScore || this.createDefaultScore(),
      bottlenecks: this.identifyBottlenecks(metrics),
      costPerformanceCorrelation: {
        costPerRequest: 0,
        performancePerDollar: 0,
        optimalModels: []
      },
      alerts: {
        total: 0,
        bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
        recent: []
      },
      fallbacks: {
        total: 0,
        successRate: 1,
        byReason: {},
        averageImpact: 0
      }
    };
  }

  private updateModelAnalytics(metrics: PerformanceMetrics): void {
    const model = metrics.context.modelUsed;
    let analysis = this.modelAnalytics.get(model);
    
    if (!analysis) {
      analysis = this.createDefaultModelAnalysis(model);
      this.modelAnalytics.set(model, analysis);
    }
    
    // Update usage stats
    analysis.usage.totalRequests++;
    if (metrics.context.retryCount === 0) {
      analysis.usage.successfulRequests++;
    } else {
      analysis.usage.failedRequests++;
    }
    
    if (metrics.context.fallbackUsed) {
      analysis.usage.fallbackRequests++;
    }
    
    // Update performance stats
    const currentLatency = metrics.latency.total;
    analysis.performance.minLatency = Math.min(analysis.performance.minLatency, currentLatency);
    analysis.performance.maxLatency = Math.max(analysis.performance.maxLatency, currentLatency);
    analysis.period.end = Date.now();
  }

  private updatePerformanceScore(): void {
    const recentMetrics = this.extendedMetrics.slice(-100);
    if (recentMetrics.length === 0) return;
    
    const latencies = recentMetrics.map(m => m.latency.total);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const errorRate = recentMetrics.filter(m => m.context.retryCount > 0).length / recentMetrics.length;
    
    // Calculate component scores
    const latencyScore = Math.max(0, 100 - (averageLatency - this.targetLatency) / this.targetLatency * 100);
    const throughputScore = this.calculateThroughputScore(recentMetrics);
    const reliabilityScore = (1 - errorRate) * 100;
    const efficiencyScore = this.calculateEfficiencyScore(recentMetrics);
    const qualityScore = this.calculateQualityScore(recentMetrics);
    const resourceScore = 85; // Default score
    
    const overallScore = (
      latencyScore * 0.25 +
      throughputScore * 0.2 +
      reliabilityScore * 0.2 +
      efficiencyScore * 0.15 +
      qualityScore * 0.1 +
      resourceScore * 0.1
    );
    
    // Determine grade
    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    if (overallScore >= 97) grade = 'A+';
    else if (overallScore >= 93) grade = 'A';
    else if (overallScore >= 87) grade = 'B+';
    else if (overallScore >= 83) grade = 'B';
    else if (overallScore >= 77) grade = 'C+';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';
    
    this.performanceScore = {
      overall: overallScore,
      components: {
        latency: latencyScore,
        throughput: throughputScore,
        reliability: reliabilityScore,
        efficiency: efficiencyScore,
        quality: qualityScore,
        resourceUsage: resourceScore
      },
      grade,
      factors: this.analyzePerformanceFactors(recentMetrics),
      recommendations: this.generateRecommendations(recentMetrics)
    };
  }

  private calculateTrend(metrics: PerformanceMetrics[], period: string): PerformanceTrend {
    const latencies = metrics.map(m => m.latency.total);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    
    const throughput = metrics.length / (metrics[metrics.length - 1]?.timestamp - metrics[0]?.timestamp || 1) * 1000;
    const errorRate = metrics.filter(m => m.context.retryCount > 0).length / metrics.length;
    const successRate = 1 - errorRate;
    
    const latencyScore = Math.max(0, 100 - (averageLatency - this.targetLatency) / this.targetLatency * 100);
    const reliabilityScore = successRate * 100;
    const efficiencyScore = 80;
    const qualityScore = 85;
    const overallScore = (latencyScore * 0.3 + reliabilityScore * 0.3 + efficiencyScore * 0.2 + qualityScore * 0.2);
    
    return {
      period: new Date().toISOString().split('T')[0],
      metrics: {
        averageLatency,
        p50Latency: p50,
        p95Latency: p95,
        p99Latency: p99,
        throughput,
        errorRate,
        successRate
      },
      scores: {
        overall: overallScore,
        latency: latencyScore,
        reliability: reliabilityScore,
        efficiency: efficiencyScore,
        quality: qualityScore
      },
      fallbacks: {
        total: metrics.filter(m => m.context.fallbackUsed).length,
        byReason: {},
        impactOnLatency: 0
      },
      comparison: {
        previousPeriod: {
          latencyChange: 0,
          throughputChange: 0,
          errorRateChange: 0,
          trend: 'stable'
        }
      }
    };
  }

  private calculateThroughputScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 100;
    const timeSpan = metrics[metrics.length - 1].timestamp - metrics[0].timestamp;
    const throughput = (metrics.length / timeSpan) * 1000;
    const expectedThroughput = 10;
    return Math.min(100, (throughput / expectedThroughput) * 100);
  }

  private calculateEfficiencyScore(metrics: PerformanceMetrics[]): number {
    const cacheHitRate = metrics.filter(m => m.context.cacheHit).length / metrics.length;
    return cacheHitRate * 100;
  }

  private calculateQualityScore(metrics: PerformanceMetrics[]): number {
    const qualityMetrics = metrics.filter(m => m.quality.transcriptionAccuracy !== undefined);
    if (qualityMetrics.length === 0) return 85;
    
    const avgAccuracy = qualityMetrics.reduce((sum, m) => sum + (m.quality.transcriptionAccuracy || 0), 0) / qualityMetrics.length;
    const avgRelevance = qualityMetrics.reduce((sum, m) => sum + (m.quality.responseRelevance || 0), 0) / qualityMetrics.length;
    
    return (avgAccuracy + avgRelevance) / 2;
  }

  private analyzePerformanceFactors(metrics: PerformanceMetrics[]): { positive: string[]; negative: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];
    
    const avgLatency = metrics.reduce((sum, m) => sum + m.latency.total, 0) / metrics.length;
    const cacheHitRate = metrics.filter(m => m.context.cacheHit).length / metrics.length;
    const errorRate = metrics.filter(m => m.context.retryCount > 0).length / metrics.length;
    
    if (avgLatency < this.targetLatency) {
      positive.push('Latency below target');
    } else {
      negative.push('Latency above target');
    }
    
    if (cacheHitRate > 0.7) {
      positive.push('High cache hit rate');
    } else {
      negative.push('Low cache efficiency');
    }
    
    if (errorRate < 0.02) {
      positive.push('Low error rate');
    } else {
      negative.push('High error rate');
    }
    
    return { positive, negative };
  }

  private generateRecommendations(metrics: PerformanceMetrics[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const avgLatency = metrics.reduce((sum, m) => sum + m.latency.total, 0) / metrics.length;
    
    if (avgLatency > this.targetLatency) {
      recommendations.push({
        id: nanoid(),
        type: 'optimization',
        priority: 'high',
        category: 'latency',
        title: 'Optimize Response Latency',
        description: `Average latency (${Math.round(avgLatency)}ms) exceeds target (${this.targetLatency}ms)`,
        impact: {
          latencyImprovement: avgLatency - this.targetLatency
        },
        implementation: {
          effort: 'medium',
          timeEstimate: '1-2 days',
          resources: ['Engineering'],
          risks: ['Potential quality impact']
        },
        actionItems: [
          'Profile slow components',
          'Optimize AI model selection',
          'Implement response caching'
        ],
        measurability: {
          beforeMetrics: ['Average latency'],
          afterMetrics: ['Improved latency'],
          successCriteria: ['Latency under target']
        }
      });
    }
    
    return recommendations;
  }

  private identifyBottlenecks(metrics: PerformanceMetrics[]): Array<{
    component: string;
    impact: number;
    frequency: number;
    recommendations: string[];
  }> {
    if (metrics.length === 0) return [];
    
    const stageAverages = {
      audioCapture: metrics.reduce((sum, m) => sum + m.latency.stages.audioCapture, 0) / metrics.length,
      speechToText: metrics.reduce((sum, m) => sum + m.latency.stages.speechToText, 0) / metrics.length,
      textProcessing: metrics.reduce((sum, m) => sum + m.latency.stages.textProcessing, 0) / metrics.length,
      aiResponse: metrics.reduce((sum, m) => sum + m.latency.stages.aiResponse, 0) / metrics.length,
      textToSpeech: metrics.reduce((sum, m) => sum + m.latency.stages.textToSpeech, 0) / metrics.length,
      audioPlayback: metrics.reduce((sum, m) => sum + m.latency.stages.audioPlayback, 0) / metrics.length
    };
    
    return Object.entries(stageAverages)
      .map(([component, avgLatency]) => ({
        component,
        impact: avgLatency,
        frequency: metrics.filter(m => (m.latency.stages as any)[component] > avgLatency * 1.5).length / metrics.length,
        recommendations: this.getBottleneckRecommendations(component)
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
  }

  private getBottleneckRecommendations(component: string): string[] {
    const recommendations: Record<string, string[]> = {
      speechToText: ['Optimize STT model', 'Implement streaming', 'Reduce audio buffer size'],
      aiResponse: ['Use faster model', 'Optimize prompts', 'Implement caching'],
      textToSpeech: ['Optimize voice settings', 'Enable streaming TTS', 'Use cached responses'],
      textProcessing: ['Optimize algorithms', 'Reduce context size', 'Parallel processing'],
      audioCapture: ['Optimize audio settings', 'Reduce latency buffers', 'Hardware optimization'],
      audioPlayback: ['Optimize audio pipeline', 'Reduce buffer size', 'Audio compression']
    };
    
    return recommendations[component] || ['Investigate component performance'];
  }

  private createDefaultScore(): PerformanceScore {
    return {
      overall: 0,
      components: {
        latency: 0,
        throughput: 0,
        reliability: 0,
        efficiency: 0,
        quality: 0,
        resourceUsage: 0
      },
      grade: 'F',
      factors: { positive: [], negative: [] },
      recommendations: []
    };
  }

  private createDefaultCorrelation(): CostPerformanceCorrelation {
    return {
      period: new Date().toISOString().split('T')[0],
      metrics: {
        totalCost: 0,
        totalRequests: 0,
        averageLatency: 0,
        costPerRequest: 0,
        costPerMillisecond: 0,
        performanceScore: 0
      },
      efficiency: {
        bestPerformingModel: {
          model: 'gpt-4o' as AIModel,
          costPerRequest: 0,
          averageLatency: 0,
          score: 0
        },
        mostEfficientModel: {
          model: 'gpt-4o' as AIModel,
          costPerPerformancePoint: 0,
          score: 0
        },
        leastEfficientModel: {
          model: 'gpt-4o' as AIModel,
          costPerPerformancePoint: 0,
          score: 0
        }
      },
      recommendations: {
        modelSwitching: [],
        optimizations: []
      }
    };
  }

  private createDefaultModelAnalysis(model: AIModel): ModelPerformanceAnalysis {
    return {
      model,
      period: { start: Date.now(), end: Date.now() },
      usage: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackRequests: 0 },
      performance: {
        averageLatency: 0, p50Latency: 0, p95Latency: 0, p99Latency: 0,
        minLatency: Number.MAX_VALUE, maxLatency: 0, reliabilityScore: 0, qualityScore: 0
      },
      cost: { totalCost: 0, averageCostPerRequest: 0, costPerToken: 0, efficiency: 0 },
      trends: { latencyTrend: 'stable', reliabilityTrend: 'stable', costTrend: 'stable' },
      recommendations: { continue: true, alternatives: [], optimizations: [] }
    };
  }
}

/**
 * Fallback Tracking Service
 */
class FallbackTrackingService {
  private fallbackHistory: FallbackTracking[] = [];
  private fallbackTracker: Map<string, number> = new Map();

  public recordFallback(fallback: FallbackTracking): void {
    this.fallbackHistory.push(fallback);
    
    // Maintain history size
    if (this.fallbackHistory.length > 10000) {
      this.fallbackHistory = this.fallbackHistory.slice(-10000);
    }
    
    // Track fallback frequency
    const key = `${fallback.originalModel}->${fallback.fallbackModel}`;
    this.fallbackTracker.set(key, (this.fallbackTracker.get(key) || 0) + 1);
  }

  public getFallbackHistory(limit?: number): FallbackTracking[] {
    return limit ? this.fallbackHistory.slice(-limit) : [...this.fallbackHistory];
  }

  public calculateSuccessRate(): number {
    if (this.fallbackHistory.length === 0) return 1;
    return this.fallbackHistory.filter(f => f.success).length / this.fallbackHistory.length;
  }

  public groupByReason(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.fallbackHistory.forEach(f => {
      grouped[f.reason] = (grouped[f.reason] || 0) + 1;
    });
    return grouped;
  }

  public calculateAverageImpact(): number {
    if (this.fallbackHistory.length === 0) return 0;
    return this.fallbackHistory.reduce((sum, f) => sum + f.impact.latencyChange, 0) / this.fallbackHistory.length;
  }
}

/**
 * Cost Correlation Service
 */
class CostCorrelationService {
  private costData: APICall[] = [];

  public recordCostData(apiCall: APICall): void {
    this.costData.push(apiCall);
    
    // Maintain history size
    if (this.costData.length > 10000) {
      this.costData = this.costData.slice(-10000);
    }
  }

  public getCostPerformanceCorrelation(
    metrics: PerformanceMetrics[],
    period?: PerformancePeriod
  ): CostPerformanceCorrelation {
    const now = Date.now();
    let duration: number;
    
    switch (period) {
      case 'hour': duration = 3600000; break;
      case 'day': duration = 86400000; break;
      case 'week': duration = 604800000; break;
      case 'month': duration = 2592000000; break;
      default: duration = 86400000;
    }
    
    const startTime = now - duration;
    const periodCosts = this.costData.filter(c => c.timestamp.getTime() >= startTime);
    const periodMetrics = metrics.filter(m => m.timestamp >= startTime);
    
    const totalCost = periodCosts.reduce((sum, c) => sum + c.cost, 0);
    const totalRequests = periodMetrics.length;
    const averageLatency = periodMetrics.reduce((sum, m) => sum + m.latency.total, 0) / totalRequests || 0;
    const costPerRequest = totalCost / Math.max(totalRequests, 1);
    const costPerMillisecond = totalCost / Math.max(averageLatency * totalRequests, 1);
    const performanceScore = 0; // Would calculate from actual score
    
    return {
      period: new Date().toISOString().split('T')[0],
      metrics: {
        totalCost,
        totalRequests,
        averageLatency,
        costPerRequest,
        costPerMillisecond,
        performanceScore
      },
      efficiency: this.calculateModelEfficiency(periodCosts, periodMetrics),
      recommendations: this.generateCostPerformanceRecommendations()
    };
  }

  private calculateModelEfficiency(costs: APICall[], metrics: PerformanceMetrics[]): CostPerformanceCorrelation['efficiency'] {
    return {
      bestPerformingModel: {
        model: 'gpt-4o' as AIModel,
        costPerRequest: 0,
        averageLatency: 0,
        score: 0
      },
      mostEfficientModel: {
        model: 'gpt-4o' as AIModel,
        costPerPerformancePoint: 0,
        score: 0
      },
      leastEfficientModel: {
        model: 'gpt-4o' as AIModel,
        costPerPerformancePoint: 0,
        score: 0
      }
    };
  }

  private generateCostPerformanceRecommendations(): CostPerformanceCorrelation['recommendations'] {
    return {
      modelSwitching: [],
      optimizations: []
    };
  }
}

/**
 * EnhancedPerformanceMonitor - Main class using composition
 * Aggregates functionality from specialized services
 */
export class EnhancedPerformanceMonitor implements IEnhancedMonitoring {
  private baseMonitor: PerformanceMonitor;
  private analyticsService: EnhancedAnalyticsService;
  private fallbackService: FallbackTrackingService;
  private costService: CostCorrelationService;
  private trendAnalysisInterval: NodeJS.Timeout | null = null;

  constructor(targetLatency: number = 350, config?: Partial<PerformanceMonitoringConfig>) {
    // Initialize services
    this.baseMonitor = new PerformanceMonitor(targetLatency, config);
    this.analyticsService = new EnhancedAnalyticsService(targetLatency);
    this.fallbackService = new FallbackTrackingService();
    this.costService = new CostCorrelationService();
  }

  /**
   * Start enhanced monitoring
   */
  public startMonitoring(): void {
    this.baseMonitor.startMonitoring();
    
    // Start trend analysis
    this.trendAnalysisInterval = setInterval(() => {
      this.analyticsService.analyzeTrends();
    }, 300000); // Every 5 minutes
  }

  /**
   * Stop enhanced monitoring
   */
  public stopMonitoring(): void {
    this.baseMonitor.stopMonitoring();
    
    if (this.trendAnalysisInterval) {
      clearInterval(this.trendAnalysisInterval);
      this.trendAnalysisInterval = null;
    }
  }

  /**
   * Record enhanced performance metrics
   */
  public recordEnhancedMetrics(metrics: PerformanceMetrics): void {
    // Record in base monitor
    this.baseMonitor.recordLatencyMetrics({
      timestamp: metrics.timestamp,
      totalLatency: metrics.latency.total,
      audioToTranscription: metrics.latency.stages.speechToText,
      transcriptionToAnalysis: metrics.latency.stages.textProcessing,
      analysisToResponse: metrics.latency.stages.aiResponse,
      responseToAudio: metrics.latency.stages.textToSpeech,
      sessionId: metrics.id,
      targetLatency: 350,
      performanceRating: metrics.latency.total <= 350 ? 'good' : metrics.latency.total <= 500 ? 'acceptable' : 'poor'
    });
    
    // Record in analytics service
    this.analyticsService.recordMetrics(metrics);
  }

  /**
   * Track fallback metrics when primary monitoring fails
   */
  public trackFallbackMetrics(context: FallbackContext): void {
    const fallbackMetrics: PerformanceMetrics = {
      id: nanoid(),
      timestamp: context.endTime,
      latency: {
        total: context.endTime - context.startTime,
        stages: {
          audioCapture: 0,
          speechToText: 0,
          textProcessing: context.endTime - context.startTime,
          aiResponse: 0,
          textToSpeech: 0,
          audioPlayback: 0
        },
        network: {
          deepgram: 0,
          openai: 0,
          anthropic: 0,
          elevenlabs: 0
        }
      },
      resources: {
        memory: {
          used: process.memoryUsage().heapUsed,
          available: process.memoryUsage().heapTotal - process.memoryUsage().heapUsed,
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
        },
        cpu: {
          usage: 0,
          cores: require('os').cpus().length
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          bandwidth: 0
        }
      },
      quality: {},
      context: {
        modelUsed: 'gpt-4o' as AIModel,
        fallbackUsed: true,
        fallbackReason: 'primary_metrics_failed',
        retryCount: context.success ? 0 : 1,
        cacheHit: false
      }
    };
    
    this.recordEnhancedMetrics(fallbackMetrics);
  }

  /**
   * Record fallback usage
   */
  public recordFallback(fallback: FallbackTracking): void {
    this.fallbackService.recordFallback(fallback);
  }

  /**
   * Record cost data for correlation analysis
   */
  public recordCostData(apiCall: APICall): void {
    this.costService.recordCostData(apiCall);
  }

  /**
   * Get enhanced performance score
   */
  public getEnhancedPerformanceScore(): PerformanceScore | null {
    return this.analyticsService.getPerformanceScore();
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(period?: PerformancePeriod): PerformanceTrend[] {
    return this.analyticsService.getTrends(period);
  }

  /**
   * Get model analytics
   */
  public getModelAnalytics(model?: AIModel): ModelPerformanceAnalysis[] {
    return this.analyticsService.getModelAnalytics(model);
  }

  /**
   * Get fallback history
   */
  public getFallbackHistory(limit?: number): FallbackTracking[] {
    return this.fallbackService.getFallbackHistory(limit);
  }

  /**
   * Get performance analytics
   */
  public getPerformanceAnalytics(timeRange?: { start: number; end: number }): PerformanceAnalytics {
    const analytics = this.analyticsService.getAnalytics(timeRange);
    
    // Add fallback data
    analytics.fallbacks = {
      total: this.fallbackService.getFallbackHistory().length,
      successRate: this.fallbackService.calculateSuccessRate(),
      byReason: this.fallbackService.groupByReason(),
      averageImpact: this.fallbackService.calculateAverageImpact()
    };
    
    return analytics;
  }

  /**
   * Get cost-performance correlation
   */
  public getCostPerformanceCorrelation(period?: PerformancePeriod): CostPerformanceCorrelation {
    const metrics = this.analyticsService['extendedMetrics']; // Would expose via getter
    return this.costService.getCostPerformanceCorrelation([], period);
  }

  /**
   * Generate optimization plan
   */
  public generateOptimizationPlan(): PerformanceOptimization[] {
    const score = this.getEnhancedPerformanceScore();
    const optimizations: PerformanceOptimization[] = [];
    
    if (!score) return [];

    // Latency optimization
    if (score.components.latency < 70) {
      optimizations.push({
        id: nanoid(),
        name: 'Latency Optimization',
        description: 'Comprehensive latency reduction plan',
        category: 'processing',
        status: 'proposed',
        baseline: {
          metrics: [],
          averageLatency: 0,
          throughput: 0,
          errorRate: 0,
          cost: 0
        },
        target: {
          latencyImprovement: 30,
          throughputImprovement: 10,
          errorRateReduction: 5,
          costReduction: 0
        },
        implementation: {
          config: {
            enableStreaming: true,
            optimizeModels: true,
            improveCache: true
          },
          dependencies: ['model-optimization', 'cache-improvement']
        },
        testing: {
          testPlan: [
            'A/B test with optimized settings',
            'Monitor latency improvements',
            'Verify quality maintenance'
          ],
          metrics: [],
          passed: false,
          issues: []
        }
      });
    }

    return optimizations;
  }

  /**
   * Emergency performance check
   */
  public emergencyPerformanceCheck(): EmergencyCheckResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Basic health checks
    const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    if (memoryUsage > 90) {
      issues.push('High memory usage');
      recommendations.push('Restart service or clear cache');
    }
    
    // Determine status
    let status: 'healthy' | 'degraded' | 'critical';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'critical';
    }
    
    return { status, issues, recommendations };
  }

  /**
   * Delegate methods to base monitor
   */
  public getLatestReport() {
    return this.baseMonitor.getLatestReport();
  }

  public getReports(limit?: number) {
    return this.baseMonitor.getReports(limit);
  }

  public getActiveAlerts() {
    return this.baseMonitor.getActiveAlerts();
  }

  public acknowledgeAlert(alertId: string) {
    return this.baseMonitor.acknowledgeAlert(alertId);
  }

  public clearHistory() {
    this.baseMonitor.clearHistory();
  }
}

// Export singleton instance
export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();