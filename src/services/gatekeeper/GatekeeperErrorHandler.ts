/**
 * GatekeeperErrorHandler - Comprehensive error handling and recovery system
 * 
 * Features:
 * - Error categorization and prioritization
 * - Automatic retry mechanisms with exponential backoff
 * - Circuit breaker pattern for failing operations
 * - Error reporting and metrics
 * - Graceful degradation strategies
 * - Recovery procedures
 */

import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface ErrorContext {
  operation: string;
  speakerId?: string;
  messageId?: string;
  timestamp: number;
  metadata: Record<string, any>;
  retryCount: number;
  maxRetries: number;
}

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => Promise<RecoveryResult>;
  priority: number;
}

export interface RecoveryResult {
  success: boolean;
  action: 'retry' | 'fallback' | 'skip' | 'escalate';
  delay?: number;
  fallbackValue?: any;
  message?: string;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySpeaker: Record<string, number>;
  errorsByOperation: Record<string, number>;
  recoveredErrors: number;
  unrecoverableErrors: number;
  circuitBreakerTrips: number;
  averageRecoveryTime: number;
}

export interface GatekeeperErrorHandlerConfig {
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeout: number;
  maxRetryAttempts: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  enableErrorReporting: boolean;
  enableGracefulDegradation: boolean;
  errorReportingThreshold: number;
}

/**
 * GatekeeperErrorHandler manages errors and recovery strategies
 */
export class GatekeeperErrorHandler {
  private config: GatekeeperErrorHandlerConfig;
  private recoveryStrategies: ErrorRecoveryStrategy[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorStats: ErrorStats = {
    totalErrors: 0,
    errorsByType: {},
    errorsBySpeaker: {},
    errorsByOperation: {},
    recoveredErrors: 0,
    unrecoverableErrors: 0,
    circuitBreakerTrips: 0,
    averageRecoveryTime: 0,
  };
  private recoveryTimes: number[] = [];
  private errorReportingCallbacks: ((error: Error, context: ErrorContext, stats: ErrorStats) => void)[] = [];

  constructor(config: Partial<GatekeeperErrorHandlerConfig> = {}) {
    this.config = {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeout: 60000, // 1 minute
      maxRetryAttempts: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      enableErrorReporting: true,
      enableGracefulDegradation: true,
      errorReportingThreshold: 10,
      ...config,
    };

    this.initializeDefaultStrategies();
  }

  /**
   * Handles an error with recovery strategies
   */
  async handleError(error: Error, context: ErrorContext): Promise<RecoveryResult> {
    const startTime = Date.now();
    
    // Update statistics
    this.updateErrorStats(error, context);

    // Check circuit breaker
    if (this.config.enableCircuitBreaker) {
      const breakerKey = this.getCircuitBreakerKey(context);
      if (this.isCircuitOpen(breakerKey)) {
        return {
          success: false,
          action: 'skip',
          message: `Circuit breaker open for ${breakerKey}`,
        };
      }
    }

    // Try recovery strategies
    const strategies = this.getApplicableStrategies(error, context);
    
    for (const strategy of strategies) {
      try {
        const result = await strategy.recover(error, context);
        
        if (result.success) {
          this.recordRecovery(startTime);
          this.recordCircuitBreakerSuccess(context);
          return result;
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      }
    }

    // No recovery possible
    this.recordCircuitBreakerFailure(context);
    this.errorStats.unrecoverableErrors++;
    
    // Report error if threshold exceeded
    if (this.config.enableErrorReporting) {
      await this.reportError(error, context);
    }

    return {
      success: false,
      action: 'escalate',
      message: 'No recovery strategy succeeded',
    };
  }

  /**
   * Executes an operation with error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
      try {
        context.retryCount = attempt;
        
        // Check circuit breaker before execution
        if (this.config.enableCircuitBreaker) {
          const breakerKey = this.getCircuitBreakerKey(context);
          if (this.isCircuitOpen(breakerKey)) {
            throw new Error(`Circuit breaker open for ${breakerKey}`);
          }
        }

        const result = await operation();
        
        // Success - record in circuit breaker
        this.recordCircuitBreakerSuccess(context);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Handle the error
        const recoveryResult = await this.handleError(lastError, {
          ...context,
          retryCount: attempt,
        });

        switch (recoveryResult.action) {
          case 'retry':
            if (attempt < context.maxRetries) {
              const delay = recoveryResult.delay || this.calculateRetryDelay(attempt);
              await this.delay(delay);
              continue;
            }
            break;

          case 'fallback':
            if (recoveryResult.fallbackValue !== undefined) {
              return recoveryResult.fallbackValue;
            }
            break;

          case 'skip':
            throw new Error(`Operation skipped: ${recoveryResult.message}`);

          case 'escalate':
            throw lastError;
        }
      }
    }

    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Adds a custom recovery strategy
   */
  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Adds an error reporting callback
   */
  addErrorReportingCallback(
    callback: (error: Error, context: ErrorContext, stats: ErrorStats) => void
  ): void {
    this.errorReportingCallbacks.push(callback);
  }

  /**
   * Gets error statistics
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Gets circuit breaker states
   */
  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Resets circuit breaker for a specific key
   */
  resetCircuitBreaker(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state) {
      state.state = 'CLOSED';
      state.failureCount = 0;
      state.successCount = 0;
      state.lastFailureTime = 0;
      state.nextAttemptTime = 0;
    }
  }

  /**
   * Performs cleanup and maintenance
   */
  cleanup(): void {
    const now = Date.now();
    
    // Reset old circuit breakers
    for (const [key, state] of this.circuitBreakers) {
      if (state.state === 'OPEN' && now > state.nextAttemptTime) {
        state.state = 'HALF_OPEN';
        state.successCount = 0;
      }
    }

    // Trim recovery times array
    if (this.recoveryTimes.length > 100) {
      this.recoveryTimes = this.recoveryTimes.slice(-50);
    }

    // Clean up old circuit breaker entries (optional)
    const cutoffTime = now - (24 * 60 * 60 * 1000); // 24 hours
    for (const [key, state] of this.circuitBreakers) {
      if (state.lastFailureTime > 0 && state.lastFailureTime < cutoffTime) {
        this.circuitBreakers.delete(key);
      }
    }
  }

  /**
   * Shuts down the error handler
   */
  shutdown(): void {
    this.circuitBreakers.clear();
    this.recoveryTimes = [];
    this.errorReportingCallbacks = [];
  }

  /**
   * Initializes default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Timeout retry strategy
    this.addRecoveryStrategy({
      name: 'TimeoutRetry',
      priority: 100,
      canHandle: (error) => error.message.includes('timeout'),
      recover: async (error, context) => ({
        success: false,
        action: 'retry',
        delay: Math.min(this.config.baseRetryDelay * Math.pow(2, context.retryCount), this.config.maxRetryDelay),
      }),
    });

    // Network error retry strategy
    this.addRecoveryStrategy({
      name: 'NetworkRetry',
      priority: 90,
      canHandle: (error) => 
        error.message.includes('network') || 
        error.message.includes('connection') ||
        error.message.includes('fetch'),
      recover: async (error, context) => ({
        success: false,
        action: 'retry',
        delay: this.calculateRetryDelay(context.retryCount),
      }),
    });

    // Validation error skip strategy
    this.addRecoveryStrategy({
      name: 'ValidationSkip',
      priority: 50,
      canHandle: (error) => 
        error.message.includes('validation') || 
        error.message.includes('invalid'),
      recover: async (error, context) => ({
        success: true,
        action: 'skip',
        message: `Skipped due to validation error: ${error.message}`,
      }),
    });

    // Concurrency limit fallback
    this.addRecoveryStrategy({
      name: 'ConcurrencyFallback',
      priority: 80,
      canHandle: (error) => 
        error.message.includes('Too many') || 
        error.message.includes('queue full') ||
        error.message.includes('concurrency'),
      recover: async (error, context) => {
        // Wait longer for concurrency issues
        return {
          success: false,
          action: 'retry',
          delay: Math.min(this.config.baseRetryDelay * 5, this.config.maxRetryDelay),
        };
      },
    });

    // Graceful degradation strategy
    if (this.config.enableGracefulDegradation) {
      this.addRecoveryStrategy({
        name: 'GracefulDegradation',
        priority: 10,
        canHandle: () => true, // Catches all errors as last resort
        recover: async (error, context) => ({
          success: true,
          action: 'fallback',
          fallbackValue: this.createFallbackResponse(context),
          message: `Graceful degradation applied for ${context.operation}`,
        }),
      });
    }
  }

  /**
   * Gets applicable recovery strategies for an error
   */
  private getApplicableStrategies(error: Error, context: ErrorContext): ErrorRecoveryStrategy[] {
    return this.recoveryStrategies.filter(strategy => strategy.canHandle(error, context));
  }

  /**
   * Updates error statistics
   */
  private updateErrorStats(error: Error, context: ErrorContext): void {
    this.errorStats.totalErrors++;

    // Error by type
    const errorType = error.constructor.name;
    this.errorStats.errorsByType[errorType] = (this.errorStats.errorsByType[errorType] || 0) + 1;

    // Error by speaker
    if (context.speakerId) {
      this.errorStats.errorsBySpeaker[context.speakerId] = 
        (this.errorStats.errorsBySpeaker[context.speakerId] || 0) + 1;
    }

    // Error by operation
    this.errorStats.errorsByOperation[context.operation] = 
      (this.errorStats.errorsByOperation[context.operation] || 0) + 1;

    // Report to performance monitor
    if (this.config.enableErrorReporting) {
      performanceMonitor.recordError(context.operation, error, {
        speakerId: context.speakerId,
        messageId: context.messageId,
        retryCount: context.retryCount,
      });
    }
  }

  /**
   * Records successful recovery
   */
  private recordRecovery(startTime: number): void {
    const recoveryTime = Date.now() - startTime;
    this.errorStats.recoveredErrors++;
    this.recoveryTimes.push(recoveryTime);

    // Calculate average recovery time
    this.errorStats.averageRecoveryTime = 
      this.recoveryTimes.reduce((sum, time) => sum + time, 0) / this.recoveryTimes.length;
  }

  /**
   * Gets circuit breaker key for context
   */
  private getCircuitBreakerKey(context: ErrorContext): string {
    return `${context.operation}:${context.speakerId || 'global'}`;
  }

  /**
   * Checks if circuit breaker is open
   */
  private isCircuitOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;

    if (state.state === 'OPEN') {
      if (Date.now() > state.nextAttemptTime) {
        state.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Records circuit breaker failure
   */
  private recordCircuitBreakerFailure(context: ErrorContext): void {
    if (!this.config.enableCircuitBreaker) return;

    const key = this.getCircuitBreakerKey(context);
    let state = this.circuitBreakers.get(key);
    
    if (!state) {
      state = {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      };
      this.circuitBreakers.set(key, state);
    }

    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= this.config.circuitBreakerThreshold) {
      state.state = 'OPEN';
      state.nextAttemptTime = Date.now() + this.config.circuitBreakerResetTimeout;
      this.errorStats.circuitBreakerTrips++;
      
      console.warn(`Circuit breaker opened for ${key} after ${state.failureCount} failures`);
    }
  }

  /**
   * Records circuit breaker success
   */
  private recordCircuitBreakerSuccess(context: ErrorContext): void {
    if (!this.config.enableCircuitBreaker) return;

    const key = this.getCircuitBreakerKey(context);
    const state = this.circuitBreakers.get(key);
    
    if (state) {
      state.successCount++;
      
      if (state.state === 'HALF_OPEN' && state.successCount >= 3) {
        state.state = 'CLOSED';
        state.failureCount = 0;
        state.successCount = 0;
        console.log(`Circuit breaker closed for ${key} after successful operations`);
      }
    }
  }

  /**
   * Calculates retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.config.baseRetryDelay * Math.pow(2, attempt);
    return Math.min(delay + Math.random() * 1000, this.config.maxRetryDelay);
  }

  /**
   * Creates a fallback response for graceful degradation
   */
  private createFallbackResponse(context: ErrorContext): any {
    switch (context.operation) {
      case 'message_processing':
        return {
          shouldRespond: false,
          responseType: 'none',
          processedText: '',
          confidence: 0,
          metadata: {
            fragmentType: 'ERROR_FALLBACK',
            speakerContext: [],
            conversationTopics: [],
            interruptDetected: false,
            error: true,
            fallback: true,
          },
        };

      case 'speaker_locking':
        return null; // No lock acquired

      case 'queue_processing':
        return { queued: false, skipped: true };

      default:
        return null;
    }
  }

  /**
   * Reports error if threshold exceeded
   */
  private async reportError(error: Error, context: ErrorContext): Promise<void> {
    if (this.errorStats.totalErrors % this.config.errorReportingThreshold === 0) {
      for (const callback of this.errorReportingCallbacks) {
        try {
          callback(error, context, this.errorStats);
        } catch (reportingError) {
          console.error('Error in error reporting callback:', reportingError);
        }
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Creates a default error handler with common strategies
 */
export function createDefaultErrorHandler(
  config: Partial<GatekeeperErrorHandlerConfig> = {}
): GatekeeperErrorHandler {
  const handler = new GatekeeperErrorHandler(config);
  
  // Add logging callback
  handler.addErrorReportingCallback((error, context, stats) => {
    console.error(`Gatekeeper Error Report - Operation: ${context.operation}, Total Errors: ${stats.totalErrors}`, error);
  });

  return handler;
}