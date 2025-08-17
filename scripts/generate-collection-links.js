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

async function generateCollectionLinks() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID;
  
  if (!projectId) {
    console.error('❌ Firebase project ID not found');
    process.exit(1);
  }

  console.log('🔗 Firebase Console Collection Creation Links\n');
  console.log(`Project: ${projectId}\n`);

  const baseUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data`;
  
  // Generate collection creation links
  const collections = [
    {
      name: 'users',
      description: 'User profiles and settings',
      path: '~2Fusers'
    },
    {
      name: 'meetings', 
      description: 'Meeting data and metadata',
      path: '~2Fmeetings'
    },
    {
      name: 'voiceProfiles',
      description: 'Global voice profiles',
      path: '~2FvoiceProfiles'
    },
    {
      name: 'customRules',
      description: 'Global custom conversation rules',
      path: '~2FcustomRules'
    },
    {
      name: 'systemConfig',
      description: 'System configuration and settings',
      path: '~2FsystemConfig'
    },
    {
      name: 'dailyAnalytics',
      description: 'Daily analytics and metrics',
      path: '~2FdailyAnalytics'
    },
    {
      name: 'weeklyAnalytics',
      description: 'Weekly analytics aggregates',
      path: '~2FweeklyAnalytics'
    },
    {
      name: 'monthlyAnalytics',
      description: 'Monthly analytics aggregates',
      path: '~2FmonthlyAnalytics'
    },
    {
      name: 'ttsCache',
      description: 'TTS audio cache metadata',
      path: '~2FttsCache'
    },
    {
      name: 'sessions',
      description: 'User session tracking',
      path: '~2Fsessions'
    }
  ];

  console.log('📋 **Main Collections** - Click to create in Firebase Console:\n');
  
  collections.forEach((collection, index) => {
    console.log(`${index + 1}. **${collection.name}** - ${collection.description}`);
    console.log(`   🔗 ${baseUrl}${collection.path}`);
    console.log('');
  });

  console.log('\n📁 **Subcollections** - Create these after creating the parent collections:\n');
  
  const subcollections = [
    {
      parent: 'users/{userId}',
      name: 'voiceProfiles',
      description: 'User voice profiles',
      path: '~2Fusers~2F{userId}~2FvoiceProfiles'
    },
    {
      parent: 'users/{userId}',
      name: 'customRules', 
      description: 'User custom rules',
      path: '~2Fusers~2F{userId}~2FcustomRules'
    },
    {
      parent: 'meetings/{meetingId}',
      name: 'transcripts',
      description: 'Meeting transcript entries',
      path: '~2Fmeetings~2F{meetingId}~2Ftranscripts'
    },
    {
      parent: 'meetings/{meetingId}',
      name: 'speakers',
      description: 'Meeting speaker profiles',
      path: '~2Fmeetings~2F{meetingId}~2Fspeakers'
    },
    {
      parent: 'meetings/{meetingId}',
      name: 'aiResponses',
      description: 'AI responses during meeting',
      path: '~2Fmeetings~2F{meetingId}~2FaiResponses'
    },
    {
      parent: 'meetings/{meetingId}',
      name: 'notes',
      description: 'Meeting notes and action items',
      path: '~2Fmeetings~2F{meetingId}~2Fnotes'
    },
    {
      parent: 'meetings/{meetingId}',
      name: 'analytics',
      description: 'Meeting-specific analytics',
      path: '~2Fmeetings~2F{meetingId}~2Fanalytics'
    }
  ];

  subcollections.forEach((subcollection, index) => {
    console.log(`${index + 1}. **${subcollection.parent}/${subcollection.name}** - ${subcollection.description}`);
    console.log(`   🔗 ${baseUrl}${subcollection.path}`);
    console.log(`   ⚠️  Note: Replace {userId} or {meetingId} with actual document IDs`);
    console.log('');
  });

  console.log('\n🎯 **How to Use These Links:**\n');
  console.log('1. **Click each link** to open Firebase Console');
  console.log('2. **Create collections** by adding your first document');
  console.log('3. **Use sample data** from the setup scripts for document structure');
  console.log('4. **Subcollections** are created automatically when you add documents');
  
  console.log('\n🚀 **Alternative: Automated Setup**\n');
  console.log('Instead of manual creation, run the automated script:');
  console.log('```bash');
  console.log('node scripts/setup-firestore-collections.js');
  console.log('```');
  console.log('This creates all collections and sample documents automatically!');

  console.log('\n📊 **Sample Document Templates:**\n');
  
  const sampleDocs = {
    users: {
      email: 'user@example.com',
      displayName: 'Demo User',
      createdAt: 'new Date()',
      preferences: {
        language: 'en-US',
        theme: 'light'
      }
    },
    meetings: {
      title: 'Sample Meeting',
      organizerId: 'user-id-here',
      type: 'standup',
      status: 'active',
      startTime: 'new Date()'
    },
    systemConfig: {
      models: [],
      updatedAt: 'new Date()'
    }
  };

  Object.entries(sampleDocs).forEach(([collection, sample]) => {
    console.log(`**${collection}** sample document:`);
    console.log('```json');
    console.log(JSON.stringify(sample, null, 2));
    console.log('```\n');
  });
}

generateCollectionLinks().then(() => {
  console.log('🔥 Collection creation links generated!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error generating links:', error);
  process.exit(1);
});