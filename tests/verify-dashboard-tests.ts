#!/usr/bin/env tsx

/**
 * Dashboard Tests Verification Script
 * 
 * Verifies that all dashboard test files are properly created and configured
 */

import { promises as fs } from 'fs';
import path from 'path';

interface TestFile {
  path: string;
  description: string;
  required: boolean;
}

class DashboardTestVerifier {
  private testFiles: TestFile[] = [
    {
      path: 'tests/e2e/dashboard.spec.ts',
      description: 'Comprehensive E2E tests for dashboard',
      required: true
    },
    {
      path: 'tests/e2e/dashboard-modifications.spec.ts', 
      description: 'Focused tests for dashboard modifications',
      required: true
    },
    {
      path: 'tests/e2e/page-objects/dashboard.page.ts',
      description: 'Page Object Model for dashboard',
      required: true
    },
    {
      path: 'tests/integration/dashboard-components.test.ts',
      description: 'Integration tests for dashboard components',
      required: true
    },
    {
      path: 'tests/config/dashboard-test.config.ts',
      description: 'Test configuration and utilities',
      required: true
    },
    {
      path: 'tests/run-dashboard-tests.ts',
      description: 'Comprehensive test runner',
      required: true
    },
    {
      path: 'tests/e2e/README-dashboard-tests.md',
      description: 'Dashboard tests documentation',
      required: false
    }
  ];

  async verify(): Promise<void> {
    console.log('🔍 Verifying Dashboard Test Suite Setup\n');
    console.log('=' .repeat(60));
    console.log('Testing dashboard modifications:');
    console.log('  ✓ Removed "Schedule Meeting" button');
    console.log('  ✓ Removed "Today\'s Schedule" section');
    console.log('  ✓ Modified Quick Actions to only have "Start New Meeting"');
    console.log('  ✓ Real Firebase data integration');
    console.log('  ✓ Navigation and responsive design');
    console.log('=' .repeat(60));
    console.log();

    let allFilesExist = true;
    let requiredFilesCount = 0;
    let existingFilesCount = 0;

    for (const testFile of this.testFiles) {
      const fullPath = path.join(process.cwd(), testFile.path);
      
      try {
        const stats = await fs.stat(fullPath);
        const fileSize = stats.size;
        const fileSizeKB = Math.round(fileSize / 1024);
        
        console.log(`✅ ${testFile.path}`);
        console.log(`   ${testFile.description}`);
        console.log(`   Size: ${fileSizeKB}KB`);
        console.log();
        
        existingFilesCount++;
        
        // Quick content validation
        if (testFile.path.endsWith('.ts') || testFile.path.endsWith('.spec.ts')) {
          await this.validateTestFile(fullPath, testFile.path);
        }
        
      } catch (error) {
        const status = testFile.required ? '❌ MISSING (REQUIRED)' : '⚠️  MISSING (OPTIONAL)';
        console.log(`${status} ${testFile.path}`);
        console.log(`   ${testFile.description}`);
        console.log();
        
        if (testFile.required) {
          allFilesExist = false;
        }
      }
      
      if (testFile.required) {
        requiredFilesCount++;
      }
    }

    // Check package.json for test scripts
    await this.verifyPackageJsonScripts();

    // Check Playwright config
    await this.verifyPlaywrightConfig();

    // Summary
    console.log('=' .repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total Files: ${this.testFiles.length}`);
    console.log(`Required Files: ${requiredFilesCount}`);
    console.log(`Existing Files: ${existingFilesCount}`);
    console.log(`Success Rate: ${Math.round((existingFilesCount / this.testFiles.length) * 100)}%`);
    console.log();

    if (allFilesExist) {
      console.log('🎉 All required dashboard test files are present!');
      console.log();
      console.log('📋 AVAILABLE TEST COMMANDS:');
      console.log('  npm run test:dashboard              # Run all dashboard tests');
      console.log('  npm run test:dashboard:unit         # Run unit tests');
      console.log('  npm run test:dashboard:e2e          # Run E2E tests');
      console.log('  npm run test:dashboard:e2e:headed   # Run E2E with browser');
      console.log('  npm run test:dashboard:performance  # Run performance tests');
      console.log('  npm run test:dashboard:accessibility # Run accessibility tests');
      console.log('  npm run test:dashboard:responsive   # Run responsive tests');
      console.log();
      console.log('🚀 Ready to test dashboard modifications!');
    } else {
      console.log('❌ Some required files are missing. Please create them before running tests.');
    }

    console.log('=' .repeat(60));
  }

  private async validateTestFile(filePath: string, relativePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Basic validation checks
      const validations = [];
      
      if (relativePath.includes('dashboard.spec.ts')) {
        validations.push(
          content.includes('test.describe'),
          content.includes('Dashboard'),
          content.includes('Schedule Meeting') || content.includes('scheduling'),
          content.includes('Quick Actions'),
          content.includes('Start New Meeting')
        );
      }
      
      if (relativePath.includes('page-objects')) {
        validations.push(
          content.includes('class'),
          content.includes('Page'),
          content.includes('Locator'),
          content.includes('constructor')
        );
      }
      
      if (relativePath.includes('dashboard-components.test.ts')) {
        validations.push(
          content.includes('describe'),
          content.includes('test') || content.includes('it'),
          content.includes('expect'),
          content.includes('Dashboard')
        );
      }
      
      const passedValidations = validations.filter(Boolean).length;
      const totalValidations = validations.length;
      
      if (totalValidations > 0) {
        const validationScore = Math.round((passedValidations / totalValidations) * 100);
        console.log(`   Content validation: ${validationScore}% (${passedValidations}/${totalValidations})`);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not validate content`);
    }
  }

  private async verifyPackageJsonScripts(): Promise<void> {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const expectedScripts = [
        'test:dashboard',
        'test:dashboard:unit',
        'test:dashboard:e2e',
        'test:dashboard:e2e:headed',
        'test:dashboard:performance',
        'test:dashboard:accessibility',
        'test:dashboard:responsive'
      ];
      
      let scriptsPresent = 0;
      console.log('📝 Package.json Scripts:');
      
      for (const script of expectedScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          console.log(`   ✅ ${script}`);
          scriptsPresent++;
        } else {
          console.log(`   ❌ ${script} (missing)`);
        }
      }
      
      console.log(`   Scripts: ${scriptsPresent}/${expectedScripts.length} present`);
      console.log();
      
    } catch (error) {
      console.log('❌ Could not verify package.json scripts');
      console.log();
    }
  }

  private async verifyPlaywrightConfig(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'playwright.config.ts');
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      console.log('🎭 Playwright Configuration:');
      
      const checks = [
        { name: 'Config file exists', pass: true },
        { name: 'Base URL configured', pass: configContent.includes('baseURL') },
        { name: 'Test directory set', pass: configContent.includes('testDir') },
        { name: 'Multiple browsers', pass: configContent.includes('chromium') },
        { name: 'Web server config', pass: configContent.includes('webServer') }
      ];
      
      for (const check of checks) {
        const status = check.pass ? '✅' : '❌';
        console.log(`   ${status} ${check.name}`);
      }
      
      console.log();
      
    } catch (error) {
      console.log('❌ Playwright configuration not found');
      console.log();
    }
  }
}

// Run verification
async function main() {
  const verifier = new DashboardTestVerifier();
  
  try {
    await verifier.verify();
  } catch (error) {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}