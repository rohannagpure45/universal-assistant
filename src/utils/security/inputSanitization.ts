/**
 * SECURITY-CRITICAL: Input Sanitization Wrappers
 * 
 * These functions provide test-compatible exports while using the
 * battle-tested sanitization implementations from sanitization.ts.
 * 
 * All functions delegate to proven sanitization utilities with
 * appropriate security configurations for different use cases.
 */

import { 
  sanitizeUserInput, 
  escapeHtml, 
  sanitizeUrl, 
  sanitizeEmail,
  needsSanitization 
} from '../sanitization';

/**
 * Sanitize HTML content for safe display
 * 
 * Uses the proven sanitizeUserInput function with secure settings
 * that remove all HTML tags and dangerous content.
 * 
 * @param input - HTML content to sanitize
 * @returns Sanitized content safe for display
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return sanitizeUserInput(input, {
    allowBasicFormatting: false, // Remove ALL HTML for security
    allowNewlines: false,        // Convert to spaces for inline display
    maxLength: 10000            // Reasonable limit for HTML content
  });
}

/**
 * Sanitize HTML content while preserving safe formatting
 * 
 * @param input - HTML content to sanitize
 * @returns Sanitized content with safe HTML preserved
 */
export function sanitizeHTMLPreserveFormatting(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return sanitizeUserInput(input, {
    allowBasicFormatting: true,  // Allow safe HTML tags (b, i, strong, em)
    allowNewlines: true,         // Preserve line breaks
    maxLength: 50000            // Larger limit for formatted content
  });
}

/**
 * Fast HTML escaping for trusted contexts
 * 
 * @param input - Text to escape
 * @returns HTML-escaped text
 */
export function escapeHTMLContent(input: string): string {
  return escapeHtml(input);
}

/**
 * Sanitize user input for general display
 * 
 * @param input - User input to sanitize
 * @param allowFormatting - Whether to allow basic HTML formatting
 * @returns Sanitized input safe for display
 */
export function sanitizeUserContent(
  input: string, 
  allowFormatting: boolean = false
): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return sanitizeUserInput(input, {
    allowBasicFormatting: allowFormatting,
    allowNewlines: true,
    maxLength: 5000
  });
}

/**
 * Sanitize URL for safe use in links and redirects
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeURLForDisplay(url: string): string {
  return sanitizeUrl(url);
}

/**
 * Sanitize email address for display and storage
 * 
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmailAddress(email: string): string {
  return sanitizeEmail(email);
}

/**
 * Check if content needs sanitization
 * 
 * @param content - Content to check
 * @returns boolean indicating if sanitization is needed
 */
export function requiresSanitization(content: string): boolean {
  return needsSanitization(content);
}

/**
 * Sanitize content for search queries
 * 
 * @param query - Search query to sanitize
 * @returns Sanitized search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  return sanitizeUserInput(query, {
    allowBasicFormatting: false,
    allowNewlines: false,
    maxLength: 200  // Reasonable limit for search queries
  });
}

/**
 * Sanitize content for API parameters
 * 
 * @param param - Parameter value to sanitize
 * @returns Sanitized parameter value
 */
export function sanitizeAPIParameter(param: string): string {
  if (typeof param !== 'string') {
    return '';
  }
  
  return sanitizeUserInput(param, {
    allowBasicFormatting: false,
    allowNewlines: false,
    maxLength: 500  // API parameter limit
  });
}

/**
 * Batch sanitize an object's string properties
 * 
 * @param data - Object with string properties to sanitize
 * @param allowFormatting - Whether to allow HTML formatting
 * @returns Object with sanitized string values
 */
export function sanitizeObjectProperties<T extends Record<string, any>>(
  data: T,
  allowFormatting: boolean = false
): T {
  const sanitized = { ...data };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeUserContent(value, allowFormatting) as T[keyof T];
    }
  }
  
  return sanitized;
}

// Re-export key functions from sanitization.ts for convenience
export {
  sanitizeUserInput,
  escapeHtml,
  sanitizeUrl,
  sanitizeEmail,
  sanitizeFileName,
  needsSanitization
} from '../sanitization';