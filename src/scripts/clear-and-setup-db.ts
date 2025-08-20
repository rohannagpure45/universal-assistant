#!/usr/bin/env tsx

/**
 * Clear Firestore Database and Setup New Structure
 * 
 * This script:
 * 1. Clears all existing Firestore collections
 * 2. Creates the new database structure with sample data
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function clearDatabase(db: any) {
  console.log('🗑️  Clearing existing database...');
  
  // List of possible existing collections
  const collectionsToCheck = [
    'users', 'meetings', 'transcripts', 'voiceProfiles', 'customRules',
    'voice_library', 'meeting_types', 'needs_identification', 'voice_matches',
    'system_config'
  ];

  let totalDeleted = 0;

  for (const collectionName of collectionsToCheck) {
    try {
      console.log(`  Checking collection: ${collectionName}`);
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (!snapshot.empty) {
        console.log(`  Found ${snapshot.size} documents in ${collectionName}`);
        
        // Delete in batches of 500 (Firestore limit)
        const batch = writeBatch(db);
        let batchCount = 0;
        
        for (const document of snapshot.docs) {
          batch.delete(document.ref);
          batchCount++;
          totalDeleted++;
          
          if (batchCount === 500) {
            await batch.commit();
            console.log(`    Deleted batch of 500 documents from ${collectionName}`);
            batchCount = 0;
          }
        }
        
        // Delete remaining documents
        if (batchCount > 0) {
          await batch.commit();
          console.log(`    Deleted final batch of ${batchCount} documents from ${collectionName}`);
        }
        
        console.log(`  ✅ Cleared collection ${collectionName}`);
      } else {
        console.log(`  ⚪ Collection ${collectionName} is already empty`);
      }
    } catch (error) {
      console.log(`  ⚪ Collection ${collectionName} doesn't exist or error: ${error}`);
    }
  }
  
  console.log(`🗑️  Database cleared: ${totalDeleted} documents deleted\n`);
}

async function setupNewDatabase(db: any) {
  console.log('🏗️  Setting up new database structure...');
  
  try {
    // 1. Create system configuration
    console.log('  📄 Creating system configuration...');
    await setDoc(doc(db, 'system_config', 'settings'), {
      version: '1.0.0',
      schemaVersion: '2024-01-20',
      supportedModels: [
        'gpt-4o',
        'gpt-4o-mini', 
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'claude-3-5-sonnet',
        'claude-3-5-opus',
        'claude-3-7-sonnet',
        'claude-3-7-opus'
      ],
      maxMeetingDuration: 480, // minutes
      maxParticipants: 50,
      defaultTTSVoice: '21m00Tcm4TlvDq8ikWAM',
      maintenanceMode: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('  ✅ System configuration created');

    // 2. Create sample meeting type - Daily Standup
    console.log('  📝 Creating Daily Standup meeting type...');
    await setDoc(doc(db, 'meeting_types', 'daily_standup'), {
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
      createdAt: new Date()
    });
    console.log('  ✅ Daily Standup meeting type created');

    // 3. Create sample meeting type - Team Review
    console.log('  📝 Creating Team Review meeting type...');
    await setDoc(doc(db, 'meeting_types', 'team_review'), {
      name: 'Team Review',
      ownerId: 'admin',
      regularParticipants: [],
      systemPrompt: 'You are an AI assistant for team review meetings. Focus on feedback, retrospectives, and team improvement discussions.',
      contextRules: 'Encourage constructive feedback, track action items, and help facilitate open discussion about team performance and processes.',
      files: [],
      aiSettings: {
        enableTranscription: true,
        enableSummaries: true,
        summaryStyle: 'narrative',
        autoIdentifySpeakers: true
      },
      defaultModel: 'claude-3-7-sonnet',
      modelOverrides: {},
      modelSpecificPrompts: {
        'gpt-4o': 'AI assistant for team reviews. Help facilitate feedback and retrospective discussions.',
        'gpt-4o-mini': 'Support team review meetings with focused facilitation.',
        'gpt-5': 'Advanced team review AI. Provide insights on team dynamics and improvement opportunities.',
        'gpt-5-mini': 'Team review assistant focusing on actionable feedback.',
        'gpt-5-nano': 'Quick team review support with brief, targeted responses.',
        'claude-3-5-sonnet': 'Thoughtful AI for team reviews. Balance listening with constructive guidance.',
        'claude-3-5-opus': 'Advanced team review facilitator with deep understanding of team dynamics.',
        'claude-3-7-sonnet': 'Premier AI assistant optimized for team review meetings and retrospectives.',
        'claude-3-7-opus': 'Expert team review AI with enhanced emotional intelligence and facilitation skills.'
      },
      modelCompatibility: {
        recommendedModel: 'claude-3-7-sonnet',
        performanceHistory: []
      },
      createdAt: new Date()
    });
    console.log('  ✅ Team Review meeting type created');

    // 4. Create admin user placeholder
    console.log('  👤 Creating admin user...');
    await setDoc(doc(db, 'users', 'admin'), {
      email: 'admin@universal-assistant.com',
      displayName: 'System Administrator',
      createdAt: new Date(),
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
    console.log('  ✅ Admin user created');

    console.log('🏗️  New database structure setup completed!\n');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Universal Assistant - Database Reset & Setup');
  console.log('==============================================\n');
  
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const db = getFirestore(app);

  try {
    // Step 1: Clear existing database
    await clearDatabase(db);
    
    // Step 2: Setup new structure
    await setupNewDatabase(db);
    
    console.log('🎉 Database reset and setup completed successfully!');
    console.log('\n📊 New database structure:');
    console.log('  ✓ system_config/settings - System configuration');
    console.log('  ✓ meeting_types/daily_standup - Daily standup template');
    console.log('  ✓ meeting_types/team_review - Team review template');
    console.log('  ✓ users/admin - Admin user account');
    
    console.log('\n🔧 Next steps:');
    console.log('  1. Update admin user with your actual email and details');
    console.log('  2. Create additional meeting types as needed');
    console.log('  3. Add real users as they join meetings');
    console.log('  4. Voice library will populate automatically during meetings');
    
  } catch (error) {
    console.error('💥 Database reset failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}