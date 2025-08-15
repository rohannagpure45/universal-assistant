import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/firebase/AuthService';

// Request interface
export interface ResetPasswordRequest {
  email: string;
}

// Response interface
export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Helper function to validate email input
function validateEmailInput(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required and must be a string' };
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ResetPasswordRequest = await request.json();
    const { email } = body;

    // Validate input
    const validation = validateEmailInput(email);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    try {
      // Send password reset email
      const result = await authService.resetPassword(email.trim());
      
      if (result.error) {
        throw result.error;
      }

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent successfully. Check your inbox for instructions.',
      } as ResetPasswordResponse);

    } catch (authError: any) {
      console.error('Password reset error:', authError);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (authError.code) {
        switch (authError.code) {
          case 'auth/user-not-found':
            // For security reasons, we don't reveal if the email exists or not
            // Return success even if user doesn't exist
            return NextResponse.json({
              success: true,
              message: 'If an account with this email exists, a password reset email has been sent.',
            } as ResetPasswordResponse);
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many reset attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
        }
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Reset password API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
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