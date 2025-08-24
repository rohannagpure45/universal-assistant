/**
 * Domain validation error types and utilities
 */

/**
 * Base validation error class
 */
export abstract class ValidationError extends Error {
  abstract readonly code: string;
  
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Error thrown when AI model mapping fails
 */
export class ModelMappingError extends ValidationError {
  readonly code = 'MODEL_MAPPING_ERROR';
  
  constructor(
    message: string,
    public model: string,
    public availableModels?: string[],
    context?: Record<string, any>
  ) {
    super(message, { model, availableModels, ...context });
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitExceededError extends ValidationError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  
  constructor(
    message: string,
    public provider: string,
    public retryAfter?: number,
    public limitType?: 'requests' | 'tokens',
    context?: Record<string, any>
  ) {
    super(message, { provider, retryAfter, limitType, ...context });
  }
}

/**
 * Error thrown when voice identification validation fails
 */
export class VoiceIdentificationError extends ValidationError {
  readonly code = 'VOICE_IDENTIFICATION_ERROR';
  
  constructor(
    message: string,
    public method: string,
    public reason: 'invalid_method' | 'unsupported' | 'configuration_error',
    context?: Record<string, any>
  ) {
    super(message, { method, reason, ...context });
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerError extends ValidationError {
  readonly code = 'CIRCUIT_BREAKER_OPEN';
  
  constructor(
    message: string,
    public service: string,
    public nextRetryTime?: Date,
    context?: Record<string, any>
  ) {
    super(message, { service, nextRetryTime, ...context });
  }
}

/**
 * Generic validation result type
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * Create a successful validation result
 */
export function createValidationSuccess<T>(
  data: T,
  metadata?: Record<string, any>
): ValidationResult<T> {
  return {
    isValid: true,
    data,
    metadata,
  };
}

/**
 * Create a failed validation result
 */
export function createValidationFailure<T>(
  errors: ValidationError[],
  warnings?: string[],
  metadata?: Record<string, any>
): ValidationResult<T> {
  return {
    isValid: false,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Utility to check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Utility to extract error codes from validation errors
 */
export function getValidationErrorCodes(errors: ValidationError[]): string[] {
  return errors.map(error => error.code);
}

/**
 * Utility to check if validation result has specific error code
 */
export function hasValidationErrorCode(
  result: ValidationResult,
  code: string
): boolean {
  return result.errors?.some(error => error.code === code) ?? false;
}