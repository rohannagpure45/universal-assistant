'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/client';
import { AuthService } from '@/services/firebase/AuthService';
import { featureFlagService } from '@/services/FeatureFlagService';
import { storagePathResolver } from '@/services/firebase/StoragePathResolver';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function TestHybridPage() {
  const [user, setUser] = useState<User | null>(null);
  const [flags, setFlags] = useState(featureFlagService.getFlags());
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    const flagsUnsubscribe = featureFlagService.subscribe(setFlags);
    
    return () => {
      unsubscribe();
      flagsUnsubscribe();
    };
  }, []);
  
  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toISOString()}: ${result}`]);
  };
  
  const testAnonymousAuth = async () => {
    try {
      const authService = AuthService.getInstance();
      const result = await authService.signInAnonymously();
      if (result.user) {
        addTestResult(`✅ Anonymous auth successful: ${result.user.uid}`);
        
        // Test migration status
        const status = await storagePathResolver.getUserMigrationStatus(result.user.uid);
        setMigrationStatus(status);
        addTestResult(`✅ Migration status retrieved: ${JSON.stringify(status)}`);
      } else {
        addTestResult(`❌ Anonymous auth failed: ${result.error?.message}`);
      }
    } catch (error: any) {
      addTestResult(`❌ Error: ${error.message}`);
    }
  };
  
  const testPathResolution = async () => {
    if (!user) {
      addTestResult('❌ Must be signed in to test path resolution');
      return;
    }
    
    try {
      // Test voice sample path
      const voicePath = await storagePathResolver.resolveVoiceSamplePath(
        'test-voice-id',
        'test-sample.webm',
        user.uid
      );
      addTestResult(`✅ Voice sample path: ${voicePath.path} (legacy: ${voicePath.isLegacy})`);
      
      // Test meeting recording path
      const meetingPath = await storagePathResolver.resolveMeetingRecordingPath(
        'test-meeting-id',
        'recording.webm',
        user.uid
      );
      addTestResult(`✅ Meeting path: ${meetingPath.path} (legacy: ${meetingPath.isLegacy})`);
      
      // Test upload path generation
      const uploadPath = await storagePathResolver.generateUploadPath(
        'voice-samples',
        'new-voice-id',
        'new-sample.webm',
        user.uid
      );
      addTestResult(`✅ Upload path: ${uploadPath}`);
    } catch (error: any) {
      addTestResult(`❌ Path resolution error: ${error.message}`);
    }
  };
  
  const signOut = async () => {
    try {
      const authService = AuthService.getInstance();
      await authService.signOut();
      addTestResult('✅ Signed out successfully');
      setMigrationStatus(null);
    } catch (error: any) {
      addTestResult(`❌ Sign out error: ${error.message}`);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Hybrid Security System Test
        </h1>
        
        {/* User Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Authentication Status
          </h2>
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Status:</strong> {user ? 'Authenticated' : 'Not authenticated'}
            </p>
            {user && (
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>UID:</strong> {user.uid}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Provider:</strong> {user.isAnonymous ? 'Anonymous' : user.providerId}
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> {user.email || 'N/A'}
                </p>
              </>
            )}
          </div>
        </div>
        
        {/* Feature Flags */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Feature Flags
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Anonymous Auth</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">
                {flags.enableAnonymousAuth ? '✅ Enabled' : '❌ Disabled'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">User Isolation</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">
                {flags.enableUserIsolation ? '✅ Enabled' : '❌ Disabled'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Legacy Fallback</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">
                {flags.enableLegacyPathFallback ? '✅ Enabled' : '❌ Disabled'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Migration Phase</p>
              <p className="font-mono text-gray-800 dark:text-gray-200">
                {flags.migrationPhase}
              </p>
            </div>
          </div>
        </div>
        
        {/* Migration Status */}
        {migrationStatus && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Migration Status
            </h2>
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Migration Enabled:</strong> {migrationStatus.migrationEnabled ? 'Yes' : 'No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Progress:</strong> {migrationStatus.migrationProgress}%
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Migrated Collections:</strong> {
                  migrationStatus.migratedCollections.length > 0 
                    ? migrationStatus.migratedCollections.join(', ')
                    : 'None'
                }
              </p>
            </div>
          </div>
        )}
        
        {/* Test Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Test Controls
          </h2>
          <div className="flex gap-4 flex-wrap">
            {!user && (
              <button
                onClick={testAnonymousAuth}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Anonymous Auth
              </button>
            )}
            {user && (
              <>
                <button
                  onClick={testPathResolution}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Test Path Resolution
                </button>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Test Results
          </h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No tests run yet</p>
            ) : (
              testResults.map((result, i) => (
                <pre key={i} className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {result}
                </pre>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}