import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/firebase/AuthService';
import { databaseService } from '@/services/firebase/DatabaseService';

// Request interface
export interface SignUpRequest {
  email: string;
  password: string;
  displayName?: string;
  acceptTerms: boolean;
}

// Response interface
export interface SignUpResponse {
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

// Helper function to validate sign-up input
function validateSignUpInput(
  email: string, 
  password: string, 
  acceptTerms: boolean,
  displayName?: string
): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required and must be a string' };
  }

  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required and must be a string' };
  }

  if (typeof acceptTerms !== 'boolean' || !acceptTerms) {
    return { isValid: false, error: 'You must accept the terms and conditions' };
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

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }

  // Validate display name if provided
  if (displayName !== undefined) {
    if (typeof displayName !== 'string') {
      return { isValid: false, error: 'Display name must be a string' };
    }
    if (displayName.length > 50) {
      return { isValid: false, error: 'Display name must be less than 50 characters' };
    }
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

// Helper function to create user profile in database
async function createUserProfile(uid: string, userData: any) {
  const now = new Date().toISOString();
  
  const userProfile = {
    uid,
    email: userData.email,
    displayName: userData.displayName || null,
    photoURL: userData.photoURL || null,
    emailVerified: userData.emailVerified,
    createdAt: now,
    lastLoginAt: now,
    lastActiveAt: now,
    preferences: {
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        meetingReminders: true,
        transcriptionComplete: true,
      },
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      },
    },
    settings: {
      ui: {
        sidebarCollapsed: false,
        compactMode: false,
      },
      meeting: {
        autoTranscribe: true,
        speakerIdentification: true,
        aiAssistance: true,
      },
    },
  };

  await databaseService.createUser(uid, userProfile);
  return userProfile;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: SignUpRequest = await request.json();
    const { email, password, displayName, acceptTerms } = body;

    // Validate input
    const validation = validateSignUpInput(email, password, acceptTerms, displayName);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    try {
      // Create user account
      const userCredential = await authService.createUserWithEmailAndPassword(
        email.trim(),
        password
      );

      if (!userCredential.user) {
        return NextResponse.json(
          { success: false, error: 'Account creation failed' },
          { status: 500 }
        );
      }

      // Update user profile with display name if provided
      if (displayName && displayName.trim()) {
        try {
          await authService.updateProfile({
            displayName: displayName.trim(),
          });
        } catch (profileError) {
          console.warn('Failed to update user profile:', profileError);
        }
      }

      // Create user profile in database
      try {
        await createUserProfile(userCredential.user.uid, {
          email: userCredential.user.email,
          displayName: displayName?.trim() || null,
          photoURL: userCredential.user.photoURL,
          emailVerified: userCredential.user.emailVerified,
        });
      } catch (dbError) {
        console.error('Failed to create user profile in database:', dbError);
        // Note: We could decide to rollback the user creation here if database creation fails
      }

      // Send verification email
      try {
        await authService.sendEmailVerification();
      } catch (emailError) {
        console.warn('Failed to send verification email:', emailError);
        // Continue with signup even if email verification fails
      }

      // Get user ID token
      const token = await userCredential.user.getIdToken();

      // Format user data
      const userData = formatUserData(userCredential.user);

      return NextResponse.json({
        success: true,
        user: userData,
        token,
      } as SignUpResponse);

    } catch (authError: any) {
      console.error('Account creation error:', authError);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Account creation failed. Please try again.';
      
      if (authError.code) {
        switch (authError.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please choose a stronger password.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Account creation is currently disabled.';
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
    console.error('Sign-up API error:', error);
    
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