/**
 * SECURITY-CRITICAL: SQL Injection Prevention Utilities
 * 
 * Provides protection against SQL injection attacks by sanitizing
 * inputs that will be used in database operations.
 * 
 * IMPORTANT: These are emergency fallbacks only. Always use parameterized 
 * queries and prepared statements as the primary defense against SQL injection.
 * 
 * This module uses the proven sanitization functions from sanitization.ts
 * with additional SQL-specific security measures.
 */

import { sanitizeSqlInput, sanitizeUserInput } from '../sanitization';

/**
 * Sanitize input for database operations
 * 
 * This function uses the battle-tested sanitizeSqlInput implementation
 * from sanitization.ts with additional validation layers.
 * 
 * WARNING: This should only be used as a last resort. Always prefer
 * parameterized queries and prepared statements.
 * 
 * @param input - Input to sanitize for database use
 * @returns Sanitized input safe for database operations
 */
export function sanitizeForDatabase(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Use the proven SQL sanitization function
  return sanitizeSqlInput(input);
}

/**
 * Enhanced database input sanitization with validation
 * 
 * @param input - Input to sanitize
 * @param options - Sanitization options
 * @returns Object with sanitized value and validation info
 */
export function validateAndSanitizeForDatabase(
  input: string,
  options: {
    maxLength?: number;
    allowWildcards?: boolean;
    context?: 'where' | 'select' | 'insert' | 'update' | 'general';
  } = {}
): {
  sanitizedValue: string;
  isValid: boolean;
  warnings: string[];
} {
  const { maxLength = 1000, allowWildcards = false, context = 'general' } = options;
  const warnings: string[] = [];
  
  if (typeof input !== 'string') {
    return {
      sanitizedValue: '',
      isValid: false,
      warnings: ['Input must be a string']
    };
  }
  
  // Check for suspicious patterns before sanitization
  const suspiciousPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /alter\s+table/i,
    /create\s+table/i,
    /exec\s*\(/i,
    /xp_cmdshell/i,
    /sp_executesql/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(input))) {
    warnings.push('Input contains potentially dangerous SQL patterns');
  }
  
  // Length validation (DoS protection)
  if (input.length > maxLength) {
    return {
      sanitizedValue: '',
      isValid: false,
      warnings: [`Input too long (maximum ${maxLength} characters)`]
    };
  }
  
  // Context-specific validation
  if (context === 'where' && /;\s*(drop|delete|insert|update|alter|create)/i.test(input)) {
    warnings.push('WHERE clause context: suspicious statement detected');
  }
  
  // Wildcard validation
  if (!allowWildcards && /%|_|\*/.test(input)) {
    warnings.push('Wildcards not allowed in this context');
  }
  
  // Sanitize using proven function
  const sanitizedValue = sanitizeForDatabase(input);
  
  return {
    sanitizedValue,
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * Sanitize table or column name for dynamic SQL (use with extreme caution)
 * 
 * WARNING: This should almost never be used. Database schemas should be
 * predefined and not based on user input.
 * 
 * @param identifier - Database identifier to sanitize
 * @returns Sanitized identifier or empty string if invalid
 */
export function sanitizeDatabaseIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || !identifier.trim()) {
    return '';
  }
  
  // Only allow alphanumeric characters, underscores, and dots
  const sanitized = identifier.replace(/[^a-zA-Z0-9_\.]/g, '');
  
  // Additional security checks
  if (sanitized.length === 0 || sanitized.length > 64) {
    return ''; // Empty or too long
  }
  
  // Must start with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    return '';
  }
  
  // Block SQL reserved words (partial list)
  const reservedWords = [
    'select', 'insert', 'update', 'delete', 'drop', 'create', 'alter',
    'table', 'database', 'index', 'view', 'procedure', 'function',
    'trigger', 'schema', 'grant', 'revoke', 'union', 'join'
  ];
  
  if (reservedWords.includes(sanitized.toLowerCase())) {
    return '';
  }
  
  return sanitized;
}

/**
 * Escape SQL LIKE pattern for safe searching
 * 
 * @param pattern - Search pattern to escape
 * @param escapeChar - Escape character to use (default: backslash)
 * @returns Escaped pattern safe for LIKE queries
 */
export function escapeLikePattern(pattern: string, escapeChar: string = '\\'): string {
  if (typeof pattern !== 'string') {
    return '';
  }
  
  // Escape the escape character first, then wildcards
  return pattern
    .replace(new RegExp(`\\${escapeChar}`, 'g'), `${escapeChar}${escapeChar}`)
    .replace(/%/g, `${escapeChar}%`)
    .replace(/_/g, `${escapeChar}_`);
}

/**
 * Sanitize ORDER BY clause (for dynamic sorting)
 * 
 * WARNING: Be very careful with dynamic ORDER BY clauses. 
 * Prefer whitelisting allowed column names.
 * 
 * @param orderBy - ORDER BY clause to sanitize
 * @param allowedColumns - Array of allowed column names
 * @returns Sanitized ORDER BY clause or empty string if invalid
 */
export function sanitizeOrderBy(orderBy: string, allowedColumns: string[] = []): string {
  if (typeof orderBy !== 'string' || !orderBy.trim()) {
    return '';
  }
  
  const trimmed = orderBy.trim();
  
  // Parse ORDER BY clause
  const orderRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s+(ASC|DESC)$/i;
  const match = trimmed.match(orderRegex);
  
  if (!match) {
    return ''; // Invalid format
  }
  
  const [, columnName, direction] = match;
  
  // Check against whitelist if provided
  if (allowedColumns.length > 0 && !allowedColumns.includes(columnName.toLowerCase())) {
    return '';
  }
  
  // Return sanitized ORDER BY
  return `${columnName} ${direction.toUpperCase()}`;
}

/**
 * Batch sanitize multiple database inputs
 * 
 * @param inputs - Object with input values to sanitize
 * @returns Object with sanitized values
 */
export function batchSanitizeForDatabase<T extends Record<string, any>>(
  inputs: T
): Record<keyof T, string> {
  const sanitized = {} as Record<keyof T, string>;
  
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeForDatabase(value);
    } else {
      sanitized[key as keyof T] = sanitizeForDatabase(String(value));
    }
  }
  
  return sanitized;
}

/**
 * Generate parameterized query placeholder
 * 
 * Helper function to encourage use of parameterized queries
 * instead of string concatenation.
 * 
 * @param paramCount - Number of parameters
 * @returns Comma-separated placeholder string
 */
export function generatePlaceholders(paramCount: number): string {
  if (paramCount <= 0 || paramCount > 1000) {
    return '';
  }
  
  return Array(paramCount).fill('?').join(', ');
}

// Re-export core SQL sanitization function
export { sanitizeSqlInput } from '../sanitization';