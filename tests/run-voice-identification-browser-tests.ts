#!/usr/bin/env ts-node

/**
 * Voice Identification Browser Test Runner
 * 
 * Comprehensive test runner for Playwright E2E tests focused on voice identification
 * system integration in real browser environments.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Test configuration
interface TestConfig {
  headless: boolean;
  browserName: 'chromium' | 'firefox' | 'webkit' | 'all';
  timeout: number;
  retries: number;
  workers: number;
  generateReport: boolean;
  debug: boolean;
}

// Default configuration
const defaultConfig: TestConfig = {
  headless: true,
  browserName: 'chromium',
  timeout: 60000,
  retries: 1,
  workers: 1,
  generateReport: true,
  debug: false
};

// Parse command line arguments
function parseArgs(): Partial<TestConfig> {
  const args = process.argv.slice(2);
  const config: Partial<TestConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--headed':
        config.headless = false;
        break;
        
      case '--headless':
        config.headless = true;
        break;
        
      case '--browser':
        const browser = args[++i] as TestConfig['browserName'];
        if (['chromium', 'firefox', 'webkit', 'all'].includes(browser)) {
          config.browserName = browser;
        }
        break;
        
      case '--timeout':
        config.timeout = parseInt(args[++i]);
        break;
        
      case '--retries':
        config.retries = parseInt(args[++i]);
        break;
        
      case '--workers':
        config.workers = parseInt(args[++i]);
        break;
        
      case '--no-report':
        config.generateReport = false;
        break;
        
      case '--debug':
        config.debug = true;
        config.headless = false;
        config.workers = 1;
        break;
        
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

function printHelp() {
  console.log(`
Voice Identification Browser Test Runner

Usage: ts-node tests/run-voice-identification-browser-tests.ts [options]

Options:
  --headed              Run tests in headed mode (visible browser)
  --headless            Run tests in headless mode (default)
  --browser <name>      Browser to use: chromium, firefox, webkit, all (default: chromium)
  --timeout <ms>        Test timeout in milliseconds (default: 60000)
  --retries <count>     Number of retries for failed tests (default: 1)
  --workers <count>     Number of parallel workers (default: 1)
  --no-report           Skip generating HTML report
  --debug               Enable debug mode (headed, single worker)
  --help                Show this help message

Examples:
  # Run basic tests
  npm run test:e2e:voice-browser

  # Run in headed mode for debugging
  ts-node tests/run-voice-identification-browser-tests.ts --headed

  # Run on all browsers
  ts-node tests/run-voice-identification-browser-tests.ts --browser all

  # Debug mode with visible browser
  ts-node tests/run-voice-identification-browser-tests.ts --debug
`);
}

// Main test runner function
async function runTests() {
  console.log('🎤 Voice Identification Browser Tests');
  console.log('=====================================\n');

  // Parse arguments and merge with defaults
  const userConfig = parseArgs();
  const config: TestConfig = { ...defaultConfig, ...userConfig };

  console.log('Configuration:');
  console.log(`  Browser: ${config.browserName}`);
  console.log(`  Mode: ${config.headless ? 'headless' : 'headed'}`);
  console.log(`  Timeout: ${config.timeout}ms`);
  console.log(`  Retries: ${config.retries}`);
  console.log(`  Workers: ${config.workers}`);
  console.log(`  Generate Report: ${config.generateReport}`);
  console.log('');

  // Ensure necessary directories exist
  const screenshotsDir = path.join(process.cwd(), 'tests/screenshots');
  const reportsDir = path.join(process.cwd(), 'tests/reports/playwright');
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Build Playwright command
  let command = 'npx playwright test tests/e2e/voice-identification-browser.test.ts';
  
  // Add configuration options
  if (!config.headless) {
    command += ' --headed';
  }
  
  if (config.browserName !== 'all') {
    command += ` --project=${config.browserName}`;
  }
  
  command += ` --timeout=${config.timeout}`;
  command += ` --retries=${config.retries}`;
  command += ` --workers=${config.workers}`;
  
  if (config.debug) {
    command += ' --debug';
  }

  console.log('Running command:', command);
  console.log('');

  try {
    // Run the tests
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        PLAYWRIGHT_HTML_REPORT: reportsDir
      }
    });

    console.log('\n✅ All tests completed successfully!');
    
    // Generate and show report
    if (config.generateReport) {
      console.log('\n📊 Generating test report...');
      
      try {
        execSync('npx playwright show-report', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      } catch (reportError) {
        console.log('📄 HTML report generated at:', path.join(reportsDir, 'index.html'));
      }
    }

    // Show screenshots location
    const screenshots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
    if (screenshots.length > 0) {
      console.log(`\n📸 Screenshots captured: ${screenshots.length}`);
      console.log('   Location:', screenshotsDir);
      console.log('   Files:', screenshots.slice(0, 5).join(', ') + (screenshots.length > 5 ? '...' : ''));
    }

  } catch (error: any) {
    console.error('\n❌ Tests failed!');
    
    if (error.status !== undefined) {
      console.error(`Exit code: ${error.status}`);
    }
    
    if (config.generateReport) {
      console.log('\n📄 Check the HTML report for detailed results:');
      console.log('   ', path.join(reportsDir, 'index.html'));
    }
    
    process.exit(1);
  }
}

// Pre-run checks
function performPreRunChecks() {
  console.log('🔍 Performing pre-run checks...');
  
  // Check if Playwright is installed
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('✓ Playwright is installed');
  } catch (error) {
    console.error('❌ Playwright is not installed. Run: npx playwright install');
    process.exit(1);
  }
  
  // Check if Next.js project exists
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found. Make sure you\'re in the project root.');
    process.exit(1);
  }
  
  // Check if test file exists
  const testFilePath = path.join(process.cwd(), 'tests/e2e/voice-identification-browser.test.ts');
  if (!fs.existsSync(testFilePath)) {
    console.error('❌ Test file not found:', testFilePath);
    process.exit(1);
  }
  
  console.log('✓ All pre-run checks passed\n');
}

// Entry point
if (require.main === module) {
  performPreRunChecks();
  runTests().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { runTests, TestConfig };