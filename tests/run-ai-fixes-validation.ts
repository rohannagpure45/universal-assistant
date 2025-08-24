#!/usr/bin/env ts-node

/**
 * AI Fixes Validation Test Runner
 * 
 * Comprehensive test runner to validate all AI response system fixes:
 * 1. Model validation functions
 * 2. API route integration  
 * 3. Build consistency
 * 4. Regression testing
 * 5. E2E workflows
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  output: string;
  errors: string[];
}

interface ValidationReport {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
  };
  results: TestResult[];
  criticalIssues: string[];
  recommendations: string[];
}

class AIFixesValidator {
  private projectRoot: string;
  private results: TestResult[] = [];
  private criticalIssues: string[] = [];
  private recommendations: string[] = [];

  constructor() {
    this.projectRoot = process.cwd();
  }

  async runValidation(): Promise<ValidationReport> {
    console.log('🔍 Starting AI Fixes Validation Tests...\n');
    console.log('=' .repeat(60));

    const startTime = Date.now();

    // Test categories in order of importance
    const testCategories = [
      {
        name: '1. Model Validation Unit Tests',
        command: 'npx jest tests/unit/ai-model-validation.test.ts --verbose',
        critical: true,
        timeout: 60000
      },
      {
        name: '2. Build Consistency Tests', 
        command: 'npx jest tests/integration/build-consistency.test.ts --verbose',
        critical: true,
        timeout: 180000
      },
      {
        name: '3. AI API Integration Tests',
        command: 'npx jest tests/integration/ai-response-api.test.ts --verbose',
        critical: true,
        timeout: 120000
      },
      {
        name: '4. Regression Tests',
        command: 'npx jest tests/integration/ai-fixes-regression.test.ts --verbose',
        critical: false,
        timeout: 120000
      },
      {
        name: '5. TypeScript Compilation Check',
        command: 'npx tsc --noEmit --skipLibCheck',
        critical: true,
        timeout: 120000
      },
      {
        name: '6. Production Build Test',
        command: 'npm run build',
        critical: true,
        timeout: 300000
      }
    ];

    // Run each test category
    for (const category of testCategories) {
      await this.runTestCategory(category);
    }

    // Generate final report
    const totalDuration = Date.now() - startTime;
    const report = this.generateReport(totalDuration);

    this.printReport(report);
    await this.saveReport(report);

    return report;
  }

  private async runTestCategory(category: {
    name: string;
    command: string;
    critical: boolean;
    timeout: number;
  }): Promise<void> {
    console.log(`\n📋 Running: ${category.name}`);
    console.log('-'.repeat(60));

    const startTime = Date.now();
    
    try {
      const result = await this.executeCommand(category.command, category.timeout);
      const duration = Date.now() - startTime;

      const testResult: TestResult = {
        name: category.name,
        passed: result.success,
        duration,
        output: result.output,
        errors: result.errors
      };

      this.results.push(testResult);

      if (result.success) {
        console.log(`✅ ${category.name} - PASSED (${duration}ms)`);
      } else {
        console.log(`❌ ${category.name} - FAILED (${duration}ms)`);
        
        if (category.critical) {
          this.criticalIssues.push(`CRITICAL: ${category.name} failed`);
        }

        // Show first few error lines
        if (result.errors.length > 0) {
          console.log('   Errors:');
          result.errors.slice(0, 3).forEach(error => {
            console.log(`   - ${error}`);
          });
        }
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        name: category.name,
        passed: false,
        duration,
        output: '',
        errors: [error.message]
      };

      this.results.push(testResult);
      
      console.log(`💥 ${category.name} - ERROR (${duration}ms)`);
      console.log(`   ${error.message}`);

      if (category.critical) {
        this.criticalIssues.push(`CRITICAL: ${category.name} threw exception: ${error.message}`);
      }
    }
  }

  private async executeCommand(command: string, timeout: number): Promise<{
    success: boolean;
    output: string;
    errors: string[];
  }> {
    return new Promise((resolve) => {
      const child = spawn('sh', ['-c', command], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          output,
          errors: [`Command timed out after ${timeout}ms`, errorOutput]
        });
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);
        
        const errors = errorOutput
          .split('\n')
          .filter(line => line.trim())
          .filter(line => !line.includes('warning'))
          .slice(0, 10); // Limit errors shown

        resolve({
          success: code === 0,
          output: output + errorOutput,
          errors
        });
      });
    });
  }

  private generateReport(totalDuration: number): ValidationReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;

    // Generate recommendations based on results
    this.generateRecommendations();

    return {
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        duration: totalDuration
      },
      results: this.results,
      criticalIssues: this.criticalIssues,
      recommendations: this.recommendations
    };
  }

  private generateRecommendations(): void {
    const failedTests = this.results.filter(r => !r.passed);

    if (failedTests.some(t => t.name.includes('Model Validation'))) {
      this.recommendations.push(
        '🔧 Model validation issues detected. Check that invalid models (gpt-5-mini, gpt-5-nano) are completely removed.'
      );
    }

    if (failedTests.some(t => t.name.includes('Build Consistency'))) {
      this.recommendations.push(
        '🔧 Build issues detected. Review TypeScript compilation errors and button variant usage.'
      );
    }

    if (failedTests.some(t => t.name.includes('API Integration'))) {
      this.recommendations.push(
        '🔧 API integration issues detected. Check model validation in API routes and fallback mechanisms.'
      );
    }

    if (failedTests.some(t => t.name.includes('TypeScript'))) {
      this.recommendations.push(
        '🔧 TypeScript compilation issues detected. Fix syntax errors in EnhancedAIService.ts and other files.'
      );
    }

    if (failedTests.some(t => t.name.includes('Build Test'))) {
      this.recommendations.push(
        '🔧 Production build issues detected. This may indicate unfixed compilation or dependency issues.'
      );
    }

    if (this.criticalIssues.length === 0) {
      this.recommendations.push(
        '✨ All critical tests passed! The AI response system fixes appear to be working correctly.'
      );
    }
  }

  private printReport(report: ValidationReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 AI FIXES VALIDATION REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passed} ✅`);
    console.log(`   Failed: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : '✅'}`);
    console.log(`   Duration: ${Math.round(report.summary.duration / 1000)}s`);

    if (report.criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES:`);
      report.criticalIssues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    console.log(`\n📋 DETAILED RESULTS:`);
    report.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const duration = Math.round(result.duration / 1000);
      console.log(`   ${status} ${result.name} (${duration}s)`);
      
      if (!result.passed && result.errors.length > 0) {
        result.errors.slice(0, 2).forEach(error => {
          const shortError = error.length > 100 ? error.substring(0, 100) + '...' : error;
          console.log(`        └─ ${shortError}`);
        });
      }
    });

    if (report.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      report.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }

    // Final status
    const allCriticalPassed = report.criticalIssues.length === 0;
    const overallStatus = allCriticalPassed ? '✅ SUCCESS' : '❌ NEEDS ATTENTION';
    
    console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
    
    if (allCriticalPassed) {
      console.log('   All critical AI system fixes have been validated successfully!');
    } else {
      console.log('   Some critical issues need to be addressed before deployment.');
    }

    console.log('='.repeat(60));
  }

  private async saveReport(report: ValidationReport): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'tests', 'reports', 'ai-fixes-validation-report.json');
    const reportDir = path.dirname(reportPath);

    // Ensure reports directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Save detailed JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Save summary markdown report
    const mdReportPath = path.join(reportDir, 'ai-fixes-validation-summary.md');
    const mdContent = this.generateMarkdownReport(report);
    fs.writeFileSync(mdReportPath, mdContent);

    console.log(`\n📄 Reports saved:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - Markdown: ${mdReportPath}`);
  }

  private generateMarkdownReport(report: ValidationReport): string {
    const timestamp = new Date().toISOString();
    
    return `# AI Fixes Validation Report

**Generated:** ${timestamp}
**Duration:** ${Math.round(report.summary.duration / 1000)}s
**Status:** ${report.criticalIssues.length === 0 ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}

## Summary

- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed} ✅
- **Failed:** ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : '✅'}

## Critical Issues

${report.criticalIssues.length === 0 
  ? '✅ No critical issues detected!'
  : report.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
}

## Test Results

${report.results.map(result => 
  `### ${result.name}
- **Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration:** ${Math.round(result.duration / 1000)}s
${result.errors.length > 0 
  ? `- **Errors:**\n${result.errors.slice(0, 3).map(e => `  - ${e}`).join('\n')}`
  : ''
}`
).join('\n\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---

This report validates the AI response system fixes including:
- Invalid model removal (gpt-5-mini, gpt-5-nano)
- Model validation functions
- API route error handling
- TypeScript compilation fixes
- Button variant corrections
- Build consistency checks
`;
  }
}

// Main execution
if (require.main === module) {
  const validator = new AIFixesValidator();
  
  validator.runValidation()
    .then((report) => {
      const exitCode = report.criticalIssues.length === 0 ? 0 : 1;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('💥 Validation failed with error:', error);
      process.exit(1);
    });
}

export default AIFixesValidator;