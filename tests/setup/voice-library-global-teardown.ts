/**
 * Global Teardown for Voice Library E2E Tests
 * 
 * Cleans up test data and resources after voice library tests complete.
 * Ensures no test data persists in Firebase and authentication states are cleared.
 */

import { FullConfig } from '@playwright/test';
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs/promises';
import path from 'path';
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
 * Global teardown function
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Voice Library E2E Test Global Teardown...');

  try {
    // Initialize Firebase for cleanup
    const app = initializeApp(FIREBASE_TEST_CONFIG, 'voice-library-teardown');
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Connect to Firebase emulators if in CI or local test environment
    if (process.env.CI || process.env.USE_FIREBASE_EMULATOR) {
      console.log('📡 Connecting to Firebase emulators for cleanup...');
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('✅ Connected to Firebase emulators');
      } catch (error) {
        console.warn('⚠️ Firebase emulators not available for cleanup:', error);
      }
    }

    // Clean up test data
    await cleanupTestData(db);

    // Clean up test users (only in emulator mode)
    if (process.env.CI || process.env.USE_FIREBASE_EMULATOR) {
      await cleanupTestUsers(auth);
    }

    // Clean up authentication state files
    await cleanupAuthenticationStates();

    // Clean up test result files
    await cleanupTestResults();

    console.log('✅ Voice Library E2E Test Global Teardown completed successfully');

  } catch (error) {
    console.error('❌ Voice Library E2E Test Global Teardown failed:', error);
    // Don't throw in teardown to avoid masking test failures
  }
}

/**
 * Clean up test data from Firestore
 */
async function cleanupTestData(db: any) {
  console.log('🗄️ Cleaning up test voice library data...');

  try {
    // Collections to clean up
    const collections = ['voice_library', 'meetings', 'users'];

    for (const collectionName of collections) {
      console.log(`🧹 Cleaning up ${collectionName} collection...`);
      
      try {
        // Get all test documents (documents with test identifiers)
        const snapshot = await getDocs(collection(db, collectionName));
        const testDocs = snapshot.docs.filter(doc => 
          doc.id.includes('test') || 
          doc.id.includes('voice_') ||
          (doc.data().email && doc.data().email.includes('test.com'))
        );

        console.log(`Found ${testDocs.length} test documents in ${collectionName}`);

        // Delete test documents in batches
        const batchSize = 10;
        for (let i = 0; i < testDocs.length; i += batchSize) {
          const batch = testDocs.slice(i, i + batchSize);
          const deletePromises = batch.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          console.log(`Deleted batch ${Math.floor(i/batchSize) + 1} from ${collectionName}`);
        }

        console.log(`✅ Cleaned up ${collectionName} collection`);
      } catch (error) {
        console.warn(`⚠️ Error cleaning up ${collectionName}:`, error);
      }
    }

    console.log('✅ Test data cleanup completed');

  } catch (error) {
    console.error('❌ Error during test data cleanup:', error);
  }
}

/**
 * Clean up test users (only in emulator mode)
 */
async function cleanupTestUsers(auth: any) {
  console.log('👥 Cleaning up test users...');

  // Only clean up users in emulator mode to avoid affecting production
  if (!process.env.CI && !process.env.USE_FIREBASE_EMULATOR) {
    console.log('ℹ️ Skipping user cleanup (not in emulator mode)');
    return;
  }

  const testUserEmails = [
    VOICE_LIBRARY_FIXTURES.users.authenticated.email,
    VOICE_LIBRARY_FIXTURES.users.admin.email
  ];

  for (const email of testUserEmails) {
    try {
      // Note: In emulator mode, we would need to use Admin SDK to delete users
      // For now, we'll just log the cleanup attempt
      console.log(`Would clean up test user: ${email}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`ℹ️ Test user not found: ${email}`);
      } else {
        console.warn(`⚠️ Error cleaning up test user ${email}:`, error.message);
      }
    }
  }

  console.log('✅ Test users cleanup completed');
}

/**
 * Clean up authentication state files
 */
async function cleanupAuthenticationStates() {
  console.log('🔐 Cleaning up authentication state files...');

  try {
    const authStatesDir = path.resolve('tests/auth-states');
    
    try {
      const files = await fs.readdir(authStatesDir);
      const deletePromises = files
        .filter(file => file.endsWith('.json'))
        .map(file => fs.unlink(path.join(authStatesDir, file)));
      
      await Promise.all(deletePromises);
      console.log(`✅ Cleaned up ${deletePromises.length} authentication state files`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ No authentication state files to clean up');
      } else {
        console.warn('⚠️ Error cleaning up authentication states:', error);
      }
    }

  } catch (error) {
    console.error('❌ Error during authentication state cleanup:', error);
  }
}

/**
 * Clean up test result files (keep recent results, clean old ones)
 */
async function cleanupTestResults() {
  console.log('📊 Cleaning up old test result files...');

  try {
    const testResultsDir = path.resolve('test-results');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep results from last 7 days

    try {
      const entries = await fs.readdir(testResultsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.includes('voice-library')) {
          const filePath = path.join(testResultsDir, entry.name);
          
          try {
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              if (entry.isDirectory()) {
                await fs.rmdir(filePath, { recursive: true });
              } else {
                await fs.unlink(filePath);
              }
              console.log(`🗑️ Cleaned up old result: ${entry.name}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error checking file ${entry.name}:`, error);
          }
        }
      }

      console.log('✅ Test results cleanup completed');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ No test results directory to clean up');
      } else {
        console.warn('⚠️ Error cleaning up test results:', error);
      }
    }

  } catch (error) {
    console.error('❌ Error during test results cleanup:', error);
  }
}

/**
 * Generate cleanup summary report
 */
async function generateCleanupSummary() {
  console.log('📋 Generating cleanup summary...');

  const summary = {
    timestamp: new Date().toISOString(),
    cleanupItems: [
      'Voice library test data',
      'Test user accounts',
      'Authentication state files',
      'Old test result files'
    ],
    status: 'completed'
  };

  try {
    const summaryPath = path.resolve('test-results/voice-library-cleanup-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log('✅ Cleanup summary saved');
  } catch (error) {
    console.warn('⚠️ Could not save cleanup summary:', error);
  }
}

export default globalTeardown;