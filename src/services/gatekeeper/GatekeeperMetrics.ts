/**
 * GatekeeperMetrics - Comprehensive performance monitoring and metrics collection
 * 
 * Features:
 * - Real-time performance metrics
 * - Speaker-specific analytics
 * - Queue performance tracking
 * - Lock contention analysis
 * - Processing time distributions
 * - Memory usage monitoring
 * - Export capabilities for external monitoring
 */

import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface MetricPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  processingTime: {
    min: number;
    max: number;
    average: number;
    p50: number;
    p95: number;
    p99: number;
    total: number;
    count: number;
  };
  throughput: {
    messagesPerSecond: number;
    messagesPerMinute: number;
    peakThroughput: number;
    averageThroughput: number;
  };
  concurrency: {
    averageQueueLength: number;
    maxQueueLength: number;
    averageLockWaitTime: number;
    maxLockWaitTime: number;
    lockContention: number;
  };
  reliability: {
    successRate: number;
    errorRate: number;
    timeoutRate: number;
    retryRate: number;
  };
}

export interface SpeakerMetrics {
  speakerId: string;
  messageCount: number;
  averageProcessingTime: number;
  errorCount: number;
  lastActivity: number;
  lockAcquisitions: number;
  queueWaitTime: number;
  interruptCount: number;
  contextSwitches: number;
}

export interface SystemMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
  uptime: number;
}

export interface GatekeeperMetricsConfig {
  enableRealTimeMetrics: boolean;
  metricsRetentionPeriod: number;
  samplingInterval: number;
  enableSpeakerMetrics: boolean;
  enableSystemMetrics: boolean;
  exportInterval: number;
  maxDataPoints: number;
  enableHistograms: boolean;
  enableAlerts: boolean;
  alertThresholds: {
    highErrorRate: number;
    slowProcessing: number;
    highMemoryUsage: number;
    queueBacklog: number;
  };
}

export interface MetricsSnapshot {
  timestamp: number;
  performance: PerformanceMetrics;
  speakers: SpeakerMetrics[];
  system: SystemMetrics;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metadata: Record<string, any>;
  resolved: boolean;
}

/**
 * GatekeeperMetrics collects and analyzes performance data
 */
export class GatekeeperMetrics {
  private config: GatekeeperMetricsConfig;
  private processingTimes: number[] = [];
  private throughputData: MetricPoint[] = [];
  private queueLengthData: MetricPoint[] = [];
  private lockWaitTimes: number[] = [];
  private speakerMetrics: Map<string, SpeakerMetrics> = new Map();
  private alerts: Alert[] = [];
  private startTime: number = Date.now();
  
  // Sampling and collection
  private samplingTimer?: NodeJS.Timeout;
  private exportTimer?: NodeJS.Timeout;
  private lastExportTime = 0;
  
  // Message tracking
  private messageCounter = 0;
  private errorCounter = 0;
  private timeoutCounter = 0;
  private retryCounter = 0;
  private lastThroughputSample = { time: Date.now(), count: 0 };
  
  // Performance tracking
  private peakQueueLength = 0;
  private peakThroughput = 0;
  private totalLockAcquisitions = 0;
  
  // Export callbacks
  private exportCallbacks: ((snapshot: MetricsSnapshot) => void)[] = [];
  private alertCallbacks: ((alert: Alert) => void)[] = [];

  constructor(config: Partial<GatekeeperMetricsConfig> = {}) {
    this.config = {
      enableRealTimeMetrics: true,
      metricsRetentionPeriod: 3600000, // 1 hour
      samplingInterval: 5000, // 5 seconds
      enableSpeakerMetrics: true,
      enableSystemMetrics: true,
      exportInterval: 60000, // 1 minute
      maxDataPoints: 1000,
      enableHistograms: true,
      enableAlerts: true,
      alertThresholds: {
        highErrorRate: 0.1, // 10%
        slowProcessing: 5000, // 5 seconds
        highMemoryUsage: 500 * 1024 * 1024, // 500MB
        queueBacklog: 50,
      },
      ...config,
    };

    if (this.config.enableRealTimeMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Records message processing metrics
   */
  recordMessageProcessing(
    speakerId: string,
    processingTime: number,
    success: boolean,
    metadata: Record<string, any> = {}
  ): void {
    this.messageCounter++;
    this.processingTimes.push(processingTime);
    
    if (!success) {
      this.errorCounter++;
    }

    // Update speaker metrics
    if (this.config.enableSpeakerMetrics) {
      this.updateSpeakerMetrics(speakerId, processingTime, success, metadata);
    }

    // Trim data if needed
    this.trimDataPoints();

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkAlerts();
    }
  }

  /**
   * Records queue metrics
   */
  recordQueueMetrics(queueLength: number, waitTime?: number): void {
    this.queueLengthData.push({
      timestamp: Date.now(),
      value: queueLength,
    });

    this.peakQueueLength = Math.max(this.peakQueueLength, queueLength);

    if (waitTime !== undefined) {
      this.lockWaitTimes.push(waitTime);
    }

    this.trimDataPoints();
  }

  /**
   * Records lock acquisition metrics
   */
  recordLockAcquisition(speakerId: string, waitTime: number, success: boolean): void {
    this.totalLockAcquisitions++;
    
    if (success) {
      this.lockWaitTimes.push(waitTime);
      
      if (this.config.enableSpeakerMetrics) {
        const speaker = this.getSpeakerMetrics(speakerId);
        speaker.lockAcquisitions++;
        speaker.queueWaitTime = (speaker.queueWaitTime + waitTime) / 2; // Moving average
      }
    }
  }

  /**
   * Records error metrics
   */
  recordError(
    operation: string,
    error: Error,
    context: Record<string, any> = {}
  ): void {
    this.errorCounter++;
    
    if (error.message.includes('timeout')) {
      this.timeoutCounter++;
    }

    // Update speaker error count if speakerId is provided
    if (context.speakerId && this.config.enableSpeakerMetrics) {
      const speaker = this.getSpeakerMetrics(context.speakerId);
      speaker.errorCount++;
    }

    // Record in performance monitor
    performanceMonitor.recordError(operation, error, context);
  }

  /**
   * Records retry attempt
   */
  recordRetry(speakerId?: string): void {
    this.retryCounter++;
    
    if (speakerId && this.config.enableSpeakerMetrics) {
      // Could track speaker-specific retry counts if needed
    }
  }

  /**
   * Gets current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const timeWindow = now - this.config.metricsRetentionPeriod;
    
    // Filter recent processing times
    const recentTimes = this.processingTimes.filter((_, index) => {
      const estimatedTimestamp = now - (this.processingTimes.length - index) * 100;
      return estimatedTimestamp > timeWindow;
    });

    // Calculate processing time metrics
    const sortedTimes = [...recentTimes].sort((a, b) => a - b);
    const processingTime = {
      min: sortedTimes[0] || 0,
      max: sortedTimes[sortedTimes.length - 1] || 0,
      average: recentTimes.length > 0 ? recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length : 0,
      p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0,
      p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0,
      p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0,
      total: recentTimes.reduce((sum, time) => sum + time, 0),
      count: recentTimes.length,
    };

    // Calculate throughput
    const throughput = this.calculateThroughput();

    // Calculate concurrency metrics
    const recentQueueData = this.queueLengthData.filter(point => point.timestamp > timeWindow);
    const recentLockWaits = this.lockWaitTimes.slice(-100); // Last 100 samples
    
    const concurrency = {
      averageQueueLength: recentQueueData.length > 0 
        ? recentQueueData.reduce((sum, point) => sum + point.value, 0) / recentQueueData.length 
        : 0,
      maxQueueLength: this.peakQueueLength,
      averageLockWaitTime: recentLockWaits.length > 0 
        ? recentLockWaits.reduce((sum, time) => sum + time, 0) / recentLockWaits.length 
        : 0,
      maxLockWaitTime: Math.max(...recentLockWaits, 0),
      lockContention: this.calculateLockContention(),
    };

    // Calculate reliability metrics
    const totalOperations = this.messageCounter;
    const reliability = {
      successRate: totalOperations > 0 ? (totalOperations - this.errorCounter) / totalOperations : 1,
      errorRate: totalOperations > 0 ? this.errorCounter / totalOperations : 0,
      timeoutRate: totalOperations > 0 ? this.timeoutCounter / totalOperations : 0,
      retryRate: totalOperations > 0 ? this.retryCounter / totalOperations : 0,
    };

    return {
      processingTime,
      throughput,
      concurrency,
      reliability,
    };
  }

  /**
   * Gets speaker-specific metrics
   */
  getSpeakerMetrics(): SpeakerMetrics[] {
    return Array.from(this.speakerMetrics.values());
  }

  /**
   * Gets system metrics (if enabled)
   */
  getSystemMetrics(): SystemMetrics | null {
    if (!this.config.enableSystemMetrics || typeof process === 'undefined') {
      return null;
    }

    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        memoryUsage: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
        cpuUsage: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        eventLoop: {
          delay: this.measureEventLoopDelay(),
          utilization: this.measureEventLoopUtilization(),
        },
        uptime: Date.now() - this.startTime,
      };
    } catch (error) {
      console.error('Error collecting system metrics:', error);
      return null;
    }
  }

  /**
   * Gets current alerts
   */
  getAlerts(): Alert[] {
    return [...this.alerts];
  }

  /**
   * Gets a complete metrics snapshot
   */
  getSnapshot(): MetricsSnapshot {
    return {
      timestamp: Date.now(),
      performance: this.getPerformanceMetrics(),
      speakers: this.getSpeakerMetrics(),
      system: this.getSystemMetrics() || {} as SystemMetrics,
      alerts: this.getAlerts(),
    };
  }

  /**
   * Adds export callback
   */
  addExportCallback(callback: (snapshot: MetricsSnapshot) => void): void {
    this.exportCallbacks.push(callback);
  }

  /**
   * Adds alert callback
   */
  addAlertCallback(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Exports metrics to all registered callbacks
   */
  async exportMetrics(): Promise<void> {
    if (this.exportCallbacks.length === 0) return;

    const snapshot = this.getSnapshot();
    
    for (const callback of this.exportCallbacks) {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('Error in metrics export callback:', error);
      }
    }

    this.lastExportTime = Date.now();
  }

  /**
   * Clears all metrics data
   */
  clearMetrics(): void {
    this.processingTimes = [];
    this.throughputData = [];
    this.queueLengthData = [];
    this.lockWaitTimes = [];
    this.speakerMetrics.clear();
    this.alerts = [];
    
    // Reset counters
    this.messageCounter = 0;
    this.errorCounter = 0;
    this.timeoutCounter = 0;
    this.retryCounter = 0;
    this.peakQueueLength = 0;
    this.peakThroughput = 0;
    this.totalLockAcquisitions = 0;
  }

  /**
   * Shuts down metrics collection
   */
  shutdown(): void {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
    }
    
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }

    // Final export
    if (this.exportCallbacks.length > 0) {
      void this.exportMetrics();
    }
  }

  /**
   * Starts metrics collection
   */
  private startMetricsCollection(): void {
    // Start sampling timer
    this.samplingTimer = setInterval(() => {
      this.collectSamples();
    }, this.config.samplingInterval);

    // Start export timer
    this.exportTimer = setInterval(() => {
      void this.exportMetrics();
    }, this.config.exportInterval);
  }

  /**
   * Collects periodic samples
   */
  private collectSamples(): void {
    // Record current throughput
    const currentThroughput = this.calculateCurrentThroughput();
    this.throughputData.push({
      timestamp: Date.now(),
      value: currentThroughput,
    });

    this.peakThroughput = Math.max(this.peakThroughput, currentThroughput);
  }

  /**
   * Updates speaker-specific metrics
   */
  private updateSpeakerMetrics(
    speakerId: string,
    processingTime: number,
    success: boolean,
    metadata: Record<string, any>
  ): void {
    const speaker = this.getSpeakerMetrics(speakerId);
    
    speaker.messageCount++;
    speaker.averageProcessingTime = (speaker.averageProcessingTime + processingTime) / 2;
    speaker.lastActivity = Date.now();
    
    if (!success) {
      speaker.errorCount++;
    }

    if (metadata.interrupt) {
      speaker.interruptCount++;
    }

    if (metadata.contextSwitch) {
      speaker.contextSwitches++;
    }
  }

  /**
   * Gets or creates speaker metrics
   */
  private getSpeakerMetrics(speakerId: string): SpeakerMetrics {
    if (!this.speakerMetrics.has(speakerId)) {
      this.speakerMetrics.set(speakerId, {
        speakerId,
        messageCount: 0,
        averageProcessingTime: 0,
        errorCount: 0,
        lastActivity: Date.now(),
        lockAcquisitions: 0,
        queueWaitTime: 0,
        interruptCount: 0,
        contextSwitches: 0,
      });
    }
    
    return this.speakerMetrics.get(speakerId)!;
  }

  /**
   * Calculates throughput metrics
   */
  private calculateThroughput(): PerformanceMetrics['throughput'] {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    
    const recentThroughputData = this.throughputData.filter(point => point.timestamp > oneMinuteAgo);
    
    const currentThroughput = this.calculateCurrentThroughput();
    const averageThroughput = recentThroughputData.length > 0 
      ? recentThroughputData.reduce((sum, point) => sum + point.value, 0) / recentThroughputData.length 
      : 0;

    return {
      messagesPerSecond: currentThroughput,
      messagesPerMinute: currentThroughput * 60,
      peakThroughput: this.peakThroughput,
      averageThroughput,
    };
  }

  /**
   * Calculates current throughput
   */
  private calculateCurrentThroughput(): number {
    const now = Date.now();
    const timeDiff = now - this.lastThroughputSample.time;
    const countDiff = this.messageCounter - this.lastThroughputSample.count;
    
    if (timeDiff > 0) {
      const throughput = (countDiff / timeDiff) * 1000; // Messages per second
      this.lastThroughputSample = { time: now, count: this.messageCounter };
      return throughput;
    }
    
    return 0;
  }

  /**
   * Calculates lock contention
   */
  private calculateLockContention(): number {
    const averageWaitTime = this.lockWaitTimes.length > 0 
      ? this.lockWaitTimes.reduce((sum, time) => sum + time, 0) / this.lockWaitTimes.length 
      : 0;
    
    // Contention score based on average wait time (higher = more contention)
    return Math.min(averageWaitTime / 1000, 1); // Normalized to 0-1 scale
  }

  /**
   * Trims data points to stay within limits
   */
  private trimDataPoints(): void {
    if (this.processingTimes.length > this.config.maxDataPoints) {
      this.processingTimes = this.processingTimes.slice(-this.config.maxDataPoints / 2);
    }
    
    if (this.throughputData.length > this.config.maxDataPoints) {
      this.throughputData = this.throughputData.slice(-this.config.maxDataPoints / 2);
    }
    
    if (this.queueLengthData.length > this.config.maxDataPoints) {
      this.queueLengthData = this.queueLengthData.slice(-this.config.maxDataPoints / 2);
    }
    
    if (this.lockWaitTimes.length > this.config.maxDataPoints) {
      this.lockWaitTimes = this.lockWaitTimes.slice(-this.config.maxDataPoints / 2);
    }
  }

  /**
   * Checks for alerts based on thresholds
   */
  private checkAlerts(): void {
    if (!this.config.enableAlerts) return;

    const metrics = this.getPerformanceMetrics();
    const systemMetrics = this.getSystemMetrics();

    // High error rate alert
    if (metrics.reliability.errorRate > this.config.alertThresholds.highErrorRate) {
      this.createAlert(
        'error',
        `High error rate detected: ${(metrics.reliability.errorRate * 100).toFixed(1)}%`,
        { errorRate: metrics.reliability.errorRate }
      );
    }

    // Slow processing alert
    if (metrics.processingTime.p95 > this.config.alertThresholds.slowProcessing) {
      this.createAlert(
        'warning',
        `Slow processing detected: P95 = ${metrics.processingTime.p95}ms`,
        { processingTime: metrics.processingTime.p95 }
      );
    }

    // Queue backlog alert
    if (metrics.concurrency.averageQueueLength > this.config.alertThresholds.queueBacklog) {
      this.createAlert(
        'warning',
        `Queue backlog detected: ${metrics.concurrency.averageQueueLength.toFixed(1)} messages`,
        { queueLength: metrics.concurrency.averageQueueLength }
      );
    }

    // High memory usage alert
    if (systemMetrics && systemMetrics.memoryUsage.heapUsed > this.config.alertThresholds.highMemoryUsage) {
      this.createAlert(
        'warning',
        `High memory usage: ${(systemMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        { memoryUsage: systemMetrics.memoryUsage.heapUsed }
      );
    }
  }

  /**
   * Creates a new alert
   */
  private createAlert(type: Alert['type'], message: string, metadata: Record<string, any>): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      metadata,
      resolved: false,
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-50);
    }

    // Notify callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    }
  }

  /**
   * Measures event loop delay (simplified)
   */
  private measureEventLoopDelay(): number {
    // This would require more sophisticated measurement in a real implementation
    return 0;
  }

  /**
   * Measures event loop utilization (simplified)
   */
  private measureEventLoopUtilization(): number {
    // This would require more sophisticated measurement in a real implementation
    return 0;
  }
}

/**
 * Creates a default metrics collector with console export
 */
export function createDefaultMetrics(
  config: Partial<GatekeeperMetricsConfig> = {}
): GatekeeperMetrics {
  const metrics = new GatekeeperMetrics(config);
  
  // Add console export
  metrics.addExportCallback((snapshot) => {
    console.log('Gatekeeper Metrics Snapshot:', {
      timestamp: new Date(snapshot.timestamp).toISOString(),
      performance: {
        avgProcessingTime: snapshot.performance.processingTime.average.toFixed(2) + 'ms',
        throughput: snapshot.performance.throughput.messagesPerSecond.toFixed(2) + '/s',
        errorRate: (snapshot.performance.reliability.errorRate * 100).toFixed(1) + '%',
      },
      speakers: snapshot.speakers.length,
      alerts: snapshot.alerts.filter(a => !a.resolved).length,
    });
  });

  // Add console alert callback
  metrics.addAlertCallback((alert) => {
    console.warn(`[${alert.type.toUpperCase()}] ${alert.message}`);
  });

  return metrics;
}