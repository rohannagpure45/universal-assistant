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
  signInAnonymously,
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
import { featureFlagService } from '@/services/FeatureFlagService';
import { storagePathResolver } from '@/services/firebase/StoragePathResolver';
// EMERGENCY FIX: Removed security imports - they use Node.js APIs that break client-side hydration
// import { SecurityLogger } from '@/lib/security/monitoring';
// import { AdminValidator } from '@/lib/security/adminMiddleware';

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
  
  // Auth state debouncing properties
  private authStateTimeout: NodeJS.Timeout | null = null;
  private latestFirebaseUser: FirebaseUser | null = null;
  
  // SURGICAL FIX: Issue #2 - Concurrency protection for authentication retries
  private activeRetries = new Map<string, Promise<string>>();
  
  // PHASE 2A: Duplicate state detection
  private lastProcessedUID: string | null = null;
  private lastProcessedTime: number = 0;
  
  // PHASE 2B: Cleanup tracking
  private cleanupCallbacks: Array<() => void> = [];
  
  // PHASE 2C: Simple metrics
  private authMetrics = {
    stateChanges: 0,
    duplicatesSkipped: 0,
    criticalChanges: 0,
    errors: 0,
    lastChangeType: '' as string
  };

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
   * Sign in anonymously for development/demo purposes
   */
  public async signInAnonymously(): Promise<AuthResult> {
    const startTime = Date.now();
    
    // Check if anonymous auth is enabled via feature flags
    const flags = featureFlagService.getFlags();
    if (!flags.enableAnonymousAuth) {
      return {
        user: null,
        error: {
          code: 'auth/anonymous-disabled',
          message: 'Anonymous authentication is currently disabled',
          name: 'AuthError'
        }
      };
    }
    
    try {
      const userCredential = await signInAnonymously(auth);
      
      // Create minimal user document for anonymous users
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await this.createUserDocument(userCredential.user, {
          displayName: 'Anonymous User',
          preferences: undefined,
        });
      }
      
      // Clear any cached migration status for this user
      storagePathResolver.clearUserCache(userCredential.user.uid);
      
      const user = await this.convertFirebaseUserToUser(userCredential.user);
      
      // Log anonymous signin
      await this.logAuthEvent(
        'signin',
        userCredential.user.uid,
        'anonymous',
        false,
        true,
        {
          duration: Date.now() - startTime,
          provider: 'anonymous',
          migrationPhase: flags.migrationPhase
        }
      );
      
      return { user };
    } catch (error) {
      await this.logAuthEvent(
        'signin',
        'unknown',
        'anonymous',
        false,
        false,
        {
          duration: Date.now() - startTime,
          provider: 'anonymous',
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
      
      // Clear cached migration status on login
      storagePathResolver.clearUserCache(userCredential.user.uid);
      
      // Check if auto-migration is enabled for this user
      const flags = featureFlagService.getFlags();
      if (flags.autoMigrateOnLogin && flags.migrationPhase === 'migrating') {
        // Trigger migration check (would be handled by a separate migration service)
        console.log('Auto-migration check triggered for user:', userCredential.user.uid);
      }

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
      
      // Clear cached migration status on login
      storagePathResolver.clearUserCache(userCredential.user.uid);
      
      // Check if auto-migration is enabled for this user
      const flags = featureFlagService.getFlags();
      if (flags.autoMigrateOnLogin && flags.migrationPhase === 'migrating') {
        // Trigger migration check (would be handled by a separate migration service)
        console.log('Auto-migration check triggered for user:', userCredential.user.uid);
      }

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
   * PHASE 2B: Enhanced with cleanup tracking
   */
  public async signOut(): Promise<{ error?: LocalAuthError }> {
    const currentUser = auth.currentUser;
    const startTime = Date.now();
    
    try {
      // PHASE 2B: Execute all cleanup callbacks before signout
      console.log(`[AuthService] Running ${this.cleanupCallbacks.length} cleanup callbacks`);
      for (const cleanup of this.cleanupCallbacks) {
        try {
          cleanup();
        } catch (error) {
          console.warn('[AuthService] Cleanup callback failed:', error);
        }
      }
      
      // Clear the auth state timeout if pending
      if (this.authStateTimeout) {
        clearTimeout(this.authStateTimeout);
        this.authStateTimeout = null;
      }
      
      // Clear active retries
      this.activeRetries.clear();
      
      // Reset tracking
      this.lastProcessedUID = null;
      this.lastProcessedTime = 0;
      // Safari-specific fix: Clear local storage and session storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('Storage clear failed (Safari privacy mode?):', storageError);
      }
      
      await signOut(auth);
      
      // Safari-specific fix: Add delay to ensure sign out completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Safari-specific fix: Force page reload for complete sign out
      if (typeof window !== 'undefined') {
        // Check if we're in Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
          // Force page reload in Safari to ensure complete sign out
          setTimeout(() => {
            window.location.href = '/';
          }, 200);
        }
      }
      
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
   * PHASE 2: Enhanced with duplicate detection and metrics
   */
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      // Store the latest user state
      this.latestFirebaseUser = firebaseUser;
      
      // PHASE 2A: Skip duplicate auth states for same user
      const currentUID = firebaseUser?.uid || null;
      const now = Date.now();
      
      // Track metrics
      this.authMetrics.stateChanges++;
      
      // Skip if same user within 500ms (prevents token refresh duplicates)
      if (currentUID === this.lastProcessedUID && 
          currentUID !== null && 
          (now - this.lastProcessedTime) < 500) {
        console.log(`[AuthService] Skipping duplicate auth state for ${currentUID}`);
        this.authMetrics.duplicatesSkipped++;
        return;
      }
      
      // Clear existing timeout
      if (this.authStateTimeout) {
        clearTimeout(this.authStateTimeout);
      }
      
      // Detect if this is a critical change needing immediate processing
      const isCriticalChange = 
        (this.lastProcessedUID !== null && currentUID === null) || // Signout
        (this.lastProcessedUID !== null && currentUID !== null && 
         this.lastProcessedUID !== currentUID); // User switch
      
      if (isCriticalChange) {
        this.authMetrics.criticalChanges++;
        this.authMetrics.lastChangeType = currentUID === null ? 'signout' : 'switch';
      } else {
        this.authMetrics.lastChangeType = currentUID ? 'refresh' : 'unknown';
      }
      
      // Use shorter delay for critical changes
      const delay = isCriticalChange ? 0 : 50;
      
      // Update tracking before async processing
      this.lastProcessedUID = currentUID;
      this.lastProcessedTime = now;
      
      // Debounce with dynamic delay
      this.authStateTimeout = setTimeout(async () => {
        try {
          // Only process if this is still the latest user
          if (this.latestFirebaseUser === firebaseUser) {
            if (firebaseUser) {
              const user = await this.convertFirebaseUserToUser(firebaseUser);
              callback(user);
            } else {
              callback(null);
            }
          }
        } catch (error) {
          console.error('Auth state processing failed:', error);
          this.authMetrics.errors++;
          // Don't callback with null on error - let retry logic handle it
        }
        
        this.authStateTimeout = null;
      }, delay);
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
    // SECURE: Check admin status from Firebase custom claims (eliminates email spoofing)
    const isAdmin = await this.isAdminByCustomClaims(firebaseUser);

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
      // EMERGENCY FIX: Replaced SecurityLogger with console logging
      console.log('[AUTH LOG]', 'unknown', userId, {
        action,
        email,
        isAdmin,
        success,
        timestamp: new Date().toISOString(),
        ...additionalDetails
      });
    } catch (error) {
      console.warn('Failed to log authentication event:', error);
    }
  }

  /**
   * SECURE: Check admin status using Firebase custom claims only (eliminates email spoofing)
   */
  private async isAdminByCustomClaims(firebaseUser: FirebaseUser): Promise<boolean> {
    try {
      const idTokenResult = await firebaseUser.getIdTokenResult(false);
      return idTokenResult.claims.admin === true;
    } catch (error) {
      console.error('Admin validation failed:', error);
      return false; // Fail secure
    }
  }

  /**
   * Ensure admin claims are set for admin users (LEGACY - for backward compatibility)
   * TODO: Remove after migration to new admin middleware is complete
   */
  private async ensureAdminClaims(firebaseUser: FirebaseUser): Promise<void> {
    const startTime = Date.now();
    
    try {
      // SECURE: Admin status determined by custom claims only (no email-based validation)
      const idTokenResult = await firebaseUser.getIdTokenResult(false);
      const currentClaims = idTokenResult.claims;
      const isAdminByEmail = false; // Eliminated email-based validation for security
      
      // Log admin check attempt
      console.log('[AUTH ADMIN CHECK]', 'unknown', firebaseUser.uid, 'admin_claims_check',
        'read',
        true,
        {
          email: firebaseUser.email,
          isAdminByEmail,
          adminEmailsCount: 0, // Security fix: removed hardcoded email validation
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
          console.log('[AUTH ADMIN ACTION]', 'unknown', firebaseUser.uid, {
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
          console.error('[AUTH ERROR]', 'unknown', firebaseUser.uid, apiError,
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
      console.error('[AUTH ERROR]', 'unknown', firebaseUser.uid, error,
        {
          context: 'ensure_admin_claims',
          email: firebaseUser.email,
          duration: Date.now() - startTime
        }
      );
    }
  }

  /**
   * Get ID token with retry logic for network failures
   * SURGICAL FIX: Issue #2 - Enhanced with concurrency protection
   * @param user - Firebase user to get token for
   * @param maxRetries - Maximum number of retry attempts
   * @returns Promise resolving to ID token string
   */
  private async getIdTokenWithRetry(user: FirebaseUser, maxRetries: number = 2, forceRefresh: boolean = false): Promise<string> {
    // SURGICAL FIX: Issue #2 - Prevent concurrent retries for same user
    // Include forceRefresh in cache key to handle both regular and force refresh
    const userId = forceRefresh ? `${user.uid}-force` : user.uid;
    
    // Check if there's already an active retry for this user
    if (this.activeRetries.has(userId)) {
      console.log(`[AuthService] Reusing existing token retry for user ${userId}`);
      return this.activeRetries.get(userId)!;
    }
    
    // Create the retry promise
    const retryPromise = this.performTokenRetry(user, maxRetries, forceRefresh);
    
    // Track active retry
    this.activeRetries.set(userId, retryPromise);
    
    try {
      const token = await retryPromise;
      this.activeRetries.delete(userId); // Clean up on success
      return token;
    } catch (error) {
      this.activeRetries.delete(userId); // Clean up on error
      throw error;
    }
  }
  
  /**
   * Perform actual token retry logic (extracted for concurrency protection)
   * @param user - Firebase user to get token for
   * @param maxRetries - Maximum number of retry attempts
   * @returns Promise resolving to ID token string
   */
  private async performTokenRetry(user: FirebaseUser, maxRetries: number, forceRefresh: boolean = false): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await user.getIdToken(forceRefresh);
      } catch (error) {
        // Only retry on network/transient errors, not auth errors
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Token retrieval attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (error as any)?.message || 'Unknown error');
      }
    }
    
    throw new Error('Token retrieval failed after all retries');
  }
  
  /**
   * Get ID token result with retry logic for network failures
   * SURGICAL FIX: Issue #2 - Network resilience for token result calls
   * @param user - Firebase user to get token result for
   * @param forceRefresh - Whether to force token refresh
   * @param maxRetries - Maximum number of retry attempts
   * @returns Promise resolving to ID token result
   */
  private async getIdTokenResultWithRetry(
    user: FirebaseUser, 
    forceRefresh: boolean = false, 
    maxRetries: number = 2
  ): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await user.getIdTokenResult(forceRefresh);
      } catch (error) {
        // Only retry on network/transient errors, not auth errors
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error;
        }
        
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = 500 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Token result retrieval attempt ${attempt + 1} failed, retrying in ${delay}ms:`, (error as any)?.message || 'Unknown error');
      }
    }
    
    throw new Error('Token result retrieval failed after all retries');
  }

  /**
   * Check if error is retryable (network/transient issues)
   * @param error - Error to check
   * @returns true if error should be retried
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';
    
    // Network errors that warrant retry
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      code.includes('network-request-failed') ||
      code.includes('unavailable') ||
      code.includes('timeout')
    );
  }

  /**
   * Create basic user for network failure fallback
   * @param firebaseUser - Firebase user to convert
   * @returns Basic user without admin claims
   */
  private createBasicUser(firebaseUser: FirebaseUser): User {
    const defaultPreferences: UserPreferences = {
      defaultModel: 'gpt-4o',
      ttsVoice: 'alloy',
      ttsSpeed: 1.0,
      autoTranscribe: true,
      saveTranscripts: true,
      theme: 'light',
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
        keyboardNavigation: false
      }
    };

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL,
      isAdmin: false, // Default to false for network failures
      preferences: defaultPreferences,
      createdAt: new Date(),
      lastActive: new Date()
    };
  }

  /**
   * Convert Firebase user to application user with enhanced admin detection
   */
  private async convertFirebaseUserToUser(firebaseUser: FirebaseUser): Promise<User> {
    const startTime = Date.now();
    
    try {
      // SURGICAL FIX: Issue #2 - Use retry logic for both token calls
      const token = await this.getIdTokenWithRetry(firebaseUser);
      // Add retry wrapper for getIdTokenResult as well
      const idTokenResult = await this.getIdTokenResultWithRetry(firebaseUser);
      const customClaims = idTokenResult.claims;

      // SECURE: Use custom claims only (eliminated email-based validation)
      const isAdminByEmail = false; // Security fix: no email-based admin validation
      const isAdminByClaims = customClaims.admin === true;
      
      // During migration: accept EITHER environment OR claims validation
      const isAdmin = isAdminByClaims || isAdminByEmail;

      // Log dual validation result
      console.log('[AUTH ADMIN VALIDATION]', 'unknown', firebaseUser.uid, 'dual_admin_validation',
        'read',
        true,
        {
          email: firebaseUser.email,
          isAdminByEmail,
          isAdminByClaims,
          finalAdminStatus: isAdmin,
          validationSource: isAdminByClaims ? 'claims' : (isAdminByEmail ? 'environment' : 'none'),
          adminEmailsCount: 0, // Security fix: removed hardcoded email validation
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
      console.error('Error converting Firebase user, falling back to basic user:', error);
      
      // Graceful degradation - create basic user for network failures
      return this.createBasicUser(firebaseUser);
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
      // SURGICAL FIX: Issue #2 - Use retry logic for network resilience
      return await this.getIdTokenWithRetry(currentUser);
    } catch (error) {
      console.error('Failed to get current ID token:', error);
      return null;
    }
  }

  /**
   * Force refresh current user's ID token (deduplicated)
   * SURGICAL FIX: Issue #2 - Deduplicated force refresh for race condition prevention
   */
  public async refreshCurrentUserToken(): Promise<string | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      // Force refresh with deduplication through getIdTokenWithRetry
      return await this.getIdTokenWithRetry(currentUser, 2, true);
    } catch (error) {
      console.error('Failed to refresh current ID token:', error);
      return null;
    }
  }

  /**
   * Register a cleanup callback to be executed on signout
   * PHASE 2B: Cleanup tracking
   */
  public registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Get auth metrics for monitoring
   * PHASE 2C: Simple metrics
   */
  public getAuthMetrics() {
    return { ...this.authMetrics };
  }

  /**
   * Refresh token with recovery mechanism
   * PHASE 2D: Token refresh recovery for ErrorTracker integration
   */
  public async refreshTokenWithRecovery(): Promise<boolean> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return false;
      }
      
      // Use existing deduplication from Phase 1
      const token = await this.refreshCurrentUserToken();
      return !!token;
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      
      // If refresh fails, try re-authenticating
      const errorCode = (error as any)?.code;
      if (errorCode === 'auth/user-token-expired' || 
          errorCode === 'auth/invalid-user-token') {
        // Force re-authentication by triggering auth state change
        console.log('[AuthService] Forcing re-authentication');
        
        // Small delay then check auth state
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // If still authenticated after delay, token was refreshed
        return !!auth.currentUser;
      }
      
      return false;
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();