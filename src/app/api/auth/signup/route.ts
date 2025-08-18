import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/firebase/AuthService';
import { DatabaseService } from '@/services/firebase/DatabaseService';

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
    displayName: userData.displayName || 'User',
    photoURL: userData.photoURL || null,
    preferences: {
      defaultModel: 'gpt-4o' as const,
      ttsVoice: 'alloy',
      ttsSpeed: 1.0,
      autoTranscribe: true,
      saveTranscripts: true,
      theme: 'system' as const,
      language: 'en',
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        desktopNotifications: true,
      },
      privacy: {
        dataRetention: 30,
        allowAnalytics: true,
        shareImprovement: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        keyboardNavigation: true,
      },
      ai: {
        defaultModel: 'gpt-4o' as const,
        temperature: 0.7,
        maxTokens: 2000,
        enableFallback: true,
      },
      tts: {
        voice: 'alloy',
        speed: 1.0,
        pitch: 1.0,
        volume: 0.8,
      },
      ui: {
        theme: 'system' as const,
        language: 'en',
        fontSize: 14,
        compactMode: false,
      },
    },
  };

  await DatabaseService.createUser(userProfile);
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
      const result = await authService.signUp({
        email: email.trim(),
        password,
        displayName: displayName || 'User'
      });

      if (result.error || !result.user) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Account creation failed' },
          { status: 500 }
        );
      }

      // Update user profile with display name if provided
      if (displayName && displayName.trim()) {
        try {
          await authService.updateUserProfile({
            displayName: displayName.trim(),
          });
        } catch (profileError) {
          console.warn('Failed to update user profile:', profileError);
        }
      }

      // Create user profile in database
      try {
        await createUserProfile(result.user.uid, {
          email: result.user.email,
          displayName: displayName?.trim() || null,
          photoURL: result.user.photoURL,
          emailVerified: result.user.emailVerified,
        });
      } catch (dbError) {
        console.error('Failed to create user profile in database:', dbError);
        // Note: We could decide to rollback the user creation here if database creation fails
      }

      // Email verification would be handled by Firebase Auth automatically

      // Format user data
      const userData = formatUserData(result.user);

      return NextResponse.json({
        success: true,
        user: userData,
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