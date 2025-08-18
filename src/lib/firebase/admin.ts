import { initializeApp, cert, getApps, ServiceAccount, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';

let app: App | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: Storage | undefined;

function initializeAdmin() {
  if (!app && !getApps().length) {
    // Only initialize if we have the required environment variables
    if (process.env.FIREBASE_ADMIN_PROJECT_ID && 
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
        process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      
      const serviceAccount: ServiceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };

      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`,
      });
    }
  }
  return app;
}

export const adminAuth = () => {
  if (!auth) {
    initializeAdmin();
    if (app || getApps().length > 0) {
      auth = getAuth();
    }
  }
  return auth;
};

export const adminDb = () => {
  if (!db) {
    initializeAdmin();
    if (app || getApps().length > 0) {
      db = getFirestore();
    }
  }
  return db;
};

export const adminStorage = () => {
  if (!storage) {
    initializeAdmin();
    if (app || getApps().length > 0) {
      storage = getStorage();
    }
  }
  return storage;
};

// Helper functions for common operations
export async function verifyIdToken(token: string) {
  try {
    const auth = adminAuth();
    if (!auth) {
      console.error('Firebase Admin not initialized');
      return null;
    }
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function setCustomUserClaims(uid: string, claims: Record<string, any>) {
  try {
    const auth = adminAuth();
    if (!auth) {
      console.error('Firebase Admin not initialized');
      return false;
    }
    await auth.setCustomUserClaims(uid, claims);
    return true;
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return false;
  }
}