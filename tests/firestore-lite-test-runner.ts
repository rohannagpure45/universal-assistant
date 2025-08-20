/**
 * FirestoreLite Test Runner
 * 
 * Comprehensive test runner for all FirestoreLite service tests.
 * This script runs the complete test suite including unit tests,
 * integration tests, error handling tests, performance tests,
 * and browser compatibility tests.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Test categories and their corresponding files
const TEST_CATEGORIES = {
  unit: [
    'tests/unit/firestore-lite-service.test.ts',
    'tests/unit/firestore-lite-error-handling.test.ts',
  ],
  integration: [
    'tests/integration/firestore-lite-integration.test.ts',
    'tests/integration/firestore-lite-performance.test.ts',
    'tests/integration/firestore-lite-realtime-integration.test.ts',
  ],
  e2e: [
    'tests/e2e/firestore-lite-browser-compatibility.test.ts',
  ],
} as const;

// Test configuration
interface TestConfig {
  category: keyof typeof TEST_CATEGORIES;
  verbose: boolean;
  coverage: boolean;
  bail: boolean;
  timeout: number;
  maxWorkers?: number;
}

const DEFAULT_CONFIG: TestConfig = {
  category: 'unit',
  verbose: true,
  coverage: false,
  bail: false,
  timeout: 30000,
  maxWorkers: 1,
};

// Color codes for console output
const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
} as const;

// Utility functions
const log = (message: string, color: keyof typeof COLORS = 'RESET') => {
  console.log(`${COLORS[color]}${message}${COLORS.RESET}`);
};

const logSection = (title: string) => {
  log(`\n${'='.repeat(60)}`, 'CYAN');
  log(`${title}`, 'BRIGHT');
  log(`${'='.repeat(60)}`, 'CYAN');
};

const logSubsection = (title: string) => {
  log(`\n${'-'.repeat(40)}`, 'BLUE');
  log(`${title}`, 'BLUE');
  log(`${'-'.repeat(40)}`, 'BLUE');
};

const logSuccess = (message: string) => log(`✓ ${message}`, 'GREEN');
const logError = (message: string) => log(`✗ ${message}`, 'RED');
const logWarning = (message: string) => log(`⚠ ${message}`, 'YELLOW');
const logInfo = (message: string) => log(`ℹ ${message}`, 'BLUE');

// Verify test files exist
const verifyTestFiles = (): boolean => {
  logSection('Verifying Test Files');
  
  let allFilesExist = true;
  
  for (const [category, files] of Object.entries(TEST_CATEGORIES)) {
    logSubsection(`${category.toUpperCase()} Tests`);
    
    for (const file of files) {
      const fullPath = path.resolve(file);
      if (existsSync(fullPath)) {
        logSuccess(`Found: ${file}`);
      } else {
        logError(`Missing: ${file}`);
        allFilesExist = false;
      }
    }
  }
  
  return allFilesExist;
};

// Run specific test category
const runTestCategory = async (category: keyof typeof TEST_CATEGORIES, config: TestConfig): Promise<boolean> => {
  logSection(`Running ${category.toUpperCase()} Tests`);
  
  const files = TEST_CATEGORIES[category];
  if (!files || (files as readonly string[]).length === 0) {
    logWarning(`No tests found for category: ${category}`);
    return true;
  }
  
  try {
    for (const file of files) {
      logSubsection(`Testing: ${path.basename(file)}`);
      
      // Build Jest command
      const jestArgs = [
        file,
        config.verbose ? '--verbose' : '',
        config.coverage ? '--coverage' : '',
        config.bail ? '--bail' : '',
        `--testTimeout=${config.timeout}`,
        config.maxWorkers ? `--maxWorkers=${config.maxWorkers}` : '',
        '--colors',
        '--detectOpenHandles',
        '--forceExit',
      ].filter(Boolean).join(' ');
      
      const command = `npx jest ${jestArgs}`;
      logInfo(`Running: ${command}`);
      
      const startTime = Date.now();
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
      const duration = Date.now() - startTime;
      
      logSuccess(`Completed in ${duration}ms: ${path.basename(file)}`);
    }
    
    logSuccess(`All ${category} tests passed!`);
    return true;
    
  } catch (error) {
    logError(`${category} tests failed: ${error}`);
    return false;
  }
};

// Run Playwright E2E tests
const runPlaywrightTests = async (): Promise<boolean> => {
  logSection('Running Browser Compatibility Tests (Playwright)');
  
  try {
    logInfo('Installing Playwright browsers...');
    execSync('npx playwright install', { stdio: 'inherit' });
    
    logInfo('Running Playwright tests...');
    const command = 'npx playwright test tests/e2e/firestore-lite-browser-compatibility.test.ts --reporter=list';
    execSync(command, { stdio: 'inherit' });
    
    logSuccess('Browser compatibility tests passed!');
    return true;
    
  } catch (error) {
    logError(`Playwright tests failed: ${error}`);
    return false;
  }
};

// Generate test report
const generateTestReport = (results: Record<string, boolean>) => {
  logSection('Test Results Summary');
  
  const passed = Object.values(results).filter(result => result).length;
  const total = Object.values(results).length;
  const failed = total - passed;
  
  log('\nResults by Category:', 'BRIGHT');
  for (const [category, result] of Object.entries(results)) {
    const status = result ? 'PASSED' : 'FAILED';
    const color = result ? 'GREEN' : 'RED';
    log(`  ${category.padEnd(15)}: ${status}`, color);
  }
  
  log('\nOverall Summary:', 'BRIGHT');
  log(`  Total Categories: ${total}`);
  log(`  Passed: ${passed}`, passed > 0 ? 'GREEN' : 'RESET');
  log(`  Failed: ${failed}`, failed > 0 ? 'RED' : 'RESET');
  log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`, passed === total ? 'GREEN' : 'YELLOW');
  
  if (passed === total) {
    log('\n🎉 All FirestoreLite tests passed successfully!', 'GREEN');
  } else {
    log('\n❌ Some tests failed. Please review the output above.', 'RED');
  }
};

// Main test runner function
const runTests = async (categories?: string[], options: Partial<TestConfig> = {}) => {
  const config: TestConfig = { ...DEFAULT_CONFIG, ...options };
  
  logSection('FirestoreLite Test Suite');
  logInfo('Testing FirestoreLite service for REST-only Firestore access');
  logInfo('Eliminates streaming transport errors in Brave/Safari browsers');
  
  // Verify all test files exist
  if (!verifyTestFiles()) {
    logError('Some test files are missing. Please check the file paths.');
    process.exit(1);
  }
  
  // Determine which categories to run
  const categoriesToRun = categories && categories.length > 0 
    ? categories.filter(cat => cat in TEST_CATEGORIES) as (keyof typeof TEST_CATEGORIES)[]
    : Object.keys(TEST_CATEGORIES) as (keyof typeof TEST_CATEGORIES)[];
  
  if (categoriesToRun.length === 0) {
    logError('No valid test categories specified.');
    process.exit(1);
  }
  
  logInfo(`Running test categories: ${categoriesToRun.join(', ')}`);
  
  // Run tests for each category
  const results: Record<string, boolean> = {};
  
  for (const category of categoriesToRun) {
    if (category === 'e2e') {
      results[category] = await runPlaywrightTests();
    } else {
      results[category] = await runTestCategory(category, config);
    }
    
    // Bail out on first failure if configured
    if (config.bail && !results[category]) {
      logError('Stopping test execution due to failure (bail mode).');
      break;
    }
  }
  
  // Generate final report
  generateTestReport(results);
  
  // Exit with appropriate code
  const allPassed = Object.values(results).every(result => result);
  process.exit(allPassed ? 0 : 1);
};

// Command line interface
const main = async () => {
  const args = process.argv.slice(2);
  const options: Partial<TestConfig> = {};
  let categories: string[] = [];
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      case '--coverage':
      case '-c':
        options.coverage = true;
        break;
        
      case '--bail':
      case '-b':
        options.bail = true;
        break;
        
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i], 10) || DEFAULT_CONFIG.timeout;
        break;
        
      case '--workers':
      case '-w':
        options.maxWorkers = parseInt(args[++i], 10) || DEFAULT_CONFIG.maxWorkers;
        break;
        
      case '--category':
      case '--cat':
        categories.push(args[++i]);
        break;
        
      case '--all':
        categories = Object.keys(TEST_CATEGORIES);
        break;
        
      case '--unit':
        categories.push('unit');
        break;
        
      case '--integration':
        categories.push('integration');
        break;
        
      case '--e2e':
        categories.push('e2e');
        break;
        
      case '--help':
      case '-h':
        console.log(`
FirestoreLite Test Runner

Usage: ts-node tests/firestore-lite-test-runner.ts [options]

Options:
  --verbose, -v           Enable verbose output
  --coverage, -c          Generate coverage report
  --bail, -b             Stop on first test failure
  --timeout, -t <ms>     Set test timeout (default: 30000)
  --workers, -w <num>    Set max workers (default: 1)
  --category <name>      Run specific category
  --all                  Run all test categories
  --unit                 Run unit tests only
  --integration          Run integration tests only
  --e2e                  Run E2E tests only
  --help, -h             Show this help message

Categories:
  unit                   Unit tests for core functionality
  integration            Integration tests with mocked services
  e2e                    Browser compatibility tests

Examples:
  ts-node tests/firestore-lite-test-runner.ts --unit --verbose
  ts-node tests/firestore-lite-test-runner.ts --all --coverage
  ts-node tests/firestore-lite-test-runner.ts --integration --bail
        `);
        process.exit(0);
        break;
        
      default:
        if (!arg.startsWith('--')) {
          categories.push(arg);
        }
        break;
    }
  }
  
  await runTests(categories, options);
};

// Error handling
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

export { runTests, TEST_CATEGORIES };
export type { TestConfig };