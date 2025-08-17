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

async function generateIndexLinks() {
  console.log('🔍 Running queries to generate Firebase index creation links...\n');
  
  try {
    // Create sample data first
    console.log('📝 Creating sample data for index generation...');
    
    const sampleUserId = 'sample-user-' + Date.now();
    const sampleMeetingId = 'sample-meeting-' + Date.now();
    
    // Create sample meeting
    await adminDb.collection('meetings').doc(sampleMeetingId).set({
      title: 'Sample Meeting for Index Generation',
      organizerId: sampleUserId,
      participants: [sampleUserId, 'participant-1', 'participant-2'],
      startTime: new Date(),
      status: 'completed',
      type: 'standup'
    });
    
    // Create sample transcript entries
    await adminDb.collection('meetings').doc(sampleMeetingId)
      .collection('transcripts').add({
        speakerId: 'speaker-1',
        text: 'Sample transcript entry',
        timestamp: new Date(),
        confidence: 0.95
      });
    
    // Create sample voice profile
    await adminDb.collection('users').doc(sampleUserId)
      .collection('voiceProfiles').add({
        name: 'Sample Voice Profile',
        isDefault: true,
        createdAt: new Date()
      });
    
    // Create sample custom rule
    await adminDb.collection('customRules').add({
      name: 'Sample Rule',
      ownerId: sampleUserId,
      priority: 1,
      isActive: true,
      isPublic: false,
      usageCount: 5,
      createdAt: new Date()
    });
    
    // Create sample analytics
    await adminDb.collection('dailyAnalytics').doc('2025-01-15').set({
      date: '2025-01-15',
      totalMeetings: 10,
      createdAt: new Date()
    });
    
    // Create sample TTS cache
    await adminDb.collection('ttsCache').add({
      text: 'Sample TTS text',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    });
    
    console.log('✅ Sample data created\n');
    
    // Now run the queries that will trigger index creation prompts
    console.log('🚀 Running queries to trigger index creation links...\n');
    
    const queries = [
      {
        name: 'Meetings by organizer and startTime (descending)',
        query: async () => {
          try {
            await adminDb.collection('meetings')
              .where('organizerId', '==', sampleUserId)
              .orderBy('startTime', 'desc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: meetings by organizerId + startTime (desc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Meetings by participants and startTime (descending)',
        query: async () => {
          try {
            await adminDb.collection('meetings')
              .where('participants', 'array-contains', sampleUserId)
              .orderBy('startTime', 'desc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: meetings by participants + startTime (desc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Meetings by status and startTime (descending)',
        query: async () => {
          try {
            await adminDb.collection('meetings')
              .where('status', '==', 'completed')
              .orderBy('startTime', 'desc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: meetings by status + startTime (desc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Transcript entries by speakerId and timestamp (ascending)',
        query: async () => {
          try {
            await adminDb.collection('meetings').doc(sampleMeetingId)
              .collection('transcripts')
              .where('speakerId', '==', 'speaker-1')
              .orderBy('timestamp', 'asc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: transcript entries by speakerId + timestamp (asc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Transcript entries by confidence and timestamp (ascending)',
        query: async () => {
          try {
            await adminDb.collection('meetings').doc(sampleMeetingId)
              .collection('transcripts')
              .where('confidence', '>', 0.8)
              .orderBy('confidence', 'asc')
              .orderBy('timestamp', 'asc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: transcript entries by confidence + timestamp (asc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Voice profiles by isDefault and createdAt (descending)',
        query: async () => {
          try {
            await adminDb.collection('users').doc(sampleUserId)
              .collection('voiceProfiles')
              .where('isDefault', '==', true)
              .orderBy('createdAt', 'desc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: voice profiles by isDefault + createdAt (desc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Custom rules by ownerId, priority, and isActive (descending)',
        query: async () => {
          try {
            await adminDb.collection('customRules')
              .where('ownerId', '==', sampleUserId)
              .where('isActive', '==', true)
              .orderBy('priority', 'desc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: custom rules by ownerId + isActive + priority (desc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'Custom rules by isPublic and usageCount (descending)',
        query: async () => {
          try {
            await adminDb.collection('customRules')
              .where('isPublic', '==', true)
              .orderBy('usageCount', 'desc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: custom rules by isPublic + usageCount (desc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      },
      
      {
        name: 'TTS cache by expiresAt (ascending)',
        query: async () => {
          try {
            await adminDb.collection('ttsCache')
              .orderBy('expiresAt', 'asc')
              .limit(1)
              .get();
          } catch (error) {
            console.log('📋 Index needed for: TTS cache by expiresAt (asc)');
            console.log('   Error:', error.message);
            if (error.message.includes('requires an index')) {
              const match = error.message.match(/https:\/\/[^\s]+/);
              if (match) {
                console.log('   🔗 Index creation link:', match[0]);
              }
            }
          }
        }
      }
    ];
    
    // Run all queries
    for (const { name, query } of queries) {
      console.log(`\n⚡ Testing: ${name}`);
      await query();
    }
    
    console.log('\n🧹 Cleaning up sample data...');
    
    // Cleanup sample data
    await adminDb.collection('meetings').doc(sampleMeetingId).delete();
    await adminDb.collection('users').doc(sampleUserId).delete();
    
    // Clean up custom rules
    const customRulesSnapshot = await adminDb.collection('customRules')
      .where('ownerId', '==', sampleUserId)
      .get();
    
    for (const doc of customRulesSnapshot.docs) {
      await doc.ref.delete();
    }
    
    // Clean up cache entries
    const cacheSnapshot = await adminDb.collection('ttsCache')
      .where('text', '==', 'Sample TTS text')
      .get();
    
    for (const doc of cacheSnapshot.docs) {
      await doc.ref.delete();
    }
    
    console.log('✅ Sample data cleaned up');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Click on the index creation links above');
    console.log('2. Create each required index in the Firebase Console');
    console.log('3. Wait for indexes to build (may take a few minutes)');
    console.log('4. Your queries will then work efficiently!');
    
  } catch (error) {
    console.error('❌ Error generating index links:', error);
  }
}

generateIndexLinks().then(() => {
  console.log('\n🔥 Index generation completed!');
  process.exit(0);
});