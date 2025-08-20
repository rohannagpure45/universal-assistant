'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { MotionCard } from '@/components/ui/Motion';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Report to monitoring service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-900">
          <MotionCard
            className={cn(
              'max-w-lg w-full',
              'bg-white dark:bg-neutral-800',
              'rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700',
              'p-8 text-center'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-danger-100 dark:bg-danger-900/30 rounded-full">
                <AlertTriangle className="w-8 h-8 text-danger-600 dark:text-danger-400" />
              </div>
            </div>

            <h2 className="text-h2 text-neutral-900 dark:text-neutral-100 mb-4">
              Something went wrong
            </h2>

            <p className="text-body-base text-contrast-accessible mb-6">
              We apologize for the inconvenience. The dashboard encountered an unexpected error.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-body-sm font-medium text-contrast-medium mb-2">
                  Error Details (Development)
                </summary>
                <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-4 text-body-xs font-mono text-danger-600 dark:text-danger-400 overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap text-xs mt-1">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap text-xs mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <SecondaryButton
                onClick={this.handleRetry}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </SecondaryButton>
              
              <PrimaryButton
                onClick={this.handleReload}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Page
              </PrimaryButton>
            </div>

            <p className="text-body-xs text-contrast-accessible mt-6">
              If this problem persists, please contact support.
            </p>
          </MotionCard>
        </div>
      );
    }

    return this.props.children;
  }
}

// Type-safe Higher-order component for wrapping dashboard sections
export function withDashboardErrorBoundary<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  sectionName: string
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<any>>;

export function withDashboardErrorBoundary<P extends Record<string, any>>(
  Component: React.ComponentType<P>
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<any>>;

export function withDashboardErrorBoundary<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  sectionName: string = 'Dashboard Section'
): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<any>> {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <DashboardErrorBoundary
      fallback={
        <MotionCard className="p-6 border-2 border-dashed border-danger-200 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-900/20 rounded-xl">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-danger-600 dark:text-danger-400 mx-auto mb-3" />
            <h3 className="text-h4 text-danger-900 dark:text-danger-100 mb-2">
              {sectionName} Error
            </h3>
            <p className="text-body-sm text-danger-700 dark:text-danger-300 mb-4">
              This section encountered an error and couldn't load properly.
            </p>
            <SecondaryButton
              size="sm"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Reload Page
            </SecondaryButton>
          </div>
        </MotionCard>
      }
    >
      <Component {...(props as P)} ref={ref} />
    </DashboardErrorBoundary>
  ));

  WrappedComponent.displayName = `withDashboardErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}