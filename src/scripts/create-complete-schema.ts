#!/usr/bin/env tsx

/**
 * Create COMPLETE Schema with ALL Collections
 * Creates every collection from firestoredb.txt with proper structure
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

async function deleteUnwantedCollections(): Promise<void> {
  console.log('🗑️  Removing unwanted collections...\n');
  
  const unwantedCollections = ['analytics', 'cache', 'systemConfig'];
  
  for (const collectionName of unwantedCollections) {
    try {
      const collection = db.collection(collectionName);
      const snapshot = await collection.get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`✅ Deleted ${collectionName} collection`);
      } else {
        console.log(`⚪ Collection ${collectionName} already empty`);
      }
    } catch (error) {
      console.log(`⚪ Collection ${collectionName} doesn't exist`);
    }
  }
}

async function createCompleteSchema(): Promise<void> {
  console.log('🏗️  Creating ALL required collections...\n');
  
  try {
    // 1. users/ collection
    console.log('👤 Creating users collection...');
    await db.collection('users').doc('admin').set({
      email: 'admin@universal-assistant.com',
      displayName: 'System Administrator',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isAdmin: true,
      primaryVoiceId: null,
      settings: {
        ttsSpeed: 1.0,
        llmModel: 'gpt-4o',
        maxResponseTokens: 4000,
        preferredLanguage: 'en',
        timezone: 'UTC'
      }
    });
    console.log('✅ users/admin created');

    // 2. voice_library/ collection - create with placeholder
    console.log('🎤 Creating voice_library collection...');
    await db.collection('voice_library').doc('_placeholder').set({
      _note: 'This is a placeholder document to create the collection. Real voice data will replace this.',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ voice_library/_placeholder created');

    // 3. meeting_types/ collection
    console.log('📝 Creating meeting_types collection...');
    await db.collection('meeting_types').doc('daily_standup').set({
      name: 'Daily Standup',
      ownerId: 'admin',
      regularParticipants: [],
      systemPrompt: 'You are an AI assistant helping with daily standup meetings. Be concise and focus on progress updates, blockers, and next steps.',
      contextRules: 'Focus on: what was accomplished yesterday, what will be done today, any blockers or impediments.',
      files: [],
      aiSettings: {
        enableTranscription: true,
        enableSummaries: true,
        summaryStyle: 'bullets',
        autoIdentifySpeakers: true
      },
      defaultModel: 'gpt-4o',
      modelOverrides: {},
      modelSpecificPrompts: {
        'gpt-4o': 'You are an AI assistant for daily standups. Keep responses concise and action-oriented.',
        'gpt-4o-mini': 'Help facilitate this daily standup meeting with brief, focused responses.',
        'gpt-5': 'Advanced AI assistant for standup meetings. Provide insightful analysis while staying concise.',
        'gpt-5-mini': 'AI standup assistant. Focus on key points and actionable insights.',
        'gpt-5-nano': 'Quick AI assistant for standups. Brief responses only.',
        'claude-3-5-sonnet': 'AI assistant for daily standups. Provide thoughtful, concise guidance.',
        'claude-3-5-opus': 'Advanced AI for standup meetings. Balance detail with brevity.',
        'claude-3-7-sonnet': 'Latest AI assistant optimized for standup meeting facilitation.',
        'claude-3-7-opus': 'Premier AI assistant for standup meetings with enhanced reasoning.'
      },
      modelCompatibility: {
        recommendedModel: 'gpt-4o',
        performanceHistory: []
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ meeting_types/daily_standup created');

    // 4. meetings/ collection - create with placeholder
    console.log('📅 Creating meetings collection...');
    await db.collection('meetings').doc('_placeholder').set({
      _note: 'This is a placeholder document to create the collection. Real meetings will replace this.',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ meetings/_placeholder created');

    // 5. needs_identification/ collection - create with placeholder
    console.log('🔍 Creating needs_identification collection...');
    await db.collection('needs_identification').doc('_placeholder').set({
      _note: 'This is a placeholder document to create the collection. Real identification requests will replace this.',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ needs_identification/_placeholder created');

    // 6. voice_matches/ collection - create with placeholder
    console.log('🎯 Creating voice_matches collection...');
    await db.collection('voice_matches').doc('_placeholder').set({
      _note: 'This is a placeholder document to create the collection. Real voice matches will replace this.',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ voice_matches/_placeholder created');

    console.log('\n🎉 Complete schema created!');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Complete Schema Creation');
  console.log('===========================\n');
  
  try {
    // Step 1: Remove unwanted collections
    await deleteUnwantedCollections();
    
    // Step 2: Create complete schema
    await createCompleteSchema();
    
    console.log('\n📊 Complete Database Structure:');
    console.log('==============================');
    console.log('  ✓ users/ - User profiles and preferences');
    console.log('  ✓ voice_library/ - Voice identification data');
    console.log('  ✓ meeting_types/ - Meeting templates');
    console.log('  ✓ meetings/ - Meeting instances');
    console.log('  ✓ needs_identification/ - Pending speaker ID');
    console.log('  ✓ voice_matches/ - Voice matching cache');
    
    console.log('\n🔒 Access Control:');
    console.log('  • Admin users (isAdmin: true) can see all data');
    console.log('  • Regular users only see meetings they participated in');
    console.log('  • participantIds array controls meeting access');
    
    console.log('\n📝 Note: Placeholder documents will be replaced with real data during app usage.');
    
  } catch (error) {
    console.error('💥 Schema creation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}