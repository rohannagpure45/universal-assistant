'use client';

import React, { useEffect, useState } from 'react';

export default function AuthTestPage() {
  const [authStatus, setAuthStatus] = useState<string>('Checking...');
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    // Direct Firebase initialization to avoid module issues
    const initAuth = async () => {
      try {
        // Dynamic import to ensure client-side only
        const { initializeApp } = await import('firebase/app');
        const { getAuth, signInAnonymously } = await import('firebase/auth');
        
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        // Check current auth state
        if (auth.currentUser) {
          setAuthStatus('Already authenticated');
          setUserId(auth.currentUser.uid);
        } else {
          setAuthStatus('Not authenticated, signing in anonymously...');
          
          // Sign in anonymously
          const userCredential = await signInAnonymously(auth);
          setAuthStatus('Successfully authenticated (anonymous)');
          setUserId(userCredential.user.uid);
        }
      } catch (error: any) {
        setAuthStatus(`Error: ${error.message}`);
        console.error('Auth initialization error:', error);
      }
    };
    
    initAuth();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Simple Auth Test</h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Firebase Anonymous Auth Test</h2>
          
          <div className="space-y-2 mb-6">
            <p className="text-lg">
              <span className="font-medium">Status:</span> {authStatus}
            </p>
            {userId && (
              <p className="text-lg">
                <span className="font-medium">User ID:</span> {userId}
              </p>
            )}
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
            
            <button
              onClick={() => window.location.href = '/meeting'}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Go to Meeting Page
            </button>
            
            <button
              onClick={async () => {
                const { getAuth } = await import('firebase/auth');
                const { initializeApp } = await import('firebase/app');
                
                const firebaseConfig = {
                  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
                };
                
                const app = initializeApp(firebaseConfig);
                const auth = getAuth(app);
                
                if (auth.currentUser) {
                  alert(`Authenticated as: ${auth.currentUser.uid}\nIs Anonymous: ${auth.currentUser.isAnonymous}`);
                } else {
                  alert('Not authenticated');
                }
              }}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Check Auth (Alert)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}