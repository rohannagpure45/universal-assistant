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
      return { user };

    } catch (error) {
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
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        email, 
        password
      );

      // Update last active timestamp
      await this.updateLastActive(userCredential.user.uid);

      const user = await this.convertFirebaseUserToUser(userCredential.user);
      return { user };

    } catch (error) {
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
    try {
      const userCredential = await signInWithPopup(auth, this.googleProvider);
      
      // Check if this is a new user and create document if needed
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists() && this.config.createUserDocument) {
        await this.createUserDocument(userCredential.user, {
          displayName: userCredential.user.displayName || 'Google User',
        });
      } else {
        // Update last active for existing users
        await this.updateLastActive(userCredential.user.uid);
      }

      const user = await this.convertFirebaseUserToUser(userCredential.user);
      return { user };

    } catch (error) {
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
    try {
      await signOut(auth);
      return {};
    } catch (error) {
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
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }

      // Reauthenticate user before password change
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email!,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      
      return {};
    } catch (error) {
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
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }

      const updates: any = {};
      
      // Update Firebase Auth profile
      if (data.displayName || data.photoURL) {
        await updateProfile(auth.currentUser, {
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
        await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
      }

      const user = await this.convertFirebaseUserToUser(auth.currentUser);
      return { user };

    } catch (error) {
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
   * Create user document in Firestore
   */
  private async createUserDocument(
    firebaseUser: FirebaseUser,
    userData: {
      displayName: string;
      preferences?: Partial<UserPreferences>;
    }
  ): Promise<void> {
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
   * Convert Firebase user to application user
   */
  private async convertFirebaseUserToUser(firebaseUser: FirebaseUser): Promise<User> {
    try {
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
}

// Export singleton instance
export const authService = AuthService.getInstance();