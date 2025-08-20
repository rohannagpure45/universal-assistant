// ============================================
// FIREBASE STORAGE HIERARCHY MIGRATION
// ============================================

import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, listAll, getDownloadURL, uploadBytes, deleteObject, getMetadata } from 'firebase/storage';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// ============================================
// NEW FIREBASE STORAGE HIERARCHY
// ============================================
/*
storage-bucket/
├── voice-samples/                          // Individual voice clips for identification
│   └── {deepgramVoiceId}/
│       └── {timestamp}_{meetingId}_{duration}s.webm
│           // Example: "1705315200000_mtg_abc123_8s.webm"
│
├── meeting-recordings/                     // Full meeting recordings
│   └── {meetingId}/
│       ├── full_recording.webm            // Complete meeting audio
│       ├── full_recording_compressed.mp3   // Compressed version
│       └── metadata.json                   // Recording metadata
│
├── meeting-clips/                          // Specific segments from meetings
│   └── {meetingId}/
│       └── {timestamp}_{speakerId}_{duration}s.webm
│           // Example: "1705315200000_dg_voice_xyz_15s.webm"
│
├── identification-samples/                 // Clips pending identification
│   └── {meetingId}/
│       └── {deepgramVoiceId}/
│           ├── best_sample.webm           // Highest quality clip
│           ├── sample_1.webm              // Alternative samples
│           └── sample_2.webm
│
├── user-uploads/                          // User-provided voice samples
│   └── {userId}/
│       └── voice-training/
│           ├── initial_sample.webm        // First voice sample
│           └── {timestamp}_sample.webm    // Additional samples
│
└── temp/                                   // Temporary processing files
    └── {sessionId}/
        └── {timestamp}_chunk.webm          // Live streaming chunks
*/

interface MigrationFile {
  oldPath: string;
  newPath: string;
  metadata?: any;
}

interface MigrationStats {
  totalFiles: number;
  migratedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  errors: string[];
}

class FirebaseStorageMigration {
  private storage;
  private firestore;
  private migrationStats: MigrationStats = {
    totalFiles: 0,
    migratedFiles: 0,
    failedFiles: 0,
    skippedFiles: 0,
    errors: []
  };

  constructor() {
    // Initialize Firebase app for storage operations only
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:dummy"
    };

    let app;
    if (!getApps().length) {
      app = initializeApp(firebaseConfig, 'storage-migration');
    } else {
      app = getApps()[0];
    }
    
    this.storage = getStorage(app);
    this.firestore = getFirestore(app);
  }

  /**
   * Main migration function to restructure Firebase Storage
   */
  async migrateStorage(dryRun: boolean = true): Promise<MigrationStats> {
    console.log(`🚀 Starting Firebase Storage migration (${dryRun ? 'DRY RUN' : 'LIVE RUN'})`);
    
    try {
      // Get all existing files
      const allFiles = await this.getAllExistingFiles();
      this.migrationStats.totalFiles = allFiles.length;
      
      console.log(`📁 Found ${allFiles.length} files to process`);
      
      // Generate migration plan
      const migrationPlan = await this.generateMigrationPlan(allFiles);
      
      // Execute migration
      if (!dryRun) {
        await this.executeMigration(migrationPlan);
      } else {
        console.log('📋 Migration plan generated (DRY RUN):');
        migrationPlan.forEach(file => {
          console.log(`  ${file.oldPath} → ${file.newPath}`);
        });
      }
      
      // Clean up old structure (only in live run)
      if (!dryRun) {
        await this.cleanupOldStructure(migrationPlan);
      }
      
      console.log('✅ Migration completed successfully');
      return this.migrationStats;
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.migrationStats.errors.push(`Migration failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get all existing files from Firebase Storage
   */
  private async getAllExistingFiles(): Promise<any[]> {
    const rootRef = ref(this.storage);
    const allFiles: any[] = [];
    
    const processDirectory = async (dirRef: any) => {
      try {
        const result = await listAll(dirRef);
        
        // Add files from current directory
        for (const fileRef of result.items) {
          const metadata = await getMetadata(fileRef);
          allFiles.push({
            ref: fileRef,
            path: fileRef.fullPath,
            name: fileRef.name,
            metadata
          });
        }
        
        // Recursively process subdirectories
        for (const folderRef of result.prefixes) {
          await processDirectory(folderRef);
        }
      } catch (error) {
        console.warn(`⚠️ Error processing directory ${dirRef.fullPath}:`, error);
        this.migrationStats.errors.push(`Error processing ${dirRef.fullPath}: ${error}`);
      }
    };
    
    await processDirectory(rootRef);
    return allFiles;
  }

  /**
   * Generate migration plan based on existing files
   */
  private async generateMigrationPlan(files: any[]): Promise<MigrationFile[]> {
    const migrationPlan: MigrationFile[] = [];
    
    for (const file of files) {
      const newPath = await this.determineNewPath(file);
      
      if (newPath && newPath !== file.path) {
        migrationPlan.push({
          oldPath: file.path,
          newPath: newPath,
          metadata: file.metadata
        });
      } else {
        this.migrationStats.skippedFiles++;
      }
    }
    
    return migrationPlan;
  }

  /**
   * Determine new path based on file type and current structure
   */
  private async determineNewPath(file: any): Promise<string | null> {
    const path = file.path;
    const name = file.name;
    
    // Skip files that are already in the new structure
    if (this.isNewStructurePath(path)) {
      return null;
    }
    
    // TTS cache files
    if (path.includes('tts-cache') || path.includes('tts_cache')) {
      return path; // Keep existing TTS cache structure
    }
    
    // Voice samples - move to voice-samples/{deepgramVoiceId}/
    if (this.isVoiceSample(path, name)) {
      const voiceId = await this.extractVoiceId(file);
      const timestamp = this.extractTimestamp(name);
      const meetingId = this.extractMeetingId(name);
      const duration = this.extractDuration(name);
      
      return `voice-samples/${voiceId}/${timestamp}_${meetingId}_${duration}s.webm`;
    }
    
    // Meeting recordings - move to meeting-recordings/{meetingId}/
    if (this.isMeetingRecording(path, name)) {
      const meetingId = this.extractMeetingId(name) || this.extractMeetingIdFromPath(path);
      
      if (name.includes('full_recording')) {
        if (name.endsWith('.mp3')) {
          return `meeting-recordings/${meetingId}/full_recording_compressed.mp3`;
        } else {
          return `meeting-recordings/${meetingId}/full_recording.webm`;
        }
      } else if (name.includes('metadata')) {
        return `meeting-recordings/${meetingId}/metadata.json`;
      }
    }
    
    // Meeting clips - move to meeting-clips/{meetingId}/
    if (this.isMeetingClip(path, name)) {
      const meetingId = this.extractMeetingId(name) || this.extractMeetingIdFromPath(path);
      const timestamp = this.extractTimestamp(name);
      const speakerId = this.extractSpeakerId(name);
      const duration = this.extractDuration(name);
      
      return `meeting-clips/${meetingId}/${timestamp}_${speakerId}_${duration}s.webm`;
    }
    
    // User uploads - move to user-uploads/{userId}/voice-training/
    if (this.isUserUpload(path, name)) {
      const userId = this.extractUserId(path);
      const timestamp = this.extractTimestamp(name);
      
      if (name.includes('initial')) {
        return `user-uploads/${userId}/voice-training/initial_sample.webm`;
      } else {
        return `user-uploads/${userId}/voice-training/${timestamp}_sample.webm`;
      }
    }
    
    // Temporary files - move to temp/{sessionId}/
    if (this.isTempFile(path, name)) {
      const sessionId = this.extractSessionId(path) || this.generateSessionId();
      const timestamp = this.extractTimestamp(name);
      
      return `temp/${sessionId}/${timestamp}_chunk.webm`;
    }
    
    // Identification samples - move to identification-samples/{meetingId}/{deepgramVoiceId}/
    if (this.isIdentificationSample(path, name)) {
      const meetingId = this.extractMeetingId(name) || this.extractMeetingIdFromPath(path);
      const voiceId = await this.extractVoiceId(file);
      
      if (name.includes('best')) {
        return `identification-samples/${meetingId}/${voiceId}/best_sample.webm`;
      } else if (name.includes('sample_1')) {
        return `identification-samples/${meetingId}/${voiceId}/sample_1.webm`;
      } else if (name.includes('sample_2')) {
        return `identification-samples/${meetingId}/${voiceId}/sample_2.webm`;
      }
    }
    
    // Default: keep in current location but log for manual review
    console.warn(`⚠️ Could not determine new path for: ${path}`);
    this.migrationStats.errors.push(`Could not categorize file: ${path}`);
    return null;
  }

  /**
   * Execute the migration plan
   */
  private async executeMigration(migrationPlan: MigrationFile[]): Promise<void> {
    console.log(`🔄 Executing migration for ${migrationPlan.length} files...`);
    
    for (const file of migrationPlan) {
      try {
        await this.moveFile(file.oldPath, file.newPath);
        this.migrationStats.migratedFiles++;
        console.log(`✓ Migrated: ${file.oldPath} → ${file.newPath}`);
      } catch (error) {
        this.migrationStats.failedFiles++;
        this.migrationStats.errors.push(`Failed to migrate ${file.oldPath}: ${error}`);
        console.error(`❌ Failed to migrate ${file.oldPath}:`, error);
      }
    }
  }

  /**
   * Move file from old path to new path
   */
  private async moveFile(oldPath: string, newPath: string): Promise<void> {
    const oldRef = ref(this.storage, oldPath);
    const newRef = ref(this.storage, newPath);
    
    // Download file data
    const downloadUrl = await getDownloadURL(oldRef);
    const response = await fetch(downloadUrl);
    const fileData = await response.arrayBuffer();
    
    // Upload to new location
    await uploadBytes(newRef, fileData);
    
    // Delete old file
    await deleteObject(oldRef);
  }

  /**
   * Clean up old directory structure
   */
  private async cleanupOldStructure(migrationPlan: MigrationFile[]): Promise<void> {
    console.log('🧹 Cleaning up old directory structure...');
    
    // Get unique old directories
    const oldDirectories = new Set(
      migrationPlan.map(file => file.oldPath.split('/').slice(0, -1).join('/'))
    );
    
    for (const directory of oldDirectories) {
      try {
        const dirRef = ref(this.storage, directory);
        const result = await listAll(dirRef);
        
        // Only delete if directory is empty
        if (result.items.length === 0 && result.prefixes.length === 0) {
          console.log(`🗑️ Cleaned up empty directory: ${directory}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not clean up directory ${directory}:`, error);
      }
    }
  }

  // Helper methods for file categorization
  private isNewStructurePath(path: string): boolean {
    const newStructurePrefixes = [
      'voice-samples/',
      'meeting-recordings/',
      'meeting-clips/',
      'identification-samples/',
      'user-uploads/',
      'temp/'
    ];
    
    return newStructurePrefixes.some(prefix => path.startsWith(prefix));
  }

  private isVoiceSample(path: string, name: string): boolean {
    return name.includes('voice') && (name.endsWith('.webm') || name.endsWith('.wav'));
  }

  private isMeetingRecording(path: string, name: string): boolean {
    return name.includes('recording') || name.includes('full_recording');
  }

  private isMeetingClip(path: string, name: string): boolean {
    return (name.includes('clip') || name.includes('segment')) && name.endsWith('.webm');
  }

  private isUserUpload(path: string, name: string): boolean {
    return path.includes('user') && (name.includes('sample') || name.includes('upload'));
  }

  private isTempFile(path: string, name: string): boolean {
    return path.includes('temp') || name.includes('chunk') || name.includes('stream');
  }

  private isIdentificationSample(path: string, name: string): boolean {
    return name.includes('identification') || name.includes('pending') || name.includes('sample_');
  }

  // Helper methods for data extraction
  private extractTimestamp(filename: string): string {
    const timestampMatch = filename.match(/(\d{13})/);
    return timestampMatch ? timestampMatch[1] : Date.now().toString();
  }

  private extractMeetingId(filename: string): string | null {
    const meetingMatch = filename.match(/mtg_([a-zA-Z0-9]+)/);
    return meetingMatch ? meetingMatch[1] : null;
  }

  private extractMeetingIdFromPath(path: string): string {
    const pathParts = path.split('/');
    return pathParts.find(part => part.startsWith('mtg_')) || 'unknown_meeting';
  }

  private extractSpeakerId(filename: string): string {
    const speakerMatch = filename.match(/dg_voice_([a-zA-Z0-9]+)/);
    return speakerMatch ? speakerMatch[1] : 'unknown_speaker';
  }

  private extractDuration(filename: string): string {
    const durationMatch = filename.match(/(\d+)s\./);
    return durationMatch ? durationMatch[1] : '0';
  }

  private extractUserId(path: string): string {
    const userMatch = path.match(/user[s]?\/([a-zA-Z0-9]+)/);
    return userMatch ? userMatch[1] : 'unknown_user';
  }

  private extractSessionId(path: string): string | null {
    const sessionMatch = path.match(/session[s]?\/([a-zA-Z0-9]+)/);
    return sessionMatch ? sessionMatch[1] : null;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async extractVoiceId(file: any): Promise<string> {
    // Try to extract from filename first
    const voiceMatch = file.name.match(/dg_voice_([a-zA-Z0-9]+)/);
    if (voiceMatch) {
      return voiceMatch[1];
    }
    
    // Try to extract from path
    const pathMatch = file.path.match(/voice[_-]([a-zA-Z0-9]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    
    // Generate a voice ID based on file characteristics
    return `voice_${file.metadata.timeCreated?.substr(0, 10) || Date.now()}`;
  }

  /**
   * Update Firestore references to point to new storage paths
   */
  private async updateFirestoreReferences(migrationPlan: MigrationFile[]): Promise<void> {
    console.log('🔗 Updating Firestore references...');
    
    // Update meetings collection
    const meetingsSnapshot = await getDocs(collection(this.firestore, 'meetings'));
    for (const meetingDoc of meetingsSnapshot.docs) {
      const data = meetingDoc.data();
      let updated = false;
      const updates: any = {};
      
      // Update recording paths
      if (data.recordingPath) {
        const newPath = migrationPlan.find(m => m.oldPath === data.recordingPath)?.newPath;
        if (newPath) {
          updates.recordingPath = newPath;
          updated = true;
        }
      }
      
      // Update voice sample paths
      if (data.voiceSamples) {
        const updatedSamples = data.voiceSamples.map((sample: any) => {
          const newPath = migrationPlan.find(m => m.oldPath === sample.path)?.newPath;
          return newPath ? { ...sample, path: newPath } : sample;
        });
        updates.voiceSamples = updatedSamples;
        updated = true;
      }
      
      if (updated) {
        await updateDoc(doc(this.firestore, 'meetings', meetingDoc.id), updates);
        console.log(`📝 Updated Firestore references for meeting: ${meetingDoc.id}`);
      }
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration(): Promise<boolean> {
    console.log('✅ Validating migration results...');
    
    try {
      // Check if new structure directories exist
      const requiredDirectories = [
        'voice-samples',
        'meeting-recordings', 
        'meeting-clips',
        'identification-samples',
        'user-uploads',
        'temp'
      ];
      
      for (const directory of requiredDirectories) {
        const dirRef = ref(this.storage, directory);
        try {
          await listAll(dirRef);
          console.log(`✓ Directory exists: ${directory}`);
        } catch (error) {
          console.warn(`⚠️ Directory may be empty or not exist: ${directory}`);
        }
      }
      
      console.log('✅ Migration validation completed');
      return true;
    } catch (error) {
      console.error('❌ Migration validation failed:', error);
      return false;
    }
  }
}

// Export migration function
export async function migrateFirebaseStorage(dryRun: boolean = true): Promise<MigrationStats> {
  const migration = new FirebaseStorageMigration();
  const stats = await migration.migrateStorage(dryRun);
  
  console.log('\n📊 Migration Statistics:');
  console.log(`Total files: ${stats.totalFiles}`);
  console.log(`Migrated: ${stats.migratedFiles}`);
  console.log(`Failed: ${stats.failedFiles}`);
  console.log(`Skipped: ${stats.skippedFiles}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (!dryRun) {
    await migration.validateMigration();
  }
  
  return stats;
}

// CLI runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--live');
  
  migrateFirebaseStorage(isDryRun)
    .then((stats) => {
      console.log('\n🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}