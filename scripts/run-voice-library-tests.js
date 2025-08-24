#!/usr/bin/env node

/**
 * Voice Library Test Runner Script
 * 
 * Comprehensive script for running Firebase voice library E2E tests with Playwright.
 * Supports different test suites, browsers, and environments.
 * 
 * Usage:
 *   npm run test:voice-library
 *   npm run test:voice-library -- --suite=permissions
 *   npm run test:voice-library -- --browser=chromium --suite=integration
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  playwrightConfig: 'playwright-voice-library.config.ts',
  testDir: 'tests/e2e',
  outputDir: 'test-results/voice-library',
  defaultTimeout: 60000,
  retries: 2,
  supportedBrowsers: ['chromium', 'firefox', 'webkit'],
  supportedSuites: ['all', 'authentication', 'permissions', 'components', 'integration', 'e2e', 'performance']
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    suite: 'all',
    browser: 'chromium',
    headed: false,
    debug: false,
    workers: null,
    retries: CONFIG.retries,
    timeout: CONFIG.defaultTimeout,
    reporter: 'html',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--suite=')) {
      options.suite = arg.split('=')[1];
    } else if (arg.startsWith('--browser=')) {
      options.browser = arg.split('=')[1];
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--debug') {
      options.debug = true;
    } else if (arg.startsWith('--workers=')) {
      options.workers = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--retries=')) {
      options.retries = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--reporter=')) {
      options.reporter = arg.split('=')[1];
    }
  }

  return options;
}

// Display help information
function showHelp() {
  console.log(`
🎭 Voice Library E2E Test Runner

Usage: npm run test:voice-library [options]

Options:
  --suite=<suite>       Test suite to run (${CONFIG.supportedSuites.join(', ')})
  --browser=<browser>   Browser to test (${CONFIG.supportedBrowsers.join(', ')})
  --headed              Run tests in headed mode (visible browser)
  --debug               Enable debug mode with verbose output
  --workers=<n>         Number of parallel workers
  --retries=<n>         Number of retries on failure (default: ${CONFIG.retries})
  --timeout=<ms>        Test timeout in milliseconds (default: ${CONFIG.defaultTimeout})
  --reporter=<type>     Test reporter (html, json, junit, list)
  --help, -h            Show this help message

Examples:
  npm run test:voice-library
  npm run test:voice-library -- --suite=permissions --browser=chromium
  npm run test:voice-library -- --headed --debug
  npm run test:voice-library -- --suite=integration --browser=firefox --workers=1

Test Suites:
  all           - Run all voice library tests
  authentication- Test authentication flows and auth guards
  permissions   - Test Firebase permission handling
  components    - Test VoiceLibraryDashboard and VoiceLibraryDemo
  integration   - Test complete auth → voice library workflows
  e2e           - Test complete user journeys
  performance   - Test performance and optimization
`);
}

// Validate options
function validateOptions(options) {
  const errors = [];

  if (!CONFIG.supportedSuites.includes(options.suite)) {
    errors.push(`Invalid suite: ${options.suite}. Supported: ${CONFIG.supportedSuites.join(', ')}`);
  }

  if (!CONFIG.supportedBrowsers.includes(options.browser)) {
    errors.push(`Invalid browser: ${options.browser}. Supported: ${CONFIG.supportedBrowsers.join(', ')}`);
  }

  if (options.workers !== null && (options.workers < 1 || options.workers > 10)) {
    errors.push('Workers must be between 1 and 10');
  }

  if (options.retries < 0 || options.retries > 5) {
    errors.push('Retries must be between 0 and 5');
  }

  if (options.timeout < 1000 || options.timeout > 300000) {
    errors.push('Timeout must be between 1000ms and 300000ms');
  }

  return errors;
}

// Check prerequisites
function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');

  // Check if Playwright config exists
  if (!fs.existsSync(CONFIG.playwrightConfig)) {
    console.error(`❌ Playwright config not found: ${CONFIG.playwrightConfig}`);
    process.exit(1);
  }

  // Check if test files exist
  const testFiles = [
    'tests/e2e/firebase-voice-library.spec.ts',
    'tests/e2e/firebase-voice-library-integration.spec.ts',
    'tests/e2e/utils/voice-library-test-utils.ts'
  ];

  for (const testFile of testFiles) {
    if (!fs.existsSync(testFile)) {
      console.error(`❌ Test file not found: ${testFile}`);
      process.exit(1);
    }
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${CONFIG.outputDir}`);
  }

  console.log('✅ Prerequisites check passed');
}

// Build Playwright command
function buildPlaywrightCommand(options) {
  const cmd = ['npx', 'playwright', 'test'];
  
  // Configuration file
  cmd.push('--config', CONFIG.playwrightConfig);
  
  // Project/browser selection
  if (options.browser !== 'all') {
    cmd.push('--project', `voice-library-${options.suite}-${options.browser}`);
  }

  // Test file selection based on suite
  if (options.suite === 'all') {
    cmd.push('firebase-voice-library*.spec.ts');
  } else if (options.suite === 'integration' || options.suite === 'performance') {
    cmd.push('firebase-voice-library-integration.spec.ts');
  } else {
    cmd.push('firebase-voice-library.spec.ts');
  }

  // Grep pattern for specific test suites
  if (options.suite !== 'all' && options.suite !== 'integration') {
    const grepPatterns = {
      authentication: 'Authentication Tests',
      permissions: 'Firebase Permission Tests',
      components: 'Component Tests',
      e2e: 'E2E Tests',
      performance: 'Performance'
    };
    
    if (grepPatterns[options.suite]) {
      cmd.push('--grep', grepPatterns[options.suite]);
    }
  }

  // Test execution options
  if (options.headed) {
    cmd.push('--headed');
  }

  if (options.debug) {
    cmd.push('--debug');
  }

  if (options.workers !== null) {
    cmd.push('--workers', options.workers.toString());
  }

  cmd.push('--retries', options.retries.toString());

  // Reporter configuration
  const reporterArgs = [];
  if (options.reporter === 'html') {
    reporterArgs.push('html');
    reporterArgs.push('json');
  } else {
    reporterArgs.push(options.reporter);
  }
  
  cmd.push('--reporter', reporterArgs.join(','));

  // Output directory
  cmd.push('--output-dir', CONFIG.outputDir);

  return cmd;
}

// Run tests
function runTests(command, options) {
  console.log(`🎭 Running Voice Library E2E Tests`);
  console.log(`📋 Suite: ${options.suite}`);
  console.log(`🌐 Browser: ${options.browser}`);
  console.log(`🔧 Command: ${command.join(' ')}`);
  console.log('');

  const process = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSER: options.browser,
      TEST_SUITE: options.suite,
      NODE_ENV: 'test'
    }
  });

  process.on('close', (code) => {
    console.log('');
    if (code === 0) {
      console.log('✅ Voice Library E2E Tests completed successfully');
      console.log(`📊 Results available in: ${CONFIG.outputDir}`);
      
      // Show summary of test results
      showTestSummary(options);
    } else {
      console.error(`❌ Voice Library E2E Tests failed with exit code ${code}`);
      console.log(`📊 Results and failure details available in: ${CONFIG.outputDir}`);
      process.exit(code);
    }
  });

  process.on('error', (error) => {
    console.error('❌ Failed to start test process:', error);
    process.exit(1);
  });
}

// Show test summary
function showTestSummary(options) {
  console.log('');
  console.log('📈 Test Summary:');
  console.log(`   Suite: ${options.suite}`);
  console.log(`   Browser: ${options.browser}`);
  console.log(`   Output: ${CONFIG.outputDir}`);
  
  // Check for HTML report
  const htmlReportPath = path.join(CONFIG.outputDir, 'index.html');
  if (fs.existsSync(htmlReportPath)) {
    console.log(`   HTML Report: file://${path.resolve(htmlReportPath)}`);
  }

  // Check for JSON results
  const jsonResultsPath = path.join(CONFIG.outputDir, 'results.json');
  if (fs.existsSync(jsonResultsPath)) {
    console.log(`   JSON Results: ${jsonResultsPath}`);
  }

  console.log('');
  console.log('🎯 Next steps:');
  console.log('   • Review test results in the HTML report');
  console.log('   • Check screenshots of any failures');
  console.log('   • Run specific test suites if needed');
  console.log('   • Use --debug flag for detailed debugging');
}

// Main execution
function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🎭 Voice Library E2E Test Runner Starting...');
  console.log('');

  // Validate options
  const errors = validateOptions(options);
  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach(error => console.error(`   • ${error}`));
    console.log('');
    showHelp();
    process.exit(1);
  }

  // Check prerequisites
  checkPrerequisites();

  // Build and run command
  const command = buildPlaywrightCommand(options);
  runTests(command, options);
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test run interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test run terminated');
  process.exit(143);
});

// Run main function
main();