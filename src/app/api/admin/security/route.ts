/**
 * SECURITY-CRITICAL: Admin Security Dashboard API Route
 * 
 * Provides security monitoring and dashboard data for admin users.
 * Protected by enhanced admin middleware with comprehensive security logging.
 * 
 * OWASP Reference: Security Logging and Monitoring (A09:2021)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminApiHandler, AdminApiContext } from '@/middleware/adminApiMiddleware';
import { SecurityLogger, SecurityMonitor } from '@/lib/security/monitoring';

/**
 * GET /api/admin/security - Get security dashboard data
 */
async function handleGetSecurityDashboard(
  request: NextRequest,
  context: AdminApiContext
) {
  try {
    const { user, clientIP, userAgent } = context;
    
    // Log security dashboard access
    await SecurityLogger.adminAction(
      clientIP,
      user.uid,
      {
        action: 'security_dashboard_accessed',
        adminLevel: user.adminLevel,
        userAgent
      }
    );

    // Get comprehensive security dashboard data
    const dashboardData = SecurityMonitor.getSecurityDashboard();
    
    // Perform security health check
    const healthCheck = await SecurityMonitor.performSecurityHealthCheck();
    
    // Get recent security events (last 24 hours)
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentEvents = SecurityMonitor.exportSecurityEvents(last24Hours);
    
    // Categorize events by severity
    const eventsBySeverity = {
      critical: recentEvents.filter(e => e.severity === 'critical'),
      high: recentEvents.filter(e => e.severity === 'high'),
      medium: recentEvents.filter(e => e.severity === 'medium'),
      low: recentEvents.filter(e => e.severity === 'low')
    };
    
    // Admin-specific security insights
    const adminEvents = recentEvents.filter(e => 
      e.type.includes('admin') || e.type.includes('unauthorized')
    );
    
    // Security metrics summary
    const securitySummary = {
      totalEvents: recentEvents.length,
      criticalAlerts: eventsBySeverity.critical.length,
      adminAccessAttempts: adminEvents.length,
      uniqueIPs: new Set(recentEvents.map(e => e.clientIP)).size,
      topRisks: getTopSecurityRisks(recentEvents),
      healthStatus: healthCheck.status
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      summary: securitySummary,
      dashboard: dashboardData,
      healthCheck,
      recentEvents: {
        bySeverity: eventsBySeverity,
        adminEvents: adminEvents.slice(-50), // Last 50 admin events
        timeline: generateSecurityTimeline(recentEvents)
      },
      recommendations: generateSecurityRecommendations(recentEvents, healthCheck)
    };

    return NextResponse.json(response);

  } catch (error) {
    const { clientIP, userAgent } = context;
    
    await SecurityLogger.error(
      clientIP,
      context.user?.uid,
      error instanceof Error ? error : new Error('Unknown error in security dashboard'),
      {
        endpoint: '/api/admin/security',
        action: 'security_dashboard_failed',
        userAgent
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to retrieve security dashboard data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/security - Trigger security actions
 */
async function handleSecurityActions(
  request: NextRequest,
  context: AdminApiContext
) {
  try {
    const { user, clientIP, userAgent } = context;
    
    // Only super admins can trigger security actions
    if (user.adminLevel !== 'super') {
      await SecurityLogger.unauthorizedAccess(
        clientIP,
        user.uid,
        '/api/admin/security',
        {
          action: 'insufficient_privileges_security_action',
          userLevel: user.adminLevel,
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Super admin access required for security actions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, params } = body;

    let result: any = {};

    switch (action) {
      case 'force_health_check':
        result = await SecurityMonitor.performSecurityHealthCheck();
        break;
        
      case 'export_security_events':
        const { startTime, endTime } = params || {};
        result = {
          events: SecurityMonitor.exportSecurityEvents(startTime, endTime),
          exportedAt: new Date().toISOString()
        };
        break;
        
      case 'clear_old_events':
        // This would typically trigger a cleanup job
        result = { message: 'Security event cleanup initiated' };
        break;
        
      default:
        return NextResponse.json(
          { error: 'Unknown security action' },
          { status: 400 }
        );
    }

    await SecurityLogger.adminAction(
      clientIP,
      user.uid,
      {
        action: 'security_action_triggered',
        securityAction: action,
        params,
        userAgent
      }
    );

    return NextResponse.json({
      success: true,
      action,
      result,
      triggeredBy: user.uid,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const { clientIP, userAgent } = context;
    
    await SecurityLogger.error(
      clientIP,
      context.user?.uid,
      error instanceof Error ? error : new Error('Unknown error in security action'),
      {
        endpoint: '/api/admin/security',
        action: 'security_action_failed',
        userAgent
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to execute security action' },
      { status: 500 }
    );
  }
}

// Utility functions for security analysis
function getTopSecurityRisks(events: any[]): Array<{ type: string; count: number; severity: string }> {
  const riskCounts = new Map<string, { count: number; severity: string }>();
  
  events.forEach(event => {
    const current = riskCounts.get(event.type) || { count: 0, severity: event.severity };
    riskCounts.set(event.type, {
      count: current.count + 1,
      severity: event.severity === 'critical' ? 'critical' : current.severity
    });
  });
  
  return Array.from(riskCounts.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function generateSecurityTimeline(events: any[]): Array<{ hour: string; eventCount: number; criticalCount: number }> {
  const timeline = new Map<string, { eventCount: number; criticalCount: number }>();
  
  events.forEach(event => {
    const hour = new Date(event.timestamp || Date.now()).toISOString().split('T')[1].substring(0, 2);
    const current = timeline.get(hour) || { eventCount: 0, criticalCount: 0 };
    
    timeline.set(hour, {
      eventCount: current.eventCount + 1,
      criticalCount: current.criticalCount + (event.severity === 'critical' ? 1 : 0)
    });
  });
  
  return Array.from(timeline.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

function generateSecurityRecommendations(events: any[], healthCheck: any): string[] {
  const recommendations: string[] = [];
  
  // Check for patterns and generate recommendations
  const criticalEvents = events.filter(e => e.severity === 'critical');
  if (criticalEvents.length > 5) {
    recommendations.push('High number of critical security events detected. Immediate investigation recommended.');
  }
  
  const bruteForceAttempts = events.filter(e => e.type.includes('brute_force') || e.type.includes('failed_auth'));
  if (bruteForceAttempts.length > 20) {
    recommendations.push('Potential brute force attacks detected. Consider implementing additional rate limiting.');
  }
  
  const adminEvents = events.filter(e => e.type.includes('admin'));
  if (adminEvents.length > 100) {
    recommendations.push('High admin activity detected. Review admin access patterns for anomalies.');
  }
  
  if (healthCheck.status !== 'healthy') {
    recommendations.push('Security health check failed. Review failed checks and take corrective action.');
  }
  
  // Default recommendations
  if (recommendations.length === 0) {
    recommendations.push('Security posture appears normal. Continue monitoring for anomalies.');
  }
  
  return recommendations;
}

// Apply admin protection middleware
export const GET = createAdminApiHandler(handleGetSecurityDashboard);
export const POST = createAdminApiHandler(handleSecurityActions);

// Unsupported methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}