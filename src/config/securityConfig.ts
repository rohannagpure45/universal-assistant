/**
 * Security Configuration Constants
 * 
 * Centralized security constants and configurations for the Universal Assistant
 * Follows project patterns from existing config files
 */

// Token Management Constants
export const DEEPGRAM_TOKEN_CONFIG = {
  // 5-second buffer before token expiry for refresh
  TOKEN_REFRESH_BUFFER_MS: 5000,
  // Default TTL for temporary tokens (matches API endpoint)
  DEFAULT_TOKEN_TTL_SECONDS: 30,
  // Maximum retry attempts for token refresh
  MAX_TOKEN_REFRESH_ATTEMPTS: 3,
  // Connection timeout for token requests
  TOKEN_REQUEST_TIMEOUT_MS: 10000,
} as const;

// WebSocket Connection Constants
export const WEBSOCKET_CONFIG = {
  // Connection establishment timeout
  CONNECTION_TIMEOUT_MS: 10000,
  // Heartbeat interval to maintain connection
  HEARTBEAT_INTERVAL_MS: 30000,
  // Maximum reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 5,
  // Initial reconnection delay
  INITIAL_RECONNECT_DELAY_MS: 1000,
  // Maximum reconnection delay
  MAX_RECONNECT_DELAY_MS: 30000,
  // Exponential backoff multiplier
  RECONNECT_BACKOFF_MULTIPLIER: 2,
} as const;

// Security Headers Configuration
export const SECURITY_HEADERS = {
  CONTENT_TYPE: 'application/json',
  USER_AGENT: 'UniversalAssistant/1.0',
} as const;

// Rate Limiting Configuration
export const RATE_LIMITS = {
  // Token requests per minute per user
  TOKEN_REQUESTS_PER_MINUTE: 10,
  // WebSocket connections per user
  MAX_CONCURRENT_CONNECTIONS: 3,
} as const;

// Error Classification
export const SECURITY_ERROR_TYPES = {
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  TOKEN_REFRESH_FAILED: 'token_refresh_failed',
  CONNECTION_UNAUTHORIZED: 'connection_unauthorized',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  DEEPGRAM_TOKEN: '/api/universal-assistant/deepgram-token',
  TTS: '/api/universal-assistant/tts',
  AI_RESPONSE: '/api/universal-assistant/ai-response',
} as const;

// Deepgram WebSocket Configuration
export const DEEPGRAM_WEBSOCKET = {
  BASE_URL: 'wss://api.deepgram.com/v1/listen',
  SUBPROTOCOL: 'token',
  // Audio stream requirements
  AUDIO_START_TIMEOUT_MS: 10000, // Must send audio within 10 seconds
  KEEPALIVE_INTERVAL_MS: 8000,   // Send keepalive every 8 seconds
} as const;

// Type exports for strong typing
export type SecurityErrorType = typeof SECURITY_ERROR_TYPES[keyof typeof SECURITY_ERROR_TYPES];
export type ApiEndpoint = typeof API_ENDPOINTS[keyof typeof API_ENDPOINTS];