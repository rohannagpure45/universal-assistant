interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  clientIP: string;
  userAgent: string;
  userId?: string;
  details?: Record<string, any>;
  timestamp?: number;
}

interface ApiRequestLog {
  method: string;
  path: string;
  clientIP: string;
  userAgent: string;
  userId?: string;
  statusCode: number;
  processingTime: number;
  rateLimitUsed: number;
  timestamp?: number;
}

interface SecurityMetrics {
  totalRequests: number;
  failedAuthAttempts: number;
  rateLimitViolations: number;
  suspiciousActivities: number;
  averageResponseTime: number;
  uniqueIPs: Set<string>;
  topUserAgents: Map<string, number>;
  hourlyStats: Map<string, number>;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  riskScore: number;
  reasons: string[];
  suggestedActions: string[];
}

class SecurityEventBuffer {
  private events: SecurityEvent[] = [];
  private readonly maxSize = 10000;
  private readonly flushInterval = 30000; // 30 seconds

  constructor() {
    // Flush events periodically
    setInterval(() => this.flush(), this.flushInterval);
  }

  add(event: SecurityEvent) {
    this.events.push({
      ...event,
      timestamp: event.timestamp || Date.now()
    });

    // Keep buffer size manageable
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }

    // Immediate processing for critical events
    if (event.severity === 'critical') {
      this.processCriticalEvent(event);
    }
  }

  private async processCriticalEvent(event: SecurityEvent) {
    try {
      // Send immediate alert
      await this.sendAlert(event);
      
      // Log to external service
      await this.logToExternalService(event);
      
      // Trigger automated response if needed
      await this.triggerAutomatedResponse(event);
    } catch (error) {
      console.error('Error processing critical security event:', error);
    }
  }

  private async sendAlert(event: SecurityEvent) {
    const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 SECURITY ALERT: ${event.type}`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Severity', value: event.severity, short: true },
              { title: 'IP', value: event.clientIP, short: true },
              { title: 'User ID', value: event.userId || 'anonymous', short: true },
              { title: 'Details', value: JSON.stringify(event.details), short: false }
            ]
          }]
        })
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private async logToExternalService(event: SecurityEvent) {
    // Log to external security service (e.g., Datadog, Splunk)
    const logEndpoint = process.env.SECURITY_LOG_ENDPOINT;
    if (!logEndpoint) return;

    try {
      await fetch(logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_LOG_API_KEY}`
        },
        body: JSON.stringify({
          ...event,
          service: 'universal-assistant',
          environment: process.env.NODE_ENV
        })
      });
    } catch (error) {
      console.error('Failed to log to external service:', error);
    }
  }

  private async triggerAutomatedResponse(event: SecurityEvent) {
    // Automated responses based on event type
    switch (event.type) {
      case 'brute_force_attack':
        await this.blockIP(event.clientIP, '1h');
        break;
      case 'sql_injection_attempt':
        await this.blockIP(event.clientIP, '24h');
        break;
      case 'multiple_failed_auth':
        await this.temporaryAccountLock(event.userId);
        break;
    }
  }

  private async blockIP(ip: string, duration: string) {
    // Implementation would depend on your infrastructure
    console.log(`Would block IP ${ip} for ${duration}`);
  }

  private async temporaryAccountLock(userId?: string) {
    if (!userId) return;
    console.log(`Would temporarily lock account ${userId}`);
  }

  private flush() {
    if (this.events.length === 0) return;

    // Process accumulated events
    this.generateSecurityReport();
    
    // Clear processed events (keep recent ones for analysis)
    const recentEvents = this.events.slice(-1000);
    this.events = recentEvents;
  }

  private generateSecurityReport() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const recentEvents = this.events.filter(e => (e.timestamp || 0) > hourAgo);

    if (recentEvents.length === 0) return;

    const report = {
      timeWindow: '1h',
      totalEvents: recentEvents.length,
      severityBreakdown: this.analyzeSeverity(recentEvents),
      topAttackTypes: this.analyzeAttackTypes(recentEvents),
      suspiciousIPs: this.analyzeSuspiciousIPs(recentEvents),
      anomalies: this.detectAnomalies(recentEvents)
    };

    console.log('Security Report:', JSON.stringify(report, null, 2));
  }

  private analyzeSeverity(events: SecurityEvent[]) {
    const severity = { low: 0, medium: 0, high: 0, critical: 0 };
    events.forEach(e => severity[e.severity]++);
    return severity;
  }

  private analyzeAttackTypes(events: SecurityEvent[]) {
    const types = new Map<string, number>();
    events.forEach(e => {
      types.set(e.type, (types.get(e.type) || 0) + 1);
    });
    return Array.from(types.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }

  private analyzeSuspiciousIPs(events: SecurityEvent[]) {
    const ipCounts = new Map<string, number>();
    events.forEach(e => {
      ipCounts.set(e.clientIP, (ipCounts.get(e.clientIP) || 0) + 1);
    });
    
    return Array.from(ipCounts.entries())
      .filter(([, count]) => count > 10) // Suspicious if > 10 events per hour
      .sort(([,a], [,b]) => b - a);
  }

  private detectAnomalies(events: SecurityEvent[]): AnomalyDetectionResult[] {
    const anomalies: AnomalyDetectionResult[] = [];

    // Check for unusual patterns
    const ipFrequency = new Map<string, number>();
    const userAgentFrequency = new Map<string, number>();

    events.forEach(event => {
      ipFrequency.set(event.clientIP, (ipFrequency.get(event.clientIP) || 0) + 1);
      userAgentFrequency.set(event.userAgent, (userAgentFrequency.get(event.userAgent) || 0) + 1);
    });

    // Detect high-frequency IPs
    for (const [ip, count] of ipFrequency.entries()) {
      if (count > 50) { // More than 50 events in an hour
        anomalies.push({
          isAnomaly: true,
          riskScore: Math.min(count / 100, 1.0),
          reasons: [`High frequency requests from IP: ${ip} (${count} events)`],
          suggestedActions: ['Consider IP blocking', 'Investigate user activity']
        });
      }
    }

    // Detect suspicious user agents
    for (const [userAgent, count] of userAgentFrequency.entries()) {
      if (userAgent.length < 10 || userAgent.includes('bot') || userAgent.includes('crawler')) {
        if (count > 20) {
          anomalies.push({
            isAnomaly: true,
            riskScore: 0.8,
            reasons: [`Suspicious user agent with high activity: ${userAgent}`],
            suggestedActions: ['Block suspicious user agent', 'Enhanced monitoring']
          });
        }
      }
    }

    return anomalies;
  }

  getEvents(filter?: Partial<SecurityEvent>): SecurityEvent[] {
    if (!filter) return [...this.events];

    return this.events.filter(event => {
      return Object.entries(filter).every(([key, value]) => {
        return event[key as keyof SecurityEvent] === value;
      });
    });
  }

  getMetrics(): SecurityMetrics {
    const uniqueIPs = new Set<string>();
    const userAgents = new Map<string, number>();
    const hourlyStats = new Map<string, number>();
    
    let totalRequests = 0;
    let failedAuthAttempts = 0;
    let rateLimitViolations = 0;
    let suspiciousActivities = 0;
    let totalResponseTime = 0;

    this.events.forEach(event => {
      totalRequests++;
      uniqueIPs.add(event.clientIP);
      
      const hour = new Date(event.timestamp || Date.now()).getHours().toString();
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
      
      userAgents.set(event.userAgent, (userAgents.get(event.userAgent) || 0) + 1);

      switch (event.type) {
        case 'invalid_token':
        case 'missing_auth_header':
          failedAuthAttempts++;
          break;
        case 'rate_limit_exceeded':
          rateLimitViolations++;
          break;
        case 'csrf_violation':
        case 'sql_injection_attempt':
          suspiciousActivities++;
          break;
      }
    });

    return {
      totalRequests,
      failedAuthAttempts,
      rateLimitViolations,
      suspiciousActivities,
      averageResponseTime: totalResponseTime / totalRequests || 0,
      uniqueIPs,
      topUserAgents: userAgents,
      hourlyStats
    };
  }
}

export class SecurityMonitor {
  private static eventBuffer = new SecurityEventBuffer();
  private static apiLogs: ApiRequestLog[] = [];

  static async logSecurityEvent(event: SecurityEvent) {
    this.eventBuffer.add(event);
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SECURITY] ${event.severity.toUpperCase()}: ${event.type}`, {
        ip: event.clientIP,
        userId: event.userId,
        details: event.details
      });
    }
  }

  static async logApiRequest(request: ApiRequestLog) {
    const logEntry = {
      ...request,
      timestamp: request.timestamp || Date.now()
    };

    this.apiLogs.push(logEntry);

    // Keep only recent API logs (last 1000)
    if (this.apiLogs.length > 1000) {
      this.apiLogs = this.apiLogs.slice(-1000);
    }

    // Detect suspicious patterns in API usage
    await this.analyzeApiPatterns(logEntry);
  }

  private static async analyzeApiPatterns(request: ApiRequestLog) {
    const recentRequests = this.apiLogs.filter(
      log => log.clientIP === request.clientIP && 
             (Date.now() - (log.timestamp || 0)) < 300000 // Last 5 minutes
    );

    // Check for suspicious patterns
    if (recentRequests.length > 100) {
      await this.logSecurityEvent({
        type: 'high_frequency_api_usage',
        severity: 'medium',
        clientIP: request.clientIP,
        userAgent: request.userAgent,
        userId: request.userId,
        details: {
          requestCount: recentRequests.length,
          timeWindow: '5m',
          statusCodes: recentRequests.map(r => r.statusCode)
        }
      });
    }

    // Check for error patterns
    const errorRequests = recentRequests.filter(r => r.statusCode >= 400);
    if (errorRequests.length > 20) {
      await this.logSecurityEvent({
        type: 'high_error_rate',
        severity: 'medium',
        clientIP: request.clientIP,
        userAgent: request.userAgent,
        userId: request.userId,
        details: {
          errorCount: errorRequests.length,
          totalRequests: recentRequests.length,
          errorRate: errorRequests.length / recentRequests.length
        }
      });
    }

    // Check for slow requests (potential DoS)
    if (request.processingTime > 10000) { // 10 seconds
      await this.logSecurityEvent({
        type: 'slow_request_detected',
        severity: 'low',
        clientIP: request.clientIP,
        userAgent: request.userAgent,
        userId: request.userId,
        details: {
          processingTime: request.processingTime,
          path: request.path,
          method: request.method
        }
      });
    }
  }

  // Enhanced monitoring for voice-specific security
  static async logVoiceDataAccess(
    userId: string,
    voiceId: string,
    action: 'read' | 'write' | 'delete',
    clientIP: string,
    userAgent: string
  ) {
    await this.logSecurityEvent({
      type: 'voice_data_access',
      severity: action === 'delete' ? 'medium' : 'low',
      clientIP,
      userAgent,
      userId,
      details: {
        voiceId,
        action,
        dataType: 'voice_sample'
      }
    });
  }

  static async logAIModelUsage(
    userId: string,
    model: string,
    tokenCount: number,
    cost: number,
    clientIP: string,
    userAgent: string
  ) {
    await this.logSecurityEvent({
      type: 'ai_model_usage',
      severity: 'low',
      clientIP,
      userAgent,
      userId,
      details: {
        model,
        tokenCount,
        cost,
        timestamp: Date.now()
      }
    });

    // Alert on unusual usage patterns
    if (tokenCount > 10000 || cost > 100) {
      await this.logSecurityEvent({
        type: 'high_ai_usage',
        severity: 'medium',
        clientIP,
        userAgent,
        userId,
        details: {
          model,
          tokenCount,
          cost,
          threshold: 'exceeded'
        }
      });
    }
  }

  static async logMeetingAccess(
    userId: string,
    meetingId: string,
    action: 'join' | 'create' | 'view' | 'delete',
    clientIP: string,
    userAgent: string
  ) {
    await this.logSecurityEvent({
      type: 'meeting_access',
      severity: action === 'delete' ? 'medium' : 'low',
      clientIP,
      userAgent,
      userId,
      details: {
        meetingId,
        action
      }
    });
  }

  // Real-time security dashboard data
  static getSecurityDashboard() {
    const metrics = this.eventBuffer.getMetrics();
    const recentEvents = this.eventBuffer.getEvents();
    
    return {
      metrics,
      recentEvents: recentEvents.slice(-50), // Last 50 events
      alerts: recentEvents.filter(e => e.severity === 'high' || e.severity === 'critical'),
      apiMetrics: {
        totalRequests: this.apiLogs.length,
        averageResponseTime: this.apiLogs.reduce((sum, log) => sum + log.processingTime, 0) / this.apiLogs.length || 0,
        errorRate: this.apiLogs.filter(log => log.statusCode >= 400).length / this.apiLogs.length || 0
      }
    };
  }

  // Security health check
  static async performSecurityHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{ name: string; status: 'pass' | 'fail'; details?: string }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check recent critical events
    const recentCritical = this.eventBuffer.getEvents().filter(
      e => e.severity === 'critical' && 
           (Date.now() - (e.timestamp || 0)) < 3600000 // Last hour
    );

    checks.push({
      name: 'Critical Events',
      status: recentCritical.length === 0 ? 'pass' as const : 'fail' as const,
      details: recentCritical.length > 0 ? `${recentCritical.length} critical events in last hour` : undefined
    });

    if (recentCritical.length > 0) {
      overallStatus = 'critical';
    }

    // Check rate limit violations
    const rateLimitViolations = this.eventBuffer.getEvents().filter(
      e => e.type === 'rate_limit_exceeded' && 
           (Date.now() - (e.timestamp || 0)) < 3600000
    );

    checks.push({
      name: 'Rate Limiting',
      status: rateLimitViolations.length < 10 ? 'pass' as const : 'fail' as const,
      details: rateLimitViolations.length >= 10 ? `${rateLimitViolations.length} violations in last hour` : undefined
    });

    if (rateLimitViolations.length >= 10 && overallStatus === 'healthy') {
      overallStatus = 'warning';
    }

    // Check API error rate
    const recentApiLogs = this.apiLogs.filter(log => (Date.now() - (log.timestamp || 0)) < 3600000);
    const errorRate = recentApiLogs.filter(log => log.statusCode >= 400).length / recentApiLogs.length || 0;

    checks.push({
      name: 'API Error Rate',
      status: errorRate < 0.05 ? 'pass' as const : 'fail' as const, // 5% threshold
      details: errorRate >= 0.05 ? `${(errorRate * 100).toFixed(2)}% error rate` : undefined
    });

    if (errorRate >= 0.1 && overallStatus !== 'critical') {
      overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
    }

    return { status: overallStatus, checks };
  }

  // Export security events for analysis
  static exportSecurityEvents(startTime?: number, endTime?: number) {
    const events = this.eventBuffer.getEvents();
    
    return events.filter(event => {
      const timestamp = event.timestamp || 0;
      if (startTime && timestamp < startTime) return false;
      if (endTime && timestamp > endTime) return false;
      return true;
    });
  }
}

/**
 * SECURITY-CRITICAL: Enhanced Security Logger for Admin Operations
 * Provides specialized logging for authentication and authorization events
 */
export class SecurityLogger {
  /**
   * Log suspicious activity with enhanced context
   */
  static async suspiciousActivity(
    clientIP: string,
    userId: string | null,
    details: Record<string, any>
  ) {
    await SecurityMonitor.logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'high',
      clientIP,
      userAgent: details.userAgent || 'unknown',
      userId: userId || undefined,
      details
    });
  }

  /**
   * Log admin-specific actions for audit trail
   */
  static async adminAction(
    clientIP: string,
    adminId: string,
    details: Record<string, any>
  ) {
    await SecurityMonitor.logSecurityEvent({
      type: 'admin_action',
      severity: 'medium',
      clientIP,
      userAgent: details.userAgent || 'unknown',
      userId: adminId,
      details
    });
  }

  /**
   * Log authentication errors
   */
  static async error(
    clientIP: string,
    userId: string | null,
    error: Error,
    context: Record<string, any>
  ) {
    await SecurityMonitor.logSecurityEvent({
      type: 'authentication_error',
      severity: 'medium',
      clientIP,
      userAgent: context.userAgent || 'unknown',
      userId: userId || undefined,
      details: {
        ...context,
        error: error.message,
        stack: error.stack?.substring(0, 500) // Truncate stack trace
      }
    });
  }

  /**
   * Log unauthorized access attempts
   */
  static async unauthorizedAccess(
    clientIP: string,
    userId: string | null,
    resource: string,
    details: Record<string, any>
  ) {
    await SecurityMonitor.logSecurityEvent({
      type: 'unauthorized_access_attempt',
      severity: 'high',
      clientIP,
      userAgent: details.userAgent || 'unknown',
      userId: userId || undefined,
      details: {
        ...details,
        resource,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log data access events
   */
  static async dataAccess(
    clientIP: string,
    userId: string,
    resource: string,
    operation: 'read' | 'write' | 'delete' | 'automated',
    success: boolean = true,
    details?: any
  ) {
    await SecurityMonitor.logSecurityEvent({
      type: 'data_access',
      severity: success ? 'low' : 'medium',
      clientIP,
      userAgent: 'system',
      userId,
      details: {
        resource,
        operation,
        success,
        timestamp: new Date().toISOString(),
        ...details
      }
    });
  }
}

// Export types and interfaces
export type { SecurityEvent, ApiRequestLog, SecurityMetrics, AnomalyDetectionResult };