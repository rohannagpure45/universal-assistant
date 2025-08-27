'use client';

import React, { useEffect, useState } from 'react';

interface ClientOnlyProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Provider that only renders children on the client side
 * Prevents all SSR hydration issues by forcing client-side only rendering
 */
export const ClientOnlyProvider: React.FC<ClientOnlyProviderProps> = ({ 
  children, 
  fallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading Universal Assistant...</p>
      </div>
    </div>
  )
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};