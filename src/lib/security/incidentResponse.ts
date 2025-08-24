/**
 * Incident response automation for Universal Assistant
 * Automated threat detection, incident classification, and response workflows
 */

import { SecurityLogger, SecurityEvent } from './monitoring';
import { environmentValidator } from './envValidation';

export interface IncidentDefinition {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_breach' | 'malware' | 'ddos' | 'system' | 'compliance';
  triggers: IncidentTrigger[];
  responseActions: ResponseAction[];
  escalationRules: EscalationRule[];
  containmentActions: ContainmentAction[];
  notificationTemplates: NotificationTemplate[];
}

export interface IncidentTrigger {
  type: 'event_count' | 'pattern_match' | 'time_based' | 'threshold' | 'anomaly';
  conditions: Record<string, any>;
  timeWindow?: number; // seconds
  threshold?: number;
}

export interface ResponseAction {
  id: string;
  name: string;
  type: 'automatic' | 'manual' | 'approval_required';
  priority: number;
  action: string;
  parameters: Record<string, any>;
  timeout?: number;
}

export interface EscalationRule {
  condition: string;
  escalateTo: string[];
  delay?: number; // seconds
  maxAttempts?: number;
}

export interface ContainmentAction {
  id: string;
  name: string;
  description: string;
  automatic: boolean;
  action: () => Promise<boolean>;
  rollback?: () => Promise<boolean>;
}

export interface NotificationTemplate {
  channel: 'email' | 'slack' | 'webhook' | 'sms';
  severity: 'low' | 'medium' | 'high' | 'critical';
  template: string;
  recipients: string[];
}

export interface ActiveIncident {
  id: string;
  definitionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  events: SecurityEvent[];
  timeline: IncidentTimelineEntry[];
  responseActions: ExecutedAction[];
  assignedTo?: string;
  resolution?: string;
  metadata: Record<string, any>;
}

export interface IncidentTimelineEntry {
  timestamp: Date;
  action: string;
  details: string;
  automated: boolean;
  userId?: string;
}

export interface ExecutedAction {
  actionId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

/**
 * Incident response automation engine
 */
export class IncidentResponseEngine {
  private incidents: Map<string, ActiveIncident> = new Map();
  private definitions: Map<string, IncidentDefinition> = new Map();
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadIncidentDefinitions();
  }

  /**
   * Start the incident response engine
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚨 Incident Response Engine started');
    
    // Check for incidents every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkForIncidents();
    }, 30000);
    
    // Monitor security events
    this.monitorSecurityEvents();
  }

  /**
   * Stop the incident response engine
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    console.log('🛑 Incident Response Engine stopped');
  }

  /**
   * Register a new incident
   */
  async registerIncident(
    definitionId: string,
    triggeringEvents: SecurityEvent[],
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new Error(`Unknown incident definition: ${definitionId}`);
    }

    const incidentId = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: ActiveIncident = {
      id: incidentId,
      definitionId,
      severity: definition.severity,
      status: 'detected',
      createdAt: new Date(),
      updatedAt: new Date(),
      events: triggeringEvents,
      timeline: [{
        timestamp: new Date(),
        action: 'incident_created',
        details: `Incident created: ${definition.name}`,
        automated: true
      }],
      responseActions: [],
      metadata
    };

    this.incidents.set(incidentId, incident);
    
    console.log(`🚨 New incident registered: ${incidentId} (${definition.name})`);
    
    // Start automated response
    await this.executeAutomatedResponse(incidentId);
    
    return incidentId;
  }

  /**
   * Execute automated response actions
   */
  private async executeAutomatedResponse(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    const definition = this.definitions.get(incident.definitionId);
    if (!definition) return;

    // Sort actions by priority
    const actions = definition.responseActions
      .filter(action => action.type === 'automatic')
      .sort((a, b) => a.priority - b.priority);

    for (const action of actions) {
      await this.executeAction(incidentId, action);
    }

    // Execute containment actions if severity is high or critical
    if (incident.severity === 'high' || incident.severity === 'critical') {
      for (const containment of definition.containmentActions) {
        if (containment.automatic) {
          await this.executeContainmentAction(incidentId, containment);
        }
      }
    }

    // Send notifications
    await this.sendNotifications(incidentId);
    
    // Check escalation rules
    await this.checkEscalation(incidentId);
  }

  /**
   * Execute a response action
   */
  private async executeAction(incidentId: string, action: ResponseAction): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    const executedAction: ExecutedAction = {
      actionId: action.id,
      status: 'executing',
      startedAt: new Date()
    };

    incident.responseActions.push(executedAction);
    this.addToTimeline(incidentId, `Executing action: ${action.name}`, true);

    try {
      let result: any;
      
      switch (action.action) {
        case 'block_ip':
          result = await this.blockIP(action.parameters.ip);
          break;
        case 'disable_user':
          result = await this.disableUser(action.parameters.userId);
          break;
        case 'force_password_reset':
          result = await this.forcePasswordReset(action.parameters.userId);
          break;
        case 'increase_monitoring':
          result = await this.increaseMonitoring(action.parameters);
          break;
        case 'backup_data':
          result = await this.emergencyBackup(action.parameters);
          break;
        case 'isolate_system':
          result = await this.isolateSystem(action.parameters);
          break;
        default:
          throw new Error(`Unknown action: ${action.action}`);
      }

      executedAction.status = 'completed';
      executedAction.completedAt = new Date();
      executedAction.result = result;
      
      this.addToTimeline(incidentId, `Action completed: ${action.name}`, true);
      
    } catch (error) {
      executedAction.status = 'failed';
      executedAction.completedAt = new Date();
      executedAction.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.addToTimeline(incidentId, `Action failed: ${action.name} - ${executedAction.error}`, true);
      
      console.error(`Failed to execute action ${action.id}:`, error);
    }
  }

  /**
   * Execute containment action
   */
  private async executeContainmentAction(incidentId: string, containment: ContainmentAction): Promise<void> {
    this.addToTimeline(incidentId, `Executing containment: ${containment.name}`, true);
    
    try {
      const result = await containment.action();
      
      if (result) {
        this.addToTimeline(incidentId, `Containment successful: ${containment.name}`, true);
      } else {
        this.addToTimeline(incidentId, `Containment failed: ${containment.name}`, true);
      }
    } catch (error) {
      this.addToTimeline(incidentId, `Containment error: ${containment.name} - ${error}`, true);
      console.error(`Containment action failed:`, error);
    }
  }

  /**
   * Send notifications for incident
   */
  private async sendNotifications(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    const definition = this.definitions.get(incident.definitionId);
    if (!definition) return;

    const notifications = definition.notificationTemplates
      .filter(template => template.severity === incident.severity);

    for (const notification of notifications) {
      try {
        await this.sendNotification(incidentId, notification);
        this.addToTimeline(incidentId, `Notification sent via ${notification.channel}`, true);
      } catch (error) {
        console.error(`Failed to send notification via ${notification.channel}:`, error);
      }
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(incidentId: string, template: NotificationTemplate): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    const definition = this.definitions.get(incident.definitionId);
    if (!definition) return;

    const message = this.renderNotificationTemplate(template.template, incident, definition);

    switch (template.channel) {
      case 'webhook':
        if (process.env.SECURITY_ALERT_WEBHOOK) {
          await fetch(process.env.SECURITY_ALERT_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: message,
              incident_id: incidentId,
              severity: incident.severity,
              status: incident.status
            })
          });
        }
        break;
      
      case 'slack':
        if (process.env.SLACK_WEBHOOK_URL) {
          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: message,
              attachments: [{
                color: this.getSeverityColor(incident.severity),
                fields: [
                  { title: 'Incident ID', value: incidentId, short: true },
                  { title: 'Severity', value: incident.severity.toUpperCase(), short: true },
                  { title: 'Status', value: incident.status, short: true },
                  { title: 'Events', value: incident.events.length.toString(), short: true }
                ]
              }]
            })
          });
        }
        break;
      
      case 'email':
        // Email implementation would go here
        console.log(`📧 Email notification: ${message}`);
        break;
      
      default:
        console.log(`📢 ${template.channel}: ${message}`);
    }
  }

  /**
   * Check escalation rules
   */
  private async checkEscalation(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    const definition = this.definitions.get(incident.definitionId);
    if (!definition) return;

    // Auto-escalate critical incidents immediately
    if (incident.severity === 'critical') {
      this.addToTimeline(incidentId, 'Auto-escalating critical incident', true);
      
      // Send escalation notifications
      for (const rule of definition.escalationRules) {
        await this.executeEscalation(incidentId, rule);
      }
    }
  }

  /**
   * Execute escalation rule
   */
  private async executeEscalation(incidentId: string, rule: EscalationRule): Promise<void> {
    // Implementation would depend on your escalation system
    console.log(`📈 Escalating incident ${incidentId} to: ${rule.escalateTo.join(', ')}`);
    this.addToTimeline(incidentId, `Escalated to: ${rule.escalateTo.join(', ')}`, true);
  }

  /**
   * Check for new incidents based on security events
   */
  private async checkForIncidents(): Promise<void> {
    // This would analyze recent security events and check against incident triggers
    // Implementation depends on your security monitoring system
  }

  /**
   * Monitor security events
   */
  private monitorSecurityEvents(): void {
    // This would integrate with your security monitoring system
    // to automatically detect incidents based on security events
  }

  /**
   * Response action implementations
   */
  private async blockIP(ip: string): Promise<boolean> {
    console.log(`🚫 Blocking IP: ${ip}`);
    // Implementation would depend on your infrastructure
    // Could integrate with WAF, firewall, or rate limiting service
    return true;
  }

  private async disableUser(userId: string): Promise<boolean> {
    console.log(`🔒 Disabling user: ${userId}`);
    // Implementation would integrate with your authentication system
    return true;
  }

  private async forcePasswordReset(userId: string): Promise<boolean> {
    console.log(`🔑 Forcing password reset for user: ${userId}`);
    // Implementation would integrate with your authentication system
    return true;
  }

  private async increaseMonitoring(parameters: any): Promise<boolean> {
    console.log(`📊 Increasing monitoring with parameters:`, parameters);
    // Implementation would adjust monitoring sensitivity/frequency
    return true;
  }

  private async emergencyBackup(parameters: any): Promise<boolean> {
    console.log(`💾 Starting emergency backup:`, parameters);
    // Implementation would trigger backup procedures
    return true;
  }

  private async isolateSystem(parameters: any): Promise<boolean> {
    console.log(`🏝️ Isolating system:`, parameters);
    // Implementation would isolate affected systems
    return true;
  }

  /**
   * Utility methods
   */
  private addToTimeline(incidentId: string, details: string, automated: boolean): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.timeline.push({
      timestamp: new Date(),
      action: 'response_action',
      details,
      automated
    });

    incident.updatedAt = new Date();
  }

  private renderNotificationTemplate(template: string, incident: ActiveIncident, definition: IncidentDefinition): string {
    return template
      .replace('{{incident_id}}', incident.id)
      .replace('{{incident_name}}', definition.name)
      .replace('{{severity}}', incident.severity)
      .replace('{{status}}', incident.status)
      .replace('{{created_at}}', incident.createdAt.toISOString())
      .replace('{{event_count}}', incident.events.length.toString());
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'warning';
      case 'low': return 'good';
      default: return 'warning';
    }
  }

  /**
   * Load predefined incident definitions
   */
  private loadIncidentDefinitions(): void {
    // Authentication failures
    this.definitions.set('auth_failures', {
      id: 'auth_failures',
      name: 'Multiple Authentication Failures',
      description: 'Detected multiple failed authentication attempts',
      severity: 'medium',
      category: 'authentication',
      triggers: [{
        type: 'event_count',
        conditions: { type: 'auth_failure' },
        timeWindow: 300, // 5 minutes
        threshold: 10
      }],
      responseActions: [{
        id: 'block_ip_temp',
        name: 'Temporarily Block IP',
        type: 'automatic',
        priority: 1,
        action: 'block_ip',
        parameters: { duration: 3600 }, // 1 hour
        timeout: 30
      }],
      escalationRules: [{
        condition: 'severity >= high',
        escalateTo: ['security-team@company.com'],
        delay: 300
      }],
      containmentActions: [{
        id: 'increase_auth_monitoring',
        name: 'Increase Authentication Monitoring',
        description: 'Increase monitoring sensitivity for authentication events',
        automatic: true,
        action: async () => { return true; }
      }],
      notificationTemplates: [{
        channel: 'slack',
        severity: 'medium',
        template: '🚨 Security Alert: {{incident_name}}\nIncident ID: {{incident_id}}\nSeverity: {{severity}}\nEvents: {{event_count}}',
        recipients: ['#security-alerts']
      }]
    });

    // Suspicious data access
    this.definitions.set('suspicious_data_access', {
      id: 'suspicious_data_access',
      name: 'Suspicious Data Access Pattern',
      description: 'Detected unusual data access patterns',
      severity: 'high',
      category: 'data_breach',
      triggers: [{
        type: 'anomaly',
        conditions: { 
          type: 'data_access',
          anomaly_type: 'volume_spike'
        },
        threshold: 5
      }],
      responseActions: [{
        id: 'emergency_backup',
        name: 'Emergency Data Backup',
        type: 'automatic',
        priority: 1,
        action: 'backup_data',
        parameters: { priority: 'high' }
      }, {
        id: 'increase_data_monitoring',
        name: 'Increase Data Access Monitoring',
        type: 'automatic',
        priority: 2,
        action: 'increase_monitoring',
        parameters: { target: 'data_access', sensitivity: 'high' }
      }],
      escalationRules: [{
        condition: 'always',
        escalateTo: ['security-team@company.com', 'dpo@company.com'],
        delay: 0
      }],
      containmentActions: [{
        id: 'limit_data_access',
        name: 'Limit Data Access',
        description: 'Temporarily restrict data access for suspicious users',
        automatic: false,
        action: async () => { return true; }
      }],
      notificationTemplates: [{
        channel: 'webhook',
        severity: 'high',
        template: '🚨 HIGH SEVERITY: {{incident_name}}\nImmediate attention required!\nIncident: {{incident_id}}',
        recipients: ['security-team']
      }]
    });

    // Critical system errors
    this.definitions.set('critical_system_errors', {
      id: 'critical_system_errors',
      name: 'Critical System Errors',
      description: 'Critical system errors indicating potential compromise',
      severity: 'critical',
      category: 'system',
      triggers: [{
        type: 'event_count',
        conditions: { 
          type: 'error',
          severity: 'critical'
        },
        timeWindow: 60,
        threshold: 5
      }],
      responseActions: [{
        id: 'isolate_affected_systems',
        name: 'Isolate Affected Systems',
        type: 'approval_required',
        priority: 1,
        action: 'isolate_system',
        parameters: { mode: 'partial' }
      }],
      escalationRules: [{
        condition: 'always',
        escalateTo: ['security-team@company.com', 'cto@company.com'],
        delay: 0
      }],
      containmentActions: [{
        id: 'emergency_shutdown',
        name: 'Emergency System Shutdown',
        description: 'Emergency shutdown of affected systems',
        automatic: false,
        action: async () => { return true; }
      }],
      notificationTemplates: [{
        channel: 'slack',
        severity: 'critical',
        template: '🚨🚨 CRITICAL INCIDENT: {{incident_name}}\nIMMEDIATE ACTION REQUIRED\nIncident: {{incident_id}}\nStatus: {{status}}',
        recipients: ['#critical-alerts', '#security-team']
      }]
    });

    console.log(`📋 Loaded ${this.definitions.size} incident definitions`);
  }

  /**
   * Get incident status
   */
  getIncident(incidentId: string): ActiveIncident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all active incidents
   */
  getActiveIncidents(): ActiveIncident[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status !== 'closed');
  }

  /**
   * Update incident status
   */
  updateIncidentStatus(incidentId: string, status: ActiveIncident['status'], resolution?: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.status = status;
    incident.updatedAt = new Date();
    
    if (resolution) {
      incident.resolution = resolution;
    }

    this.addToTimeline(incidentId, `Status changed to: ${status}`, false);
  }

  /**
   * Generate incident report
   */
  generateIncidentReport(incidentId: string): string {
    const incident = this.incidents.get(incidentId);
    if (!incident) return 'Incident not found';

    const definition = this.definitions.get(incident.definitionId);
    const lines: string[] = [];

    lines.push('Incident Response Report');
    lines.push('='.repeat(40));
    lines.push('');
    lines.push(`Incident ID: ${incident.id}`);
    lines.push(`Type: ${definition?.name || 'Unknown'}`);
    lines.push(`Severity: ${incident.severity.toUpperCase()}`);
    lines.push(`Status: ${incident.status}`);
    lines.push(`Created: ${incident.createdAt.toISOString()}`);
    lines.push(`Updated: ${incident.updatedAt.toISOString()}`);
    lines.push('');

    lines.push('Timeline:');
    incident.timeline.forEach(entry => {
      const automated = entry.automated ? '[AUTO]' : '[MANUAL]';
      lines.push(`  ${entry.timestamp.toISOString()} ${automated} ${entry.details}`);
    });
    lines.push('');

    lines.push('Response Actions:');
    incident.responseActions.forEach(action => {
      lines.push(`  ${action.actionId}: ${action.status}`);
      if (action.error) {
        lines.push(`    Error: ${action.error}`);
      }
    });

    if (incident.resolution) {
      lines.push('');
      lines.push(`Resolution: ${incident.resolution}`);
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const incidentResponseEngine = new IncidentResponseEngine();

// Helper functions
export const IncidentResponseHelpers = {
  /**
   * Start incident response monitoring
   */
  startMonitoring: (): void => {
    incidentResponseEngine.start();
  },

  /**
   * Stop incident response monitoring
   */
  stopMonitoring: (): void => {
    incidentResponseEngine.stop();
  },

  /**
   * Report a security incident
   */
  reportIncident: async (
    definitionId: string,
    events: SecurityEvent[],
    metadata?: Record<string, any>
  ): Promise<string> => {
    return await incidentResponseEngine.registerIncident(definitionId, events, metadata);
  },

  /**
   * Get incident status
   */
  getIncidentStatus: (incidentId: string): ActiveIncident | undefined => {
    return incidentResponseEngine.getIncident(incidentId);
  },

  /**
   * Update incident
   */
  updateIncident: (incidentId: string, status: ActiveIncident['status'], resolution?: string): void => {
    incidentResponseEngine.updateIncidentStatus(incidentId, status, resolution);
  },

  /**
   * Get active incidents
   */
  getActiveIncidents: (): ActiveIncident[] => {
    return incidentResponseEngine.getActiveIncidents();
  }
};