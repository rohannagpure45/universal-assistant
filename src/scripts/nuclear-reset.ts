#!/usr/bin/env tsx

/**
 * Nuclear Database Reset
 * Completely wipes everything and creates ONLY the exact schema
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

async function deleteAllCollections(): Promise<void> {
  console.log('💥 NUCLEAR RESET: Deleting ALL collections...\n');
  
  try {
    // Get ALL collections dynamically
    const collections = await db.listCollections();
    
    if (collections.length === 0) {
      console.log('📭 Database is already empty');
      return;
    }
    
    console.log(`🗑️  Found ${collections.length} collections to delete\n`);
    
    for (const collection of collections) {
      console.log(`🗑️  Deleting collection: ${collection.id}`);
      
      let deletedCount = 0;
      const batchSize = 500;
      
      while (true) {
        const snapshot = await collection.limit(batchSize).get();
        
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
        
        if (snapshot.size < batchSize) {
          break;
        }
      }
      
      console.log(`✅ Collection '${collection.id}' deleted: ${deletedCount} documents\n`);
    }
    
  } catch (error) {
    console.error('❌ Error during nuclear reset:', error);
    throw error;
  }
}

async function createExactSchemaOnly(): Promise<void> {
  console.log('🏗️  Creating EXACT schema (minimal)...\n');
  
  try {
    // Create ONLY what's needed for the app to start
    // Other collections will be created automatically when needed
    
    // 1. users/ collection with admin user
    console.log('👤 Creating users/admin...');
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

    // 2. meeting_types/ collection with one sample
    console.log('📝 Creating meeting_types/daily_standup...');
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

    console.log('\n🎉 Minimal schema created!');
    console.log('\n📋 Created Collections:');
    console.log('  ✓ users/ (1 document: admin)');
    console.log('  ✓ meeting_types/ (1 document: daily_standup)');
    
    console.log('\n📝 Collections that will auto-create when needed:');
    console.log('  • voice_library/ - When voices are identified');
    console.log('  • meetings/ - When meetings are created'); 
    console.log('  • needs_identification/ - When speaker ID is needed');
    console.log('  • voice_matches/ - Voice matching cache');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    throw error;
  }
}

async function main() {
  console.log('💥 NUCLEAR DATABASE RESET');
  console.log('=========================\n');
  console.log('⚠️  This will delete EVERYTHING and create a clean schema\n');
  
  try {
    // Step 1: Nuclear deletion
    await deleteAllCollections();
    
    // Step 2: Create minimal schema  
    await createExactSchemaOnly();
    
    console.log('\n✅ Nuclear reset completed successfully!');
    console.log('📄 Database now contains ONLY what the schema requires.');
    
  } catch (error) {
    console.error('💥 Nuclear reset failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}