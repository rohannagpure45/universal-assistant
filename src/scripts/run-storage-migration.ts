#!/usr/bin/env tsx

/**
 * Firebase Storage Migration Runner
 * 
 * Usage:
 * npm run migrate-storage:dry     # Dry run (safe preview)
 * npm run migrate-storage:live    # Live migration (makes actual changes)
 * 
 * Or run directly:
 * npx tsx src/scripts/run-storage-migration.ts --dry
 * npx tsx src/scripts/run-storage-migration.ts --live
 */

import { migrateFirebaseStorage } from './migrate-firebase-storage';

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes('--live');
  const isDryRun = !isLive;

  console.log('🚀 Firebase Storage Migration Tool');
  console.log('=====================================');
  
  if (isDryRun) {
    console.log('🔍 Running in DRY RUN mode (no changes will be made)');
    console.log('To perform actual migration, run with --live flag');
  } else {
    console.log('⚠️  LIVE MIGRATION MODE - Changes will be permanent!');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    
    // Give user time to cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('🏃 Starting live migration...');
  }

  try {
    const stats = await migrateFirebaseStorage(isDryRun);
    
    console.log('\n📋 Migration Summary:');
    console.log(`  Total files processed: ${stats.totalFiles}`);
    console.log(`  Successfully migrated: ${stats.migratedFiles}`);
    console.log(`  Failed migrations: ${stats.failedFiles}`);
    console.log(`  Skipped files: ${stats.skippedFiles}`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (isDryRun) {
      console.log('\n✨ Dry run completed. Review the plan above and run with --live to execute.');
    } else {
      console.log('\n🎉 Live migration completed successfully!');
      console.log('🔍 Please verify your Firebase Storage in the console to confirm the new structure.');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}