'use client';

import React, { ReactNode, useCallback } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { handleFirebaseError, reportFirebaseError, shouldTriggerReauth } from '@/utils/firebaseErrorHandler';
import { processCatchError } from '@/utils/errorMessages';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName: string;
  fallbackComponent?: ReactNode;
  enableRetry?: boolean;
  maxRetries?: number;
  className?: string;
}

/**
 * Page-level error boundary with Firebase-aware error handling
 * 
 * Provides a single error boundary per page that understands Firebase errors
 * and provides appropriate user feedback and recovery options.
 * 
 * Features:
 * - Builds on existing ErrorBoundary infrastructure
 * - Uses secure Firebase error handling (no internal code exposure)
 * - Automatic error reporting for monitoring
 * - Smart recovery suggestions based on error type
 */
export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({
  children,
  pageName,
  fallbackComponent,
  enableRetry = true,
  maxRetries = 2,
  className
}) => {
  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    // Use our secure Firebase error handling
    const userMessage = handleFirebaseError(error, `${pageName} page`);
    
    // Process error for additional context
    const processedError = processCatchError(error);
    
    // Report error securely (no sensitive info exposed)
    reportFirebaseError(processedError, `${pageName} page`);
    
    // Log with page context
    console.error(`${pageName} page error:`, {
      userMessage,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      pageName
    });
    
    // Check if this should trigger reauth flow
    if (shouldTriggerReauth(error)) {
      console.info('Firebase permission error detected - consider redirecting to auth');
      // Could trigger a global auth state update here
    }
  }, [pageName]);

  const handleRetry = useCallback(() => {
    // Optional: Clear any page-specific error state
    console.info(`Retrying ${pageName} page`);
    
    // Could trigger page-specific recovery actions here
    // For example: refresh user data, reconnect to services, etc.
  }, [pageName]);

  return (
    <ErrorBoundary
      severity="warning" // Use warning level for better UX
      componentName={`${pageName} Page`}
      onError={handleError}
      onRetry={handleRetry}
      enableRetry={enableRetry}
      maxRetries={maxRetries}
      fallback={fallbackComponent}
      className={className}
      isolate={true} // Prevent error from bubbling up to app level
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Higher-order component for wrapping pages with error boundaries
 * 
 * @param pageName - Name of the page for error context
 * @param options - Error boundary configuration options
 * 
 * @example
 * ```typescript
 * const MeetingPageWithErrorBoundary = withPageErrorBoundary('Meeting', {
 *   fallbackComponent: <MeetingErrorFallback />,
 *   enableRetry: true
 * })(MeetingPage);
 * ```
 */
export function withPageErrorBoundary(
  pageName: string,
  options: Omit<PageErrorBoundaryProps, 'children' | 'pageName'> = {}
) {
  return function<P extends object>(Component: React.ComponentType<P>) {
    const WrappedComponent = (props: P) => (
      <PageErrorBoundary pageName={pageName} {...options}>
        <Component {...props} />
      </PageErrorBoundary>
    );

    WrappedComponent.displayName = `withPageErrorBoundary(${pageName})(${Component.displayName || Component.name})`;
    
    return WrappedComponent;
  };
}

/**
 * Hook for manually triggering page error boundary
 * Useful for components that need to throw errors that should be caught by the page boundary
 */
export function usePageErrorBoundary() {
  return {
    captureError: (error: unknown, context?: string) => {
      // Process error using our secure handler
      const processedError = processCatchError(error);
      const userMessage = handleFirebaseError(error, context);
      
      // Create user-friendly error to throw
      const boundaryError = new Error(userMessage);
      boundaryError.name = 'PageBoundaryError';
      
      // This will be caught by the nearest error boundary
      throw boundaryError;
    },
    
    reportError: (error: unknown, context?: string) => {
      // Report error without throwing - for logging purposes
      const processedError = processCatchError(error);
      reportFirebaseError(processedError, context || 'Page component');
    }
  };
}

export default PageErrorBoundary;