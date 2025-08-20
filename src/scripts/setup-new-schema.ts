#!/usr/bin/env tsx

/**
 * Setup New Firestore Schema
 * Creates the new database structure with sample data
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin (reuse if already initialized)
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

async function createNewSchema(): Promise<void> {
  console.log('🏗️  Setting up new database schema...\n');
  
  try {
    // 1. Create system configuration
    console.log('📄 Creating system configuration...');
    await db.collection('system_config').doc('settings').set({
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ System configuration created');

    // 2. Create sample meeting type - Daily Standup
    console.log('📝 Creating Daily Standup meeting type...');
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
    console.log('✅ Daily Standup meeting type created');

    // 3. Create sample meeting type - Team Review
    console.log('📝 Creating Team Review meeting type...');
    await db.collection('meeting_types').doc('team_review').set({
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
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Team Review meeting type created');

    // 4. Create sample meeting type - Client Meeting
    console.log('📝 Creating Client Meeting type...');
    await db.collection('meeting_types').doc('client_meeting').set({
      name: 'Client Meeting',
      ownerId: 'admin',
      regularParticipants: [],
      systemPrompt: 'You are an AI assistant for client meetings. Be professional, attentive to client needs, and help track important decisions and follow-up actions.',
      contextRules: 'Focus on client requirements, project updates, timeline discussions, and clear action items. Maintain professional tone.',
      files: [],
      aiSettings: {
        enableTranscription: true,
        enableSummaries: true,
        summaryStyle: 'narrative',
        autoIdentifySpeakers: true
      },
      defaultModel: 'claude-3-7-opus',
      modelOverrides: {},
      modelSpecificPrompts: {
        'gpt-4o': 'Professional AI for client meetings. Focus on clear communication and action tracking.',
        'gpt-4o-mini': 'Support client meetings with professional, focused assistance.',
        'gpt-5': 'Advanced client meeting AI. Provide strategic insights while maintaining professionalism.',
        'gpt-5-mini': 'Client meeting assistant focusing on key decisions and next steps.',
        'gpt-5-nano': 'Quick professional support for client meetings.',
        'claude-3-5-sonnet': 'Professional AI for client interactions. Balance attentiveness with clear guidance.',
        'claude-3-5-opus': 'Expert client meeting facilitator with strong business acumen.',
        'claude-3-7-sonnet': 'Advanced AI optimized for professional client communications.',
        'claude-3-7-opus': 'Premier AI for client meetings with enhanced relationship management skills.'
      },
      modelCompatibility: {
        recommendedModel: 'claude-3-7-opus',
        performanceHistory: []
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Client Meeting type created');

    // 5. Create admin user
    console.log('👤 Creating admin user...');
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
    console.log('✅ Admin user created');

    console.log('\n🎉 New schema setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema setup failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Universal Assistant - New Schema Setup');
  console.log('========================================\n');
  
  try {
    await createNewSchema();
    
    console.log('\n📊 New database structure created:');
    console.log('  ✓ system_config/settings - System configuration');
    console.log('  ✓ meeting_types/daily_standup - Daily standup template');
    console.log('  ✓ meeting_types/team_review - Team review template'); 
    console.log('  ✓ meeting_types/client_meeting - Client meeting template');
    console.log('  ✓ users/admin - Admin user account');
    
    console.log('\n🔧 Next steps:');
    console.log('  1. Update admin user with your actual email and details');
    console.log('  2. Create additional meeting types as needed');
    console.log('  3. Add real users as they join meetings');
    console.log('  4. Voice library will populate automatically during meetings');
    console.log('  5. Access control: meetings only visible to participants + admins');
    
  } catch (error) {
    console.error('💥 Schema setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}