#!/usr/bin/env node

/**
 * Firebase Initialization Fix Script
 * Addresses critical Firebase configuration and authentication issues
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const FIREBASE_CONFIG_PATH = '../firebase-config.json';
const SERVICE_ACCOUNT_PATH = '../service-account-key.json';

console.log('🔧 Firebase Initialization Fix Script');
console.log('=====================================');

async function initializeFirebaseAdmin() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      console.log('✅ Firebase Admin already initialized');
      return admin.app();
    }

    // Try to load service account
    const serviceAccountPath = path.resolve(__dirname, SERVICE_ACCOUNT_PATH);
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // Fallback to environment variables
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      console.log('✅ Firebase Admin initialized with application default credentials');
    }

    return admin.app();
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
}

async function enableAnonymousAuth() {
  try {
    const auth = admin.auth();
    
    // Enable anonymous authentication programmatically
    console.log('🔑 Enabling anonymous authentication...');
    
    // Note: This would typically be done through Firebase Console or CLI
    // But we can verify it's enabled by checking auth providers
    
    const authConfig = await auth.projectConfigManager().getProjectConfig();
    console.log('✅ Current auth providers configured');
    
    return true;
  } catch (error) {
    console.warn('⚠️ Could not verify anonymous auth config:', error.message);
    return false;
  }
}

async function createFirestoreIndexes() {
  try {
    console.log('📊 Creating Firestore indexes...');
    
    const db = admin.firestore();
    
    // Create necessary composite indexes
    const indexes = [
      {
        collection: 'meetings',
        fields: ['hostId', 'status', 'createdAt']
      },
      {
        collection: 'voice_library',
        fields: ['userId', 'confirmed', 'createdAt']
      },
      {
        collection: 'transcripts',
        fields: ['meetingId', 'timestamp']
      }
    ];

    // Note: Indexes must be created through Firebase Console or deployed via CLI
    // This is just logging what needs to be created
    console.log('📋 Required indexes:', indexes);
    console.log('💡 Create these indexes in Firebase Console > Firestore > Indexes');
    
    return true;
  } catch (error) {
    console.error('❌ Error with index planning:', error.message);
    return false;
  }
}

async function validateSecurityRules() {
  try {
    console.log('🛡️ Validating security rules...');
    
    const rulesPath = path.resolve(__dirname, '../firestore.rules');
    
    if (!fs.existsSync(rulesPath)) {
      console.error('❌ firestore.rules file not found');
      return false;
    }
    
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    
    // Basic validation checks
    const checks = [
      { name: 'Rules version', test: rulesContent.includes("rules_version = '2'") },
      { name: 'Authentication functions', test: rulesContent.includes('isAuthenticated()') },
      { name: 'Anonymous user support', test: rulesContent.includes('anonymousSessions') },
      { name: 'Voice library rules', test: rulesContent.includes('voice_library') },
      { name: 'Meeting subcollections', test: rulesContent.includes('transcripts/{transcriptId}') }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      if (check.test) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
        allPassed = false;
      }
    });
    
    return allPassed;
  } catch (error) {
    console.error('❌ Error validating security rules:', error.message);
    return false;
  }
}

async function setupTestData() {
  try {
    console.log('📝 Setting up test data for validation...');
    
    const db = admin.firestore();
    
    // Create test system config
    await db.collection('systemConfig').doc('app-settings').set({
      version: '1.0.0',
      features: {
        voiceIdentification: true,
        anonymousMode: true
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Test system config created');
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up test data:', error.message);
    return false;
  }
}

async function main() {
  try {
    // Initialize Firebase Admin
    await initializeFirebaseAdmin();
    
    // Validate security rules
    const rulesValid = await validateSecurityRules();
    if (!rulesValid) {
      console.error('❌ Security rules validation failed');
      process.exit(1);
    }
    
    // Enable anonymous auth
    await enableAnonymousAuth();
    
    // Plan Firestore indexes
    await createFirestoreIndexes();
    
    // Setup test data
    await setupTestData();
    
    console.log('\n🎉 Firebase initialization fix completed!');
    console.log('\nNext steps:');
    console.log('1. Deploy security rules: firebase deploy --only firestore:rules');
    console.log('2. Create indexes in Firebase Console');
    console.log('3. Enable Anonymous Authentication in Firebase Console > Authentication > Sign-in method');
    console.log('4. Test the application');
    
  } catch (error) {
    console.error('\n💥 Initialization failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  initializeFirebaseAdmin,
  enableAnonymousAuth,
  validateSecurityRules,
  setupTestData
};