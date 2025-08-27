/**
 * Simplified Health Check API - Following Industry Best Practices
 * 
 * Replaces the complex 437-line health endpoint with a simple service registry approach.
 * Uses the DI container to check service health without defensive null checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/di-container';

interface HealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceStatus>;
  timestamp: number;
}

interface ServiceStatus {
  status: 'healthy' | 'unhealthy';
  message?: string;
  responseTime?: number;
}

/**
 * Check health of a specific service
 */
async function checkServiceHealth(serviceName: string): Promise<ServiceStatus> {
  const startTime = Date.now();
  
  try {
    const service = await container.get(serviceName);
    const responseTime = Date.now() - startTime;
    
    if (!service) {
      return {
        status: 'unhealthy',
        message: 'Service not initialized or failed to load',
        responseTime
      };
    }
    
    // If service has a health check method, use it
    if (service && typeof (service as any).healthCheck === 'function') {
      try {
        await (service as any).healthCheck();
      } catch (healthError) {
        return {
          status: 'unhealthy',
          message: healthError instanceof Error ? healthError.message : 'Health check failed',
          responseTime
        };
      }
    }
    
    return {
      status: 'healthy',
      responseTime
    };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Service check failed',
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Main health check handler
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const detailed = searchParams.get('detailed') === 'true';
  const service = searchParams.get('service');
  
  try {
    // If checking specific service
    if (service) {
      const result = await checkServiceHealth(service);
      return NextResponse.json({
        service,
        ...result,
        timestamp: Date.now()
      }, { 
        status: result.status === 'healthy' ? 200 : 503 
      });
    }
    
    // Check all core services
    const serviceNames = [
      'errorTracker',
      'authService', 
      'optimizedDatabaseService',
      'productionCacheManager',
      'optimizedRealtimeManager',
      'performanceDashboard'
    ];
    
    const serviceChecks = await Promise.all(
      serviceNames.map(async (name) => [name, await checkServiceHealth(name)] as const)
    );
    
    const services: Record<string, ServiceStatus> = {};
    let unhealthyCount = 0;
    
    for (const [name, status] of serviceChecks) {
      services[name] = status;
      if (status.status === 'unhealthy') {
        unhealthyCount++;
      }
    }
    
    // Calculate overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0) {
      overallStatus = 'healthy';
    } else if (unhealthyCount <= 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }
    
    const result: HealthResult = {
      status: overallStatus,
      services,
      timestamp: Date.now()
    };
    
    // Return detailed or simple response
    const response = detailed ? result : {
      status: result.status,
      timestamp: result.timestamp
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    return NextResponse.json(response, { status: statusCode });
    
  } catch (error) {
    console.error('[Health API] Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Health check system failure'
    }, { status: 503 });
  }
}

/**
 * Simple HEAD request for basic health ping
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}