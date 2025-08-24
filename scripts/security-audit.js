#!/usr/bin/env node

/**
 * Security audit script for Universal Assistant
 * Run with: node scripts/security-audit.js
 */

const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  addIssue(category, description, severity = 'medium', file = null) {
    this.issues.push({ category, description, severity, file });
  }

  addWarning(category, description, file = null) {
    this.warnings.push({ category, description, file });
  }

  addPassed(category, description) {
    this.passed.push({ category, description });
  }

  checkEnvironmentVariables() {
    console.log('\n🔍 Checking environment variables...');
    
    // Check if .env.local exists
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      this.addIssue('Environment', 'No .env.local file found', 'high');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for required variables
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'FIREBASE_ADMIN_PRIVATE_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY'
    ];

    requiredVars.forEach(varName => {
      if (!envContent.includes(varName)) {
        this.addIssue('Environment', `Missing required environment variable: ${varName}`, 'high');
      } else {
        this.addPassed('Environment', `Found required variable: ${varName}`);
      }
    });

    // Check for weak secrets
    if (envContent.includes('your-') || envContent.includes('example-')) {
      this.addIssue('Environment', 'Found placeholder values in environment variables', 'critical');
    }

    // Check for exposed secrets in client-side variables
    const clientSideSecrets = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'FIREBASE_ADMIN_PRIVATE_KEY'];
    clientSideSecrets.forEach(secret => {
      if (envContent.includes(`NEXT_PUBLIC_${secret}`)) {
        this.addIssue('Environment', `Secret ${secret} exposed as client-side variable`, 'critical');
      }
    });
  }

  checkFirebaseSecurityRules() {
    console.log('🔍 Checking Firebase security rules...');
    
    const firestoreRulesPath = path.join(process.cwd(), 'firestore.rules');
    const storageRulesPath = path.join(process.cwd(), 'storage.rules');
    
    if (!fs.existsSync(firestoreRulesPath)) {
      this.addIssue('Firebase', 'No firestore.rules file found', 'high');
    } else {
      const rules = fs.readFileSync(firestoreRulesPath, 'utf8');
      
      // Check for authentication requirement
      if (rules.includes('allow read, write: if true')) {
        this.addIssue('Firebase', 'Found unrestricted read/write rules', 'critical');
      }
      
      if (rules.includes('isAuthenticated()')) {
        this.addPassed('Firebase', 'Authentication checks found in Firestore rules');
      } else {
        this.addIssue('Firebase', 'No authentication checks in Firestore rules', 'high');
      }
    }
    
    if (!fs.existsSync(storageRulesPath)) {
      this.addIssue('Firebase', 'No storage.rules file found', 'high');
    } else {
      this.addPassed('Firebase', 'Storage rules file exists');
    }
  }

  checkApiSecurity() {
    console.log('🔍 Checking API route security...');
    
    const apiDir = path.join(process.cwd(), 'src/app/api');
    if (!fs.existsSync(apiDir)) {
      this.addWarning('API', 'No API routes found');
      return;
    }

    const checkApiFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // Check for authentication
      if (!content.includes('verifyIdToken') && !content.includes('withSecurity')) {
        this.addIssue('API', `No authentication found in ${relativePath}`, 'high', relativePath);
      } else {
        this.addPassed('API', `Authentication found in ${relativePath}`);
      }
      
      // Check for input validation
      if (!content.includes('validate') && !content.includes('schema')) {
        this.addWarning('API', `No input validation found in ${relativePath}`, relativePath);
      } else {
        this.addPassed('API', `Input validation found in ${relativePath}`);
      }
      
      // Check for rate limiting
      if (!content.includes('rateLimit') && !content.includes('withSecurity')) {
        this.addWarning('API', `No rate limiting found in ${relativePath}`, relativePath);
      } else {
        this.addPassed('API', `Rate limiting found in ${relativePath}`);
      }
    };

    // Recursively check API files
    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file === 'route.ts' || file === 'route.js') {
          checkApiFile(filePath);
        }
      });
    };

    walkDir(apiDir);
  }

  checkSecurityHeaders() {
    console.log('🔍 Checking security headers configuration...');
    
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    if (!fs.existsSync(nextConfigPath)) {
      this.addIssue('Headers', 'No next.config.js file found', 'medium');
      return;
    }

    const config = fs.readFileSync(nextConfigPath, 'utf8');
    
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy',
      'Strict-Transport-Security'
    ];

    requiredHeaders.forEach(header => {
      if (config.includes(header)) {
        this.addPassed('Headers', `Security header configured: ${header}`);
      } else {
        this.addIssue('Headers', `Missing security header: ${header}`, 'medium');
      }
    });
  }

  checkDependencyVulnerabilities() {
    console.log('🔍 Checking dependency vulnerabilities...');
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addIssue('Dependencies', 'No package.json found', 'high');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for known vulnerable packages (basic check)
    const vulnerablePackages = {
      'lodash': '< 4.17.21',
      'axios': '< 0.21.1',
      'react': '< 18.0.0'
    };

    Object.entries(vulnerablePackages).forEach(([pkg, version]) => {
      if (dependencies[pkg]) {
        this.addWarning('Dependencies', `Check ${pkg} version: ${dependencies[pkg]} (recommended: ${version})`);
      }
    });

    // Check for security-related packages
    const securityPackages = ['helmet', 'bcryptjs', 'zod'];
    securityPackages.forEach(pkg => {
      if (dependencies[pkg]) {
        this.addPassed('Dependencies', `Security package installed: ${pkg}`);
      } else {
        this.addWarning('Dependencies', `Consider installing security package: ${pkg}`);
      }
    });
  }

  checkFilePermissions() {
    console.log('🔍 Checking sensitive file permissions...');
    
    const sensitiveFiles = [
      '.env.local',
      'firestore.rules',
      'storage.rules'
    ];

    sensitiveFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          // Basic permission check (Unix systems)
          if (process.platform !== 'win32') {
            const mode = stats.mode & parseInt('777', 8);
            if (mode & parseInt('044', 8)) {
              this.addWarning('Permissions', `File ${file} is readable by others`);
            } else {
              this.addPassed('Permissions', `File ${file} has appropriate permissions`);
            }
          }
        } catch (error) {
          this.addWarning('Permissions', `Could not check permissions for ${file}`);
        }
      }
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  UNIVERSAL ASSISTANT SECURITY AUDIT REPORT');
    console.log('='.repeat(60));

    // Summary
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const highIssues = this.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'medium').length;

    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Checks passed: ${this.passed.length}`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`   🚨 Issues found: ${this.issues.length}`);
    console.log(`      - Critical: ${criticalIssues}`);
    console.log(`      - High: ${highIssues}`);
    console.log(`      - Medium: ${mediumIssues}`);

    // Critical Issues
    if (criticalIssues > 0) {
      console.log(`\n🚨 CRITICAL ISSUES (Fix Immediately):`);
      this.issues
        .filter(i => i.severity === 'critical')
        .forEach(issue => {
          console.log(`   ❌ [${issue.category}] ${issue.description}`);
          if (issue.file) console.log(`      File: ${issue.file}`);
        });
    }

    // High Priority Issues
    if (highIssues > 0) {
      console.log(`\n🔴 HIGH PRIORITY ISSUES:`);
      this.issues
        .filter(i => i.severity === 'high')
        .forEach(issue => {
          console.log(`   ❌ [${issue.category}] ${issue.description}`);
          if (issue.file) console.log(`      File: ${issue.file}`);
        });
    }

    // Medium Priority Issues
    if (mediumIssues > 0) {
      console.log(`\n🟡 MEDIUM PRIORITY ISSUES:`);
      this.issues
        .filter(i => i.severity === 'medium')
        .forEach(issue => {
          console.log(`   ❌ [${issue.category}] ${issue.description}`);
          if (issue.file) console.log(`      File: ${issue.file}`);
        });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      this.warnings.forEach(warning => {
        console.log(`   ⚠️  [${warning.category}] ${warning.description}`);
        if (warning.file) console.log(`      File: ${warning.file}`);
      });
    }

    // Recommendations
    console.log(`\n💡 SECURITY RECOMMENDATIONS:`);
    console.log(`   1. Run 'npm audit' to check for dependency vulnerabilities`);
    console.log(`   2. Enable Firebase App Check for production`);
    console.log(`   3. Set up monitoring and alerting for security events`);
    console.log(`   4. Implement automated security testing in CI/CD`);
    console.log(`   5. Regular security reviews and penetration testing`);
    console.log(`   6. Enable Firebase Authentication email verification`);
    console.log(`   7. Set up Content Security Policy reporting`);

    // Overall Score
    const totalChecks = this.passed.length + this.issues.length + this.warnings.length;
    const score = totalChecks > 0 ? Math.round((this.passed.length / totalChecks) * 100) : 0;
    
    console.log(`\n🎯 SECURITY SCORE: ${score}/100`);
    
    if (score >= 90) {
      console.log(`   🟢 Excellent security posture!`);
    } else if (score >= 70) {
      console.log(`   🟡 Good security, some improvements needed`);
    } else if (score >= 50) {
      console.log(`   🟠 Moderate security, significant improvements needed`);
    } else {
      console.log(`   🔴 Poor security posture, immediate action required`);
    }

    console.log('\n' + '='.repeat(60));
    return criticalIssues === 0 && highIssues === 0;
  }

  async run() {
    console.log('🛡️  Starting Universal Assistant Security Audit...\n');
    
    this.checkEnvironmentVariables();
    this.checkFirebaseSecurityRules();
    this.checkApiSecurity();
    this.checkSecurityHeaders();
    this.checkDependencyVulnerabilities();
    this.checkFilePermissions();
    
    const passed = this.generateReport();
    
    if (!passed) {
      process.exit(1);
    }
  }
}

// Run the audit
const auditor = new SecurityAuditor();
auditor.run().catch(console.error);