/**
 * Global Setup for Voice Library E2E Tests
 * 
 * Configures the test environment for Firebase voice library functionality testing.
 * Sets up Firebase test project, creates test users, and prepares test data.
 */

import { chromium, FullConfig } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, collection, deleteDoc, getDocs } from 'firebase/firestore';
import { VOICE_LIBRARY_FIXTURES } from '../e2e/utils/voice-library-test-utils';

/**
 * Firebase test configuration
 */
const FIREBASE_TEST_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'test-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'test-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'test-app-id'
};

/**
 * Global setup function
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Voice Library E2E Test Global Setup...');

  try {
    // Initialize Firebase for testing
    const app = initializeApp(FIREBASE_TEST_CONFIG, 'voice-library-test');
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Connect to Firebase emulators if in CI or local test environment
    if (process.env.CI || process.env.USE_FIREBASE_EMULATOR) {
      console.log('📡 Connecting to Firebase emulators...');
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Connected to Firebase emulators');
      } catch (error) {
        console.warn('⚠️ Firebase emulators not available, using live Firebase:', error);
      }
    }

    // Setup test users
    await setupTestUsers(auth);

    // Setup test voice library data
    await setupTestVoiceLibraryData(db);

    // Create authentication state files for tests
    await createAuthenticationStates(config);

    console.log('✅ Voice Library E2E Test Global Setup completed successfully');

  } catch (error) {
    console.error('❌ Voice Library E2E Test Global Setup failed:', error);
    throw error;
  }
}

/**
 * Setup test users for authentication testing
 */
async function setupTestUsers(auth: any) {
  console.log('👥 Setting up test users...');

  const testUsers = [
    VOICE_LIBRARY_FIXTURES.users.authenticated,
    VOICE_LIBRARY_FIXTURES.users.admin
  ];

  for (const user of testUsers) {
    try {
      // Try to create user
      await createUserWithEmailAndPassword(auth, user.email, user.password);
      console.log(`✅ Created test user: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`ℹ️ Test user already exists: ${user.email}`);
      } else {
        console.warn(`⚠️ Error creating test user ${user.email}:`, error.message);
      }
    }
  }

  console.log('✅ Test users setup completed');
}

/**
 * Setup test voice library data in Firestore
 */
async function setupTestVoiceLibraryData(db: any) {
  console.log('🗄️ Setting up test voice library data...');

  try {
    // Clear existing test data
    await clearTestData(db);

    // Create test voice profiles
    const voiceProfiles = [
      VOICE_LIBRARY_FIXTURES.voiceProfiles.confirmed,
      VOICE_LIBRARY_FIXTURES.voiceProfiles.unconfirmed,
      VOICE_LIBRARY_FIXTURES.voiceProfiles.highConfidence
    ];

    for (const profile of voiceProfiles) {
      const docRef = doc(db, 'voice_library', profile.deepgramVoiceId);
      await setDoc(docRef, {
        ...profile,
        firstHeard: profile.firstHeard,
        lastHeard: profile.lastHeard,
        audioSamples: profile.audioSamples.map(sample => ({
          ...sample,
          timestamp: sample.timestamp
        })),
        identificationHistory: profile.identificationHistory.map(history => ({
          ...history,
          timestamp: history.timestamp
        }))
      });
      console.log(`✅ Created test voice profile: ${profile.deepgramVoiceId}`);
    }

    // Create test meetings data for integration tests
    await setupTestMeetingsData(db);

    console.log('✅ Test voice library data setup completed');

  } catch (error) {
    console.error('❌ Error setting up test voice library data:', error);
    throw error;
  }
}

/**
 * Setup test meetings data
 */
async function setupTestMeetingsData(db: any) {
  const testMeetings = [
    {
      id: 'meeting_test_001',
      hostUserId: VOICE_LIBRARY_FIXTURES.users.authenticated.uid,
      title: 'Test Meeting for Voice Library',
      status: 'completed',
      createdAt: new Date('2024-01-15'),
      endedAt: new Date('2024-01-15T01:00:00'),
      participants: [
        {
          uid: VOICE_LIBRARY_FIXTURES.users.authenticated.uid,
          email: VOICE_LIBRARY_FIXTURES.users.authenticated.email,
          displayName: VOICE_LIBRARY_FIXTURES.users.authenticated.displayName
        }
      ],
      transcript: [
        {
          speakerId: VOICE_LIBRARY_FIXTURES.voiceProfiles.confirmed.deepgramVoiceId,
          text: 'This is a test transcript entry for voice library testing.',
          timestamp: new Date('2024-01-15T00:30:00'),
          confidence: 0.95
        }
      ]
    }
  ];

  for (const meeting of testMeetings) {
    const docRef = doc(db, 'meetings', meeting.id);
    await setDoc(docRef, meeting);
    console.log(`✅ Created test meeting: ${meeting.id}`);
  }
}

/**
 * Clear existing test data
 */
async function clearTestData(db: any) {
  console.log('🧹 Clearing existing test data...');

  const collections = ['voice_library', 'meetings'];

  for (const collectionName of collections) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const deletePromises = snapshot.docs
        .filter(doc => doc.id.includes('test') || doc.id.includes('voice_'))
        .map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      console.log(`✅ Cleared test data from ${collectionName}`);
    } catch (error) {
      console.warn(`⚠️ Error clearing ${collectionName}:`, error);
    }
  }
}

/**
 * Create authentication state files for different test scenarios
 */
async function createAuthenticationStates(config: FullConfig) {
  console.log('🔐 Creating authentication state files...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to auth page
    await page.goto('http://localhost:3000/auth', { timeout: 30000 });

    // Create authenticated state
    await page.fill('[data-testid="email-input"]', VOICE_LIBRARY_FIXTURES.users.authenticated.email);
    await page.fill('[data-testid="password-input"]', VOICE_LIBRARY_FIXTURES.users.authenticated.password);
    await page.click('[data-testid="login-submit"]');
    
    // Wait for authentication to complete
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Save authenticated state
    await context.storageState({ path: 'tests/auth-states/authenticated-user.json' });
    console.log('✅ Created authenticated user state file');

    // Create admin authenticated state
    await page.goto('http://localhost:3000/auth');
    await page.fill('[data-testid="email-input"]', VOICE_LIBRARY_FIXTURES.users.admin.email);
    await page.fill('[data-testid="password-input"]', VOICE_LIBRARY_FIXTURES.users.admin.password);
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await context.storageState({ path: 'tests/auth-states/admin-user.json' });
    console.log('✅ Created admin user state file');

  } catch (error) {
    console.warn('⚠️ Could not create authentication states (app may not be running):', error);
  } finally {
    await browser.close();
  }
}

export default globalSetup;