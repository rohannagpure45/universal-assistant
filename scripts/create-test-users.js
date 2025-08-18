/**
 * Script to create test users in Firebase Auth
 * Run with: node scripts/create-test-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize admin SDK if not already initialized
if (!admin.apps.length) {
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID || 
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || 
      !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    console.error('❌ Missing Firebase Admin environment variables!');
    console.error('Please ensure the following are set in .env.local:');
    console.error('  - FIREBASE_ADMIN_PROJECT_ID');
    console.error('  - FIREBASE_ADMIN_CLIENT_EMAIL');
    console.error('  - FIREBASE_ADMIN_PRIVATE_KEY');
    process.exit(1);
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`
  });
}

const auth = admin.auth();
const db = admin.firestore();

// Test users to create
const testUsers = [
  {
    email: 'test1@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User 1',
    emailVerified: true,
    disabled: false,
    metadata: {
      role: 'user',
      department: 'Engineering'
    }
  },
  {
    email: 'test2@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User 2',
    emailVerified: true,
    disabled: false,
    metadata: {
      role: 'user',
      department: 'Product'
    }
  },
  {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    displayName: 'Admin User',
    emailVerified: true,
    disabled: false,
    metadata: {
      role: 'admin',
      department: 'Management'
    }
  },
  {
    email: 'automation@example.com',
    password: 'AutomationTest123!',
    displayName: 'Automation Test User',
    emailVerified: true,
    disabled: false,
    metadata: {
      role: 'user',
      department: 'QA',
      isTestAccount: true
    }
  }
];

async function createTestUsers() {
  console.log('🚀 Starting test user creation...\n');
  
  const results = {
    created: [],
    existing: [],
    errors: []
  };

  for (const userData of testUsers) {
    try {
      // Check if user already exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(userData.email);
        console.log(`⚠️  User already exists: ${userData.email}`);
        results.existing.push(userData.email);
        continue;
      } catch (error) {
        // User doesn't exist, proceed to create
      }

      // Create the user
      userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: userData.emailVerified,
        disabled: userData.disabled
      });

      console.log(`✅ Created user: ${userData.email} (UID: ${userRecord.uid})`);

      // Set custom claims for admin users
      if (userData.metadata.role === 'admin') {
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });
        console.log(`   └─ Set admin claims for ${userData.email}`);
      }

      // Create user profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email: userData.email,
        displayName: userData.displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        preferences: {
          language: 'en',
          timezone: 'America/Los_Angeles',
          theme: 'light',
          notifications: true,
          ai: {
            defaultModel: 'gpt-4',
            temperature: 0.7,
            maxTokens: 2000,
            enableAutoResponse: true
          },
          tts: {
            voiceId: '21m00Tcm4TlvDq8ikWAM',
            speed: 1.0,
            volume: 0.8,
            enabled: true
          },
          ui: {
            theme: 'light',
            language: 'en',
            compact: false
          }
        },
        metadata: userData.metadata
      });

      console.log(`   └─ Created Firestore profile for ${userData.email}`);
      results.created.push(userData.email);

    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
      results.errors.push({ email: userData.email, error: error.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Created: ${results.created.length} users`);
  if (results.created.length > 0) {
    results.created.forEach(email => console.log(`   - ${email}`));
  }
  
  console.log(`⚠️  Already existed: ${results.existing.length} users`);
  if (results.existing.length > 0) {
    results.existing.forEach(email => console.log(`   - ${email}`));
  }
  
  if (results.errors.length > 0) {
    console.log(`❌ Errors: ${results.errors.length}`);
    results.errors.forEach(({ email, error }) => 
      console.log(`   - ${email}: ${error}`)
    );
  }

  console.log('\n📝 Test Credentials for Login:');
  console.log('='.repeat(50));
  testUsers.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Role: ${user.metadata.role}`);
    console.log('-'.repeat(30));
  });

  process.exit(0);
}

// Run the script
createTestUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});