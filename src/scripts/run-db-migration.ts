#!/usr/bin/env tsx

/**
 * Firestore Database Migration Runner
 * 
 * Safe wrapper for database migration with additional safety checks
 */

import { FirestoreMigration } from './migrate-firestore-db';

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Universal Assistant Database Migration');
  console.log('=========================================\n');
  
  if (args.includes('--backup')) {
    console.log('📦 BACKUP MODE - Saving current database');
    const migration = new FirestoreMigration();
    await migration.backupDatabase();
    
  } else if (args.includes('--live')) {
    console.log('⚠️  DANGER: LIVE MIGRATION MODE');
    console.log('This will completely replace your Firestore database!');
    console.log('Make sure you have run --backup first!\n');
    
    // Extra safety prompt
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      readline.question('Type "CONFIRM MIGRATION" to proceed: ', resolve);
    });
    
    readline.close();
    
    if (answer !== 'CONFIRM MIGRATION') {
      console.log('❌ Migration cancelled.');
      process.exit(0);
    }
    
    const migration = new FirestoreMigration();
    await migration.executeMigration();
    await migration.validateSchema();
    
  } else {
    console.log('🔍 PREVIEW MODE - Showing migration plan');
    console.log('No changes will be made to your database\n');
    
    const migration = new FirestoreMigration();
    await migration.previewMigration();
    
    console.log('\n🛡️  SAFETY CHECKLIST:');
    console.log('===================');
    console.log('1. ✓ Run: npm run migrate-db:backup');
    console.log('2. ✓ Review backup files in ./backup/');
    console.log('3. ✓ Run: npm run migrate-db:live');
  }
}

if (require.main === module) {
  main().catch(console.error);
}