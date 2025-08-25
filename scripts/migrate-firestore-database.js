#!/usr/bin/env node
/**
 * Firestore Database Migration Script
 * 
 * Migrates existing Firestore document structure to match the corrected
 * Firestore rules and actual code usage patterns from database.ts types.
 * 
 * CRITICAL: This script performs destructive operations on your database.
 * Ensure you have a complete Firestore backup before running.
 * 
 * Usage: node scripts/migrate-firestore-database.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
    path.join(__dirname, '../firebase-service-account.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK');
    console.error('   Make sure FIREBASE_SERVICE_ACCOUNT_PATH is set or place firebase-service-account.json in project root');
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Migration statistics tracking
 */
const stats = {
  collections: {
    processed: 0,
    migrated: 0,
    errors: 0
  },
  documents: {
    processed: 0,
    migrated: 0,
    errors: 0,
    skipped: 0
  },
  fields: {
    added: 0,
    updated: 0,
    removed: 0
  },
  startTime: Date.now()
};

/**
 * Field transformation utilities
 */
const FieldTransforms = {
  // Convert various timestamp formats to Firestore Timestamp
  toFirestoreTimestamp(value) {
    if (!value) return admin.firestore.FieldValue.serverTimestamp();
    if (value instanceof admin.firestore.Timestamp) return value;
    if (value._seconds !== undefined) return new admin.firestore.Timestamp(value._seconds, value._nanoseconds || 0);
    if (typeof value === 'string') return admin.firestore.Timestamp.fromDate(new Date(value));
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    return admin.firestore.FieldValue.serverTimestamp();
  },
  
  // Ensure array field exists
  ensureArray(value, defaultValue = []) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return defaultValue;
    return [value]; // Convert single value to array
  },
  
  // Ensure numeric field with fallback
  ensureNumber(value, defaultValue = 0) {
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  },
  
  // Ensure boolean field with fallback
  ensureBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
  },
  
  // Ensure string field with fallback
  ensureString(value, defaultValue = '') {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  }
};

/**
 * Collection-specific migration rules based on database.ts types
 */
const COLLECTION_MIGRATIONS = {
  // Voice Library collection - matches VoiceLibraryEntry interface
  voice_library: {
    requiredFields: {
      deepgramVoiceId: (doc) => doc.id, // Use document ID as deepgramVoiceId
      confirmed: (doc) => FieldTransforms.ensureBoolean(doc.confirmed, false),
      confidence: (doc) => FieldTransforms.ensureNumber(doc.confidence, 0.5),
      firstHeard: (doc) => FieldTransforms.toFirestoreTimestamp(doc.firstHeard),
      lastHeard: (doc) => FieldTransforms.toFirestoreTimestamp(doc.lastHeard),
      meetingsCount: (doc) => FieldTransforms.ensureNumber(doc.meetingsCount, 0),
      totalSpeakingTime: (doc) => FieldTransforms.ensureNumber(doc.totalSpeakingTime, 0),
      audioSamples: (doc) => FieldTransforms.ensureArray(doc.audioSamples),
      identificationHistory: (doc) => FieldTransforms.ensureArray(doc.identificationHistory)
    },
    optionalFields: {
      userId: (doc) => doc.userId || null,
      userName: (doc) => doc.userName || null
    },
    validation: (doc) => {
      return doc.confidence >= 0 && doc.confidence <= 1;
    }
  },
  
  // Meeting Types collection - matches MeetingTypeConfig interface
  meeting_types: {
    requiredFields: {
      name: (doc) => FieldTransforms.ensureString(doc.name || doc.title, 'Untitled Meeting'),
      ownerId: (doc) => FieldTransforms.ensureString(doc.ownerId || doc.hostId),
      systemPrompt: (doc) => FieldTransforms.ensureString(doc.systemPrompt, 'Default meeting assistant'),
      aiSettings: (doc) => doc.aiSettings || {
        enableTranscription: true,
        enableSummaries: true,
        summaryStyle: 'bullets',
        autoIdentifySpeakers: true
      },
      createdAt: (doc) => FieldTransforms.toFirestoreTimestamp(doc.createdAt)
    },
    optionalFields: {
      regularParticipants: (doc) => FieldTransforms.ensureArray(doc.regularParticipants || doc.participants),
      contextRules: (doc) => FieldTransforms.ensureString(doc.contextRules, ''),
      files: (doc) => FieldTransforms.ensureArray(doc.files),
      defaultModel: (doc) => FieldTransforms.ensureString(doc.defaultModel, 'gpt-4o'),
      modelOverrides: (doc) => doc.modelOverrides || {},
      modelSpecificPrompts: (doc) => doc.modelSpecificPrompts || {},
      modelCompatibility: (doc) => doc.modelCompatibility || {
        recommendedModel: 'gpt-4o',
        performanceHistory: []
      }
    }
  },
  
  // Needs Identification collection - matches NeedsIdentification interface
  needs_identification: {
    requiredFields: {
      meetingId: (doc) => FieldTransforms.ensureString(doc.meetingId),
      hostId: (doc) => FieldTransforms.ensureString(doc.hostId),
      voiceId: (doc) => FieldTransforms.ensureString(doc.voiceId || doc.deepgramVoiceId),
      deepgramVoiceId: (doc) => FieldTransforms.ensureString(doc.deepgramVoiceId || doc.voiceId),
      meetingTitle: (doc) => FieldTransforms.ensureString(doc.meetingTitle, 'Unknown Meeting'),
      meetingDate: (doc) => FieldTransforms.toFirestoreTimestamp(doc.meetingDate),
      meetingTypeId: (doc) => FieldTransforms.ensureString(doc.meetingTypeId, 'default'),
      speakerLabel: (doc) => FieldTransforms.ensureString(doc.speakerLabel, 'Unknown Speaker'),
      sampleTranscripts: (doc) => FieldTransforms.ensureArray(doc.sampleTranscripts),
      audioUrl: (doc) => FieldTransforms.ensureString(doc.audioUrl),
      status: (doc) => FieldTransforms.ensureString(doc.status, 'pending'),
      createdAt: (doc) => FieldTransforms.toFirestoreTimestamp(doc.createdAt)
    },
    optionalFields: {
      suggestedMatches: (doc) => FieldTransforms.ensureArray(doc.suggestedMatches),
      resolvedUserId: (doc) => doc.resolvedUserId || null,
      resolvedUserName: (doc) => doc.resolvedUserName || null,
      resolvedAt: (doc) => doc.resolvedAt ? FieldTransforms.toFirestoreTimestamp(doc.resolvedAt) : null
    }
  },
  
  // Voice Matches collection - matches VoiceMatch interface  
  voice_matches: {
    requiredFields: {
      deepgramVoiceId: (doc) => doc.id, // Use document ID
      lastUpdated: (doc) => FieldTransforms.toFirestoreTimestamp(doc.lastUpdated),
      meetingHistory: (doc) => FieldTransforms.ensureArray(doc.meetingHistory)
    },
    optionalFields: {
      confirmedUserId: (doc) => doc.confirmedUserId || null
    }
  },
  
  // Users collection - matches UserUpdate interface
  users: {
    requiredFields: {
      email: (doc) => FieldTransforms.ensureString(doc.email),
      displayName: (doc) => FieldTransforms.ensureString(doc.displayName, doc.email || 'Unknown User'),
      createdAt: (doc) => FieldTransforms.toFirestoreTimestamp(doc.createdAt),
      isAdmin: (doc) => FieldTransforms.ensureBoolean(doc.isAdmin, false),
      settings: (doc) => doc.settings || {
        ttsSpeed: 1.0,
        llmModel: 'gpt-4o',
        maxResponseTokens: 1500,
        preferredLanguage: 'en',
        timezone: 'UTC'
      }
    },
    optionalFields: {
      primaryVoiceId: (doc) => doc.primaryVoiceId || null
    }
  },
  
  // Meetings collection - matches MeetingUpdate interface
  meetings: {
    requiredFields: {
      hostId: (doc) => FieldTransforms.ensureString(doc.hostId),
      title: (doc) => FieldTransforms.ensureString(doc.title || doc.name, 'Untitled Meeting'),
      status: (doc) => FieldTransforms.ensureString(doc.status, 'scheduled'),
      date: (doc) => FieldTransforms.toFirestoreTimestamp(doc.date || doc.createdAt),
      currentModel: (doc) => FieldTransforms.ensureString(doc.currentModel, 'gpt-4o'),
      participants: (doc) => doc.participants || {},
      transcript: (doc) => FieldTransforms.ensureArray(doc.transcript),
      aiModelHistory: (doc) => FieldTransforms.ensureArray(doc.aiModelHistory)
    },
    optionalFields: {
      meetingTypeId: (doc) => doc.meetingTypeId || 'default',
      participantIds: (doc) => FieldTransforms.ensureArray(doc.participantIds),
      duration: (doc) => doc.duration ? FieldTransforms.ensureNumber(doc.duration) : null,
      modelContext: (doc) => doc.modelContext || null,
      notes: (doc) => doc.notes || null,
      keyPoints: (doc) => FieldTransforms.ensureArray(doc.keyPoints),
      actionItems: (doc) => FieldTransforms.ensureArray(doc.actionItems)
    }
  }
};

/**
 * Migrate a single document according to collection rules
 */
async function migrateDocument(collection, docRef, docData, rules) {
  const updates = {};
  let needsUpdate = false;
  
  // Add required fields
  for (const [fieldName, transformer] of Object.entries(rules.requiredFields)) {
    try {
      const currentValue = docData[fieldName];
      const newValue = transformer(docData);
      
      if (currentValue === undefined || currentValue !== newValue) {
        updates[fieldName] = newValue;
        needsUpdate = true;
        
        if (currentValue === undefined) {
          stats.fields.added++;
        } else {
          stats.fields.updated++;
        }
      }
    } catch (error) {
      console.error(`    ❌ Error processing required field ${fieldName}: ${error.message}`);
    }
  }
  
  // Add optional fields
  if (rules.optionalFields) {
    for (const [fieldName, transformer] of Object.entries(rules.optionalFields)) {
      try {
        const currentValue = docData[fieldName];
        const newValue = transformer(docData);
        
        if (currentValue === undefined && newValue !== null && newValue !== undefined) {
          updates[fieldName] = newValue;
          needsUpdate = true;
          stats.fields.added++;
        }
      } catch (error) {
        console.error(`    ⚠️  Error processing optional field ${fieldName}: ${error.message}`);
      }
    }
  }
  
  // Validate document after transformation
  if (rules.validation) {
    const finalDoc = { ...docData, ...updates };
    if (!rules.validation(finalDoc)) {
      console.error(`    ❌ Document ${docRef.id} failed validation after migration`);
      stats.documents.errors++;
      return false;
    }
  }
  
  // Apply updates if needed
  if (needsUpdate) {
    try {
      // Filter out undefined values to avoid Firestore errors
      const cleanUpdates = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          cleanUpdates[key] = value;
        }
      }
      
      if (Object.keys(cleanUpdates).length > 0) {
        await docRef.update(cleanUpdates);
        console.log(`    ✅ Updated ${docRef.id} (${Object.keys(cleanUpdates).length} fields)`);
        stats.documents.migrated++;
        return true;
      } else {
        console.log(`    ⏭️  Skipped ${docRef.id} (no valid updates after filtering)`);
        stats.documents.skipped++;
        return true;
      }
    } catch (error) {
      console.error(`    ❌ Failed to update ${docRef.id}: ${error.message}`);
      stats.documents.errors++;
      return false;
    }
  } else {
    console.log(`    ⏭️  Skipped ${docRef.id} (already up to date)`);
    stats.documents.skipped++;
    return true;
  }
}

/**
 * Migrate a collection according to its rules
 */
async function migrateCollection(collectionName, rules) {
  console.log(`\n🔄 Processing collection: ${collectionName}`);
  stats.collections.processed++;
  
  try {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    console.log(`   Found ${snapshot.size} documents to process`);
    
    let batchCount = 0;
    const batchSize = 10; // Process in small batches to avoid timeouts
    
    for (const doc of snapshot.docs) {
      stats.documents.processed++;
      
      try {
        const docData = doc.data();
        await migrateDocument(collectionName, doc.ref, docData, rules);
        
        batchCount++;
        if (batchCount >= batchSize) {
          console.log(`   📊 Processed ${batchCount} documents in batch - taking 1s break...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          batchCount = 0;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing document ${doc.id}: ${error.message}`);
        stats.documents.errors++;
      }
    }
    
    stats.collections.migrated++;
    console.log(`   ✅ Completed migration of ${collectionName}`);
    
  } catch (error) {
    console.error(`   ❌ Failed to migrate collection ${collectionName}: ${error.message}`);
    stats.collections.errors++;
  }
}

/**
 * Create missing collections with proper structure
 */
async function createMissingCollections() {
  console.log('\n📁 Creating missing collections...');
  
  const requiredCollections = [
    { name: 'systemConfig', sampleDoc: { 
      version: '1.0.0', 
      features: { voiceIdentification: true, ttsEnabled: true },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }},
    { name: 'agents', sampleDoc: {
      name: 'DefaultAgent',
      prompt: 'You are a helpful meeting assistant',
      enabled: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }},
    { name: 'ttsCache', sampleDoc: {
      hash: 'sample_hash',
      text: 'Hello world',
      url: 'gs://bucket/tts-cache/sample.mp3',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    }},
    { name: 'customRules', sampleDoc: {
      name: 'Sample Rule',
      userId: 'sample_user',
      conditions: [],
      actions: [],
      isPublic: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }}
  ];
  
  for (const { name, sampleDoc } of requiredCollections) {
    try {
      const collectionRef = db.collection(name);
      const snapshot = await collectionRef.limit(1).get();
      
      if (snapshot.empty) {
        await collectionRef.doc('_sample').set(sampleDoc);
        console.log(`   ✅ Created ${name} collection with sample document`);
      } else {
        console.log(`   ⏭️  Collection ${name} already exists`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to create collection ${name}: ${error.message}`);
    }
  }
}

/**
 * Backup critical collections before migration
 */
async function createBackup() {
  console.log('\n💾 Creating migration backup...');
  
  const backupCollections = ['users', 'meetings', 'meeting_types', 'voice_library'];
  const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  for (const collectionName of backupCollections) {
    try {
      const sourceRef = db.collection(collectionName);
      const backupRef = db.collection(`${collectionName}_backup_${backupTimestamp}`);
      
      const snapshot = await sourceRef.get();
      const batch = db.batch();
      
      let count = 0;
      snapshot.docs.forEach(doc => {
        batch.set(backupRef.doc(doc.id), doc.data());
        count++;
      });
      
      if (count > 0) {
        await batch.commit();
        console.log(`   ✅ Backed up ${count} documents from ${collectionName}`);
      }
      
    } catch (error) {
      console.error(`   ⚠️  Failed to backup ${collectionName}: ${error.message}`);
    }
  }
}

/**
 * Generate migration report
 */
function generateReport() {
  const duration = (Date.now() - stats.startTime) / 1000;
  
  console.log('\n📊 FIRESTORE MIGRATION REPORT');
  console.log('='.repeat(50));
  console.log(`Collections processed: ${stats.collections.processed}`);
  console.log(`Collections migrated:  ${stats.collections.migrated}`);
  console.log(`Collection errors:     ${stats.collections.errors}`);
  console.log('');
  console.log(`Documents processed:   ${stats.documents.processed}`);
  console.log(`Documents migrated:    ${stats.documents.migrated}`);
  console.log(`Documents skipped:     ${stats.documents.skipped}`);
  console.log(`Document errors:       ${stats.documents.errors}`);
  console.log('');
  console.log(`Fields added:          ${stats.fields.added}`);
  console.log(`Fields updated:        ${stats.fields.updated}`);
  console.log(`Fields removed:        ${stats.fields.removed}`);
  console.log(`Duration:              ${duration.toFixed(1)} seconds`);
  
  const hasErrors = stats.collections.errors > 0 || stats.documents.errors > 0;
  
  if (hasErrors) {
    console.log('\n❌ Migration completed with errors');
    console.log('   Review the error messages above');
    console.log('   Consider running again or fixing issues manually');
    return false;
  } else {
    console.log('\n✅ Migration completed successfully');
    return true;
  }
}

/**
 * Validate migration prerequisites
 */
async function validatePrerequisites() {
  console.log('🔍 Validating migration prerequisites...\n');
  
  // Test database access
  try {
    await db.collection('users').limit(1).get();
    console.log('✅ Firestore database access verified');
  } catch (error) {
    throw new Error(`Cannot access Firestore database: ${error.message}`);
  }
  
  // Check for existing backup collections
  try {
    const collections = await db.listCollections();
    const backupCollections = collections.filter(c => c.id.includes('_backup_'));
    if (backupCollections.length > 0) {
      console.log(`⚠️  Found ${backupCollections.length} existing backup collections`);
      console.log('   Consider cleaning up old backups after migration');
    }
  } catch (error) {
    console.warn('⚠️  Could not list collections for backup check');
  }
  
  console.log('✅ Prerequisites validated\n');
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Firestore Database Migration Started');
  console.log('======================================\n');
  
  try {
    // Validate prerequisites
    await validatePrerequisites();
    
    // Create backup
    await createBackup();
    
    // Create missing collections
    await createMissingCollections();
    
    // Run migrations for each collection
    for (const [collectionName, rules] of Object.entries(COLLECTION_MIGRATIONS)) {
      await migrateCollection(collectionName, rules);
    }
    
    // Generate final report
    const success = generateReport();
    
    if (success) {
      console.log('\n🎉 Next steps:');
      console.log('   1. Update Firestore rules using corrected-firestore.rules');
      console.log('   2. Deploy the new rules: firebase deploy --only firestore:rules');
      console.log('   3. Test application functionality with migrated data');
      console.log('   4. Monitor application logs for any data format issues');
      console.log('   5. Clean up backup collections after confirming migration success');
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Migration failed with critical error:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle script interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Migration interrupted by user');
  generateReport();
  console.log('\n❌ Migration was not completed - database may be in inconsistent state');
  console.log('   Consider running the migration again');
  console.log('   Restore from backup collections if needed');
  process.exit(1);
});

// Run migration if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { 
  main, 
  migrateDocument, 
  migrateCollection, 
  COLLECTION_MIGRATIONS,
  FieldTransforms 
};