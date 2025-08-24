/**
 * Content Security Policy Middleware for Next.js
 * Provides XSS protection through CSP headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCSP, generateNonce } from '@/utils/security/xss-prevention';

/**
 * CSP configuration for the application
 */
const CSP_CONFIG = {
  scriptSrc: [
    "'strict-dynamic'", // Allow scripts with nonce
    'https://www.gstatic.com', // Firebase
    'https://www.googleapis.com', // Google APIs
    'https://apis.google.com',
    'https://cdn.jsdelivr.net' // CDN
  ],
  styleSrc: [
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net'
  ],
  imgSrc: [
    'https://*.googleusercontent.com', // Google profile images
    'https://lh3.googleusercontent.com',
    'https://firebasestorage.googleapis.com' // Firebase Storage
  ],
  connectSrc: [
    'https://identitytoolkit.googleapis.com', // Firebase Auth
    'https://firestore.googleapis.com', // Firestore
    'https://firebasestorage.googleapis.com', // Firebase Storage
    'https://api.deepgram.com', // Deepgram STT
    'https://api.elevenlabs.io', // ElevenLabs TTS
    'https://api.openai.com', // OpenAI
    'https://api.anthropic.com', // Anthropic
    'wss://api.deepgram.com' // Deepgram WebSocket
  ],
  fontSrc: [
    'https://fonts.gstatic.com'
  ],
  mediaSrc: [
    'https://firebasestorage.googleapis.com' // Audio files
  ],
  frameSrc: [
    'https://accounts.google.com' // Google Sign-In
  ],
  formAction: [
    'https://accounts.google.com'
  ],
  upgradeInsecureRequests: process.env.NODE_ENV === 'production',
  reportUri: process.env.CSP_REPORT_URI
};

/**
 * Apply CSP headers to response
 */
export function applyCSPHeaders(request: NextRequest, response: NextResponse): NextResponse {
  // Generate nonce for this request
  const nonce = generateNonce();
  
  // Store nonce in response headers for use in scripts
  response.headers.set('X-Nonce', nonce);
  
  // Add nonce to script-src
  const configWithNonce = {
    ...CSP_CONFIG,
    scriptSrc: [`'nonce-${nonce}'`, ...CSP_CONFIG.scriptSrc]
  };
  
  // Generate CSP header
  const cspHeader = generateCSP(configWithNonce);
  
  // Set CSP headers
  if (process.env.NODE_ENV === 'production') {
    // Use enforcing CSP in production
    response.headers.set('Content-Security-Policy', cspHeader);
  } else {
    // Use report-only in development to identify issues
    response.headers.set('Content-Security-Policy-Report-Only', cspHeader);
  }
  
  // Add additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(self), camera=()');
  
  // Strict Transport Security (HSTS) for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * CSP Middleware for Next.js
 */
export function cspMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  
  // Skip CSP for API routes and static files
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/i)
  ) {
    return response;
  }
  
  return applyCSPHeaders(request, response);
}

/**
 * Get nonce from headers (for use in components)
 */
export function getNonce(headers: Headers): string | null {
  return headers.get('X-Nonce');
}

/**
 * React hook to get CSP nonce
 */
export function useCSPNonce(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Get nonce from meta tag (set by layout)
  const metaTag = document.querySelector('meta[name="csp-nonce"]');
  return metaTag?.getAttribute('content') || null;
}

export default cspMiddleware;