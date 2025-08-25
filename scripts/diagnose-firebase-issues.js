#!/usr/bin/env node
/**
 * Firebase Issues Diagnostic Script
 * 
 * Runs comprehensive checks to identify root causes of:
 * - Firebase permission errors
 * - Authentication state issues  
 * - Content Security Policy violations
 * - API authentication failures
 * 
 * Usage: node scripts/diagnose-firebase-issues.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Initialize Firebase Admin (safely)
let adminInitialized = false;
try {
  if (!admin.apps.length) {
    // Try to use environment variables first
    if (process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      adminInitialized = true;
      log('green', '✅ Firebase Admin initialized from environment variables');
    } else {
      // Fallback to service account file
      const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
      try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        adminInitialized = true;
        log('green', '✅ Firebase Admin initialized from service account file');
      } catch (e) {
        log('yellow', '⚠️  No Firebase service account found - some checks will be skipped');
      }
    }
  } else {
    adminInitialized = true;
    log('green', '✅ Firebase Admin already initialized');
  }
} catch (error) {
  log('red', `❌ Firebase Admin initialization failed: ${error.message}`);
}

/**
 * Check environment variables configuration
 */
async function checkEnvironmentConfig() {
  log('cyan', '\n🔍 Checking Environment Configuration...');
  
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  
  const missingVars = [];
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    } else {
      log('green', `✅ ${varName} is configured`);
    }
  });
  
  if (missingVars.length > 0) {
    log('red', `❌ Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  // Check API keys format
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (deepgramKey && !deepgramKey.match(/^[a-f0-9]{40}$/)) {
    log('yellow', '⚠️  DEEPGRAM_API_KEY format may be invalid (expected 40 hex characters)');
  } else if (deepgramKey) {
    log('green', '✅ DEEPGRAM_API_KEY format looks valid');
  }
  
  return true;
}

/**
 * Check Firebase project connectivity
 */
async function checkFirebaseConnectivity() {
  log('cyan', '\n🔍 Checking Firebase Connectivity...');
  
  if (!adminInitialized) {
    log('yellow', '⚠️  Skipping connectivity check - Admin SDK not initialized');
    return;
  }
  
  try {
    // Test Firestore connection
    const db = admin.firestore();
    const testDoc = await db.collection('_test').limit(1).get();
    log('green', '✅ Firestore connection successful');
    
    // Test specific collections used in the app
    const collections = ['users', 'meetings', 'voice_library', 'meeting_types'];
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        log('green', `✅ Collection '${collectionName}' accessible (${snapshot.size} docs found)`);
      } catch (error) {
        log('red', `❌ Collection '${collectionName}' error: ${error.message}`);
      }
    }
    
  } catch (error) {
    log('red', `❌ Firebase connectivity error: ${error.message}`);
    
    // Provide specific guidance based on error type
    if (error.message.includes('permission-denied')) {
      log('yellow', '💡 Suggestion: Check Firestore rules - user may not be authenticated');
    } else if (error.message.includes('not-found')) {
      log('yellow', '💡 Suggestion: Verify project ID in environment variables');
    }
  }
}

/**
 * Check Firebase rules validity
 */
async function checkFirebaseRules() {
  log('cyan', '\n🔍 Checking Firebase Rules...');
  
  try {
    // Read current rules files
    const fs = require('fs');
    const firestoreRulesPath = path.join(__dirname, '../firestore.rules');
    const storageRulesPath = path.join(__dirname, '../storage.rules');
    
    if (fs.existsSync(firestoreRulesPath)) {
      const rules = fs.readFileSync(firestoreRulesPath, 'utf8');
      
      // Check for common rule patterns
      if (rules.includes('allow read, write: if true')) {
        log('red', '❌ Firestore rules contain insecure "allow read, write: if true"');
      } else {
        log('green', '✅ Firestore rules do not contain obvious security issues');
      }
      
      // Check for authentication requirements
      if (rules.includes('request.auth != null')) {
        log('green', '✅ Firestore rules require authentication');
      } else {
        log('yellow', '⚠️  Firestore rules may not require authentication');
      }
      
      // Check for specific collections mentioned in errors
      const collections = ['voice_library', 'meeting_types', 'needs_identification'];
      collections.forEach(collection => {
        if (rules.includes(collection)) {
          log('green', `✅ Collection '${collection}' has specific rules`);
        } else {
          log('yellow', `⚠️  Collection '${collection}' may use default rules only`);
        }
      });
      
    } else {
      log('yellow', '⚠️  Firestore rules file not found');
    }
    
    if (fs.existsSync(storageRulesPath)) {
      log('green', '✅ Storage rules file exists');
    } else {
      log('yellow', '⚠️  Storage rules file not found');
    }
    
  } catch (error) {
    log('red', `❌ Error checking rules: ${error.message}`);
  }
}

/**
 * Check for common code issues
 */
async function checkCodeIssues() {
  log('cyan', '\n🔍 Checking Common Code Issues...');
  
  // Check for context usage issues
  const { execSync } = require('child_process');
  
  try {
    // Look for undefined context references
    const contextUsage = execSync('grep -r "context\\." src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" 2>/dev/null || true', 
      { encoding: 'utf8' });
    
    if (contextUsage.trim()) {
      log('yellow', '⚠️  Found context usage in code:');
      contextUsage.trim().split('\n').forEach(line => {
        log('yellow', `   ${line}`);
      });
    } else {
      log('green', '✅ No obvious context usage issues found');
    }
    
    // Check for missing imports
    const missingImports = execSync('grep -r "import.*firebase" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true',
      { encoding: 'utf8' });
    
    if (missingImports.trim()) {
      log('green', '✅ Firebase imports found in codebase');
    } else {
      log('yellow', '⚠️  No Firebase imports found - this may be normal');
    }
    
  } catch (error) {
    log('yellow', '⚠️  Could not check code issues (grep not available)');
  }
}

/**
 * Generate recommendations
 */
async function generateRecommendations() {
  log('cyan', '\n💡 Recommendations:');
  
  log('blue', '1. For CSP violations:');
  log('blue', '   - Updated next.config.js with Google APIs domains');
  log('blue', '   - Added https://apis.google.com/js/api.js to script-src');
  log('blue', '   - Added Firebase Storage domains to connect-src');
  
  log('blue', '2. For Firebase permission errors:');
  log('blue', '   - Ensure user is signed in before making database calls');
  log('blue', '   - Check that Firestore rules allow authenticated users');
  log('blue', '   - Verify the user has proper claims/custom tokens if using admin features');
  
  log('blue', '3. For API 401 errors:');
  log('blue', '   - Ensure Firebase ID token is being sent in Authorization header');
  log('blue', '   - Check that token is not expired (Firebase tokens expire after 1 hour)');
  log('blue', '   - Verify the deepgram-key API route is correctly verifying tokens');
  
  log('blue', '4. For context errors:');
  log('blue', '   - Look for undefined variables in browser console');
  log('blue', '   - Check that all React contexts are properly provided');
  log('blue', '   - Ensure async operations handle loading states properly');
  
  log('blue', '5. Next steps:');
  log('blue', '   - Clear browser cache and hard refresh');
  log('blue', '   - Check browser console for specific error details');
  log('blue', '   - Test authentication flow by signing out and back in');
  log('blue', '   - Monitor Network tab for failed requests');
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
  log('cyan', '🚀 Firebase Issues Diagnostic Started');
  log('cyan', '=====================================\n');
  
  try {
    const envOk = await checkEnvironmentConfig();
    if (envOk && adminInitialized) {
      await checkFirebaseConnectivity();
    }
    
    await checkFirebaseRules();
    await checkCodeIssues();
    await generateRecommendations();
    
    log('green', '\n✅ Diagnostic completed successfully');
    log('cyan', '\nNext: Clear browser cache, hard refresh, and check console for remaining errors');
    
  } catch (error) {
    log('red', `\n💥 Diagnostic failed: ${error.message}`);
    console.error(error);
  }
}

// Run diagnostics if script is executed directly
if (require.main === module) {
  runDiagnostics().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { runDiagnostics, checkEnvironmentConfig, checkFirebaseConnectivity };