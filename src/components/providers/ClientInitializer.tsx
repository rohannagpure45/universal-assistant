'use client';

import React from 'react';
import { useHydrationSafeInit } from '@/hooks/useClientEffects';

interface ClientInitializerProps {
  children: React.ReactNode;
}

/**
 * Component that initializes client-side features after hydration
 * Prevents hydration mismatches by delaying browser API access
 */
export const ClientInitializer: React.FC<ClientInitializerProps> = ({ children }) => {
  useHydrationSafeInit();

  return <>{children}</>;
};