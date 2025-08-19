/**
 * PerformanceMonitor - Real-time Performance Tracking
 * 
 * Monitors and reports on system performance metrics to ensure sub-500ms latency goals
 * and provides real-time insights into system bottlenecks and optimization opportunities.
 */

import { LatencyMetrics, PipelineError } from './RealtimeAudioPipeline';
import { nanoid } from 'nanoid';
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
  TrendDirection,
  PerformanceRecommendation
} from '@/types/performance';
import { AIModel } from '@/types';
import { APICall, CostBreakdown } from '@/types/cost';

export interface PerformanceReport {
  id: string;
  timestamp: number;
  period: {
    start: number;
    end: number;
    duration: number;
  };
  latencyStats: LatencyStatistics;
  throughputStats: ThroughputStatistics;
  errorStats: ErrorStatistics;
  bottleneckAnalysis: BottleneckAnalysis;
  recommendations: PerformanceRecommendation[];
  score: PerformanceScore;
}

export interface LatencyStatistics {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  standardDeviation: number;
  targetAchievementRate: number; // Percentage of requests meeting target
  stageBreakdown: Record<string, number>;
}

export interface ThroughputStatistics {
  requestsPerSecond: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  peakThroughput: number;
  throughputTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface ErrorStatistics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  criticalErrors: number;
  recoverableErrors: number;
  averageRecoveryTime: number;
}

export interface BottleneckAnalysis {
  primaryBottleneck: string;
  bottleneckSeverity: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: string[];
  impactOnLatency: number;
  suggestedActions: string[];
}

// Removed local PerformanceScore and PerformanceRecommendation - using imported types from @/types/performance

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: LatencyMetrics[]) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  cooldownMs: number;
  enabled: boolean;
}

export class PerformanceMonitor {
  private metricsHistory: LatencyMetrics[] = [];
  private errorHistory: PipelineError[] = [];
  private reports: PerformanceReport[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  
  // Enhanced monitoring data
  private enhancedMetrics: PerformanceMetrics[] = [];
  private fallbackHistory: FallbackTracking[] = [];
  private resourceHistory: ResourceMonitoring[] = [];
  private performanceThresholds: Map<string, PerformanceThreshold> = new Map();
  private modelAnalytics: Map<AIModel, ModelPerformanceAnalysis> = new Map();
  private costData: APICall[] = [];
  private optimizations: Map<string, PerformanceOptimization> = new Map();
  private trends: Map<string, PerformanceTrend> = new Map();
  
  // Configuration
  private reportingInterval: number = 60000; // 1 minute
  private maxHistorySize: number = 10000;
  private targetLatency: number = 350;
  private maxLatency: number = 500;
  private config: PerformanceMonitoringConfig;
  
  // Enhanced monitoring state
  private resourceMonitoringInterval: NodeJS.Timeout | null = null;
  private trendAnalysisInterval: NodeJS.Timeout | null = null;
  private fallbackTracker: Map<string, number> = new Map();
  private performanceScore: PerformanceScore | null = null;
  
  // Monitoring state
  private isMonitoring: boolean = false;
  private reportingTimer: NodeJS.Timeout | null = null;

  constructor(targetLatency: number = 350, config?: Partial<PerformanceMonitoringConfig>) {
    this.targetLatency = targetLatency;
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
    
    this.initializeDefaultAlertRules();
    this.initializePerformanceThresholds();
  }

  /**
   * Initialize performance thresholds
   */
  private initializePerformanceThresholds(): void {
    this.performanceThresholds.set('latency', {
      id: 'latency_threshold',
      name: 'Latency Threshold',
      metric: 'latency',
      condition: 'greater_than',
      value: this.targetLatency,
      unit: 'ms',
      severity: 'warning',
      enabled: true,
      cooldownMs: 60000,
      triggerCount: 3,
      notifications: {
        email: false,
        slack: false
      }
    });
    
    this.performanceThresholds.set('max_latency', {
      id: 'max_latency_threshold',
      name: 'Maximum Latency Threshold',
      metric: 'latency',
      condition: 'greater_than',
      value: this.maxLatency,
      unit: 'ms',
      severity: 'critical',
      enabled: true,
      cooldownMs: 30000,
      triggerCount: 1,
      notifications: {
        email: true,
        slack: true
      }
    });
    
    this.performanceThresholds.set('error_rate', {
      id: 'error_rate_threshold',
      name: 'Error Rate Threshold',
      metric: 'error_rate',
      condition: 'greater_than',
      value: 0.05,
      unit: 'percentage',
      severity: 'warning',
      enabled: true,
      cooldownMs: 120000,
      triggerCount: 5,
      notifications: {
        email: false,
        slack: false
      }
    });
    
    this.performanceThresholds.set('throughput', {
      id: 'throughput_threshold',
      name: 'Throughput Threshold',
      metric: 'throughput',
      condition: 'less_than',
      value: 10,
      unit: 'requests/second',
      severity: 'info',
      enabled: true,
      cooldownMs: 180000,
      triggerCount: 10,
      notifications: {
        email: false,
        slack: false
      }
    });
  }

  /**
   * Check resource thresholds
   */
  private checkResourceThresholds(metrics: ResourceMonitoring): void {
    const thresholds = this.config.resourceMonitoring.thresholds;
    
    // Check memory thresholds
    if (metrics.system.memory.percentage > thresholds.memoryCritical) {
      this.triggerResourceAlert('critical', 'Memory usage critical', metrics);
    } else if (metrics.system.memory.percentage > thresholds.memoryWarning) {
      this.triggerResourceAlert('warning', 'Memory usage high', metrics);
    }
    
    // Check CPU thresholds
    if (metrics.system.cpu.percentage > thresholds.cpuCritical) {
      this.triggerResourceAlert('critical', 'CPU usage critical', metrics);
    } else if (metrics.system.cpu.percentage > thresholds.cpuWarning) {
      this.triggerResourceAlert('warning', 'CPU usage high', metrics);
    }
  }

  /**
   * Trigger resource alert
   */
  private triggerResourceAlert(severity: 'warning' | 'critical', message: string, metrics: ResourceMonitoring): void {
    const alert: PerformanceAlert = {
      id: nanoid(),
      timestamp: Date.now(),
      type: 'threshold',
      severity,
      component: 'resource',
      title: message,
      message,
      metrics: {
        id: nanoid(),
        timestamp: metrics.timestamp,
        latency: {
          total: 0,
          stages: {
            audioCapture: 0,
            speechToText: 0,
            textProcessing: 0,
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
            used: metrics.system.memory.used,
            available: metrics.system.memory.free,
            percentage: metrics.system.memory.percentage
          },
          cpu: {
            usage: metrics.system.cpu.percentage,
            cores: metrics.system.cpu.cores
          },
          network: {
            bytesIn: metrics.system.network.bytesReceived,
            bytesOut: metrics.system.network.bytesSent,
            bandwidth: 0
          }
        },
        quality: {},
        context: {
          modelUsed: 'gpt-4o' as AIModel,
          fallbackUsed: false,
          fallbackReason: undefined,
          retryCount: 0,
          cacheHit: false
        }
      },
      impact: {
        affectedUsers: 0,
        businessImpact: severity === 'critical' ? 'high' : 'medium',
        estimatedDuration: severity === 'critical' ? '1 hour' : '30 minutes'
      },
      resolution: {
        status: 'new',
        notes: undefined,
        resolvedAt: undefined,
        resolutionTime: undefined
      }
    };
    
    this.onResourceAlert?.(alert);
  }

  /**
   * Record enhanced metrics
   */
  public recordEnhancedMetrics(metrics: PerformanceMetrics): void {
    this.enhancedMetrics.push(metrics);
    
    // Maintain history size
    if (this.enhancedMetrics.length > this.maxHistorySize) {
      this.enhancedMetrics = this.enhancedMetrics.slice(-this.maxHistorySize);
    }
    
    // Update model analytics
    if (metrics.context.modelUsed) {
      this.updateModelAnalytics(metrics.context.modelUsed, metrics);
    }
    
    // Track fallbacks
    if (metrics.context.fallbackUsed) {
      this.trackFallback(metrics);
    }
  }

  /**
   * Update model analytics
   */
  private updateModelAnalytics(model: AIModel, metrics: PerformanceMetrics): void {
    const existing = this.modelAnalytics.get(model);
    
    if (!existing) {
      this.modelAnalytics.set(model, {
        model,
        period: {
          start: Date.now() - 3600000,
          end: Date.now()
        },
        usage: {
          totalRequests: 1,
          successfulRequests: metrics.context.retryCount === 0 ? 1 : 0,
          failedRequests: metrics.context.retryCount > 0 ? 1 : 0,
          fallbackRequests: metrics.context.fallbackUsed ? 1 : 0
        },
        performance: {
          averageLatency: metrics.latency.total,
          p50Latency: metrics.latency.total,
          p95Latency: metrics.latency.total,
          p99Latency: metrics.latency.total,
          minLatency: metrics.latency.total,
          maxLatency: metrics.latency.total,
          reliabilityScore: metrics.context.retryCount === 0 ? 100 : 50,
          qualityScore: 85
        },
        cost: {
          totalCost: 0,
          averageCostPerRequest: 0,
          costPerToken: 0,
          efficiency: 1
        },
        trends: {
          latencyTrend: 'stable',
          reliabilityTrend: 'stable',
          costTrend: 'stable'
        },
        recommendations: {
          continue: true,
          alternatives: [],
          optimizations: []
        }
      });
    } else {
      // Update existing analytics
      existing.usage.totalRequests++;
      if (metrics.context.retryCount === 0) {
        existing.usage.successfulRequests++;
      } else {
        existing.usage.failedRequests++;
      }
      if (metrics.context.fallbackUsed) {
        existing.usage.fallbackRequests++;
      }
      
      // Update performance metrics
      existing.performance.averageLatency = (existing.performance.averageLatency * (existing.usage.totalRequests - 1) + metrics.latency.total) / existing.usage.totalRequests;
      existing.performance.minLatency = Math.min(existing.performance.minLatency, metrics.latency.total);
      existing.performance.maxLatency = Math.max(existing.performance.maxLatency, metrics.latency.total);
      
      // Update period
      existing.period.end = Date.now();
    }
  }

  /**
   * Track fallback usage
   */
  private trackFallback(metrics: PerformanceMetrics): void {
    const fallback: FallbackTracking = {
      id: nanoid(),
      timestamp: metrics.timestamp,
      originalModel: metrics.context.modelUsed || 'gpt-4o' as AIModel,
      fallbackModel: 'gpt-4o-mini' as AIModel,
      reason: (metrics.context.fallbackReason as any) || 'error',
      trigger: {
        errorType: 'unknown',
        latency: metrics.latency.total
      },
      impact: {
        latencyChange: metrics.latency.total - this.targetLatency,
        costChange: 0,
        qualityChange: 0,
        userExperience: metrics.latency.total > this.maxLatency ? 'degraded' : 'neutral'
      },
      success: metrics.context.retryCount === 0,
      fallbackLatency: metrics.latency.total
    };
    
    this.fallbackHistory.push(fallback);
    
    // Maintain history size
    if (this.fallbackHistory.length > this.maxHistorySize) {
      this.fallbackHistory = this.fallbackHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_latency',
        name: 'High Latency Alert',
        condition: (metrics) => {
          const recent = metrics.slice(-5);
          return recent.length >= 5 && recent.every(m => m.totalLatency > this.maxLatency);
        },
        severity: 'error',
        message: 'System consistently exceeding maximum latency threshold',
        cooldownMs: 60000,
        enabled: true
      },
      {
        id: 'latency_spike',
        name: 'Latency Spike Alert',
        condition: (metrics) => {
          if (metrics.length < 10) return false;
          const recent = metrics.slice(-5);
          const baseline = metrics.slice(-15, -5);
          const recentAvg = recent.reduce((sum, m) => sum + m.totalLatency, 0) / recent.length;
          const baselineAvg = baseline.reduce((sum, m) => sum + m.totalLatency, 0) / baseline.length;
          return recentAvg > baselineAvg * 1.5;
        },
        severity: 'warning',
        message: 'Latency spike detected - recent latency 50% higher than baseline',
        cooldownMs: 30000,
        enabled: true
      },
      {
        id: 'poor_performance',
        name: 'Poor Performance Alert',
        condition: (metrics) => {
          const recent = metrics.slice(-20);
          if (recent.length < 20) return false;
          const targetAchievementRate = recent.filter(m => m.totalLatency <= this.targetLatency).length / recent.length;
          return targetAchievementRate < 0.5; // Less than 50% meeting target
        },
        severity: 'warning',
        message: 'Less than 50% of requests meeting target latency',
        cooldownMs: 120000,
        enabled: true
      },
      {
        id: 'critical_latency',
        name: 'Critical Latency Alert',
        condition: (metrics) => {
          const latest = metrics[metrics.length - 1];
          return latest && latest.totalLatency > this.maxLatency * 2;
        },
        severity: 'critical',
        message: 'Critical latency detected - over 2x maximum threshold',
        cooldownMs: 0, // No cooldown for critical alerts
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Start monitoring performance metrics
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Start periodic reporting
    this.reportingTimer = setInterval(() => {
      this.generatePerformanceReport();
    }, this.reportingInterval);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }
  }

  /**
   * Record latency metrics
   */
  public recordLatencyMetrics(metrics: LatencyMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Maintain history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    // Check alert rules
    this.checkAlertRules();
  }

  /**
   * Record error
   */
  public recordError(error: PipelineError): void {
    this.errorHistory.push(error);
    
    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Check alert rules against current metrics
   */
  private checkAlertRules(): void {
    const now = Date.now();
    
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0;
      if (now - lastAlertTime < rule.cooldownMs) continue;
      
      // Check condition
      if (rule.condition(this.metricsHistory)) {
        this.triggerAlert(rule);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule): void {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    
    // Convert LatencyMetrics to PerformanceMetrics for the alert
    const performanceMetrics: PerformanceMetrics = {
      id: nanoid(),
      timestamp: latestMetrics.timestamp,
      latency: {
        total: latestMetrics.totalLatency,
        stages: {
          audioCapture: 0,
          speechToText: latestMetrics.audioToTranscription,
          textProcessing: latestMetrics.transcriptionToAnalysis,
          aiResponse: latestMetrics.analysisToResponse,
          textToSpeech: latestMetrics.responseToAudio,
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
          used: this.getHeapUsed(),
          available: this.getHeapTotal() - this.getHeapUsed(),
          percentage: (this.getHeapUsed() / this.getHeapTotal()) * 100
        },
        cpu: {
          usage: 0,
          cores: this.getSystemCores()
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
        fallbackUsed: false,
        fallbackReason: undefined,
        retryCount: 0,
        cacheHit: false
      }
    };

    const alert: PerformanceAlert = {
      id: nanoid(),
      timestamp: Date.now(),
      type: 'threshold',
      severity: rule.severity,
      component: 'latency',
      title: rule.name,
      message: rule.message,
      metrics: performanceMetrics,
      impact: {
        affectedUsers: 0,
        businessImpact: rule.severity === 'critical' ? 'high' : rule.severity === 'error' ? 'medium' : 'low',
        estimatedDuration: '30 minutes'
      },
      resolution: {
        status: 'new',
        notes: undefined,
        resolvedAt: undefined,
        resolutionTime: undefined
      }
    };

    this.activeAlerts.set(alert.id, alert);
    this.lastAlertTimes.set(rule.id, alert.timestamp);

    // Emit alert event (would be connected to notification system)
    this.onAlert?.(alert);
    this.onPerformanceAlert?.(alert);
  }

  /**
   * Generate comprehensive performance report
   */
  public generatePerformanceReport(timeRange?: { start: number; end: number }): PerformanceReport {
    const now = Date.now();
    const start = timeRange?.start || (now - this.reportingInterval);
    const end = timeRange?.end || now;
    
    // Filter metrics for time range
    const periodMetrics = this.metricsHistory.filter(m => 
      m.timestamp >= start && m.timestamp <= end
    );
    
    const periodErrors = this.errorHistory.filter(e => 
      e.timestamp >= start && e.timestamp <= end
    );

    const report: PerformanceReport = {
      id: nanoid(),
      timestamp: now,
      period: { start, end, duration: end - start },
      latencyStats: this.calculateLatencyStatistics(periodMetrics),
      throughputStats: this.calculateThroughputStatistics(periodMetrics, end - start),
      errorStats: this.calculateErrorStatistics(periodErrors),
      bottleneckAnalysis: this.analyzeBottlenecks(periodMetrics),
      recommendations: this.generateRecommendations(periodMetrics, periodErrors),
      score: this.calculatePerformanceScore(periodMetrics, periodErrors)
    };

    this.reports.push(report);
    
    // Maintain report history
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100);
    }

    return report;
  }

  /**
   * Calculate latency statistics
   */
  private calculateLatencyStatistics(metrics: LatencyMetrics[]): LatencyStatistics {
    if (metrics.length === 0) {
      return {
        mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0,
        standardDeviation: 0, targetAchievementRate: 0,
        stageBreakdown: {}
      };
    }

    const latencies = metrics.map(m => m.totalLatency).sort((a, b) => a - b);
    const mean = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const median = latencies[Math.floor(latencies.length / 2)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    
    // Calculate standard deviation
    const variance = latencies.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / latencies.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate target achievement rate
    const targetAchievementRate = latencies.filter(l => l <= this.targetLatency).length / latencies.length;
    
    // Calculate stage breakdown
    const stageBreakdown = {
      audioToTranscription: metrics.reduce((sum, m) => sum + m.audioToTranscription, 0) / metrics.length,
      transcriptionToAnalysis: metrics.reduce((sum, m) => sum + m.transcriptionToAnalysis, 0) / metrics.length,
      analysisToResponse: metrics.reduce((sum, m) => sum + m.analysisToResponse, 0) / metrics.length,
      responseToAudio: metrics.reduce((sum, m) => sum + m.responseToAudio, 0) / metrics.length
    };

    return {
      mean, median, p95, p99, min, max, standardDeviation,
      targetAchievementRate, stageBreakdown
    };
  }

  /**
   * Calculate throughput statistics
   */
  private calculateThroughputStatistics(metrics: LatencyMetrics[], durationMs: number): ThroughputStatistics {
    const completedRequests = metrics.length;
    const requestsPerSecond = completedRequests / (durationMs / 1000);
    const averageProcessingTime = metrics.length > 0 ? 
      metrics.reduce((sum, m) => sum + m.totalLatency, 0) / metrics.length : 0;
    
    // Calculate peak throughput (max requests in any 10-second window)
    const windowSize = 10000; // 10 seconds
    let peakThroughput = 0;
    for (let i = 0; i < metrics.length; i++) {
      const windowStart = metrics[i].timestamp;
      const windowEnd = windowStart + windowSize;
      const windowRequests = metrics.filter(m => 
        m.timestamp >= windowStart && m.timestamp < windowEnd
      ).length;
      peakThroughput = Math.max(peakThroughput, windowRequests / 10);
    }
    
    // Determine throughput trend
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
    const firstHalfThroughput = firstHalf.length / (durationMs / 2000);
    const secondHalfThroughput = secondHalf.length / (durationMs / 2000);
    
    let throughputTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (secondHalfThroughput > firstHalfThroughput * 1.1) {
      throughputTrend = 'increasing';
    } else if (secondHalfThroughput < firstHalfThroughput * 0.9) {
      throughputTrend = 'decreasing';
    }

    return {
      requestsPerSecond,
      completedRequests,
      failedRequests: 0, // Would need to track failed requests separately
      averageProcessingTime,
      peakThroughput,
      throughputTrend
    };
  }

  /**
   * Calculate error statistics
   */
  private calculateErrorStatistics(errors: PipelineError[]): ErrorStatistics {
    const totalErrors = errors.length;
    const errorRate = totalErrors / Math.max(this.metricsHistory.length, 1);
    
    const errorsByType: Record<string, number> = {};
    errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });
    
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const recoverableErrors = errors.filter(e => e.severity === 'low' || e.severity === 'medium').length;
    
    // Calculate average recovery time (placeholder - would need actual recovery tracking)
    const averageRecoveryTime = 1000; // 1 second placeholder

    return {
      totalErrors,
      errorRate,
      errorsByType,
      criticalErrors,
      recoverableErrors,
      averageRecoveryTime
    };
  }

  /**
   * Analyze system bottlenecks
   */
  private analyzeBottlenecks(metrics: LatencyMetrics[]): BottleneckAnalysis {
    if (metrics.length === 0) {
      return {
        primaryBottleneck: 'insufficient_data',
        bottleneckSeverity: 'low',
        contributingFactors: [],
        impactOnLatency: 0,
        suggestedActions: []
      };
    }

    // Calculate average times for each stage
    const stageAverages = {
      audioToTranscription: metrics.reduce((sum, m) => sum + m.audioToTranscription, 0) / metrics.length,
      transcriptionToAnalysis: metrics.reduce((sum, m) => sum + m.transcriptionToAnalysis, 0) / metrics.length,
      analysisToResponse: metrics.reduce((sum, m) => sum + m.analysisToResponse, 0) / metrics.length,
      responseToAudio: metrics.reduce((sum, m) => sum + m.responseToAudio, 0) / metrics.length
    };

    // Find the slowest stage
    const [primaryBottleneck, maxTime] = Object.entries(stageAverages)
      .reduce((max, [stage, time]) => time > max[1] ? [stage, time] : max, ['', 0]);

    // Determine severity
    let bottleneckSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const impactOnLatency = maxTime;
    
    if (maxTime > this.targetLatency * 0.5) {
      bottleneckSeverity = 'critical';
    } else if (maxTime > this.targetLatency * 0.3) {
      bottleneckSeverity = 'high';
    } else if (maxTime > this.targetLatency * 0.2) {
      bottleneckSeverity = 'medium';
    }

    // Generate contributing factors and suggestions
    const { contributingFactors, suggestedActions } = this.getBottleneckRecommendations(primaryBottleneck, bottleneckSeverity);

    return {
      primaryBottleneck,
      bottleneckSeverity,
      contributingFactors,
      impactOnLatency,
      suggestedActions
    };
  }

  /**
   * Get bottleneck-specific recommendations
   */
  private getBottleneckRecommendations(bottleneck: string, severity: string): {
    contributingFactors: string[];
    suggestedActions: string[];
  } {
    const recommendations: Record<string, any> = {
      audioToTranscription: {
        contributingFactors: ['Large audio buffer size', 'High sample rate', 'Network latency to STT service'],
        suggestedActions: ['Reduce audio buffer size', 'Optimize STT model selection', 'Enable streaming transcription']
      },
      transcriptionToAnalysis: {
        contributingFactors: ['Complex semantic analysis', 'Large context window', 'Inefficient fragment processing'],
        suggestedActions: ['Simplify semantic analysis', 'Reduce context window', 'Optimize fragment aggregation']
      },
      analysisToResponse: {
        contributingFactors: ['Complex AI model', 'Large context size', 'Network latency to AI service'],
        suggestedActions: ['Use faster AI model', 'Reduce context size', 'Enable response caching']
      },
      responseToAudio: {
        contributingFactors: ['High TTS quality settings', 'Large response text', 'TTS service latency'],
        suggestedActions: ['Reduce TTS quality for speed', 'Enable streaming TTS', 'Optimize voice settings']
      }
    };

    return recommendations[bottleneck] || {
      contributingFactors: ['Unknown bottleneck'],
      suggestedActions: ['Investigate system performance']
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: LatencyMetrics[], errors: PipelineError[]): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    
    if (metrics.length === 0) return recommendations;

    const stats = this.calculateLatencyStatistics(metrics);
    
    // High latency recommendations
    if (stats.mean > this.targetLatency) {
      recommendations.push({
        id: nanoid(),
        type: 'optimization',
        priority: 'high',
        category: 'latency',
        title: 'Optimize for Target Latency',
        description: `Average latency (${Math.round(stats.mean)}ms) exceeds target (${this.targetLatency}ms)`,
        impact: {
          latencyImprovement: stats.mean - this.targetLatency,
          throughputImprovement: 0,
          costSavings: 0,
          reliabilityImprovement: 0
        },
        implementation: {
          effort: 'medium',
          timeEstimate: '1-2 weeks',
          resources: [],
          risks: ['Potential quality reduction', 'May affect accuracy']
        }
      });
    }

    // Poor target achievement rate
    if (stats.targetAchievementRate < 0.8) {
      recommendations.push({
        id: nanoid(),
        type: 'configuration',
        priority: 'medium',
        category: 'throughput',
        title: 'Improve Consistency',
        description: `Only ${Math.round(stats.targetAchievementRate * 100)}% of requests meet target latency`,
        impact: {
          latencyImprovement: 0,
          throughputImprovement: 50,
          costSavings: 0,
          reliabilityImprovement: 0
        },
        implementation: {
          effort: 'low',
          timeEstimate: '2-3 days',
          resources: [],
          risks: ['May require service restarts']
        }
      });
    }

    // High error rate
    const errorRate = errors.length / metrics.length;
    if (errorRate > 0.05) {
      recommendations.push({
        id: nanoid(),
        type: 'infrastructure',
        priority: 'critical',
        category: 'reliability',
        title: 'Address High Error Rate',
        description: `Error rate (${Math.round(errorRate * 100)}%) is too high`,
        impact: {
          latencyImprovement: 0,
          throughputImprovement: 0,
          costSavings: 0,
          reliabilityImprovement: 100
        },
        implementation: {
          effort: 'high',
          timeEstimate: '2-4 weeks',
          resources: [],
          risks: ['System instability', 'Service degradation']
        }
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: LatencyMetrics[], errors: PipelineError[]): PerformanceScore {
    if (metrics.length === 0) {
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
        factors: {
          positive: [],
          negative: ['No metrics available']
        },
        recommendations: []
      };
    }

    const stats = this.calculateLatencyStatistics(metrics);
    
    // Latency score (0-100)
    const latency = Math.max(0, 100 - (stats.mean - this.targetLatency) / this.targetLatency * 100);
    
    // Throughput score (based on target achievement rate)
    const throughput = stats.targetAchievementRate * 100;
    
    // Reliability score (based on error rate)
    const errorRate = errors.length / metrics.length;
    const reliability = Math.max(0, 100 - errorRate * 1000);
    
    // Efficiency score (based on resource utilization - placeholder)
    const efficiency = 80; // Would calculate based on actual resource metrics
    
    // Quality score (placeholder)
    const quality = 85;
    
    // Resource usage score (placeholder)
    const resourceUsage = 75;
    
    // Overall score
    const overall = (
      latency * 0.3 + 
      throughput * 0.2 + 
      reliability * 0.2 + 
      efficiency * 0.1 + 
      quality * 0.1 + 
      resourceUsage * 0.1
    );
    
    // Grade
    let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
    if (overall >= 95) grade = 'A+';
    else if (overall >= 90) grade = 'A';
    else if (overall >= 85) grade = 'B+';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 75) grade = 'C+';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    // Determine factors
    const factors: { positive: string[]; negative: string[] } = {
      positive: [],
      negative: []
    };
    
    if (latency >= 80) factors.positive.push('Good latency performance');
    else factors.negative.push('High latency issues');
    
    if (throughput >= 80) factors.positive.push('High throughput achieved');
    else factors.negative.push('Low throughput');
    
    if (reliability >= 90) factors.positive.push('Excellent reliability');
    else if (reliability < 70) factors.negative.push('Poor reliability');
    
    // Generate recommendations if needed
    const recommendations: PerformanceRecommendation[] = [];
    if (overall < 80) {
      if (latency < 70) {
        recommendations.push({
          id: nanoid(),
          type: 'optimization',
          priority: 'high',
          category: 'latency',
          title: 'Optimize Response Latency',
          description: 'Latency is below target. Consider using faster models or caching.',
          impact: {
            latencyImprovement: 30,
            throughputImprovement: 10,
            costSavings: 0,
            reliabilityImprovement: 0
          },
          implementation: {
            effort: 'medium',
            timeEstimate: '1 week',
            resources: [],
            risks: ['Potential quality reduction']
          }
        });
      }
    }

    return { 
      overall, 
      components: {
        latency,
        throughput,
        reliability,
        efficiency,
        quality,
        resourceUsage
      },
      grade,
      factors,
      recommendations
    };
  }

  // Public API methods
  public getLatestReport(): PerformanceReport | null {
    return this.reports[this.reports.length - 1] || null;
  }

  public getReports(limit?: number): PerformanceReport[] {
    return limit ? this.reports.slice(-limit) : [...this.reports];
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.acknowledged);
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  public removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId);
  }

  public updateConfig(config: {
    reportingInterval?: number;
    maxHistorySize?: number;
    targetLatency?: number;
    maxLatency?: number;
  }): void {
    if (config.reportingInterval) this.reportingInterval = config.reportingInterval;
    if (config.maxHistorySize) this.maxHistorySize = config.maxHistorySize;
    if (config.targetLatency) this.targetLatency = config.targetLatency;
    if (config.maxLatency) this.maxLatency = config.maxLatency;
  }

  public clearHistory(): void {
    this.metricsHistory = [];
    this.errorHistory = [];
    this.reports = [];
    this.activeAlerts.clear();
  }

  /**
   * Collect system resource metrics
   */
  private async collectResourceMetrics(): Promise<void> {
    try {
      // Get system metrics (this would integrate with actual system monitoring)
      const resourceMetrics: ResourceMonitoring = {
        timestamp: Date.now(),
        system: {
          memory: {
            total: this.getSystemMemoryTotal(),
            used: this.getSystemMemoryUsed(),
            free: this.getSystemMemoryFree(),
            percentage: this.getSystemMemoryPercentage(),
            swapUsed: this.getSystemSwapUsed()
          },
          cpu: {
            percentage: this.getSystemCpuUsage(),
            loadAverage: this.getSystemLoadAverage(),
            cores: this.getSystemCores(),
            processes: this.getSystemProcesses()
          },
          network: {
            bytesReceived: this.getNetworkBytesReceived(),
            bytesSent: this.getNetworkBytesSent(),
            packetsReceived: this.getNetworkPacketsReceived(),
            packetsSent: this.getNetworkPacketsSent(),
            connectionsActive: this.getNetworkActiveConnections()
          },
          storage: {
            totalSpace: this.getStorageTotal(),
            usedSpace: this.getStorageUsed(),
            freeSpace: this.getStorageFree(),
            percentage: this.getStoragePercentage()
          }
        },
        application: {
          heapUsed: this.getHeapUsed(),
          heapTotal: this.getHeapTotal(),
          external: this.getHeapExternal(),
          activeConnections: this.getActiveConnections(),
          pendingRequests: this.getPendingRequests(),
          cacheSize: this.getCacheSize(),
          sessionCount: this.getSessionCount()
        },
        thresholds: this.config.resourceMonitoring.thresholds
      };
      
      this.resourceHistory.push(resourceMetrics);
      
      // Maintain history size
      if (this.resourceHistory.length > this.maxHistorySize) {
        this.resourceHistory = this.resourceHistory.slice(-this.maxHistorySize);
      }
      
      // Check resource thresholds
      this.checkResourceThresholds(resourceMetrics);
      
    } catch (error) {
      console.error('Failed to collect resource metrics:', error);
    }
  }
  
  /**
   * Analyze performance trends
   */
  private analyzeTrends(): void {
    const now = Date.now();
    const periods: { name: string; duration: number }[] = [
      { name: 'hourly', duration: 3600000 },
      { name: 'daily', duration: 86400000 },
      { name: 'weekly', duration: 604800000 }
    ];
    
    periods.forEach(period => {
      const startTime = now - period.duration;
      const periodMetrics = this.enhancedMetrics.filter(m => m.timestamp >= startTime);
      
      if (periodMetrics.length > 0) {
        const trend = this.calculateTrend(periodMetrics, period.name);
        this.trends.set(period.name, trend);
      }
    });
  }
  
  /**
   * Calculate trend for a specific period
   */
  private calculateTrend(metrics: PerformanceMetrics[], period: string): PerformanceTrend {
    const latencies = metrics.map(m => m.latency.total);
    const fallbacks = metrics.filter(m => m.context.fallbackUsed);
    
    // Calculate latency percentiles
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    
    const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const throughput = metrics.length / (metrics[metrics.length - 1].timestamp - metrics[0].timestamp) * 1000;
    const errorRate = metrics.filter(m => m.context.retryCount > 0).length / metrics.length;
    const successRate = 1 - errorRate;
    
    // Calculate scores
    const latencyScore = Math.max(0, 100 - (averageLatency - this.targetLatency) / this.targetLatency * 100);
    const reliabilityScore = successRate * 100;
    const efficiencyScore = this.calculateEfficiencyScore(metrics);
    const qualityScore = this.calculateQualityScore(metrics);
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
        impactOnLatency: this.calculateFallbackLatencyImpact(fallbacks)
      },
      comparison: {
        previousPeriod: this.calculatePeriodComparison(period)
      }
    };
  }
  
  // Helper methods for system metrics (would integrate with actual system monitoring)
  private getSystemMemoryTotal(): number { return process.memoryUsage().heapTotal || 0; }
  private getSystemMemoryUsed(): number { return process.memoryUsage().heapUsed || 0; }
  private getSystemMemoryFree(): number { return this.getSystemMemoryTotal() - this.getSystemMemoryUsed(); }
  private getSystemMemoryPercentage(): number { return (this.getSystemMemoryUsed() / this.getSystemMemoryTotal()) * 100; }
  private getSystemSwapUsed(): number { return 0; } // Would implement actual swap monitoring
  private getSystemCpuUsage(): number { return 0; } // Would implement actual CPU monitoring
  private getSystemLoadAverage(): number[] { return [0, 0, 0]; } // Would implement actual load average
  private getSystemCores(): number { return require('os').cpus().length; }
  private getSystemProcesses(): number { return 0; } // Would implement actual process counting
  private getNetworkBytesReceived(): number { return 0; } // Would implement actual network monitoring
  private getNetworkBytesSent(): number { return 0; }
  private getNetworkPacketsReceived(): number { return 0; }
  private getNetworkPacketsSent(): number { return 0; }
  private getNetworkActiveConnections(): number { return 0; }
  private getStorageTotal(): number { return 0; } // Would implement actual storage monitoring
  private getStorageUsed(): number { return 0; }
  private getStorageFree(): number { return 0; }
  private getStoragePercentage(): number { return 0; }
  private getHeapUsed(): number { return process.memoryUsage().heapUsed; }
  private getHeapTotal(): number { return process.memoryUsage().heapTotal; }
  private getHeapExternal(): number { return process.memoryUsage().external; }
  private getActiveConnections(): number { return 0; } // Would implement actual connection monitoring
  private getPendingRequests(): number { return 0; }
  private getCacheSize(): number { return 0; }
  private getSessionCount(): number { return 0; }
  
  private calculateEfficiencyScore(metrics: PerformanceMetrics[]): number {
    // Combine resource usage efficiency with cache hit rate
    const cacheHitRate = metrics.filter(m => m.context.cacheHit).length / metrics.length;
    const resourceEfficiency = 80; // Would calculate based on actual resource usage
    
    return (cacheHitRate * 40 + resourceEfficiency * 0.6);
  }
  
  private calculateQualityScore(metrics: PerformanceMetrics[]): number {
    // Average quality metrics where available
    const qualityMetrics = metrics.filter(m => m.quality.transcriptionAccuracy !== undefined);
    if (qualityMetrics.length === 0) return 85; // Default score
    
    const avgAccuracy = qualityMetrics.reduce((sum, m) => sum + (m.quality.transcriptionAccuracy || 0), 0) / qualityMetrics.length;
    const avgRelevance = qualityMetrics.reduce((sum, m) => sum + (m.quality.responseRelevance || 0), 0) / qualityMetrics.length;
    
    return (avgAccuracy + avgRelevance) / 2;
  }
  
  private calculateFallbackLatencyImpact(fallbacks: PerformanceMetrics[]): number {
    if (fallbacks.length === 0) return 0;
    
    const fallbackLatencies = fallbacks.map(m => m.latency.total);
    const allLatencies = this.enhancedMetrics.map(m => m.latency.total);
    
    const fallbackAvg = fallbackLatencies.reduce((sum, l) => sum + l, 0) / fallbackLatencies.length;
    const overallAvg = allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length;
    
    return fallbackAvg - overallAvg;
  }
  
  private calculatePeriodComparison(period: string): PerformanceTrend['comparison']['previousPeriod'] {
    // Would compare with previous period data
    return {
      latencyChange: 0,
      throughputChange: 0,
      errorRateChange: 0,
      trend: 'stable'
    };
  }

  // Enhanced public API methods
  public getPerformanceScore(): PerformanceScore | null {
    return this.performanceScore;
  }
  
  public getPerformanceTrends(period?: PerformancePeriod): PerformanceTrend[] {
    if (period) {
      const trend = this.trends.get(period);
      return trend ? [trend] : [];
    }
    return Array.from(this.trends.values());
  }
  
  public getModelAnalytics(model?: AIModel): ModelPerformanceAnalysis[] {
    if (model) {
      const analysis = this.modelAnalytics.get(model);
      return analysis ? [analysis] : [];
    }
    return Array.from(this.modelAnalytics.values());
  }
  
  public getFallbackHistory(limit?: number): FallbackTracking[] {
    return limit ? this.fallbackHistory.slice(-limit) : [...this.fallbackHistory];
  }
  
  public getResourceMetrics(limit?: number): ResourceMonitoring[] {
    return limit ? this.resourceHistory.slice(-limit) : [...this.resourceHistory];
  }

  // Event handlers (would be connected to notification systems)
  public onAlert?: (alert: PerformanceAlert) => void;
  public onReport?: (report: PerformanceReport) => void;
  public onPerformanceAlert?: (alert: PerformanceAlert) => void;
  public onResourceAlert?: (alert: PerformanceAlert) => void;
  public onTrendChange?: (trend: PerformanceTrend) => void;
}

export const performanceMonitor = new PerformanceMonitor();

// Export enhanced monitor with fallback tracking capabilities
export class EnhancedPerformanceMonitor extends PerformanceMonitor {
  constructor(config?: Partial<PerformanceMonitoringConfig>) {
    super(350, config);
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
          used: this.getHeapUsed(),
          available: this.getHeapTotal() - this.getHeapUsed(),
          percentage: (this.getHeapUsed() / this.getHeapTotal()) * 100
        },
        cpu: {
          usage: 0,
          cores: this.getSystemCores()
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
    const memoryUsage = (this.getHeapUsed() / this.getHeapTotal()) * 100;
    if (memoryUsage > 90) {
      issues.push('High memory usage');
      recommendations.push('Restart service or clear cache');
    }
    
    // Check if monitoring is working
    const recentMetrics = this.enhancedMetrics.filter(m => 
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
}

export const enhancedPerformanceMonitor = new EnhancedPerformanceMonitor();