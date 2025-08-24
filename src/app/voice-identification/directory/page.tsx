/**
 * Speaker Directory Page - Redirected to Admin
 * 
 * This page has been moved to admin-only access.
 * Redirects users to the appropriate location based on their permissions.
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isAdminUser } from '@/utils/adminUtils';
import { UnauthorizedAccess } from '@/components/ui/UnauthorizedAccess';

export default function SpeakerDirectoryRedirectPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (user && isAdminUser(user)) {
      // Redirect admin users to the new admin route
      router.replace('/admin/voice-identification/directory');
    }
  }, [user, isLoading, router]);

  // Show loading while checking user
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin h-12 w-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 rounded-full" />
            <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-400 rounded-full opacity-20" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized for non-admin users
  return (
    <UnauthorizedAccess
      title="Feature Moved to Admin Panel"
      message="The Speaker Directory has been moved to the admin panel. This feature requires administrator privileges to access."
    />
  );
}