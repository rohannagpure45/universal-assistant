/**
 * Initialize Feature Flags in Firestore
 * 
 * This script creates the initial systemConfig/featureFlags document
 * with safe defaults for the hybrid migration system.
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://universal-assis.firebaseio.com`
});

const db = admin.firestore();

async function initializeFeatureFlags() {
  try {
    console.log('🚀 Initializing feature flags in Firestore...');
    
    // Default feature flags for safe hybrid mode
    const defaultFlags = {
      // Global flags - Start with hybrid mode enabled
      enableUserIsolation: false,        // Will be enabled gradually
      enableAnonymousAuth: true,          // Currently enabled for compatibility
      enableLegacyPathFallback: true,     // Must stay true during migration
      
      // Migration phase - Start in hybrid mode
      migrationPhase: 'hybrid',           // Options: disabled, hybrid, migrating, completed
      autoMigrateOnLogin: false,          // Don't auto-migrate yet
      showMigrationPrompt: false,         // Don't prompt users yet
      
      // Collection-specific migration flags - All disabled initially
      migrateVoiceSamples: false,
      migrateMeetingRecordings: false,
      migrateMeetingClips: false,
      migrateIdentificationSamples: false,
      
      // Performance flags - Enabled for better UX
      enableCaching: true,
      enableOptimisticUpdates: true,
      
      // Debug flags - Disabled for production
      debugMode: false,
      logMigrationActions: false,
      
      // Metadata
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      version: '1.0.0',
      description: 'Initial feature flags for hybrid security migration'
    };
    
    // Create or update the feature flags document
    const docRef = db.collection('systemConfig').doc('featureFlags');
    
    // Check if document already exists
    const doc = await docRef.get();
    
    if (doc.exists) {
      console.log('⚠️  Feature flags document already exists. Updating with safe defaults...');
      
      // Merge with existing, but ensure critical safety flags
      await docRef.update({
        enableLegacyPathFallback: true,  // Critical: must remain true during migration
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log('✅ Feature flags updated successfully!');
    } else {
      // Create new document
      await docRef.set(defaultFlags);
      console.log('✅ Feature flags created successfully!');
    }
    
    // Display current flags
    const currentDoc = await docRef.get();
    const currentFlags = currentDoc.data();
    
    console.log('\n📋 Current Feature Flags:');
    console.log('─'.repeat(50));
    console.log(`Migration Phase: ${currentFlags.migrationPhase}`);
    console.log(`Anonymous Auth: ${currentFlags.enableAnonymousAuth ? '✅' : '❌'}`);
    console.log(`User Isolation: ${currentFlags.enableUserIsolation ? '✅' : '❌'}`);
    console.log(`Legacy Fallback: ${currentFlags.enableLegacyPathFallback ? '✅' : '❌'}`);
    console.log('─'.repeat(50));
    
    // Create collection indexes for better performance
    console.log('\n🔧 Setting up related collections...');
    
    // Create sample userFeatureOverrides document (for testing)
    const testUserOverride = {
      userId: 'test-user-beta',
      enrolledInBeta: false,
      migrationOptOut: false,
      overrides: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('userFeatureOverrides').doc('test-user-beta').set(testUserOverride, { merge: true });
    console.log('✅ User overrides collection initialized');
    
    console.log('\n🎉 Feature flag initialization complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Test anonymous authentication at /test-hybrid');
    console.log('2. Monitor feature flags in Firebase Console');
    console.log('3. Gradually enable migration flags as testing progresses');
    console.log('\n⚠️  Important: Keep enableLegacyPathFallback = true until migration is complete!');
    
  } catch (error) {
    console.error('❌ Error initializing feature flags:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await admin.app().delete();
    process.exit(0);
  }
}

// Run the initialization
initializeFeatureFlags();