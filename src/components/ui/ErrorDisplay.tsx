/**
 * Enhanced Error Display Component
 * 
 * Provides consistent, accessible error messaging throughout the application
 * with user-friendly messages, action hints, and retry functionality.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, X, Info } from 'lucide-react';
import { Card } from './card';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import type { ErrorDisplayProps, UserError } from '@/utils/errorMessages';

/**
 * Enhanced error display with user-friendly messaging
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showActionHint = true,
  className
}) => {
  // Handle both UserError objects and string errors
  const userError: UserError = typeof error === 'string' 
    ? {
        userMessage: error,
        category: 'system',
        actionHint: 'Please try again or contact support if the problem persists.'
      }
    : error;

  const getErrorStyle = (category: UserError['category']) => {
    switch (category) {
      case 'permission':
        return {
          container: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20',
          icon: 'text-blue-600 dark:text-blue-400',
          text: 'text-blue-800 dark:text-blue-200',
          hint: 'text-blue-700 dark:text-blue-300'
        };
      case 'network':
        return {
          container: 'border-orange-200 bg-orange-50 dark:bg-orange-900/20',
          icon: 'text-orange-600 dark:text-orange-400',
          text: 'text-orange-800 dark:text-orange-200',
          hint: 'text-orange-700 dark:text-orange-300'
        };
      case 'audio':
        return {
          container: 'border-purple-200 bg-purple-50 dark:bg-purple-900/20',
          icon: 'text-purple-600 dark:text-purple-400',
          text: 'text-purple-800 dark:text-purple-200',
          hint: 'text-purple-700 dark:text-purple-300'
        };
      case 'validation':
        return {
          container: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20',
          icon: 'text-yellow-600 dark:text-yellow-400',
          text: 'text-yellow-800 dark:text-yellow-200',
          hint: 'text-yellow-700 dark:text-yellow-300'
        };
      default:
        return {
          container: 'border-red-200 bg-red-50 dark:bg-red-900/20',
          icon: 'text-red-600 dark:text-red-400',
          text: 'text-red-800 dark:text-red-200',
          hint: 'text-red-700 dark:text-red-300'
        };
    }
  };

  const style = getErrorStyle(userError.category);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Card className={cn(
          'relative border-l-4 shadow-sm',
          style.container,
          className
        )}>
          {/* Dismiss button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}

          <div className="p-4">
            <div className="flex items-start space-x-3">
              {/* Error icon */}
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className={cn('h-5 w-5', style.icon)} aria-hidden="true" />
              </div>

              {/* Error content */}
              <div className="flex-1 min-w-0">
                {/* Main error message */}
                <p className={cn('text-sm font-medium leading-5', style.text)}>
                  {userError.userMessage}
                </p>

                {/* Action hint */}
                {showActionHint && userError.actionHint && (
                  <div className="mt-2 flex items-start space-x-2">
                    <Info className={cn('h-4 w-4 mt-0.5 flex-shrink-0', style.hint)} aria-hidden="true" />
                    <p className={cn('text-sm', style.hint)}>
                      {userError.actionHint}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                {onRetry && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onRetry}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Simple inline error display for forms and smaller components
 */
export const InlineError: React.FC<{
  message: string;
  className?: string;
}> = ({ message, className }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: 'auto' }}
    exit={{ opacity: 0, height: 0 }}
    className={cn('flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-1', className)}
  >
    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
    <span>{message}</span>
  </motion.div>
);

/**
 * Error boundary fallback component
 */
export const ErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
}> = ({ error, resetError }) => (
  <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20 text-center">
    <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
    <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
      Something went wrong
    </h2>
    <p className="text-red-700 dark:text-red-300 mb-4">
      We're sorry, but something unexpected happened. Please try again.
    </p>
    <div className="space-x-3">
      <Button onClick={resetError} size="sm">
        Try Again
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </Button>
    </div>
    
    {/* Technical details (hidden by default, shown in dev) */}
    {process.env.NODE_ENV === 'development' && (
      <details className="mt-4 text-left">
        <summary className="text-sm text-red-600 cursor-pointer">
          Technical Details (Development Only)
        </summary>
        <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-auto text-red-800 dark:text-red-300">
          {error.message}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      </details>
    )}
  </Card>
);

export default ErrorDisplay;