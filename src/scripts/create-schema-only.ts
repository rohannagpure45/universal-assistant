#!/usr/bin/env tsx

/**
 * Create ONLY the New Schema Collections
 * Creates exactly the collections specified in firestoredb.txt - nothing more
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

async function createExactSchema(): Promise<void> {
  console.log('🏗️  Creating EXACT schema from firestoredb.txt...\n');
  
  try {
    // ONLY create collections that are in the schema
    
    // 1. users/ collection with admin user
    console.log('👤 Creating users collection with admin...');
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

    console.log('\n🎉 Exact schema created successfully!');
    console.log('\n📋 Collections created (matching firestoredb.txt):');
    console.log('  ✓ users/ - User profiles and preferences');
    console.log('  ✓ meeting_types/ - Meeting templates');
    console.log('\n📝 Collections that will populate automatically:');
    console.log('  • voice_library/ - When voices are identified');
    console.log('  • meetings/ - When meetings are created');
    console.log('  • needs_identification/ - When speaker ID is needed');
    console.log('  • voice_matches/ - Voice matching cache');
    
    console.log('\n🔒 Access Control:');
    console.log('  • Admin users (isAdmin: true) can see all data');
    console.log('  • Regular users only see meetings they participated in');
    console.log('  • participantIds array controls meeting access');
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Universal Assistant - Exact Schema Creation');
  console.log('==============================================\n');
  
  try {
    await createExactSchema();
    console.log('\n✅ Schema creation completed successfully!');
    console.log('📄 Your database now matches firestoredb.txt exactly.');
    
  } catch (error) {
    console.error('💥 Schema creation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}