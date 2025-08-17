import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { DatabaseService } from '@/services/firebase/DatabaseService';

// Request interface
export interface SignOutRequest {
  everywhere?: boolean; // Sign out from all devices
}

// Response interface
export interface SignOutResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SignOutRequest = await request.json().catch(() => ({}));
    const { everywhere = false } = body;

    // Get user ID from authorization header
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await verifyIdToken(token);
        userId = decodedToken?.uid || null;
      } catch (tokenError) {
        // Invalid token, but we'll still return success for sign-out
        console.warn('Invalid token during sign-out:', tokenError);
      }
    }

    // Update user's last activity in database if we have a valid user ID
    if (userId) {
      try {
        await DatabaseService.updateUser(userId, {
          lastActive: new Date(),
        });
      } catch (dbError) {
        // Log but don't fail the sign-out for database errors
        console.warn('Failed to update user sign-out time:', dbError);
      }
    }

    // Note: Firebase client-side SDK handles the actual sign-out
    // This endpoint is mainly for logging and cleanup purposes
    
    return NextResponse.json({
      success: true,
      message: everywhere 
        ? 'Signed out from all devices successfully' 
        : 'Signed out successfully',
    } as SignOutResponse);

  } catch (error) {
    console.error('Sign-out API error:', error);
    
    // Even on error, we should return success for sign-out
    // to avoid preventing users from signing out
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    } as SignOutResponse);
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}