/**
 * Playwright Configuration for Voice Library E2E Tests
 * 
 * Specialized configuration for Firebase voice library functionality testing.
 * Optimized for authentication flows, Firebase permission testing, and cross-browser compatibility.
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Voice Library Test Configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/firebase-voice-library*.spec.ts'],
  
  /* Global test timeout */
  timeout: 60 * 1000,
  
  /* Test execution settings */
  fullyParallel: false, // Sequential for Firebase auth state consistency
  workers: process.env.CI ? 1 : 2, // Limited workers to avoid Firebase rate limits
  retries: process.env.CI ? 2 : 1,
  
  /* Reporter configuration */
  reporter: [
    ['html', { 
      outputFolder: 'test-results/voice-library-reports',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: 'test-results/voice-library-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/voice-library-junit.xml' 
    }],
    ['list']
  ],

  /* Global test configuration */
  use: {
    /* Base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Timeouts */
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    /* Trace and debugging */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Browser context settings for Firebase auth */
    contextOptions: {
      permissions: ['microphone', 'camera'],
      // Preserve authentication state between tests
      storageState: undefined // Will be set per test if needed
    },
    
    /* Ignore HTTPS errors in test environment */
    ignoreHTTPSErrors: true,
    
    /* Custom headers for Firebase testing */
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright-voice-library'
    }
  },

  /* Project configurations for different test scenarios */
  projects: [
    /* Authentication Tests */
    {
      name: 'voice-library-auth-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--allow-running-insecure-content'
          ]
        }
      },
      testMatch: '**/firebase-voice-library.spec.ts',
      grep: /Authentication Tests/,
    },

    /* Firebase Permission Tests */
    {
      name: 'voice-library-permissions-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: '**/firebase-voice-library.spec.ts',
      grep: /Firebase Permission Tests/,
    },

    /* Component Tests */
    {
      name: 'voice-library-components-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: '**/firebase-voice-library.spec.ts',
      grep: /Component Tests/,
    },

    /* Integration Tests */
    {
      name: 'voice-library-integration-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: '**/firebase-voice-library-integration.spec.ts',
    },

    /* Cross-browser testing */
    {
      name: 'voice-library-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: ['**/firebase-voice-library.spec.ts', '**/firebase-voice-library-integration.spec.ts'],
      grep: /@cross-browser/,
    },

    {
      name: 'voice-library-webkit',
      use: { 
        ...devices['Desktop Safari'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: ['**/firebase-voice-library.spec.ts', '**/firebase-voice-library-integration.spec.ts'],
      grep: /@cross-browser/,
    },

    /* Mobile testing */
    {
      name: 'voice-library-mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: '**/firebase-voice-library.spec.ts',
      grep: /responsive|mobile/i,
    },

    {
      name: 'voice-library-mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        }
      },
      testMatch: '**/firebase-voice-library.spec.ts',
      grep: /responsive|mobile/i,
    },

    /* Performance testing */
    {
      name: 'voice-library-performance',
      use: { 
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['microphone', 'camera'],
        },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-dev-shm-usage',
            '--no-sandbox'
          ]
        }
      },
      testMatch: '**/firebase-voice-library-integration.spec.ts',
      grep: /Performance|performance/,
    }
  ],

  /* Global setup and teardown */
  globalSetup: path.resolve(__dirname, 'tests/setup/voice-library-global-setup.ts'),
  globalTeardown: path.resolve(__dirname, 'tests/setup/voice-library-global-teardown.ts'),

  /* Development server configuration */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        NODE_ENV: 'test',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project',
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-api-key'
      }
    }
  ],

  /* Expect configuration for voice library tests */
  expect: {
    timeout: 15 * 1000, // Longer timeout for Firebase operations
    toHaveScreenshot: {
      animations: 'disabled'
    },
    toMatchSnapshot: {
      threshold: 0.3
    }
  },

  /* Output directories */
  outputDir: 'test-results/voice-library-output',
  
  /* Environment-specific overrides */
  ...(process.env.CI && {
    // CI-specific configuration
    workers: 1,
    retries: 3,
    use: {
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure'
    }
  })
});