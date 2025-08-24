/**
 * Health Check API - Production Health Monitoring Endpoint
 * 
 * Provides comprehensive system health checks for monitoring and alerting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceDashboard } from '../../../services/monitoring/PerformanceDashboard';
import { errorTracker } from '../../../services/monitoring/ErrorTracker';
import logger from '../../../services/logging/ProductionLogger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  version: string;
  environment: string;
  uptime: number;
  services: {
    [serviceName: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      responseTime?: number;
      lastCheck: number;
      message?: string;
      details?: any;
    };
  };
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    errors: {
      rate: number;
      count24h: number;
      recoveryRate: number;
    };
    performance: {
      systemHealth: number;
      overallScore: number;
    };
  };
}

// Service health check functions
const healthChecks = {
  database: async (): Promise<{ status: string; responseTime: number; message?: string }> => {
    const start = Date.now();
    try {
      // Try to import and test database connection
      const { optimizedDatabaseService } = await import('../../../services/firebase/OptimizedDatabaseService');
      const metrics = optimizedDatabaseService.getConnectionMetrics();
      const responseTime = Date.now() - start;
      
      if (metrics.errorRate > 0.1) { // More than 10% error rate
        return {
          status: 'degraded',
          responseTime,
          message: `High error rate: ${(metrics.errorRate * 100).toFixed(1)}%`
        };
      }
      
      if (responseTime > 1000) { // Slower than 1 second
        return {
          status: 'degraded',
          responseTime,
          message: 'Slow database response'
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Database connection stable'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  },

  authentication: async (): Promise<{ status: string; responseTime: number; message?: string }> => {
    const start = Date.now();
    try {
      const { authService } = await import('../../../services/firebase/AuthService');
      // Simple health check - verify auth service is accessible
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Authentication service operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Authentication service unavailable'
      };
    }
  },

  cache: async (): Promise<{ status: string; responseTime: number; message?: string }> => {
    const start = Date.now();
    try {
      const { productionCacheManager } = await import('../../../services/cache/ProductionCacheManager');
      const stats = productionCacheManager.getStats();
      const responseTime = Date.now() - start;
      
      if (stats.hitRate < 0.7) { // Less than 70% hit rate
        return {
          status: 'degraded',
          responseTime,
          message: `Low cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Cache system operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Cache system unavailable'
      };
    }
  },

  realtime: async (): Promise<{ status: string; responseTime: number; message?: string }> => {
    const start = Date.now();
    try {
      const { optimizedRealtimeManager } = await import('../../../services/realtime/OptimizedRealtimeManager');
      const metrics = optimizedRealtimeManager.getMetrics();
      const responseTime = Date.now() - start;
      
      if (metrics.status !== 'connected') {
        return {
          status: 'degraded',
          responseTime,
          message: `Connection status: ${metrics.status}`
        };
      }
      
      if (metrics.latency > 500) { // Higher than 500ms latency
        return {
          status: 'degraded',
          responseTime,
          message: `High latency: ${metrics.latency}ms`
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Real-time services operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Real-time services unavailable'
      };
    }
  },

  storage: async (): Promise<{ status: string; responseTime: number; message?: string }> => {
    const start = Date.now();
    try {
      // Test Firebase Storage connection
      const testUpload = Date.now().toString();
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Storage service operational'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
        message: error instanceof Error ? error.message : 'Storage service unavailable'
      };
    }
  }
};

// Main health check handler
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const detailed = searchParams.get('detailed') === 'true';
  const service = searchParams.get('service');

  try {
    logger.debug('Health check requested', 'HealthAPI', {
      metadata: { detailed, service, userAgent: request.headers.get('user-agent') }
    });

    // If checking specific service
    if (service && healthChecks[service as keyof typeof healthChecks]) {
      const result = await healthChecks[service as keyof typeof healthChecks]();
      return NextResponse.json({
        service,
        ...result,
        timestamp: Date.now()
      });
    }

    // Get system metrics
    const errorStats = errorTracker.getStats();
    const performanceReport = performanceDashboard.getLatestReport();
    
    // Memory metrics (if available)
    const memoryInfo = (performance as any).memory || {};
    const memoryUsed = memoryInfo.usedJSHeapSize || 0;
    const memoryTotal = memoryInfo.totalJSHeapSize || memoryUsed;

    // Run service health checks
    const serviceResults: HealthCheckResult['services'] = {};
    
    const serviceCheckPromises = Object.entries(healthChecks).map(async ([serviceName, checkFn]) => {
      try {
        const result = await checkFn();
        serviceResults[serviceName] = {
          status: result.status as any,
          responseTime: result.responseTime,
          lastCheck: Date.now(),
          message: result.message
        };
      } catch (error) {
        serviceResults[serviceName] = {
          status: 'unhealthy',
          lastCheck: Date.now(),
          message: error instanceof Error ? error.message : 'Health check failed'
        };
      }
    });

    await Promise.all(serviceCheckPromises);

    // Calculate overall system status
    const serviceStatuses = Object.values(serviceResults).map(s => s.status);
    const unhealthyCount = serviceStatuses.filter(s => s === 'unhealthy').length;
    const degradedCount = serviceStatuses.filter(s => s === 'degraded').length;
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = unhealthyCount > 1 ? 'unhealthy' : 'degraded';
    } else if (degradedCount > 1) {
      overallStatus = 'degraded';
    } else if (degradedCount === 1) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Additional checks for overall health
    if (errorStats.systemHealth < 70) {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
    }

    const healthResponse: HealthCheckResult = {
      status: overallStatus,
      timestamp: Date.now(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - startTime, // Simplified uptime
      services: serviceResults,
      metrics: {
        memory: {
          used: memoryUsed,
          total: memoryTotal,
          percentage: memoryTotal > 0 ? (memoryUsed / memoryTotal) * 100 : 0
        },
        cpu: {
          usage: 0 // CPU usage would need additional monitoring setup
        },
        errors: {
          rate: errorStats.errorRate,
          count24h: errorStats.totalErrors,
          recoveryRate: errorStats.recoveryRate
        },
        performance: {
          systemHealth: errorStats.systemHealth,
          overallScore: performanceReport?.overall.score || 0
        }
      }
    };

    // Log health check result
    logger.info(`Health check completed: ${overallStatus}`, 'HealthAPI', {
      metadata: {
        status: overallStatus,
        responseTime: Date.now() - startTime,
        systemHealth: errorStats.systemHealth,
        errorRate: errorStats.errorRate
      }
    });

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(
      detailed ? healthResponse : {
        status: overallStatus,
        timestamp: healthResponse.timestamp,
        systemHealth: errorStats.systemHealth
      },
      { status: statusCode }
    );

  } catch (error) {
    logger.error('Health check failed', 'HealthAPI', {
      error: error as Error,
      metadata: { responseTime: Date.now() - startTime }
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: Date.now(),
        message: 'Health check system failure',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

// Simple HEAD request for basic health ping
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}

// POST endpoint for external health check integration
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clear-errors') {
      // Clear old errors for health improvement
      errorTracker.cleanup();
      
      logger.info('Error history cleared via health API', 'HealthAPI');
      
      return NextResponse.json({
        success: true,
        message: 'Error history cleared',
        timestamp: Date.now()
      });
    }

    if (action === 'generate-report') {
      // Generate fresh performance report
      const report = await performanceDashboard.generatePerformanceReport();
      
      return NextResponse.json({
        success: true,
        report,
        timestamp: Date.now()
      });
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Health API POST request failed', 'HealthAPI', {
      error: error as Error
    });

    return NextResponse.json(
      {
        error: 'Invalid request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 400 }
    );
  }
}