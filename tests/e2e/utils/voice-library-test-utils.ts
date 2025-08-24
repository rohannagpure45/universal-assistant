/**
 * Voice Library Test Utilities
 * 
 * Comprehensive utilities for testing Firebase voice library functionality with Playwright.
 * Provides authentication helpers, Firebase mocking, data fixtures, and verification methods.
 * 
 * @requires Playwright
 * @requires Firebase Test Environment
 */

import { Page, BrowserContext, expect } from '@playwright/test';
import type { VoiceLibraryEntry } from '@/types/database';

/**
 * Test configuration constants
 */
export const VOICE_LIBRARY_TEST_CONFIG = {
  timeouts: {
    short: 3000,
    medium: 10000,
    long: 30000,
    extraLong: 60000
  },
  selectors: {
    authGuard: '[data-testid="auth-guard"]',
    voiceLibraryDashboard: '[data-testid="voice-library-dashboard"]',
    demoBanner: '[data-testid="demo-banner"]',
    voiceProfileCard: '[data-testid="voice-profile-card"]',
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorState: '[data-testid="error-state"]',
    retryButton: '[data-testid="retry-button"]',
    searchInput: '[data-testid="search-input"]',
    filterStatus: '[data-testid="filter-status"]'
  },
  routes: {
    auth: '/auth',
    dashboard: '/dashboard',
    voiceLibrary: '/voice-library',
    voiceIdentification: '/voice-identification'
  }
};

/**
 * Test data fixtures for voice library testing
 */
export const VOICE_LIBRARY_FIXTURES = {
  users: {
    authenticated: {
      uid: 'test-user-authenticated',
      email: 'authenticated@test.com',
      password: 'TestPassword123!',
      displayName: 'Authenticated User',
      emailVerified: true
    },
    unauthenticated: {
      email: 'guest@test.com'
    },
    admin: {
      uid: 'test-admin-user',
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      displayName: 'Admin User',
      emailVerified: true,
      customClaims: { admin: true }
    }
  },
  voiceProfiles: {
    confirmed: {
      deepgramVoiceId: 'voice_confirmed_001',
      userId: 'test-user-authenticated',
      userName: 'John Doe',
      confirmed: true,
      confidence: 0.95,
      firstHeard: new Date('2024-01-15'),
      lastHeard: new Date('2024-01-20'),
      meetingsCount: 5,
      totalSpeakingTime: 1800,
      audioSamples: [
        {
          url: '/test-audio/sample1.webm',
          transcript: 'This is a test voice sample from John Doe.',
          quality: 0.9,
          duration: 5.2,
          timestamp: new Date('2024-01-20T10:30:00')
        }
      ],
      identificationHistory: [
        {
          method: 'self' as const,
          timestamp: new Date('2024-01-15T09:00:00'),
          meetingId: 'meeting_001',
          confidence: 1.0,
          details: 'Self-identified during meeting introduction'
        }
      ]
    },
    unconfirmed: {
      deepgramVoiceId: 'voice_unconfirmed_002',
      userId: null,
      userName: null,
      confirmed: false,
      confidence: 0.45,
      firstHeard: new Date('2024-01-18'),
      lastHeard: new Date('2024-01-18'),
      meetingsCount: 1,
      totalSpeakingTime: 120,
      audioSamples: [
        {
          url: '/test-audio/unknown-sample.webm',
          transcript: 'Unknown speaker voice sample for identification.',
          quality: 0.7,
          duration: 3.8,
          timestamp: new Date('2024-01-18T16:20:00')
        }
      ],
      identificationHistory: []
    },
    highConfidence: {
      deepgramVoiceId: 'voice_high_conf_003',
      userId: 'test-user-authenticated',
      userName: 'Jane Smith',
      confirmed: true,
      confidence: 0.98,
      firstHeard: new Date('2024-01-10'),
      lastHeard: new Date('2024-01-21'),
      meetingsCount: 12,
      totalSpeakingTime: 3600,
      audioSamples: [
        {
          url: '/test-audio/jane-sample1.webm',
          transcript: 'High quality voice sample from Jane Smith.',
          quality: 0.95,
          duration: 8.1,
          timestamp: new Date('2024-01-21T14:15:00')
        },
        {
          url: '/test-audio/jane-sample2.webm',
          transcript: 'Another excellent voice sample for matching.',
          quality: 0.92,
          duration: 6.7,
          timestamp: new Date('2024-01-21T14:20:00')
        }
      ],
      identificationHistory: [
        {
          method: 'automatic' as const,
          timestamp: new Date('2024-01-10T11:30:00'),
          meetingId: 'meeting_002',
          confidence: 0.98,
          details: 'Auto-identified with high confidence'
        }
      ]
    }
  },
  firebaseErrors: {
    permissionDenied: {
      code: 'permission-denied',
      message: 'Missing or insufficient permissions'
    },
    networkError: {
      code: 'unavailable',
      message: 'The service is currently unavailable'
    },
    quotaExceeded: {
      code: 'resource-exhausted',
      message: 'Quota exceeded'
    }
  }
};

/**
 * Enhanced Voice Library Test Utilities Class
 */
export class VoiceLibraryTestUtils {
  private page: Page;
  private context: BrowserContext;
  private consoleErrors: string[] = [];
  private networkRequests: any[] = [];

  constructor(page: Page, context?: BrowserContext) {
    this.page = page;
    this.context = context || page.context();
    this.setupErrorTracking();
    this.setupNetworkTracking();
  }

  /**
   * Setup error tracking for console messages
   */
  private setupErrorTracking(): void {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });

    this.page.on('pageerror', (error) => {
      this.consoleErrors.push(`Page Error: ${error.message}`);
    });
  }

  /**
   * Setup network request tracking
   */
  private setupNetworkTracking(): void {
    this.page.on('request', (request) => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
  }

  /**
   * Authentication Utilities
   */
  async login(user = VOICE_LIBRARY_FIXTURES.users.authenticated): Promise<void> {
    await this.page.goto(VOICE_LIBRARY_TEST_CONFIG.routes.auth);
    
    // Fill login form
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    
    // Submit login
    await this.page.click('[data-testid="login-submit"]');
    
    // Wait for successful authentication
    await this.page.waitForURL('**/dashboard', { 
      timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.medium 
    });
  }

  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('**/auth', { 
      timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.medium 
    });
  }

  async mockAuthenticatedState(user = VOICE_LIBRARY_FIXTURES.users.authenticated): Promise<void> {
    await this.page.addInitScript((userData) => {
      window.__FIREBASE_AUTH_MOCK__ = {
        currentUser: userData,
        isAuthenticated: true
      };
    }, user);
  }

  async mockUnauthenticatedState(): Promise<void> {
    await this.page.addInitScript(() => {
      window.__FIREBASE_AUTH_MOCK__ = {
        currentUser: null,
        isAuthenticated: false
      };
    });
  }

  /**
   * Navigation Utilities
   */
  async navigateToVoiceLibrary(): Promise<void> {
    await this.page.goto(VOICE_LIBRARY_TEST_CONFIG.routes.voiceLibrary);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToVoiceIdentification(): Promise<void> {
    await this.page.goto(VOICE_LIBRARY_TEST_CONFIG.routes.voiceIdentification);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToDashboard(): Promise<void> {
    await this.page.goto(VOICE_LIBRARY_TEST_CONFIG.routes.dashboard);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * State Verification Utilities
   */
  async isAuthGuardDisplayed(): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        VOICE_LIBRARY_TEST_CONFIG.selectors.authGuard, 
        { timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.short }
      );
      return true;
    } catch {
      return false;
    }
  }

  async isVoiceLibraryDashboardLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        VOICE_LIBRARY_TEST_CONFIG.selectors.voiceLibraryDashboard,
        { timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.medium }
      );
      return true;
    } catch {
      return false;
    }
  }

  async isDemoModeActive(): Promise<boolean> {
    try {
      await this.page.waitForSelector(
        VOICE_LIBRARY_TEST_CONFIG.selectors.demoBanner,
        { timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.short }
      );
      return true;
    } catch {
      return false;
    }
  }

  async isLoadingStateDisplayed(): Promise<boolean> {
    try {
      return await this.page.locator(VOICE_LIBRARY_TEST_CONFIG.selectors.loadingSpinner).isVisible();
    } catch {
      return false;
    }
  }

  async isErrorStateDisplayed(): Promise<boolean> {
    try {
      return await this.page.locator(VOICE_LIBRARY_TEST_CONFIG.selectors.errorState).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Firebase Mocking Utilities
   */
  async mockFirebaseVoiceProfiles(profiles: VoiceLibraryEntry[] = []): Promise<void> {
    await this.page.route('**/firestore.googleapis.com/**', (route) => {
      const url = route.request().url();
      
      if (url.includes('voice_library')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documents: profiles.map(profile => ({
              name: `voice_library/${profile.deepgramVoiceId}`,
              fields: this.convertProfileToFirestoreFields(profile)
            }))
          })
        });
      } else {
        route.continue();
      }
    });
  }

  async mockFirebasePermissionError(errorType: keyof typeof VOICE_LIBRARY_FIXTURES.firebaseErrors = 'permissionDenied'): Promise<void> {
    const error = VOICE_LIBRARY_FIXTURES.firebaseErrors[errorType];
    
    await this.page.route('**/firestore.googleapis.com/**', (route) => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: error.code,
            message: error.message
          }
        })
      });
    });
  }

  async mockFirebaseNetworkError(): Promise<void> {
    await this.page.route('**/firestore.googleapis.com/**', (route) => {
      route.abort('failed');
    });
  }

  async mockFirebaseSlowResponse(delayMs: number = 3000): Promise<void> {
    await this.page.route('**/firestore.googleapis.com/**', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ documents: [] })
        });
      }, delayMs);
    });
  }

  /**
   * Data Interaction Utilities
   */
  async waitForVoiceProfilesToLoad(expectedCount?: number): Promise<void> {
    if (expectedCount !== undefined) {
      await expect(this.page.locator(VOICE_LIBRARY_TEST_CONFIG.selectors.voiceProfileCard))
        .toHaveCount(expectedCount, { timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.medium });
    } else {
      await this.page.waitForSelector(
        VOICE_LIBRARY_TEST_CONFIG.selectors.voiceProfileCard,
        { timeout: VOICE_LIBRARY_TEST_CONFIG.timeouts.medium }
      );
    }
  }

  async searchVoiceProfiles(searchTerm: string): Promise<void> {
    await this.page.fill(VOICE_LIBRARY_TEST_CONFIG.selectors.searchInput, searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounced search
  }

  async filterVoiceProfiles(status: 'all' | 'confirmed' | 'unconfirmed'): Promise<void> {
    await this.page.selectOption(VOICE_LIBRARY_TEST_CONFIG.selectors.filterStatus, status);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  async getVoiceProfileCount(): Promise<number> {
    return await this.page.locator(VOICE_LIBRARY_TEST_CONFIG.selectors.voiceProfileCard).count();
  }

  async clickRetryButton(): Promise<void> {
    await this.page.click(VOICE_LIBRARY_TEST_CONFIG.selectors.retryButton);
  }

  /**
   * Error and Console Utilities
   */
  getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  getFirebasePermissionErrors(): string[] {
    return this.consoleErrors.filter(error => 
      error.includes('permission-denied') || 
      error.includes('Missing or insufficient permissions')
    );
  }

  clearConsoleErrors(): void {
    this.consoleErrors = [];
  }

  getNetworkRequests(): any[] {
    return [...this.networkRequests];
  }

  getFirebaseRequests(): any[] {
    return this.networkRequests.filter(req => 
      req.url.includes('firestore.googleapis.com') ||
      req.url.includes('firebase')
    );
  }

  /**
   * Screenshot and Documentation Utilities
   */
  async takeFullPageScreenshot(name: string, options?: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `test-results/voice-library-${name}-${timestamp}.png`,
      fullPage: true,
      ...options
    });
  }

  async takeElementScreenshot(selector: string, name: string): Promise<void> {
    const element = this.page.locator(selector);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await element.screenshot({
      path: `test-results/voice-library-element-${name}-${timestamp}.png`
    });
  }

  /**
   * Performance Utilities
   */
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureActionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  /**
   * Accessibility Utilities
   */
  async checkAccessibility(): Promise<any> {
    // Basic accessibility checks
    const issues: string[] = [];
    
    // Check for missing alt text on images
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (!alt) {
        issues.push('Image missing alt attribute');
      }
    }
    
    // Check for missing form labels
    const inputs = await this.page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const label = id ? await this.page.locator(`label[for="${id}"]`).count() : 0;
      
      if (!ariaLabel && label === 0) {
        issues.push('Input missing label or aria-label');
      }
    }
    
    return { issues, count: issues.length };
  }

  /**
   * Viewport and Responsive Utilities
   */
  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async setTabletViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
  }

  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1440, height: 900 });
  }

  /**
   * Cleanup Utilities
   */
  async cleanup(): Promise<void> {
    this.consoleErrors = [];
    this.networkRequests = [];
    await this.page.unrouteAll();
  }

  /**
   * Private helper methods
   */
  private convertProfileToFirestoreFields(profile: VoiceLibraryEntry): any {
    return {
      userId: { stringValue: profile.userId || '' },
      userName: { stringValue: profile.userName || '' },
      confirmed: { booleanValue: profile.confirmed },
      confidence: { doubleValue: profile.confidence },
      firstHeard: { timestampValue: profile.firstHeard.toISOString() },
      lastHeard: { timestampValue: profile.lastHeard.toISOString() },
      meetingsCount: { integerValue: profile.meetingsCount.toString() },
      totalSpeakingTime: { integerValue: profile.totalSpeakingTime.toString() },
      audioSamples: {
        arrayValue: {
          values: profile.audioSamples.map(sample => ({
            mapValue: {
              fields: {
                url: { stringValue: sample.url },
                transcript: { stringValue: sample.transcript },
                quality: { doubleValue: sample.quality },
                duration: { doubleValue: sample.duration },
                timestamp: { timestampValue: sample.timestamp.toISOString() }
              }
            }
          }))
        }
      }
    };
  }
}

/**
 * Test scenario builder for complex workflows
 */
export class VoiceLibraryTestScenario {
  private steps: Array<{ name: string; action: () => Promise<void> }> = [];
  private utils: VoiceLibraryTestUtils;

  constructor(private name: string, utils: VoiceLibraryTestUtils) {
    this.utils = utils;
  }

  step(name: string, action: () => Promise<void>): VoiceLibraryTestScenario {
    this.steps.push({ name, action });
    return this;
  }

  async run(): Promise<void> {
    console.log(`Running scenario: ${this.name}`);
    
    for (const step of this.steps) {
      console.log(`  Step: ${step.name}`);
      try {
        await step.action();
      } catch (error) {
        console.error(`  Step failed: ${step.name}`, error);
        throw error;
      }
    }
    
    console.log(`Scenario completed: ${this.name}`);
  }
}

/**
 * Assertion helpers for voice library testing
 */
export const voiceLibraryAssertions = {
  async expectVoiceProfileVisible(page: Page, profileName: string): Promise<void> {
    await expect(page.locator(`text=${profileName}`)).toBeVisible();
  },

  async expectConfidenceScore(page: Page, score: number): Promise<void> {
    const percentage = Math.round(score * 100);
    await expect(page.locator(`text=${percentage}%`)).toBeVisible();
  },

  async expectStatistic(page: Page, label: string, value: string | number): Promise<void> {
    const statCard = page.locator(`[data-testid="stat-${label.toLowerCase().replace(/\s+/g, '-')}"]`);
    await expect(statCard).toContainText(value.toString());
  },

  async expectErrorMessage(page: Page, message: string): Promise<void> {
    await expect(page.locator('[data-testid="error-message"]')).toContainText(message);
  },

  async expectLoadingState(page: Page, isLoading: boolean): Promise<void> {
    const spinner = page.locator(VOICE_LIBRARY_TEST_CONFIG.selectors.loadingSpinner);
    if (isLoading) {
      await expect(spinner).toBeVisible();
    } else {
      await expect(spinner).not.toBeVisible();
    }
  }
};