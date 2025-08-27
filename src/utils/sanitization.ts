/**
 * SIMPLE Sanitization utilities to prevent XSS attacks
 * Provides fast, lightweight methods for handling user input and displaying content
 * 
 * REVERTED FROM COMPLEX DOMPurify IMPLEMENTATION:
 * - Removed 836KB DOMPurify dependency that caused 57x performance regression
 * - Restored simple HTML escaping approach for speed and reliability
 * - Focused on essential security without over-engineering
 */

/**
 * Fast HTML escape function - replaces DOMPurify for performance
 * @param text - Raw text to escape
 * @returns Escaped text safe for HTML display
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return text.replace(/[&<>"'`=\/]/g, (s) => map[s]);
}

/**
 * Fast user input sanitization - simple and effective
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
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Apply length limit for performance and DoS prevention
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Basic HTML escaping (fast and secure)
  sanitized = escapeHtml(sanitized);

  // Handle newlines
  if (!options.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  return sanitized.trim();
}

/**
 * Simple URL validation that actually works - no more empty strings for valid URLs
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string' || !url.trim()) {
    return '';
  }

  const trimmed = url.trim();

  // Allow common safe URL patterns
  const safePatterns = [
    /^https?:\/\/.+/, // http/https URLs
    /^\/[^/].*/, // relative paths starting with /
    /^#.+/, // hash fragments
    /^mailto:.+@.+\..+/, // email links
    /^tel:\+?[\d\s\-()]+$/ // phone links
  ];

  // Check if URL matches any safe pattern
  const isSafe = safePatterns.some(pattern => pattern.test(trimmed));
  if (!isSafe) {
    return '';
  }

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:', 'about:'];
  const lowerUrl = trimmed.toLowerCase();
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    return '';
  }

  // Basic character filtering
  if (/[<>"'`]/.test(trimmed)) {
    return '';
  }

  return trimmed;
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

/**
 * Simple URL validation
 * @param url - URL to validate
 * @returns true if URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  return sanitizeUrl(url) !== '';
}

/**
 * Check if content needs sanitization (simple check)
 * @param content - Content to check
 * @returns true if sanitization needed
 */
export function needsSanitization(content: string): boolean {
  if (typeof content !== 'string') return false;
  return /[<>"'&]/.test(content);
}

/**
 * Sanitize VoiceSample object to prevent XSS in voice-related content
 * @param sample - Voice sample to sanitize
 * @returns Sanitized voice sample with safe text fields
 */
export function sanitizeVoiceSample<T extends { transcript?: string; notes?: string; tags?: string[] }>(
  sample: T
): T {
  const result = { ...sample };

  // Sanitize transcript text if present
  if (result.transcript) {
    result.transcript = sanitizeTranscript(result.transcript);
  }

  // Sanitize notes if present
  if (result.notes) {
    result.notes = sanitizeUserInput(result.notes, {
      allowNewlines: true,
      maxLength: 1000,
      allowBasicFormatting: false
    });
  }

  // Sanitize tags array if present
  if (result.tags && Array.isArray(result.tags)) {
    result.tags = result.tags.map(tag => 
      sanitizeUserInput(tag, {
        allowNewlines: false,
        maxLength: 50,
        allowBasicFormatting: false
      })
    ).filter(tag => tag.trim().length > 0); // Remove empty tags
  }

  return result;
}

// Re-export escapeHtml as default for convenience
export default escapeHtml;