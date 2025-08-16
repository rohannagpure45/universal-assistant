/**
 * PerformanceMonitor - Real-time Performance Tracking
 * 
 * Monitors and reports on system performance metrics to ensure sub-500ms latency goals
 * and provides real-time insights into system bottlenecks and optimization opportunities.
 */

import { LatencyMetrics, PipelineError } from './RealtimeAudioPipeline';
import { nanoid } from 'nanoid';

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

export interface PerformanceRecommendation {
  type: 'optimization' | 'scaling' | 'configuration' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImprovement: number;
  implementationEffort: 'easy' | 'medium' | 'hard';
  risks: string[];
}

export interface PerformanceScore {
  overall: number; // 0-100
  latency: number;
  throughput: number;
  reliability: number;
  efficiency: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: LatencyMetrics[]) => boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  cooldownMs: number;
  enabled: boolean;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  rule: AlertRule;
  metrics: LatencyMetrics;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  acknowledged: boolean;
}

export class PerformanceMonitor {
  private metricsHistory: LatencyMetrics[] = [];
  private errorHistory: PipelineError[] = [];
  private reports: PerformanceReport[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  
  // Configuration
  private reportingInterval: number = 60000; // 1 minute
  private maxHistorySize: number = 10000;
  private targetLatency: number = 350;
  private maxLatency: number = 500;
  
  // Monitoring state
  private isMonitoring: boolean = false;
  private reportingTimer: NodeJS.Timeout | null = null;

  constructor(targetLatency: number = 350) {
    this.targetLatency = targetLatency;
    this.initializeDefaultAlertRules();
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
    const alert: PerformanceAlert = {
      id: nanoid(),
      timestamp: Date.now(),
      rule,
      metrics: this.metricsHistory[this.metricsHistory.length - 1],
      severity: rule.severity,
      message: rule.message,
      acknowledged: false
    };

    this.activeAlerts.set(alert.id, alert);
    this.lastAlertTimes.set(rule.id, alert.timestamp);

    // Emit alert event (would be connected to notification system)
    this.onAlert?.(alert);
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
        type: 'optimization',
        priority: 'high',
        title: 'Optimize for Target Latency',
        description: `Average latency (${Math.round(stats.mean)}ms) exceeds target (${this.targetLatency}ms)`,
        expectedImprovement: stats.mean - this.targetLatency,
        implementationEffort: 'medium',
        risks: ['Potential quality reduction', 'May affect accuracy']
      });
    }

    // Poor target achievement rate
    if (stats.targetAchievementRate < 0.8) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        title: 'Improve Consistency',
        description: `Only ${Math.round(stats.targetAchievementRate * 100)}% of requests meet target latency`,
        expectedImprovement: 50,
        implementationEffort: 'easy',
        risks: ['May require service restarts']
      });
    }

    // High error rate
    const errorRate = errors.length / metrics.length;
    if (errorRate > 0.05) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'critical',
        title: 'Address High Error Rate',
        description: `Error rate (${Math.round(errorRate * 100)}%) is too high`,
        expectedImprovement: 100,
        implementationEffort: 'hard',
        risks: ['System instability', 'Service degradation']
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: LatencyMetrics[], errors: PipelineError[]): PerformanceScore {
    if (metrics.length === 0) {
      return { overall: 0, latency: 0, throughput: 0, reliability: 0, efficiency: 0, grade: 'F' };
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
    
    // Overall score
    const overall = (latency * 0.4 + throughput * 0.3 + reliability * 0.2 + efficiency * 0.1);
    
    // Grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overall >= 90) grade = 'A';
    else if (overall >= 80) grade = 'B';
    else if (overall >= 70) grade = 'C';
    else if (overall >= 60) grade = 'D';
    else grade = 'F';

    return { overall, latency, throughput, reliability, efficiency, grade };
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

  // Event handlers (would be connected to notification systems)
  public onAlert?: (alert: PerformanceAlert) => void;
  public onReport?: (report: PerformanceReport) => void;
}

export const performanceMonitor = new PerformanceMonitor();