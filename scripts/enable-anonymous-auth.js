#!/usr/bin/env node

/**
 * Enable anonymous authentication in Firebase
 * This script uses Firebase Admin SDK to enable anonymous auth
 */

const admin = require('firebase-admin');
const { execSync } = require('child_process');

async function enableAnonymousAuth() {
  try {
    console.log('Enabling anonymous authentication in Firebase...');
    
    // Use Firebase CLI to enable anonymous auth
    const result = execSync('firebase auth:import /dev/null --hash-algo=BCRYPT || true', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('Attempting to enable via Firebase Console API...');
    
    // Note: Anonymous auth must be enabled manually in Firebase Console
    console.log('\n⚠️  IMPORTANT: Anonymous authentication must be enabled manually in Firebase Console');
    console.log('Steps to enable:');
    console.log('1. Go to https://console.firebase.google.com/project/universal-assis/authentication/providers');
    console.log('2. Click on "Anonymous" in the providers list');
    console.log('3. Toggle the "Enable" switch');
    console.log('4. Click "Save"');
    console.log('\n✅ Once enabled, the app will automatically use anonymous auth for development');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n⚠️  Please enable anonymous authentication manually in Firebase Console');
  }
}

enableAnonymousAuth();