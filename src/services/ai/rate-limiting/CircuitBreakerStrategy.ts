export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringWindow: number; // milliseconds
}

export interface CircuitBreakerStrategy {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  getFailureCount(): number;
  reset(): void;
}

export class TimeWindowCircuitBreaker implements CircuitBreakerStrategy {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError('Circuit breaker is OPEN - requests are being rejected');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    // Update state based on current conditions
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = Date.now();
  }

  private shouldAttemptReset(): boolean {
    const now = Date.now();
    return now - this.lastFailureTime > this.config.resetTimeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastSuccessTime = Date.now();
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}