# E2E Test Setup Guide

This directory contains comprehensive Playwright E2E tests for the Voice Identification system in the Universal Assistant.

## Test Files

### `voice-identification-browser.test.ts`
Comprehensive E2E tests that verify the voice identification system works in a real browser environment, including:

- **Page Loading & UI Elements**: Verifies meeting page loads with correct UI components
- **Authentication Flow**: Handles login/authentication requirements  
- **Microphone Permissions**: Tests audio capture permission handling
- **Meeting Lifecycle**: Start meeting → Audio capture → Transcription → End meeting
- **Voice Identification Workflow**: Speaker identification and UI updates
- **Mobile Responsiveness**: Tests on mobile viewports
- **Error Handling**: Graceful handling of permission denials and failures
- **Performance Testing**: Page load and meeting start performance metrics
- **Firebase Integration**: Tests storage and database operations
- **Console Monitoring**: Captures and validates browser console output

## Prerequisites

1. **Development Server**: Run `npm run dev` to start the Next.js development server
2. **Authentication Setup**: The app requires Firebase authentication. Tests include:
   - Mock authentication for browser APIs
   - Login flow simulation
   - Graceful skipping when authentication fails

## Running Tests

```bash
# Run all voice identification tests
npm run test:e2e:voice-browser

# Run with headed browser (visible UI)
npm run test:e2e:voice-browser:headed  

# Run with Playwright UI mode
npx playwright test --ui

# Run single test
npx playwright test tests/e2e/voice-identification-browser.test.ts -g "should load meeting page"
```

## Test Configuration

The tests use the existing `playwright.config.ts` which includes:

- **Multi-browser support**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Audio/video permissions**: Pre-granted microphone permissions
- **Mock media devices**: Fake microphone and audio context for consistent testing
- **Automatic server startup**: Starts development server before tests
- **Screenshot/video capture**: On test failures
- **Responsive testing**: Desktop (1440x900) and mobile (375x667) viewports

## Authentication Handling

The tests implement multiple authentication strategies:

1. **Firebase API Mocking**: Intercepts Firebase auth API calls
2. **Browser State Mocking**: Mocks localStorage and auth state
3. **Login Flow Simulation**: Attempts actual login with test credentials
4. **Graceful Fallback**: Skips tests if authentication fails

## Key Test Features

### Audio System Testing
- Mock `getUserMedia()` for microphone access
- Mock `WebAudioAPI` and `AudioContext`  
- Mock `RecordRTC` for audio recording
- Simulate audio permissions and devices

### Firebase Integration Testing  
- Mock Firestore operations
- Mock Firebase Storage uploads
- Mock authentication state
- Test data persistence and retrieval

### UI Component Testing
- Meeting control buttons (Start/Stop)
- Live transcript display
- Speaker identification UI
- Audio status indicators
- Past meetings section
- Progress modals during meeting lifecycle

### Performance Validation
- Page load time under 5 seconds
- Meeting start time under 15 seconds  
- Concurrent operation handling
- Memory and resource usage monitoring

## Screenshots

Tests capture screenshots at key points:
- `tests/screenshots/meeting-page-initial.png` - Initial page state
- `tests/screenshots/meeting-setup-modal.png` - Meeting setup process  
- `tests/screenshots/meeting-active-state.png` - Active meeting with controls
- `tests/screenshots/meeting-with-transcript.png` - Live transcription
- `tests/screenshots/mobile-meeting-page.png` - Mobile responsive layout
- `tests/screenshots/microphone-permission-error.png` - Error handling

## Troubleshooting

### Test Failures
1. **Authentication Issues**: Ensure Firebase credentials are configured
2. **Permission Errors**: Check microphone permissions in browser settings
3. **Timeout Failures**: Increase timeouts in `playwright.config.ts` if needed
4. **Element Not Found**: Update selectors to match current UI implementation

### Debug Mode
```bash
# Run with debug output
npm run test:e2e:voice-browser:debug

# Run with Playwright Inspector
npx playwright test --debug
```

## Integration with CI/CD

The tests are configured for CI environments:
- Retry failed tests 2x in CI
- Run with single worker in CI
- Generate HTML and JSON reports
- Capture traces and videos for failures

## Future Enhancements

1. **Real Authentication**: Set up test Firebase project with test credentials
2. **API Integration**: Test actual Deepgram and ElevenLabs integrations  
3. **WebSocket Testing**: Test real-time transcript streaming
4. **Accessibility Testing**: Add WCAG compliance tests
5. **Cross-platform Testing**: Add Windows/Linux specific tests
6. **Load Testing**: Test with multiple concurrent users