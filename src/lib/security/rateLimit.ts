import { Redis } from '@upstash/redis';

interface RateLimitResult {
  allowed: boolean;
  current: number;
  resetTime?: number;
  remaining?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
}

class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.store.entries()) {
        if (now > data.resetTime) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  async checkLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    const existing = this.store.get(key);

    if (!existing || now > existing.resetTime) {
      // First request or window expired
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      
      return {
        allowed: true,
        current: 1,
        resetTime: Math.floor(resetTime / 1000),
        remaining: maxRequests - 1
      };
    }

    // Within existing window
    const newCount = existing.count + 1;
    this.store.set(key, { ...existing, count: newCount });

    return {
      allowed: newCount <= maxRequests,
      current: newCount,
      resetTime: Math.floor(existing.resetTime / 1000),
      remaining: Math.max(0, maxRequests - newCount)
    };
  }

  cleanup() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

class RedisRateLimiter {
  private redis: Redis;

  constructor(redisUrl: string) {
    if (!redisUrl) {
      throw new Error('Redis URL is required for rate limiting');
    }
    
    try {
      this.redis = new Redis({
        url: redisUrl,
        token: undefined // Upstash Redis token if needed
      });
    } catch (error) {
      console.error('Invalid Redis URL:', error);
      throw new Error('Invalid Redis URL format');
    }
  }

  async checkLimit(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = this.redis.pipeline();
      
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec() as Array<[Error | null, any]>;
      if (!results || !Array.isArray(results) || results.length < 2) {
        throw new Error('Redis pipeline failed');
      }

      const countResult = results[1];
      if (countResult[0] !== null) {
        throw new Error(`Redis command failed: ${countResult[0]}`);
      }

      const currentCount = (countResult[1] as number) || 0;
      const newCount = currentCount + 1;

      return {
        allowed: newCount <= maxRequests,
        current: newCount,
        resetTime: Math.floor((now + windowMs) / 1000),
        remaining: Math.max(0, maxRequests - newCount)
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fallback to allowing request if Redis fails
      return {
        allowed: true,
        current: 1,
        resetTime: Math.floor((now + windowMs) / 1000),
        remaining: maxRequests - 1
      };
    }
  }

  async getCostData(key: string): Promise<number> {
    try {
      const value = await this.redis.get(key);
      return Number(value) || 0;
    } catch (error) {
      console.error('Redis get error:', error);
      return 0;
    }
  }

  async setCostData(key: string, value: number, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }
}

// Enhanced rate limiter with tier support
export class RateLimiter {
  private static inMemoryLimiter = new InMemoryRateLimiter();
  private static redisLimiter: RedisRateLimiter | null = null;

  static {
    if (process.env.RATE_LIMIT_REDIS_URL) {
      this.redisLimiter = new RedisRateLimiter(process.env.RATE_LIMIT_REDIS_URL);
    }
  }

  // Rate limit tiers
  private static readonly TIERS = {
    free: { requests: 100, windowMs: 3600000 }, // 100 requests per hour
    premium: { requests: 1000, windowMs: 3600000 }, // 1000 requests per hour
    admin: { requests: 10000, windowMs: 3600000 }, // 10000 requests per hour
  };

  static async checkLimit(
    identifier: string,
    requestsPerMinute: number = 60
  ): Promise<RateLimitResult> {
    const windowMs = 60000; // 1 minute
    const maxRequests = requestsPerMinute;

    if (this.redisLimiter) {
      return this.redisLimiter.checkLimit(identifier, windowMs, maxRequests);
    } else {
      return this.inMemoryLimiter.checkLimit(identifier, windowMs, maxRequests);
    }
  }

  static async checkTierLimit(
    identifier: string,
    tier: 'free' | 'premium' | 'admin' = 'free'
  ): Promise<RateLimitResult> {
    const config = this.TIERS[tier];
    const limiter = this.redisLimiter || this.inMemoryLimiter;
    
    return limiter.checkLimit(identifier, config.windowMs, config.requests);
  }

  // Enhanced rate limiting with multiple windows
  static async checkMultiWindowLimit(
    identifier: string,
    configs: Array<{ windowMs: number; maxRequests: number }>
  ): Promise<RateLimitResult[]> {
    const limiter = this.redisLimiter || this.inMemoryLimiter;
    const results: RateLimitResult[] = [];

    for (const config of configs) {
      const result = await limiter.checkLimit(
        `${identifier}:${config.windowMs}`,
        config.windowMs,
        config.maxRequests
      );
      results.push(result);
    }

    return results;
  }

  // Burst protection: allows short bursts but enforces sustained limits
  static async checkBurstLimit(
    identifier: string,
    burstRequests: number = 10,
    sustainedRequestsPerMinute: number = 30
  ): Promise<RateLimitResult> {
    const burstResult = await this.checkLimit(`${identifier}:burst`, burstRequests * 6); // 10 second window
    const sustainedResult = await this.checkLimit(identifier, sustainedRequestsPerMinute);

    // Must pass both burst and sustained limits
    if (!burstResult.allowed) {
      return { ...burstResult, current: burstResult.current };
    }

    if (!sustainedResult.allowed) {
      return { ...sustainedResult, current: sustainedResult.current };
    }

    return {
      allowed: true,
      current: Math.max(burstResult.current, sustainedResult.current),
      resetTime: Math.min(burstResult.resetTime || 0, sustainedResult.resetTime || 0),
      remaining: Math.min(burstResult.remaining || 0, sustainedResult.remaining || 0)
    };
  }

  // IP-based rate limiting with geolocation consideration
  static async checkIPLimit(
    ip: string,
    userAgent: string,
    requestsPerMinute: number = 60
  ): Promise<RateLimitResult & { riskScore?: number }> {
    const baseResult = await this.checkLimit(`ip:${ip}`, requestsPerMinute);
    
    // Calculate risk score based on various factors
    let riskScore = 0;

    // Check for suspicious patterns
    if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      riskScore += 0.3;
    }

    if (!userAgent || userAgent.length < 10) {
      riskScore += 0.5;
    }

    // Check for rapid requests from same IP
    if (baseResult.current > requestsPerMinute * 0.8) {
      riskScore += 0.4;
    }

    return {
      ...baseResult,
      riskScore: Math.min(riskScore, 1.0)
    };
  }

  // User-based rate limiting (when authenticated)
  static async checkUserLimit(
    userId: string,
    tier: 'free' | 'premium' | 'admin' = 'free',
    operation: string = 'general'
  ): Promise<RateLimitResult> {
    const identifier = `user:${userId}:${operation}`;
    return this.checkTierLimit(identifier, tier);
  }

  // API key based rate limiting
  static async checkAPIKeyLimit(
    apiKey: string,
    requestsPerMinute: number = 100
  ): Promise<RateLimitResult> {
    const identifier = `api_key:${apiKey}`;
    return this.checkLimit(identifier, requestsPerMinute);
  }

  // Cost-based rate limiting (for expensive operations)
  static async checkCostLimit(
    identifier: string,
    cost: number,
    maxCostPerHour: number = 1000
  ): Promise<RateLimitResult> {
    const windowMs = 3600000; // 1 hour
    const key = `cost:${identifier}`;
    
    if (this.redisLimiter) {
      try {
        const currentCost = await this.redisLimiter.getCostData(key);
        const newCost = currentCost + cost;
        
        if (newCost > maxCostPerHour) {
          return {
            allowed: false,
            current: newCost,
            resetTime: Math.floor((Date.now() + windowMs) / 1000),
            remaining: Math.max(0, maxCostPerHour - newCost)
          };
        }

        await this.redisLimiter.setCostData(key, newCost, Math.ceil(windowMs / 1000));
        
        return {
          allowed: true,
          current: newCost,
          resetTime: Math.floor((Date.now() + windowMs) / 1000),
          remaining: maxCostPerHour - newCost
        };
      } catch (error) {
        console.error('Cost-based rate limiting error:', error);
        return { allowed: true, current: cost };
      }
    }

    // Fallback to basic memory-based cost tracking
    return { allowed: true, current: cost };
  }

  // Cleanup method
  static cleanup() {
    this.inMemoryLimiter.cleanup();
  }
}

// Rate limiting middleware for specific operations
export const RateLimitMiddleware = {
  // Voice processing operations (expensive)
  voiceProcessing: (identifier: string) => 
    RateLimiter.checkLimit(`voice:${identifier}`, 10), // 10 per minute

  // AI requests (expensive)
  aiRequests: (identifier: string, tier: 'free' | 'premium' | 'admin' = 'free') => {
    const limits = { free: 20, premium: 100, admin: 500 };
    return RateLimiter.checkLimit(`ai:${identifier}`, limits[tier]);
  },

  // TTS requests (expensive)
  ttsRequests: (identifier: string, tier: 'free' | 'premium' | 'admin' = 'free') => {
    const limits = { free: 50, premium: 200, admin: 1000 };
    return RateLimiter.checkLimit(`tts:${identifier}`, limits[tier]);
  },

  // File uploads
  fileUploads: (identifier: string) => 
    RateLimiter.checkLimit(`upload:${identifier}`, 30), // 30 per minute

  // Authentication attempts
  authAttempts: (identifier: string) => 
    RateLimiter.checkLimit(`auth:${identifier}`, 5), // 5 per minute

  // Meeting creation
  meetingCreation: (identifier: string) => 
    RateLimiter.checkLimit(`meeting:${identifier}`, 10), // 10 per minute
};

// Export types
export type { RateLimitResult, RateLimitConfig };