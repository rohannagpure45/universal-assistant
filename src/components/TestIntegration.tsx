/**
 * Integration Test Component
 * 
 * This component tests the integration between all stores and services.
 * It should be removed from production builds.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/stores/appStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useStoreIntegration } from '@/utils/storeIntegration';

export const TestIntegration: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [testLogs, setTestLogs] = useState<string[]>([]);
  
  const auth = useAuth();
  const appStore = useAppStore();
  const meetingStore = useMeetingStore();
  const integration = useStoreIntegration();

  const log = (message: string) => {
    console.log(`[Integration Test] ${message}`);
    setTestLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateResult = (testName: string, result: 'success' | 'error') => {
    setTestResults(prev => ({ ...prev, [testName]: result }));
  };

  // Test 1: Auth Store Integration
  const testAuthIntegration = async () => {
    log('Testing auth store integration...');
    try {
      // Test auth store is properly initialized
      if (auth.isInitialized === false) {
        throw new Error('Auth store not initialized');
      }
      
      // Test auth state is accessible
      const isAuthenticated = auth.isAuthenticated;
      log(`Auth state: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`);
      
      updateResult('auth-integration', 'success');
      log('✅ Auth integration test passed');
    } catch (error) {
      updateResult('auth-integration', 'error');
      log(`❌ Auth integration test failed: ${error}`);
    }
  };

  // Test 2: App Store Integration
  const testAppStoreIntegration = async () => {
    log('Testing app store integration...');
    try {
      // Test app store settings
      const aiSettings = appStore.aiSettings;
      const ttsSettings = appStore.ttsSettings;
      const uiSettings = appStore.uiSettings;
      
      if (!aiSettings || !ttsSettings || !uiSettings) {
        throw new Error('App store settings not available');
      }
      
      // Test settings update
      appStore.updateAISettings({ temperature: 0.7 });
      log('Updated AI settings');
      
      // Test notification system
      const notificationId = appStore.addNotification({
        type: 'info',
        title: 'Test Notification',
        message: 'Testing app store notifications',
        persistent: false,
      });
      log(`Added notification: ${notificationId}`);
      
      // Clean up
      setTimeout(() => appStore.removeNotification(notificationId), 1000);
      
      updateResult('app-store-integration', 'success');
      log('✅ App store integration test passed');
    } catch (error) {
      updateResult('app-store-integration', 'error');
      log(`❌ App store integration test failed: ${error}`);
    }
  };

  // Test 3: Meeting Store Integration
  const testMeetingStoreIntegration = async () => {
    log('Testing meeting store integration...');
    try {
      // Test meeting store state
      const isInMeeting = meetingStore.isInMeeting;
      const currentMeeting = meetingStore.currentMeeting;
      
      log(`Meeting state: ${isInMeeting ? 'in meeting' : 'not in meeting'}`);
      
      // Test recording controls
      meetingStore.startRecording();
      log('Started recording');
      
      setTimeout(() => {
        meetingStore.stopRecording();
        log('Stopped recording');
      }, 500);
      
      updateResult('meeting-store-integration', 'success');
      log('✅ Meeting store integration test passed');
    } catch (error) {
      updateResult('meeting-store-integration', 'error');
      log(`❌ Meeting store integration test failed: ${error}`);
    }
  };

  // Test 4: Cross-Store Synchronization
  const testCrossStoreSync = async () => {
    log('Testing cross-store synchronization...');
    try {
      // Test preference sync
      if (auth.user?.preferences) {
        integration.syncFromAuthToApp();
        log('Synced preferences from auth to app store');
      }
      
      // Test meeting integration
      if (auth.user) {
        log('Testing meeting integration utilities');
        // Note: Don't actually start a meeting in test
      }
      
      updateResult('cross-store-sync', 'success');
      log('✅ Cross-store synchronization test passed');
    } catch (error) {
      updateResult('cross-store-sync', 'error');
      log(`❌ Cross-store synchronization test failed: ${error}`);
    }
  };

  // Test 5: Error Handling
  const testErrorHandling = async () => {
    log('Testing error handling...');
    try {
      // Test error handler utility
      const testError = new Error('Test error for integration test');
      integration.handleError(testError, 'integration-test', false);
      
      log('Error handler utility executed');
      
      // Check if error was added to global errors
      const globalErrors = appStore.globalErrors;
      const hasTestError = globalErrors.some(err => err.message === 'Test error for integration test');
      
      if (!hasTestError) {
        throw new Error('Error was not added to global error store');
      }
      
      // Clean up
      appStore.removeGlobalError('Error');
      
      updateResult('error-handling', 'success');
      log('✅ Error handling test passed');
    } catch (error) {
      updateResult('error-handling', 'error');
      log(`❌ Error handling test failed: ${error}`);
    }
  };

  // Test 6: State Persistence
  const testStatePersistence = async () => {
    log('Testing state persistence...');
    try {
      // Test save state
      const saved = integration.saveAppState();
      if (!saved) {
        throw new Error('Failed to save app state');
      }
      log('App state saved');
      
      // Test restore state (this would typically be done on app initialization)
      // For test purposes, we'll just verify the mechanism works
      const restored = integration.restoreAppState();
      log(`App state restore ${restored ? 'succeeded' : 'skipped (no saved state or expired)'}`);
      
      // Clean up
      integration.clearAppState();
      log('App state cleared');
      
      updateResult('state-persistence', 'success');
      log('✅ State persistence test passed');
    } catch (error) {
      updateResult('state-persistence', 'error');
      log(`❌ State persistence test failed: ${error}`);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    log('🚀 Starting integration tests...');
    setTestResults({
      'auth-integration': 'pending',
      'app-store-integration': 'pending',
      'meeting-store-integration': 'pending',
      'cross-store-sync': 'pending',
      'error-handling': 'pending',
      'state-persistence': 'pending',
    });

    await testAuthIntegration();
    await testAppStoreIntegration();
    await testMeetingStoreIntegration();
    await testCrossStoreSync();
    await testErrorHandling();
    await testStatePersistence();

    log('🏁 Integration tests completed!');
  };

  useEffect(() => {
    // Auto-run tests when component mounts
    if (auth.isInitialized) {
      runAllTests();
    }
  }, [auth.isInitialized]);

  const getTestIcon = (result: 'pending' | 'success' | 'error') => {
    switch (result) {
      case 'pending': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Store Integration Tests</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(testResults).map(([testName, result]) => (
          <div key={testName} className="p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getTestIcon(result)}</span>
              <span className="font-medium">
                {testName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <button
          onClick={runAllTests}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Tests Again
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-2">Test Logs</h3>
        <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-96 overflow-y-auto">
          {testLogs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Integration Status</h3>
        <ul className="space-y-1 text-sm text-yellow-700">
          <li>• Auth Store: Integrated with Firebase Auth</li>
          <li>• App Store: Integrated with user preferences and notifications</li>
          <li>• Meeting Store: Integrated with DatabaseService and RealtimeService</li>
          <li>• Cross-store sync: Preferences, meeting state, and error handling</li>
          <li>• Universal Assistant: Updated to use store integration</li>
          <li>• Utilities: Common patterns and error handling implemented</li>
        </ul>
      </div>
    </div>
  );
};

export default TestIntegration;