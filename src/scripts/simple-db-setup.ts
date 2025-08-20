#!/usr/bin/env tsx

/**
 * Simple Firestore Database Setup
 * Creates the new database structure with sample data
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function setupDatabase() {
  console.log('🚀 Setting up Firestore database with new structure...');
  
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const db = getFirestore(app);

  try {
    // 1. Create system configuration
    console.log('📄 Creating system configuration...');
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
    console.log('✅ System configuration created');

    // 2. Create sample meeting type
    console.log('📝 Creating sample meeting type...');
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
    console.log('✅ Sample meeting type created');

    // 3. Create sample admin user (you can update this later)
    console.log('👤 Creating admin user placeholder...');
    await setDoc(doc(db, 'users', 'admin'), {
      email: 'admin@universal-assistant.com',
      displayName: 'System Admin',
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
    console.log('✅ Admin user created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📊 Created collections:');
    console.log('  ✓ system_config/settings');
    console.log('  ✓ meeting_types/daily_standup');
    console.log('  ✓ users/admin');
    
    console.log('\n🔍 Next steps:');
    console.log('  1. Update admin user with your actual details');
    console.log('  2. Create additional meeting types as needed');
    console.log('  3. Add voice_library entries as users are identified');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

if (require.main === module) {
  setupDatabase().catch(console.error);
}