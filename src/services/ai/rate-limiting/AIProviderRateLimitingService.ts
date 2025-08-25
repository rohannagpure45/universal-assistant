import { AIModel } from '@/types';
import { getModelConfig } from '@/config/modelConfigs';
import { RateLimitExceededError } from '@/domain/validation/ValidationResult';
import { TokenBucketRateLimiter, InMemoryRateLimitStorage } from './TokenBucketRateLimiter';
import { TimeWindowCircuitBreaker, CircuitBreakerStrategy } from './CircuitBreakerStrategy';
import { RateLimitStrategy, RateLimitConfig } from './RateLimitStrategy';

export interface ProviderLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  tokensPerHour?: number;
  maxConcurrentRequests?: number;
}

export interface AIProviderRateLimitingConfig {
  openai: ProviderLimits;
  anthropic: ProviderLimits;
  cleanup: {
    intervalMs: number;
    maxAge: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
  };
}

export class AIProviderRateLimitingService {
  private readonly openaiLimiter: RateLimitStrategy;
  private readonly anthropicLimiter: RateLimitStrategy;
  private readonly openaiBreaker: CircuitBreakerStrategy;
  private readonly anthropicBreaker: CircuitBreakerStrategy;
  private readonly storage: InMemoryRateLimitStorage;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AIProviderRateLimitingConfig>) {
    const defaultConfig: AIProviderRateLimitingConfig = {
      openai: {
        requestsPerMinute: 300,
        tokensPerMinute: 40000,
        tokensPerHour: 2000000
      },
      anthropic: {
        requestsPerMinute: 200,
        tokensPerMinute: 20000,
        tokensPerHour: 1000000
      },
      cleanup: {
        intervalMs: 60 * 60 * 1000, // 1 hour
        maxAge: 2 * 60 * 60 * 1000  // 2 hours
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60 * 1000 // 1 minute
      },
      ...config
    };

    this.storage = new InMemoryRateLimitStorage();

    // Create rate limiters for each provider
    this.openaiLimiter = new TokenBucketRateLimiter(
      this.storage,
      this.createRateLimitConfig('openai', defaultConfig.openai)
    );

    this.anthropicLimiter = new TokenBucketRateLimiter(
      this.storage,
      this.createRateLimitConfig('anthropic', defaultConfig.anthropic)
    );

    // Create circuit breakers
    this.openaiBreaker = new TimeWindowCircuitBreaker({
      failureThreshold: defaultConfig.circuitBreaker.failureThreshold,
      resetTimeout: defaultConfig.circuitBreaker.resetTimeout,
      monitoringWindow: 60 * 1000 // 1 minute
    });

    this.anthropicBreaker = new TimeWindowCircuitBreaker({
      failureThreshold: defaultConfig.circuitBreaker.failureThreshold,
      resetTimeout: defaultConfig.circuitBreaker.resetTimeout,
      monitoringWindow: 60 * 1000
    });

    // Start cleanup
    this.startCleanup(defaultConfig.cleanup);
  }

  async checkProviderLimit(provider: string, model: AIModel, estimatedTokens: number): Promise<void> {
    const limiter = this.getLimiterForProvider(provider);
    const breaker = this.getBreakerForProvider(provider);
    
    const limitKey = `${provider}:${model}`;

    try {
      await breaker.execute(async () => {
        const result = await limiter.checkLimit(limitKey, estimatedTokens);
        
        if (!result.allowed) {
          throw new RateLimitExceededError(
            `Rate limit exceeded for ${provider}`,
            provider,
            result.retryAfter || 60,
            'tokens'
          );
        }
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        throw error;
      }
      
      // Circuit breaker or other error
      console.error(`[AIProviderRateLimitingService] Error checking rate limit for ${provider}:`, error);
      throw new RateLimitExceededError(
        `Rate limit check failed for ${provider}`,
        provider,
        60,
        'tokens'
      );
    }
  }

  async getRemainingCapacity(provider: string, model: AIModel): Promise<number> {
    const limiter = this.getLimiterForProvider(provider);
    const key = `${provider}:${model}`;
    
    try {
      return await limiter.getRemainingCapacity(key);
    } catch (error) {
      console.error(`[AIProviderRateLimitingService] Error getting capacity for ${provider}:`, error);
      return 0;
    }
  }

  async resetProvider(provider: string): Promise<void> {
    const limiter = this.getLimiterForProvider(provider);
    const breaker = this.getBreakerForProvider(provider);
    
    // Reset circuit breaker
    breaker.reset();
    
    // Reset all rate limits for this provider
    // This is a simplified approach - in production you might want to be more selective
    await this.storage.cleanup(0); // Clean all entries
  }

  getProviderStatus(provider: string): {
    circuitState: string;
    failureCount: number;
    isHealthy: boolean;
  } {
    const breaker = this.getBreakerForProvider(provider);
    const state = breaker.getState();
    
    return {
      circuitState: state,
      failureCount: breaker.getFailureCount(),
      isHealthy: state === 'CLOSED'
    };
  }

  private getLimiterForProvider(provider: string): RateLimitStrategy {
    switch (provider) {
      case 'openai':
        return this.openaiLimiter;
      case 'anthropic':
        return this.anthropicLimiter;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private getBreakerForProvider(provider: string): CircuitBreakerStrategy {
    switch (provider) {
      case 'openai':
        return this.openaiBreaker;
      case 'anthropic':
        return this.anthropicBreaker;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private createRateLimitConfig(provider: string, limits: ProviderLimits): RateLimitConfig {
    return {
      capacity: limits.tokensPerMinute,
      refillRate: limits.tokensPerMinute / 60, // tokens per second
      windowSize: 60 * 1000, // 1 minute window
      requestsPerMinute: limits.requestsPerMinute
    };
  }

  private startCleanup(cleanupConfig: { intervalMs: number; maxAge: number }): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleaned = await this.storage.cleanup(cleanupConfig.maxAge);
        if (cleaned > 0) {
          console.log(`[AIProviderRateLimitingService] Cleaned up ${cleaned} expired rate limit entries`);
        }
      } catch (error) {
        console.error('[AIProviderRateLimitingService] Cleanup error:', error);
      }
    }, cleanupConfig.intervalMs);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Factory for creating the service
export class AIProviderRateLimitingServiceFactory {
  private static instance: AIProviderRateLimitingService | null = null;

  static getInstance(config?: Partial<AIProviderRateLimitingConfig>): AIProviderRateLimitingService {
    if (!this.instance) {
      this.instance = new AIProviderRateLimitingService(config);
    }
    return this.instance;
  }

  static createService(config?: Partial<AIProviderRateLimitingConfig>): AIProviderRateLimitingService {
    return new AIProviderRateLimitingService(config);
  }
}

// Utility function
export function getAIProviderRateLimitingService(config?: Partial<AIProviderRateLimitingConfig>): AIProviderRateLimitingService {
  return AIProviderRateLimitingServiceFactory.getInstance(config);
}