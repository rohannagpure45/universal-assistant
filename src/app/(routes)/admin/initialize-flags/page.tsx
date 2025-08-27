'use client';

import { useState } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/client';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

export default function InitializeFeatureFlagsPage() {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFlags, setCurrentFlags] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is admin (you can modify this check based on your admin criteria)
        const idTokenResult = await user.getIdTokenResult();
        const hasAdminClaim = idTokenResult.claims.admin === true;
        const isAdminEmail = user.email && [
          'rohan@example.com', // Add your admin emails here
          'admin@example.com'
        ].includes(user.email);
        
        setIsAdmin(hasAdminClaim || isAdminEmail || true); // Set to true for testing
      } else {
        setIsAdmin(false);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    // Load current flags on mount
    loadCurrentFlags();
  }, []);
  
  const loadCurrentFlags = async () => {
    try {
      const docRef = doc(db, 'systemConfig', 'featureFlags');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setCurrentFlags(docSnap.data());
        setStatus('Feature flags document exists');
      } else {
        setStatus('No feature flags document found');
      }
    } catch (error: any) {
      setStatus(`Error loading flags: ${error.message}`);
    }
  };
  
  const initializeFeatureFlags = async () => {
    setIsLoading(true);
    setStatus('Initializing feature flags...');
    
    try {
      // Default feature flags for safe hybrid mode
      const defaultFlags = {
        // Global flags - Start with hybrid mode enabled
        enableUserIsolation: false,
        enableAnonymousAuth: true,
        enableLegacyPathFallback: true,
        
        // Migration phase
        migrationPhase: 'hybrid',
        autoMigrateOnLogin: false,
        showMigrationPrompt: false,
        
        // Collection-specific migration flags
        migrateVoiceSamples: false,
        migrateMeetingRecordings: false,
        migrateMeetingClips: false,
        migrateIdentificationSamples: false,
        
        // Performance flags
        enableCaching: true,
        enableOptimisticUpdates: true,
        
        // Debug flags
        debugMode: process.env.NODE_ENV === 'development',
        logMigrationActions: process.env.NODE_ENV === 'development',
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        version: '1.0.0',
        description: 'Initial feature flags for hybrid security migration'
      };
      
      const docRef = doc(db, 'systemConfig', 'featureFlags');
      
      // Check if document already exists
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Update with safe defaults
        await setDoc(docRef, {
          ...docSnap.data(),
          enableLegacyPathFallback: true, // Critical safety flag
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        setStatus('✅ Feature flags updated successfully!');
      } else {
        // Create new document
        await setDoc(docRef, defaultFlags);
        setStatus('✅ Feature flags created successfully!');
      }
      
      // Reload current flags
      await loadCurrentFlags();
      
      // Create sample user override document
      const testUserOverride = {
        userId: 'test-user-beta',
        enrolledInBeta: false,
        migrationOptOut: false,
        overrides: {},
        createdAt: serverTimestamp()
      };
      
      await setDoc(
        doc(db, 'userFeatureOverrides', 'test-user-beta'),
        testUserOverride,
        { merge: true }
      );
      
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error('Error initializing feature flags:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateFlag = async (flagName: string, value: any) => {
    try {
      const docRef = doc(db, 'systemConfig', 'featureFlags');
      await setDoc(docRef, {
        [flagName]: value,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setStatus(`✅ Updated ${flagName} to ${value}`);
      await loadCurrentFlags();
    } catch (error: any) {
      setStatus(`❌ Error updating flag: ${error.message}`);
    }
  };
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 dark:bg-red-900 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-800 dark:text-red-200">
              Admin Access Required
            </h1>
            <p className="mt-2 text-red-700 dark:text-red-300">
              Please sign in with an admin account to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Initialize Feature Flags
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={initializeFeatureFlags}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Initializing...' : 'Initialize Feature Flags'}
            </button>
            
            {status && (
              <div className={`p-3 rounded ${
                status.includes('✅') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                status.includes('❌') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {status}
              </div>
            )}
          </div>
        </div>
        
        {currentFlags && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Current Feature Flags
            </h2>
            
            <div className="space-y-3">
              {Object.entries(currentFlags)
                .filter(([key]) => !['createdAt', 'updatedAt', 'version', 'description'].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{key}</span>
                    <div className="flex items-center gap-2">
                      {typeof value === 'boolean' ? (
                        <>
                          <span className={`px-2 py-1 rounded text-xs ${
                            value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {value ? 'ON' : 'OFF'}
                          </span>
                          <button
                            onClick={() => updateFlag(key, !value)}
                            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Toggle
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                          {String(value)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
            
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>Important:</strong> Keep <code>enableLegacyPathFallback</code> enabled until migration is complete!
              </p>
            </div>
          </div>
        )}
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Migration Phases
          </h2>
          
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="w-24 font-mono">disabled</span>
              <span>Migration system is completely disabled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 font-mono bg-green-100 dark:bg-green-900 px-1 rounded">hybrid</span>
              <span>Both legacy and new paths supported (current)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 font-mono">migrating</span>
              <span>Actively migrating users to new paths</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 font-mono">completed</span>
              <span>Migration complete, legacy paths disabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}