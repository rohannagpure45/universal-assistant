/**
 * Unauthorized Access Component
 * 
 * Displays error message when users attempt to access admin-only features.
 */

'use client';

import React from 'react';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UnauthorizedAccessProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export const UnauthorizedAccess: React.FC<UnauthorizedAccessProps> = ({
  title = 'Access Denied',
  message = 'You do not have permission to access this resource. Admin privileges are required.',
  showBackButton = true,
  showHomeButton = true,
}) => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h1>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <button
                onClick={handleGoBack}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
            )}

            {showHomeButton && (
              <button
                onClick={handleGoHome}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </button>
            )}
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            If you believe you should have access to this resource, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for showing unauthorized access errors
 */
export function useUnauthorizedError() {
  const router = useRouter();

  const showUnauthorizedError = () => {
    router.push('/dashboard');
  };

  return { showUnauthorizedError };
}