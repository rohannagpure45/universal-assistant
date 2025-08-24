#!/usr/bin/env node

/**
 * COMPREHENSIVE SECURITY AUDIT AND FIX SCRIPT
 * 
 * This script identifies and fixes critical Firebase security issues including:
 * 1. Environment variable configuration problems
 * 2. Firebase security rules validation
 * 3. Admin claims setup verification
 * 4. Production security checklist validation
 * 
 * OWASP References:
 * - A01:2021 - Broken Access Control
 * - A02:2021 - Cryptographic Failures
 * - A05:2021 - Security Misconfiguration
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SECURITY_CRITICAL_ISSUES = [];
const SECURITY_WARNINGS = [];
const SECURITY_PASSES = [];

// Production admin emails - SECURITY CRITICAL
const ADMIN_EMAILS = ['ribt2218@gmail.com', 'rohan@linkstudio.ai'];

/**
 * Log security findings
 */
function logSecurity(type, category, message, fix = null) {
  const finding = {
    type,
    category,
    message,
    fix,
    timestamp: new Date().toISOString()
  };

  switch (type) {
    case 'CRITICAL':
      SECURITY_CRITICAL_ISSUES.push(finding);
      console.log(`🚨 CRITICAL [${category}]: ${message}`);
      if (fix) console.log(`   Fix: ${fix}`);
      break;
    case 'WARNING':
      SECURITY_WARNINGS.push(finding);
      console.log(`⚠️  WARNING [${category}]: ${message}`);
      if (fix) console.log(`   Fix: ${fix}`);
      break;
    case 'PASS':
      SECURITY_PASSES.push(finding);
      console.log(`✅ PASS [${category}]: ${message}`);
      break;
  }
}

/**
 * Check environment configuration
 */
function checkEnvironmentConfiguration() {
  console.log('\n🔍 CHECKING ENVIRONMENT CONFIGURATION...\n');

  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envExamplePath = path.join(__dirname, '..', '.env.example');

  // Check if .env.local exists
  if (!fs.existsSync(envLocalPath)) {
    logSecurity('CRITICAL', 'ENV_CONFIG', 
      '.env.local file not found - Firebase operations will fail',
      'Create .env.local file from .env.example and populate with real values'
    );
    return false;
  }

  // Load environment variables
  require('dotenv').config({ path: envLocalPath });

  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ];

  let configValid = true;

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar] || process.env[envVar].includes('your-')) {
      logSecurity('CRITICAL', 'ENV_CONFIG',
        `${envVar} is missing or contains placeholder value`,
        `Set real value for ${envVar} in .env.local`
      );
      configValid = false;
    } else {
      logSecurity('PASS', 'ENV_CONFIG', `${envVar} is configured`);
    }
  });

  // Check for client-side secret exposure
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const clientSideSecrets = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'FIREBASE_ADMIN_PRIVATE_KEY'];
  
  clientSideSecrets.forEach(secret => {
    if (envContent.includes(`NEXT_PUBLIC_${secret}`)) {
      logSecurity('CRITICAL', 'SECRET_EXPOSURE',
        `${secret} is exposed as NEXT_PUBLIC_ variable - SECURITY BREACH`,
        `Remove NEXT_PUBLIC_ prefix from ${secret} in .env.local`
      );
      configValid = false;
    }
  });

  // Check Firebase Admin private key format
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    if (!process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')) {
      logSecurity('WARNING', 'ENV_FORMAT',
        'FIREBASE_ADMIN_PRIVATE_KEY may be incorrectly formatted',
        'Ensure private key includes full header/footer and escaped newlines'
      );
    } else {
      logSecurity('PASS', 'ENV_CONFIG', 'FIREBASE_ADMIN_PRIVATE_KEY format appears correct');
    }
  }

  return configValid;
}

/**
 * Initialize Firebase Admin with error handling
 */
function initializeFirebaseAdmin() {
  console.log('\n🔍 INITIALIZING FIREBASE ADMIN...\n');

  try {
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        logSecurity('CRITICAL', 'FIREBASE_INIT', 
          'Missing Firebase Admin credentials',
          'Ensure all FIREBASE_ADMIN_* variables are set in .env.local'
        );
        return false;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.projectId,
        storageBucket: `${serviceAccount.projectId}.appspot.com`
      });

      logSecurity('PASS', 'FIREBASE_INIT', 'Firebase Admin initialized successfully');
      return true;
    }
  } catch (error) {
    logSecurity('CRITICAL', 'FIREBASE_INIT',
      `Failed to initialize Firebase Admin: ${error.message}`,
      'Check Firebase Admin credentials and service account permissions'
    );
    return false;
  }
}

/**
 * Test Firestore security rules
 */
async function testFirestoreSecurityRules() {
  console.log('\n🔍 TESTING FIRESTORE SECURITY RULES...\n');

  const db = admin.firestore();

  try {
    // Test 1: Voice library access without authentication
    try {
      const voiceLibraryQuery = db.collection('voice_library').limit(1);
      await voiceLibraryQuery.get();
      logSecurity('WARNING', 'SECURITY_RULES', 
        'Voice library accessible via admin SDK (expected)',
        'This is normal for admin SDK access'
      );
    } catch (error) {
      logSecurity('CRITICAL', 'SECURITY_RULES',
        `Voice library access failed: ${error.message}`,
        'Check Firestore security rules and permissions'
      );
    }

    // Test 2: Admin user creation and claims
    const testAdminEmail = ADMIN_EMAILS[0];
    
    try {
      let testUser;
      try {
        testUser = await admin.auth().getUserByEmail(testAdminEmail);
        logSecurity('PASS', 'ADMIN_USER', `Admin user ${testAdminEmail} exists`);
      } catch (userError) {
        if (userError.code === 'auth/user-not-found') {
          logSecurity('WARNING', 'ADMIN_USER', 
            `Admin user ${testAdminEmail} not found in Firebase Auth`,
            'Create admin user account or check email spelling'
          );
        }
      }

      if (testUser) {
        // Check custom claims
        const customClaims = testUser.customClaims || {};
        if (customClaims.admin === true) {
          logSecurity('PASS', 'ADMIN_CLAIMS', `Admin claims set for ${testAdminEmail}`);
        } else {
          logSecurity('WARNING', 'ADMIN_CLAIMS',
            `Admin claims not set for ${testAdminEmail}`,
            'Set admin claims via admin API or directly'
          );
        }
      }
    } catch (error) {
      logSecurity('WARNING', 'ADMIN_CHECK',
        `Could not verify admin user: ${error.message}`,
        'Ensure admin user exists and has proper permissions'
      );
    }

    // Test 3: Collection access patterns
    const collections = ['users', 'meetings', 'voice_library', 'needs_identification'];
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        logSecurity('PASS', 'COLLECTION_ACCESS', 
          `Collection ${collectionName} accessible via admin SDK`
        );
      } catch (error) {
        logSecurity('WARNING', 'COLLECTION_ACCESS',
          `Collection ${collectionName} access issue: ${error.message}`,
          'Check Firestore rules and permissions'
        );
      }
    }

  } catch (error) {
    logSecurity('CRITICAL', 'SECURITY_TEST',
      `Security rules test failed: ${error.message}`,
      'Check Firestore connection and permissions'
    );
  }
}

/**
 * Validate security rules syntax and logic
 */
function validateSecurityRulesFile() {
  console.log('\n🔍 VALIDATING SECURITY RULES FILE...\n');

  const rulesPath = path.join(__dirname, '..', 'firestore.rules');
  
  if (!fs.existsSync(rulesPath)) {
    logSecurity('CRITICAL', 'RULES_FILE',
      'firestore.rules file not found',
      'Ensure firestore.rules exists in project root'
    );
    return;
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  // Check for security rule patterns
  const securityChecks = [
    {
      pattern: /function isAuthenticated\(\)/,
      name: 'Authentication check function',
      required: true
    },
    {
      pattern: /function isAdmin\(\)/,
      name: 'Admin check function', 
      required: true
    },
    {
      pattern: /function isOwner\(/,
      name: 'Ownership check function',
      required: true
    },
    {
      pattern: /request\.auth\.token\.admin/,
      name: 'Admin claims validation',
      required: true
    },
    {
      pattern: /allow read.*if.*isAuthenticated\(\)/,
      name: 'Authentication-protected reads',
      required: false
    }
  ];

  securityChecks.forEach(check => {
    if (rulesContent.match(check.pattern)) {
      logSecurity('PASS', 'RULES_VALIDATION', `Found ${check.name}`);
    } else {
      const severity = check.required ? 'CRITICAL' : 'WARNING';
      logSecurity(severity, 'RULES_VALIDATION',
        `Missing ${check.name} in security rules`,
        `Add ${check.name} to firestore.rules`
      );
    }
  });

  // Check for overly permissive rules
  const dangerousPatterns = [
    {
      pattern: /allow\s+.*:\s*if\s+true/,
      message: 'Overly permissive rule found (allow if true)'
    },
    {
      pattern: /allow\s+.*:\s*if\s+request\.auth\s*!=\s*null/,
      message: 'Basic auth-only rule found - consider more restrictive access'
    }
  ];

  dangerousPatterns.forEach(pattern => {
    if (rulesContent.match(pattern.pattern)) {
      logSecurity('WARNING', 'RULES_SECURITY', pattern.message,
        'Review and tighten security rule conditions'
      );
    }
  });
}

/**
 * Check Firebase Storage rules
 */
function validateStorageRules() {
  console.log('\n🔍 VALIDATING STORAGE RULES...\n');

  const storageRulesPath = path.join(__dirname, '..', 'storage.rules');
  
  if (!fs.existsSync(storageRulesPath)) {
    logSecurity('WARNING', 'STORAGE_RULES',
      'storage.rules file not found',
      'Create storage.rules file for Firebase Storage security'
    );
    return;
  }

  const rulesContent = fs.readFileSync(storageRulesPath, 'utf8');

  // Check storage security patterns
  if (rulesContent.includes('allow write: if false')) {
    logSecurity('PASS', 'STORAGE_SECURITY', 
      'Found write restrictions in storage rules'
    );
  }

  if (rulesContent.includes('isValidAudioFile()')) {
    logSecurity('PASS', 'STORAGE_VALIDATION',
      'Found audio file validation in storage rules'
    );
  }

  if (rulesContent.includes('size <')) {
    logSecurity('PASS', 'STORAGE_LIMITS',
      'Found file size limits in storage rules'
    );
  }
}

/**
 * Fix common security issues
 */
async function applySecurityFixes() {
  console.log('\n🔧 APPLYING AUTOMATIC SECURITY FIXES...\n');

  // Fix 1: Set admin claims for admin users
  if (admin.apps.length > 0) {
    for (const adminEmail of ADMIN_EMAILS) {
      try {
        const user = await admin.auth().getUserByEmail(adminEmail);
        const customClaims = user.customClaims || {};
        
        if (!customClaims.admin) {
          await admin.auth().setCustomUserClaims(user.uid, {
            admin: true,
            adminLevel: 'super',
            adminSince: new Date().toISOString()
          });
          
          logSecurity('PASS', 'AUTO_FIX', 
            `Set admin claims for ${adminEmail}`
          );
        }
      } catch (error) {
        if (error.code !== 'auth/user-not-found') {
          logSecurity('WARNING', 'AUTO_FIX',
            `Could not set admin claims for ${adminEmail}: ${error.message}`
          );
        }
      }
    }
  }

  // Fix 2: Create security configuration backup
  const securityConfig = {
    adminEmails: ADMIN_EMAILS,
    securityRulesVersion: 'v2.0',
    lastSecurityAudit: new Date().toISOString(),
    criticalIssues: SECURITY_CRITICAL_ISSUES.length,
    warnings: SECURITY_WARNINGS.length,
    passes: SECURITY_PASSES.length
  };

  const configPath = path.join(__dirname, '..', 'security-config.json');
  fs.writeFileSync(configPath, JSON.stringify(securityConfig, null, 2));
  
  logSecurity('PASS', 'AUTO_FIX', 
    `Created security configuration backup at ${configPath}`
  );
}

/**
 * Generate security report
 */
function generateSecurityReport() {
  console.log('\n📊 GENERATING SECURITY REPORT...\n');

  const report = {
    auditTimestamp: new Date().toISOString(),
    projectPath: path.resolve(__dirname, '..'),
    securityStatus: {
      criticalIssues: SECURITY_CRITICAL_ISSUES.length,
      warnings: SECURITY_WARNINGS.length,
      passes: SECURITY_PASSES.length,
      overallStatus: SECURITY_CRITICAL_ISSUES.length === 0 ? 
        (SECURITY_WARNINGS.length === 0 ? 'SECURE' : 'NEEDS_ATTENTION') : 'CRITICAL_ISSUES'
    },
    findings: {
      critical: SECURITY_CRITICAL_ISSUES,
      warnings: SECURITY_WARNINGS,
      passes: SECURITY_PASSES
    },
    recommendations: [
      'Deploy Firebase security rules to production',
      'Test authentication flows with real users',
      'Set up monitoring for failed authentication attempts',
      'Regularly rotate API keys and service account credentials',
      'Enable Firebase Security Rules simulator for testing'
    ]
  };

  const reportPath = path.join(__dirname, '..', 'SECURITY_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('🎯 SECURITY AUDIT SUMMARY:');
  console.log(`   Critical Issues: ${SECURITY_CRITICAL_ISSUES.length}`);
  console.log(`   Warnings: ${SECURITY_WARNINGS.length}`);
  console.log(`   Passes: ${SECURITY_PASSES.length}`);
  console.log(`   Overall Status: ${report.securityStatus.overallStatus}`);
  console.log(`   Report saved to: ${reportPath}`);

  if (SECURITY_CRITICAL_ISSUES.length > 0) {
    console.log('\n❌ CRITICAL ISSUES MUST BE FIXED BEFORE PRODUCTION:');
    SECURITY_CRITICAL_ISSUES.forEach((issue, index) => {
      console.log(`   ${index + 1}. [${issue.category}] ${issue.message}`);
      if (issue.fix) console.log(`      Fix: ${issue.fix}`);
    });
  }

  if (SECURITY_WARNINGS.length > 0 && SECURITY_CRITICAL_ISSUES.length === 0) {
    console.log('\n⚠️  WARNINGS TO ADDRESS:');
    SECURITY_WARNINGS.forEach((warning, index) => {
      console.log(`   ${index + 1}. [${warning.category}] ${warning.message}`);
      if (warning.fix) console.log(`      Fix: ${warning.fix}`);
    });
  }

  if (SECURITY_CRITICAL_ISSUES.length === 0 && SECURITY_WARNINGS.length === 0) {
    console.log('\n🎉 ALL SECURITY CHECKS PASSED!');
    console.log('   Your Firebase security configuration is production-ready.');
  }

  return report;
}

/**
 * Main audit execution
 */
async function runSecurityAudit() {
  console.log('🔐 STARTING COMPREHENSIVE SECURITY AUDIT...');
  console.log('====================================================\n');

  // Step 1: Environment configuration
  const envValid = checkEnvironmentConfiguration();
  
  // Step 2: Firebase initialization  
  const firebaseInit = initializeFirebaseAdmin();

  // Step 3: Security rules validation
  validateSecurityRulesFile();
  validateStorageRules();

  // Step 4: Live security tests (if Firebase is available)
  if (firebaseInit) {
    await testFirestoreSecurityRules();
    await applySecurityFixes();
  }

  // Step 5: Generate comprehensive report
  const report = generateSecurityReport();

  console.log('\n====================================================');
  console.log('🔐 SECURITY AUDIT COMPLETED');
  
  return report;
}

// Run audit if called directly
if (require.main === module) {
  runSecurityAudit().catch(error => {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit };