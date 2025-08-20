#!/usr/bin/env tsx

/**
 * Firestore Database Schema Migration
 * 
 * This script completely replaces the current Firestore database with the new schema structure.
 * 
 * Usage:
 * npm run migrate-db:backup     # Backup current data first (recommended)
 * npm run migrate-db:dry        # Preview migration plan
 * npm run migrate-db:live       # Execute migration (DESTRUCTIVE)
 * 
 * Or run directly:
 * npx tsx src/scripts/migrate-firestore-db.ts --backup
 * npx tsx src/scripts/migrate-firestore-db.ts --dry
 * npx tsx src/scripts/migrate-firestore-db.ts --live
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, writeBatch, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface MigrationStats {
  collectionsProcessed: number;
  documentsBackedUp: number;
  documentsDeleted: number;
  documentsCreated: number;
  errors: string[];
}

// New database schema structure
const NEW_SCHEMA_COLLECTIONS = [
  'users',
  'voice_library', 
  'meeting_types',
  'meetings',
  'needs_identification',
  'voice_matches'
];

// Sample data for the new schema
const SAMPLE_DATA = {
  // Sample meeting type
  meeting_types: {
    'daily_standup': {
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
    }
  }
};

class FirestoreMigration {
  private db;
  private stats: MigrationStats = {
    collectionsProcessed: 0,
    documentsBackedUp: 0,
    documentsDeleted: 0,
    documentsCreated: 0,
    errors: []
  };

  constructor() {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    this.db = getFirestore(app);
  }

  /**
   * Backup current database to JSON files
   */
  async backupDatabase(): Promise<void> {
    console.log('🗄️  Starting database backup...');
    
    const backupDir = path.join(process.cwd(), 'backup', `firestore-backup-${Date.now()}`);
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
      // Get all collections by trying common collection names
      const possibleCollections = [
        'users', 'meetings', 'transcripts', 'voiceProfiles', 'customRules', 
        'voice_library', 'meeting_types', 'needs_identification', 'voice_matches'
      ];

      for (const collectionName of possibleCollections) {
        try {
          const collectionRef = collection(this.db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          if (!snapshot.empty) {
            const collectionData: any = {};
            
            snapshot.forEach((doc) => {
              collectionData[doc.id] = doc.data();
              this.stats.documentsBackedUp++;
            });

            // Write to file
            const filePath = path.join(backupDir, `${collectionName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(collectionData, null, 2));
            
            console.log(`✓ Backed up collection '${collectionName}': ${snapshot.size} documents`);
            this.stats.collectionsProcessed++;
          }
        } catch (error) {
          // Collection doesn't exist, skip silently
        }
      }

      console.log(`✅ Backup completed: ${this.stats.documentsBackedUp} documents saved to ${backupDir}`);
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      this.stats.errors.push(`Backup error: ${error}`);
      throw error;
    }
  }

  /**
   * Preview what the migration will do
   */
  async previewMigration(): Promise<void> {
    console.log('🔍 Migration Preview');
    console.log('===================\n');

    console.log('📂 NEW SCHEMA COLLECTIONS:');
    NEW_SCHEMA_COLLECTIONS.forEach(collection => {
      console.log(`  ✓ ${collection}`);
    });

    console.log('\n🗑️  COLLECTIONS TO BE REMOVED:');
    const possibleOldCollections = [
      'transcripts', 'voiceProfiles', 'customRules'
    ];
    
    for (const collectionName of possibleOldCollections) {
      try {
        const collectionRef = collection(this.db, collectionName);
        const snapshot = await getDocs(collectionRef);
        if (!snapshot.empty) {
          console.log(`  ❌ ${collectionName} (${snapshot.size} documents)`);
        }
      } catch (error) {
        // Collection doesn't exist
      }
    }

    console.log('\n📄 SAMPLE DATA TO BE CREATED:');
    Object.keys(SAMPLE_DATA).forEach(collection => {
      const docs = Object.keys((SAMPLE_DATA as any)[collection]);
      console.log(`  ✓ ${collection}: ${docs.join(', ')}`);
    });

    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('  • This migration is DESTRUCTIVE - all current data will be removed');
    console.log('  • Run --backup first to save current data');  
    console.log('  • New schema enforces participant-only access to meetings');
    console.log('  • Admin users can access all data via isAdmin flag');
  }

  /**
   * Execute the complete migration
   */
  async executeMigration(): Promise<void> {
    console.log('🚀 Starting database migration...');
    console.log('==================================\n');

    try {
      // Step 1: Clear existing data
      await this.clearDatabase();
      
      // Step 2: Create new schema structure
      await this.createNewSchema();
      
      // Step 3: Add sample data
      await this.addSampleData();
      
      console.log('✅ Migration completed successfully!');
      this.printStats();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(`Migration error: ${error}`);
      throw error;
    }
  }

  /**
   * Clear all existing collections
   */
  private async clearDatabase(): Promise<void> {
    console.log('🧹 Clearing existing database...');
    
    const possibleCollections = [
      'users', 'meetings', 'transcripts', 'voiceProfiles', 'customRules',
      'voice_library', 'meeting_types', 'needs_identification', 'voice_matches'
    ];

    for (const collectionName of possibleCollections) {
      try {
        const collectionRef = collection(this.db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (!snapshot.empty) {
          const batch = writeBatch(this.db);
          let batchCount = 0;
          
          snapshot.forEach((document) => {
            batch.delete(document.ref);
            batchCount++;
            this.stats.documentsDeleted++;
            
            // Firestore batch limit is 500 operations
            if (batchCount === 500) {
              batch.commit();
              batchCount = 0;
            }
          });
          
          if (batchCount > 0) {
            await batch.commit();
          }
          
          console.log(`  ✓ Cleared collection '${collectionName}': ${snapshot.size} documents`);
        }
        
      } catch (error) {
        // Collection doesn't exist, skip
      }
    }
  }

  /**
   * Create new schema structure with validation rules
   */
  private async createNewSchema(): Promise<void> {
    console.log('📄 Creating new schema structure...');
    
    // Create system configuration document
    const systemConfigRef = doc(this.db, 'system_config', 'settings');
    await setDoc(systemConfigRef, {
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
      defaultTTSVoice: '21m00Tcm4TlvDq8ikWAM', // ElevenLabs default
      maintenanceMode: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    this.stats.documentsCreated++;
    console.log('  ✓ Created system configuration');
  }

  /**
   * Add sample data to demonstrate the new schema
   */
  private async addSampleData(): Promise<void> {
    console.log('📝 Adding sample data...');
    
    // Add sample meeting type
    for (const [collection, data] of Object.entries(SAMPLE_DATA)) {
      for (const [docId, docData] of Object.entries(data)) {
        const docRef = doc(this.db, collection, docId);
        await setDoc(docRef, docData);
        this.stats.documentsCreated++;
        console.log(`  ✓ Created ${collection}/${docId}`);
      }
    }
  }

  /**
   * Validate the new schema
   */
  async validateSchema(): Promise<boolean> {
    console.log('✅ Validating new schema...');
    
    try {
      // Check system config exists
      const systemConfigRef = doc(this.db, 'system_config', 'settings');
      const systemConfigSnap = await getDoc(systemConfigRef);
      
      if (!systemConfigSnap.exists()) {
        console.error('❌ System configuration not found');
        return false;
      }
      
      const config = systemConfigSnap.data();
      console.log(`  ✓ Schema version: ${config.schemaVersion}`);
      console.log(`  ✓ Supported models: ${config.supportedModels.length}`);
      
      // Check sample data
      const sampleMeetingTypeRef = doc(this.db, 'meeting_types', 'daily_standup');
      const sampleSnap = await getDoc(sampleMeetingTypeRef);
      
      if (sampleSnap.exists()) {
        console.log('  ✓ Sample meeting type created successfully');
      }
      
      console.log('✅ Schema validation passed');
      return true;
      
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  private printStats(): void {
    console.log('\n📊 Migration Statistics:');
    console.log('========================');
    console.log(`Collections processed: ${this.stats.collectionsProcessed}`);
    console.log(`Documents backed up: ${this.stats.documentsBackedUp}`);
    console.log(`Documents deleted: ${this.stats.documentsDeleted}`);
    console.log(`Documents created: ${this.stats.documentsCreated}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  }
}

// CLI runner
async function main() {
  const args = process.argv.slice(2);
  const migration = new FirestoreMigration();

  try {
    if (args.includes('--backup')) {
      console.log('🗄️  BACKUP MODE');
      console.log('===============');
      await migration.backupDatabase();
      
    } else if (args.includes('--dry') || args.length === 0) {
      console.log('🔍 DRY RUN MODE');
      console.log('===============');
      await migration.previewMigration();
      
    } else if (args.includes('--live')) {
      console.log('⚠️  LIVE MIGRATION MODE');
      console.log('=======================');
      console.log('This will PERMANENTLY DELETE all current data!');
      console.log('Press Ctrl+C within 10 seconds to cancel...\n');
      
      // Give user time to cancel
      for (let i = 10; i > 0; i--) {
        process.stdout.write(`Starting in ${i} seconds...\r`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n🚀 Starting migration...');
      
      await migration.executeMigration();
      await migration.validateSchema();
      
      console.log('\n✅ Migration completed! Your database now uses the new schema.');
      console.log('🔍 Check your Firestore console to verify the new structure.');
      
    } else {
      console.log('Usage:');
      console.log('  npm run migrate-db:backup  # Backup current data');
      console.log('  npm run migrate-db:dry     # Preview migration'); 
      console.log('  npm run migrate-db:live    # Execute migration');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { FirestoreMigration };