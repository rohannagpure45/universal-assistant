/**
 * Content Security Policy Middleware for Next.js
 * Provides XSS protection through CSP headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Temporarily simplified - will restore CSP features later
// import { generateCSP, generateNonce } from '@/utils/security/xss-prevention';

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
 * SIMPLIFIED - Basic security headers only until CSP is rebuilt
 */
export function applyCSPHeaders(request: NextRequest, response: NextResponse): NextResponse {
  // Basic CSP without DOMPurify dependencies - using Next.js defaults
  const basicCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://*.googleusercontent.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api.deepgram.com https://api.elevenlabs.io https://api.openai.com https://api.anthropic.com",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'"
  ].join('; ');
  
  // Set basic CSP
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', basicCSP);
  } else {
    response.headers.set('Content-Security-Policy-Report-Only', basicCSP);
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
 * SIMPLIFIED - Returns null until nonce system is rebuilt
 */
export function getNonce(headers: Headers): string | null {
  return null; // Simplified - no nonce system currently
}

/**
 * React hook to get CSP nonce
 * SIMPLIFIED - Returns null until nonce system is rebuilt
 */
export function useCSPNonce(): string | null {
  return null; // Simplified - no nonce system currently
}

export default cspMiddleware;