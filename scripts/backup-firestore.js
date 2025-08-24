#!/usr/bin/env node

/**
 * Firestore backup script for Universal Assistant
 * Backs up all collections with encryption and compression
 * Run with: node scripts/backup-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class FirestoreBackup {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.encryptionKey = this.getEncryptionKey();
    this.collections = [
      'users',
      'meetings', 
      'transcripts',
      'voiceProfiles',
      'customRules',
      'apiCalls',
      'securityEvents'
    ];
  }

  /**
   * Initialize Firebase Admin
   */
  async initializeFirebase() {
    try {
      // Check if already initialized
      if (admin.apps.length === 0) {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        
        if (serviceAccountPath && await this.fileExists(serviceAccountPath)) {
          const serviceAccount = require(path.resolve(serviceAccountPath));
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
          });
        } else {
          // Use environment variables
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
            }),
            projectId: process.env.FIREBASE_PROJECT_ID
          });
        }
      }
      
      this.firestore = admin.firestore();
      console.log('✅ Firebase Admin initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create backup directory structure
   */
  async createBackupStructure() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentBackupDir = path.join(this.backupDir, `backup-${timestamp}`);
    
    await fs.mkdir(this.currentBackupDir, { recursive: true });
    
    console.log(`📁 Created backup directory: ${this.currentBackupDir}`);
  }

  /**
   * Backup a single collection
   */
  async backupCollection(collectionName, includeSubcollections = true) {
    try {
      console.log(`📥 Backing up collection: ${collectionName}`);
      
      const collection = this.firestore.collection(collectionName);
      const snapshot = await collection.get();
      
      const documents = [];
      
      for (const doc of snapshot.docs) {
        const docData = {
          id: doc.id,
          data: doc.data(),
          subcollections: {}
        };

        // Backup subcollections if requested
        if (includeSubcollections) {
          const subcollections = await doc.ref.listCollections();
          
          for (const subcollection of subcollections) {
            const subSnapshot = await subcollection.get();
            docData.subcollections[subcollection.id] = subSnapshot.docs.map(subDoc => ({
              id: subDoc.id,
              data: subDoc.data()
            }));
          }
        }

        documents.push(docData);
      }

      // Save collection backup
      const backupData = {
        collection: collectionName,
        timestamp: new Date().toISOString(),
        documentCount: documents.length,
        documents
      };

      await this.saveEncryptedBackup(collectionName, backupData);
      
      console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
      
      return {
        collection: collectionName,
        documentCount: documents.length,
        success: true
      };
      
    } catch (error) {
      console.error(`❌ Failed to backup collection ${collectionName}:`, error.message);
      return {
        collection: collectionName,
        documentCount: 0,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save encrypted and compressed backup
   */
  async saveEncryptedBackup(collectionName, data) {
    try {
      // Convert to JSON and compress
      const jsonData = JSON.stringify(data, null, 2);
      const compressed = await gzip(Buffer.from(jsonData, 'utf8'));
      
      // Encrypt the compressed data
      const encrypted = await this.encryptData(compressed);
      
      // Save to file
      const backupFile = path.join(this.currentBackupDir, `${collectionName}.backup`);
      await fs.writeFile(backupFile, JSON.stringify(encrypted, null, 2));
      
      // Also save metadata
      const metadata = {
        collection: collectionName,
        timestamp: new Date().toISOString(),
        originalSize: jsonData.length,
        compressedSize: compressed.length,
        encrypted: true,
        algorithm: 'aes-256-gcm'
      };
      
      const metadataFile = path.join(this.currentBackupDir, `${collectionName}.metadata.json`);
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
      
    } catch (error) {
      console.error(`Failed to save encrypted backup for ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Backup all collections
   */
  async backupAllCollections() {
    console.log('🚀 Starting full Firestore backup...');
    
    const results = [];
    
    for (const collection of this.collections) {
      const result = await this.backupCollection(collection);
      results.push(result);
    }

    // Generate backup summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalCollections: this.collections.length,
      successfulBackups: results.filter(r => r.success).length,
      failedBackups: results.filter(r => !r.success).length,
      totalDocuments: results.reduce((sum, r) => sum + r.documentCount, 0),
      results
    };

    // Save summary
    const summaryFile = path.join(this.currentBackupDir, 'backup-summary.json');
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));

    return summary;
  }

  /**
   * Backup security configurations
   */
  async backupSecurityConfigs() {
    console.log('🔒 Backing up security configurations...');
    
    const configFiles = [
      'firestore.rules',
      'storage.rules',
      'firestore.indexes.json'
    ];

    const configs = {};
    
    for (const configFile of configFiles) {
      const filePath = path.join(process.cwd(), configFile);
      
      try {
        if (await this.fileExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          configs[configFile] = content;
          console.log(`✅ Backed up ${configFile}`);
        } else {
          console.warn(`⚠️  Configuration file not found: ${configFile}`);
        }
      } catch (error) {
        console.error(`❌ Failed to backup ${configFile}:`, error.message);
      }
    }

    // Save security configs
    if (Object.keys(configs).length > 0) {
      const securityBackup = {
        timestamp: new Date().toISOString(),
        configs
      };

      await this.saveEncryptedBackup('security-configs', securityBackup);
      console.log('✅ Security configurations backed up');
    }

    return configs;
  }

  /**
   * Clean old backups (keep last N backups)
   */
  async cleanOldBackups(keepCount = 10) {
    try {
      console.log(`🧹 Cleaning old backups (keeping last ${keepCount})...`);
      
      const backupDirs = await fs.readdir(this.backupDir);
      const backupFolders = backupDirs
        .filter(dir => dir.startsWith('backup-'))
        .sort()
        .reverse(); // Most recent first

      if (backupFolders.length > keepCount) {
        const toDelete = backupFolders.slice(keepCount);
        
        for (const folder of toDelete) {
          const folderPath = path.join(this.backupDir, folder);
          await this.deleteDirectory(folderPath);
          console.log(`🗑️  Deleted old backup: ${folder}`);
        }
        
        console.log(`✅ Cleaned ${toDelete.length} old backups`);
      } else {
        console.log('✅ No old backups to clean');
      }
      
    } catch (error) {
      console.error('❌ Failed to clean old backups:', error.message);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath, collectionName, dryRun = true) {
    try {
      console.log(`${dryRun ? '🔍 [DRY RUN]' : '🔄'} Restoring ${collectionName} from ${backupPath}...`);
      
      // Read encrypted backup
      const encryptedData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      // Decrypt and decompress
      const compressed = await this.decryptData(encryptedData);
      const jsonData = await gunzip(compressed);
      const backupData = JSON.parse(jsonData.toString('utf8'));
      
      if (!dryRun) {
        // Clear existing collection (with confirmation)
        console.log(`⚠️  This will DELETE all existing data in ${collectionName}`);
        // In a real implementation, add confirmation prompt
        
        const batch = this.firestore.batch();
        let operationCount = 0;
        
        // Restore documents
        for (const doc of backupData.documents) {
          const docRef = this.firestore.collection(collectionName).doc(doc.id);
          batch.set(docRef, doc.data);
          operationCount++;
          
          // Firestore batch limit is 500 operations
          if (operationCount >= 500) {
            await batch.commit();
            batch = this.firestore.batch();
            operationCount = 0;
          }
        }
        
        if (operationCount > 0) {
          await batch.commit();
        }
        
        console.log(`✅ Restored ${backupData.documents.length} documents to ${collectionName}`);
      } else {
        console.log(`🔍 [DRY RUN] Would restore ${backupData.documents.length} documents to ${collectionName}`);
      }
      
      return {
        success: true,
        documentCount: backupData.documents.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to restore ${collectionName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  async encryptData(data) {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);
    
    // Derive key from encryption key
    const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha256');
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: 'aes-256-gcm'
    };
  }

  /**
   * Decrypt data
   */
  async decryptData(encryptedData) {
    const { encrypted, iv, salt, tag, algorithm } = encryptedData;
    
    if (algorithm !== 'aes-256-gcm') {
      throw new Error('Unsupported encryption algorithm');
    }
    
    // Derive the same key
    const key = crypto.pbkdf2Sync(this.encryptionKey, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  /**
   * Get encryption key from environment
   */
  getEncryptionKey() {
    const key = process.env.BACKUP_ENCRYPTION_KEY;
    
    if (!key) {
      console.warn('⚠️  BACKUP_ENCRYPTION_KEY not set. Using default key (not secure for production)');
      return 'default-backup-key-change-in-production-32chars';
    }
    
    if (key.length < 32) {
      console.warn('⚠️  BACKUP_ENCRYPTION_KEY is too short. Use at least 32 characters.');
    }
    
    return key;
  }

  /**
   * Utility: Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility: Delete directory recursively
   */
  async deleteDirectory(dirPath) {
    try {
      await fs.rmdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to delete directory ${dirPath}:`, error.message);
    }
  }

  /**
   * Generate backup report
   */
  generateReport(summary, securityConfigs) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FIRESTORE BACKUP REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📅 Backup Date: ${summary.timestamp}`);
    console.log(`📁 Backup Location: ${this.currentBackupDir}`);
    console.log(`📈 Total Collections: ${summary.totalCollections}`);
    console.log(`✅ Successful Backups: ${summary.successfulBackups}`);
    console.log(`❌ Failed Backups: ${summary.failedBackups}`);
    console.log(`📄 Total Documents: ${summary.totalDocuments}`);
    console.log(`🔒 Security Configs: ${Object.keys(securityConfigs).length}`);
    
    console.log('\n📋 Collection Details:');
    summary.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.collection}: ${result.documentCount} documents`);
      if (!result.success) {
        console.log(`      Error: ${result.error}`);
      }
    });
    
    console.log('\n💡 Notes:');
    console.log('   - Backups are encrypted using AES-256-GCM');
    console.log('   - Data is compressed using gzip');
    console.log('   - Store BACKUP_ENCRYPTION_KEY securely');
    console.log('   - Test restore procedures regularly');
    
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Main backup execution
   */
  async run() {
    try {
      console.log('🛡️  Starting Universal Assistant Backup Process...\n');
      
      await this.initializeFirebase();
      await this.createBackupStructure();
      
      // Backup Firestore collections
      const summary = await this.backupAllCollections();
      
      // Backup security configurations
      const securityConfigs = await this.backupSecurityConfigs();
      
      // Clean old backups
      await this.cleanOldBackups();
      
      // Generate report
      this.generateReport(summary, securityConfigs);
      
      if (summary.failedBackups > 0) {
        console.log('\n⚠️  Some backups failed. Check the logs above.');
        process.exit(1);
      } else {
        console.log('\n🎉 Backup completed successfully!');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('\n❌ Backup process failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

if (command === 'restore') {
  const backupPath = args[1];
  const collectionName = args[2];
  const dryRun = !args.includes('--confirm');
  
  if (!backupPath || !collectionName) {
    console.error('Usage: node backup-firestore.js restore <backup-file> <collection-name> [--confirm]');
    process.exit(1);
  }
  
  (async () => {
    const backup = new FirestoreBackup();
    await backup.initializeFirebase();
    await backup.restoreFromBackup(backupPath, collectionName, dryRun);
  })();
  
} else if (command === 'clean') {
  const keepCount = parseInt(args[1]) || 10;
  
  (async () => {
    const backup = new FirestoreBackup();
    await backup.cleanOldBackups(keepCount);
  })();
  
} else {
  // Default: run full backup
  const backup = new FirestoreBackup();
  backup.run().catch(console.error);
}