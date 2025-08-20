/**
 * Performance Monitor
 * 
 * Comprehensive performance monitoring for database operations and dashboard loading.
 * Features:
 * - Real-time performance metrics
 * - Query analysis and optimization suggestions
 * - Memory usage tracking
 * - Network performance monitoring
 * - Cache efficiency analysis
 */

import { DatabaseService } from '@/services/firebase/DatabaseService';
import { dashboardCache } from '@/lib/cache/DashboardCache';
import { FirestoreLiteService } from '@/lib/firebase/firestoreLite';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  QUERY_SLOW: 2000,           // 2 seconds
  QUERY_VERY_SLOW: 5000,      // 5 seconds
  CACHE_HIT_RATE_LOW: 60,     // 60%
  MEMORY_USAGE_HIGH: 50,      // 50MB
  DASHBOARD_LOAD_SLOW: 3000,  // 3 seconds
};

// Metric types
interface PerformanceMetric {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  cached: boolean;
  metadata: Record<string, any>;
}

interface NetworkMetric {
  timestamp: Date;
  type: 'request' | 'response';
  url?: string;
  size: number;
  duration: number;
  status: number;
}

interface MemoryMetric {
  timestamp: Date;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface DashboardLoadMetric {
  timestamp: Date;
  userId: string;
  totalLoadTime: number;
  cacheHitRate: number;
  componentsLoaded: string[];
  failedComponents: string[];
  networkRequests: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private networkMetrics: NetworkMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private dashboardMetrics: DashboardLoadMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private maxMetrics = 1000;
  private isMonitoring = false;

  private constructor() {
    this.setupPerformanceObservers();
    this.startMemoryMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // ============ PUBLIC API ============

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    this.isMonitoring = true;
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('Performance monitoring stopped');
  }

  /**
   * Record a database operation metric
   */
  recordDatabaseOperation(
    operation: string,
    duration: number,
    success: boolean,
    cached: boolean = false,
    metadata: Record<string, any> = {}
  ): void {
    if (!this.isMonitoring) return;

    const metric: PerformanceMetric = {
      timestamp: new Date(),
      operation,
      duration,
      success,
      cached,
      metadata
    };

    this.metrics.push(metric);
    this.trimMetrics();

    // Log performance warnings
    if (duration > PERFORMANCE_THRESHOLDS.QUERY_VERY_SLOW) {
      console.warn(`Very slow database operation: ${operation} took ${duration}ms`, metadata);
    } else if (duration > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
      console.warn(`Slow database operation: ${operation} took ${duration}ms`, metadata);
    }
  }

  /**
   * Record dashboard load performance
   */
  recordDashboardLoad(
    userId: string,
    totalLoadTime: number,
    componentsLoaded: string[],
    failedComponents: string[] = [],
    networkRequests: number = 0
  ): void {
    if (!this.isMonitoring) return;

    const cacheStats = dashboardCache.getMetrics();
    
    const metric: DashboardLoadMetric = {
      timestamp: new Date(),
      userId,
      totalLoadTime,
      cacheHitRate: cacheStats.hitRate,
      componentsLoaded,
      failedComponents,
      networkRequests
    };

    this.dashboardMetrics.push(metric);
    this.trimDashboardMetrics();

    // Log dashboard performance warnings
    if (totalLoadTime > PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_SLOW) {
      console.warn(`Slow dashboard load: ${totalLoadTime}ms for user ${userId}`, {
        cacheHitRate: cacheStats.hitRate,
        failedComponents,
        networkRequests
      });
    }
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    database: {
      totalOperations: number;
      averageLatency: number;
      successRate: number;
      cacheHitRate: number;
      slowQueries: PerformanceMetric[];
      topOperations: Array<{ operation: string; count: number; avgLatency: number }>;
    };
    dashboard: {
      totalLoads: number;
      averageLoadTime: number;
      averageCacheHitRate: number;
      slowLoads: DashboardLoadMetric[];
      componentReliability: Array<{ component: string; successRate: number }>;
    };
    memory: {
      currentUsage: number;
      peakUsage: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    };
    recommendations: string[];
  } {
    const dbReport = this.analyzeDatabasePerformance();
    const dashboardReport = this.analyzeDashboardPerformance();
    const memoryReport = this.analyzeMemoryUsage();
    const recommendations = this.generateRecommendations();

    return {
      database: dbReport,
      dashboard: dashboardReport,
      memory: memoryReport,
      recommendations
    };
  }

  /**
   * Get real-time performance metrics
   */
  getRealTimeMetrics(): {
    database: {
      activeOperations: number;
      recentLatency: number;
      cacheHitRate: number;
    };
    memory: {
      usedHeapSize: number;
      percentUsed: number;
    };
    cache: {
      size: number;
      hitRate: number;
    };
  } {
    const recentMetrics = this.metrics.slice(-10);
    const dbMetrics = DatabaseService.getCacheStats();
    const cacheMetrics = dashboardCache.getMetrics();
    const memoryInfo = this.getCurrentMemoryInfo();

    return {
      database: {
        activeOperations: this.getActiveOperationsCount(),
        recentLatency: recentMetrics.length > 0 ? 
          recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length : 0,
        cacheHitRate: dbMetrics.cacheHitRate
      },
      memory: {
        usedHeapSize: memoryInfo.usedJSHeapSize,
        percentUsed: (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
      },
      cache: {
        size: cacheMetrics.memoryEntries,
        hitRate: cacheMetrics.hitRate
      }
    };
  }

  /**
   * Export performance data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      metrics: this.metrics,
      dashboardMetrics: this.dashboardMetrics,
      memoryMetrics: this.memoryMetrics,
      networkMetrics: this.networkMetrics,
      exportedAt: new Date(),
      report: this.getPerformanceReport()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.dashboardMetrics = [];
    this.memoryMetrics = [];
    this.networkMetrics = [];
  }

  // ============ PRIVATE METHODS ============

  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined') return;

    // Navigation timing
    if ('PerformanceObserver' in window) {
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNetworkMetric({
              timestamp: new Date(),
              type: 'response',
              url: navEntry.name,
              size: navEntry.transferSize || 0,
              duration: navEntry.loadEventEnd - navEntry.loadEventStart,
              status: 200
            });
          }
        });
      });

      try {
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordNetworkMetric({
              timestamp: new Date(),
              type: 'response',
              url: resourceEntry.name,
              size: resourceEntry.transferSize || 0,
              duration: resourceEntry.responseEnd - resourceEntry.requestStart,
              status: 200 // Not available in Resource Timing API
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }
    }
  }

  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const memoryInfo = this.getCurrentMemoryInfo();
      this.recordMemoryMetric(memoryInfo);
    }, 10000); // Every 10 seconds
  }

  private getCurrentMemoryInfo(): MemoryMetric {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        timestamp: new Date(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return {
      timestamp: new Date(),
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };
  }

  private recordMemoryMetric(metric: MemoryMetric): void {
    if (!this.isMonitoring) return;

    this.memoryMetrics.push(metric);
    
    // Keep only last 100 memory metrics
    if (this.memoryMetrics.length > 100) {
      this.memoryMetrics = this.memoryMetrics.slice(-100);
    }

    // Warn about high memory usage
    if (metric.usedJSHeapSize > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_HIGH * 1024 * 1024) {
      console.warn(`High memory usage: ${(metric.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  private recordNetworkMetric(metric: NetworkMetric): void {
    if (!this.isMonitoring) return;

    this.networkMetrics.push(metric);
    
    // Keep only last 500 network metrics
    if (this.networkMetrics.length > 500) {
      this.networkMetrics = this.networkMetrics.slice(-500);
    }
  }

  private analyzeDatabasePerformance() {
    const totalOps = this.metrics.length;
    const successfulOps = this.metrics.filter(m => m.success).length;
    const cachedOps = this.metrics.filter(m => m.cached).length;
    const avgLatency = totalOps > 0 ? 
      this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalOps : 0;

    const slowQueries = this.metrics
      .filter(m => m.duration > PERFORMANCE_THRESHOLDS.QUERY_SLOW)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const operationStats = this.getOperationStatistics();

    return {
      totalOperations: totalOps,
      averageLatency: Math.round(avgLatency),
      successRate: totalOps > 0 ? (successfulOps / totalOps) * 100 : 0,
      cacheHitRate: totalOps > 0 ? (cachedOps / totalOps) * 100 : 0,
      slowQueries,
      topOperations: operationStats.slice(0, 10)
    };
  }

  private analyzeDashboardPerformance() {
    const totalLoads = this.dashboardMetrics.length;
    const avgLoadTime = totalLoads > 0 ?
      this.dashboardMetrics.reduce((sum, m) => sum + m.totalLoadTime, 0) / totalLoads : 0;
    const avgCacheHitRate = totalLoads > 0 ?
      this.dashboardMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / totalLoads : 0;

    const slowLoads = this.dashboardMetrics
      .filter(m => m.totalLoadTime > PERFORMANCE_THRESHOLDS.DASHBOARD_LOAD_SLOW)
      .sort((a, b) => b.totalLoadTime - a.totalLoadTime)
      .slice(0, 10);

    const componentReliability = this.getComponentReliability();

    return {
      totalLoads,
      averageLoadTime: Math.round(avgLoadTime),
      averageCacheHitRate: Math.round(avgCacheHitRate),
      slowLoads,
      componentReliability
    };
  }

  private analyzeMemoryUsage() {
    if (this.memoryMetrics.length === 0) {
      return {
        currentUsage: 0,
        peakUsage: 0,
        trend: 'stable' as const
      };
    }

    const current = this.memoryMetrics[this.memoryMetrics.length - 1];
    const peak = Math.max(...this.memoryMetrics.map(m => m.usedJSHeapSize));
    
    // Analyze trend (last 10 metrics)
    const recent = this.memoryMetrics.slice(-10);
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (recent.length >= 5) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / secondHalf.length;
      
      const change = (secondAvg - firstAvg) / firstAvg;
      
      if (change > 0.1) trend = 'increasing';
      else if (change < -0.1) trend = 'decreasing';
    }

    return {
      currentUsage: Math.round(current.usedJSHeapSize / 1024 / 1024), // MB
      peakUsage: Math.round(peak / 1024 / 1024), // MB
      trend
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const dbStats = DatabaseService.getCacheStats();
    const cacheStats = dashboardCache.getMetrics();

    // Database recommendations
    if (dbStats.cacheHitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_LOW) {
      recommendations.push(`Low database cache hit rate (${dbStats.cacheHitRate.toFixed(1)}%). Consider adjusting cache TTL or warming critical data.`);
    }

    if (dbStats.averageLatency > PERFORMANCE_THRESHOLDS.QUERY_SLOW) {
      recommendations.push(`Average database query latency is high (${dbStats.averageLatency}ms). Review query optimization and indexing strategies.`);
    }

    // Cache recommendations
    if (cacheStats.hitRate < PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_LOW) {
      recommendations.push(`Dashboard cache hit rate is low (${cacheStats.hitRate.toFixed(1)}%). Consider preloading critical dashboard data.`);
    }

    // Memory recommendations
    const memoryReport = this.analyzeMemoryUsage();
    if (memoryReport.trend === 'increasing') {
      recommendations.push('Memory usage is trending upward. Check for memory leaks and consider optimizing data structures.');
    }

    if (memoryReport.peakUsage > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_HIGH) {
      recommendations.push(`Peak memory usage is high (${memoryReport.peakUsage}MB). Consider implementing data pagination or virtual scrolling.`);
    }

    // Slow queries recommendations
    const slowQueries = this.metrics.filter(m => m.duration > PERFORMANCE_THRESHOLDS.QUERY_SLOW);
    if (slowQueries.length > 0) {
      const uniqueSlowOps = [...new Set(slowQueries.map(q => q.operation))];
      recommendations.push(`Slow operations detected: ${uniqueSlowOps.join(', ')}. Consider query optimization or adding proper indexes.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable thresholds. No immediate optimizations required.');
    }

    return recommendations;
  }

  private getOperationStatistics() {
    const operationMap = new Map<string, { count: number; totalLatency: number }>();
    
    this.metrics.forEach(metric => {
      const existing = operationMap.get(metric.operation) || { count: 0, totalLatency: 0 };
      existing.count++;
      existing.totalLatency += metric.duration;
      operationMap.set(metric.operation, existing);
    });

    return Array.from(operationMap.entries())
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgLatency: Math.round(stats.totalLatency / stats.count)
      }))
      .sort((a, b) => b.count - a.count);
  }

  private getComponentReliability() {
    const componentMap = new Map<string, { total: number; failures: number }>();
    
    this.dashboardMetrics.forEach(metric => {
      metric.componentsLoaded.forEach(component => {
        const existing = componentMap.get(component) || { total: 0, failures: 0 };
        existing.total++;
        componentMap.set(component, existing);
      });
      
      metric.failedComponents.forEach(component => {
        const existing = componentMap.get(component) || { total: 0, failures: 0 };
        existing.total++;
        existing.failures++;
        componentMap.set(component, existing);
      });
    });

    return Array.from(componentMap.entries())
      .map(([component, stats]) => ({
        component,
        successRate: ((stats.total - stats.failures) / stats.total) * 100
      }))
      .sort((a, b) => a.successRate - b.successRate);
  }

  private getActiveOperationsCount(): number {
    // This would track actual active operations in a real implementation
    return 0;
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private trimDashboardMetrics(): void {
    if (this.dashboardMetrics.length > 100) {
      this.dashboardMetrics = this.dashboardMetrics.slice(-100);
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - would be more robust in production
    const headers = ['timestamp', 'operation', 'duration', 'success', 'cached'];
    const rows = data.metrics.map((m: PerformanceMetric) => 
      [m.timestamp.toISOString(), m.operation, m.duration, m.success, m.cached].join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  performanceMonitor.startMonitoring();
}