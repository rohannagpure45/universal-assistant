/**
 * Enhanced XSS Prevention with DOMPurify and complete security measures
 * Provides comprehensive protection against XSS attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Rate limiting for sanitization functions
 */
class RateLimiter {
  private readonly requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }
    
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Create rate limiter instance
const rateLimiter = new RateLimiter(100, 1000); // 100 requests per second

/**
 * Configure DOMPurify with strict settings
 */
const configureDOMPurify = () => {
  // Remove all dangerous elements
  DOMPurify.setConfig({
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
    ALLOWED_ATTR: [], // No attributes allowed by default
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    FORCE_BODY: true,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    IN_PLACE: false
  });
};

// Initialize configuration
configureDOMPurify();

/**
 * Enhanced HTML sanitization with DOMPurify
 */
export function sanitizeHTML(
  html: string,
  options: {
    allowedTags?: string[];
    allowedAttributes?: string[];
    allowLinks?: boolean;
    rateLimitKey?: string;
  } = {}
): string {
  // Rate limiting check
  const limitKey = options.rateLimitKey || 'global';
  if (!rateLimiter.isAllowed(limitKey)) {
    console.warn('Rate limit exceeded for sanitization');
    return '';
  }

  if (typeof html !== 'string') {
    return '';
  }

  // Configure DOMPurify for this specific sanitization
  const config: any = {
    ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'u', 'br'],
    ALLOWED_ATTR: options.allowedAttributes || [],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  };

  // If links are allowed, add safe link handling
  if (options.allowLinks) {
    config.ALLOWED_TAGS.push('a');
    config.ALLOWED_ATTR.push('href', 'target', 'rel');
    config.ADD_ATTR = ['target', 'rel'];
    
    // Add hook to ensure links are safe
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
        
        const href = node.getAttribute('href');
        if (href && !isValidUrl(href)) {
          node.removeAttribute('href');
        }
      }
    });
  }

  const clean = DOMPurify.sanitize(html, config);
  
  // Remove the hook after use
  if (options.allowLinks) {
    DOMPurify.removeHook('afterSanitizeAttributes');
  }

  // Convert to string if it's TrustedHTML
  return typeof clean === 'string' ? clean : clean.toString();
}

/**
 * Secure URL validation with comprehensive checks
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }

  // Check URL length (prevent DoS)
  if (url.length > 2048) {
    return false;
  }

  try {
    // Parse URL with base to handle relative URLs
    const base = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://example.com';
    
    const parsed = new URL(url, base);
    
    // Allowed protocols only
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /file:/i,
      /about:/i,
      /chrome:/i,
      /ws:/i,
      /wss:/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(url)) {
        return false;
      }
    }

    // Check for IP addresses (optional - uncomment if needed)
    // const ipPattern = /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
    // if (ipPattern.test(url)) {
    //   return false;
    // }

    // Check for localhost/internal URLs (optional - uncomment if needed)
    // const internalPatterns = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)/i;
    // if (internalPatterns.test(url)) {
    //   return false;
    // }

    return true;
  } catch {
    // If URL parsing fails, check if it's a valid relative URL
    if (url.startsWith('/') && !url.startsWith('//')) {
      // Valid relative path
      return !/[<>"'`]/.test(url); // No HTML/JS chars
    }
    
    if (url.startsWith('#')) {
      // Hash fragment - validate it doesn't contain JS
      return !/[<>"'`();]/.test(url);
    }

    return false;
  }
}

/**
 * Sanitize URL with validation
 */
export function sanitizeUrl(
  url: string,
  options: {
    allowRelative?: boolean;
    allowHash?: boolean;
    allowMailto?: boolean;
    allowTel?: boolean;
    rateLimitKey?: string;
  } = {}
): string {
  // Rate limiting check
  const limitKey = options.rateLimitKey || 'url';
  if (!rateLimiter.isAllowed(limitKey)) {
    console.warn('Rate limit exceeded for URL sanitization');
    return '';
  }

  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  
  // Validate URL
  if (!isValidUrl(trimmed)) {
    return '';
  }

  try {
    const base = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://example.com';
    
    const parsed = new URL(trimmed, base);
    
    // Check specific protocol permissions
    if (parsed.protocol === 'mailto:' && !options.allowMailto) {
      return '';
    }
    
    if (parsed.protocol === 'tel:' && !options.allowTel) {
      return '';
    }
    
    // For relative URLs
    if (parsed.origin === base && !options.allowRelative) {
      return '';
    }
    
    // For hash URLs
    if (trimmed.startsWith('#') && !options.allowHash) {
      return '';
    }

    // Additional sanitization for the URL components
    const sanitized = new URL(parsed);
    
    // Sanitize search params (remove potentially dangerous params)
    const dangerousParams = ['javascript', 'vbscript', 'data', 'onclick', 'onerror'];
    for (const param of dangerousParams) {
      sanitized.searchParams.delete(param);
    }

    return sanitized.href;
  } catch {
    // Handle relative URLs
    if (trimmed.startsWith('/') && options.allowRelative) {
      // Remove any dangerous characters
      return trimmed.replace(/[<>"'`]/g, '');
    }
    
    if (trimmed.startsWith('#') && options.allowHash) {
      // Sanitize hash
      return trimmed.replace(/[<>"'`();]/g, '');
    }

    return '';
  }
}

/**
 * Content Security Policy generator
 */
export function generateCSP(options: {
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  workerSrc?: string[];
  formAction?: string[];
  frameAncestors?: string[];
  reportUri?: string;
  upgradeInsecureRequests?: boolean;
} = {}): string {
  const directives: string[] = [];

  // Default restrictive CSP
  directives.push(`default-src 'self'`);
  
  // Script sources (no unsafe-inline by default)
  const scriptSources = ["'self'", ...(options.scriptSrc || [])];
  directives.push(`script-src ${scriptSources.join(' ')}`);
  
  // Style sources (allow unsafe-inline for compatibility, but prefer nonces)
  const styleSources = ["'self'", "'unsafe-inline'", ...(options.styleSrc || [])];
  directives.push(`style-src ${styleSources.join(' ')}`);
  
  // Image sources
  const imgSources = ["'self'", 'data:', 'blob:', ...(options.imgSrc || [])];
  directives.push(`img-src ${imgSources.join(' ')}`);
  
  // Connect sources (for API calls)
  const connectSources = ["'self'", ...(options.connectSrc || [])];
  directives.push(`connect-src ${connectSources.join(' ')}`);
  
  // Font sources
  const fontSources = ["'self'", 'data:', ...(options.fontSrc || [])];
  directives.push(`font-src ${fontSources.join(' ')}`);
  
  // Media sources
  const mediaSources = ["'self'", 'blob:', ...(options.mediaSrc || [])];
  directives.push(`media-src ${mediaSources.join(' ')}`);
  
  // Object sources (plugins, embeds) - typically none
  const objectSources = options.objectSrc || ["'none'"];
  directives.push(`object-src ${objectSources.join(' ')}`);
  
  // Frame sources
  if (options.frameSrc) {
    directives.push(`frame-src ${options.frameSrc.join(' ')}`);
  } else {
    directives.push(`frame-src 'none'`);
  }
  
  // Worker sources
  const workerSources = ["'self'", 'blob:', ...(options.workerSrc || [])];
  directives.push(`worker-src ${workerSources.join(' ')}`);
  
  // Form actions
  const formActions = ["'self'", ...(options.formAction || [])];
  directives.push(`form-action ${formActions.join(' ')}`);
  
  // Frame ancestors (clickjacking protection)
  const frameAncestors = options.frameAncestors || ["'none'"];
  directives.push(`frame-ancestors ${frameAncestors.join(' ')}`);
  
  // Base URI restriction
  directives.push(`base-uri 'self'`);
  
  // Upgrade insecure requests
  if (options.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }
  
  // Report URI for CSP violations
  if (options.reportUri) {
    directives.push(`report-uri ${options.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Escape HTML entities (fast, for plain text display)
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
 * Sanitize user input with strict validation
 */
export function sanitizeUserInput(
  input: string,
  options: {
    allowNewlines?: boolean;
    maxLength?: number;
    allowBasicFormatting?: boolean;
    rateLimitKey?: string;
  } = {}
): string {
  // Never allow 'none' type to bypass sanitization
  if (input === undefined || input === null) {
    return '';
  }

  // Rate limiting check
  const limitKey = options.rateLimitKey || 'input';
  if (!rateLimiter.isAllowed(limitKey)) {
    console.warn('Rate limit exceeded for input sanitization');
    return '';
  }

  let sanitized = String(input);

  // Apply max length first to prevent DoS
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  if (options.allowBasicFormatting) {
    // Use DOMPurify for HTML content
    sanitized = sanitizeHTML(sanitized, {
      allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br'],
      rateLimitKey: options.rateLimitKey
    });
  } else {
    // For plain text, escape HTML entities
    sanitized = escapeHtml(sanitized);
  }

  // Handle newlines
  if (!options.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  return sanitized.trim();
}

/**
 * Create nonce for inline scripts/styles
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return Array.from({ length: 16 }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

/**
 * Sanitize JSON to prevent injection
 */
export function sanitizeJSON(obj: unknown): string {
  try {
    // First stringify to ensure it's valid JSON
    const jsonString = JSON.stringify(obj);
    
    // Parse it back to validate
    const parsed = JSON.parse(jsonString);
    
    // Stringify again with no replacer or spacing to ensure clean output
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

/**
 * Check if content needs sanitization
 */
export function needsSanitization(content: string): boolean {
  if (typeof content !== 'string') {
    return false;
  }
  
  // Check for HTML-like content
  const htmlPattern = /<[^>]*>|&[^;]+;|javascript:|on\w+=/i;
  return htmlPattern.test(content);
}

/**
 * Batch sanitize multiple values efficiently
 */
export function batchSanitize<T extends Record<string, any>>(
  obj: T,
  fields: Array<keyof T>,
  sanitizer: (value: string) => string = escapeHtml
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      result[field] = sanitizer(result[field]) as T[keyof T];
    }
  }
  
  return result;
}

// Export rate limiter for external use
export { RateLimiter };

// Export configured DOMPurify instance
export { DOMPurify };