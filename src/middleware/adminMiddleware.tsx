/**
 * Admin Route Protection Middleware
 * 
 * Provides client and server-side protection for admin-only routes.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isAdminUser } from '@/utils/adminUtils';
import { UnauthorizedAccess } from '@/components/ui/UnauthorizedAccess';

/**
 * HOC for protecting admin routes on the client side
 */
export function withAdminProtection<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function AdminProtectedComponent(props: T) {
    const { user, isLoading } = useAuth();
    const [showUnauthorized, setShowUnauthorized] = useState(false);

    useEffect(() => {
      // Don't check while still loading user data
      if (isLoading) return;

      // Show unauthorized page if user is not authenticated or not an admin
      if (!user || !isAdminUser(user)) {
        setShowUnauthorized(true);
        return;
      }

      setShowUnauthorized(false);
    }, [user, isLoading]);

    // Show loading while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin h-12 w-12 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 rounded-full" />
              <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-blue-400 rounded-full opacity-20" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Verifying admin access...</p>
          </div>
        </div>
      );
    }

    // Show unauthorized access page
    if (showUnauthorized) {
      return (
        <UnauthorizedAccess
          title="Admin Access Required"
          message="This resource requires administrator privileges. Only authorized users can access the speaker directory and voice library features."
        />
      );
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook for checking admin access in components
 */
export function useAdminAccess() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isAdmin = user ? isAdminUser(user) : false;

  const requireAdmin = () => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  };

  return {
    isAdmin,
    isLoading,
    user,
    requireAdmin
  };
}

/**
 * Server-side admin validation for API routes
 * Note: Moved to server-side utilities to avoid client-side Firebase Admin SDK issues
 */
export interface AdminValidationResult {
  isValid: boolean;
  user: any;
  error?: string;
}