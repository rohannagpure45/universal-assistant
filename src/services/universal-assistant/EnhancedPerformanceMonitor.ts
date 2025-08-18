/**
 * EnhancedPerformanceMonitor - Extended Performance Monitoring with Fallback Capabilities
 * 
 * Step 2.1 of Phase 4.2: Enhanced performance monitoring with fallback tracking,
 * model performance trends, and optimization recommendations.
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

export class EnhancedPerformanceMonitor extends PerformanceMonitor {
  // Enhanced monitoring data
  private extendedMetrics: PerformanceMetrics[] = [];
  private fallbackHistory: FallbackTracking[] = [];
  private resourceHistory: ResourceMonitoring[] = [];
  private performanceThresholds: Map<string, PerformanceThreshold> = new Map();
  private modelAnalytics: Map<AIModel, ModelPerformanceAnalysis> = new Map();
  private costData: APICall[] = [];
  private trends: Map<string, PerformanceTrend> = new Map();
  private optimizations: Map<string, PerformanceOptimization> = new Map();
  
  // Enhanced monitoring state
  private resourceMonitoringInterval: NodeJS.Timeout | null = null;
  private trendAnalysisInterval: NodeJS.Timeout | null = null;
  private fallbackTracker: Map<string, number> = new Map();
  private enhancedPerformanceScore: PerformanceScore | null = null;
  
  // Configuration
  private config: PerformanceMonitoringConfig;

  constructor(targetLatency: number = 350, config?: Partial<PerformanceMonitoringConfig>) {
    super(targetLatency);
    
    this.config = {
      enabled: true,
      metricsCollection: {
        interval: 5000,
        retention: 30,
        detailLevel: 'detailed'
      },
      alerting: {
        enabled: true,
        channels: ['email'],
        escalation: {
          warning: 15,
          critical: 5
        }
      },
      fallbackTracking: {
        enabled: true,
        trackReasons: true,
        trackImpact: true
      },
      resourceMonitoring: {
        enabled: true,
        interval: 10000,
        thresholds: {
          memoryWarning: 80,
          memoryCritical: 95,
          cpuWarning: 80,
          cpuCritical: 95,
          storageWarning: 85,
          storageCritical: 95
        }
      },
      reporting: {
        dailyReports: true,
        weeklyReports: true,
        monthlyReports: true,
        recipients: []
      },
      optimization: {
        autoOptimization: false,
        testingEnabled: true,
        rollbackThreshold: 10
      },
      ...config
    };
    
    this.initializeEnhancedThresholds();
  }

  /**
   * Initialize enhanced performance thresholds
   */
  private initializeEnhancedThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      {
        id: 'latency_p95',
        name: 'P95 Latency Threshold',
        metric: 'latency.p95',
        condition: 'greater_than',
        value: 500,
        unit: 'ms',
        severity: 'warning',
        enabled: true,
        cooldownMs: 30000,
        triggerCount: 3,
        notifications: { email: true }
      },
      {
        id: 'memory_usage',
        name: 'Memory Usage Threshold',
        metric: 'resources.memory.percentage',
        condition: 'greater_than',
        value: 85,
        unit: '%',
        severity: 'warning',
        enabled: true,
        cooldownMs: 60000,
        triggerCount: 2,
        notifications: { email: true }
      },
      {
        id: 'error_rate',
        name: 'Error Rate Threshold',
        metric: 'reliability.errorRate',
        condition: 'greater_than',
        value: 5,
        unit: '%',
        severity: 'error',
        enabled: true,
        cooldownMs: 30000,
        triggerCount: 1,
        notifications: { email: true, slack: true }
      },
      {
        id: 'fallback_rate',
        name: 'Fallback Rate Threshold',
        metric: 'fallback.rate',
        condition: 'greater_than',
        value: 20,
        unit: '%',
        severity: 'warning',
        enabled: true,
        cooldownMs: 60000,
        triggerCount: 2,
        notifications: { email: true }
      }
    ];

    defaultThresholds.forEach(threshold => {
      this.performanceThresholds.set(threshold.id, threshold);
    });
  }

  /**
   * Enhanced start monitoring with resource and trend tracking
   */
  public override startMonitoring(): void {
    super.startMonitoring();
    
    // Start resource monitoring if enabled
    if (this.config.resourceMonitoring.enabled) {
      this.resourceMonitoringInterval = setInterval(() => {
        this.collectResourceMetrics();
      }, this.config.resourceMonitoring.interval);
    }
    
    // Start trend analysis
    this.trendAnalysisInterval = setInterval(() => {
      this.analyzeTrends();
    }, 300000); // Every 5 minutes
  }

  /**
   * Enhanced stop monitoring
   */
  public override stopMonitoring(): void {
    super.stopMonitoring();
    
    if (this.resourceMonitoringInterval) {
      clearInterval(this.resourceMonitoringInterval);
      this.resourceMonitoringInterval = null;
    }
    
    if (this.trendAnalysisInterval) {
      clearInterval(this.trendAnalysisInterval);
      this.trendAnalysisInterval = null;
    }
  }

  /**
   * Record enhanced performance metrics
   */
  public recordEnhancedMetrics(metrics: PerformanceMetrics): void {
    this.extendedMetrics.push(metrics);
    
    // Maintain history size
    if (this.extendedMetrics.length > 10000) {
      this.extendedMetrics = this.extendedMetrics.slice(-10000);
    }
    
    // Update model analytics
    this.updateModelAnalytics(metrics);
    
    // Check performance thresholds
    this.checkEnhancedThresholds(metrics);
    
    // Update real-time performance score
    this.updateEnhancedPerformanceScore();
  }

  /**
   * Fallback tracking method for when primary metrics fail
   */
  public trackFallbackMetrics(context: {
    operation: string;
    startTime: number;
    endTime: number;
    success: boolean;
    error?: string;
  }): void {
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
    if (!this.config.fallbackTracking.enabled) return;
    
    this.fallbackHistory.push(fallback);
    
    // Maintain history size
    if (this.fallbackHistory.length > 10000) {
      this.fallbackHistory = this.fallbackHistory.slice(-10000);
    }
    
    // Track fallback frequency
    const key = `${fallback.originalModel}->${fallback.fallbackModel}`;
    this.fallbackTracker.set(key, (this.fallbackTracker.get(key) || 0) + 1);
    
    // Generate fallback alert if needed
    this.checkFallbackThresholds();
  }

  /**
   * Record cost data for correlation analysis
   */
  public recordCostData(apiCall: APICall): void {
    this.costData.push(apiCall);
    
    // Maintain history size
    if (this.costData.length > 10000) {
      this.costData = this.costData.slice(-10000);
    }
  }

  /**
   * Generate performance score with enhanced metrics
   */
  public getEnhancedPerformanceScore(): PerformanceScore | null {
    return this.enhancedPerformanceScore;
  }

  /**
   * Get performance trends for specific periods
   */
  public getPerformanceTrends(period?: PerformancePeriod): PerformanceTrend[] {
    if (period) {
      const trend = this.trends.get(period);
      return trend ? [trend] : [];
    }
    return Array.from(this.trends.values());
  }

  /**
   * Get model performance analytics
   */
  public getModelAnalytics(model?: AIModel): ModelPerformanceAnalysis[] {
    if (model) {
      const analysis = this.modelAnalytics.get(model);
      return analysis ? [analysis] : [];
    }
    return Array.from(this.modelAnalytics.values());
  }

  /**
   * Get fallback history
   */
  public getFallbackHistory(limit?: number): FallbackTracking[] {
    return limit ? this.fallbackHistory.slice(-limit) : [...this.fallbackHistory];
  }

  /**
   * Get resource metrics
   */
  public getResourceMetrics(limit?: number): ResourceMonitoring[] {
    return limit ? this.resourceHistory.slice(-limit) : [...this.resourceHistory];
  }

  /**
   * Get comprehensive performance analytics
   */
  public getPerformanceAnalytics(timeRange?: { start: number; end: number }): PerformanceAnalytics {
    const start = timeRange?.start || Date.now() - 86400000; // Last 24 hours
    const end = timeRange?.end || Date.now();
    
    const metrics = this.extendedMetrics.filter(m => m.timestamp >= start && m.timestamp <= end);
    const successfulRequests = metrics.filter(m => m.context.retryCount === 0).length;
    const failedRequests = metrics.length - successfulRequests;
    
    const latencies = metrics.map(m => m.latency.total);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    
    const throughput = metrics.length / ((end - start) / 1000); // requests per second
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
      trends: this.getPerformanceTrends(),
      scores: this.enhancedPerformanceScore || {
        overall: 0, 
        components: { latency: 0, throughput: 0, reliability: 0, efficiency: 0, quality: 0, resourceUsage: 0 },
        grade: 'F', 
        factors: { positive: [], negative: [] }, 
        recommendations: []
      },
      bottlenecks: this.identifyBottlenecks(metrics),
      costPerformanceCorrelation: this.calculateCostPerformanceCorrelation(metrics),
      alerts: {
        total: 0, // Would implement alert tracking
        bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
        recent: []
      },
      fallbacks: {
        total: this.fallbackHistory.length,
        successRate: this.calculateFallbackSuccessRate(),
        byReason: this.groupFallbacksByReason(),
        averageImpact: this.calculateAverageFallbackImpact()
      }
    };
  }

  /**
   * Get cost-performance correlation analysis
   */
  public getCostPerformanceCorrelation(period?: PerformancePeriod): CostPerformanceCorrelation {
    const now = Date.now();
    let duration: number;
    
    switch (period) {
      case 'hour': duration = 3600000; break;
      case 'day': duration = 86400000; break;
      case 'week': duration = 604800000; break;
      case 'month': duration = 2592000000; break;
      default: duration = 86400000; // Default to day
    }
    
    const startTime = now - duration;
    const periodCosts = this.costData.filter(c => c.timestamp.getTime() >= startTime);
    const periodMetrics = this.extendedMetrics.filter(m => m.timestamp >= startTime);
    
    const totalCost = periodCosts.reduce((sum, c) => sum + c.cost, 0);
    const totalRequests = periodMetrics.length;
    const averageLatency = periodMetrics.reduce((sum, m) => sum + m.latency.total, 0) / totalRequests || 0;
    const costPerRequest = totalCost / Math.max(totalRequests, 1);
    const costPerMillisecond = totalCost / Math.max(averageLatency * totalRequests, 1);
    const performanceScore = this.enhancedPerformanceScore?.overall || 0;
    
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
      recommendations: this.generateCostPerformanceRecommendations(periodCosts, periodMetrics)
    };
  }

  /**
   * Generate intelligent optimization plan
   */
  public generateOptimizationPlan(): PerformanceOptimization[] {
    const optimizations: PerformanceOptimization[] = [];
    const score = this.getEnhancedPerformanceScore();
    
    if (!score) return [];

    // Latency optimization
    if (score.components.latency < 70) {
      optimizations.push({
        id: nanoid(),
        name: 'Latency Optimization',
        description: 'Comprehensive latency reduction plan',
        category: 'processing',
        status: 'proposed',
        baseline: this.getBaselineMetrics(),
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

    // Cache optimization
    if (score.components.efficiency < 60) {
      optimizations.push({
        id: nanoid(),
        name: 'Cache Strategy Optimization',
        description: 'Improve caching efficiency and hit rates',
        category: 'caching',
        status: 'proposed',
        baseline: this.getBaselineMetrics(),
        target: {
          latencyImprovement: 20,
          throughputImprovement: 25,
          errorRateReduction: 0,
          costReduction: 15
        },
        implementation: {
          config: {
            cacheTTL: 3600,
            cacheSize: '1GB',
            preloadStrategy: 'predictive'
          },
          dependencies: ['cache-infrastructure']
        },
        testing: {
          testPlan: [
            'Monitor cache hit rates',
            'Test cache invalidation',
            'Verify memory usage'
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
   * Emergency performance assessment when all monitoring fails
   */
  public emergencyPerformanceCheck(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Basic health checks
    const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    if (memoryUsage > 90) {
      issues.push('High memory usage');
      recommendations.push('Restart service or clear cache');
    }
    
    // Check if monitoring is working
    const recentMetrics = this.extendedMetrics.filter(m => 
      Date.now() - m.timestamp < 300000 // Last 5 minutes
    );
    
    if (recentMetrics.length === 0) {
      issues.push('No recent performance data');
      recommendations.push('Check monitoring system');
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

  // Private helper methods
  private updateModelAnalytics(metrics: PerformanceMetrics): void {
    const model = metrics.context.modelUsed;
    let analysis = this.modelAnalytics.get(model);
    
    if (!analysis) {
      analysis = {
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

  private checkEnhancedThresholds(metrics: PerformanceMetrics): void {
    for (const threshold of this.performanceThresholds.values()) {
      if (!threshold.enabled) continue;
      
      const value = this.getEnhancedMetricValue(metrics, threshold.metric);
      const violated = this.evaluateThreshold(value, threshold);
      
      if (violated) {
        this.triggerEnhancedAlert(threshold, metrics, value);
      }
    }
  }

  private updateEnhancedPerformanceScore(): void {
    const recentMetrics = this.extendedMetrics.slice(-100); // Last 100 requests
    if (recentMetrics.length === 0) return;
    
    const latencies = recentMetrics.map(m => m.latency.total);
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const errorRate = recentMetrics.filter(m => m.context.retryCount > 0).length / recentMetrics.length;
    
    // Calculate component scores
    const latencyScore = Math.max(0, 100 - (averageLatency - 350) / 350 * 100);
    const throughputScore = this.calculateThroughputScore(recentMetrics);
    const reliabilityScore = (1 - errorRate) * 100;
    const efficiencyScore = this.calculateEfficiencyScore(recentMetrics);
    const qualityScore = this.calculateQualityScore(recentMetrics);
    const resourceScore = this.calculateResourceScore();
    
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
    
    // Generate factors and recommendations
    const factors = this.analyzePerformanceFactors(recentMetrics);
    const recommendations = this.generateEnhancedRecommendations(recentMetrics);
    
    this.enhancedPerformanceScore = {
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
      factors,
      recommendations
    };
  }

  private async collectResourceMetrics(): Promise<void> {
    try {
      const resourceMetrics: ResourceMonitoring = {
        timestamp: Date.now(),
        system: {
          memory: {
            total: process.memoryUsage().heapTotal,
            used: process.memoryUsage().heapUsed,
            free: process.memoryUsage().heapTotal - process.memoryUsage().heapUsed,
            percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
            swapUsed: 0
          },
          cpu: {
            percentage: 0, // Would implement actual CPU monitoring
            loadAverage: [0, 0, 0],
            cores: require('os').cpus().length,
            processes: 0
          },
          network: {
            bytesReceived: 0,
            bytesSent: 0,
            packetsReceived: 0,
            packetsSent: 0,
            connectionsActive: 0
          },
          storage: {
            totalSpace: 0,
            usedSpace: 0,
            freeSpace: 0,
            percentage: 0
          }
        },
        application: {
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          activeConnections: 0,
          pendingRequests: 0,
          cacheSize: 0,
          sessionCount: 0
        },
        thresholds: this.config.resourceMonitoring.thresholds
      };
      
      this.resourceHistory.push(resourceMetrics);
      
      // Maintain history size
      if (this.resourceHistory.length > 10000) {
        this.resourceHistory = this.resourceHistory.slice(-10000);
      }
      
    } catch (error) {
      console.error('Failed to collect resource metrics:', error);
    }
  }

  private analyzeTrends(): void {
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

  private calculateTrend(metrics: PerformanceMetrics[], period: string): PerformanceTrend {
    const latencies = metrics.map(m => m.latency.total);
    const fallbacks = metrics.filter(m => m.context.fallbackUsed);
    
    // Calculate latency percentiles
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0;
    const throughput = metrics.length / (metrics[metrics.length - 1]?.timestamp - metrics[0]?.timestamp || 1) * 1000;
    const errorRate = metrics.filter(m => m.context.retryCount > 0).length / metrics.length;
    const successRate = 1 - errorRate;
    
    // Calculate scores
    const latencyScore = Math.max(0, 100 - (averageLatency - 350) / 350 * 100);
    const reliabilityScore = successRate * 100;
    const efficiencyScore = 80; // Placeholder
    const qualityScore = 85; // Placeholder
    const overallScore = (latencyScore * 0.3 + reliabilityScore * 0.3 + efficiencyScore * 0.2 + qualityScore * 0.2);
    
    // Calculate fallback analysis
    const fallbacksByReason: Record<string, number> = {};
    fallbacks.forEach(m => {
      const reason = m.context.fallbackReason || 'unknown';
      fallbacksByReason[reason] = (fallbacksByReason[reason] || 0) + 1;
    });
    
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
        total: fallbacks.length,
        byReason: fallbacksByReason,
        impactOnLatency: 0 // Would calculate actual impact
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

  // Additional helper methods with simplified implementations
  private getEnhancedMetricValue(metrics: PerformanceMetrics, metricPath: string): number {
    const path = metricPath.split('.');
    let value: any = metrics;
    for (const key of path) {
      value = value?.[key];
      if (value === undefined) return 0;
    }
    return typeof value === 'number' ? value : 0;
  }

  private evaluateThreshold(value: number, threshold: PerformanceThreshold): boolean {
    switch (threshold.condition) {
      case 'greater_than': return value > threshold.value;
      case 'less_than': return value < threshold.value;
      case 'equals': return value === threshold.value;
      case 'not_equals': return value !== threshold.value;
      default: return false;
    }
  }

  private triggerEnhancedAlert(threshold: PerformanceThreshold, metrics: PerformanceMetrics, value: number): void {
    // Would implement actual alerting
    console.warn(`Performance Alert: ${threshold.name} - ${threshold.metric} (${value}) exceeded threshold (${threshold.value})`);
  }

  private checkFallbackThresholds(): void {
    const recentFallbacks = this.fallbackHistory.filter(f => 
      Date.now() - f.timestamp < 300000 // Last 5 minutes
    );
    
    const fallbackRate = recentFallbacks.length / Math.max(this.extendedMetrics.filter(m => 
      Date.now() - m.timestamp < 300000
    ).length, 1);
    
    if (fallbackRate > 0.2) { // 20% fallback rate
      console.warn(`High fallback rate detected: ${Math.round(fallbackRate * 100)}%`);
    }
  }

  private calculateThroughputScore(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 100;
    
    const timeSpan = metrics[metrics.length - 1].timestamp - metrics[0].timestamp;
    const throughput = (metrics.length / timeSpan) * 1000; // requests per second
    
    // Normalize against expected throughput (10 RPS baseline)
    const expectedThroughput = 10;
    return Math.min(100, (throughput / expectedThroughput) * 100);
  }

  private calculateEfficiencyScore(metrics: PerformanceMetrics[]): number {
    const cacheHitRate = metrics.filter(m => m.context.cacheHit).length / metrics.length;
    const resourceEfficiency = 80; // Would calculate based on actual resource usage
    return (cacheHitRate * 40 + resourceEfficiency * 0.6);
  }

  private calculateQualityScore(metrics: PerformanceMetrics[]): number {
    const qualityMetrics = metrics.filter(m => m.quality.transcriptionAccuracy !== undefined);
    if (qualityMetrics.length === 0) return 85; // Default score
    
    const avgAccuracy = qualityMetrics.reduce((sum, m) => sum + (m.quality.transcriptionAccuracy || 0), 0) / qualityMetrics.length;
    const avgRelevance = qualityMetrics.reduce((sum, m) => sum + (m.quality.responseRelevance || 0), 0) / qualityMetrics.length;
    
    return (avgAccuracy + avgRelevance) / 2;
  }

  private calculateResourceScore(): number {
    if (this.resourceHistory.length === 0) return 85;
    
    const latest = this.resourceHistory[this.resourceHistory.length - 1];
    const memoryScore = 100 - latest.system.memory.percentage;
    const cpuScore = 100 - latest.system.cpu.percentage;
    const storageScore = 100 - latest.system.storage.percentage;
    
    return (memoryScore + cpuScore + storageScore) / 3;
  }

  private analyzePerformanceFactors(metrics: PerformanceMetrics[]): { positive: string[]; negative: string[] } {
    const positive: string[] = [];
    const negative: string[] = [];
    
    const avgLatency = metrics.reduce((sum, m) => sum + m.latency.total, 0) / metrics.length;
    const cacheHitRate = metrics.filter(m => m.context.cacheHit).length / metrics.length;
    const errorRate = metrics.filter(m => m.context.retryCount > 0).length / metrics.length;
    
    if (avgLatency < 350) {
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

  private generateEnhancedRecommendations(metrics: PerformanceMetrics[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    
    const avgLatency = metrics.reduce((sum, m) => sum + m.latency.total, 0) / metrics.length;
    const cacheHitRate = metrics.filter(m => m.context.cacheHit).length / metrics.length;
    
    if (avgLatency > 350) {
      recommendations.push({
        id: nanoid(),
        type: 'optimization',
        priority: 'high',
        category: 'latency',
        title: 'Optimize Response Latency',
        description: `Average latency (${Math.round(avgLatency)}ms) exceeds target (350ms)`,
        impact: {
          latencyImprovement: avgLatency - 350
        },
        implementation: {
          effort: 'medium',
          timeEstimate: '1-2 days',
          resources: ['Engineering', 'DevOps'],
          risks: ['Potential quality impact']
        },
        actionItems: [
          'Profile slow components',
          'Optimize AI model selection',
          'Implement response caching'
        ],
        measurability: {
          beforeMetrics: ['Average latency', 'P95 latency'],
          afterMetrics: ['Improved latency', 'Maintained quality'],
          successCriteria: ['Latency under 350ms']
        }
      });
    }
    
    if (cacheHitRate < 0.5) {
      recommendations.push({
        id: nanoid(),
        type: 'optimization',
        priority: 'medium',
        category: 'latency',
        title: 'Improve Cache Strategy',
        description: `Low cache hit rate (${Math.round(cacheHitRate * 100)}%) indicates inefficient caching`,
        impact: {
          latencyImprovement: 50,
          costSavings: 20
        },
        implementation: {
          effort: 'low',
          timeEstimate: '4-8 hours',
          resources: ['Engineering'],
          risks: ['Memory usage increase']
        },
        actionItems: [
          'Analyze cache patterns',
          'Optimize cache keys',
          'Increase cache TTL where appropriate'
        ],
        measurability: {
          beforeMetrics: ['Cache hit rate', 'Response time'],
          afterMetrics: ['Improved hit rate', 'Reduced latency'],
          successCriteria: ['Cache hit rate > 70%']
        }
      });
    }
    
    return recommendations;
  }

  private getBaselineMetrics(): PerformanceOptimization['baseline'] {
    const recentMetrics = this.extendedMetrics.slice(-100);
    const latencies = recentMetrics.map(m => m.latency.total);
    const errors = recentMetrics.filter(m => m.context.retryCount > 0);
    
    return {
      metrics: recentMetrics,
      averageLatency: latencies.reduce((sum, l) => sum + l, 0) / latencies.length || 0,
      throughput: recentMetrics.length / 100,
      errorRate: errors.length / recentMetrics.length,
      cost: 0
    };
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
        recommendations: this.getEnhancedBottleneckRecommendations(component)
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);
  }

  private getEnhancedBottleneckRecommendations(component: string): string[] {
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

  private calculateCostPerformanceCorrelation(metrics: PerformanceMetrics[]): {
    costPerRequest: number;
    performancePerDollar: number;
    optimalModels: Array<{ model: AIModel; score: number; reasoning: string }>;
  } {
    const recentCosts = this.costData.slice(-metrics.length);
    const totalCost = recentCosts.reduce((sum, c) => sum + c.cost, 0);
    const costPerRequest = totalCost / Math.max(metrics.length, 1);
    const performanceScore = this.enhancedPerformanceScore?.overall || 0;
    const performancePerDollar = performanceScore / Math.max(costPerRequest, 0.001);
    
    return {
      costPerRequest,
      performancePerDollar,
      optimalModels: []
    };
  }

  private calculateFallbackSuccessRate(): number {
    if (this.fallbackHistory.length === 0) return 1;
    return this.fallbackHistory.filter(f => f.success).length / this.fallbackHistory.length;
  }

  private groupFallbacksByReason(): Record<string, number> {
    const grouped: Record<string, number> = {};
    this.fallbackHistory.forEach(f => {
      grouped[f.reason] = (grouped[f.reason] || 0) + 1;
    });
    return grouped;
  }

  private calculateAverageFallbackImpact(): number {
    if (this.fallbackHistory.length === 0) return 0;
    return this.fallbackHistory.reduce((sum, f) => sum + f.impact.latencyChange, 0) / this.fallbackHistory.length;
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

  private generateCostPerformanceRecommendations(costs: APICall[], metrics: PerformanceMetrics[]): CostPerformanceCorrelation['recommendations'] {
    return {
      modelSwitching: [],
      optimizations: []
    };
  }

  // Event handlers for enhanced monitoring
  public onEnhancedAlert?: (alert: PerformanceAlert) => void;
  public onResourceAlert?: (alert: PerformanceAlert) => void;
  public onTrendChange?: (trend: PerformanceTrend) => void;
  public onOptimizationRecommendation?: (optimization: PerformanceOptimization) => void;
}

// Export enhanced monitor instance
export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();