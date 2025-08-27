'use client';

import React, { useEffect, useState } from 'react';

interface HydrationSafeProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * HydrationSafeProvider prevents hydration mismatches by ensuring 
 * client-side only rendering after hydration is complete
 */
export const HydrationSafeProvider: React.FC<HydrationSafeProviderProps> = ({
  children,
  fallback = null,
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Hook to check if component is mounted on client-side
 * Prevents hydration mismatches for browser-specific code
 */
export const useHasMounted = () => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
};

/**
 * Component that only renders children on client-side after hydration
 * Useful for components that use browser-only APIs
 */
export const ClientOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback = null,
}) => {
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};