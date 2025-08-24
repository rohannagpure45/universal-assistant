/**
 * SECURITY-CRITICAL: Admin API Middleware
 * 
 * Server-side middleware for protecting admin API routes with enhanced security.
 * Implements defense-in-depth approach with multiple validation layers.
 * 
 * OWASP Reference: Broken Access Control (A01:2021)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAccess } from '@/utils/serverAdminUtils';
import { SecurityLogger } from '@/lib/security/monitoring';
import { AdminApiContext, AdminMiddlewareResult } from '@/types/admin';

// Re-export AdminApiContext for convenience in admin routes
export type { AdminApiContext };

/**
 * Enhanced security headers for admin routes
 */
const ADMIN_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'",
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

/**
 * SECURITY-CRITICAL: Middleware function to protect admin API routes
 * Implements comprehensive security validation for admin endpoints
 */
export async function withAdminApiProtection(
  handler: (request: NextRequest, context: AdminApiContext) => Promise<NextResponse>,
  request: NextRequest,
  context: Partial<AdminApiContext> = {}
): Promise<NextResponse> {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const requestPath = request.nextUrl.pathname;
  const startTime = Date.now();

  try {
    // Step 1: Method validation
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) {
      await SecurityLogger.suspiciousActivity(
        clientIP,
        null,
        {
          action: 'invalid_method_admin_api',
          method: request.method,
          path: requestPath,
          userAgent
        }
      );
      
      return createSecureResponse(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    // Step 2: Authorization header validation
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await SecurityLogger.unauthorizedAccess(
        clientIP,
        null,
        requestPath,
        {
          action: 'missing_auth_header',
          hasAuthHeader: !!authHeader,
          headerFormat: authHeader?.substring(0, 20),
          userAgent
        }
      );
      
      return createSecureResponse(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Step 3: CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('origin');
      const referer = request.headers.get('referer');
      const allowedOrigins = [
        process.env.NEXT_PUBLIC_APP_URL,
        'http://localhost:3000',
        'https://localhost:3000'
      ].filter(Boolean);

      if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed!))) {
        await SecurityLogger.suspiciousActivity(
          clientIP,
          null,
          {
            action: 'csrf_violation_admin_api',
            origin,
            referer,
            allowedOrigins,
            path: requestPath,
            userAgent
          }
        );
        
        return createSecureResponse(
          { error: 'CSRF protection violation' },
          { status: 403 }
        );
      }
    }

    // Step 4: Enhanced admin access validation
    const validation = await validateAdminAccess(idToken, clientIP, userAgent);

    if (!validation.isValid) {
      await SecurityLogger.unauthorizedAccess(
        clientIP,
        null,
        requestPath,
        {
          action: 'admin_access_denied',
          error: validation.error,
          userAgent
        }
      );
      
      return createSecureResponse(
        { error: validation.error || 'Admin access required' },
        { status: 403 }
      );
    }

    // Step 5: Log successful admin API access
    await SecurityLogger.adminAction(
      clientIP,
      validation.user!.uid,
      {
        action: 'admin_api_access',
        path: requestPath,
        method: request.method,
        adminLevel: validation.user!.adminLevel,
        userAgent
      }
    );

    // Step 6: Enhanced request context
    const enhancedContext: AdminApiContext = {
      user: validation.user!,
      isAdmin: true as const,
      clientIP,
      userAgent,
      securityContext: {
        validatedAt: validation.securityContext?.timestamp,
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
        clientIP,
        userAgent
      },
      requestMetadata: {
        method: request.method,
        path: requestPath,
        headers: Object.fromEntries(request.headers.entries())
      }
    };

    // Step 7: Execute protected handler
    const response = await handler(request, enhancedContext);
    
    // Step 8: Add security headers and audit trail
    const secureResponse = addSecurityHeaders(response);
    
    // Log successful admin API operation
    const processingTime = Date.now() - startTime;
    await SecurityLogger.adminAction(
      clientIP,
      validation.user!.uid,
      {
        action: 'admin_api_completed',
        path: requestPath,
        method: request.method,
        statusCode: response.status,
        processingTime,
        userAgent
      }
    );

    return secureResponse;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    await SecurityLogger.error(
      clientIP,
      null,
      error instanceof Error ? error : new Error('Unknown admin API error'),
      {
        endpoint: requestPath,
        method: request.method,
        processingTime,
        userAgent
      }
    );
    
    return createSecureResponse(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * HOF for creating admin-protected API route handlers with enhanced security
 */
export function createAdminApiHandler(
  handler: (request: NextRequest, context: AdminApiContext) => Promise<NextResponse>
): (request: NextRequest, context?: Partial<AdminApiContext>) => Promise<NextResponse> {
  return async function adminProtectedHandler(
    request: NextRequest,
    context: Partial<AdminApiContext> = {}
  ): Promise<NextResponse> {
    return withAdminApiProtection(handler, request, context);
  };
}

/**
 * Utility function to extract admin user from request context
 */
export function getAdminUserFromRequest(context: AdminApiContext) {
  return context.user;
}

/**
 * Type-safe utility to check if context is properly typed admin context
 */
export function isValidAdminContext(context: unknown): context is AdminApiContext {
  return (
    typeof context === 'object' &&
    context !== null &&
    'user' in context &&
    'isAdmin' in context &&
    'clientIP' in context &&
    'userAgent' in context &&
    'securityContext' in context &&
    (context as AdminApiContext).isAdmin === true
  );
}


// Utility functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const connectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (connectingIP) {
    return connectingIP;
  }
  
  return request.ip || 'unknown';
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createSecureResponse(
  data: unknown,
  options: { status: number }
): NextResponse {
  const response = NextResponse.json(data, options);
  return addSecurityHeaders(response);
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(ADMIN_SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}