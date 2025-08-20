#!/usr/bin/env tsx

/**
 * Check Current Firestore Database Structure
 * Shows what collections and documents currently exist
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
    } as admin.ServiceAccount),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID
  });
}

const db = admin.firestore();

async function listAllCollections(): Promise<void> {
  console.log('🔍 Current Firestore Database Structure');
  console.log('=====================================\n');
  
  try {
    // Get all collections
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('📭 Database is completely empty');
      return;
    }
    
    console.log(`📊 Found ${collections.length} collections:\n`);
    
    for (const collection of collections) {
      console.log(`📂 Collection: ${collection.id}`);
      
      try {
        const snapshot = await collection.get();
        console.log(`   📄 Documents: ${snapshot.size}`);
        
        if (snapshot.size > 0 && snapshot.size <= 5) {
          // Show document IDs for small collections
          const docIds = snapshot.docs.map(doc => doc.id);
          console.log(`   📝 Document IDs: ${docIds.join(', ')}`);
        }
        
        console.log(''); // Empty line for readability
      } catch (error) {
        console.log(`   ❌ Error reading collection: ${error}`);
        console.log('');
      }
    }
    
    console.log('\n🎯 Expected Schema Collections:');
    console.log('==============================');
    console.log('✓ users/ - User profiles and preferences');
    console.log('✓ voice_library/ - Voice identification data'); 
    console.log('✓ meeting_types/ - Meeting templates');
    console.log('✓ meetings/ - Meeting instances');
    console.log('✓ needs_identification/ - Pending speaker ID');
    console.log('✓ voice_matches/ - Voice matching cache');
    
  } catch (error) {
    console.error('❌ Error listing collections:', error);
    throw error;
  }
}

async function main() {
  try {
    await listAllCollections();
  } catch (error) {
    console.error('💥 Check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}