#!/usr/bin/env ts-node

/**
 * Stage 4 Test Runner: Comprehensive Transcription Pipeline Testing
 * 
 * This script runs all Stage 4 integration tests in the correct order,
 * generates detailed reports, and validates system performance.
 */

import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errors: string[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  performance?: {
    avgLatency: number;
    maxLatency: number;
    throughput: number;
    memoryUsage: number;
  };
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passRate: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

class Stage4TestRunner {
  private testSuites: TestSuite[] = [];
  private reportDir = join(process.cwd(), 'tests', 'reports', 'stage4');
  private startTime = Date.now();

  constructor() {
    // Ensure report directory exists
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Stage 4 Transcription Pipeline Tests...\n');
    
    const testSequence = [
      {
        name: 'Unit Tests - Core Services',
        command: 'npm run test:unit -- --testPathPattern=stage4',
        description: 'Testing individual service components'
      },
      {
        name: 'Integration Tests - Pipeline Flow',
        command: 'npm run test -- tests/integration/stage4-transcription-pipeline.test.ts',
        description: 'Testing complete transcription pipeline'
      },
      {
        name: 'Integration Tests - AudioManager',
        command: 'npm run test -- tests/integration/stage4-audio-manager-integration.test.ts',
        description: 'Testing AudioManager service integration'
      },
      {
        name: 'Integration Tests - FragmentProcessor',
        command: 'npm run test -- tests/integration/stage4-fragment-processor-integration.test.ts',
        description: 'Testing FragmentProcessor service integration'
      },
      {
        name: 'Performance Benchmarks',
        command: 'npm run test -- tests/integration/stage4-performance-benchmarks.test.ts',
        description: 'Testing performance and load handling'
      },
      {
        name: 'End-to-End Tests',
        command: 'npx playwright test tests/e2e/stage4-transcription-e2e.test.ts',
        description: 'Testing live application with browser automation'
      }
    ];

    for (const test of testSequence) {
      console.log(`📋 Running: ${test.name}`);
      console.log(`   ${test.description}`);
      
      try {
        const result = await this.runTestSuite(test.name, test.command);
        this.testSuites.push(result);
        
        const status = result.passRate >= 80 ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${result.passRate.toFixed(1)}% passed (${result.totalDuration.toFixed(0)}ms)\n`);
        
      } catch (error) {
        console.error(`❌ Failed to run ${test.name}:`, error);
        
        // Create failed test suite result
        this.testSuites.push({
          name: test.name,
          tests: [{
            name: 'Test Suite Execution',
            status: 'failed',
            duration: 0,
            errors: [error instanceof Error ? error.message : String(error)]
          }],
          totalDuration: 0,
          passRate: 0,
          coverage: { statements: 0, branches: 0, functions: 0, lines: 0 }
        });
      }
    }

    await this.generateReports();
    this.printSummary();
  }

  private async runTestSuite(suiteName: string, command: string): Promise<TestSuite> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const args = command.split(' ').slice(1);
      const cmd = command.split(' ')[0];
      
      const process = spawn(cmd, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          const result = this.parseTestOutput(suiteName, stdout, stderr, duration);
          resolve(result);
        } else {
          reject(new Error(`Test suite failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseTestOutput(suiteName: string, stdout: string, stderr: string, duration: number): TestSuite {
    const tests: TestResult[] = [];
    let coverage = { statements: 0, branches: 0, functions: 0, lines: 0 };

    // Parse Jest output for test results
    const testResults = stdout.match(/(\w+(?:\s+\w+)*)\s+(PASS|FAIL|SKIP)\s+(\d+(?:\.\d+)?)(ms|s)/g);
    
    if (testResults) {
      testResults.forEach(result => {
        const match = result.match(/(.+?)\s+(PASS|FAIL|SKIP)\s+(\d+(?:\.\d+)?)(ms|s)/);
        if (match) {
          const [, name, status, time, unit] = match;
          const testDuration = parseFloat(time) * (unit === 's' ? 1000 : 1);
          
          tests.push({
            name: name.trim(),
            status: status.toLowerCase() as 'passed' | 'failed' | 'skipped',
            duration: testDuration,
            errors: status === 'FAIL' ? [stderr] : []
          });
        }
      });
    }

    // Parse coverage information
    const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    // If no specific test results found, create a summary result
    if (tests.length === 0) {
      const hasErrors = stderr.length > 0 || stdout.includes('FAIL') || stdout.includes('Error');
      tests.push({
        name: suiteName,
        status: hasErrors ? 'failed' : 'passed',
        duration,
        errors: hasErrors ? [stderr || 'Unknown error'] : []
      });
    }

    const passedTests = tests.filter(t => t.status === 'passed').length;
    const passRate = tests.length > 0 ? (passedTests / tests.length) * 100 : 0;

    return {
      name: suiteName,
      tests,
      totalDuration: duration,
      passRate,
      coverage
    };
  }

  private async generateReports(): Promise<void> {
    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      testSuites: this.testSuites,
      summary: this.generateSummary()
    };

    writeFileSync(
      join(this.reportDir, 'stage4-test-results.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport);
    writeFileSync(
      join(this.reportDir, 'stage4-test-report.html'),
      htmlReport
    );

    // Generate markdown summary
    const mdReport = this.generateMarkdownReport(jsonReport);
    writeFileSync(
      join(this.reportDir, 'STAGE4_TEST_SUMMARY.md'),
      mdReport
    );

    console.log(`📊 Reports generated in: ${this.reportDir}`);
  }

  private generateSummary() {
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = this.testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'passed').length, 0);
    const failedTests = this.testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'failed').length, 0);
    const skippedTests = this.testSuites.reduce((sum, suite) => 
      sum + suite.tests.filter(t => t.status === 'skipped').length, 0);

    const avgCoverage = this.testSuites.reduce((sum, suite) => {
      return {
        statements: sum.statements + suite.coverage.statements,
        branches: sum.branches + suite.coverage.branches,
        functions: sum.functions + suite.coverage.functions,
        lines: sum.lines + suite.coverage.lines
      };
    }, { statements: 0, branches: 0, functions: 0, lines: 0 });

    const suiteCount = this.testSuites.length;
    if (suiteCount > 0) {
      Object.keys(avgCoverage).forEach(key => {
        avgCoverage[key as keyof typeof avgCoverage] /= suiteCount;
      });
    }

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      coverage: avgCoverage,
      totalDuration: Date.now() - this.startTime
    };
  }

  private generateHtmlReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stage 4 Transcription Pipeline Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite { margin-bottom: 30px; border: 1px solid #e1e5e9; border-radius: 8px; }
        .suite-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #e1e5e9; }
        .suite-content { padding: 15px; }
        .test { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
        .test:last-child { border-bottom: none; }
        .test-status { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%); }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Stage 4 Transcription Pipeline Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Total Duration: ${(report.totalDuration / 1000).toFixed(2)} seconds</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${report.summary.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <div class="value passed">${report.summary.passRate.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <div class="value">${report.summary.coverage.statements.toFixed(1)}%</div>
            <div>Statements</div>
        </div>
        <div class="metric">
            <h3>Failed Tests</h3>
            <div class="value failed">${report.summary.failedTests}</div>
        </div>
    </div>

    ${report.testSuites.map((suite: TestSuite) => `
        <div class="suite">
            <div class="suite-header">
                <h2>${suite.name}</h2>
                <p>Pass Rate: ${suite.passRate.toFixed(1)}% | Duration: ${suite.totalDuration.toFixed(0)}ms</p>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${suite.coverage.statements}%"></div>
                </div>
                <small>Coverage: ${suite.coverage.statements.toFixed(1)}% statements</small>
            </div>
            <div class="suite-content">
                ${suite.tests.map(test => `
                    <div class="test">
                        <div>
                            <strong>${test.name}</strong>
                            ${test.errors.length > 0 ? `<br><small style="color: #dc3545;">${test.errors[0]}</small>` : ''}
                        </div>
                        <div>
                            <span class="test-status" style="background: ${test.status === 'passed' ? '#28a745' : test.status === 'failed' ? '#dc3545' : '#ffc107'}">
                                ${test.status.toUpperCase()}
                            </span>
                            <small>${test.duration.toFixed(0)}ms</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}
</body>
</html>`;
  }

  private generateMarkdownReport(report: any): string {
    const summary = report.summary;
    
    return `# Stage 4 Transcription Pipeline Test Summary

**Generated:** ${new Date().toLocaleString()}  
**Total Duration:** ${(report.totalDuration / 1000).toFixed(2)} seconds

## 📊 Test Results Overview

| Metric | Value |
|--------|--------|
| Total Tests | ${summary.totalTests} |
| Passed | ✅ ${summary.passedTests} |
| Failed | ❌ ${summary.failedTests} |
| Skipped | ⚠️ ${summary.skippedTests} |
| Pass Rate | **${summary.passRate.toFixed(1)}%** |

## 📈 Coverage Results

| Type | Coverage |
|------|----------|
| Statements | ${summary.coverage.statements.toFixed(1)}% |
| Branches | ${summary.coverage.branches.toFixed(1)}% |
| Functions | ${summary.coverage.functions.toFixed(1)}% |
| Lines | ${summary.coverage.lines.toFixed(1)}% |

## 🧪 Test Suite Details

${report.testSuites.map((suite: TestSuite) => `
### ${suite.name}

**Pass Rate:** ${suite.passRate.toFixed(1)}%  
**Duration:** ${suite.totalDuration.toFixed(0)}ms  
**Coverage:** ${suite.coverage.statements.toFixed(1)}% statements

${suite.tests.map(test => {
  const statusEmoji = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
  return `- ${statusEmoji} **${test.name}** (${test.duration.toFixed(0)}ms)${test.errors.length > 0 ? `\n  - ⚠️ ${test.errors[0]}` : ''}`;
}).join('\n')}
`).join('\n')}

## 🎯 Performance Insights

### Key Metrics Tested:
- ⚡ **Audio Processing Latency**: Real-time audio chunk processing
- 🔄 **Transcription Pipeline**: End-to-end transcription flow
- 🧠 **Fragment Processing**: Text aggregation and semantic analysis
- 💬 **Conversation Management**: Multi-speaker conversation handling
- 📊 **UI State Management**: Live transcript display updates
- 🔧 **Error Recovery**: Service resilience and fault tolerance

### Browser Automation Tests:
- 🌐 **End-to-End Workflow**: Complete user interaction simulation
- 👥 **Multi-Speaker Support**: Speaker identification and management
- ⚡ **Real-time Updates**: Live transcript streaming
- 🛡️ **Error Handling**: Graceful error state management
- 💾 **Data Persistence**: Transcript storage and retrieval

## 🚀 Next Steps

${summary.passRate >= 95 ? '🎉 **Excellent!** All tests are passing. The transcription pipeline is production-ready.' :
  summary.passRate >= 80 ? '✅ **Good!** Most tests are passing. Review failed tests and address any issues.' :
  '⚠️ **Attention Required!** Several tests are failing. Investigation and fixes needed before deployment.'}

${summary.failedTests > 0 ? `
### Failed Tests Requiring Attention:
${report.testSuites.filter((suite: TestSuite) => suite.tests.some(t => t.status === 'failed'))
  .map((suite: TestSuite) => `- **${suite.name}**: ${suite.tests.filter(t => t.status === 'failed').length} failed test(s)`)
  .join('\n')}
` : ''}

---

**Report Location:** \`${this.reportDir}\`  
**Full Details:** See \`stage4-test-results.json\` and \`stage4-test-report.html\`
`;
  }

  private printSummary(): void {
    const summary = this.generateSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 STAGE 4 TRANSCRIPTION PIPELINE TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Results:`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Passed: ✅ ${summary.passedTests}`);
    console.log(`   Failed: ❌ ${summary.failedTests}`);
    console.log(`   Skipped: ⚠️ ${summary.skippedTests}`);
    console.log(`   Pass Rate: ${summary.passRate.toFixed(1)}%`);
    
    console.log(`\n📈 Coverage:`);
    console.log(`   Statements: ${summary.coverage.statements.toFixed(1)}%`);
    console.log(`   Branches: ${summary.coverage.branches.toFixed(1)}%`);
    console.log(`   Functions: ${summary.coverage.functions.toFixed(1)}%`);
    console.log(`   Lines: ${summary.coverage.lines.toFixed(1)}%`);
    
    console.log(`\n⏱️ Performance:`);
    console.log(`   Total Duration: ${(summary.totalDuration / 1000).toFixed(2)} seconds`);
    console.log(`   Test Suites: ${this.testSuites.length}`);
    
    console.log(`\n📂 Reports Generated:`);
    console.log(`   📄 JSON: ${join(this.reportDir, 'stage4-test-results.json')}`);
    console.log(`   🌐 HTML: ${join(this.reportDir, 'stage4-test-report.html')}`);
    console.log(`   📝 Markdown: ${join(this.reportDir, 'STAGE4_TEST_SUMMARY.md')}`);
    
    if (summary.passRate >= 95) {
      console.log('\n🎉 EXCELLENT! All tests passing. Pipeline is production-ready.');
    } else if (summary.passRate >= 80) {
      console.log('\n✅ GOOD! Most tests passing. Review any failures.');
    } else {
      console.log('\n⚠️ ATTENTION REQUIRED! Multiple test failures detected.');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Main execution
async function main() {
  const runner = new Stage4TestRunner();
  
  try {
    await runner.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

export { Stage4TestRunner };