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
 * Successful validation result with type-safe data
 */
export interface ValidationSuccess<T> {
  readonly isValid: true;
  readonly data: T;
  readonly warnings?: string[];
  readonly metadata?: Record<string, any>;
}

/**
 * Failed validation result with errors
 */
export interface ValidationFailure {
  readonly isValid: false;
  readonly errors: ValidationError[];
  readonly warnings?: string[];
  readonly metadata?: Record<string, any>;
}

/**
 * Discriminated union for type-safe validation results
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Create a successful validation result
 */
export function createValidationSuccess<T>(
  data: T,
  metadata?: Record<string, any>,
  warnings?: string[]
): ValidationSuccess<T> {
  return {
    isValid: true,
    data,
    ...(warnings && warnings.length > 0 && { warnings }),
    ...(metadata && { metadata })
  } as const;
}

/**
 * Create a failed validation result
 */
export function createValidationFailure(
  errors: ValidationError[],
  warnings?: string[],
  metadata?: Record<string, any>
): ValidationFailure {
  return {
    isValid: false,
    errors,
    ...(warnings && warnings.length > 0 && { warnings }),
    ...(metadata && { metadata })
  } as const;
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
 * Type guard to check if result is successful
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccess<T> {
  return result.isValid === true;
}

/**
 * Type guard to check if result is a failure
 */
export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is ValidationFailure {
  return result.isValid === false;
}

/**
 * Utility to check if validation result has specific error code
 */
export function hasValidationErrorCode<T>(
  result: ValidationResult<T>,
  code: string
): boolean {
  if (isValidationFailure(result)) {
    return result.errors.some(error => error.code === code);
  }
  return false;
}

/**
 * Safely get data from validation result
 */
export function getValidationData<T>(
  result: ValidationResult<T>
): T | undefined {
  return isValidationSuccess(result) ? result.data : undefined;
}

/**
 * Safely get errors from validation result
 */
export function getValidationErrors<T>(
  result: ValidationResult<T>
): ValidationError[] {
  return isValidationFailure(result) ? result.errors : [];
}

/**
 * Map over successful validation result
 */
export function mapValidationResult<T, U>(
  result: ValidationResult<T>,
  mapper: (data: T) => U
): ValidationResult<U> {
  if (isValidationSuccess(result)) {
    return createValidationSuccess(
      mapper(result.data),
      result.metadata,
      result.warnings
    );
  }
  return result as ValidationFailure;
}

/**
 * Chain validation results
 */
export function chainValidation<T, U>(
  result: ValidationResult<T>,
  validator: (data: T) => ValidationResult<U>
): ValidationResult<U> {
  if (isValidationFailure(result)) {
    return result;
  }
  return validator(result.data);
}