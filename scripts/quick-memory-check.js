#!/usr/bin/env node

/**
 * Quick memory leak check - 1 minute test
 * Success criteria: < 5MB growth
 */

const { UniversalRealtimeService } = require('../src/services/firebase/UniversalRealtimeService');

async function quickMemoryCheck() {
  console.log('Starting quick memory check...');
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const startMemory = process.memoryUsage().heapUsed;
  const listeners = [];
  
  // Create 20 listeners
  console.log('Creating 20 listeners...');
  for (let i = 0; i < 20; i++) {
    const cleanup = UniversalRealtimeService.createListener(
      `memory-test-${i}`,
      {},
      () => {}
    );
    listeners.push(cleanup);
  }
  
  // Wait 30 seconds
  console.log('Waiting 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Cleanup all
  console.log('Cleaning up...');
  listeners.forEach(cleanup => cleanup());
  UniversalRealtimeService.cleanupAll();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  // Check memory
  const endMemory = process.memoryUsage().heapUsed;
  const growthMB = (endMemory - startMemory) / 1024 / 1024;
  
  console.log(`Memory growth: ${growthMB.toFixed(2)}MB`);
  console.log(`Result: ${growthMB < 5 ? '✅ PASS' : '❌ FAIL'}`);
  
  process.exit(growthMB < 5 ? 0 : 1);
}

// Run with: node --expose-gc scripts/quick-memory-check.js
quickMemoryCheck().catch(console.error);