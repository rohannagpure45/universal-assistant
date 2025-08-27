/**
 * Test endpoint to verify services integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/di-container';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Test getting services through the DI container
    const errorTracker = await container.get('errorTracker');
    const authService = await container.get('authService');
    const performanceDashboard = await container.get('performanceDashboard');
    
    return NextResponse.json({
      success: true,
      services: {
        errorTracker: errorTracker ? 'loaded' : 'failed',
        authService: authService ? 'loaded' : 'failed',
        performanceDashboard: performanceDashboard ? 'loaded' : 'failed',
      },
      message: 'DI Container working correctly'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'DI Container test failed'
    }, { status: 500 });
  }
}