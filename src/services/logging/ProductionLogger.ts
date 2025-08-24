/**
 * ProductionLogger - Comprehensive Structured Logging System
 * 
 * Provides structured logging with context, audit trails, and production-ready
 * log aggregation for debugging and monitoring production issues.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    cpu?: number;
  };
  audit?: {
    action: string;
    resource: string;
    before?: any;
    after?: any;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  sensitiveFields: string[];
  environment: 'development' | 'production' | 'test';
}

export interface LogStats {
  totalEntries: number;
  entriesByLevel: Record<LogLevel, number>;
  errorRate: number;
  recentErrors: LogEntry[];
  performanceMetrics: {
    averageLogTime: number;
    slowestOperations: Array<{ context: string; duration: number }>;
  };
}

class ProductionLogger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private logQueue: LogEntry[] = [];
  private sessionId: string;
  private logLevelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };
  private flushInterval?: NodeJS.Timeout;
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxStorageEntries: 10000,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'apiKey'],
      environment: process.env.NODE_ENV as any || 'development',
      ...config
    };

    this.sessionId = this.generateId();
    this.startRemoteFlush();
  }

  /**
   * Generate unique identifier for log entries
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logLevelPriority[level] >= this.logLevelPriority[this.config.level];
  }

  /**
   * Sanitize sensitive data from metadata
   */
  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    
    const sanitizeValue = (obj: any, key: string): void => {
      if (typeof obj === 'object' && obj !== null) {
        if (this.config.sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '[REDACTED]';
        } else if (Array.isArray(obj[key])) {
          obj[key].forEach((item: any, index: number) => {
            if (typeof item === 'object') {
              Object.keys(item).forEach(subKey => sanitizeValue(item, subKey));
            }
          });
        } else if (typeof obj[key] === 'object') {
          Object.keys(obj[key]).forEach(subKey => sanitizeValue(obj[key], subKey));
        }
      }
    };

    Object.keys(sanitized).forEach(key => sanitizeValue(sanitized, key));
    return sanitized;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context: string,
    options: {
      userId?: string;
      requestId?: string;
      metadata?: Record<string, any>;
      error?: Error;
      performance?: { duration?: number; memory?: number; cpu?: number };
      audit?: { action: string; resource: string; before?: any; after?: any };
    } = {}
  ): void {
    if (!this.shouldLog(level)) return;

    const startTime = performance.now();
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      message,
      context,
      userId: options.userId,
      sessionId: this.sessionId,
      requestId: options.requestId,
      metadata: options.metadata ? this.sanitizeMetadata(options.metadata) : undefined,
      error: options.error ? {
        name: options.error.name,
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as any).code
      } : undefined,
      performance: options.performance,
      audit: options.audit
    };

    // Store locally if enabled
    if (this.config.enableStorage) {
      this.entries.push(entry);
      
      // Maintain storage limits
      if (this.entries.length > this.config.maxStorageEntries) {
        this.entries = this.entries.slice(-this.config.maxStorageEntries);
      }
    }

    // Console output if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Queue for remote logging
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logQueue.push(entry);
    }

    // Track performance metrics
    const logTime = performance.now() - startTime;
    const contextMetrics = this.performanceMetrics.get(context) || [];
    contextMetrics.push(logTime);
    this.performanceMetrics.set(context, contextMetrics.slice(-100)); // Keep last 100
  }

  /**
   * Output formatted log to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const context = entry.context.padEnd(20);
    
    let output = `[${timestamp}] ${level} ${context} ${entry.message}`;
    
    if (entry.userId) output += ` | User: ${entry.userId}`;
    if (entry.requestId) output += ` | Req: ${entry.requestId.slice(-8)}`;
    
    const logMethod = this.getConsoleMethod(entry.level);
    
    if (entry.metadata || entry.error || entry.performance || entry.audit) {
      logMethod(output);
      
      if (entry.metadata) console.log('  Metadata:', entry.metadata);
      if (entry.error) console.log('  Error:', entry.error);
      if (entry.performance) console.log('  Performance:', entry.performance);
      if (entry.audit) console.log('  Audit:', entry.audit);
    } else {
      logMethod(output);
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug': return console.debug;
      case 'info': return console.info;
      case 'warn': return console.warn;
      case 'error':
      case 'fatal': return console.error;
      default: return console.log;
    }
  }

  /**
   * Start remote log flushing
   */
  private startRemoteFlush(): void {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    this.flushInterval = setInterval(() => {
      this.flushRemoteLogs();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Flush logs to remote endpoint
   */
  private async flushRemoteLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    try {
      const logsToFlush = [...this.logQueue];
      this.logQueue = [];

      const response = await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environment: this.config.environment,
          logs: logsToFlush
        })
      });

      if (!response.ok) {
        // Re-queue logs on failure
        this.logQueue.unshift(...logsToFlush);
        throw new Error(`Remote logging failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to flush remote logs:', error);
      
      // Prevent queue from growing too large
      if (this.logQueue.length > 1000) {
        this.logQueue = this.logQueue.slice(-500);
      }
    }
  }

  /**
   * Public logging methods
   */
  debug(message: string, context: string = 'App', options: Parameters<typeof this.log>[3] = {}): void {
    this.log('debug', message, context, options);
  }

  info(message: string, context: string = 'App', options: Parameters<typeof this.log>[3] = {}): void {
    this.log('info', message, context, options);
  }

  warn(message: string, context: string = 'App', options: Parameters<typeof this.log>[3] = {}): void {
    this.log('warn', message, context, options);
  }

  error(message: string, context: string = 'App', options: Parameters<typeof this.log>[3] = {}): void {
    this.log('error', message, context, options);
  }

  fatal(message: string, context: string = 'App', options: Parameters<typeof this.log>[3] = {}): void {
    this.log('fatal', message, context, options);
  }

  /**
   * Specialized logging methods
   */
  logError(error: Error, context: string = 'Error', metadata?: Record<string, any>): void {
    this.error(error.message, context, { error, metadata });
  }

  logPerformance(
    operation: string, 
    duration: number, 
    context: string = 'Performance',
    metadata?: Record<string, any>
  ): void {
    this.info(`Operation ${operation} completed`, context, {
      performance: { duration },
      metadata
    });
  }

  logAudit(
    action: string,
    resource: string,
    userId: string,
    context: string = 'Audit',
    options: { before?: any; after?: any; metadata?: Record<string, any> } = {}
  ): void {
    this.info(`Audit: ${action} on ${resource}`, context, {
      userId,
      audit: {
        action,
        resource,
        before: options.before,
        after: options.after
      },
      metadata: options.metadata
    });
  }

  logUserAction(
    action: string,
    userId: string,
    context: string = 'UserAction',
    metadata?: Record<string, any>
  ): void {
    this.info(`User action: ${action}`, context, { userId, metadata });
  }

  logApiCall(
    method: string,
    endpoint: string,
    status: number,
    duration: number,
    context: string = 'API',
    options: {
      userId?: string;
      requestId?: string;
      requestSize?: number;
      responseSize?: number;
      error?: Error;
    } = {}
  ): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    const message = `${method} ${endpoint} - ${status}`;
    
    this.log(level, message, context, {
      userId: options.userId,
      requestId: options.requestId,
      performance: { duration },
      metadata: {
        method,
        endpoint,
        status,
        requestSize: options.requestSize,
        responseSize: options.responseSize
      },
      error: options.error
    });
  }

  /**
   * Query and analytics methods
   */
  getStats(): LogStats {
    const entriesByLevel: Record<LogLevel, number> = {
      debug: 0, info: 0, warn: 0, error: 0, fatal: 0
    };

    let totalErrors = 0;
    const recentErrors: LogEntry[] = [];

    this.entries.forEach(entry => {
      entriesByLevel[entry.level]++;
      
      if (entry.level === 'error' || entry.level === 'fatal') {
        totalErrors++;
        if (recentErrors.length < 10) {
          recentErrors.push(entry);
        }
      }
    });

    // Calculate performance metrics
    let totalLogTime = 0;
    let logCount = 0;
    const slowestOperations: Array<{ context: string; duration: number }> = [];

    this.performanceMetrics.forEach((times, context) => {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      totalLogTime += avgTime * times.length;
      logCount += times.length;
      
      const maxTime = Math.max(...times);
      if (maxTime > 1) { // Log operations slower than 1ms
        slowestOperations.push({ context, duration: maxTime });
      }
    });

    return {
      totalEntries: this.entries.length,
      entriesByLevel,
      errorRate: this.entries.length > 0 ? totalErrors / this.entries.length : 0,
      recentErrors: recentErrors.reverse(), // Most recent first
      performanceMetrics: {
        averageLogTime: logCount > 0 ? totalLogTime / logCount : 0,
        slowestOperations: slowestOperations.sort((a, b) => b.duration - a.duration).slice(0, 5)
      }
    };
  }

  searchLogs(query: {
    level?: LogLevel;
    context?: string;
    userId?: string;
    startTime?: number;
    endTime?: number;
    message?: string;
    hasError?: boolean;
  }, limit: number = 100): LogEntry[] {
    return this.entries
      .filter(entry => {
        if (query.level && entry.level !== query.level) return false;
        if (query.context && !entry.context.toLowerCase().includes(query.context.toLowerCase())) return false;
        if (query.userId && entry.userId !== query.userId) return false;
        if (query.startTime && entry.timestamp < query.startTime) return false;
        if (query.endTime && entry.timestamp > query.endTime) return false;
        if (query.message && !entry.message.toLowerCase().includes(query.message.toLowerCase())) return false;
        if (query.hasError !== undefined && !!entry.error !== query.hasError) return false;
        
        return true;
      })
      .slice(-limit)
      .reverse(); // Most recent first
  }

  getRecentLogs(limit: number = 50): LogEntry[] {
    return this.entries.slice(-limit).reverse();
  }

  getErrorLogs(limit: number = 20): LogEntry[] {
    return this.entries
      .filter(entry => entry.level === 'error' || entry.level === 'fatal')
      .slice(-limit)
      .reverse();
  }

  getAuditTrail(userId?: string, limit: number = 50): LogEntry[] {
    return this.entries
      .filter(entry => {
        if (!entry.audit) return false;
        if (userId && entry.userId !== userId) return false;
        return true;
      })
      .slice(-limit)
      .reverse();
  }

  /**
   * Utility methods
   */
  measure<T>(
    operation: string,
    fn: () => T,
    context: string = 'Performance',
    metadata?: Record<string, any>
  ): T {
    const start = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    try {
      const result = fn();
      const duration = performance.now() - start;
      const memoryUsed = ((performance as any).memory?.usedJSHeapSize || 0) - startMemory;
      
      this.logPerformance(operation, duration, context, {
        ...metadata,
        memoryUsed: memoryUsed > 0 ? memoryUsed : undefined
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logError(error as Error, context, {
        operation,
        duration,
        ...metadata
      });
      throw error;
    }
  }

  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context: string = 'Performance',
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      const memoryUsed = ((performance as any).memory?.usedJSHeapSize || 0) - startMemory;
      
      this.logPerformance(operation, duration, context, {
        ...metadata,
        memoryUsed: memoryUsed > 0 ? memoryUsed : undefined
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logError(error as Error, context, {
        operation,
        duration,
        ...metadata
      });
      throw error;
    }
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart remote flushing if endpoint changed
    if (newConfig.remoteEndpoint || newConfig.enableRemote !== undefined) {
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      this.startRemoteFlush();
    }
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'context', 'message', 'userId', 'error'];
      const rows = this.entries.map(entry => [
        new Date(entry.timestamp).toISOString(),
        entry.level,
        entry.context,
        `"${entry.message.replace(/"/g, '""')}"`,
        entry.userId || '',
        entry.error?.message || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.entries, null, 2);
  }

  clear(): void {
    this.entries = [];
    this.logQueue = [];
    this.performanceMetrics.clear();
    this.info('Log history cleared', 'Logger');
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushRemoteLogs(); // Final flush
    this.clear();
  }
}

// Create singleton instance
const logger = new ProductionLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT
});

export { ProductionLogger, logger };
export default logger;