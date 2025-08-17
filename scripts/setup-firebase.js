// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  });
  console.log('✅ Environment variables loaded from .env.local');
  console.log('📋 Firebase Project ID:', process.env.FIREBASE_ADMIN_PROJECT_ID ? 'SET' : 'NOT SET');
  console.log('📋 Firebase Client Email:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? 'SET' : 'NOT SET');
  console.log('📋 Firebase Private Key:', process.env.FIREBASE_ADMIN_PRIVATE_KEY ? 'SET' : 'NOT SET');
} else {
  console.error('❌ .env.local file not found');
  process.exit(1);
}

// Import Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  console.log('🔑 Using Firebase project:', serviceAccount.projectId);

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('❌ Missing required Firebase Admin credentials');
    console.error('Required: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.projectId}.appspot.com`,
  });
}

const adminDb = admin.firestore();

async function setupInitialConfig() {
  try {
    // Setup AI Models Configuration - Using actual models from your system
    await adminDb.collection('systemConfig').doc('aiModels').set({
      models: [
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation', 'vision', 'function-calling'],
          pricing: { inputTokens: 0.005, outputTokens: 0.015 },
          isActive: true,
          maxTokens: 4096,
          contextLength: 128000
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation', 'function-calling'],
          pricing: { inputTokens: 0.00015, outputTokens: 0.0006 },
          isActive: true,
          maxTokens: 2048,
          contextLength: 128000
        },
        {
          id: 'claude-3-5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'anthropic',
          capabilities: ['text-generation', 'conversation', 'analysis', 'vision', 'function-calling'],
          pricing: { inputTokens: 0.003, outputTokens: 0.015 },
          isActive: true,
          maxTokens: 4096,
          contextLength: 200000
        },
        {
          id: 'claude-3-5-opus',
          name: 'Claude 3.5 Opus',
          provider: 'anthropic',
          capabilities: ['text-generation', 'conversation', 'analysis', 'vision', 'function-calling'],
          pricing: { inputTokens: 0.015, outputTokens: 0.075 },
          isActive: true,
          maxTokens: 4096,
          contextLength: 200000
        },
        {
          id: 'claude-3-7-sonnet',
          name: 'Claude 3.7 Sonnet',
          provider: 'anthropic',
          capabilities: ['text-generation', 'conversation', 'analysis', 'vision', 'function-calling', 'code-execution'],
          pricing: { inputTokens: 0.003, outputTokens: 0.015 },
          isActive: true,
          maxTokens: 4096,
          contextLength: 200000
        },
        {
          id: 'claude-3-7-opus',
          name: 'Claude 3.7 Opus',
          provider: 'anthropic',
          capabilities: ['text-generation', 'conversation', 'analysis', 'vision', 'function-calling', 'code-execution'],
          pricing: { inputTokens: 0.015, outputTokens: 0.075 },
          isActive: true,
          maxTokens: 4096,
          contextLength: 200000
        },
        {
          id: 'gpt-5',
          name: 'GPT-5',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation', 'vision', 'function-calling', 'code-execution'],
          pricing: { inputTokens: 0.01, outputTokens: 0.03 },
          isActive: true,
          maxTokens: 8192,
          contextLength: 1000000
        },
        {
          id: 'gpt-5-mini',
          name: 'GPT-5 Mini',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation', 'function-calling'],
          pricing: { inputTokens: 0.0001, outputTokens: 0.0004 },
          isActive: true,
          maxTokens: 2048,
          contextLength: 256000
        },
        {
          id: 'gpt-5-nano',
          name: 'GPT-5 Nano',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation'],
          pricing: { inputTokens: 0.00005, outputTokens: 0.0002 },
          isActive: true,
          maxTokens: 1024,
          contextLength: 128000
        },
        {
          id: 'gpt-4.1-nano',
          name: 'GPT-4.1 Nano',
          provider: 'openai',
          capabilities: ['text-generation', 'conversation'],
          pricing: { inputTokens: 0.0001, outputTokens: 0.0003 },
          isActive: true,
          maxTokens: 1024,
          contextLength: 64000
        }
      ],
      defaultModel: 'gpt-4o-mini',
      fallbackModels: ['gpt-4o-mini', 'claude-3-5-sonnet'],
      updatedAt: new Date()
    });

    // Setup Feature Flags
    await adminDb.collection('systemConfig').doc('features').set({
      voiceCloning: true,
      realtimeTranscription: true,
      aiSummaries: true,
      advancedAnalytics: true,
      multiLanguageSupport: true,
      speakerIdentification: true,
      inputGating: true,
      fragmentAggregation: true,
      performanceMonitoring: true,
      concurrentProcessing: true,
      updatedAt: new Date()
    });

    // Setup System Limits
    await adminDb.collection('systemConfig').doc('limits').set({
      maxMeetingDuration: 180, // 3 hours in minutes
      maxParticipants: 50,
      maxStoragePerUser: 5368709120, // 5GB in bytes
      maxVoiceProfiles: 10,
      maxCustomRules: 25,
      maxFragmentsPerSpeaker: 100,
      maxConcurrentProcessing: 5,
      cacheExpirationDays: 7,
      maxAudioFileSize: 104857600, // 100MB in bytes
      updatedAt: new Date()
    });

    // Setup Default Voice Settings
    await adminDb.collection('systemConfig').doc('voiceSettings').set({
      defaultVoiceSettings: {
        stability: 0.75,
        similarityBoost: 0.85,
        speed: 1.0,
        pitch: 0.0,
        useSpeakerBoost: true
      },
      supportedLanguages: [
        'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 
        'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN', 'hi-IN', 'ar-SA'
      ],
      voiceTypes: ['natural', 'synthetic', 'cloned'],
      updatedAt: new Date()
    });

    // Setup Meeting Types Configuration
    await adminDb.collection('systemConfig').doc('meetingTypes').set({
      supportedTypes: [
        {
          id: 'standup',
          name: 'Team Standup',
          description: 'Daily team status updates',
          defaultDuration: 15,
          maxParticipants: 10
        },
        {
          id: 'review',
          name: 'Review Meeting',
          description: 'Project or performance reviews',
          defaultDuration: 60,
          maxParticipants: 5
        },
        {
          id: 'planning',
          name: 'Planning Session',
          description: 'Strategic planning and roadmapping',
          defaultDuration: 90,
          maxParticipants: 15
        },
        {
          id: 'interview',
          name: 'Interview',
          description: 'Job interviews and candidate evaluations',
          defaultDuration: 45,
          maxParticipants: 5
        },
        {
          id: 'presentation',
          name: 'Presentation',
          description: 'Formal presentations and demos',
          defaultDuration: 30,
          maxParticipants: 50
        },
        {
          id: 'brainstorming',
          name: 'Brainstorming',
          description: 'Creative ideation sessions',
          defaultDuration: 60,
          maxParticipants: 12
        },
        {
          id: 'training',
          name: 'Training Session',
          description: 'Educational and training meetings',
          defaultDuration: 120,
          maxParticipants: 25
        },
        {
          id: 'other',
          name: 'Other',
          description: 'General purpose meetings',
          defaultDuration: 30,
          maxParticipants: 20
        }
      ],
      updatedAt: new Date()
    });

    console.log('✅ Initial system configuration created successfully');
    console.log('✅ AI Models configured:', [
      'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-5-opus',
      'claude-3-7-sonnet', 'claude-3-7-opus', 'gpt-5', 'gpt-5-mini',
      'gpt-5-nano', 'gpt-4.1-nano'
    ].join(', '));
    console.log('✅ Feature flags, limits, voice settings, and meeting types configured');
    
  } catch (error) {
    console.error('❌ Error setting up initial config:', error);
    process.exit(1);
  }
}

// Run the setup
setupInitialConfig().then(() => {
  console.log('🎉 Firebase setup completed successfully!');
  process.exit(0);
});