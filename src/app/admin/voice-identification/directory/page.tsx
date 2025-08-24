/**
 * Admin Speaker Directory Page
 * 
 * Admin-only page for browsing and managing all identified speakers.
 * Requires admin privileges to access.
 */

'use client';

import React from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { SpeakerDirectoryView } from '@/components/voice-identification/SpeakerDirectoryView';
import { withAdminProtection } from '@/middleware/adminMiddleware';
import { Shield } from 'lucide-react';

function AdminSpeakerDirectoryPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                Admin Access
              </h2>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You are viewing the administrative speaker directory with full management capabilities.
              </p>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Speaker Directory
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Browse, search, and manage all identified speakers in your voice library
          </p>
        </div>

        {/* Directory Component */}
        <SpeakerDirectoryView />
      </div>
    </MainLayout>
  );
}

// Export the admin-protected component
export default withAdminProtection(AdminSpeakerDirectoryPage);