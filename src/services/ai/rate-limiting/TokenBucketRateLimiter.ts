import { RateLimitStrategy, RateLimitResult, RateLimitConfig, RateLimitStorage, TokenBucket } from './RateLimitStrategy';

export class InMemoryRateLimitStorage implements RateLimitStorage {
  private buckets = new Map<string, TokenBucket>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  async getBucket(key: string): Promise<TokenBucket> {
    const existing = this.buckets.get(key);
    if (existing) {
      return { ...existing };
    }
    
    // Create new bucket with default config
    return {
      tokens: 0,
      lastRefill: Date.now(),
      capacity: 1000,
      refillRate: 10 // will be overridden by config
    };
  }

  async updateBucket(key: string, bucket: TokenBucket): Promise<void> {
    this.buckets.set(key, { ...bucket });
  }

  async deleteBucket(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async cleanup(olderThan: number): Promise<number> {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > olderThan) {
        this.buckets.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

export class TokenBucketRateLimiter implements RateLimitStrategy {
  constructor(
    private readonly storage: RateLimitStorage,
    private readonly config: RateLimitConfig
  ) {}

  async checkLimit(key: string, tokens: number): Promise<RateLimitResult> {
    const bucket = await this.storage.getBucket(key);
    const now = Date.now();
    
    // Update bucket configuration
    bucket.capacity = this.config.capacity;
    bucket.refillRate = this.config.refillRate;
    
    // Calculate tokens to add based on elapsed time
    const secondsElapsed = (now - bucket.lastRefill) / 1000;
    const refillTokens = Math.floor(secondsElapsed * this.config.refillRate);
    
    // Add tokens up to capacity
    bucket.tokens = Math.min(this.config.capacity, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
    
    if (bucket.tokens >= tokens) {
      // Allow request
      bucket.tokens -= tokens;
      await this.storage.updateBucket(key, bucket);
      
      return {
        allowed: true,
        remainingTokens: bucket.tokens,
        metadata: {
          requestsInWindow: 0, // Will be calculated by parent service
          tokensInWindow: tokens,
          windowResetTime: now + this.config.windowSize
        }
      };
    }
    
    // Deny request - calculate retry after
    const tokensNeeded = tokens - bucket.tokens;
    const retryAfterSeconds = Math.ceil(tokensNeeded / this.config.refillRate);
    
    await this.storage.updateBucket(key, bucket);
    
    return {
      allowed: false,
      remainingTokens: bucket.tokens,
      retryAfter: retryAfterSeconds,
      metadata: {
        requestsInWindow: 0,
        tokensInWindow: 0,
        windowResetTime: now + this.config.windowSize
      }
    };
  }

  async getRemainingCapacity(key: string): Promise<number> {
    const bucket = await this.storage.getBucket(key);
    const now = Date.now();
    
    // Calculate current tokens
    const secondsElapsed = (now - bucket.lastRefill) / 1000;
    const refillTokens = Math.floor(secondsElapsed * this.config.refillRate);
    const currentTokens = Math.min(this.config.capacity, bucket.tokens + refillTokens);
    
    return currentTokens;
  }

  async reset(key: string): Promise<void> {
    await this.storage.deleteBucket(key);
  }
}