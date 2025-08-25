/**
 * ErrorTracker - Production Error Tracking and Recovery System
 * 
 * Provides comprehensive error tracking, automatic reporting, and graceful
 * recovery mechanisms for production environments.
 */

import logger from '../logging/ProductionLogger';
import { nanoid } from 'nanoid';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'authentication' | 'network' | 'database' | 'audio' | 'ui' | 'system' | 'unknown';

export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: string;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  url?: string;
  metadata?: Record<string, any>;
  recovered: boolean;
  recoveryStrategy?: string;
  occurrenceCount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorRate: number;
  recoveryRate: number;
  frequentErrors: Array<{ message: string; count: number; category: ErrorCategory }>;
  recentErrors: ErrorReport[];
  systemHealth: number; // 0-100 score
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  category: ErrorCategory;
  condition: (error: Error, context: string) => boolean;
  execute: (error: Error, context: string, metadata?: any) => Promise<boolean>;
  fallback?: (error: Error, context: string, metadata?: any) => Promise<boolean>;
  maxRetries: number;
  retryDelay: number;
  description: string;
}

class ErrorTracker {
  private errors: Map<string, ErrorReport> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private sessionId: string;
  private alertThresholds = {
    errorRate: 0.05, // 5% error rate triggers alert
    criticalErrors: 3, // 3 critical errors in 5 minutes
    timeWindow: 5 * 60 * 1000 // 5 minutes
  };

  constructor() {
    this.sessionId = nanoid();
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandlers();
  }

  /**
   * Initialize recovery strategies for different error types
   */
  private initializeRecoveryStrategies(): void {
    const strategies: RecoveryStrategy[] = [
      {
        id: 'network-retry',
        name: 'Network Request Retry',
        category: 'network',
        condition: (error) => error.message.includes('fetch') || error.message.includes('network'),
        execute: async (error, context, metadata) => {
          const { url, options, attempt = 1 } = metadata || {};
          
          if (attempt > 3) return false;
          
          try {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            const response = await fetch(url, options);
            
            if (response.ok) {
              logger.info(`Network retry successful on attempt ${attempt}`, 'ErrorRecovery', {
                metadata: { attempt, originalError: error.message, url }
              });
              return true;
            }
            
            return false;
          } catch (retryError) {
            logger.warn(`Network retry failed on attempt ${attempt}`, 'ErrorRecovery', {
              error: retryError instanceof Error ? retryError : undefined,
              metadata: { attempt, url }
            });
            return false;
          }
        },
        maxRetries: 3,
        retryDelay: 1000,
        description: 'Retries failed network requests with exponential backoff'
      },
      {
        id: 'auth-refresh',
        name: 'Authentication Token Refresh',
        category: 'authentication',
        condition: (error) => error.message.includes('401') || error.message.includes('Unauthorized'),
        execute: async (error, context) => {
          try {
            // Authentication recovery not implemented yet
            // TODO: Implement proper authentication refresh when AuthService supports it
            logger.warn('Authentication refresh not available', 'ErrorRecovery', {
              metadata: { context, originalError: error.message }
            });
            return false;
          } catch (refreshError) {
            logger.error('Authentication refresh failed', 'ErrorRecovery', {
              error: refreshError instanceof Error ? refreshError : undefined,
              metadata: { context }
            });
            return false;
          }
        },
        fallback: async () => {
          // Redirect to login as fallback
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return true;
        },
        maxRetries: 1,
        retryDelay: 500,
        description: 'Refreshes expired authentication tokens'
      },
      {
        id: 'database-reconnect',
        name: 'Database Reconnection',
        category: 'database',
        condition: (error) => error.message.includes('database') || error.message.includes('firestore'),
        execute: async (error, context) => {
          try {
            // Database reconnection not implemented yet
            // TODO: Implement proper database reconnection when DatabaseService supports it
            logger.warn('Database reconnection not available', 'ErrorRecovery', {
              metadata: { context, originalError: error.message }
            });
            return false;
          } catch (reconnectError) {
            logger.error('Database reconnection failed', 'ErrorRecovery', {
              error: reconnectError instanceof Error ? reconnectError : undefined,
              metadata: { context }
            });
            return false;
          }
        },
        maxRetries: 2,
        retryDelay: 2000,
        description: 'Reconnects to database on connection failures'
      },
      {
        id: 'audio-restart',
        name: 'Audio System Restart',
        category: 'audio',
        condition: (error) => error.message.includes('audio') || error.message.includes('microphone'),
        execute: async (error, context, metadata) => {
          try {
            // Restart audio processing
            const audioModule = await import('../universal-assistant/AudioManager');
            if (audioModule.audioManager) {
              await audioModule.audioManager.stopRecording();
              await new Promise(resolve => setTimeout(resolve, 1000));
              await audioModule.audioManager.startRecording();
              
              logger.info('Audio system restart successful', context, {
                metadata: { originalError: error.message }
              });
              return true;
            }
            
            return false;
          } catch (restartError) {
            logger.error('Audio system restart failed', 'ErrorRecovery', {
              error: restartError instanceof Error ? {
                name: restartError.name,
                message: restartError.message,
                stack: restartError.stack
              } : { name: 'UnknownError', message: String(restartError) },
              metadata: { context }
            });
            return false;
          }
        },
        maxRetries: 2,
        retryDelay: 1500,
        description: 'Restarts audio recording system on failures'
      },
      {
        id: 'ui-refresh',
        name: 'UI Component Refresh',
        category: 'ui',
        condition: (error) => error.message.includes('render'),
        // Note: context parameter not available in condition function
        execute: async (error, context) => {
          try {
            // Trigger component re-render by clearing state
            if (typeof window !== 'undefined' && (window as any).location) {
              logger.info('Triggering UI refresh', 'ErrorRecovery', {
                metadata: { context, originalError: error.message }
              });
              
              // Dispatch a custom event that components can listen to for refresh
              window.dispatchEvent(new CustomEvent('error-recovery-refresh', {
                detail: { context, error: error.message }
              }));
              
              return true;
            }
            
            return false;
          } catch (refreshError) {
            logger.error('UI refresh failed', 'ErrorRecovery', {
              error: refreshError instanceof Error ? {
                name: refreshError.name,
                message: refreshError.message,
                stack: refreshError.stack
              } : { name: 'UnknownError', message: String(refreshError) },
              metadata: { context }
            });
            return false;
          }
        },
        maxRetries: 1,
        retryDelay: 100,
        description: 'Refreshes UI components that encounter render errors'
      }
    ];

    strategies.forEach(strategy => {
      this.recoveryStrategies.set(strategy.id, strategy);
    });
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.trackError(event.error || new Error(event.message), 'Global', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        this.trackError(error, 'Promise', {
          promise: event.promise
        });
      });
    }

    // Handle Node.js process errors (for server-side)
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.trackError(error, 'Process', { fatal: true });
        // Don't exit the process in production, but log it as critical
      });

      process.on('unhandledRejection', (reason, promise) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.trackError(error, 'Promise', { promise });
      });
    }
  }

  /**
   * Track an error with automatic categorization and recovery attempts
   */
  async trackError(
    error: Error,
    context: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const errorId = this.generateErrorId(error);
    const timestamp = Date.now();
    
    // Get existing error or create new one
    let errorReport = this.errors.get(errorId);
    const isNewError = !errorReport;
    
    if (isNewError) {
      errorReport = {
        id: errorId,
        timestamp,
        message: error.message,
        stack: error.stack,
        category: this.categorizeError(error, context),
        severity: this.assessSeverity(error, context),
        context,
        userId: metadata?.userId,
        sessionId: this.sessionId,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        metadata,
        recovered: false,
        occurrenceCount: 1,
        firstSeen: timestamp,
        lastSeen: timestamp
      };
    } else {
      // Update existing error - add explicit null check for TypeScript
      if (errorReport) {
        errorReport.occurrenceCount++;
        errorReport.lastSeen = timestamp;
        errorReport.metadata = { ...errorReport.metadata, ...metadata };
      } else {
        // This should never happen, but satisfy TypeScript
        throw new Error(`Unexpected null errorReport for ${errorId}`);
      }
    }
    
    // TypeScript now knows errorReport is defined
    const finalErrorReport = errorReport;

    this.errors.set(errorId, finalErrorReport);
    
    // Update error counts for rate calculation
    const errorKey = `${finalErrorReport.category}-${Date.now()}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    // Log the error
    logger.error(error.message, context, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      metadata: {
        ...metadata,
        category: finalErrorReport.category,
        severity: finalErrorReport.severity,
        occurrenceCount: finalErrorReport.occurrenceCount
      }
    });

    // Attempt recovery for new errors
    if (isNewError || finalErrorReport.occurrenceCount <= 3) {
      const recovered = await this.attemptRecovery(error, context, metadata);
      finalErrorReport.recovered = recovered;
      
      if (recovered) {
        logger.info(`Error recovery successful for ${errorId}`, 'ErrorRecovery', {
          metadata: {
            context,
            strategy: finalErrorReport.recoveryStrategy
          }
        });
      }
    }

    // Check for alert conditions
    this.checkAlertConditions(finalErrorReport);

    return errorId;
  }

  /**
   * Generate consistent error ID for grouping similar errors
   */
  private generateErrorId(error: Error): string {
    const message = error.message.replace(/\d+/g, 'N'); // Replace numbers with 'N'
    const stackFirstLine = error.stack?.split('\n')[1]?.replace(/:\d+:\d+/g, '') || '';
    return nanoid(8) + '-' + Buffer.from(message + stackFirstLine).toString('base64').slice(0, 8);
  }

  /**
   * Categorize error based on error message and context
   */
  private categorizeError(error: Error, context: string): ErrorCategory {
    const message = error.message.toLowerCase();
    const contextLower = context.toLowerCase();

    if (message.includes('auth') || message.includes('login') || message.includes('401')) {
      return 'authentication';
    }
    
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('database') || message.includes('firestore') || contextLower.includes('db')) {
      return 'database';
    }
    
    if (message.includes('audio') || message.includes('microphone') || contextLower.includes('audio')) {
      return 'audio';
    }
    
    if (message.includes('render') || contextLower.includes('component') || contextLower.includes('ui')) {
      return 'ui';
    }
    
    if (contextLower.includes('system') || contextLower.includes('process')) {
      return 'system';
    }

    return 'unknown';
  }

  /**
   * Assess error severity based on error type and context
   */
  private assessSeverity(error: Error, context: string): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    // Critical errors
    if (message.includes('fatal') || message.includes('crash') || context.includes('Process')) {
      return 'critical';
    }
    
    // High severity
    if (message.includes('auth') || message.includes('database') || message.includes('security')) {
      return 'high';
    }
    
    // Medium severity
    if (message.includes('network') || message.includes('timeout') || message.includes('audio')) {
      return 'medium';
    }
    
    // Default to low
    return 'low';
  }

  /**
   * Attempt to recover from error using appropriate strategy
   */
  private async attemptRecovery(
    error: Error,
    context: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    // Find applicable recovery strategies
    const applicableStrategies = Array.from(this.recoveryStrategies.values())
      .filter(strategy => strategy.condition(error, context));

    if (applicableStrategies.length === 0) {
      return false;
    }

    // Try each strategy
    for (const strategy of applicableStrategies) {
      try {
        logger.info(`Attempting recovery strategy: ${strategy.name}`, 'ErrorRecovery', {
          metadata: { errorMessage: error.message, context, strategy: strategy.id }
        });

        const recovered = await strategy.execute(error, context, metadata);
        
        if (recovered) {
          // Update error report with recovery info
          const errorId = this.generateErrorId(error);
          const errorReport = this.errors.get(errorId);
          if (errorReport) {
            errorReport.recoveryStrategy = strategy.id;
          }
          
          return true;
        }

        // Try fallback if primary strategy failed
        if (strategy.fallback) {
          logger.info(`Attempting fallback for strategy: ${strategy.name}`, 'ErrorRecovery');
          const fallbackRecovered = await strategy.fallback(error, context, metadata);
          
          if (fallbackRecovered) {
            const errorId = this.generateErrorId(error);
            const errorReport = this.errors.get(errorId);
            if (errorReport) {
              errorReport.recoveryStrategy = `${strategy.id}-fallback`;
            }
            return true;
          }
        }
      } catch (recoveryError) {
        logger.error(`Recovery strategy ${strategy.name} failed`, 'ErrorRecovery', {
          error: recoveryError instanceof Error ? {
            name: recoveryError.name,
            message: recoveryError.message,
            stack: recoveryError.stack
          } : { name: 'UnknownError', message: String(recoveryError) },
          metadata: { originalError: error.message }
        });
      }
    }

    return false;
  }

  /**
   * Check if error conditions warrant alerts
   */
  private checkAlertConditions(errorReport: ErrorReport): void {
    // Check error rate
    const recentErrors = this.getErrorsInTimeWindow(this.alertThresholds.timeWindow);
    const errorRate = recentErrors.length / Math.max(1, this.getTotalOperationsInTimeWindow());
    
    if (errorRate > this.alertThresholds.errorRate) {
      this.sendAlert('High Error Rate', {
        errorRate: (errorRate * 100).toFixed(2) + '%',
        recentErrorCount: recentErrors.length,
        timeWindow: this.alertThresholds.timeWindow / 1000 / 60 + ' minutes'
      });
    }

    // Check critical error threshold
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical');
    if (criticalErrors.length >= this.alertThresholds.criticalErrors) {
      this.sendAlert('Critical Error Threshold Exceeded', {
        criticalErrorCount: criticalErrors.length,
        threshold: this.alertThresholds.criticalErrors,
        errors: criticalErrors.map(e => ({ message: e.message, context: e.context }))
      });
    }

    // Check for repeated errors
    if (errorReport.occurrenceCount >= 5 && !errorReport.recovered) {
      this.sendAlert('Repeated Unrecovered Error', {
        errorId: errorReport.id,
        message: errorReport.message,
        occurrenceCount: errorReport.occurrenceCount,
        context: errorReport.context
      });
    }
  }

  /**
   * Send alert to monitoring system
   */
  private sendAlert(type: string, data: any): void {
    logger.fatal(`ALERT: ${type}`, 'ErrorTracker', {
      metadata: { alertType: type, alertData: data }
    });

    // Here you would integrate with external alerting systems
    // like PagerDuty, Slack, email, etc.
    if (process.env.NEXT_PUBLIC_ALERT_WEBHOOK) {
      fetch(process.env.NEXT_PUBLIC_ALERT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data,
          timestamp: Date.now(),
          environment: process.env.NODE_ENV
        })
      }).catch(error => {
        console.error('Failed to send alert:', error);
      });
    }
  }

  /**
   * Get errors within a specific time window
   */
  private getErrorsInTimeWindow(windowMs: number): ErrorReport[] {
    const cutoff = Date.now() - windowMs;
    return Array.from(this.errors.values()).filter(error => error.lastSeen >= cutoff);
  }

  /**
   * Estimate total operations in time window (simplified)
   */
  private getTotalOperationsInTimeWindow(): number {
    // This is a simplified estimation - in a real implementation,
    // you'd track actual operation counts
    return Math.max(100, Array.from(this.errors.values()).length * 10);
  }

  /**
   * Get comprehensive error statistics
   */
  getStats(): ErrorStats {
    const allErrors = Array.from(this.errors.values());
    const recentErrors = this.getErrorsInTimeWindow(this.alertThresholds.timeWindow);
    
    const errorsByCategory: Record<ErrorCategory, number> = {
      authentication: 0, network: 0, database: 0, audio: 0, ui: 0, system: 0, unknown: 0
    };
    
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };

    let recoveredCount = 0;
    const messageCounts: Map<string, { count: number; category: ErrorCategory }> = new Map();

    allErrors.forEach(error => {
      errorsByCategory[error.category]++;
      errorsBySeverity[error.severity]++;
      
      if (error.recovered) recoveredCount++;
      
      const existing = messageCounts.get(error.message);
      if (existing) {
        existing.count += error.occurrenceCount;
      } else {
        messageCounts.set(error.message, { 
          count: error.occurrenceCount, 
          category: error.category 
        });
      }
    });

    const frequentErrors = Array.from(messageCounts.entries())
      .map(([message, data]) => ({ message, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalOperations = this.getTotalOperationsInTimeWindow();
    const errorRate = totalOperations > 0 ? recentErrors.length / totalOperations : 0;
    const recoveryRate = allErrors.length > 0 ? recoveredCount / allErrors.length : 1;
    
    // Calculate system health score (0-100)
    const healthFactors = {
      errorRate: Math.max(0, 100 - (errorRate * 2000)), // Low error rate = good health
      recoveryRate: recoveryRate * 100, // High recovery rate = good health
      criticalErrors: Math.max(0, 100 - (errorsBySeverity.critical * 20)), // Few critical errors = good health
      recentErrorTrend: Math.max(0, 100 - (recentErrors.length * 2)) // Few recent errors = good health
    };
    
    const systemHealth = Object.values(healthFactors).reduce((sum, score) => sum + score, 0) / 4;

    return {
      totalErrors: allErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorRate,
      recoveryRate,
      frequentErrors,
      recentErrors: recentErrors.slice(0, 20), // Last 20 errors
      systemHealth: Math.round(systemHealth)
    };
  }

  /**
   * Get specific error by ID
   */
  getError(errorId: string): ErrorReport | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Search errors by criteria
   */
  searchErrors(criteria: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: string;
    message?: string;
    userId?: string;
    recovered?: boolean;
    startTime?: number;
    endTime?: number;
  }): ErrorReport[] {
    return Array.from(this.errors.values()).filter(error => {
      if (criteria.category && error.category !== criteria.category) return false;
      if (criteria.severity && error.severity !== criteria.severity) return false;
      if (criteria.context && !error.context.toLowerCase().includes(criteria.context.toLowerCase())) return false;
      if (criteria.message && !error.message.toLowerCase().includes(criteria.message.toLowerCase())) return false;
      if (criteria.userId && error.userId !== criteria.userId) return false;
      if (criteria.recovered !== undefined && error.recovered !== criteria.recovered) return false;
      if (criteria.startTime && error.firstSeen < criteria.startTime) return false;
      if (criteria.endTime && error.lastSeen > criteria.endTime) return false;
      
      return true;
    }).sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Clear old errors to prevent memory bloat
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [id, error] of this.errors.entries()) {
      if (error.lastSeen < cutoff) {
        this.errors.delete(id);
      }
    }

    // Clean up error counts
    for (const [key, _] of this.errorCounts.entries()) {
      const timestamp = parseInt(key.split('-').pop() || '0');
      if (timestamp < cutoff) {
        this.errorCounts.delete(key);
      }
    }

    logger.info(`Error cleanup completed, removed errors older than ${maxAge / 1000 / 60 / 60} hours`, 'ErrorTracker');
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(strategy.id, strategy);
    logger.info(`Added recovery strategy: ${strategy.name}`, 'ErrorTracker');
  }

  /**
   * Remove recovery strategy
   */
  removeRecoveryStrategy(strategyId: string): void {
    if (this.recoveryStrategies.delete(strategyId)) {
      logger.info(`Removed recovery strategy: ${strategyId}`, 'ErrorTracker');
    }
  }

  /**
   * Export error data for analysis
   */
  exportErrors(format: 'json' | 'csv' = 'json'): string {
    const errors = Array.from(this.errors.values());
    
    if (format === 'csv') {
      const headers = ['id', 'timestamp', 'message', 'category', 'severity', 'context', 'recovered', 'occurrenceCount'];
      const rows = errors.map(error => [
        error.id,
        new Date(error.timestamp).toISOString(),
        `"${error.message.replace(/"/g, '""')}"`,
        error.category,
        error.severity,
        error.context,
        error.recovered.toString(),
        error.occurrenceCount.toString()
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(errors, null, 2);
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// Export the class for testing and custom instances
export { ErrorTracker };
export default errorTracker;