/**
 * SECURITY-CRITICAL: Admin Validation API Route
 * 
 * Provides secure server-side admin validation for API requests.
 * Protected by enhanced admin middleware with comprehensive security logging.
 * 
 * OWASP Reference: Authentication and Session Management (A02:2021)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminApiHandler, AdminApiContext } from '@/middleware/adminApiMiddleware';
import { SecurityLogger } from '@/lib/security/monitoring';

/**
 * SECURITY-CRITICAL: POST handler for admin validation
 * Protected by admin middleware with enhanced security features
 */
async function handleAdminValidation(
  request: NextRequest,
  context: AdminApiContext
) {
  try {
    const { user, clientIP, userAgent, securityContext } = context;

    // Log successful admin validation
    await SecurityLogger.adminAction(
      clientIP,
      user.uid,
      {
        action: 'admin_validation_success',
        adminLevel: user.adminLevel,
        requestId: securityContext.requestId,
        userAgent
      }
    );

    // Return secure admin validation response
    return NextResponse.json({
      isValid: true,
      isAdmin: true,
      user: {
        uid: user.uid,
        email: user.email,
        isAdmin: user.isAdmin,
        adminLevel: user.adminLevel,
        lastLoginAt: user.lastLoginAt
      },
      securityContext: {
        validatedAt: securityContext.validatedAt,
        requestId: securityContext.requestId,
        adminLevel: user.adminLevel
      }
    });

  } catch (error) {
    const { clientIP, userAgent } = context;
    
    await SecurityLogger.error(
      clientIP,
      context.user?.uid,
      error instanceof Error ? error : new Error('Unknown validation error'),
      {
        endpoint: '/api/admin/validate',
        action: 'admin_validation_failed',
        userAgent
      }
    );
    
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    );
  }
}

// Apply admin protection middleware
export const POST = createAdminApiHandler(handleAdminValidation);

// Secure method restrictions
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST for admin validation.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}