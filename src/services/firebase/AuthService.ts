import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  AuthError as FirebaseAuthError,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/client';
import { User, UserPreferences } from '@/types';
import { handleFirebaseError, reportFirebaseError, withFirebaseErrorHandling } from '@/utils/firebaseErrorHandler';
import { processCatchError } from '@/utils/errorMessages';
import { SecurityLogger } from '@/lib/security/monitoring';
import { AdminValidator } from '@/lib/security/adminMiddleware';

export interface AuthServiceConfig {
  redirectUrl?: string;
  createUserDocument?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  preferences?: Partial<UserPreferences>;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface LocalAuthError extends Error {
  code: string;
  message: string;
}

export interface AuthResult {
  user: User | null;
  error?: LocalAuthError;
}

export class AuthService {
  private static instance: AuthService;
  private googleProvider: GoogleAuthProvider;
  private config: AuthServiceConfig;

  private constructor(config: AuthServiceConfig = {}) {
    this.config = {
      createUserDocument: true,
      ...config,
    };
    
    // Configure Google provider
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.addScope('email');
    this.googleProvider.addScope('profile');
    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
  }

  public static getInstance(config?: AuthServiceConfig): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService(config);
    }
    return AuthService.instance;
  }

  /**
   * Sign up with email and password
   */
  public async signUp({ 
    email, 
    password, 
    displayName, 
    preferences 
  }: SignUpData): Promise<AuthResult> {
    const startTime = Date.now();
    
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        password
      );

      // Update Firebase user profile
      await updateProfile(userCredential.user, {
        displayName: displayName,
      });

      // Create user document in Firestore
      if (this.config.createUserDocument) {
        await this.createUserDocument(userCredential.user, {
          displayName,
          preferences,
        });
      }

      const user = await this.convertFirebaseUserToUser(userCredential.user);
      
      // Log successful signup
      await this.logAuthEvent(
        'signup',
        userCredential.user.uid,
        userCredential.user.email,
        user?.isAdmin,
        true,
        {
          duration: Date.now() - startTime,
          provider: 'email',
          hasPreferences: !!preferences
        }
      );

      return { user };

    } catch (error) {
      // Log failed signup
      await this.logAuthEvent(
        'signup',
        'unknown',
        email,
        false,
        false,
        {
          duration: Date.now() - startTime,
          provider: 'email',
          error: (error as any)?.code || 'unknown'
        }
      );

      return {
        user: null,
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Sign in with email and password
   */
  public async signIn({ email, password }: SignInData): Promise<AuthResult> {
    const startTime = Date.now();
    
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        email, 
        password
      );

      // Update last active timestamp
      await this.updateLastActive(userCredential.user.uid);

      // Check if user should have admin claims and ensure they're set
      await this.ensureAdminClaims(userCredential.user);

      const user = await this.convertFirebaseUserToUser(userCredential.user);
      
      // Log successful signin
      await this.logAuthEvent(
        'signin',
        userCredential.user.uid,
        userCredential.user.email,
        user?.isAdmin,
        true,
        {
          duration: Date.now() - startTime,
          provider: 'email',
          lastActive: user?.lastActive
        }
      );

      return { user };

    } catch (error) {
      // Log failed signin
      await this.logAuthEvent(
        'signin',
        'unknown',
        email,
        false,
        false,
        {
          duration: Date.now() - startTime,
          provider: 'email',
          error: (error as any)?.code || 'unknown'
        }
      );

      return {
        user: null,
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Sign in with Google
   */
  public async signInWithGoogle(): Promise<AuthResult> {
    const startTime = Date.now();
    
    try {
      const userCredential = await signInWithPopup(auth, this.googleProvider);
      
      // Check if this is a new user and create document if needed
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const isNewUser = !userDoc.exists();
      
      if (isNewUser && this.config.createUserDocument) {
        await this.createUserDocument(userCredential.user, {
          displayName: userCredential.user.displayName || 'Google User',
        });
      } else {
        // Update last active for existing users
        await this.updateLastActive(userCredential.user.uid);
      }

      // Check if user should have admin claims and ensure they're set
      await this.ensureAdminClaims(userCredential.user);

      const user = await this.convertFirebaseUserToUser(userCredential.user);
      
      // Log successful Google signin
      await this.logAuthEvent(
        isNewUser ? 'signup' : 'signin',
        userCredential.user.uid,
        userCredential.user.email,
        user?.isAdmin,
        true,
        {
          duration: Date.now() - startTime,
          provider: 'google',
          isNewUser,
          lastActive: user?.lastActive
        }
      );

      return { user };

    } catch (error) {
      // Log failed Google signin
      await this.logAuthEvent(
        'signin',
        'unknown',
        null,
        false,
        false,
        {
          duration: Date.now() - startTime,
          provider: 'google',
          error: (error as any)?.code || 'unknown'
        }
      );

      return {
        user: null,
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Sign out current user
   */
  public async signOut(): Promise<{ error?: LocalAuthError }> {
    const currentUser = auth.currentUser;
    const startTime = Date.now();
    
    try {
      await signOut(auth);
      
      // Log successful signout
      if (currentUser) {
        await this.logAuthEvent(
          'signout',
          currentUser.uid,
          currentUser.email,
          undefined, // Admin status unknown during signout
          true,
          {
            duration: Date.now() - startTime,
            sessionDuration: currentUser.metadata.lastSignInTime ? 
              Date.now() - new Date(currentUser.metadata.lastSignInTime).getTime() : 
              undefined
          }
        );
      }
      
      return {};
    } catch (error) {
      // Log failed signout
      if (currentUser) {
        await this.logAuthEvent(
          'signout',
          currentUser.uid,
          currentUser.email,
          undefined,
          false,
          {
            duration: Date.now() - startTime,
            error: (error as any)?.code || 'unknown'
          }
        );
      }

      return {
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Send password reset email
   */
  public async resetPassword(email: string): Promise<{ error?: LocalAuthError }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return {};
    } catch (error) {
      return {
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Update user password
   */
  public async updateUserPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ error?: LocalAuthError }> {
    const startTime = Date.now();
    const currentUser = auth.currentUser;
    
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Reauthenticate user before password change
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      // Log successful password update
      await this.logAuthEvent(
        'password_update',
        currentUser.uid,
        currentUser.email,
        undefined,
        true,
        {
          duration: Date.now() - startTime,
          requiresReauth: true
        }
      );
      
      return {};
    } catch (error) {
      // Log failed password update
      if (currentUser) {
        await this.logAuthEvent(
          'password_update',
          currentUser.uid,
          currentUser.email,
          undefined,
          false,
          {
            duration: Date.now() - startTime,
            error: (error as any)?.code || 'unknown',
            requiresReauth: true
          }
        );
      }

      return {
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Update user profile
   */
  public async updateUserProfile(data: {
    displayName?: string;
    photoURL?: string;
    preferences?: Partial<UserPreferences>;
  }): Promise<AuthResult> {
    const startTime = Date.now();
    const currentUser = auth.currentUser;
    
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const updates: any = {};
      
      // Update Firebase Auth profile
      if (data.displayName || data.photoURL) {
        await updateProfile(currentUser, {
          displayName: data.displayName,
          photoURL: data.photoURL,
        });
      }

      // Update Firestore document
      if (data.displayName) {
        updates.displayName = data.displayName;
      }
      
      if (data.preferences) {
        updates.preferences = data.preferences;
      }

      if (Object.keys(updates).length > 0) {
        updates.lastActive = serverTimestamp();
        await updateDoc(doc(db, 'users', currentUser.uid), updates);
      }

      const user = await this.convertFirebaseUserToUser(currentUser);
      
      // Log successful profile update
      await this.logAuthEvent(
        'profile_update',
        currentUser.uid,
        currentUser.email,
        user?.isAdmin,
        true,
        {
          duration: Date.now() - startTime,
          updatedFields: Object.keys(data),
          hasDisplayName: !!data.displayName,
          hasPhotoURL: !!data.photoURL,
          hasPreferences: !!data.preferences
        }
      );

      return { user };

    } catch (error) {
      // Log failed profile update
      if (currentUser) {
        await this.logAuthEvent(
          'profile_update',
          currentUser.uid,
          currentUser.email,
          undefined,
          false,
          {
            duration: Date.now() - startTime,
            error: (error as any)?.code || 'unknown',
            attemptedFields: Object.keys(data)
          }
        );
      }

      return {
        user: null,
        error: this.handleAuthError(error as any),
      };
    }
  }

  /**
   * Get current user
   */
  public async getCurrentUser(): Promise<User | null> {
    if (!auth.currentUser) {
      return null;
    }

    return this.convertFirebaseUserToUser(auth.currentUser);
  }

  /**
   * Listen to authentication state changes
   */
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.convertFirebaseUserToUser(firebaseUser);
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Create user document in Firestore with admin detection
   */
  private async createUserDocument(
    firebaseUser: FirebaseUser,
    userData: {
      displayName: string;
      preferences?: Partial<UserPreferences>;
    }
  ): Promise<void> {
    // Check if user is admin by email
    const adminEmails = ['ribt2218@gmail.com', 'rohan@linkstudio.ai'];
    const isAdmin = adminEmails.includes(firebaseUser.email?.toLowerCase() || '');

    const defaultPreferences: UserPreferences = {
      defaultModel: 'gpt-4o',
      ttsVoice: 'alloy',
      ttsSpeed: 1.0,
      autoTranscribe: true,
      saveTranscripts: true,
      theme: 'system',
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
        defaultModel: 'gpt-4o',
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
        theme: 'system',
        language: 'en',
        fontSize: 14,
        compactMode: false,
      },
      ...userData.preferences,
    };

    const userDoc: Omit<User, 'uid'> = {
      email: firebaseUser.email || '',
      displayName: userData.displayName,
      photoURL: firebaseUser.photoURL,
      preferences: defaultPreferences,
      createdAt: new Date(),
      lastActive: new Date(),
      isAdmin,
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userDoc,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    });
  }

  /**
   * Update last active timestamp
   */
  private async updateLastActive(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Failed to update last active timestamp:', error);
    }
  }

  /**
   * Log authentication events with security monitoring
   */
  private async logAuthEvent(
    action: string,
    userId: string,
    email?: string | null,
    isAdmin?: boolean,
    success: boolean = true,
    additionalDetails?: Record<string, any>
  ): Promise<void> {
    try {
      await SecurityLogger.dataAccess(
        'unknown', // clientIP not available in service layer
        userId,
        'authentication',
        success ? 'read' : 'write',
        success,
        {
          action,
          email,
          isAdmin,
          timestamp: new Date().toISOString(),
          ...additionalDetails
        }
      );
    } catch (error) {
      console.warn('Failed to log authentication event:', error);
    }
  }

  /**
   * Ensure admin claims are set for admin users (LEGACY - for backward compatibility)
   * TODO: Remove after migration to new admin middleware is complete
   */
  private async ensureAdminClaims(firebaseUser: FirebaseUser): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Use environment configuration for admin detection
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || 
                         ['ribt2218@gmail.com', 'rohan@linkstudio.ai']; // Fallback
      const isAdminByEmail = adminEmails.includes(firebaseUser.email?.toLowerCase() || '');
      
      // Log admin check attempt
      await SecurityLogger.dataAccess(
        'unknown',
        firebaseUser.uid,
        'admin_claims_check',
        'read',
        true,
        {
          email: firebaseUser.email,
          isAdminByEmail,
          adminEmailsCount: adminEmails.length,
          timestamp: new Date().toISOString()
        }
      );
      
      if (isAdminByEmail) {
        // Call admin API to set claims (legacy for backward compatibility)
        const idToken = await firebaseUser.getIdToken();
        
        try {
          const response = await fetch('/api/admin/set-claims', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              claims: {
                admin: true,
                adminLevel: 'super',
                adminSince: new Date().toISOString(),
              },
            }),
          });

          const success = response.ok;
          
          // Log admin claims setting result
          await SecurityLogger.adminAction(
            'unknown',
            firebaseUser.uid,
            {
              action: 'set_admin_claims',
              success,
              email: firebaseUser.email,
              adminLevel: 'super',
              duration: Date.now() - startTime,
              apiResponse: success ? 'success' : `failed_${response.status}`,
              timestamp: new Date().toISOString()
            }
          );

          if (success) {
            console.log('Admin claims set successfully (legacy mode)');
            // NO force token refresh - avoid race conditions
            // await firebaseUser.getIdToken(true);
          } else {
            console.warn('Failed to set admin claims via API (continuing with environment validation)');
          }
        } catch (apiError) {
          console.warn('Failed to call admin claims API (continuing with environment validation):', apiError);
          
          // Log API call failure
          await SecurityLogger.error(
            'unknown',
            firebaseUser.uid,
            apiError as Error,
            {
              context: 'admin_claims_api_call',
              email: firebaseUser.email,
              duration: Date.now() - startTime
            }
          );
        }
      }
    } catch (error) {
      console.warn('Failed to ensure admin claims (continuing with environment validation):', error);
      
      // Log general failure
      await SecurityLogger.error(
        'unknown',
        firebaseUser.uid,
        error as Error,
        {
          context: 'ensure_admin_claims',
          email: firebaseUser.email,
          duration: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Convert Firebase user to application user with enhanced admin detection
   */
  private async convertFirebaseUserToUser(firebaseUser: FirebaseUser): Promise<User> {
    const startTime = Date.now();
    
    try {
      // Get Firebase ID token WITHOUT force refresh to avoid race conditions
      const idTokenResult = await firebaseUser.getIdTokenResult(false);
      const customClaims = idTokenResult.claims;

      // Dual validation approach for backward compatibility
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || 
                         ['ribt2218@gmail.com', 'rohan@linkstudio.ai']; // Fallback
      
      const isAdminByEmail = adminEmails.includes(firebaseUser.email?.toLowerCase() || '');
      const isAdminByClaims = customClaims.admin === true;
      
      // During migration: accept EITHER environment OR claims validation
      const isAdmin = isAdminByClaims || isAdminByEmail;

      // Log dual validation result
      await SecurityLogger.dataAccess(
        'unknown',
        firebaseUser.uid,
        'dual_admin_validation',
        'read',
        true,
        {
          email: firebaseUser.email,
          isAdminByEmail,
          isAdminByClaims,
          finalAdminStatus: isAdmin,
          validationSource: isAdminByClaims ? 'claims' : (isAdminByEmail ? 'environment' : 'none'),
          adminEmailsCount: adminEmails.length,
          hasCustomClaims: Object.keys(customClaims).length > 0,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      );

      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      const userData = userDoc.data();

      if (!userData) {
        // Fallback if user document doesn't exist
        const defaultPreferences: UserPreferences = {
          defaultModel: 'gpt-4o',
          ttsVoice: 'alloy',
          ttsSpeed: 1.0,
          autoTranscribe: true,
          saveTranscripts: true,
          theme: 'system',
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
            defaultModel: 'gpt-4o',
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
            theme: 'system',
            language: 'en',
            fontSize: 14,
            compactMode: false,
          },
        };

        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL,
          preferences: defaultPreferences,
          createdAt: new Date(),
          lastActive: new Date(),
          isAdmin,
        };
      }

      return {
        uid: firebaseUser.uid,
        email: userData.email || firebaseUser.email || '',
        displayName: userData.displayName || firebaseUser.displayName || 'User',
        photoURL: userData.photoURL || firebaseUser.photoURL,
        preferences: userData.preferences,
        createdAt: userData.createdAt instanceof Timestamp 
          ? userData.createdAt.toDate() 
          : new Date(userData.createdAt),
        lastActive: userData.lastActive instanceof Timestamp 
          ? userData.lastActive.toDate() 
          : new Date(userData.lastActive),
        isAdmin: userData.isAdmin || isAdmin, // Use detected admin status if not in Firestore
      };
    } catch (error) {
      console.error('Error converting Firebase user:', error);
      throw error;
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): LocalAuthError {
    const authError = error as FirebaseAuthError;
    
    let message = 'An authentication error occurred';
    
    switch (authError.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in popup was closed';
        break;
      case 'auth/cancelled-popup-request':
        message = 'Sign-in was cancelled';
        break;
      case 'auth/requires-recent-login':
        message = 'Please sign in again to complete this action';
        break;
      default:
        message = authError.message || 'Authentication failed';
    }

    return {
      code: authError.code || 'auth/unknown',
      message,
      name: 'AuthError',
    };
  }

  /**
   * Get current user's ID token for API authentication
   */
  public async getCurrentIdToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Failed to get current ID token:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();