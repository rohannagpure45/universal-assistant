/**
 * Comprehensive Authentication Testing and Monitoring
 * Provides testing utilities and performance monitoring for authentication flows
 */

import { SecurityLogger } from './monitoring';
import { AdminValidator, AdminValidationResult } from './adminMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details?: Record<string, any>;
  error?: string;
}

export interface AuthPerformanceMetrics {
  averageLoginTime: number;
  averageSignupTime: number;
  adminValidationTime: number;
  tokenRefreshTime: number;
  errorRate: number;
  totalAuthAttempts: number;
}

/**
 * Authentication Testing Suite
 */
export class AuthTester {
  private static instance: AuthTester;
  private performanceData: Array<{
    operation: string;
    duration: number;
    success: boolean;
    timestamp: number;
  }> = [];

  private constructor() {}

  public static getInstance(): AuthTester {
    if (!AuthTester.instance) {
      AuthTester.instance = new AuthTester();
    }
    return AuthTester.instance;
  }

  /**
   * Test admin validation performance and accuracy
   */
  async testAdminValidation(): Promise<AuthTestResult> {
    const startTime = Date.now();
    const testName = 'Admin Validation Test';

    try {
      const validator = AdminValidator.getInstance();
      
      // Test cases
      const testCases = [
        {
          email: 'admin@test.com',
          uid: 'test-admin-uid',
          admin: true,
          expectedResult: true
        },
        {
          email: 'user@test.com', 
          uid: 'test-user-uid',
          admin: false,
          expectedResult: false
        }
      ];

      const results: boolean[] = [];
      
      for (const testCase of testCases) {
        const mockToken: DecodedIdToken = {
          uid: testCase.uid,
          email: testCase.email,
          admin: testCase.admin,
          iss: 'test',
          aud: 'test',
          auth_time: Date.now() / 1000,
          iat: Date.now() / 1000,
          exp: (Date.now() / 1000) + 3600,
          sub: testCase.uid,
          firebase: {
            sign_in_provider: 'password',
            identities: {}
          }
        };

        const result = await validator.validateAdminAccess(mockToken, '127.0.0.1');
        const passed = result.isAdmin === testCase.expectedResult;
        results.push(passed);

        await SecurityLogger.dataAccess(
          '127.0.0.1',
          'auth-tester',
          'admin_validation_test',
          'read',
          passed,
          {
            testCase: testCase.email,
            expected: testCase.expectedResult,
            actual: result.isAdmin,
            source: result.source
          }
        );
      }

      const duration = Date.now() - startTime;
      const allPassed = results.every(r => r);

      this.recordPerformance('admin_validation', duration, allPassed);

      return {
        testName,
        passed: allPassed,
        duration,
        details: {
          testCases: testCases.length,
          passedTests: results.filter(r => r).length,
          configuration: validator.getConfiguration()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance('admin_validation', duration, false);

      return {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test authentication performance under load
   */
  async testAuthPerformance(concurrentRequests: number = 10): Promise<AuthTestResult> {
    const startTime = Date.now();
    const testName = 'Authentication Performance Test';

    try {
      const validator = AdminValidator.getInstance();
      const promises: Promise<AdminValidationResult>[] = [];

      // Create mock token for testing
      const mockToken: DecodedIdToken = {
        uid: 'performance-test-uid',
        email: 'test@example.com',
        iss: 'test',
        aud: 'test',
        auth_time: Date.now() / 1000,
        iat: Date.now() / 1000,
        exp: (Date.now() / 1000) + 3600,
        sub: 'performance-test-uid',
        firebase: {
          sign_in_provider: 'password',
          identities: {}
        }
      };

      // Generate concurrent validation requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          validator.validateAdminAccess(mockToken, `127.0.0.${i % 255}`)
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      const averageTime = duration / concurrentRequests;

      this.recordPerformance('concurrent_auth', duration, true);

      await SecurityLogger.dataAccess(
        '127.0.0.1',
        'auth-tester',
        'performance_test',
        'read',
        true,
        {
          concurrentRequests,
          totalDuration: duration,
          averageTime,
          allSuccessful: results.every(r => r !== null)
        }
      );

      return {
        testName,
        passed: true,
        duration,
        details: {
          concurrentRequests,
          averageResponseTime: averageTime,
          totalDuration: duration,
          successfulRequests: results.length
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance('concurrent_auth', duration, false);

      return {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test migration compatibility (dual validation)
   */
  async testMigrationCompatibility(): Promise<AuthTestResult> {
    const startTime = Date.now();
    const testName = 'Migration Compatibility Test';

    try {
      const validator = AdminValidator.getInstance();
      
      // Test user with claims but not in environment
      const claimsOnlyToken: DecodedIdToken = {
        uid: 'claims-only-user',
        email: 'claims-only@test.com',
        admin: true, // Has claims
        iss: 'test',
        aud: 'test', 
        auth_time: Date.now() / 1000,
        iat: Date.now() / 1000,
        exp: (Date.now() / 1000) + 3600,
        sub: 'claims-only-user',
        firebase: {
          sign_in_provider: 'password',
          identities: {}
        }
      };

      const result = await validator.validateAdminAccess(claimsOnlyToken, '127.0.0.1');
      const duration = Date.now() - startTime;

      // During migration, claims should still work
      const passed = result.isAdmin === true && result.source === 'claims';

      this.recordPerformance('migration_compatibility', duration, passed);

      await SecurityLogger.dataAccess(
        '127.0.0.1',
        'auth-tester',
        'migration_compatibility_test',
        'read',
        passed,
        {
          hasClaimsValidation: result.source === 'claims',
          isAdmin: result.isAdmin,
          adminLevel: result.adminLevel
        }
      );

      return {
        testName,
        passed,
        duration,
        details: {
          validationSource: result.source,
          isAdmin: result.isAdmin,
          adminLevel: result.adminLevel,
          backwardCompatible: passed
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance('migration_compatibility', duration, false);

      return {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Run comprehensive authentication test suite
   */
  async runAuthTestSuite(): Promise<{
    overallPassed: boolean;
    results: AuthTestResult[];
    metrics: AuthPerformanceMetrics;
  }> {
    console.log('🔍 Running comprehensive authentication test suite...');

    const results: AuthTestResult[] = [];
    
    // Run all tests
    results.push(await this.testAdminValidation());
    results.push(await this.testAuthPerformance());
    results.push(await this.testMigrationCompatibility());

    const overallPassed = results.every(r => r.passed);
    const metrics = this.getPerformanceMetrics();

    // Log overall test results
    await SecurityLogger.dataAccess(
      '127.0.0.1',
      'auth-tester',
      'test_suite_completion',
      'read',
      overallPassed,
      {
        totalTests: results.length,
        passedTests: results.filter(r => r.passed).length,
        failedTests: results.filter(r => !r.passed).length,
        overallPassed,
        metrics
      }
    );

    return {
      overallPassed,
      results,
      metrics
    };
  }

  /**
   * Record performance data
   */
  private recordPerformance(operation: string, duration: number, success: boolean): void {
    this.performanceData.push({
      operation,
      duration,
      success,
      timestamp: Date.now()
    });

    // Keep only last 1000 entries
    if (this.performanceData.length > 1000) {
      this.performanceData = this.performanceData.slice(-1000);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): AuthPerformanceMetrics {
    const recentData = this.performanceData.filter(
      d => Date.now() - d.timestamp < 3600000 // Last hour
    );

    const loginData = recentData.filter(d => d.operation.includes('auth') || d.operation.includes('login'));
    const signupData = recentData.filter(d => d.operation.includes('signup'));
    const adminData = recentData.filter(d => d.operation.includes('admin'));
    const tokenData = recentData.filter(d => d.operation.includes('token'));

    return {
      averageLoginTime: this.calculateAverage(loginData.map(d => d.duration)),
      averageSignupTime: this.calculateAverage(signupData.map(d => d.duration)),
      adminValidationTime: this.calculateAverage(adminData.map(d => d.duration)),
      tokenRefreshTime: this.calculateAverage(tokenData.map(d => d.duration)),
      errorRate: recentData.length > 0 ? (recentData.filter(d => !d.success).length / recentData.length) : 0,
      totalAuthAttempts: recentData.length
    };
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Clear performance data
   */
  clearPerformanceData(): void {
    this.performanceData = [];
  }
}

/**
 * Authentication monitoring utilities
 */
export class AuthMonitor {
  private static performanceThresholds = {
    adminValidation: 100, // ms
    tokenRefresh: 500, // ms
    userConversion: 200, // ms
    errorRate: 0.05 // 5%
  };

  /**
   * Monitor authentication performance
   */
  static async monitorAuthPerformance(
    operation: string,
    duration: number,
    success: boolean,
    userId?: string
  ): Promise<void> {
    const threshold = this.performanceThresholds[operation as keyof typeof this.performanceThresholds];
    
    if (threshold && duration > threshold) {
      await SecurityLogger.dataAccess(
        'unknown',
        userId || 'unknown',
        'auth_performance_warning',
        'read',
        success,
        {
          operation,
          duration,
          threshold,
          exceededBy: duration - threshold,
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  /**
   * Check system health for authentication
   */
  static async checkAuthHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      details?: string;
    }>;
  }> {
    const checks = [];
    const tester = AuthTester.getInstance();
    const metrics = tester.getPerformanceMetrics();

    // Check error rate
    checks.push({
      name: 'Authentication Error Rate',
      status: metrics.errorRate < 0.05 ? 'pass' : (metrics.errorRate < 0.1 ? 'warn' : 'fail'),
      details: `${(metrics.errorRate * 100).toFixed(2)}% error rate`
    });

    // Check admin validation performance
    checks.push({
      name: 'Admin Validation Performance',
      status: metrics.adminValidationTime < 100 ? 'pass' : (metrics.adminValidationTime < 200 ? 'warn' : 'fail'),
      details: `${metrics.adminValidationTime.toFixed(2)}ms average`
    });

    // Check environment configuration
    const validator = AdminValidator.getInstance();
    const config = validator.getConfiguration();
    checks.push({
      name: 'Admin Configuration',
      status: config.adminEmails.length > 0 ? 'pass' : 'fail',
      details: `${config.adminEmails.length} admin emails configured`
    });

    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'warning' | 'critical';
    if (failedChecks > 0) {
      status = 'critical';
    } else if (warningChecks > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return { status, checks };
  }
}

// Export testing utilities  
export type { AuthTestResult, AuthPerformanceMetrics };