import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const detailed = searchParams.get('detailed') === 'true';

  try {
    // Simple health checks without complex imports
    const healthChecks = {
      api: {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        message: 'API endpoint responding'
      },
      timestamp: Date.now()
    };

    // Basic system info
    const systemInfo = {
      status: 'healthy',
      timestamp: Date.now(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime ? process.uptime() : 0,
      checks: healthChecks
    };

    if (!detailed) {
      return NextResponse.json({
        status: 'healthy',
        timestamp: Date.now()
      });
    }

    return NextResponse.json(systemInfo);
  } catch (error) {
    console.error('Simple health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}