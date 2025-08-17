# Integration Test Suite

## Overview

This comprehensive integration test suite validates the complete authentication and state management system, ensuring all components work together seamlessly in real-world scenarios.

## Test Structure

```
tests/integration/
├── test-utils/
│   └── integration-helpers.ts    # Comprehensive test utilities
├── auth-flow.test.ts            # Authentication flow integration
├── database-state.test.ts       # Database + State management
├── cross-store-sync.test.ts     # Cross-store synchronization
├── realtime.test.ts             # Real-time data synchronization
├── e2e-user-journey.test.ts     # End-to-end user workflows
├── performance-concurrency.test.ts # Performance & concurrency
└── README.md                    # This file
```

## Test Coverage

### 1. Authentication Flow Integration Tests (`auth-flow.test.ts`)
- **User Registration Flow**: SignUp → Firestore document creation → AuthStore update
- **User Sign-In Flow**: SignIn → Database retrieval → Store synchronization
- **Google OAuth Flow**: OAuth → User document creation/update → State sync
- **Profile Updates**: Update preferences → Database sync → Cross-store propagation
- **Sign-Out Flow**: SignOut → Cross-store cleanup → State reset
- **Error Handling**: Authentication failures, token expiration, recovery
- **Performance**: Authentication operations within 500ms threshold

### 2. Database + State Management Integration (`database-state.test.ts`)
- **Meeting CRUD Operations**: Create/Read/Update/Delete with store synchronization
- **Transcript Management**: Real-time transcript updates, fragment processing
- **Voice Profile Management**: Speaker identification and profile sync
- **Batch Operations**: High-volume database operations with performance validation
- **Pagination & Search**: Large dataset handling with efficient queries
- **Data Consistency**: Transaction handling, rollback scenarios
- **Error Recovery**: Database failures with graceful degradation

### 3. Cross-Store Synchronization Tests (`cross-store-sync.test.ts`)
- **Auth → App Store Sync**: User preferences synchronization
- **Bidirectional Sync**: Preference updates across stores
- **Auth → Meeting Store**: Meeting state cleanup on authentication changes
- **Error Propagation**: Error states across store boundaries
- **Performance**: Cross-store sync within 100ms threshold
- **Memory Management**: Subscription cleanup, leak prevention
- **State Consistency**: Concurrent updates, race condition handling

### 4. Real-time Integration Tests (`realtime.test.ts`)
- **Meeting Updates**: Real-time meeting state synchronization
- **Transcript Updates**: Live transcript additions, modifications, deletions
- **Participant Management**: Join/leave events, active speaker tracking
- **Error Handling**: Connection failures, malformed data, recovery
- **High-Frequency Updates**: 200+ updates per second handling
- **Concurrent Streams**: Multiple real-time data streams
- **Data Ordering**: Timestamp-based transcript ordering

### 5. End-to-End User Journey Tests (`e2e-user-journey.test.ts`)
- **New User Journey**: Registration → First meeting → Transcript → End meeting
- **Returning User Journey**: Login → Meeting continuation → Collaboration
- **Multi-User Collaboration**: Host + participants, real-time interaction
- **Error Recovery**: Complete workflow recovery from failures
- **Performance Under Load**: Intensive operations during user workflows

### 6. Performance & Concurrency Tests (`performance-concurrency.test.ts`)
- **Authentication Performance**: Sub-500ms authentication operations
- **Database Performance**: High-volume operations, large datasets
- **Real-time Performance**: High-frequency updates, concurrent streams
- **Store Performance**: Rapid state updates, large state objects
- **Memory Management**: Resource cleanup, memory leak prevention
- **Stress Testing**: Extreme load scenarios, resource exhaustion recovery
- **Performance Benchmarks**: Critical operation thresholds

## Key Testing Utilities

### IntegrationTestScenario
Structured test scenario runner with step-by-step execution and cleanup:
```typescript
const scenario = new IntegrationTestScenario('Test Description');
await scenario
  .step('Step 1: Setup', async () => { /* ... */ })
  .step('Step 2: Execute', async () => { /* ... */ })
  .step('Step 3: Verify', async () => { /* ... */ })
  .run();
```

### Performance Measurement
```typescript
const { duration, memory } = await measurePerformance(async () => {
  // Operation to measure
}, 'Operation Label');
```

### Concurrency Testing
```typescript
await testConcurrency(
  [operation1, operation2, operation3],
  () => expectedCondition(),
  timeout
);
```

### Store State Validation
```typescript
expectStoreState.authUser(expectedUser);
expectStoreState.meetingState({ isInMeeting: true });
expectStoreState.crossStoreSync();
```

## Performance Benchmarks

| Operation | Target | Description |
|-----------|--------|-------------|
| User Authentication | 500ms | Sign-in/sign-up operations |
| Cross-Store Sync | 100ms | Preference synchronization |
| Meeting Creation | 1000ms | Complete meeting setup |
| Transcript Addition | 50ms | Single transcript entry |
| Real-time Update | 10ms | Live data processing |
| Store Update | 5ms | State change operations |
| Search Operation | 100ms | Dataset queries |
| Data Load | 200ms | Initial data loading |

## Test Data Factories

The test suite includes comprehensive mock data factories:
- `createMockUser()`: Complete user objects with preferences
- `createMockMeeting()`: Meeting objects with participants and metadata
- `createMockTranscriptEntry()`: Transcript entries with speaker data
- `createMockSpeakerProfile()`: Voice profile data
- `TestAuthStateManager`: Authentication state simulation
- `TestDatabaseStateManager`: Database operation mocking

## Error Simulation

Comprehensive error scenario testing:
- Authentication errors (network, credentials, tokens)
- Database errors (permissions, connection, data corruption)
- Real-time connection errors (websocket failures, reconnection)
- Performance degradation scenarios
- Resource exhaustion conditions

## Running the Tests

```bash
# Run all integration tests
npm test tests/integration

# Run specific test suites
npm test tests/integration/auth-flow.test.ts
npm test tests/integration/performance-concurrency.test.ts

# Run with coverage
npm test tests/integration --coverage

# Run with performance profiling
npm test tests/integration --verbose
```

## Test Environment

The integration tests use a completely mocked Firebase environment:
- Mock Authentication with state management
- Mock Firestore with in-memory data storage
- Mock Real-time listeners with callback simulation
- Isolated test environment with cleanup between tests

## Continuous Integration

These tests are designed for CI/CD environments:
- Deterministic execution with proper mocking
- Performance thresholds that account for CI limitations
- Comprehensive error reporting with detailed logs
- Parallel execution support with proper isolation

## Extending the Test Suite

To add new integration tests:

1. **Create test utilities** in `test-utils/integration-helpers.ts`
2. **Follow the established patterns** for scenario-based testing
3. **Include performance benchmarks** for critical operations
4. **Add error scenarios** and recovery testing
5. **Ensure proper cleanup** to prevent test interference
6. **Document new test coverage** in this README

## Best Practices

1. **Test Real Integration**: Mock external services but test actual integration between internal components
2. **Performance First**: Include performance assertions in all tests
3. **Error Scenarios**: Test both success and failure paths
4. **State Consistency**: Verify state consistency across all stores
5. **Resource Cleanup**: Ensure proper cleanup to prevent memory leaks
6. **Comprehensive Coverage**: Test complete user workflows, not just individual functions

This integration test suite ensures the Universal Assistant's authentication and state management systems are production-ready, performant, and reliable under all conditions.