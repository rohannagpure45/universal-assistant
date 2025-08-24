import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from './rateLimit';
import { SecurityMonitor } from './monitoring';
import { verifyIdToken } from '@/lib/firebase/admin';
import { z } from 'zod';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
    email_verified?: boolean;
    admin?: boolean;
  };
  decodedToken?: any;
}

interface SecurityOptions {
  requireAuth?: boolean;
  rateLimitRpm?: number;
  allowedMethods?: string[];
  validateInput?: z.ZodSchema;
  requireAdmin?: boolean;
  skipCSRF?: boolean;
}

const defaultOptions: SecurityOptions = {
  requireAuth: true,
  rateLimitRpm: 60,
  allowedMethods: ['GET', 'POST'],
  requireAdmin: false,
  skipCSRF: false,
};

export function withSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: SecurityOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    let decodedToken: any = null;

    try {
      // 1. Method validation
      if (!config.allowedMethods!.includes(request.method)) {
        await SecurityMonitor.logSecurityEvent({
          type: 'method_not_allowed',
          severity: 'low',
          clientIP,
          userAgent,
          details: { method: request.method, allowed: config.allowedMethods }
        });
        
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405 }
        );
      }

      // 2. Rate limiting
      const rateLimitResult = await RateLimiter.checkLimit(
        clientIP,
        config.rateLimitRpm!
      );

      if (!rateLimitResult.allowed) {
        await SecurityMonitor.logSecurityEvent({
          type: 'rate_limit_exceeded',
          severity: 'medium',
          clientIP,
          userAgent,
          details: { limit: config.rateLimitRpm, current: rateLimitResult.current }
        });

        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: rateLimitResult.resetTime 
          },
          { 
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.resetTime?.toString() || '60',
              'X-RateLimit-Limit': config.rateLimitRpm!.toString(),
              'X-RateLimit-Remaining': Math.max(0, config.rateLimitRpm! - rateLimitResult.current).toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0'
            }
          }
        );
      }

      // 3. Authentication
      if (config.requireAuth) {
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          await SecurityMonitor.logSecurityEvent({
            type: 'missing_auth_header',
            severity: 'medium',
            clientIP,
            userAgent,
            details: { hasAuth: !!authHeader, headerFormat: authHeader?.substring(0, 20) }
          });

          return NextResponse.json(
            { error: 'Missing or invalid authorization header' },
            { status: 401 }
          );
        }

        const idToken = authHeader.split('Bearer ')[1];
        
        try {
          decodedToken = await verifyIdToken(idToken);
          
          // Admin check
          if (config.requireAdmin && !decodedToken.admin) {
            await SecurityMonitor.logSecurityEvent({
              type: 'admin_access_denied',
              severity: 'high',
              clientIP,
              userAgent,
              userId: decodedToken.uid,
              details: { requiredRole: 'admin', userRole: 'user' }
            });

            return NextResponse.json(
              { error: 'Admin access required' },
              { status: 403 }
            );
          }

        } catch (error) {
          await SecurityMonitor.logSecurityEvent({
            type: 'invalid_token',
            severity: 'high',
            clientIP,
            userAgent,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          });

          return NextResponse.json(
            { error: 'Invalid authentication token' },
            { status: 401 }
          );
        }
      }

      // 4. CSRF Protection
      if (!config.skipCSRF && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');
        const allowedOrigins = [
          process.env.NEXT_PUBLIC_APP_URL,
          'http://localhost:3000',
          'https://localhost:3000'
        ].filter(Boolean);

        if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed!))) {
          await SecurityMonitor.logSecurityEvent({
            type: 'csrf_violation',
            severity: 'high',
            clientIP,
            userAgent,
            userId: decodedToken?.uid,
            details: { origin, referer, allowedOrigins }
          });

          return NextResponse.json(
            { error: 'CSRF protection violation' },
            { status: 403 }
          );
        }
      }

      // 5. Input validation
      if (config.validateInput && request.method !== 'GET') {
        try {
          const body = await request.json();
          config.validateInput.parse(body);
        } catch (error) {
          await SecurityMonitor.logSecurityEvent({
            type: 'input_validation_failed',
            severity: 'medium',
            clientIP,
            userAgent,
            userId: decodedToken?.uid,
            details: { 
              error: error instanceof Error ? error.message : 'Validation failed',
              method: request.method 
            }
          });

          return NextResponse.json(
            { error: 'Invalid input data' },
            { status: 400 }
          );
        }
      }

      // 6. Security headers setup
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
      };

      // 7. Execute handler
      const response = await handler(request, {
        ...context,
        user: decodedToken,
        clientIP,
        securityContext: {
          rateLimitRemaining: config.rateLimitRpm! - rateLimitResult.current,
          isAuthenticated: !!decodedToken,
          isAdmin: decodedToken?.admin || false
        }
      });

      // 8. Add security headers to response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // 9. Log successful request
      const processingTime = Date.now() - startTime;
      await SecurityMonitor.logApiRequest({
        method: request.method,
        path: request.nextUrl.pathname,
        clientIP,
        userAgent,
        userId: decodedToken?.uid,
        statusCode: response.status,
        processingTime,
        rateLimitUsed: rateLimitResult.current
      });

      return response;

    } catch (error) {
      // Log unexpected errors
      await SecurityMonitor.logSecurityEvent({
        type: 'middleware_error',
        severity: 'high',
        clientIP,
        userAgent,
        userId: decodedToken?.uid,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

// Utility Functions
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

// Input validation schemas
export const ValidationSchemas = {
  aiRequest: z.object({
    message: z.string().min(1).max(5000),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4000).optional()
  }),

  ttsRequest: z.object({
    text: z.string().min(1).max(5000),
    voiceId: z.string().min(1),
    speed: z.number().min(0.25).max(4).optional(),
    volume: z.number().min(0).max(1).optional()
  }),

  meetingCreate: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    meetingTypeId: z.string().min(1),
    participantIds: z.array(z.string()).max(50).optional()
  }),

  voiceIdentification: z.object({
    audioData: z.string().min(1),
    voiceId: z.string().min(1),
    confidence: z.number().min(0).max(1),
    metadata: z.object({
      duration: z.number().min(0.1).max(300),
      sampleRate: z.number().min(8000).max(48000),
      format: z.enum(['webm', 'wav', 'mp3'])
    })
  })
};

// Example usage in API routes:
/*
import { withSecurity, ValidationSchemas } from '@/lib/security/middleware';

export const POST = withSecurity(
  async (request, context) => {
    // Your handler logic here
    const { user, clientIP, securityContext } = context;
    
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    rateLimitRpm: 30,
    allowedMethods: ['POST'],
    validateInput: ValidationSchemas.aiRequest,
    requireAdmin: false
  }
);
*/

// Input validation utilities
export const inputValidation = {
  schemas: ValidationSchemas,
  sanitizeText: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '');
  },
  validateRequest: (schema: z.ZodSchema) => (req: NextRequest) => {
    // Implementation for request validation
    return schema.safeParse(req);
  }
};