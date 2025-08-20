#!/usr/bin/env tsx

/**
 * Clear Firestore Database using Firebase Admin SDK
 * This script deletes all collections and documents from Firestore
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin with service account
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

// All collections that need to be deleted (including new ones visible in screenshot)
const COLLECTIONS_TO_DELETE = [
  'analytics',
  'cache', 
  'customRules',
  'dailyAnalytics',
  'meetings',
  'monthlyAnalytics',
  'sessions',
  'systemConfig',
  'ttsCache',
  'users',
  'voiceProfiles',
  'weeklyAnalytics',
  // New collections from current screenshot:
  'meeting_types',
  'system_config'
];

async function deleteCollection(collectionName: string): Promise<number> {
  console.log(`🗑️  Deleting collection: ${collectionName}`);
  
  let deletedCount = 0;
  const batchSize = 500;
  
  try {
    let query = db.collection(collectionName).limit(batchSize);
    
    while (true) {
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break;
      }
      
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      await batch.commit();
      console.log(`    Deleted batch: ${snapshot.size} documents`);
      
      // If we got less than batch size, we're done
      if (snapshot.size < batchSize) {
        break;
      }
    }
    
    console.log(`✅ Collection '${collectionName}' deleted: ${deletedCount} documents`);
    return deletedCount;
    
  } catch (error: any) {
    if (error.code === 5) { // NOT_FOUND
      console.log(`⚪ Collection '${collectionName}' doesn't exist`);
      return 0;
    } else {
      console.error(`❌ Error deleting collection '${collectionName}':`, error);
      throw error;
    }
  }
}

async function clearAllCollections(): Promise<void> {
  console.log('🚀 Clearing Firestore Database');
  console.log('==============================\n');
  
  let totalDeleted = 0;
  
  for (const collectionName of COLLECTIONS_TO_DELETE) {
    const deleted = await deleteCollection(collectionName);
    totalDeleted += deleted;
  }
  
  console.log(`\n🎉 Database cleared successfully!`);
  console.log(`📊 Total documents deleted: ${totalDeleted}`);
  console.log('\n✨ Your Firestore database is now empty and ready for the new schema.');
}

if (require.main === module) {
  clearAllCollections()
    .then(() => {
      console.log('✅ Clear operation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Clear operation failed:', error);
      process.exit(1);
    });
}