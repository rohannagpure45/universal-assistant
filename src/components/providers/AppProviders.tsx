'use client';

import React, { Suspense } from 'react';
import { RootErrorBoundary } from './RootErrorBoundary';
import { ThemeProvider } from './ThemeProvider';
import { StoreProviders } from './StoreProviders';
import { AuthProvider } from './AuthProvider';
import { ClientInitializer } from './ClientInitializer';
import { ServicesProvider } from '@/contexts/ServicesContext';

/**
 * Foundational App Providers Component
 * 
 * Architecture Principles:
 * - Single Responsibility: Composes all app-level providers
 * - Open/Closed: Easy to add new providers without modification
 * - Dependency Inversion: Each provider is independently replaceable
 * - Performance: Optimized loading and error boundaries
 * 
 * Provider Order (outer to inner):
 * 1. RootErrorBoundary - Catches all unhandled errors
 * 2. ThemeProvider - Manages app-wide theming
 * 3. StoreProviders - Zustand store context
 * 4. AuthProvider - Handles authentication state
 * 5. ClientInitializer - Manages client-side hydration
 * 
 * This order ensures:
 * - Errors are caught at the highest level
 * - Theme is available throughout the app
 * - Stores are initialized before auth
 * - Auth state is managed after stores
 * - Client initialization happens last
 */

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Loading Fallback Component
 * 
 * Shown during initial app loading to prevent hydration mismatches
 */
const InternalAppLoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        Initializing Universal Assistant...
      </p>
    </div>
  </div>
);

/**
 * Error Fallback Component
 * 
 * Shown when critical provider initialization fails
 */
const InternalAppErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20">
    <div className="text-center max-w-md p-6">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
        Application Error
      </h2>
      <p className="text-red-700 dark:text-red-300 text-sm mb-4">
        Something went wrong during initialization. Please refresh the page.
      </p>
      {error && process.env.NODE_ENV === 'development' && (
        <details className="text-left text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded">
          <summary className="cursor-pointer font-medium">Error Details (Development)</summary>
          <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
        </details>
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        type="button"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

/**
 * Main AppProviders Component
 * 
 * Provides a solid foundation with proper error boundaries,
 * loading states, and provider composition.
 */
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <RootErrorBoundary>
      <Suspense fallback={<InternalAppLoadingFallback />}>
        <ThemeProvider defaultTheme="system">
          <StoreProviders>
            <AuthProvider>
              <ServicesProvider>
                <ClientInitializer>
                  {children}
                </ClientInitializer>
              </ServicesProvider>
            </AuthProvider>
          </StoreProviders>
        </ThemeProvider>
      </Suspense>
    </RootErrorBoundary>
  );
};

/**
 * Export for testing and storybook
 */
export { InternalAppLoadingFallback as AppLoadingFallback, InternalAppErrorFallback as AppErrorFallback };