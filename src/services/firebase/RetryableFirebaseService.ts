/**
 * Retryable Firebase Service Wrapper
 * 
 * Provides a wrapper for Firebase operations with built-in retry logic,
 * error handling, and monitoring. Uses the secure error handling from
 * firebaseErrorHandler.ts.
 * 
 * Features:
 * - Automatic retry for transient errors
 * - Exponential backoff with jitter
 * - Circuit breaker pattern for repeated failures
 * - Comprehensive error reporting
 * - Type-safe operation wrapping
 */

import { 
  handleFirebaseError, 
  reportFirebaseError, 
  shouldRetryOperation, 
  shouldTriggerReauth,
  withFirebaseErrorHandling 
} from '@/utils/firebaseErrorHandler';
import { processCatchError } from '@/utils/errorMessages';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  enableCircuitBreaker: boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds max
  jitter: true,
  enableCircuitBreaker: true
};

/**
 * Retryable Firebase Service with circuit breaker pattern
 */
export class RetryableFirebaseService {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute a Firebase operation with retry logic and circuit breaker
   * 
   * @param operation - The Firebase operation to execute
   * @param operationName - Name for logging and circuit breaker identification
   * @param config - Retry configuration options
   * @param userId - Optional user ID for error reporting
   * @returns Promise with operation result
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {},
    userId?: string
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    
    // Check circuit breaker
    if (fullConfig.enableCircuitBreaker && this.isCircuitOpen(operationName)) {
      throw new Error(`Circuit breaker open for operation: ${operationName}`);
    }

    let lastError: unknown;
    let attempt = 0;

    while (attempt < fullConfig.maxRetries) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        if (fullConfig.enableCircuitBreaker) {
          this.resetCircuitBreaker(operationName);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        const processedError = processCatchError(error);
        
        // Report error for monitoring
        reportFirebaseError(processedError, operationName, userId);
        
        // Record failure for circuit breaker
        if (fullConfig.enableCircuitBreaker) {
          this.recordFailure(operationName);
        }
        
        // Check if we should retry
        if (!shouldRetryOperation(error) || attempt >= fullConfig.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, fullConfig);
        
        console.info(`Retrying ${operationName} in ${delay}ms (attempt ${attempt}/${fullConfig.maxRetries})`);
        
        await this.delay(delay);
      }
    }

    // All retries failed
    throw new Error(handleFirebaseError(lastError, operationName));
  }

  /**
   * Execute operation with authentication retry
   * Automatically handles reauth flow for permission errors
   */
  async executeWithAuthRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {},
    userId?: string,
    onReauthNeeded?: () => Promise<void>
  ): Promise<T> {
    try {
      return await this.executeWithRetry(operation, operationName, config, userId);
    } catch (error) {
      // If authentication error and we have reauth handler
      if (shouldTriggerReauth(error) && onReauthNeeded) {
        console.info(`Authentication required for ${operationName}, triggering reauth`);
        
        try {
          await onReauthNeeded();
          // Retry once after reauth
          return await this.executeWithRetry(
            operation, 
            `${operationName} (post-reauth)`, 
            { ...config, maxRetries: 1 }, 
            userId
          );
        } catch (reauthError) {
          console.error(`Reauth failed for ${operationName}:`, reauthError);
          throw error; // Throw original error
        }
      }
      
      throw error;
    }
  }

  /**
   * Batch operations with individual retry logic
   */
  async executeBatch<T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      config?: Partial<RetryConfig>;
    }>,
    userId?: string
  ): Promise<Array<{ success: boolean; result?: T; error?: string }>> {
    const results = await Promise.allSettled(
      operations.map(({ operation, name, config }) =>
        this.executeWithRetry(operation, name, config, userId)
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { success: true, result: result.value };
      } else {
        return { 
          success: false, 
          error: handleFirebaseError(result.reason, operations[index].name)
        };
      }
    });
  }

  /**
   * Circuit breaker management
   */
  private isCircuitOpen(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return false;

    const now = Date.now();

    // Check if circuit should transition to half-open
    if (breaker.state === 'open' && 
        now - breaker.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
      breaker.state = 'half-open';
      return false;
    }

    return breaker.state === 'open';
  }

  private recordFailure(operationName: string): void {
    const now = Date.now();
    let breaker = this.circuitBreakers.get(operationName);

    if (!breaker) {
      breaker = { failures: 0, lastFailureTime: now, state: 'closed' };
      this.circuitBreakers.set(operationName, breaker);
    }

    breaker.failures++;
    breaker.lastFailureTime = now;

    // Open circuit if threshold exceeded
    if (breaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      breaker.state = 'open';
      console.warn(`Circuit breaker opened for operation: ${operationName}`);
    }
  }

  private resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(2, attempt - 1),
      config.maxDelay
    );

    if (!config.jitter) {
      return exponentialDelay;
    }

    // Add jitter (±25% of the delay)
    const jitterRange = exponentialDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    
    return Math.max(0, exponentialDelay + jitter);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    return Object.fromEntries(this.circuitBreakers.entries());
  }

  /**
   * Reset all circuit breakers (for testing or manual intervention)
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }
}

/**
 * Singleton instance for global use
 */
export const retryableFirebaseService = new RetryableFirebaseService();

/**
 * Convenience functions using the singleton
 */
export const executeFirebaseWithRetry = retryableFirebaseService.executeWithRetry.bind(retryableFirebaseService);
export const executeFirebaseWithAuthRetry = retryableFirebaseService.executeWithAuthRetry.bind(retryableFirebaseService);
export const executeFirebaseBatch = retryableFirebaseService.executeBatch.bind(retryableFirebaseService);