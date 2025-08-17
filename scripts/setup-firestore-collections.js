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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.projectId}.appspot.com`,
  });
}

const adminDb = admin.firestore();

async function setupFirestoreCollections() {
  try {
    console.log('🔄 Setting up Firestore collections and sample documents...\n');

    // 1. Create sample user profile
    const sampleUserId = 'demo-user-12345';
    console.log('👤 Creating sample user profile...');
    await adminDb.collection('users').doc(sampleUserId).set({
      email: 'demo@universalassistant.ai',
      displayName: 'Demo User',
      avatar: 'https://via.placeholder.com/150',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      preferences: {
        language: 'en-US',
        timezone: 'America/New_York',
        theme: 'light',
        notifications: true
      }
    });

    // Create user's voice profile subcollection
    console.log('🎤 Creating sample voice profile...');
    await adminDb.collection('users').doc(sampleUserId)
      .collection('voiceProfiles').add({
        name: 'Professional Voice',
        voiceId: 'elevenlabs-voice-id-123',
        voiceSettings: {
          stability: 0.75,
          similarityBoost: 0.85,
          speed: 1.0,
          pitch: 0.0,
          useSpeakerBoost: true
        },
        isDefault: true,
        metadata: {
          language: 'en-US',
          accent: 'american',
          gender: 'neutral',
          description: 'Clear, professional voice for business meetings'
        },
        sampleAudioUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Create user's custom rule subcollection
    console.log('📝 Creating sample custom rule...');
    await adminDb.collection('users').doc(sampleUserId)
      .collection('customRules').add({
        name: 'Meeting Focus Rule',
        conditions: [
          {
            type: 'keyword',
            operator: 'contains',
            value: 'off-topic',
            caseSensitive: false
          }
        ],
        actions: [
          {
            type: 'redirect',
            parameters: {
              message: 'Let\'s stay focused on the meeting agenda'
            }
          }
        ],
        priority: 1,
        isActive: true,
        createdAt: new Date()
      });

    // 2. Create sample meeting
    const sampleMeetingId = 'demo-meeting-67890';
    console.log('🤝 Creating sample meeting...');
    await adminDb.collection('meetings').doc(sampleMeetingId).set({
      title: 'Weekly Team Standup',
      organizerId: sampleUserId,
      participants: [
        {
          userId: sampleUserId,
          role: 'organizer',
          joinedAt: new Date(),
          leftAt: null
        },
        {
          userId: 'participant-1',
          role: 'participant', 
          joinedAt: new Date(),
          leftAt: null
        }
      ],
      type: 'standup',
      startTime: new Date(),
      endTime: null,
      status: 'active',
      settings: {
        enableRecording: true,
        enableTranscription: true,
        enableAI: true,
        language: 'en-US',
        maxParticipants: 10
      },
      metadata: {
        tags: ['weekly', 'standup', 'team'],
        department: 'Engineering',
        project: 'Universal Assistant',
        confidentiality: 'internal'
      }
    });

    // Create meeting transcript subcollection
    console.log('📝 Creating sample transcript entries...');
    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('transcripts').add({
        text: 'Good morning everyone, let\'s start our weekly standup.',
        speakerId: 'speaker-1',
        confidence: 0.95,
        timestamp: new Date(),
        duration: 3.2,
        metadata: {
          audioQuality: 'high',
          backgroundNoise: 'low'
        }
      });

    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('transcripts').add({
        text: 'I completed the authentication module yesterday.',
        speakerId: 'speaker-2', 
        confidence: 0.92,
        timestamp: new Date(Date.now() + 10000),
        duration: 2.8,
        metadata: {
          audioQuality: 'medium',
          backgroundNoise: 'low'
        }
      });

    // Create meeting speakers subcollection
    console.log('👥 Creating sample speaker profiles...');
    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('speakers').doc('speaker-1').set({
        name: 'Demo User',
        userId: sampleUserId,
        voiceProfile: {
          embedding: Array(256).fill(0).map(() => Math.random()),
          confidence: 0.88
        },
        statistics: {
          totalSpeakTime: 180.5,
          averageConfidence: 0.93,
          wordCount: 245
        },
        firstDetected: new Date()
      });

    // Create AI responses subcollection
    console.log('🤖 Creating sample AI response...');
    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('aiResponses').add({
        prompt: 'Summarize the key points discussed so far',
        response: 'The team has covered authentication module completion and is moving to discuss the next sprint priorities.',
        model: 'gpt-4o-mini',
        timestamp: new Date(),
        context: {
          conversationHistory: [
            {
              speaker: 'Demo User',
              message: 'Good morning everyone, let\'s start our weekly standup.',
              timestamp: new Date(),
              confidence: 0.95
            }
          ],
          currentSpeaker: 'Demo User',
          meetingContext: {
            title: 'Weekly Team Standup',
            participants: ['Demo User', 'Participant 1']
          }
        },
        metadata: {
          model: 'gpt-4o-mini',
          provider: 'openai',
          tokensUsed: 125,
          responseTime: 1200,
          confidence: 0.91
        }
      });

    // Create meeting notes subcollection
    console.log('📋 Creating sample meeting notes...');
    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('notes').add({
        content: '# Action Items\n- Complete API documentation\n- Schedule security review\n- Update deployment scripts',
        authorId: sampleUserId,
        type: 'manual',
        tags: ['action-items', 'todo'],
        timestamp: new Date(),
        isPublic: true
      });

    // Create meeting analytics subcollection
    console.log('📊 Creating sample meeting analytics...');
    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('analytics').doc('speaking-time').set({
        totalDuration: 1800, // 30 minutes
        speakers: {
          'speaker-1': 720, // 12 minutes
          'speaker-2': 480, // 8 minutes
          'speaker-3': 600  // 10 minutes
        },
        calculatedAt: new Date()
      });

    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('analytics').doc('sentiment').set({
        overall: 'positive',
        timeline: [
          { timestamp: new Date(), sentiment: 'neutral', score: 0.1 },
          { timestamp: new Date(Date.now() + 10000), sentiment: 'positive', score: 0.6 }
        ],
        speakers: {
          'speaker-1': { sentiment: 'positive', score: 0.7 },
          'speaker-2': { sentiment: 'neutral', score: 0.2 }
        },
        calculatedAt: new Date()
      });

    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('analytics').doc('topics').set({
        mainTopics: ['authentication', 'sprint planning', 'security review'],
        keywords: ['module', 'complete', 'review', 'documentation'],
        categories: ['development', 'planning', 'security'],
        calculatedAt: new Date()
      });

    // 3. Create global voice profiles
    console.log('🎙️ Creating global voice profiles...');
    await adminDb.collection('voiceProfiles').add({
      name: 'Business Professional',
      ownerId: sampleUserId,
      voiceId: 'elevenlabs-voice-business-123',
      voiceSettings: {
        stability: 0.8,
        similarityBoost: 0.9,
        speed: 1.1,
        pitch: 0.1
      },
      embedding: Array(256).fill(0).map(() => Math.random()),
      isPublic: true,
      isDefault: false,
      metadata: {
        language: 'en-US',
        accent: 'american',
        gender: 'neutral',
        description: 'Professional voice optimized for business presentations'
      },
      sampleAudioUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 4. Create global custom rules
    console.log('⚙️ Creating global custom rules...');
    await adminDb.collection('customRules').add({
      name: 'Public Meeting Etiquette',
      description: 'Ensures professional meeting conduct',
      ownerId: sampleUserId,
      conditions: [
        {
          field: 'text',
          operator: 'contains',
          value: 'inappropriate',
          logic: 'OR'
        }
      ],
      actions: [
        {
          type: 'notify',
          parameters: {
            message: 'Please maintain professional language',
            priority: 'medium'
          }
        }
      ],
      priority: 5,
      isActive: true,
      isPublic: true,
      usageCount: 12,
      tags: ['etiquette', 'professional', 'public'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 5. Create analytics collections
    console.log('📈 Creating analytics data...');
    await adminDb.collection('dailyAnalytics').doc('2025-01-15').set({
      totalUsers: 156,
      totalMeetings: 42,
      totalDuration: 25200, // 7 hours in seconds
      newUsers: 8,
      activeUsers: 134,
      date: '2025-01-15',
      metrics: {
        averageMeetingDuration: 600, // 10 minutes
        topMeetingTypes: ['standup', 'review', 'planning'],
        peakHours: ['09:00', '14:00', '16:00']
      },
      updatedAt: new Date()
    });

    await adminDb.collection('weeklyAnalytics').doc('2025-W03').set({
      weekStart: '2025-01-13',
      weekEnd: '2025-01-19',
      totalUsers: 892,
      totalMeetings: 267,
      totalDuration: 160200, // 44.5 hours
      averageSessionDuration: 1800, // 30 minutes
      updatedAt: new Date()
    });

    await adminDb.collection('monthlyAnalytics').doc('2025-01').set({
      month: '2025-01',
      totalUsers: 3421,
      totalMeetings: 1156,
      totalDuration: 694800, // 193 hours
      newUsers: 342,
      churnedUsers: 28,
      updatedAt: new Date()
    });

    // 6. Create cache collections
    console.log('💾 Creating cache data...');
    await adminDb.collection('ttsCache').add({
      text: 'Welcome to the Universal Assistant meeting.',
      voiceId: 'elevenlabs-voice-id-123',
      settings: {
        stability: 0.75,
        similarityBoost: 0.85,
        speed: 1.0
      },
      storageUrl: 'gs://universal-assis.appspot.com/tts-cache/abc123.mp3',
      size: 45678,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await adminDb.collection('sessions').add({
      userId: sampleUserId,
      startTime: new Date(),
      lastActivity: new Date(),
      meetingId: sampleMeetingId,
      metadata: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ipAddress: '192.168.1.100',
        deviceType: 'desktop'
      }
    });

    // 7. Update system config (already exists, but add more data)
    console.log('⚙️ Updating system configuration...');
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
      qualitySettings: {
        sampleRate: 44100,
        bitRate: 128,
        format: 'mp3'
      },
      updatedAt: new Date()
    });

    await adminDb.collection('systemConfig').doc('meetingTypes').set({
      supportedTypes: [
        {
          id: 'standup',
          name: 'Team Standup',
          description: 'Daily team status updates',
          defaultDuration: 15,
          maxParticipants: 10,
          icon: '🚀'
        },
        {
          id: 'review',
          name: 'Review Meeting',
          description: 'Project or performance reviews',
          defaultDuration: 60,
          maxParticipants: 5,
          icon: '📊'
        },
        {
          id: 'planning',
          name: 'Planning Session',
          description: 'Strategic planning and roadmapping',
          defaultDuration: 90,
          maxParticipants: 15,
          icon: '🗺️'
        },
        {
          id: 'interview',
          name: 'Interview',
          description: 'Job interviews and candidate evaluations',
          defaultDuration: 45,
          maxParticipants: 5,
          icon: '💼'
        },
        {
          id: 'presentation',
          name: 'Presentation',
          description: 'Formal presentations and demos',
          defaultDuration: 30,
          maxParticipants: 50,
          icon: '📽️'
        },
        {
          id: 'brainstorming',
          name: 'Brainstorming',
          description: 'Creative ideation sessions',
          defaultDuration: 60,
          maxParticipants: 12,
          icon: '💡'
        },
        {
          id: 'training',
          name: 'Training Session',
          description: 'Educational and training meetings',
          defaultDuration: 120,
          maxParticipants: 25,
          icon: '🎓'
        },
        {
          id: 'other',
          name: 'Other',
          description: 'General purpose meetings',
          defaultDuration: 30,
          maxParticipants: 20,
          icon: '📋'
        }
      ],
      updatedAt: new Date()
    });

    console.log('\n✅ Firestore collections and documents created successfully!');
    console.log('\n📊 Created Collections:');
    console.log('   • users/ - User profiles with subcollections');
    console.log('   • meetings/ - Meeting data with subcollections');
    console.log('   • voiceProfiles/ - Global voice profiles');
    console.log('   • customRules/ - Global custom rules');
    console.log('   • analytics/ - Daily/weekly/monthly analytics');
    console.log('   • cache/ - TTS cache and sessions');
    console.log('   • systemConfig/ - System configuration');
    
    console.log('\n📁 Collections Created:');
    console.log('   • users/ with subcollections: voiceProfiles/, customRules/');
    console.log('   • meetings/ with subcollections: transcripts/, speakers/, aiResponses/, notes/, analytics/');
    console.log('   • voiceProfiles/ - Global voice profiles');
    console.log('   • customRules/ - Global custom rules');
    console.log('   • dailyAnalytics/, weeklyAnalytics/, monthlyAnalytics/ - Analytics data');
    console.log('   • ttsCache/, sessions/ - Cache and session data');
    console.log('   • systemConfig/ - System configuration');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Create the required Firestore indexes');
    console.log('   2. Deploy security rules');
    console.log('   3. Set up Firebase Storage buckets');
    console.log('   4. Test the Universal Assistant with real data');

  } catch (error) {
    console.error('❌ Error setting up Firestore collections:', error);
    process.exit(1);
  }
}

setupFirestoreCollections().then(() => {
  console.log('\n🔥 Firestore database structure is ready for Universal Assistant!');
  process.exit(0);
});