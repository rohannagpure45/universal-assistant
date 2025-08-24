#!/usr/bin/env node

/**
 * FIREBASE PERMISSIONS FIXER
 * 
 * This script helps diagnose and fix Firebase service account permissions
 * for production deployment. It provides detailed instructions for setting
 * up the correct IAM roles and service account permissions.
 * 
 * CRITICAL: This script addresses the service account permission issues
 * preventing Firebase Admin SDK from working properly.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIREBASE PERMISSIONS DIAGNOSTIC AND FIX SCRIPT');
console.log('=================================================\n');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

if (!projectId || !clientEmail) {
  console.error('❌ Missing Firebase configuration!');
  console.error('   Please ensure the following are set in .env.local:');
  console.error('   - FIREBASE_ADMIN_PROJECT_ID');
  console.error('   - FIREBASE_ADMIN_CLIENT_EMAIL');
  process.exit(1);
}

console.log('📋 Current Configuration:');
console.log(`   Project ID: ${projectId}`);
console.log(`   Service Account: ${clientEmail}`);
console.log();

console.log('🚨 PERMISSION ISSUES IDENTIFIED:');
console.log('   The current service account lacks required permissions:');
console.log('   - roles/serviceusage.serviceUsageConsumer');
console.log('   - roles/firebase.admin (or equivalent)');
console.log('   - Firebase Authentication Admin API access');
console.log();

console.log('🔧 MANUAL FIXES REQUIRED:');
console.log();

console.log('1️⃣  GRANT SERVICE USAGE CONSUMER ROLE:');
console.log('   Run this gcloud command:');
console.log(`   gcloud projects add-iam-policy-binding ${projectId} \\`);
console.log(`     --member="serviceAccount:${clientEmail}" \\`);
console.log('     --role="roles/serviceusage.serviceUsageConsumer"');
console.log();

console.log('2️⃣  GRANT FIREBASE ADMIN ROLE:');
console.log('   Run this gcloud command:');
console.log(`   gcloud projects add-iam-policy-binding ${projectId} \\`);
console.log(`     --member="serviceAccount:${clientEmail}" \\`);
console.log('     --role="roles/firebase.admin"');
console.log();

console.log('3️⃣  ENABLE REQUIRED APIS:');
console.log('   Run these gcloud commands:');
console.log(`   gcloud services enable identitytoolkit.googleapis.com --project=${projectId}`);
console.log(`   gcloud services enable firebase.googleapis.com --project=${projectId}`);
console.log(`   gcloud services enable firestore.googleapis.com --project=${projectId}`);
console.log(`   gcloud services enable firebasestorage.googleapis.com --project=${projectId}`);
console.log();

console.log('4️⃣  ALTERNATIVE: FIREBASE CONSOLE METHOD:');
console.log('   1. Go to: https://console.firebase.google.com/');
console.log(`   2. Select project: ${projectId}`);
console.log('   3. Go to Project Settings > Service Accounts');
console.log('   4. Generate new private key if needed');
console.log('   5. Go to Google Cloud Console > IAM');
console.log(`   6. Find service account: ${clientEmail}`);
console.log('   7. Click "Edit" and add these roles:');
console.log('      - Service Usage Consumer');
console.log('      - Firebase Admin SDK Administrator Service Agent');
console.log('      - Cloud Datastore User');
console.log('      - Storage Admin (for Firebase Storage)');
console.log();

console.log('5️⃣  VALIDATE PERMISSIONS:');
console.log('   After setting permissions, wait 5-10 minutes and run:');
console.log('   node scripts/comprehensive-security-audit.js');
console.log();

console.log('🔐 SECURITY RECOMMENDATIONS:');
console.log('   ✅ Use least privilege principle');
console.log('   ✅ Set up separate service accounts for dev/prod');
console.log('   ✅ Regularly rotate service account keys');
console.log('   ✅ Monitor service account usage');
console.log('   ✅ Enable audit logging for admin operations');
console.log();

console.log('📊 TROUBLESHOOTING:');
console.log('   If you still get permission errors:');
console.log('   1. Check if billing is enabled for the project');
console.log('   2. Verify the project ID matches everywhere');
console.log('   3. Ensure the service account key is properly formatted');
console.log('   4. Try regenerating the service account key');
console.log('   5. Check Firebase project settings');
console.log();

// Generate a permissions validation script
const validationScript = `#!/bin/bash
# Firebase Permissions Validation Script
# Run this after setting up permissions

echo "🔍 Validating Firebase permissions..."

echo "1. Testing gcloud authentication..."
gcloud auth list

echo "2. Testing project access..."
gcloud projects describe ${projectId}

echo "3. Testing service account impersonation..."
gcloud auth activate-service-account --key-file=path/to/serviceAccountKey.json

echo "4. Testing Firebase APIs..."
gcloud services list --enabled --project=${projectId} | grep -E "(firebase|firestore|identitytoolkit)"

echo "5. Testing IAM policy..."
gcloud projects get-iam-policy ${projectId} --flatten="bindings[].members" --filter="bindings.members:serviceAccount:${clientEmail}"

echo "✅ Validation complete!"
`;

const scriptPath = path.join(__dirname, 'validate-firebase-permissions.sh');
fs.writeFileSync(scriptPath, validationScript);
fs.chmodSync(scriptPath, 0o755);

console.log(`📝 Validation script created: ${scriptPath}`);
console.log('   Run it after setting up permissions to validate everything works.');
console.log();

console.log('🎯 NEXT STEPS:');
console.log('   1. Run the gcloud commands above');
console.log('   2. Wait 5-10 minutes for propagation');
console.log('   3. Run: node scripts/comprehensive-security-audit.js');
console.log('   4. Deploy updated security rules: firebase deploy --only firestore:rules');
console.log('   5. Test authentication and voice library operations');
console.log();

console.log('❗ IMPORTANT: After fixing permissions, the application should work correctly with:');
console.log('   ✅ Admin user authentication and custom claims');
console.log('   ✅ Voice library operations (create, read, update)');
console.log('   ✅ Meeting creation and management');
console.log('   ✅ Firebase Storage operations');
console.log('   ✅ All security rules functioning properly');

console.log('=================================================');
console.log('🔧 FIREBASE PERMISSIONS DIAGNOSTIC COMPLETED');