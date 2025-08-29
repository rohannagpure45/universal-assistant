# Store Integration Guide

This document explains how the state management stores are integrated to create a seamless system across the Universal Assistant application.

## Overview

The application uses three main stores that work together:

1. **AuthStore** - Manages user authentication and preferences
2. **AppStore** - Manages application settings, UI state, and notifications
3. **MeetingStore** - Manages meeting state, transcripts, and participants

## Integration Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    AuthStore    │    │    AppStore     │    │  MeetingStore   │
│                 │    │                 │    │                 │
│ • User data     │───▶│ • UI settings   │    │ • Meeting data  │
│ • Preferences   │    │ • Notifications │    │ • Transcripts   │
│ • Auth state    │    │ • Device mgmt   │    │ • Participants  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────┐
         │        Integration Layer            │
         │                                     │
         │ • useAuth hook                      │
         │ • useStoreIntegration utilities     │
         │ • UniversalAssistantCoordinator     │
         │ • Cross-store synchronization       │
         └─────────────────────────────────────┘
```

## Key Integration Points

### 1. User Authentication & Preferences

When a user signs in/out, the system:

- **Sign In**: Syncs user preferences to AppStore settings
- **Sign Out**: Cleans up MeetingStore state and AppStore notifications
- **Profile Update**: Updates both AuthStore and AppStore with new preferences

```typescript
const { user, signOut, updateProfile } = useAuth();

// Enhanced sign out with cleanup
await signOut(); // Automatically cleans meeting state and notifications

// Enhanced profile update with preference sync
await updateProfile({
  preferences: {
    ai: { defaultModel: 'gpt-4o' },
    tts: { voiceId: 'custom-voice' }
  }
}); // Automatically syncs to AppStore
```

### 2. Meeting State Management

The MeetingStore integrates with:

- **DatabaseService**: For persistent storage operations
- **RealtimeService**: For real-time synchronization
- **AuthStore**: For user context and permissions
- **AppStore**: For error notifications and UI updates

```typescript
const meetingStore = useMeetingStore();
const { startNewMeeting } = useStoreIntegration();

// Integrated meeting creation
const meetingId = await startNewMeeting('standup', 'Daily Standup');
// Automatically handles: user validation, database storage, notifications
```

### 3. Universal Assistant Integration

The UniversalAssistantCoordinator now:

- Receives store instances during initialization
- Syncs recording state with MeetingStore
- Uses AppStore settings for AI/TTS configuration
- Sends transcript entries to MeetingStore
- Shows error notifications via AppStore

```typescript
const coordinator = createUniversalAssistantCoordinator(
  config, 
  meetingStore, 
  appStore
);

// Automatically syncs state between coordinator and stores
coordinator.startRecording(); // Updates MeetingStore recording state
```

## Available Integration Utilities

### useStoreIntegration Hook

Provides a comprehensive set of utilities:

```typescript
const integration = useStoreIntegration();

// Preference synchronization
integration.syncFromAuthToApp();
integration.syncFromAppToAuth();

// Meeting management
const meetingId = await integration.startNewMeeting(type, title);
const success = await integration.endCurrentMeeting();

// Error handling
integration.handleError(error, 'operation-name');
integration.handleAsyncError(promise, 'async-operation');

// State persistence
integration.saveAppState();
integration.restoreAppState();

// Performance monitoring
integration.measureStoreOperation('operation', () => {
  // Some expensive operation
});

// Cleanup
integration.cleanupAllStores();
```

### Store-Specific Utilities

Each store provides optimized selectors and utilities:

```typescript
// AuthStore selectors
const user = useAuthUser();
const isAuthenticated = useAuthStatus();
const preferences = useUserPreferences();

// AppStore selectors
const audioSettings = useAudioSettings();
const theme = useAppTheme();
const notifications = useAppNotifications();

// MeetingStore selectors
const currentMeeting = useCurrentMeeting();
const transcript = useMeetingTranscript();
const participants = useMeetingParticipants();
```

## Error Handling Strategy

### Global Error Management

All stores contribute to a centralized error handling system:

1. **Capture**: Errors are caught and standardized
2. **Store**: Added to AppStore global error collection
3. **Notify**: User-facing notifications via AppStore
4. **Log**: Console logging with context
5. **Monitor**: Performance impact tracking

```typescript
// Error handling flow
try {
  await someStoreOperation();
} catch (error) {
  // Automatically handled by integration layer
  integration.handleError(error, 'store-operation');
  // Results in: global error entry + user notification + console log
}
```

### Store-Specific Error States

Each store maintains its own error state for specific operations:

- **AuthStore**: `error` - Authentication-related errors
- **MeetingStore**: `meetingError`, `transcriptError` - Meeting operation errors
- **AppStore**: `deviceError`, `globalErrors` - Device and application errors

## Cross-Store State Synchronization

### Automatic Synchronization

The system automatically synchronizes state between stores:

1. **Auth → App**: User preferences sync to app settings
2. **App → Auth**: Settings changes can be saved to user preferences
3. **Meeting → App**: Meeting errors trigger app notifications
4. **Auth → Meeting**: User sign-out triggers meeting cleanup

### Manual Synchronization

For advanced use cases, manual synchronization is available:

```typescript
const { syncFromAuthToApp, syncFromAppToAuth } = useStoreIntegration();

// Manually sync preferences
syncFromAuthToApp(); // Auth preferences → App settings
await syncFromAppToAuth(); // App settings → Auth preferences (persisted)
```

## Performance Considerations

### Optimized Updates

- Stores use Zustand with Immer for efficient immutable updates
- Selectors are optimized to prevent unnecessary re-renders
- Real-time listeners are properly managed to prevent memory leaks

### State Persistence

- Critical state is automatically persisted to localStorage
- Expired state is automatically cleaned up
- Restore operations are batched for efficiency

### Memory Management

- Automatic cleanup on user sign-out
- Real-time listener cleanup on component unmount
- Error state trimming (keeps only last 10 errors)

## Best Practices

### 1. Use Integration Hooks

Instead of accessing stores directly, use integration hooks:

```typescript
// ❌ Don't do this
const authStore = useAuthStore();
const appStore = useAppStore();
const meetingStore = useMeetingStore();
// Manual coordination...

// ✅ Do this
const { user, startNewMeeting, handleError } = useStoreIntegration();
// Automatic coordination
```

### 2. Handle Async Operations Properly

Use the error handling utilities for async operations:

```typescript
// ❌ Don't do this
try {
  await meetingStore.startMeeting(data);
} catch (error) {
  console.error(error);
}

// ✅ Do this
integration.handleAsyncError(
  meetingStore.startMeeting(data),
  'start-meeting'
);
```

### 3. Clean Up Properly

Use cleanup utilities when components unmount or users sign out:

```typescript
useEffect(() => {
  return () => {
    integration.cleanupAllStores();
  };
}, []);
```

## Testing Integration

Use the `TestIntegration` component to verify store integration:

```typescript
import TestIntegration from '@/components/TestIntegration';

// Add to your development page
<TestIntegration />
```

This component tests:
- Store initialization
- Cross-store synchronization
- Error handling
- State persistence
- Performance monitoring

## Troubleshooting

### Common Issues

1. **Store not initialized**: Ensure auth store initialization in app startup
2. **Preferences not syncing**: Check user authentication status
3. **Meeting state inconsistent**: Verify real-time listener setup
4. **Performance issues**: Use performance monitoring utilities

### Debug Tools

The stores include debug utilities:

```typescript
// Enable debug logging
localStorage.setItem('debug-stores', 'true');

// Check store state
console.log('Auth:', useAuthStore.getState());
console.log('App:', useAppStore.getState());
console.log('Meeting:', useMeetingStore.getState());
```

## Migration Notes

### From Previous Implementation

If migrating from a previous state management solution:

1. Replace direct store access with integration hooks
2. Update error handling to use centralized system
3. Remove manual preference synchronization code
4. Update Universal Assistant initialization

### Backwards Compatibility

The integration maintains backwards compatibility with existing:
- Authentication flows
- Meeting management
- User preferences
- Error handling patterns

## Future Enhancements

Planned improvements to the integration system:

1. **Offline Support**: State synchronization when offline
2. **Advanced Caching**: Intelligent cache management across stores
3. **State Snapshots**: Better debugging with state history
4. **Performance Analytics**: Detailed performance monitoring
5. **Plugin System**: Extensible store integration architecture