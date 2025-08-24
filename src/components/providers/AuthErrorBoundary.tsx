/**
 * Enhanced Authentication Error Boundary
 * Provides comprehensive error handling for authentication failures
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SecurityLogger } from '@/lib/security/monitoring';

interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface AuthErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryAttempts: number;
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryAttempts: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log authentication error with security monitoring
    this.logAuthenticationError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async logAuthenticationError(error: Error, errorInfo: ErrorInfo) {
    try {
      await SecurityLogger.error(
        'unknown', // clientIP
        null, // userId
        error,
        {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          component: 'AuthErrorBoundary',
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
          retryAttempts: this.state.retryAttempts,
          timestamp: new Date().toISOString()
        }
      );
    } catch (loggingError) {
      console.error('Failed to log authentication error:', loggingError);
    }
  }

  private handleRetry = () => {
    if (this.state.retryAttempts < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryAttempts: prevState.retryAttempts + 1
      }));

      // Log retry attempt
      SecurityLogger.suspiciousActivity(
        'unknown',
        null,
        {
          action: 'auth_error_boundary_retry',
          retryAttempt: this.state.retryAttempts + 1,
          maxRetries: this.maxRetries,
          originalError: this.state.error?.message
        }
      );
    }
  };

  private handleReload = () => {
    // Log page reload attempt
    SecurityLogger.suspiciousActivity(
      'unknown',
      null,
      {
        action: 'auth_error_boundary_reload',
        retryAttempts: this.state.retryAttempts,
        originalError: this.state.error?.message
      }
    );

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default authentication error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <div className="mx-auto h-12 w-12 text-red-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Authentication Error
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {this.isNetworkError(this.state.error) 
                  ? "Network connection issue detected. Please check your internet connection."
                  : "An authentication error occurred. This may be temporary."
                }
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {this.state.retryAttempts < this.maxRetries && (
                <div>
                  <button
                    onClick={this.handleRetry}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Retry ({this.state.retryAttempts + 1}/{this.maxRetries})
                  </button>
                </div>
              )}

              <div>
                <button
                  onClick={this.handleReload}
                  className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Reload Page
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Technical Details (Development Only)
                  </summary>
                  <div className="mt-2 p-4 bg-gray-100 rounded text-xs text-gray-700">
                    <p><strong>Error:</strong> {this.state.error?.message}</p>
                    <p><strong>Stack:</strong></p>
                    <pre className="whitespace-pre-wrap">{this.state.error?.stack}</pre>
                    {this.state.errorInfo && (
                      <>
                        <p><strong>Component Stack:</strong></p>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private isNetworkError(error: Error | null): boolean {
    if (!error) return false;
    
    const networkErrorMessages = [
      'network error',
      'fetch error', 
      'connection failed',
      'timeout',
      'network request failed'
    ];
    
    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }
}

/**
 * Hook for handling authentication errors in functional components
 */
export function useAuthErrorHandler() {
  const handleError = React.useCallback(async (error: Error, context?: Record<string, any>) => {
    try {
      await SecurityLogger.error(
        'unknown',
        null,
        error,
        {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          context: 'useAuthErrorHandler',
          ...context
        }
      );
    } catch (loggingError) {
      console.error('Failed to log authentication error:', loggingError);
    }
  }, []);

  return { handleError };
}

/**
 * Higher-order component for wrapping components with auth error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <AuthErrorBoundary fallback={fallback}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };
}