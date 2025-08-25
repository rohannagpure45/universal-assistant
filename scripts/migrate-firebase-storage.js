#!/usr/bin/env node
/**
 * Firebase Storage Data Layout Migration Script
 * 
 * Migrates existing Firebase Storage structure from legacy paths to new structure
 * that matches the corrected storage rules and actual code usage patterns.
 * 
 * CRITICAL: This script performs destructive operations. 
 * Ensure you have a complete backup before running.
 * 
 * Usage: node scripts/migrate-firebase-storage.js
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
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'universal-assistant-prod.appspot.com'
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK');
    console.error('   Make sure FIREBASE_SERVICE_ACCOUNT_PATH is set or place firebase-service-account.json in project root');
    process.exit(1);
  }
}

const bucket = admin.storage().bucket();

/**
 * Migration Configuration
 * Maps legacy paths to new paths based on corrected storage rules
 */
const MIGRATION_MAP = {
  // Legacy audio-clips to voice-samples structure
  'audio-clips/': {
    newBasePath: 'voice-samples/',
    pattern: /^audio-clips\/([^\/]+)\/([^\/]+)\/(.+)$/,
    transform: (matches, metadata) => {
      const [, userId, meetingId, fileName] = matches;
      // Extract deepgramVoiceId from metadata or generate from filename
      const deepgramVoiceId = metadata?.deepgramVoiceId || 
        fileName.replace(/\.(webm|mp3|wav)$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // New format: voice-samples/{deepgramVoiceId}/{timestamp}_{meetingId}_{duration}s.webm
      const timestamp = Date.now();
      const duration = metadata?.duration || '0';
      const newFileName = `${timestamp}_${meetingId}_${duration}s.webm`;
      
      return `voice-samples/${deepgramVoiceId}/${newFileName}`;
    }
  },
  
  // Update meeting recordings structure
  'recordings/': {
    newBasePath: 'meeting-recordings/',
    pattern: /^recordings\/([^\/]+)\/(.+)$/,
    transform: (matches, metadata) => {
      const [, meetingId, fileName] = matches;
      return `meeting-recordings/${meetingId}/${fileName}`;
    }
  },
  
  // Migrate TTS cache files
  'tts/': {
    newBasePath: 'tts-cache/',
    pattern: /^tts\/(.+)$/,
    transform: (matches, metadata) => {
      const [, fileName] = matches;
      // Ensure .mp3 extension for TTS cache
      const cacheFileName = fileName.endsWith('.mp3') ? fileName : `${fileName}.mp3`;
      return `tts-cache/${cacheFileName}`;
    }
  }
};

/**
 * Migration statistics tracking
 */
const stats = {
  processed: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  totalSize: 0,
  startTime: Date.now()
};

/**
 * Migrate a single file from legacy path to new path
 */
async function migrateFile(file, newPath, retries = 3) {
  try {
    console.log(`  📄 ${file.name} → ${newPath}`);
    
    // Copy file to new location with metadata preservation
    const [metadata] = await file.getMetadata();
    await file.copy(bucket.file(newPath), {
      metadata: {
        metadata: metadata.metadata || {},
        contentType: metadata.contentType
      }
    });
    
    // Verify the copy was successful
    const newFile = bucket.file(newPath);
    const [exists] = await newFile.exists();
    if (!exists) {
      throw new Error('Copy verification failed - new file does not exist');
    }
    
    // Delete original file
    await file.delete();
    
    stats.migrated++;
    stats.totalSize += parseInt(metadata.size || 0);
    
  } catch (error) {
    if (retries > 0) {
      console.warn(`  ⚠️  Retry ${4 - retries}/3 for ${file.name}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return migrateFile(file, newPath, retries - 1);
    } else {
      console.error(`  ❌ Failed to migrate ${file.name}: ${error.message}`);
      stats.errors++;
    }
  }
}

/**
 * Process files with a specific legacy path prefix
 */
async function processLegacyPath(legacyPrefix, config) {
  console.log(`\n🔄 Processing legacy path: ${legacyPrefix}`);
  
  const [files] = await bucket.getFiles({
    prefix: legacyPrefix,
    maxResults: 1000 // Process in batches to avoid memory issues
  });
  
  console.log(`   Found ${files.length} files to process`);
  
  for (const file of files) {
    stats.processed++;
    
    // Skip directories (files ending with /)
    if (file.name.endsWith('/')) {
      stats.skipped++;
      continue;
    }
    
    // Match against pattern and transform path
    const matches = file.name.match(config.pattern);
    if (!matches) {
      console.warn(`  ⚠️  Skipping ${file.name} - doesn't match pattern`);
      stats.skipped++;
      continue;
    }
    
    try {
      // Get file metadata for transformation
      const [metadata] = await file.getMetadata();
      const customMetadata = metadata.metadata || {};
      
      // Transform to new path
      const newPath = config.transform(matches, customMetadata);
      
      // Skip if already in correct location
      if (file.name === newPath) {
        stats.skipped++;
        continue;
      }
      
      await migrateFile(file, newPath);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${file.name}: ${error.message}`);
      stats.errors++;
    }
  }
}

/**
 * Create necessary directory structure in Firebase Storage
 */
async function createDirectoryStructure() {
  console.log('\n📁 Creating directory structure...');
  
  const directories = [
    'voice-samples/.keep',
    'meeting-recordings/.keep',
    'meeting-clips/.keep',
    'identification-samples/.keep',
    'user-uploads/.keep',
    'tts-cache/.keep',
    'temp/.keep',
    'exports/.keep',
    'system/.keep',
    'profile-images/.keep'
  ];
  
  for (const dir of directories) {
    try {
      const file = bucket.file(dir);
      const [exists] = await file.exists();
      if (!exists) {
        await file.save('', { metadata: { contentType: 'text/plain' } });
        console.log(`   ✅ Created ${dir.replace('/.keep', '/')} directory`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not create ${dir}: ${error.message}`);
    }
  }
}

/**
 * Validate migration prerequisites
 */
async function validatePrerequisites() {
  console.log('🔍 Validating migration prerequisites...\n');
  
  // Check bucket access
  try {
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Storage bucket access verified');
  } catch (error) {
    throw new Error(`Cannot access storage bucket: ${error.message}`);
  }
  
  // Check for existing new-format files to avoid conflicts
  const potentialConflicts = ['voice-samples/', 'meeting-recordings/', 'tts-cache/'];
  for (const prefix of potentialConflicts) {
    const [files] = await bucket.getFiles({ prefix, maxResults: 5 });
    if (files.length > 0) {
      console.warn(`⚠️  Warning: ${files.length} files already exist in ${prefix}`);
      console.warn('   Migration may overwrite existing files');
    }
  }
  
  console.log('✅ Prerequisites validated\n');
}

/**
 * Generate migration report
 */
function generateReport() {
  const duration = (Date.now() - stats.startTime) / 1000;
  const sizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
  
  console.log('\n📊 MIGRATION REPORT');
  console.log('='.repeat(50));
  console.log(`Files processed: ${stats.processed}`);
  console.log(`Files migrated:  ${stats.migrated}`);
  console.log(`Files skipped:   ${stats.skipped}`);
  console.log(`Files failed:    ${stats.errors}`);
  console.log(`Total size:      ${sizeMB} MB`);
  console.log(`Duration:        ${duration.toFixed(1)} seconds`);
  
  if (stats.errors > 0) {
    console.log('\n❌ Migration completed with errors');
    console.log('   Review the error messages above and consider re-running');
    return false;
  } else {
    console.log('\n✅ Migration completed successfully');
    return true;
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Firebase Storage Migration Started');
  console.log('=====================================\n');
  
  try {
    // Validate prerequisites
    await validatePrerequisites();
    
    // Create directory structure
    await createDirectoryStructure();
    
    // Process each legacy path pattern
    for (const [legacyPrefix, config] of Object.entries(MIGRATION_MAP)) {
      await processLegacyPath(legacyPrefix, config);
    }
    
    // Generate final report
    const success = generateReport();
    
    if (success) {
      console.log('\n🎉 Next steps:');
      console.log('   1. Update Firebase Storage rules using corrected-storage.rules');
      console.log('   2. Deploy the new storage rules: firebase deploy --only storage');
      console.log('   3. Test application functionality with new structure');
      console.log('   4. Monitor application logs for any remaining path issues');
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
  console.log('\n❌ Migration was not completed - storage may be in inconsistent state');
  console.log('   Consider running the migration again');
  process.exit(1);
});

// Run migration if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main, migrateFile, processLegacyPath };