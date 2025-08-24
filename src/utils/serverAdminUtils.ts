/**
 * Server-side Admin Utilities
 * 
 * SECURITY-CRITICAL: Server-only utilities for admin validation using Firebase Admin SDK.
 * This file should only be imported in server-side contexts (API routes, server components).
 * 
 * OWASP Reference: Authentication and Session Management (A02:2021)
 */

import { adminAuth, setCustomUserClaims } from '@/lib/firebase/admin';
import { SecurityLogger } from '@/lib/security/monitoring';
import { AdminUser, SecurityContext, AdminLevel } from '@/types/admin';

export interface AdminValidationResult {
  isValid: boolean;
  user: AdminUser | null;
  error?: string;
  securityContext?: SecurityContext;
}

// Secure admin email configuration (server-side only)
const ADMIN_EMAILS = new Set([
  'ribt2218@gmail.com',
  'rohan@linkstudio.ai'
]);

/**
 * SECURITY-CRITICAL: Validate admin access using Firebase Custom Claims
 * Uses defense-in-depth approach with multiple validation layers
 */
export async function validateAdminAccess(
  idToken: string,
  clientIP?: string,
  userAgent?: string
): Promise<AdminValidationResult> {
  const timestamp = new Date().toISOString();
  const securityContext = { clientIP, userAgent, timestamp };
  
  try {
    const auth = adminAuth();
    if (!auth) {
      await SecurityLogger.error(
        clientIP || 'unknown',
        null,
        new Error('Firebase Admin not initialized'),
        { endpoint: 'validateAdminAccess', action: 'admin_auth_init_failed' }
      );
      return {
        isValid: false,
        user: null,
        error: 'Authentication service unavailable',
        securityContext
      };
    }

    // Step 1: Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken, true); // checkRevoked = true
    
    if (!decodedToken.email || !decodedToken.uid) {
      await SecurityLogger.suspiciousActivity(
        clientIP || 'unknown',
        decodedToken.uid,
        {
          action: 'incomplete_token_data',
          hasEmail: !!decodedToken.email,
          hasUid: !!decodedToken.uid
        }
      );
      return {
        isValid: false,
        user: null,
        error: 'Invalid token data',
        securityContext
      };
    }

    // Step 2: Check Firebase Custom Claims (primary authorization)
    const customClaims = decodedToken.customClaims || {};
    const hasAdminClaim = customClaims.admin === true;
    const adminLevel = customClaims.adminLevel as 'super' | 'standard' | undefined;
    
    // Step 3: Fallback email-based check (secondary authorization)
    const isAdminEmail = ADMIN_EMAILS.has(decodedToken.email.toLowerCase());
    
    // Step 4: Defense-in-depth validation
    const isValidAdmin = hasAdminClaim || isAdminEmail;
    
    if (!isValidAdmin) {
      // Log unauthorized admin access attempt
      await SecurityLogger.suspiciousActivity(
        clientIP || 'unknown',
        decodedToken.uid,
        {
          action: 'unauthorized_admin_access',
          email: decodedToken.email,
          hasCustomClaim: hasAdminClaim,
          isKnownEmail: isAdminEmail,
          userAgent
        }
      );
      
      return {
        isValid: false,
        user: null,
        error: 'Admin access required',
        securityContext
      };
    }

    // Step 5: If email-based admin detected but no custom claim, set it
    if (isAdminEmail && !hasAdminClaim) {
      try {
        await setCustomUserClaims(decodedToken.uid, {
          admin: true,
          adminLevel: 'super', // First-time admins get super level
          adminSince: timestamp
        });
        
        await SecurityLogger.adminAction(
          clientIP || 'unknown',
          decodedToken.uid,
          {
            action: 'admin_claim_granted',
            email: decodedToken.email,
            level: 'super'
          }
        );
      } catch (claimError) {
        console.error('Failed to set admin claims:', claimError);
        // Continue anyway - email validation still valid
      }
    }

    // Step 6: Log successful admin access
    await SecurityLogger.adminAction(
      clientIP || 'unknown',
      decodedToken.uid,
      {
        action: 'admin_access_granted',
        email: decodedToken.email,
        level: adminLevel || 'standard',
        authMethod: hasAdminClaim ? 'custom_claims' : 'email_fallback'
      }
    );

    // Create properly typed AdminUser
    const adminUser: AdminUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.email.split('@')[0],
      photoURL: decodedToken.picture || null,
      isAdmin: true as const,
      adminLevel: adminLevel || 'standard',
      adminSince: customClaims.adminSince || timestamp,
      lastAdminLogin: timestamp,
      preferences: {
        defaultModel: 'claude-3-5-sonnet' as const,
        ttsVoice: 'default',
        ttsSpeed: 1.0,
        autoTranscribe: true,
        saveTranscripts: true,
        theme: 'system' as const,
        language: 'en',
        notifications: {
          emailNotifications: true,
          pushNotifications: false,
          desktopNotifications: true
        },
        privacy: {
          dataRetention: 30,
          allowAnalytics: false,
          shareImprovement: false
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          keyboardNavigation: true
        }
      },
      createdAt: new Date(decodedToken.auth_time * 1000),
      lastActive: new Date(),
      emailVerified: decodedToken.email_verified || false,
      lastLoginAt: timestamp,
      customClaims: {
        admin: true,
        adminLevel: adminLevel || 'standard',
        adminSince: customClaims.adminSince,
        grantedBy: customClaims.grantedBy
      }
    };

    return {
      isValid: true,
      user: adminUser,
      securityContext
    };

  } catch (error) {
    // Log authentication errors
    await SecurityLogger.error(
      clientIP || 'unknown',
      null,
      error instanceof Error ? error : new Error('Unknown admin validation error'),
      {
        endpoint: 'validateAdminAccess',
        action: 'token_validation_failed',
        userAgent
      }
    );
    
    return {
      isValid: false,
      user: null,
      error: 'Authentication failed',
      securityContext
    };
  }
}

/**
 * SECURITY-CRITICAL: Grant admin privileges to a user
 * Should only be called by super admins
 */
export async function grantAdminAccess(
  targetUid: string,
  adminLevel: AdminLevel,
  grantedByUid: string,
  clientIP?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = adminAuth();
    if (!auth) {
      return { success: false, error: 'Authentication service unavailable' };
    }

    // Verify granting user is super admin
    const grantingUser = await auth.getUser(grantedByUid);
    const grantingClaims = grantingUser.customClaims || {};
    
    if (grantingClaims.adminLevel !== 'super') {
      await SecurityLogger.suspiciousActivity(
        clientIP || 'unknown',
        grantedByUid,
        {
          action: 'unauthorized_admin_grant_attempt',
          targetUid,
          requestedLevel: adminLevel
        }
      );
      return { success: false, error: 'Insufficient privileges' };
    }

    // Set admin claims for target user
    await setCustomUserClaims(targetUid, {
      admin: true,
      adminLevel,
      adminSince: new Date().toISOString(),
      grantedBy: grantedByUid
    });

    await SecurityLogger.adminAction(
      clientIP || 'unknown',
      grantedByUid,
      {
        action: 'admin_privileges_granted',
        targetUid,
        level: adminLevel
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to grant admin access:', error);
    return { success: false, error: 'Failed to grant admin access' };
  }
}

/**
 * SECURITY-CRITICAL: Revoke admin privileges from a user
 * Should only be called by super admins
 */
export async function revokeAdminAccess(
  targetUid: string,
  revokedByUid: string,
  clientIP?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = adminAuth();
    if (!auth) {
      return { success: false, error: 'Authentication service unavailable' };
    }

    // Verify revoking user is super admin
    const revokingUser = await auth.getUser(revokedByUid);
    const revokingClaims = revokingUser.customClaims || {};
    
    if (revokingClaims.adminLevel !== 'super') {
      await SecurityLogger.suspiciousActivity(
        clientIP || 'unknown',
        revokedByUid,
        {
          action: 'unauthorized_admin_revoke_attempt',
          targetUid
        }
      );
      return { success: false, error: 'Insufficient privileges' };
    }

    // Remove admin claims
    const targetUser = await auth.getUser(targetUid);
    const currentClaims = { ...(targetUser.customClaims || {}) };
    delete currentClaims.admin;
    delete currentClaims.adminLevel;
    delete currentClaims.adminSince;
    delete currentClaims.grantedBy;
    
    await setCustomUserClaims(targetUid, {
      ...currentClaims,
      adminRevokedAt: new Date().toISOString(),
      revokedBy: revokedByUid
    });

    await SecurityLogger.adminAction(
      clientIP || 'unknown',
      revokedByUid,
      {
        action: 'admin_privileges_revoked',
        targetUid
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to revoke admin access:', error);
    return { success: false, error: 'Failed to revoke admin access' };
  }
}

/**
 * SECURITY-CRITICAL: Get admin user details by UID
 * Only for use by super admins for user management
 */
export async function getAdminUserDetails(
  targetUid: string,
  requestingAdminUid: string,
  clientIP?: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  try {
    const auth = adminAuth();
    if (!auth) {
      return { success: false, error: 'Authentication service unavailable' };
    }

    // Verify requesting user is admin
    const requestingUser = await auth.getUser(requestingAdminUid);
    const requestingClaims = requestingUser.customClaims || {};
    
    if (!requestingClaims.admin) {
      return { success: false, error: 'Admin access required' };
    }

    const targetUser = await auth.getUser(targetUid);
    const targetClaims = targetUser.customClaims || {};
    
    if (!targetClaims.admin) {
      return { success: false, error: 'Target user is not an admin' };
    }

    const adminUser: AdminUser = {
      uid: targetUser.uid,
      email: targetUser.email!,
      displayName: targetUser.displayName || targetUser.email!.split('@')[0],
      photoURL: targetUser.photoURL || null,
      isAdmin: true as const,
      adminLevel: (targetClaims.adminLevel as AdminLevel) || 'standard',
      adminSince: targetClaims.adminSince,
      lastAdminLogin: targetUser.metadata.lastSignInTime || undefined,
      preferences: {
        // Default preferences - in a real app, these would be fetched from user profile
        defaultModel: 'claude-3-5-sonnet' as const,
        ttsVoice: 'default',
        ttsSpeed: 1.0,
        autoTranscribe: true,
        saveTranscripts: true,
        theme: 'system' as const,
        language: 'en',
        notifications: {
          emailNotifications: true,
          pushNotifications: false,
          desktopNotifications: true
        },
        privacy: {
          dataRetention: 30,
          allowAnalytics: false,
          shareImprovement: false
        },
        accessibility: {
          highContrast: false,
          largeText: false,
          keyboardNavigation: true
        }
      },
      createdAt: new Date(targetUser.metadata.creationTime!),
      lastActive: new Date(targetUser.metadata.lastSignInTime!),
      emailVerified: targetUser.emailVerified,
      customClaims: {
        admin: true,
        adminLevel: (targetClaims.adminLevel as AdminLevel) || 'standard',
        adminSince: targetClaims.adminSince,
        grantedBy: targetClaims.grantedBy
      }
    };

    return { success: true, user: adminUser };
  } catch (error) {
    console.error('Failed to get admin user details:', error);
    return { success: false, error: 'Failed to retrieve admin user details' };
  }
}