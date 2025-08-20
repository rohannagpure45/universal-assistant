import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);

// IMPORTANT: Use REST-only mode to eliminate streaming transport issues
// This prevents WebSocket/WebChannel errors in Brave, Safari, and strict networks
try {
  db = initializeFirestore(app, {
    // Force REST-only mode - no WebSocket connections
    experimentalForceLongPolling: false, // Disable polling to force REST
    experimentalAutoDetectLongPolling: false, // Don't auto-detect
    useFetchStreams: false, // Disable streaming completely
    ignoreUndefinedProperties: true, // Handle undefined values gracefully
  } as any);
} catch (_e) {
  // Fallback to default if initializeFirestore already called elsewhere
  console.warn('Firestore already initialized, using existing instance');
  db = getFirestore(app);
}

storage = getStorage(app);

// Analytics only in browser
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Add runtime flag to indicate REST-only mode
const FIRESTORE_REST_MODE = true;

export { app, auth, db, storage, analytics, FIRESTORE_REST_MODE };