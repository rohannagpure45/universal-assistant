#!/usr/bin/env ts-node

/**
 * Comprehensive Functionality Test Runner
 * 
 * Runs all functionality tests for the Universal Assistant application
 * Tests authentication, navigation, form switching, page loading, and responsive behavior
 */

import { execSync } from 'child_process';
import path from 'path';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message: string, color?: string) {
  const timestamp = new Date().toISOString();
  const colorCode = color || COLORS.RESET;
  console.log(`${colorCode}[${timestamp}] ${message}${COLORS.RESET}`);
}

function runCommand(command: string, description: string): boolean {
  try {
    log(`Starting: ${description}`, COLORS.BLUE);
    const output = execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' }
    });
    log(`✅ Completed: ${description}`, COLORS.GREEN);
    return true;
  } catch (error) {
    log(`❌ Failed: ${description}`, COLORS.RED);
    console.error(error);
    return false;
  }
}

async function main() {
  log('🚀 Starting Comprehensive Functionality Tests', COLORS.BOLD);
  
  const testFile = 'tests/e2e/comprehensive-functionality.spec.ts';
  
  // Check if test file exists
  try {
    require.resolve(path.resolve(testFile));
    log(`✅ Test file found: ${testFile}`, COLORS.GREEN);
  } catch (error) {
    log(`❌ Test file not found: ${testFile}`, COLORS.RED);
    process.exit(1);
  }
  
  let allTestsPassed = true;
  
  // Run tests in Chrome (most reliable)
  log('Running tests in Chrome browser...', COLORS.BLUE);
  const chromeSuccess = runCommand(
    `npx playwright test ${testFile} --project=chromium --reporter=list`,
    'Chrome Browser Tests'
  );
  
  if (!chromeSuccess) {
    allTestsPassed = false;
  }
  
  // Run tests in Firefox for cross-browser validation
  log('Running tests in Firefox browser...', COLORS.BLUE);
  const firefoxSuccess = runCommand(
    `npx playwright test ${testFile} --project=firefox --reporter=list`,
    'Firefox Browser Tests'
  );
  
  if (!firefoxSuccess) {
    allTestsPassed = false;
    log('⚠️  Firefox tests failed - this might be due to browser-specific issues', COLORS.YELLOW);
  }
  
  // Generate test report
  log('Generating test report...', COLORS.BLUE);
  runCommand(
    `npx playwright test ${testFile} --project=chromium --reporter=html`,
    'Test Report Generation'
  );
  
  // Final summary
  if (allTestsPassed) {
    log('🎉 All functionality tests passed!', COLORS.GREEN + COLORS.BOLD);
    log('📊 View detailed report at: tests/reports/playwright/index.html', COLORS.BLUE);
  } else {
    log('⚠️  Some tests failed. Check the output above for details.', COLORS.YELLOW + COLORS.BOLD);
    log('📊 View detailed report at: tests/reports/playwright/index.html', COLORS.BLUE);
  }
  
  log('🏁 Test run completed', COLORS.BOLD);
  
  process.exit(allTestsPassed ? 0 : 1);
}

main().catch((error) => {
  log(`💥 Test runner failed: ${error.message}`, COLORS.RED);
  process.exit(1);
});