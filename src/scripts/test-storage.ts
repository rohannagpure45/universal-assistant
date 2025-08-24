#!/usr/bin/env tsx

/**
 * Test Firebase Storage Integration for Voice Samples
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
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

const storage = admin.storage();
const db = admin.firestore();

async function listStorageFiles(): Promise<void> {
  console.log('🔍 Firebase Storage Voice Samples Test');
  console.log('=====================================\n');
  
  try {
    const bucket = storage.bucket();
    console.log(`📦 Storage Bucket: ${bucket.name}\n`);
    
    // List all files in voice-samples directory
    const [files] = await bucket.getFiles({ prefix: 'voice-samples/' });
    
    if (files.length === 0) {
      console.log('📭 No voice samples found in storage');
    } else {
      console.log(`📊 Found ${files.length} voice sample files:\n`);
      
      for (const file of files.slice(0, 10)) { // Show first 10
        const [metadata] = await file.getMetadata();
        console.log(`📄 ${file.name}`);
        console.log(`   Size: ${((metadata.size as number) / 1024).toFixed(2)} KB`);
        console.log(`   Created: ${metadata.timeCreated}`);
        console.log('');
      }
    }
    
    // Check meeting recordings
    const [meetingFiles] = await bucket.getFiles({ prefix: 'meeting-recordings/' });
    console.log(`\n📹 Meeting Recordings: ${meetingFiles.length} files`);
    
    // Check identification samples
    const [idFiles] = await bucket.getFiles({ prefix: 'identification-samples/' });
    console.log(`🎤 Identification Samples: ${idFiles.length} files`);
    
    // Check TTS cache
    const [ttsFiles] = await bucket.getFiles({ prefix: 'tts-cache/' });
    console.log(`🔊 TTS Cache: ${ttsFiles.length} files`);
    
    // Check voice library in Firestore
    console.log('\n📚 Voice Library in Firestore:');
    console.log('==============================');
    
    const voiceLibrary = await db.collection('voice_library').get();
    console.log(`Voice profiles: ${voiceLibrary.size}`);
    
    if (voiceLibrary.size > 0) {
      voiceLibrary.forEach(doc => {
        const data = doc.data();
        console.log(`\n👤 Voice ID: ${doc.id}`);
        console.log(`   User: ${data.userName || 'Unknown'}`);
        console.log(`   Confidence: ${data.confidence || 0}`);
        console.log(`   Last seen: ${data.lastSeen?.toDate() || 'Never'}`);
      });
    }
    
    // Check needs identification
    console.log('\n🔍 Needs Identification:');
    console.log('========================');
    
    const needsId = await db.collection('needs_identification').get();
    console.log(`Pending identifications: ${needsId.size}`);
    
    if (needsId.size > 0) {
      needsId.forEach(doc => {
        const data = doc.data();
        console.log(`\n🎯 Voice ID: ${data.deepgramVoiceId}`);
        console.log(`   Meeting: ${data.meetingId}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Sample URL: ${data.sampleUrl}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error accessing storage:', error);
    
    // Check if storage bucket is configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
      console.error('\n⚠️  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in .env.local');
      console.error('   Add: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com');
    }
  }
}

async function main() {
  try {
    await listStorageFiles();
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}