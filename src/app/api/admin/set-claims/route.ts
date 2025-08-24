/**
 * SECURITY-CRITICAL: Admin Claims Setting API Route
 * 
 * Sets Firebase custom claims for admin users. This route ensures that
 * admin users have proper custom claims set for Firestore security rules.
 * 
 * OWASP Reference: Authentication and Session Management (A02:2021)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, setCustomUserClaims } from '@/lib/firebase/admin';
import { SecurityLogger } from '@/lib/security/monitoring';

/**
 * SECURITY-CRITICAL: POST handler for setting admin custom claims
 */
export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await SecurityLogger.suspiciousActivity(
        clientIP,
        null,
        {
          action: 'admin_claims_unauthorized_attempt',
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = adminAuth();
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Admin authentication service unavailable' },
        { status: 503 }
      );
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken, true);
    
    if (!decodedToken.email || !decodedToken.uid) {
      return NextResponse.json(
        { error: 'Invalid token data' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { uid, claims } = body;

    // Validate request
    if (!uid || !claims || typeof claims !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request: uid and claims are required' },
        { status: 400 }
      );
    }

    // Security check: Only allow setting claims for admin emails
    const adminEmails = ['ribt2218@gmail.com', 'rohan@linkstudio.ai'];
    const isRequestingUserAdmin = adminEmails.includes(decodedToken.email.toLowerCase());
    const isTargetUserAdmin = adminEmails.includes(decodedToken.email.toLowerCase());

    // Allow setting claims only if:
    // 1. The requesting user is an admin email
    // 2. The target UID matches the requesting user (self-setting)
    // 3. The target user is also an admin email
    if (!isRequestingUserAdmin || uid !== decodedToken.uid || !isTargetUserAdmin) {
      await SecurityLogger.suspiciousActivity(
        clientIP,
        decodedToken.uid,
        {
          action: 'unauthorized_admin_claims_attempt',
          targetUid: uid,
          requestingEmail: decodedToken.email,
          isRequestingUserAdmin,
          isTargetUserAdmin,
          userAgent
        }
      );
      
      return NextResponse.json(
        { error: 'Insufficient privileges to set admin claims' },
        { status: 403 }
      );
    }

    // Set the custom claims
    const success = await setCustomUserClaims(uid, claims);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to set custom claims' },
        { status: 500 }
      );
    }

    // Log successful admin claims setting
    await SecurityLogger.adminAction(
      clientIP,
      decodedToken.uid,
      {
        action: 'admin_claims_set',
        targetUid: uid,
        claims: claims,
        userAgent
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Admin claims set successfully'
    });

  } catch (error) {
    console.error('Error in set-claims API route:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Secure method restrictions
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to set claims.' },
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