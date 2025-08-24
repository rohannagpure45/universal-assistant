#!/usr/bin/env node

/**
 * Test Runner for Meeting Modal Flickering Fix
 * 
 * This script runs all the comprehensive tests for the meeting modal flickering fix:
 * - Unit tests for modal state management
 * - Integration tests for user interactions
 * - UI tests for visual stability
 * - Regression tests for existing functionality
 * - Performance tests for responsiveness improvements
 * - E2E tests for real browser behavior
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
  timeout?: number;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Unit Tests - Modal State Management',
    pattern: 'tests/unit/meeting-modal-flickering-fix.test.tsx',
    description: 'Tests core logic fixes that prevent modal flickering',
    timeout: 30000
  },
  {
    name: 'Unit Tests - Performance',
    pattern: 'tests/unit/meeting-modal-performance.test.tsx',
    description: 'Tests performance improvements from removing setTimeout delays',
    timeout: 30000
  },
  {
    name: 'Integration Tests - User Interactions',
    pattern: 'tests/integration/meeting-modal-integration.test.tsx',
    description: 'Tests complete user workflow and component integration',
    timeout: 60000
  },
  {
    name: 'Integration Tests - Regression',
    pattern: 'tests/integration/meeting-modal-regression.test.tsx',
    description: 'Ensures fix didn\'t break existing functionality',
    timeout: 60000
  },
  {
    name: 'E2E Tests - UI Flickering Prevention',
    pattern: 'tests/e2e/meeting-modal-ui-flickering.test.ts',
    description: 'Tests actual visual behavior in real browser environment',
    timeout: 120000
  }
];

class TestRunner {
  private projectRoot: string;
  private results: Array<{ suite: string; passed: boolean; error?: string; duration?: number }> = [];

  constructor() {
    this.projectRoot = process.cwd();
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m',  // Green
      error: '\x1b[31m',    // Red
      warning: '\x1b[33m',  // Yellow
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  private async runJestTest(suite: TestSuite): Promise<{ passed: boolean; error?: string; duration: number }> {
    const startTime = Date.now();
    
    try {
      const testPath = path.join(this.projectRoot, suite.pattern);
      
      if (!existsSync(testPath)) {
        throw new Error(`Test file not found: ${testPath}`);
      }

      this.log(`Running: ${suite.name}`, 'info');
      this.log(`Pattern: ${suite.pattern}`, 'info');
      this.log(`Description: ${suite.description}`, 'info');

      // Configure Jest command
      const jestCmd = [
        'npx jest',
        `"${suite.pattern}"`,
        '--verbose',
        '--no-cache',
        '--forceExit',
        `--testTimeout=${suite.timeout || 30000}`,
        '--detectOpenHandles'
      ].join(' ');

      this.log(`Command: ${jestCmd}`, 'info');

      const output = execSync(jestCmd, {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: (suite.timeout || 30000) + 10000, // Add buffer to Jest timeout
      });

      const duration = Date.now() - startTime;
      this.log(`✅ ${suite.name} - PASSED (${duration}ms)`, 'success');
      
      return { passed: true, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.stdout || error.stderr || error.message || 'Unknown error';
      
      this.log(`❌ ${suite.name} - FAILED (${duration}ms)`, 'error');
      this.log(`Error: ${errorMessage}`, 'error');
      
      return { passed: false, error: errorMessage, duration };
    }
  }

  private async runPlaywrightTest(suite: TestSuite): Promise<{ passed: boolean; error?: string; duration: number }> {
    const startTime = Date.now();
    
    try {
      const testPath = path.join(this.projectRoot, suite.pattern);
      
      if (!existsSync(testPath)) {
        throw new Error(`Test file not found: ${testPath}`);
      }

      this.log(`Running: ${suite.name}`, 'info');
      this.log(`Pattern: ${suite.pattern}`, 'info');
      this.log(`Description: ${suite.description}`, 'info');

      // Configure Playwright command
      const playwrightCmd = [
        'npx playwright test',
        `"${suite.pattern}"`,
        '--reporter=line',
        `--timeout=${suite.timeout || 30000}`,
        '--retries=1'
      ].join(' ');

      this.log(`Command: ${playwrightCmd}`, 'info');

      const output = execSync(playwrightCmd, {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: (suite.timeout || 30000) + 30000, // Add buffer to Playwright timeout
      });

      const duration = Date.now() - startTime;
      this.log(`✅ ${suite.name} - PASSED (${duration}ms)`, 'success');
      
      return { passed: true, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.stdout || error.stderr || error.message || 'Unknown error';
      
      this.log(`❌ ${suite.name} - FAILED (${duration}ms)`, 'error');
      this.log(`Error: ${errorMessage}`, 'error');
      
      return { passed: false, error: errorMessage, duration };
    }
  }

  private async checkPrerequisites(): Promise<boolean> {
    this.log('🔍 Checking prerequisites...', 'info');

    try {
      // Check if development server is running
      try {
        execSync('curl -f http://localhost:3000/meeting', { 
          stdio: 'pipe',
          timeout: 5000
        });
        this.log('✅ Development server is running on localhost:3000', 'success');
      } catch {
        this.log('⚠️  Development server not detected on localhost:3000', 'warning');
        this.log('   Please run "npm run dev" in another terminal', 'warning');
        return false;
      }

      // Check Jest is available
      execSync('npx jest --version', { stdio: 'pipe' });
      this.log('✅ Jest is available', 'success');

      // Check Playwright is available
      try {
        execSync('npx playwright --version', { stdio: 'pipe' });
        this.log('✅ Playwright is available', 'success');
      } catch {
        this.log('⚠️  Playwright not available - E2E tests will be skipped', 'warning');
      }

      // Check test files exist
      const missingFiles = TEST_SUITES.filter(suite => {
        const testPath = path.join(this.projectRoot, suite.pattern);
        return !existsSync(testPath);
      });

      if (missingFiles.length > 0) {
        this.log('❌ Missing test files:', 'error');
        missingFiles.forEach(suite => {
          this.log(`   - ${suite.pattern}`, 'error');
        });
        return false;
      }

      this.log('✅ All test files found', 'success');
      return true;

    } catch (error: any) {
      this.log(`❌ Prerequisites check failed: ${error.message}`, 'error');
      return false;
    }
  }

  public async runAllTests(): Promise<void> {
    this.log('🧪 Meeting Modal Flickering Fix - Comprehensive Test Suite', 'info');
    this.log('=' * 60, 'info');

    // Check prerequisites
    const prerequisitesPassed = await this.checkPrerequisites();
    if (!prerequisitesPassed) {
      this.log('❌ Prerequisites check failed. Please resolve issues before running tests.', 'error');
      process.exit(1);
    }

    this.log('\n🚀 Starting test execution...', 'info');

    // Run each test suite
    for (const suite of TEST_SUITES) {
      this.log(`\n${'='.repeat(60)}`, 'info');
      
      let result;
      if (suite.pattern.includes('.test.ts') && suite.pattern.includes('e2e')) {
        // E2E tests use Playwright
        result = await this.runPlaywrightTest(suite);
      } else {
        // Unit and integration tests use Jest
        result = await this.runJestTest(suite);
      }

      this.results.push({
        suite: suite.name,
        ...result
      });

      // Small delay between test suites
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    this.printSummary();
  }

  private printSummary(): void {
    this.log(`\n${'='.repeat(60)}`, 'info');
    this.log('📊 TEST SUMMARY', 'info');
    this.log(`${'='.repeat(60)}`, 'info');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = result.duration ? `(${result.duration}ms)` : '';
      this.log(`${status} ${result.suite} ${duration}`, result.passed ? 'success' : 'error');
      
      if (!result.passed && result.error) {
        this.log(`   Error: ${result.error.split('\n')[0]}`, 'error');
      }
    });

    this.log(`\n📈 Results: ${passed}/${total} passed`, passed === total ? 'success' : 'warning');

    if (failed > 0) {
      this.log('\n❌ Some tests failed. Please review the errors above.', 'error');
      process.exit(1);
    } else {
      this.log('\n🎉 All tests passed! The meeting modal flickering fix is working correctly.', 'success');
      this.log('\nKey improvements verified:', 'success');
      this.log('• Modal opens immediately without setTimeout delays', 'success');
      this.log('• No rapid show/hide cycles causing flickering', 'success');
      this.log('• Proper state management prevents multiple simultaneous actions', 'success');
      this.log('• All existing functionality preserved', 'success');
      this.log('• Improved performance and responsiveness', 'success');
      this.log('• Real browser behavior validates the fix', 'success');
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default TestRunner;