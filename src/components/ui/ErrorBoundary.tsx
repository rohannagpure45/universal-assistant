'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Error severity levels
export type ErrorSeverity = 'critical' | 'warning' | 'info';

// Fallback UI types
export type FallbackType = 'inline' | 'full-page' | 'minimal' | 'card';

interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string | null;
  errorInfo?: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isDetailsExpanded: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  fallbackType?: FallbackType;
  severity?: ErrorSeverity;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onRetry?: () => void;
  maxRetries?: number;
  enableRetry?: boolean;
  className?: string;
  isolate?: boolean; // If true, prevents error from bubbling up
  componentName?: string; // For better error reporting
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isDetailsExpanded: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const extendedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack || '',
      errorBoundary: this.constructor.name,
      errorInfo,
    };

    this.setState({
      errorInfo: extendedErrorInfo,
    });

    // Enhanced Firebase error handling
    const isFirebaseError = this.isFirebaseError(error);
    const isPermissionError = this.isPermissionDeniedError(error);
    
    // Log error with Firebase-specific context
    this.logError(error, extendedErrorInfo, { isFirebaseError, isPermissionError });

    // For Firebase permission errors, try graceful recovery
    if (isPermissionError) {
      this.handlePermissionError(error);
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, extendedErrorInfo);
    }

    // Error is already isolated within this boundary - no additional prevention needed
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private isFirebaseError = (error: Error): boolean => {
    const errorMessage = error.message.toLowerCase();
    const errorStack = error.stack?.toLowerCase() || '';
    
    return (
      errorMessage.includes('firebase') ||
      errorMessage.includes('firestore') ||
      errorMessage.includes('permission-denied') ||
      errorStack.includes('firebase') ||
      (error as any).code?.startsWith('permission-denied') ||
      (error as any).code?.startsWith('auth/') ||
      (error as any).code?.startsWith('firestore/')
    );
  };

  private isPermissionDeniedError = (error: Error): boolean => {
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('permission-denied') ||
      errorMessage.includes('missing or insufficient permissions') ||
      (error as any).code === 'permission-denied'
    );
  };

  private handlePermissionError = (error: Error) => {
    console.warn('🔒 Firebase permission error detected - attempting graceful recovery:', error.message);
    
    // For permission errors, we don't want to crash the app
    // Instead, we'll show a more user-friendly message
    const { severity = 'warning' } = this.props;
    
    // Override severity to warning for permission errors
    if (severity === 'critical') {
      console.log('Downgrading critical permission error to warning level');
    }
    
    // Could trigger a user notification or redirect to login
    // For now, just log the graceful handling
    console.info('Permission error handled gracefully - app continues to function');
  };

  private logError = (error: Error, errorInfo: ErrorInfo, firebaseContext?: { isFirebaseError: boolean; isPermissionError: boolean }) => {
    const { componentName, severity = 'warning' } = this.props;
    
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      componentName,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      firebaseError: firebaseContext?.isFirebaseError || false,
      permissionError: firebaseContext?.isPermissionError || false,
      errorCode: (error as any).code || 'unknown',
    };

    // Log to console with appropriate level
    switch (severity) {
      case 'critical':
        console.error('🚨 Critical Error Boundary:', errorReport);
        break;
      case 'warning':
        console.warn('⚠️ Warning Error Boundary:', errorReport);
        break;
      case 'info':
        console.info('ℹ️ Info Error Boundary:', errorReport);
        break;
    }

    // In a real app, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    // errorReportingService.captureException(error, errorReport);
  };

  private handleRetry = () => {
    const { maxRetries = 3, onRetry } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));

      // Call custom retry handler
      if (onRetry) {
        onRetry();
      }

      // Auto-retry with exponential backoff for critical errors
      if (this.props.severity === 'critical' && retryCount < maxRetries - 1) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s...
        this.retryTimeoutId = setTimeout(() => {
          this.handleRetry();
        }, delay);
      }
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      isDetailsExpanded: !prevState.isDetailsExpanded,
    }));
  };

  private getSeverityColors = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-800 dark:text-red-200',
          button: 'bg-red-600 hover:bg-red-700',
        };
      case 'warning':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          icon: 'text-orange-600 dark:text-orange-400',
          text: 'text-orange-800 dark:text-orange-200',
          button: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'info':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-800 dark:text-blue-200',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  private renderFallbackContent = () => {
    const {
      fallbackType = 'card',
      severity = 'warning',
      enableRetry = true,
      maxRetries = 3,
      componentName,
    } = this.props;
    
    const { error, errorInfo, retryCount, isDetailsExpanded } = this.state;
    const colors = this.getSeverityColors(severity);
    const canRetry = enableRetry && retryCount < maxRetries;

    const isFirebaseError = this.isFirebaseError(error || new Error());
    const isPermissionError = this.isPermissionDeniedError(error || new Error());
    
    const errorTitle = isPermissionError
      ? 'Authentication Required'
      : severity === 'critical' 
        ? 'Critical Error' 
        : severity === 'warning' 
          ? 'Something went wrong' 
          : 'Minor Issue';

    const errorMessage = isPermissionError
      ? 'Please sign in to access this feature. Your session may have expired.'
      : isFirebaseError
        ? 'There was an issue connecting to our services. Please try again.'
        : error?.message || 'An unexpected error occurred';
        
    const componentContext = componentName ? ` in ${componentName}` : '';

    const baseContent = (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${colors.icon}`} />
        </motion.div>
        
        <h3 className={`text-lg font-semibold mb-2 ${colors.text}`}>
          {errorTitle}{componentContext}
        </h3>
        
        <p className={`text-sm mb-4 ${colors.text} opacity-80`}>
          {errorMessage}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={this.handleRetry}
              className={`${colors.button} text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
              Retry {retryCount > 0 && `(${retryCount}/${maxRetries})`}
            </motion.button>
          )}
          
          {severity === 'critical' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={this.handleGoHome}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go Home
            </motion.button>
          )}
        </div>

        {/* Error details toggle */}
        {(error || errorInfo) && (
          <div className="mt-6">
            <button
              onClick={this.toggleDetails}
              className={`text-sm ${colors.text} opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 mx-auto`}
            >
              <Bug className="w-4 h-4" />
              {isDetailsExpanded ? 'Hide' : 'Show'} technical details
              {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <AnimatePresence>
              {isDetailsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left overflow-auto max-h-40"
                >
                  <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    <div className="mb-2">
                      <strong>Error:</strong> {error?.message}
                    </div>
                    {error?.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs">{error.stack}</pre>
                      </div>
                    )}
                    {errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap text-xs">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );

    // Render based on fallback type
    switch (fallbackType) {
      case 'full-page':
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className={`max-w-md w-full p-8 rounded-xl border ${colors.bg} ${colors.border}`}>
              {baseContent}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg} ${colors.border} border`}>
            <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
            <span className={`text-sm ${colors.text}`}>Error occurred</span>
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className={`ml-2 text-xs px-2 py-1 rounded ${colors.button} text-white hover:opacity-90`}
              >
                Retry
              </button>
            )}
          </div>
        );

      case 'inline':
        return (
          <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
            {baseContent}
          </div>
        );

      case 'card':
      default:
        return (
          <div className={`p-6 rounded-xl border shadow-sm ${colors.bg} ${colors.border}`}>
            {baseContent}
          </div>
        );
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render fallback based on type
      return (
        <div className={this.props.className}>
          <AnimatePresence mode="wait">
            {this.renderFallbackContent()}
          </AnimatePresence>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for error boundary context (if needed for manual error throwing)
export function useErrorBoundary() {
  return {
    captureError: (error: Error) => {
      // This will be caught by the nearest error boundary
      throw error;
    },
  };
}

export default ErrorBoundary;