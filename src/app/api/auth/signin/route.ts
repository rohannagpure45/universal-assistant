import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/firebase/AuthService';
import { databaseService } from '@/services/firebase/DatabaseService';

// Request interface
export interface SignInRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Response interface
export interface SignInResponse {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified: boolean;
  };
  token?: string;
  error?: string;
}

// Helper function to validate sign-in input
function validateSignInInput(email: string, password: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required and must be a string' };
  }

  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required and must be a string' };
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters' };
  }

  return { isValid: true };
}

// Helper function to format user data
function formatUserData(user: any) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime,
    lastLoginAt: user.metadata.lastSignInTime,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SignInRequest = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validate input
    const validation = validateSignInInput(email, password);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    try {
      // Attempt to sign in user
      const result = await authService.signIn({
        email: email.trim(),
        password
      });
      
      if (result.error) {
        throw result.error;
      }
      
      const user = result.user;

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: user,
      });

    } catch (authError: any) {
      console.error('Authentication error:', authError);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (authError.code) {
        switch (authError.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
        }
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Sign-in API error:', error);
    
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