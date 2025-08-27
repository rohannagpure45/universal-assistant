'use client';

import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export default function FirebaseTestPage() {
  const [status, setStatus] = useState<string>('Initializing...');
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] ${message}`;
    console.log(log);
    setLogs(prev => [...prev, log]);
  };
  
  useEffect(() => {
    addLog('Starting Firebase initialization...');
    
    try {
      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      
      addLog('Firebase initialized successfully', 'success');
      
      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          addLog(`Auth state changed: User signed in (${user.uid})`, 'success');
          setStatus(`Authenticated (${user.isAnonymous ? 'Anonymous' : 'Regular'} User)`);
          setUser(user);
        } else {
          addLog('Auth state changed: User signed out');
          setStatus('Not authenticated');
          setUser(null);
        }
      });
      
      // Try to sign in automatically if not authenticated
      if (!auth.currentUser) {
        addLog('No current user, attempting anonymous sign in...');
        signInAnonymously(auth)
          .then(userCredential => {
            addLog(`Successfully signed in anonymously: ${userCredential.user.uid}`, 'success');
          })
          .catch(error => {
            addLog(`Sign in error: ${error.message}`, 'error');
            setStatus(`Error: ${error.message}`);
          });
      }
      
      return () => unsubscribe();
    } catch (error: any) {
      addLog(`Initialization error: ${error.message}`, 'error');
      setStatus(`Error: ${error.message}`);
    }
  }, []);
  
  const handleSignIn = async () => {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      
      addLog('Attempting manual sign in...');
      const userCredential = await signInAnonymously(auth);
      addLog(`Successfully signed in: ${userCredential.user.uid}`, 'success');
    } catch (error: any) {
      addLog(`Sign in error: ${error.message}`, 'error');
    }
  };
  
  const handleSignOut = async () => {
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth();
      
      addLog('Signing out...');
      await signOut(auth);
      addLog('Successfully signed out', 'success');
    } catch (error: any) {
      addLog(`Sign out error: ${error.message}`, 'error');
    }
  };
  
  const handleCheckAuth = async () => {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        alert(`Authenticated!
        
User ID: ${currentUser.uid}
Is Anonymous: ${currentUser.isAnonymous}
Created: ${currentUser.metadata.creationTime}`);
        addLog(`Current user: ${currentUser.uid}`, 'success');
      } else {
        alert('Not authenticated');
        addLog('No current user');
      }
    } catch (error: any) {
      addLog(`Check auth error: ${error.message}`, 'error');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Firebase Authentication Test (Bundled)
        </h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Authentication Status
          </h2>
          
          <div className={`p-4 rounded-lg mb-4 ${
            user ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' : 
            'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
          }`}>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Status: {status}
            </p>
            {user && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <p>User ID: {user.uid}</p>
                <p>Anonymous: {user.isAnonymous ? 'Yes' : 'No'}</p>
                <p>Created: {user.metadata.creationTime}</p>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Sign In Anonymously
            </button>
            
            <button
              onClick={handleCheckAuth}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Check Auth Status
            </button>
            
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Console Logs
          </h3>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg max-h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.includes('error') ? 'text-red-600 dark:text-red-400' :
                    log.includes('success') ? 'text-green-600 dark:text-green-400' :
                    'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}