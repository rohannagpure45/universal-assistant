#!/usr/bin/env tsx

/**
 * Dashboard Test Runner
 * 
 * Comprehensive test runner for dashboard modifications including:
 * - Unit tests for dashboard components
 * - Integration tests for data services
 * - E2E tests with Playwright
 * - Performance and accessibility checks
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: string;
}

interface TestSuite {
  name: string;
  command: string;
  args: string[];
  timeout: number;
  description: string;
}

class DashboardTestRunner {
  private results: TestResult[] = [];
  private startTime = Date.now();

  private testSuites: TestSuite[] = [
    {
      name: 'Dashboard Unit Tests',
      command: 'npm',
      args: ['run', 'test', '--', 'dashboard-components.test.ts'],
      timeout: 60000,
      description: 'Unit and integration tests for dashboard components'
    },
    {
      name: 'Dashboard E2E Tests',
      command: 'npx',
      args: ['playwright', 'test', 'tests/e2e/dashboard.spec.ts', '--reporter=list'],
      timeout: 300000,
      description: 'End-to-end tests for dashboard functionality'
    },
    {
      name: 'Dashboard Modifications E2E',
      command: 'npx',
      args: ['playwright', 'test', 'tests/e2e/dashboard-modifications.spec.ts', '--reporter=list'],
      timeout: 300000,
      description: 'Specific tests for dashboard modifications'
    },
    {
      name: 'Dashboard Performance Tests',
      command: 'npx',
      args: ['playwright', 'test', 'tests/e2e/dashboard.spec.ts', '--grep', 'Performance', '--reporter=list'],
      timeout: 180000,
      description: 'Performance-focused dashboard tests'
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('\n🚀 Starting Dashboard Test Suite\n');
    console.log('=' .repeat(60));
    console.log('Testing dashboard modifications:');
    console.log('  ✓ Removed scheduling features');
    console.log('  ✓ Modified Quick Actions');
    console.log('  ✓ Real Firebase data integration');
    console.log('  ✓ Navigation behavior');
    console.log('  ✓ Responsive design');
    console.log('=' .repeat(60));
    console.log();

    // Check if required files exist
    await this.checkPrerequisites();

    // Run each test suite
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate report
    await this.generateReport();
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking prerequisites...\n');

    const requiredFiles = [
      'tests/e2e/dashboard.spec.ts',
      'tests/e2e/dashboard-modifications.spec.ts',
      'tests/e2e/page-objects/dashboard.page.ts',
      'tests/integration/dashboard-components.test.ts',
      'playwright.config.ts'
    ];

    const missingFiles: string[] = [];

    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), file));
        console.log(`  ✓ ${file}`);
      } catch (error) {
        console.log(`  ✗ ${file} (missing)`);
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      console.log('\n❌ Missing required test files:');
      missingFiles.forEach(file => console.log(`   - ${file}`));
      console.log('\nPlease ensure all test files are created before running the test suite.\n');
      process.exit(1);
    }

    console.log('\n✅ All prerequisites met\n');
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n📋 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log('   ' + '-'.repeat(50));

    const startTime = Date.now();
    
    try {
      const result = await this.executeCommand(suite.command, suite.args, suite.timeout);
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`   ✅ PASSED (${duration}ms)`);
        this.results.push({
          name: suite.name,
          passed: true,
          duration
        });
      } else {
        console.log(`   ❌ FAILED (${duration}ms)`);
        console.log(`   Error: ${result.error}`);
        this.results.push({
          name: suite.name,
          passed: false,
          duration,
          error: result.error,
          details: result.output
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ FAILED (${duration}ms)`);
      console.log(`   Error: ${error}`);
      this.results.push({
        name: suite.name,
        passed: false,
        duration,
        error: String(error)
      });
    }
  }

  private executeCommand(command: string, args: string[], timeout: number): Promise<{success: boolean, error?: string, output?: string}> {
    return new Promise((resolve) => {
      let output = '';
      let errorOutput = '';

      const child: ChildProcess = spawn(command, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });

      // Handle timeout
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          error: `Test timed out after ${timeout}ms`,
          output: output
        });
      }, timeout);

      // Collect output
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          resolve({
            success: false,
            error: `Process exited with code ${code}`,
            output: output + errorOutput
          });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `Failed to start process: ${error.message}`,
          output: output
        });
      });
    });
  }

  private async generateReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    console.log('\n' + '='.repeat(60));
    console.log('📊 DASHBOARD TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log();

    // Detailed results
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.name} (${result.duration}ms)`);
      
      if (!result.passed && result.error) {
        console.log(`      Error: ${result.error}`);
      }
    });

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      results: this.results,
      summary: {
        total: this.results.length,
        passed,
        failed,
        successRate: (passed / this.results.length) * 100
      }
    };

    const reportPath = path.join(process.cwd(), 'tests/reports/dashboard-test-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📝 Report saved to: ${reportPath}`);

    // Recommendations based on results
    if (failed > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      
      const failedTests = this.results.filter(r => !r.passed);
      failedTests.forEach(test => {
        if (test.name.includes('E2E') && test.error?.includes('timeout')) {
          console.log('  • Consider increasing E2E test timeouts for slower environments');
        }
        if (test.name.includes('Unit') && test.error?.includes('Firebase')) {
          console.log('  • Ensure Firebase emulator is running for unit tests');
        }
        if (test.error?.includes('browser')) {
          console.log('  • Install Playwright browsers: npx playwright install');
        }
      });
    } else {
      console.log('\n🎉 All dashboard tests passed! The modifications are working correctly.');
    }

    console.log('\n' + '='.repeat(60));
    process.exit(failed > 0 ? 1 : 0);
  }
}

// CLI interface
async function main() {
  const runner = new DashboardTestRunner();
  
  try {
    await runner.runAllTests();
  } catch (error) {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}