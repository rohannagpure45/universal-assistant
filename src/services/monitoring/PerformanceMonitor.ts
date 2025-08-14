export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface SystemStats {
  fragmentProcessing: {
    totalProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    currentBufferSizes: Record<string, number>;
  };
  audioProcessing: {
    activePlaybacks: number;
    queueLength: number;
    isInputGated: boolean;
  };
  performance: {
    recentMetrics: PerformanceMetric[];
    slowOperations: PerformanceMetric[];
    errorCount: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private completedMetrics: PerformanceMetric[] = [];
  private errorCount: number = 0;
  private maxStoredMetrics: number = 1000;
  private slowOperationThreshold: number = 1000; // 1 second

  startTiming(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.metrics.set(id, metric);
    return id;
  }

  endTiming(id: string): PerformanceMetric | null {
    try {
      const metric = this.metrics.get(id);
      if (!metric) {
        console.warn(`PerformanceMonitor: No metric found for ID ${id}`);
        return null;
      }

      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;

      // Move to completed metrics
      this.completedMetrics.push(metric);
      this.metrics.delete(id);

      // Maintain storage limits
      if (this.completedMetrics.length > this.maxStoredMetrics) {
        this.completedMetrics.shift();
      }

      // Log slow operations
      if (metric.duration > this.slowOperationThreshold) {
        console.warn(`PerformanceMonitor: Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`, metric.metadata);
      }

      return metric;
    } catch (error) {
      console.error('PerformanceMonitor: Error ending timing:', error);
      this.errorCount++;
      return null;
    }
  }

  recordError(context: string, error: any, metadata?: Record<string, any>): void {
    this.errorCount++;
    console.error(`PerformanceMonitor: Error in ${context}:`, error);
  }

  recordMetric(name: string, data: any, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      metadata: { ...metadata, data },
    };

    this.completedMetrics.push(metric);

    // Maintain storage limits
    if (this.completedMetrics.length > this.maxStoredMetrics) {
      this.completedMetrics.shift();
    }
  }

  recordSuccess(context: string, metadata?: Record<string, any>): void {
    this.recordMetric(`${context}_success`, { success: true }, metadata);
  }

  getStats(): SystemStats['performance'] {
    try {
      const recentMetrics = this.completedMetrics.slice(-50); // Last 50 operations
      const slowOperations = this.completedMetrics
        .filter(metric => (metric.duration || 0) > this.slowOperationThreshold)
        .slice(-20); // Last 20 slow operations

      return {
        recentMetrics,
        slowOperations,
        errorCount: this.errorCount,
      };
    } catch (error) {
      console.error('PerformanceMonitor: Error getting stats:', error);
      return {
        recentMetrics: [],
        slowOperations: [],
        errorCount: this.errorCount,
      };
    }
  }

  getMetricsByName(name: string, limit: number = 10): PerformanceMetric[] {
    try {
      return this.completedMetrics
        .filter(metric => metric.name === name)
        .slice(-limit);
    } catch (error) {
      console.error('PerformanceMonitor: Error getting metrics by name:', error);
      return [];
    }
  }

  getAverageProcessingTime(name: string): number {
    try {
      const metrics = this.getMetricsByName(name, 100);
      if (metrics.length === 0) return 0;

      const totalDuration = metrics.reduce((sum, metric) => sum + (metric.duration || 0), 0);
      return totalDuration / metrics.length;
    } catch (error) {
      console.error('PerformanceMonitor: Error calculating average processing time:', error);
      return 0;
    }
  }

  getSuccessRate(name: string): number {
    try {
      const metrics = this.getMetricsByName(name, 100);
      if (metrics.length === 0) return 1.0;

      const successfulMetrics = metrics.filter(metric => 
        metric.duration !== undefined && 
        (!metric.metadata?.error)
      );

      return successfulMetrics.length / metrics.length;
    } catch (error) {
      console.error('PerformanceMonitor: Error calculating success rate:', error);
      return 1.0;
    }
  }

  measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const id = this.startTiming(name, metadata);
    
    return fn()
      .then(result => {
        this.endTiming(id);
        return result;
      })
      .catch(error => {
        const metric = this.metrics.get(id);
        if (metric) {
          metric.metadata = { ...metric.metadata, error: true };
        }
        this.endTiming(id);
        this.recordError(name, error);
        throw error;
      });
  }

  measureSync<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const id = this.startTiming(name, metadata);
    
    try {
      const result = fn();
      this.endTiming(id);
      return result;
    } catch (error) {
      const metric = this.metrics.get(id);
      if (metric) {
        metric.metadata = { ...metric.metadata, error: true };
      }
      this.endTiming(id);
      this.recordError(name, error);
      throw error;
    }
  }

  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
    this.errorCount = 0;
    console.log('PerformanceMonitor: All metrics cleared');
  }

  updateConfig(config: {
    maxStoredMetrics?: number;
    slowOperationThreshold?: number;
  }): void {
    if (config.maxStoredMetrics) {
      this.maxStoredMetrics = Math.max(100, config.maxStoredMetrics);
    }
    
    if (config.slowOperationThreshold) {
      this.slowOperationThreshold = Math.max(100, config.slowOperationThreshold);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();