'use client';

import React, { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function MeetingTestPage() {
  useEffect(() => {
    console.log('[MeetingTest] Component mounted!');
    
    const doAuth = async () => {
      try {
        if (!auth.currentUser) {
          console.log('[MeetingTest] No user, signing in anonymously...');
          const result = await signInAnonymously(auth);
          console.log('[MeetingTest] Signed in:', result.user.uid);
        } else {
          console.log('[MeetingTest] Already signed in:', auth.currentUser.uid);
        }
      } catch (error) {
        console.error('[MeetingTest] Auth error:', error);
      }
    };
    
    doAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Meeting Test Page</h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Anonymous Auth Test</h2>
          <p className="mb-4">This page tests anonymous authentication directly.</p>
          
          <button
            onClick={() => {
              if (auth.currentUser) {
                alert(`Signed in as: ${auth.currentUser.uid}`);
              } else {
                alert('Not signed in');
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check Auth Status
          </button>
          
          <button
            onClick={() => window.location.href = '/meeting'}
            className="ml-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Meeting Page
          </button>
        </div>
      </div>
    </div>
  );
}