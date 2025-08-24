/**
 * Sanitization utilities to prevent XSS attacks
 * Provides safe methods for handling user input and displaying content
 * 
 * This module re-exports the secure XSS prevention utilities
 * and provides backward compatibility for existing code
 */

import {
  escapeHtml as escapeHtmlSecure,
  sanitizeHTML,
  sanitizeUrl as sanitizeUrlSecure,
  sanitizeUserInput as sanitizeUserInputSecure,
  isValidUrl,
  generateCSP,
  generateNonce,
  needsSanitization,
  batchSanitize
} from './security/xss-prevention';

/**
 * Escape HTML special characters to prevent XSS
 * @param text - Raw text to escape
 * @returns Escaped text safe for HTML display
 */
export const escapeHtml = escapeHtmlSecure;

/**
 * Sanitize user input for display in the UI
 * Removes dangerous patterns while preserving safe text
 * @param input - User input to sanitize
 * @param options - Sanitization options
 * @returns Sanitized text
 */
export function sanitizeUserInput(
  input: string,
  options: {
    allowNewlines?: boolean;
    maxLength?: number;
    allowBasicFormatting?: boolean;
  } = {}
): string {
  // Use the secure implementation with rate limiting
  return sanitizeUserInputSecure(input, {
    ...options,
    rateLimitKey: 'user-input'
  });
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  // Use the secure implementation with proper validation
  return sanitizeUrlSecure(url, {
    allowRelative: true,
    allowHash: true,
    allowMailto: true,
    allowTel: true,
    rateLimitKey: 'url'
  });
}

/**
 * Sanitize file name to prevent directory traversal
 * @param fileName - File name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return '';
  }
  
  // Remove directory traversal patterns
  let sanitized = fileName.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');
  
  // Remove special characters that could cause issues
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1F]/g, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.lastIndexOf('.');
    if (ext > 0) {
      const name = sanitized.substring(0, ext);
      const extension = sanitized.substring(ext);
      sanitized = name.substring(0, 255 - extension.length) + extension;
    } else {
      sanitized = sanitized.substring(0, 255);
    }
  }
  
  return sanitized.trim();
}

/**
 * Sanitize SQL-like input to prevent injection
 * Note: Use parameterized queries instead when possible
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Escape single quotes
  let sanitized = input.replace(/'/g, "''");
  
  // Remove SQL comment markers
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');
  
  // Remove common SQL injection patterns
  sanitized = sanitized.replace(/(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bEXEC\b|\bEXECUTE\b)/gi, '');
  
  return sanitized;
}

/**
 * Sanitize JSON string to prevent injection
 * @param jsonString - JSON string to sanitize
 * @returns Parsed and re-stringified JSON or empty object
 */
export function sanitizeJson(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    // Re-stringify to ensure proper escaping
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

/**
 * Create a safe display name from user input
 * @param name - User provided name
 * @param fallback - Fallback if name is invalid
 * @returns Safe display name
 */
export function createSafeDisplayName(name: string, fallback: string = 'Unknown'): string {
  const sanitized = sanitizeUserInput(name, {
    allowNewlines: false,
    maxLength: 100,
    allowBasicFormatting: false
  });
  
  return sanitized || fallback;
}

/**
 * Sanitize transcript text for display
 * @param transcript - Transcript text
 * @returns Sanitized transcript
 */
export function sanitizeTranscript(transcript: string): string {
  return sanitizeUserInput(transcript, {
    allowNewlines: true,
    maxLength: 10000,
    allowBasicFormatting: false
  });
}

/**
 * Sanitize meeting notes
 * @param notes - Meeting notes text
 * @returns Sanitized notes
 */
export function sanitizeMeetingNotes(notes: string): string {
  return sanitizeUserInput(notes, {
    allowNewlines: true,
    maxLength: 50000,
    allowBasicFormatting: true
  });
}

/**
 * Batch sanitize an object's string properties
 * @param obj - Object to sanitize
 * @param config - Configuration for which fields to sanitize and how
 * @returns New object with sanitized values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  config: Record<keyof T, (value: any) => any>
): T {
  const result = { ...obj };
  
  for (const [key, sanitizer] of Object.entries(config)) {
    if (key in result) {
      result[key as keyof T] = sanitizer(result[key as keyof T]);
    }
  }
  
  return result;
}

/**
 * Validate and sanitize email
 * @param email - Email to validate and sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(trimmed)) {
    return '';
  }
  
  // Additional safety checks
  if (trimmed.includes('..') || 
      trimmed.startsWith('.') || 
      trimmed.endsWith('.') ||
      trimmed.includes('<') ||
      trimmed.includes('>')) {
    return '';
  }
  
  return trimmed;
}

// Export additional security utilities
export {
  sanitizeHTML,
  isValidUrl,
  generateCSP,
  generateNonce,
  needsSanitization,
  batchSanitize
};

// Re-export escapeHtml as default for convenience
export default escapeHtml;