'use client';

import React from 'react';

interface RootErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

interface RootErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Root-level error boundary to catch and handle application errors
 * Provides recovery mechanisms and error reporting
 */
export class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    // Generate unique error ID for tracking
    const errorId = Math.random().toString(36).substring(2, 9);
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    const errorContext = {
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      componentStack: errorInfo.componentStack,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    };

    // Log to console
    console.error('Root Error Boundary caught an error:', errorContext);
    
    // In production, this would send to an error monitoring service
    // Example: sendToErrorMonitoring(errorContext);
  }

  handleRetry = () => {
    this.retryCount++;
    if (this.retryCount >= this.maxRetries) {
      // After max retries, force reload
      this.handleReload();
    } else {
      // Try to recover by resetting error state
      this.setState({ hasError: false, error: undefined, errorId: undefined });
    }
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div style={{ 
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            padding: '32px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px',
              color: '#111827'
            }}>
              Something went wrong
            </h1>
            
            <p style={{
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.5'
            }}>
              {this.retryCount > 0 
                ? `We've tried ${this.retryCount} time${this.retryCount > 1 ? 's' : ''} to recover. ${this.retryCount >= this.maxRetries - 1 ? 'One more attempt before reloading.' : 'Let\'s try again.'}`
                : 'An unexpected error occurred. You can try to recover or reload the page.'}
            </p>

            {this.state.errorId && (
              <p style={{
                fontSize: '12px',
                color: '#9ca3af',
                marginBottom: '20px'
              }}>
                Error ID: {this.state.errorId}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={this.handleRetry}
                style={{ 
                  padding: '10px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {this.retryCount >= this.maxRetries - 1 ? 'Final Retry' : 'Try Again'}
              </button>
              
              <button 
                onClick={this.handleReload}
                style={{ 
                  padding: '10px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Reload Page
              </button>
            </div>

            {isDevelopment && this.state.error && (
              <details style={{ marginTop: '24px', textAlign: 'left' }}>
                <summary style={{ 
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '8px'
                }}>
                  Error details (development only)
                </summary>
                <pre style={{
                  backgroundColor: '#f3f4f6',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  lineHeight: '1.4'
                }}>
                  {this.state.error.name}: {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}