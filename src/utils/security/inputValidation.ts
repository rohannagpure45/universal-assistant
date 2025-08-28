/**
 * SECURITY-CRITICAL: Input Validation and Sanitization
 * 
 * Enhanced validation wrappers that provide additional security checks
 * beyond basic sanitization, while using the proven sanitization.ts
 * implementations as the foundation.
 * 
 * These functions combine validation, sanitization, and security checks
 * for comprehensive input processing.
 */

import { 
  sanitizeUserInput, 
  sanitizeUrl, 
  sanitizeEmail,
  needsSanitization,
  isValidUrl 
} from '../sanitization';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

/**
 * Comprehensive input validation and sanitization
 * 
 * Performs validation checks before sanitization and provides
 * detailed error reporting for better security posture.
 * 
 * @param input - Input to validate and sanitize
 * @param options - Validation options
 * @returns ValidationResult with sanitized value and error details
 */
export function validateAndSanitizeInput(
  input: string,
  options: {
    maxLength?: number;
    minLength?: number;
    allowHTML?: boolean;
    allowNewlines?: boolean;
    required?: boolean;
    pattern?: RegExp;
  } = {}
): ValidationResult {
  const {
    maxLength = 1000,
    minLength = 0,
    allowHTML = false,
    allowNewlines = false,
    required = false,
    pattern
  } = options;
  
  const errors: string[] = [];
  
  // Input type validation
  if (typeof input !== 'string') {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['Input must be a string']
    };
  }
  
  // Required field validation
  if (required && (!input || input.trim().length === 0)) {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['This field is required']
    };
  }
  
  // Early return for empty optional fields
  if (!required && (!input || input.trim().length === 0)) {
    return {
      isValid: true,
      sanitizedValue: '',
      errors: []
    };
  }
  
  // Pre-sanitization length validation (DoS protection)
  if (input.length > maxLength * 2) {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: [`Input too long (maximum ${maxLength} characters allowed)`]
    };
  }
  
  // Pattern validation (before sanitization)
  if (pattern && !pattern.test(input)) {
    errors.push('Input format is invalid');
  }
  
  // Sanitize the input using proven sanitization
  const sanitizedValue = sanitizeUserInput(input, {
    maxLength,
    allowBasicFormatting: allowHTML,
    allowNewlines
  });
  
  // Post-sanitization validations
  if (sanitizedValue.length < minLength) {
    errors.push(`Input too short (minimum ${minLength} characters required)`);
  }
  
  // Check if content was modified during sanitization
  if (needsSanitization(input) && sanitizedValue !== input) {
    // This is expected behavior - content was sanitized for security
    // We don't add this as an error, but log for monitoring
    console.info('Input was sanitized for security');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors
  };
}

/**
 * Simple validation and sanitization (for backward compatibility)
 * 
 * @param input - Input to validate and sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string or empty string if invalid
 */
export function validateAndSanitizeInputSimple(
  input: string,
  maxLength: number = 1000
): string {
  const result = validateAndSanitizeInput(input, { maxLength });
  return result.sanitizedValue;
}

/**
 * Validate and sanitize email addresses
 * 
 * @param email - Email to validate
 * @returns ValidationResult for email
 */
export function validateEmail(email: string): ValidationResult {
  if (typeof email !== 'string') {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['Email must be a string']
    };
  }
  
  const sanitizedEmail = sanitizeEmail(email);
  const errors: string[] = [];
  
  if (!sanitizedEmail) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedEmail,
    errors
  };
}

/**
 * Validate and sanitize URLs
 * 
 * @param url - URL to validate
 * @param allowedProtocols - Array of allowed protocols (default: ['http', 'https'])
 * @returns ValidationResult for URL
 */
export function validateURL(
  url: string,
  allowedProtocols: string[] = ['http', 'https']
): ValidationResult {
  if (typeof url !== 'string') {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['URL must be a string']
    };
  }
  
  const sanitizedUrl = sanitizeUrl(url);
  const errors: string[] = [];
  
  if (!sanitizedUrl) {
    errors.push('Invalid URL format');
    return {
      isValid: false,
      sanitizedValue: '',
      errors
    };
  }
  
  // Protocol validation
  try {
    const urlObj = new URL(sanitizedUrl);
    const protocol = urlObj.protocol.replace(':', '');
    
    if (!allowedProtocols.includes(protocol)) {
      errors.push(`Protocol '${protocol}' not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`);
    }
  } catch {
    errors.push('Invalid URL structure');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedUrl,
    errors
  };
}

/**
 * Validate numeric input
 * 
 * @param input - Numeric input as string
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns ValidationResult for numeric input
 */
export function validateNumeric(
  input: string,
  min?: number,
  max?: number
): ValidationResult {
  if (typeof input !== 'string') {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['Input must be a string']
    };
  }
  
  const sanitizedInput = input.trim();
  const errors: string[] = [];
  
  // Check if it's a valid number
  const numValue = Number(sanitizedInput);
  if (isNaN(numValue)) {
    errors.push('Input must be a valid number');
  } else {
    // Range validation
    if (min !== undefined && numValue < min) {
      errors.push(`Value must be at least ${min}`);
    }
    if (max !== undefined && numValue > max) {
      errors.push(`Value must be no more than ${max}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedInput,
    errors
  };
}

/**
 * Validate and sanitize username input
 * 
 * @param username - Username to validate
 * @returns ValidationResult for username
 */
export function validateUsername(username: string): ValidationResult {
  return validateAndSanitizeInput(username, {
    minLength: 3,
    maxLength: 30,
    required: true,
    allowHTML: false,
    allowNewlines: false,
    pattern: /^[a-zA-Z0-9_-]+$/ // Only alphanumeric, underscore, and hyphen
  });
}

/**
 * Validate and sanitize display name
 * 
 * @param displayName - Display name to validate
 * @returns ValidationResult for display name
 */
export function validateDisplayName(displayName: string): ValidationResult {
  return validateAndSanitizeInput(displayName, {
    minLength: 1,
    maxLength: 100,
    required: true,
    allowHTML: false,
    allowNewlines: false
  });
}

/**
 * Batch validate multiple inputs
 * 
 * @param inputs - Object with input values and their validation configs
 * @returns Object with validation results for each input
 */
export function batchValidateInputs<T extends Record<string, any>>(
  inputs: T,
  configs: Record<keyof T, Parameters<typeof validateAndSanitizeInput>[1]>
): Record<keyof T, ValidationResult> {
  const results = {} as Record<keyof T, ValidationResult>;
  
  for (const [key, value] of Object.entries(inputs)) {
    const config = configs[key as keyof T];
    results[key as keyof T] = validateAndSanitizeInput(
      typeof value === 'string' ? value : String(value),
      config
    );
  }
  
  return results;
}