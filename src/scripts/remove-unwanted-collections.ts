#!/usr/bin/env tsx

/**
 * Remove Unwanted Collections
 * Removes analytics, cache, and systemConfig collections
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
  });
}

const db = admin.firestore();

async function removeUnwantedCollections(): Promise<void> {
  console.log('🗑️  Removing unwanted collections...\n');
  
  const unwantedCollections = ['analytics', 'cache', 'systemConfig'];
  
  for (const collectionName of unwantedCollections) {
    try {
      console.log(`🗑️  Processing collection: ${collectionName}`);
      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (!snapshot.empty) {
        console.log(`    Found ${snapshot.size} documents to delete`);
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Deleted ${collectionName} collection with ${snapshot.size} documents`);
      } else {
        console.log(`⚪ Collection ${collectionName} is already empty`);
      }
    } catch (error) {
      console.log(`⚪ Collection ${collectionName} doesn't exist or error: ${error}`);
    }
    console.log(''); // Empty line for readability
  }
}

async function main() {
  console.log('🗑️  Remove Unwanted Collections');
  console.log('===============================\n');
  
  try {
    await removeUnwantedCollections();
    
    console.log('🎉 Cleanup completed!');
    console.log('\n📊 Remaining collections should be:');
    console.log('  ✓ users/');
    console.log('  ✓ voice_library/');
    console.log('  ✓ meeting_types/');
    console.log('  ✓ meetings/');
    console.log('  ✓ needs_identification/');
    console.log('  ✓ voice_matches/');
    
    console.log('\n🔄 Note: Empty collections may still appear in the Firebase Console for a few minutes.');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}