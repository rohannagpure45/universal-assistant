# Voice Library E2E Tests

Comprehensive Playwright test suite for Firebase voice library functionality, addressing authentication flows, Firebase permissions, and component behavior validation.

## Overview

This test suite specifically validates the Firebase voice library functionality that was recently reviewed and debugged, including:

- **Authentication Tests**: AuthGuard functionality and access control
- **Firebase Permission Tests**: Database access and permission error handling
- **Component Tests**: VoiceLibraryDashboard and VoiceLibraryDemo behavior
- **Integration Tests**: Complete auth → voice library workflows
- **End-to-End Tests**: Full user journeys across viewports
- **Performance Tests**: Load testing and optimization validation

## Test Files

### Core Test Files

- **`firebase-voice-library.spec.ts`** - Main test suite covering all core functionality
- **`firebase-voice-library-integration.spec.ts`** - Integration tests for complex workflows
- **`utils/voice-library-test-utils.ts`** - Comprehensive test utilities and fixtures

### Configuration Files

- **`playwright-voice-library.config.ts`** - Specialized Playwright configuration
- **`setup/voice-library-global-setup.ts`** - Test environment setup
- **`setup/voice-library-global-teardown.ts`** - Cleanup and teardown

### Scripts

- **`scripts/run-voice-library-tests.js`** - Test runner with advanced options
- **`.github/workflows/voice-library-tests.yml`** - CI/CD pipeline configuration

## Quick Start

### Run All Tests
```bash
npm run test:voice-library
```

### Run Specific Test Suites
```bash
npm run test:voice-library:auth           # Authentication tests
npm run test:voice-library:permissions    # Firebase permission tests
npm run test:voice-library:components     # Component behavior tests
npm run test:voice-library:integration    # Integration workflows
npm run test:voice-library:e2e           # End-to-end user journeys
npm run test:voice-library:performance   # Performance validation
```

### Cross-Browser Testing
```bash
npm run test:voice-library:cross-browser  # All browsers
npm run test:voice-library -- --browser=firefox
npm run test:voice-library -- --browser=webkit
```

### Debug Mode
```bash
npm run test:voice-library:debug         # Headed mode with debugging
npm run test:voice-library:headed        # Visible browser execution
```

## Test Structure

### 1. Authentication Tests

Tests for proper authentication handling and access control:

```typescript
test('should show AuthGuard when user is not authenticated', async ({ page }) => {
  await utils.navigateToVoiceLibrary();
  const authGuardVisible = await utils.isAuthGuardDisplayed();
  expect(authGuardVisible).toBe(true);
});

test('should allow voice library access with proper authentication', async ({ page }) => {
  await utils.login();
  await utils.navigateToVoiceLibrary();
  const dashboardLoaded = await utils.isVoiceLibraryDashboardLoaded();
  expect(dashboardLoaded).toBe(true);
});
```

### 2. Firebase Permission Tests

Tests for specific Firebase permission errors that were debugged:

```typescript
test('should handle permission-denied error when getting unconfirmed voices', async ({ page }) => {
  await page.route('**/firestore.googleapis.com/**', (route) => {
    if (postData.includes('confirmed') && postData.includes('false')) {
      route.fulfill({
        status: 403,
        body: JSON.stringify({
          error: {
            code: 'permission-denied',
            message: 'Missing or insufficient permissions when getting unconfirmed voices'
          }
        })
      });
    }
  });
  
  await utils.navigateToVoiceLibrary();
  await expect(page.locator('[data-testid="unconfirmed-voices-error"]')).toBeVisible();
});
```

### 3. Component Tests

Tests for VoiceLibraryDashboard and VoiceLibraryDemo components:

```typescript
test('should render VoiceLibraryDashboard with authenticated user', async ({ page }) => {
  await utils.mockFirebaseVoiceProfiles([fixtures.voiceProfiles.confirmed]);
  await utils.navigateToVoiceLibrary();
  
  await expect(page.locator('[data-testid="voice-library-dashboard"]')).toBeVisible();
  await expect(page.locator('[data-testid="voice-library-stats"]')).toBeVisible();
  await utils.waitForVoiceProfilesToLoad();
});
```

### 4. Integration Tests

Tests for complete authentication and data loading workflows:

```typescript
test('should complete full auth flow to voice library access', async ({ page }) => {
  await page.goto('/auth');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-submit"]');
  
  await page.waitForURL('**/dashboard');
  await page.click('[data-testid="nav-voice-library"]');
  
  await expect(page.locator('[data-testid="voice-library-dashboard"]')).toBeVisible();
});
```

## Test Utilities

The `VoiceLibraryTestUtils` class provides comprehensive utilities:

### Authentication
```typescript
await utils.login();                     // Login with test credentials
await utils.logout();                    // Logout current user
await utils.mockAuthenticatedState();    // Mock auth state for testing
```

### Navigation
```typescript
await utils.navigateToVoiceLibrary();    // Navigate to voice library page
await utils.navigateToVoiceIdentification(); // Navigate to voice ID page
```

### State Verification
```typescript
const authGuardVisible = await utils.isAuthGuardDisplayed();
const dashboardLoaded = await utils.isVoiceLibraryDashboardLoaded();
const demoModeActive = await utils.isDemoModeActive();
```

### Firebase Mocking
```typescript
await utils.mockFirebaseVoiceProfiles(profiles);  // Mock voice profile data
await utils.mockFirebasePermissionError();        // Mock permission errors
await utils.mockFirebaseNetworkError();           // Mock network failures
```

### Data Interaction
```typescript
await utils.waitForVoiceProfilesToLoad(expectedCount);
await utils.searchVoiceProfiles('John Doe');
await utils.filterVoiceProfiles('confirmed');
```

## Test Data and Fixtures

Comprehensive test data is provided in `VOICE_LIBRARY_FIXTURES`:

### User Fixtures
```typescript
users: {
  authenticated: {
    uid: 'test-user-authenticated',
    email: 'authenticated@test.com',
    password: 'TestPassword123!'
  },
  admin: {
    uid: 'test-admin-user',
    email: 'admin@test.com',
    customClaims: { admin: true }
  }
}
```

### Voice Profile Fixtures
```typescript
voiceProfiles: {
  confirmed: {
    deepgramVoiceId: 'voice_confirmed_001',
    userName: 'John Doe',
    confirmed: true,
    confidence: 0.95
  },
  unconfirmed: {
    deepgramVoiceId: 'voice_unconfirmed_002',
    confirmed: false,
    confidence: 0.45
  }
}
```

## Configuration

### Playwright Configuration

The tests use a specialized Playwright configuration optimized for Firebase testing:

```typescript
// playwright-voice-library.config.ts
export default defineConfig({
  testMatch: ['**/firebase-voice-library*.spec.ts'],
  timeout: 60 * 1000,
  fullyParallel: false, // Sequential for Firebase auth consistency
  workers: process.env.CI ? 1 : 2,
  
  use: {
    baseURL: 'http://localhost:3000',
    contextOptions: {
      permissions: ['microphone', 'camera'],
    }
  }
});
```

### Environment Variables

Required environment variables for Firebase testing:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-test-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=test-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=test-project
FIREBASE_ADMIN_SDK_KEY=your-admin-sdk-json
```

## CI/CD Integration

### GitHub Actions Workflow

The tests are integrated with GitHub Actions for automated testing:

```yaml
# .github/workflows/voice-library-tests.yml
- name: Run voice library permission tests
  run: |
    npx playwright test firebase-voice-library.spec.ts \
      --project=chromium \
      --grep="Firebase Permission Tests"
```

### Test Matrix

The CI pipeline runs tests across multiple configurations:

- **Browsers**: Chromium, Firefox, WebKit
- **Test Suites**: Authentication, Permissions, Components, Integration, E2E
- **Environments**: CI/Local, With/Without Firebase Emulators

## Debugging

### Debug Mode

Run tests in debug mode for detailed troubleshooting:

```bash
npm run test:voice-library:debug
```

This enables:
- Headed browser execution (visible)
- Verbose console output
- Screenshot capture on all steps
- Network request logging

### Console Error Tracking

The test utils automatically track console errors:

```typescript
const errors = utils.getConsoleErrors();
const firebaseErrors = utils.getFirebasePermissionErrors();
```

### Screenshot Capture

Automatic screenshot capture for documentation and debugging:

```typescript
await utils.takeFullPageScreenshot('test-scenario-name');
await utils.takeElementScreenshot('[data-testid="component"]', 'component-state');
```

## Performance Testing

### Load Testing

Tests validate performance under various conditions:

```typescript
test('should handle large datasets efficiently', async ({ page }) => {
  const largeDataset = Array.from({ length: 100 }, createVoiceProfile);
  await utils.mockFirebaseVoiceProfiles(largeDataset);
  
  const loadTime = await utils.measurePageLoadTime();
  expect(loadTime).toBeLessThan(5000);
});
```

### Performance Assertions

```typescript
const searchTime = await utils.measureActionTime(async () => {
  await utils.searchVoiceProfiles('John');
});
expect(searchTime).toBeLessThan(1000);
```

## Test Results

### HTML Report

After running tests, view the comprehensive HTML report:

```bash
open test-results/voice-library-reports/index.html
```

### JSON Results

Programmatic access to test results:

```bash
cat test-results/voice-library-results.json
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots at failure point
- Video recordings of test execution
- Network request logs
- Console error logs

## Troubleshooting

### Common Issues

1. **Firebase Connection Errors**
   ```bash
   # Ensure Firebase emulator is running
   firebase emulators:start --only auth,firestore
   ```

2. **Authentication State Issues**
   ```bash
   # Clear authentication states
   rm -rf tests/auth-states/*.json
   ```

3. **Browser Installation**
   ```bash
   # Install Playwright browsers
   npx playwright install
   ```

### Debug Steps

1. **Check Prerequisites**
   ```bash
   npm run test:voice-library -- --help
   ```

2. **Run Single Test**
   ```bash
   npx playwright test firebase-voice-library.spec.ts -g "specific test name" --headed
   ```

3. **Enable Verbose Logging**
   ```bash
   DEBUG=pw:api npm run test:voice-library:debug
   ```

## Contributing

### Adding New Tests

1. **Create Test File**
   ```typescript
   // tests/e2e/voice-library-feature.spec.ts
   import { test, expect } from '@playwright/test';
   import { VoiceLibraryTestUtils } from './utils/voice-library-test-utils';
   ```

2. **Add Test Utilities**
   ```typescript
   // Add to VoiceLibraryTestUtils class
   async newTestUtility(): Promise<void> {
     // Implementation
   }
   ```

3. **Update CI Configuration**
   ```yaml
   # Add to .github/workflows/voice-library-tests.yml
   - name: Run new test suite
     run: npx playwright test voice-library-feature.spec.ts
   ```

### Best Practices

1. **Use Test Data Fixtures**
   ```typescript
   const testUser = VOICE_LIBRARY_FIXTURES.users.authenticated;
   ```

2. **Mock Firebase Appropriately**
   ```typescript
   await utils.mockFirebaseVoiceProfiles([profileData]);
   ```

3. **Verify State Changes**
   ```typescript
   await expect(page.locator('[data-testid="element"]')).toBeVisible();
   ```

4. **Clean Up After Tests**
   ```typescript
   test.afterEach(async () => {
     await utils.cleanup();
   });
   ```

## Related Documentation

- [Firebase Voice Library Service](../../src/services/firebase/VoiceLibraryService.ts)
- [Voice Library Components](../../src/components/voice-identification/)
- [Authentication Provider](../../src/components/providers/AuthProvider.tsx)
- [Main Playwright Configuration](../../playwright.config.ts)

## Support

For issues with the voice library tests:

1. Check the [test results](test-results/) for detailed error information
2. Review console logs and screenshots from failed tests
3. Run tests in debug mode for interactive troubleshooting
4. Verify Firebase configuration and permissions