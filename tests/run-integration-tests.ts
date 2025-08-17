#!/usr/bin/env ts-node
/**
 * Integration Test Runner
 * Comprehensive test execution with performance monitoring and reporting
 */

import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout: number;
  critical: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

interface PerformanceMetrics {
  totalDuration: number;
  averageDuration: number;
  slowestTest: string;
  fastestTest: string;
  memoryUsage: number;
}

class IntegrationTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Phase 2 Final Verification',
      file: 'phase2-final-verification.test.ts',
      description: 'Comprehensive Phase 2 integration validation',
      timeout: 120000,
      critical: true
    },
    {
      name: 'Type System Validation',
      file: 'type-system-validation.test.ts',
      description: 'Validates type system consistency and migration',
      timeout: 30000,
      critical: true
    },
    {
      name: 'Error Handling & Recovery',
      file: 'error-handling-recovery.test.ts',
      description: 'Tests error handling and recovery patterns',
      timeout: 60000,
      critical: true
    },
    {
      name: 'Performance & Memory Management',
      file: 'performance-memory.test.ts',
      description: 'Performance benchmarks and memory leak detection',
      timeout: 90000,
      critical: true
    },
    {
      name: 'Production Readiness',
      file: 'production-readiness.test.ts',
      description: 'End-to-end production readiness validation',
      timeout: 180000,
      critical: true
    },
    // Original test suites (maintained for backwards compatibility)
    {
      name: 'Authentication Flow',
      file: 'auth-flow.test.ts',
      description: 'Tests complete authentication workflows',
      timeout: 30000,
      critical: false
    },
    {
      name: 'Database + State Integration',
      file: 'database-state.test.ts',
      description: 'Tests database operations with state management',
      timeout: 45000,
      critical: false
    },
    {
      name: 'Cross-Store Synchronization',
      file: 'cross-store-sync.test.ts',
      description: 'Tests synchronization between stores',
      timeout: 30000,
      critical: false
    },
    {
      name: 'Real-time Integration',
      file: 'realtime.test.ts',
      description: 'Tests real-time data synchronization',
      timeout: 40000,
      critical: false
    },
    {
      name: 'End-to-End User Journey',
      file: 'e2e-user-journey.test.ts',
      description: 'Tests complete user workflows',
      timeout: 60000,
      critical: false
    },
    {
      name: 'Performance & Concurrency',
      file: 'performance-concurrency.test.ts',
      description: 'Tests performance and concurrent operations',
      timeout: 90000,
      critical: false
    }
  ];

  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🧪 Universal Assistant Integration Test Suite\n');
    console.log('========================================\n');

    this.startTime = performance.now();
    
    const options = this.parseCommandLineArgs();
    const suitesToRun = options.suites || this.testSuites.map(s => s.name);
    
    for (const suite of this.testSuites) {
      if (!suitesToRun.includes(suite.name)) {
        continue;
      }

      await this.runTestSuite(suite, options);
    }

    this.printSummary();
    this.checkCriticalTests();
  }

  private parseCommandLineArgs(): {
    suites?: string[];
    verbose?: boolean;
    bail?: boolean;
    coverage?: boolean;
    performance?: boolean;
  } {
    const args = process.argv.slice(2);
    const options: any = {};

    if (args.includes('--verbose')) {
      options.verbose = true;
    }
    
    if (args.includes('--bail')) {
      options.bail = true;
    }

    if (args.includes('--coverage')) {
      options.coverage = true;
    }

    if (args.includes('--performance')) {
      options.performance = true;
    }

    const suiteIndex = args.indexOf('--suite');
    if (suiteIndex !== -1 && args[suiteIndex + 1]) {
      options.suites = [args[suiteIndex + 1]];
    }

    return options;
  }

  private async runTestSuite(suite: TestSuite, options: any): Promise<void> {
    console.log(`🔍 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);

    const startTime = performance.now();

    try {
      const result = await this.executeJestTest(suite, options);
      const duration = performance.now() - startTime;

      this.results.push({
        suite: suite.name,
        passed: result.passed,
        duration,
        output: result.output,
        error: result.error
      });

      if (result.passed) {
        console.log(`   ✅ Passed (${(duration / 1000).toFixed(2)}s)\n`);
      } else {
        console.log(`   ❌ Failed (${(duration / 1000).toFixed(2)}s)`);
        if (options.verbose || suite.critical) {
          console.log(`   Error: ${result.error}\n`);
        } else {
          console.log('');
        }

        if (options.bail) {
          console.log('🛑 Bail option enabled, stopping test execution');
          process.exit(1);
        }
      }

    } catch (error) {
      const duration = performance.now() - startTime;
      console.log(`   ❌ Failed with exception (${(duration / 1000).toFixed(2)}s)`);
      console.log(`   Exception: ${error}\n`);

      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        output: '',
        error: String(error)
      });
    }
  }

  private executeJestTest(suite: TestSuite, options: any): Promise<{
    passed: boolean;
    output: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const testFile = path.join(__dirname, 'integration', suite.file);
      const jestArgs = [
        testFile,
        '--testTimeout',
        suite.timeout.toString(),
        '--detectOpenHandles',
        '--forceExit'
      ];

      if (options.verbose) {
        jestArgs.push('--verbose');
      }

      if (options.coverage) {
        jestArgs.push('--coverage');
      }

      const jest: ChildProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true'
        }
      });

      let output = '';
      let errorOutput = '';

      jest.stdout?.on('data', (data) => {
        output += data.toString();
      });

      jest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timeoutId = setTimeout(() => {
        jest.kill('SIGKILL');
        resolve({
          passed: false,
          output,
          error: `Test timeout after ${suite.timeout}ms`
        });
      }, suite.timeout);

      jest.on('close', (code) => {
        clearTimeout(timeoutId);
        
        const passed = code === 0;
        resolve({
          passed,
          output,
          error: passed ? undefined : errorOutput || 'Test failed with unknown error'
        });
      });

      jest.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          passed: false,
          output,
          error: `Failed to execute test: ${error.message}`
        });
      });
    });
  }

  private printSummary(): void {
    const totalDuration = performance.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('========================================');
    console.log('📊 Test Summary');
    console.log('========================================');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('');

    if (failed > 0) {
      console.log('❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   - ${result.suite}: ${result.error}`);
        });
      console.log('');
    }

    this.printPerformanceMetrics();
  }

  private printPerformanceMetrics(): void {
    if (this.results.length === 0) return;

    const durations = this.results.map(r => r.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const averageDuration = totalDuration / durations.length;

    const slowestResult = this.results.reduce((prev, current) => 
      prev.duration > current.duration ? prev : current
    );

    const fastestResult = this.results.reduce((prev, current) => 
      prev.duration < current.duration ? prev : current
    );

    console.log('⚡ Performance Metrics:');
    console.log(`Average Duration: ${(averageDuration / 1000).toFixed(2)}s`);
    console.log(`Slowest Test: ${slowestResult.suite} (${(slowestResult.duration / 1000).toFixed(2)}s)`);
    console.log(`Fastest Test: ${fastestResult.suite} (${(fastestResult.duration / 1000).toFixed(2)}s)`);

    const memoryUsage = process.memoryUsage();
    console.log(`Peak Memory: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
  }

  private checkCriticalTests(): void {
    const criticalTests = this.testSuites.filter(s => s.critical);
    const failedCritical = this.results.filter(r => 
      !r.passed && criticalTests.some(c => c.name === r.suite)
    );

    if (failedCritical.length > 0) {
      console.log('🚨 CRITICAL TEST FAILURES:');
      failedCritical.forEach(result => {
        console.log(`   - ${result.suite}`);
      });
      console.log('');
      console.log('Critical tests must pass for production deployment!');
      process.exit(1);
    }

    if (this.results.filter(r => !r.passed).length > 0) {
      console.log('⚠️  Some non-critical tests failed. Review before deployment.');
      process.exit(1);
    }

    console.log('🎉 All tests passed! System is ready for deployment.');
    process.exit(0);
  }
}

// CLI Interface
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };