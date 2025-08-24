#!/usr/bin/env ts-node
/**
 * Voice Identification Test Suite Runner
 * 
 * Comprehensive test runner for the Phase 2 voice identification system.
 * Runs integration tests, E2E tests, and generates detailed reports.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

interface TestResult {
  suiteName: string;
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  errors: string[];
}

interface TestRunnerOptions {
  integration: boolean;
  e2e: boolean;
  coverage: boolean;
  performance: boolean;
  verbose: boolean;
  maxWorkers: number;
  timeout: number;
}

class VoiceIdentificationTestRunner {
  private options: TestRunnerOptions;
  private results: TestResult[] = [];

  constructor(options: Partial<TestRunnerOptions> = {}) {
    this.options = {
      integration: true,
      e2e: true,
      coverage: false,
      performance: true,
      verbose: false,
      maxWorkers: 2,
      timeout: 60000,
      ...options
    };
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Voice Identification Test Suite');
    console.log(`Configuration:`, {
      integration: this.options.integration,
      e2e: this.options.e2e,
      coverage: this.options.coverage,
      performance: this.options.performance,
      maxWorkers: this.options.maxWorkers,
      timeout: this.options.timeout
    });

    const startTime = Date.now();

    try {
      // Pre-test setup
      await this.setupTestEnvironment();

      // Run integration tests
      if (this.options.integration) {
        await this.runIntegrationTests();
      }

      // Run E2E tests
      if (this.options.e2e) {
        await this.runE2ETests();
      }

      // Run performance benchmarks
      if (this.options.performance) {
        await this.runPerformanceTests();
      }

      // Generate reports
      await this.generateReports();

      const totalTime = Date.now() - startTime;
      console.log(`\n✅ Test suite completed in ${(totalTime / 1000).toFixed(2)}s`);
      
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('\n🔧 Setting up test environment...');
    
    // Ensure coverage directory exists if coverage is enabled
    if (this.options.coverage) {
      try {
        await fs.mkdir(path.join(process.cwd(), 'coverage', 'voice-identification'), { recursive: true });
      } catch (error) {
        console.warn('Warning: Could not create coverage directory');
      }
    }

    // Clear Jest cache
    try {
      await execAsync('npx jest --clearCache');
    } catch (error) {
      console.warn('Warning: Could not clear Jest cache');
    }

    console.log('✅ Test environment ready');
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔬 Running Integration Tests...');
    
    const integrationTests = [
      {
        name: 'Voice Capture Integration',
        file: 'tests/integration/voice-capture.test.ts',
        description: 'Tests voice capture service with enhanced audio processing'
      },
      {
        name: 'Audio Processing Pipeline',
        file: 'tests/integration/audio-processing.test.ts',
        description: 'Tests complete audio processing workflow'
      },
      {
        name: 'Firebase Storage Integration',
        file: 'tests/integration/firebase-storage.test.ts',
        description: 'Tests voice sample storage and retrieval'
      }
    ];

    for (const test of integrationTests) {
      console.log(`  → Running ${test.name}...`);
      if (this.options.verbose) {
        console.log(`    ${test.description}`);
      }

      const result = await this.runJestTest(test.file, test.name);
      this.results.push(result);

      if (result.failed > 0) {
        console.log(`  ❌ ${test.name}: ${result.failed} failed, ${result.passed} passed`);
        if (result.errors.length > 0 && this.options.verbose) {
          result.errors.forEach(error => console.log(`    Error: ${error}`));
        }
      } else {
        console.log(`  ✅ ${test.name}: ${result.passed} passed in ${(result.duration / 1000).toFixed(2)}s`);
      }
    }
  }

  private async runE2ETests(): Promise<void> {
    console.log('\n🎭 Running End-to-End Tests...');
    
    const e2eTests = [
      {
        name: 'Voice Identification E2E Flow',
        file: 'tests/e2e/voice-identification.e2e.test.ts',
        description: 'Tests complete voice identification workflow'
      }
    ];

    for (const test of e2eTests) {
      console.log(`  → Running ${test.name}...`);
      if (this.options.verbose) {
        console.log(`    ${test.description}`);
      }

      const result = await this.runJestTest(test.file, test.name, {
        testTimeout: this.options.timeout,
        maxWorkers: 1 // E2E tests should run serially
      });
      this.results.push(result);

      if (result.failed > 0) {
        console.log(`  ❌ ${test.name}: ${result.failed} failed, ${result.passed} passed`);
        if (result.errors.length > 0 && this.options.verbose) {
          result.errors.forEach(error => console.log(`    Error: ${error}`));
        }
      } else {
        console.log(`  ✅ ${test.name}: ${result.passed} passed in ${(result.duration / 1000).toFixed(2)}s`);
      }
    }
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('\n⚡ Running Performance Benchmarks...');
    
    // Performance tests are embedded within the main test suites
    // This section could run specific performance-focused test patterns
    
    try {
      const performanceResult = await this.runJestTest(
        'tests/integration/audio-processing.test.ts',
        'Audio Processing Performance',
        {
          testNamePattern: 'Performance|performance|benchmark|load|memory',
          silent: !this.options.verbose
        }
      );

      this.results.push(performanceResult);

      if (performanceResult.failed > 0) {
        console.log(`  ❌ Performance tests: ${performanceResult.failed} failed`);
      } else {
        console.log(`  ✅ Performance benchmarks passed: ${performanceResult.passed} tests`);
      }
    } catch (error) {
      console.warn('⚠️ Performance tests could not be run separately');
    }
  }

  private async runJestTest(
    testFile: string, 
    suiteName: string, 
    options: {
      testTimeout?: number;
      maxWorkers?: number;
      testNamePattern?: string;
      silent?: boolean;
    } = {}
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    let jestCommand = `npx jest ${testFile}`;
    
    // Add Jest options
    if (options.testTimeout) {
      jestCommand += ` --testTimeout=${options.testTimeout}`;
    }
    
    if (options.maxWorkers) {
      jestCommand += ` --maxWorkers=${options.maxWorkers}`;
    }
    
    if (options.testNamePattern) {
      jestCommand += ` --testNamePattern="${options.testNamePattern}"`;
    }
    
    if (this.options.coverage) {
      jestCommand += ' --coverage --collectCoverageFrom="src/services/voice-identification/**/*.ts" --collectCoverageFrom="src/services/audio-processing/**/*.ts"';
    }
    
    if (this.options.verbose) {
      jestCommand += ' --verbose';
    }
    
    if (options.silent) {
      jestCommand += ' --silent';
    }

    try {
      const { stdout, stderr } = await execAsync(jestCommand);
      const duration = Date.now() - startTime;
      
      // Parse Jest output to extract test results
      const result = this.parseJestOutput(stdout, stderr, suiteName, duration);
      
      if (this.options.verbose && stderr) {
        console.log('Test output:', stdout);
        if (stderr) console.log('Errors:', stderr);
      }
      
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Jest exits with code 1 when tests fail, parse the output anyway
      const result = this.parseJestOutput(
        error.stdout || '', 
        error.stderr || error.message, 
        suiteName, 
        duration
      );
      
      return result;
    }
  }

  private parseJestOutput(stdout: string, stderr: string, suiteName: string, duration: number): TestResult {
    const result: TestResult = {
      suiteName,
      duration,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // Parse test results from Jest output
    const passedMatch = stdout.match(/(\d+) passed/);
    const failedMatch = stdout.match(/(\d+) failed/);
    const skippedMatch = stdout.match(/(\d+) skipped/);

    if (passedMatch) result.passed = parseInt(passedMatch[1]);
    if (failedMatch) result.failed = parseInt(failedMatch[1]);
    if (skippedMatch) result.skipped = parseInt(skippedMatch[1]);

    // Extract coverage information if present
    const coverageMatch = stdout.match(/All files\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)\s*\|\s*(\d+\.?\d*)/);
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    // Extract error messages
    if (stderr) {
      const errorLines = stderr.split('\n').filter(line => 
        line.includes('Error:') || line.includes('Failed:') || line.includes('✕')
      );
      result.errors = errorLines;
    }

    return result;
  }

  private async generateReports(): Promise<void> {
    console.log('\n📊 Generating Test Reports...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      configuration: this.options,
      results: this.results,
      summary: {
        totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed, 0),
        totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
        totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
        overallSuccess: this.results.every(r => r.failed === 0)
      }
    };

    // Write JSON report
    try {
      const reportsDir = path.join(process.cwd(), 'coverage', 'voice-identification');
      await fs.mkdir(reportsDir, { recursive: true });
      
      await fs.writeFile(
        path.join(reportsDir, 'test-report.json'),
        JSON.stringify(reportData, null, 2)
      );
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(reportData);
      await fs.writeFile(
        path.join(reportsDir, 'test-report.md'),
        markdownReport
      );
      
      console.log('✅ Reports generated in coverage/voice-identification/');
      
    } catch (error) {
      console.warn('⚠️ Could not write test reports:', error);
    }
  }

  private generateMarkdownReport(reportData: any): string {
    const { summary, results } = reportData;
    
    let markdown = `# Voice Identification Test Report\n\n`;
    markdown += `Generated: ${reportData.timestamp}\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${summary.totalTests}\n`;
    markdown += `- **Passed:** ${summary.totalPassed} ✅\n`;
    markdown += `- **Failed:** ${summary.totalFailed} ${summary.totalFailed > 0 ? '❌' : ''}\n`;
    markdown += `- **Skipped:** ${summary.totalSkipped}\n`;
    markdown += `- **Duration:** ${(summary.totalDuration / 1000).toFixed(2)}s\n`;
    markdown += `- **Success Rate:** ${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}%\n\n`;
    
    markdown += `## Test Suites\n\n`;
    
    for (const result of results) {
      const status = result.failed === 0 ? '✅' : '❌';
      markdown += `### ${status} ${result.suiteName}\n\n`;
      markdown += `- Passed: ${result.passed}\n`;
      markdown += `- Failed: ${result.failed}\n`;
      markdown += `- Duration: ${(result.duration / 1000).toFixed(2)}s\n`;
      
      if (result.coverage) {
        markdown += `- Coverage:\n`;
        markdown += `  - Statements: ${result.coverage.statements}%\n`;
        markdown += `  - Branches: ${result.coverage.branches}%\n`;
        markdown += `  - Functions: ${result.coverage.functions}%\n`;
        markdown += `  - Lines: ${result.coverage.lines}%\n`;
      }
      
      if (result.errors.length > 0) {
        markdown += `- Errors:\n`;
        result.errors.forEach(error => {
          markdown += `  - ${error}\n`;
        });
      }
      
      markdown += `\n`;
    }
    
    return markdown;
  }

  private printSummary(): void {
    const summary = {
      totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed, 0),
      totalPassed: this.results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: this.results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: this.results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
    };

    console.log('\n📈 Test Summary:');
    console.log(`  Total Tests: ${summary.totalTests}`);
    console.log(`  Passed: ${summary.totalPassed} ✅`);
    console.log(`  Failed: ${summary.totalFailed} ${summary.totalFailed > 0 ? '❌' : ''}`);
    console.log(`  Skipped: ${summary.totalSkipped}`);
    console.log(`  Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    console.log(`  Success Rate: ${((summary.totalPassed / summary.totalTests) * 100).toFixed(1)}%`);

    if (summary.totalFailed > 0) {
      console.log('\n❌ Some tests failed. Check the detailed output above.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const options: Partial<TestRunnerOptions> = {
    integration: !args.includes('--no-integration'),
    e2e: !args.includes('--no-e2e'),
    coverage: args.includes('--coverage'),
    performance: !args.includes('--no-performance'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    maxWorkers: parseInt(args.find(arg => arg.startsWith('--max-workers='))?.split('=')[1] || '2'),
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '60000')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Voice Identification Test Runner

Usage: npm run test:voice-identification [options]

Options:
  --coverage              Enable coverage reporting
  --verbose, -v           Enable verbose output
  --no-integration       Skip integration tests
  --no-e2e               Skip end-to-end tests
  --no-performance       Skip performance benchmarks
  --max-workers=N        Set maximum Jest workers (default: 2)
  --timeout=N            Set test timeout in ms (default: 60000)
  --help, -h             Show this help

Examples:
  npm run test:voice-identification
  npm run test:voice-identification -- --coverage --verbose
  npm run test:voice-identification -- --no-e2e --max-workers=4
    `);
    return;
  }

  const runner = new VoiceIdentificationTestRunner(options);
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { VoiceIdentificationTestRunner };