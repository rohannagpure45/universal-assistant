'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, Loader2, WifiOff, Shield } from 'lucide-react';

interface LoadingState {
  status: 'loading' | 'error' | 'degraded' | 'recovered';
  message: string;
  details?: string;
  canRetry: boolean;
  isOffline: boolean;
}

export function JavaScriptLoadingFallback() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: 'loading',
    message: 'Loading application resources...',
    canRetry: false,
    isOffline: false
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check online status
    const checkOnlineStatus = () => {
      setLoadingState(prev => ({
        ...prev,
        isOffline: !navigator.onLine
      }));
    };

    // Monitor JavaScript loading
    const checkJavaScriptHealth = async () => {
      try {
        // Simulate checking critical JS assets
        const criticalChecks = [
          { name: 'React Runtime', loaded: typeof (window as any).React !== 'undefined' },
          { name: 'Application Bundle', loaded: typeof (window as any).__NEXT_DATA__ !== 'undefined' },
          { name: 'Interactive Components', loaded: document.querySelectorAll('[data-interactive]').length > 0 }
        ];

        const loadedCount = criticalChecks.filter(c => c.loaded).length;
        const totalCount = criticalChecks.length;
        
        setProgress((loadedCount / totalCount) * 100);

        if (loadedCount === totalCount) {
          setLoadingState({
            status: 'recovered',
            message: 'Application fully loaded',
            canRetry: false,
            isOffline: false
          });
        } else if (loadedCount > 0) {
          setLoadingState({
            status: 'degraded',
            message: 'Limited functionality available',
            details: `${totalCount - loadedCount} components still loading`,
            canRetry: true,
            isOffline: !navigator.onLine
          });
        } else if (retryCount > 3) {
          setLoadingState({
            status: 'error',
            message: 'Unable to load application',
            details: 'Some features may not be available. You can still browse content.',
            canRetry: true,
            isOffline: !navigator.onLine
          });
        }
      } catch (error) {
        setLoadingState({
          status: 'error',
          message: 'Application loading failed',
          details: error instanceof Error ? error.message : 'Unknown error occurred',
          canRetry: true,
          isOffline: !navigator.onLine
        });
      }
    };

    // Set up monitoring
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
    
    const healthCheckInterval = setInterval(checkJavaScriptHealth, 2000);
    checkJavaScriptHealth();
    
    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
      clearInterval(healthCheckInterval);
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoadingState(prev => ({
      ...prev,
      status: 'loading',
      message: 'Retrying...'
    }));
    
    // Force reload of failed resources
    window.location.reload();
  };

  // Don't show for recovered state
  if (loadingState.status === 'recovered') {
    return null;
  }

  return (
    <>
      {/* Accessibility announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {loadingState.message}
      </div>

      {/* Visual loading indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-b from-amber-50 to-transparent pointer-events-none"
        role="alert"
        aria-label="Loading status"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {loadingState.status === 'loading' && (
                  <Loader2 className="h-5 w-5 text-amber-600 animate-spin" aria-hidden="true" />
                )}
                {loadingState.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
                )}
                {loadingState.status === 'degraded' && (
                  <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
                )}
                
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-900">
                    {loadingState.message}
                  </p>
                  {loadingState.details && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {loadingState.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 pointer-events-auto">
                {loadingState.isOffline && (
                  <div className="flex items-center text-xs text-gray-500">
                    <WifiOff className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span>Offline</span>
                  </div>
                )}
                
                {loadingState.canRetry && (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                    aria-label="Retry loading"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            {loadingState.status === 'loading' && (
              <div className="mt-2">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Degraded mode information panel */}
      {loadingState.status === 'degraded' && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border border-amber-200 p-4 z-[9998]">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900">
                Safe Browsing Mode Active
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                You can still browse and read content. Some interactive features are temporarily unavailable.
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" aria-hidden="true" />
                  <span className="text-gray-600">Content viewing available</span>
                </div>
                <div className="flex items-center text-xs">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" aria-hidden="true" />
                  <span className="text-gray-600">Navigation working</span>
                </div>
                <div className="flex items-center text-xs">
                  <AlertCircle className="h-3 w-3 text-amber-500 mr-1" aria-hidden="true" />
                  <span className="text-gray-600">Forms may require page refresh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}