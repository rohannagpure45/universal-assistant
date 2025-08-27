'use client';

import React, { useState, useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import MeetingPageContent from './page';

export default function ClientMeetingPage() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simple anonymous sign in
    const doAuth = async () => {
      try {
        console.log('[ClientMeetingPage] Attempting anonymous sign in...');
        const result = await signInAnonymously(auth);
        console.log('[ClientMeetingPage] Signed in as:', result.user.uid);
        setIsReady(true);
      } catch (err) {
        console.error('[ClientMeetingPage] Auth error:', err);
        setError(err instanceof Error ? err.message : 'Auth failed');
        // Still allow access for testing
        setIsReady(true);
      }
    };

    // Check if already signed in
    if (auth.currentUser) {
      console.log('[ClientMeetingPage] Already signed in as:', auth.currentUser.uid);
      setIsReady(true);
    } else {
      doAuth();
    }
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Setting up...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">Auth Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render the original meeting page once authenticated
  return <MeetingPageContent />;
}