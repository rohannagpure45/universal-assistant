'use client';

/**
 * ProductionErrorBoundary - Production-Ready Error Boundary System
 * 
 * Provides comprehensive error boundaries with graceful degradation,
 * automatic error reporting, and user-friendly error pages.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTracker } from '../../services/monitoring/ErrorTracker';
import logger from '../../services/logging/ProductionLogger';

interface ErrorBoundaryState {
  hasError: boolean;
  errorId?: string;
  errorMessage?: string;
  errorStack?: string;
  retryAttempts: number;
  showDetails: boolean;
  isRecovering: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  showRetry?: boolean;
  showDetails?: boolean;
  isolateErrors?: boolean;
  userId?: string;
}

export class ProductionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];
  private errorRecoveryListener?: () => void;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      retryAttempts: 0,
      showDetails: props.showDetails ?? false,
      isRecovering: false
    };

    // Set up error recovery listener
    this.setupErrorRecoveryListener();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { level = 'component', context = 'ErrorBoundary', onError, userId } = this.props;
    
    // Track the error with our error tracking system
    errorTracker.trackError(error, `${context}-${level}`, {
      componentStack: errorInfo.componentStack,
      userId,
      level,
      retryAttempts: this.state.retryAttempts
    }).then(errorId => {
      this.setState({ errorId });
    });

    // Log detailed error information
    logger.error(error.message, context, {
      error,
      metadata: {
        componentStack: errorInfo.componentStack,
        level,
        retryAttempts: this.state.retryAttempts,
        userId
      }
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Attempt automatic recovery for non-critical components
    if (level === 'component' && this.state.retryAttempts < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }
  }

  componentDidMount(): void {
    // Listen for global error recovery events
    this.setupErrorRecoveryListener();
  }

  componentWillUnmount(): void {
    // Clean up retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    
    // Remove error recovery listener
    if (this.errorRecoveryListener && typeof window !== 'undefined') {
      window.removeEventListener('error-recovery-refresh', this.errorRecoveryListener);
    }
  }

  private setupErrorRecoveryListener(): void {
    if (typeof window !== 'undefined') {
      this.errorRecoveryListener = () => {
        if (this.state.hasError) {
          this.handleRetry();
        }
      };
      
      window.addEventListener('error-recovery-refresh', this.errorRecoveryListener);
    }
  }

  private scheduleRetry(): void {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryAttempts), 10000); // Max 10 seconds
    
    const timeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
    
    this.retryTimeouts.push(timeout);
  }

  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryAttempts >= maxRetries) {
      logger.warn('Maximum retry attempts reached', 'ErrorBoundary', {
        metadata: { 
          maxRetries, 
          errorId: this.state.errorId,
          context: this.props.context 
        }
      });
      return;
    }

    this.setState({
      isRecovering: true
    });

    logger.info(`Attempting error boundary recovery (attempt ${this.state.retryAttempts + 1})`, 'ErrorBoundary', {
      metadata: { 
        errorId: this.state.errorId,
        context: this.props.context 
      }
    });

    // Simulate recovery process
    setTimeout(() => {
      this.setState({
        hasError: false,
        errorId: undefined,
        errorMessage: undefined,
        errorStack: undefined,
        retryAttempts: this.state.retryAttempts + 1,
        isRecovering: false
      });
    }, 1000);
  };

  private toggleDetails = (): void => {
    this.setState({ showDetails: !this.state.showDetails });
  };

  private renderErrorFallback(): ReactNode {
    const { level = 'component', context = 'Component', showRetry = true } = this.props;
    const { errorMessage, errorStack, errorId, showDetails, isRecovering, retryAttempts } = this.state;

    // Critical level errors get full-page treatment
    if (level === 'critical') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Application Error
              </h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We're sorry, but something went wrong. Our team has been notified and is working to fix this issue.
              </p>

              {errorId && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Error ID: <span className="font-mono">{errorId}</span>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {showRetry && retryAttempts < (this.props.maxRetries || 3) && (
                  <button
                    onClick={this.handleRetry}
                    disabled={isRecovering}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isRecovering ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Recovering...
                      </span>
                    ) : (
                      'Try Again'
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Page level errors get prominent treatment
    if (level === 'page') {
      return (
        <div className="flex flex-col items-center justify-center min-h-96 p-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-center max-w-md">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <svg
                className="h-6 w-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Page Error
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This page encountered an error. Please try refreshing or contact support if the problem persists.
            </p>

            {showRetry && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors"
                >
                  {isRecovering ? 'Recovering...' : 'Try Again'}
                </button>
                
                <button
                  onClick={this.toggleDetails}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-md font-medium transition-colors"
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Component level errors get minimal treatment
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <div className="ml-3 flex-1">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-400">
              {context} Error
            </h4>
            
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              This component encountered an error and couldn't render properly.
            </p>

            {showRetry && retryAttempts < (this.props.maxRetries || 3) && (
              <div className="mt-2">
                <button
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 disabled:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-800 dark:text-red-200 rounded font-medium transition-colors"
                >
                  {isRecovering ? 'Recovering...' : 'Retry'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError, showDetails, errorMessage, errorStack } = this.state;

    if (hasError) {
      // Use custom fallback if provided, otherwise use built-in error UI
      return (
        <div>
          {fallback || this.renderErrorFallback()}
          
          {showDetails && (errorMessage || errorStack) && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Error Details
              </h5>
              
              {errorMessage && (
                <div className="mb-2">
                  <strong className="text-xs text-gray-600 dark:text-gray-400">Message:</strong>
                  <pre className="text-xs text-red-600 dark:text-red-400 font-mono bg-white dark:bg-gray-900 p-2 rounded mt-1 overflow-auto">
                    {errorMessage}
                  </pre>
                </div>
              )}
              
              {errorStack && (
                <div>
                  <strong className="text-xs text-gray-600 dark:text-gray-400">Stack Trace:</strong>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-white dark:bg-gray-900 p-2 rounded mt-1 overflow-auto max-h-32">
                    {errorStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}

// Convenience wrapper components for different error boundary levels
export const CriticalErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ProductionErrorBoundary level="critical" {...props} />
);

export const PageErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ProductionErrorBoundary level="page" {...props} />
);

export const ComponentErrorBoundary: React.FC<Omit<ErrorBoundaryProps, 'level'>> = (props) => (
  <ProductionErrorBoundary level="component" {...props} />
);

export default ProductionErrorBoundary;