export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfter?: number;
  metadata?: {
    requestsInWindow: number;
    tokensInWindow: number;
    windowResetTime: number;
  };
}

export interface RateLimitStrategy {
  checkLimit(key: string, tokens: number): Promise<RateLimitResult>;
  getRemainingCapacity(key: string): Promise<number>;
  reset(key: string): Promise<void>;
}

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

export interface RateLimitConfig {
  capacity: number;      // Maximum tokens in bucket
  refillRate: number;    // Tokens per second refill rate
  windowSize: number;    // Time window in milliseconds
  requestsPerMinute: number; // Max requests per minute
}

export interface RateLimitStorage {
  getBucket(key: string): Promise<TokenBucket>;
  updateBucket(key: string, bucket: TokenBucket): Promise<void>;
  deleteBucket(key: string): Promise<void>;
  cleanup(olderThan: number): Promise<number>;
}