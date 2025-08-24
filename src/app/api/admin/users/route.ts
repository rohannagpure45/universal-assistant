/**
 * SECURITY-CRITICAL: Admin User Management API Route
 * 
 * Provides secure admin operations for user management.
 * Protected by enhanced admin middleware with comprehensive security logging.
 * 
 * OWASP Reference: Broken Access Control (A01:2021)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminApiHandler, AdminApiContext } from '@/middleware/adminApiMiddleware';
import { SecurityLogger } from '@/lib/security/monitoring';
import { grantAdminAccess, revokeAdminAccess } from '@/utils/serverAdminUtils';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';

// Validation schemas
const GrantAdminSchema = z.object({
  targetUserId: z.string().min(1, 'User ID is required'),
  adminLevel: z.enum(['super', 'standard']),
  reason: z.string().min(1, 'Reason is required for audit trail')
});

const RevokeAdminSchema = z.object({
  targetUserId: z.string().min(1, 'User ID is required'),
  reason: z.string().min(1, 'Reason is required for audit trail')
});

/**
 * GET /api/admin/users - List all users (admin only)
 */
async function handleGetUsers(
  request: NextRequest,
  context: AdminApiContext
) {
  try {
    const { user, clientIP, userAgent } = context;
    
    // Only super admins can list all users
    if (user.adminLevel !== 'super') {
      await SecurityLogger.unauthorizedAccess(
        clientIP,
        user.uid,
        '/api/admin/users',
        {
          action: 'insufficient_privileges',
          requiredLevel: 'super',
          userLevel: user.adminLevel,
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const auth = adminAuth();
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      );
    }

    // Get all users (limited to 1000 for performance)
    const listUsersResult = await auth.listUsers(1000);
    
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      customClaims: userRecord.customClaims || {},
      creationTime: userRecord.metadata.creationTime,
      lastSignInTime: userRecord.metadata.lastSignInTime,
      isAdmin: userRecord.customClaims?.admin === true,
      adminLevel: userRecord.customClaims?.adminLevel
    }));

    await SecurityLogger.adminAction(
      clientIP,
      user.uid,
      {
        action: 'users_list_accessed',
        userCount: users.length,
        userAgent
      }
    );

    return NextResponse.json({
      success: true,
      users,
      totalUsers: users.length,
      pageToken: listUsersResult.pageToken
    });

  } catch (error) {
    const { clientIP, userAgent } = context;
    
    await SecurityLogger.error(
      clientIP,
      context.user?.uid,
      error instanceof Error ? error : new Error('Unknown error in user listing'),
      {
        endpoint: '/api/admin/users',
        action: 'users_list_failed',
        userAgent
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to retrieve users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users - Grant admin access
 */
async function handleGrantAdmin(
  request: NextRequest,
  context: AdminApiContext
) {
  try {
    const { user, clientIP, userAgent } = context;
    
    // Only super admins can grant admin access
    if (user.adminLevel !== 'super') {
      await SecurityLogger.unauthorizedAccess(
        clientIP,
        user.uid,
        '/api/admin/users',
        {
          action: 'unauthorized_admin_grant',
          userLevel: user.adminLevel,
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Super admin access required to grant admin privileges' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = GrantAdminSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { targetUserId, adminLevel, reason } = validation.data;

    // Grant admin access
    const result = await grantAdminAccess(
      targetUserId,
      adminLevel,
      user.uid,
      clientIP
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to grant admin access' },
        { status: 500 }
      );
    }

    await SecurityLogger.adminAction(
      clientIP,
      user.uid,
      {
        action: 'admin_privileges_granted',
        targetUserId,
        adminLevel,
        reason,
        userAgent
      }
    );

    return NextResponse.json({
      success: true,
      message: `Admin privileges (${adminLevel}) granted to user ${targetUserId}`,
      targetUserId,
      adminLevel
    });

  } catch (error) {
    const { clientIP, userAgent } = context;
    
    await SecurityLogger.error(
      clientIP,
      context.user?.uid,
      error instanceof Error ? error : new Error('Unknown error in admin grant'),
      {
        endpoint: '/api/admin/users',
        action: 'admin_grant_failed',
        userAgent
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to grant admin access' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users - Revoke admin access
 */
async function handleRevokeAdmin(
  request: NextRequest,
  context: AdminApiContext
) {
  try {
    const { user, clientIP, userAgent } = context;
    
    // Only super admins can revoke admin access
    if (user.adminLevel !== 'super') {
      await SecurityLogger.unauthorizedAccess(
        clientIP,
        user.uid,
        '/api/admin/users',
        {
          action: 'unauthorized_admin_revoke',
          userLevel: user.adminLevel,
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Super admin access required to revoke admin privileges' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = RevokeAdminSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { targetUserId, reason } = validation.data;

    // Prevent self-revocation
    if (targetUserId === user.uid) {
      await SecurityLogger.suspiciousActivity(
        clientIP,
        user.uid,
        {
          action: 'admin_self_revocation_attempt',
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Cannot revoke your own admin privileges' },
        { status: 400 }
      );
    }

    // Revoke admin access
    const result = await revokeAdminAccess(
      targetUserId,
      user.uid,
      clientIP
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to revoke admin access' },
        { status: 500 }
      );
    }

    await SecurityLogger.adminAction(
      clientIP,
      user.uid,
      {
        action: 'admin_privileges_revoked',
        targetUserId,
        reason,
        userAgent
      }
    );

    return NextResponse.json({
      success: true,
      message: `Admin privileges revoked from user ${targetUserId}`,
      targetUserId
    });

  } catch (error) {
    const { clientIP, userAgent } = context;
    
    await SecurityLogger.error(
      clientIP,
      context.user?.uid,
      error instanceof Error ? error : new Error('Unknown error in admin revoke'),
      {
        endpoint: '/api/admin/users',
        action: 'admin_revoke_failed',
        userAgent
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to revoke admin access' },
      { status: 500 }
    );
  }
}

// Apply admin protection middleware with method routing
export const GET = createAdminApiHandler(handleGetUsers);
export const POST = createAdminApiHandler(handleGrantAdmin);
export const DELETE = createAdminApiHandler(handleRevokeAdmin);

// Unsupported methods
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}