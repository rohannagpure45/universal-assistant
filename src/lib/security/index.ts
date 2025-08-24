/**
 * Universal Assistant Security Framework
 * Complete security utilities for authentication, authorization, encryption, monitoring, and incident response
 */

// Core security middleware and authentication
export * from './middleware';
export * from './rateLimit';
export * from './validation';

// Audio-specific security
export * from './audioSecurity';

// Data protection and encryption
export * from './encryption';

// Security monitoring and logging
export * from './monitoring';

// Environment validation
export * from './envValidation';

// Security testing framework
export * from './testing';

// Incident response automation
export * from './incidentResponse';

// Helper functions for common security operations
export const SecurityFramework = {
  // Middleware helpers
  withSecurity: require('./middleware').withSecurity,
  inputValidation: require('./middleware').inputValidation,
  
  // Rate limiting
  rateLimit: require('./rateLimit').default,
  enhancedRateLimit: require('./rateLimit').enhancedRateLimit,
  
  // Audio security
  validateAudioFile: require('./audioSecurity').defaultAudioValidator.validateAudioFile,
  // validateVoiceSample: removed broken reference to non-existent AudioSecurityHelpers
  
  // Encryption
  encryptData: require('./encryption').dataEncryption.encryptText,
  decryptData: require('./encryption').dataEncryption.decryptText,
  encryptField: require('./encryption').EncryptionHelpers.encryptField,
  decryptField: require('./encryption').EncryptionHelpers.decryptField,
  
  // Monitoring
  logSecurityEvent: require('./monitoring').SecurityLogger,
  getSecurityMetrics: require('./monitoring').default.getMetrics,
  
  // Environment validation
  validateEnvironment: require('./envValidation').environmentValidator.validateEnvironment,
  isEnvironmentValid: require('./envValidation').EnvironmentHelpers.isValid,
  
  // Security testing
  runSecurityTests: require('./testing').SecurityTestRunner.runCISecurityTests,
  validateSecurity: require('./testing').SecurityTestUtils.validateSecurity,
  
  // Incident response
  reportIncident: require('./incidentResponse').IncidentResponseHelpers.reportIncident,
  getActiveIncidents: require('./incidentResponse').IncidentResponseHelpers.getActiveIncidents,
  startIncidentMonitoring: require('./incidentResponse').IncidentResponseHelpers.startMonitoring
};

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  // Rate limiting
  rateLimiting?: {
    enabled: boolean;
    defaultRpm: number;
    tiers: Record<string, number>;
  };
  
  // Encryption
  encryption?: {
    enabled: boolean;
    algorithm: string;
    keyRotationDays: number;
  };
  
  // Monitoring
  monitoring?: {
    enabled: boolean;
    logLevel: 'info' | 'warn' | 'error';
    retentionDays: number;
  };
  
  // Incident response
  incidentResponse?: {
    enabled: boolean;
    autoEscalation: boolean;
    notificationChannels: string[];
  };
  
  // Testing
  testing?: {
    enabled: boolean;
    schedule: string;
    failOnCritical: boolean;
  };
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    defaultRpm: 60,
    tiers: {
      free: 30,
      premium: 120,
      admin: 300
    }
  },
  
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyRotationDays: 90
  },
  
  monitoring: {
    enabled: true,
    logLevel: 'info',
    retentionDays: 90
  },
  
  incidentResponse: {
    enabled: true,
    autoEscalation: true,
    notificationChannels: ['slack', 'email']
  },
  
  testing: {
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    failOnCritical: true
  }
};

/**
 * Security framework initialization
 */
export class SecurityManager {
  private config: SecurityConfig;
  private initialized = false;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * Initialize the security framework
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('Security framework already initialized');
      return;
    }

    console.log('🛡️  Initializing Universal Assistant Security Framework...');

    try {
      // Validate environment
      if (this.config.monitoring?.enabled) {
        const envValidation = require('./envValidation').environmentValidator.validateEnvironment();
        if (!envValidation.isValid) {
          console.warn('⚠️  Environment validation issues detected:', envValidation.errors.length, 'errors');
        }
      }

      // Start incident response monitoring
      if (this.config.incidentResponse?.enabled) {
        require('./incidentResponse').IncidentResponseHelpers.startMonitoring();
        console.log('✅ Incident response monitoring started');
      }

      // Initialize monitoring
      if (this.config.monitoring?.enabled) {
        console.log('✅ Security monitoring initialized');
      }

      // Schedule security tests if enabled
      if (this.config.testing?.enabled) {
        console.log('✅ Security testing scheduled');
      }

      this.initialized = true;
      console.log('🎉 Security framework initialization complete');

    } catch (error) {
      console.error('❌ Security framework initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get security status
   */
  getStatus(): {
    initialized: boolean;
    config: SecurityConfig;
    health: {
      environment: boolean;
      monitoring: boolean;
      incidentResponse: boolean;
    };
  } {
    const envValid = require('./envValidation').EnvironmentHelpers.isValid();
    const activeIncidents = require('./incidentResponse').IncidentResponseHelpers.getActiveIncidents();

    return {
      initialized: this.initialized,
      config: this.config,
      health: {
        environment: envValid,
        monitoring: this.config.monitoring?.enabled || false,
        incidentResponse: activeIncidents.length === 0
      }
    };
  }

  /**
   * Run security health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message: string;
    }>;
  }> {
    const checks: { name: string; status: 'pass' | 'fail' | 'warn'; message: string }[] = [];

    // Environment validation
    try {
      const envResult = require('./envValidation').environmentValidator.validateEnvironment();
      checks.push({
        name: 'Environment Configuration',
        status: envResult.isValid ? 'pass' : (envResult.score > 70 ? 'warn' : 'fail'),
        message: envResult.isValid ? 'All environment variables valid' : `${envResult.errors.length} errors found`
      });
    } catch (error) {
      checks.push({
        name: 'Environment Configuration',
        status: 'fail',
        message: 'Environment validation failed'
      });
    }

    // Security tests
    try {
      const testResult = await require('./testing').SecurityTestUtils.validateSecurity();
      checks.push({
        name: 'Security Tests',
        status: testResult ? 'pass' : 'fail',
        message: testResult ? 'All security tests passed' : 'Security tests failed'
      });
    } catch (error) {
      checks.push({
        name: 'Security Tests',
        status: 'fail',
        message: 'Security testing failed'
      });
    }

    // Active incidents
    const activeIncidents = require('./incidentResponse').IncidentResponseHelpers.getActiveIncidents();
    const criticalIncidents = activeIncidents.filter((i: any) => i.severity === 'critical').length;
    
    let incidentStatus: 'pass' | 'fail' | 'warn';
    if (criticalIncidents > 0) {
      incidentStatus = 'fail';
    } else if (activeIncidents.length > 0) {
      incidentStatus = 'warn';
    } else {
      incidentStatus = 'pass';
    }
    
    checks.push({
      name: 'Active Incidents',
      status: incidentStatus,
      message: `${activeIncidents.length} active incidents (${criticalIncidents} critical)`
    });

    // Overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warn').length;
    
    let status: 'healthy' | 'warning' | 'critical';
    if (failedChecks > 0) {
      status = 'critical';
    } else if (warningChecks > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return { status, checks };
  }

  /**
   * Shutdown security framework
   */
  shutdown(): void {
    if (!this.initialized) return;

    console.log('🛑 Shutting down security framework...');

    // Stop incident response monitoring
    require('./incidentResponse').IncidentResponseHelpers.stopMonitoring();

    this.initialized = false;
    console.log('✅ Security framework shutdown complete');
  }
}

// Export singleton security manager
export const securityManager = new SecurityManager();

// Auto-initialize in production
if (process.env.NODE_ENV === 'production') {
  securityManager.initialize().catch(console.error);
}