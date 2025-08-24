'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Download, Upload, RefreshCw } from 'lucide-react';
import { LinearProgress, CircularProgress, LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

// Progress modal configuration types
export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  progress?: number;
  error?: string;
}

export interface ProgressModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  
  /** Title of the progress modal */
  title: string;
  
  /** Description/subtitle */
  description?: string;
  
  /** Array of progress steps */
  steps?: ProgressStep[];
  
  /** Overall progress percentage (0-100) */
  progress?: number;
  
  /** Whether progress is indeterminate */
  indeterminate?: boolean;
  
  /** Current step being processed */
  currentStep?: number;
  
  /** Whether the operation can be cancelled */
  canCancel?: boolean;
  
  /** Whether to show close button */
  canClose?: boolean;
  
  /** Whether the operation is complete */
  isComplete?: boolean;
  
  /** Whether there was an error */
  hasError?: boolean;
  
  /** Error message */
  errorMessage?: string;
  
  /** Success message */
  successMessage?: string;
  
  /** Icon to show in the modal */
  icon?: React.ComponentType<{ className?: string }>;
  
  /** Color theme */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  
  /** Callback when close is clicked */
  onClose?: () => void;
  
  /** Callback for retry (on error) */
  onRetry?: () => void;
  
  /** Custom action buttons */
  actions?: React.ReactNode;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Children content to render inside the modal */
  children?: React.ReactNode;
  
  /** Whether to prevent closing on backdrop click */
  preventBackdropClose?: boolean;
  
  /** Whether to show a manual continue button after completion */
  showContinueAfterCompletion?: boolean;
  
  /** Custom error recovery actions */
  errorRecoveryActions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  
  /** Focus management options */
  focusOptions?: {
    /** Element to focus when modal opens */
    initialFocus?: React.RefObject<HTMLElement> | (() => HTMLElement | null);
    /** Whether to trap focus within modal */
    trapFocus?: boolean;
  };
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const variantClasses = {
  default: {
    header: 'bg-primary-50 dark:bg-primary-900/20',
    icon: 'text-primary-600 dark:text-primary-400',
    progress: 'primary' as const,
  },
  success: {
    header: 'bg-success-50 dark:bg-success-900/20',
    icon: 'text-success-600 dark:text-success-400',
    progress: 'success' as const,
  },
  warning: {
    header: 'bg-warning-50 dark:bg-warning-900/20',
    icon: 'text-warning-600 dark:text-warning-400',
    progress: 'warning' as const,
  },
  danger: {
    header: 'bg-danger-50 dark:bg-danger-900/20',
    icon: 'text-danger-600 dark:text-danger-400',
    progress: 'danger' as const,
  },
};

/**
 * ProgressModal Component
 * 
 * A comprehensive progress modal for long-running operations with step tracking,
 * cancellation support, and error handling.
 */
export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  title,
  description,
  steps = [],
  progress = 0,
  indeterminate = false,
  currentStep,
  canCancel = true,
  canClose = false,
  isComplete = false,
  hasError = false,
  errorMessage,
  successMessage,
  icon: IconComponent,
  variant = 'default',
  className,
  onCancel,
  onClose,
  onRetry,
  actions,
  size = 'md',
  preventBackdropClose = false,
  showContinueAfterCompletion = true,
  errorRecoveryActions,
  focusOptions,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  
  const variantConfig = variantClasses[variant];
  
  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      // Focus initial element
      const getInitialFocus = () => {
        if (focusOptions?.initialFocus) {
          if (typeof focusOptions.initialFocus === 'function') {
            return focusOptions.initialFocus();
          }
          return focusOptions.initialFocus.current;
        }
        return initialFocusRef.current;
      };
      
      const timeoutId = setTimeout(() => {
        const element = getInitialFocus();
        if (element) {
          element.focus();
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, focusOptions]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !focusOptions?.trapFocus) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canClose) {
        e.preventDefault();
        handleClose();
        return;
      }
      
      if (e.key === 'Tab') {
        const modalElement = modalRef.current;
        if (!modalElement) return;
        
        const focusableElements = modalElement.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canClose, focusOptions?.trapFocus]);
  
  const handleClose = useCallback(() => {
    if (canClose && onClose) {
      setIsClosing(true);
      onClose();
    }
  }, [canClose, onClose]);

  const handleCancel = useCallback(() => {
    if (canCancel && onCancel) {
      onCancel();
    }
  }, [canCancel, onCancel]);

  const getStepIcon = (step: ProgressStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />;
      case 'running':
        return <LoadingSpinner size="sm" color="primary" inline />;
      case 'skipped':
        return <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 opacity-50" />;
      default:
        return (
          <div 
            className={cn(
              'w-5 h-5 rounded-full border-2',
              index <= (currentStep ?? -1)
                ? 'border-primary-600 dark:border-primary-400 bg-primary-100 dark:bg-primary-900/30'
                : 'border-neutral-300 dark:border-neutral-600'
            )}
          />
        );
    }
  };

  const getStepTextColor = (step: ProgressStep, index: number) => {
    switch (step.status) {
      case 'completed':
        return 'text-success-700 dark:text-success-300';
      case 'error':
        return 'text-danger-700 dark:text-danger-300';
      case 'running':
        return 'text-primary-700 dark:text-primary-300 font-medium';
      case 'skipped':
        return 'text-neutral-400 dark:text-neutral-500 line-through';
      default:
        return index <= (currentStep ?? -1)
          ? 'text-neutral-900 dark:text-neutral-100'
          : 'text-neutral-500 dark:text-neutral-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={canClose && !preventBackdropClose ? handleClose : undefined}
          />

          {/* Modal */}
          <motion.div
            className={cn(
              'relative w-full bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700',
              sizeClasses[size],
              className
            )}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            ref={modalRef}
            role="dialog"
            aria-labelledby="progress-modal-title"
            aria-describedby={description ? "progress-modal-description" : undefined}
            aria-modal="true"
          >
            {/* Header */}
            <div className={cn('flex items-center justify-between p-6 rounded-t-xl', variantConfig.header)}>
              <div className="flex items-center space-x-3">
                {IconComponent ? (
                  <IconComponent className={cn('w-6 h-6', variantConfig.icon)} />
                ) : hasError ? (
                  <AlertCircle className={cn('w-6 h-6', variantConfig.icon)} />
                ) : isComplete ? (
                  <CheckCircle className={cn('w-6 h-6', variantConfig.icon)} />
                ) : (
                  <LoadingSpinner size="md" color={variantConfig.progress} inline />
                )}
                <div>
                  <h3 
                    id="progress-modal-title"
                    className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {title}
                  </h3>
                  {description && (
                    <p 
                      id="progress-modal-description"
                      className="text-sm text-neutral-600 dark:text-neutral-400 mt-1"
                    >
                      {description}
                    </p>
                  )}
                </div>
              </div>
              
              {canClose && (
                <button
                  ref={initialFocusRef}
                  onClick={handleClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Overall Progress */}
              {!hasError && (
                <div className="space-y-3">
                  <LinearProgress
                    progress={progress}
                    indeterminate={indeterminate}
                    color={variantConfig.progress}
                    size="md"
                    showPercentage={!indeterminate}
                    label="Overall progress"
                  />
                  
                  {!indeterminate && (
                    <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                      <span>Progress</span>
                      <span>{Math.round(progress)}% complete</span>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message with Enhanced Recovery Options */}
              {hasError && errorMessage && (
                <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-danger-700 dark:text-danger-300">
                        Operation Failed
                      </h4>
                      <p className="text-sm text-danger-600 dark:text-danger-400 mt-1">
                        {errorMessage}
                      </p>
                      {errorRecoveryActions && errorRecoveryActions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {errorRecoveryActions.map((action, index) => (
                            <button
                              key={index}
                              onClick={action.action}
                              className={cn(
                                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-danger-50 dark:focus:ring-offset-danger-900/20',
                                action.variant === 'primary'
                                  ? 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500'
                                  : action.variant === 'danger'
                                  ? 'bg-danger-100 text-danger-700 hover:bg-danger-200 focus:ring-danger-500 dark:bg-danger-800/30 dark:text-danger-300 dark:hover:bg-danger-800/50'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-500 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
                              )}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {isComplete && successMessage && (
                <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-success-700 dark:text-success-300">
                        Operation Complete
                      </h4>
                      <p className="text-sm text-success-600 dark:text-success-400 mt-1">
                        {successMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps */}
              {steps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Progress Steps
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="mt-0.5">
                          {getStepIcon(step, index)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn('text-sm font-medium', getStepTextColor(step, index))}>
                            {step.label}
                          </div>
                          {step.description && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              {step.description}
                            </div>
                          )}
                          {step.error && (
                            <div className="text-xs text-danger-600 dark:text-danger-400 mt-1">
                              {step.error}
                            </div>
                          )}
                          {step.status === 'running' && step.progress !== undefined && (
                            <div className="mt-2">
                              <LinearProgress
                                progress={step.progress}
                                size="sm"
                                color="primary"
                                showPercentage={false}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Enhanced with Better UX */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
              {actions || (
                <>
                  {hasError && onRetry && (
                    <button
                      onClick={onRetry}
                      className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </button>
                  )}
                  
                  {canCancel && !isComplete && !hasError && (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
                    >
                      Cancel
                    </button>
                  )}
                  
                  {/* Manual Continue Button - Only shown when completion requires user action */}
                  {isComplete && showContinueAfterCompletion && (
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 text-sm font-medium text-white bg-success-600 hover:bg-success-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
                    >
                      Continue
                    </button>
                  )}
                  
                  {/* Error State - Always allow manual closure */}
                  {hasError && (
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
                    >
                      Close
                    </button>
                  )}
                  
                  {/* Close button for completed operations when auto-continue is disabled */}
                  {isComplete && !showContinueAfterCompletion && canClose && (
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-white bg-success-600 hover:bg-success-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800"
                    >
                      Done
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Specialized progress modals for common operations
export const ExportProgressModal: React.FC<Omit<ProgressModalProps, 'icon' | 'variant'>> = (props) => (
  <ProgressModal {...props} icon={Download} variant="default" />
);

export const ImportProgressModal: React.FC<Omit<ProgressModalProps, 'icon' | 'variant'>> = (props) => (
  <ProgressModal {...props} icon={Upload} variant="default" />
);

export const AnalyticsProgressModal: React.FC<Omit<ProgressModalProps, 'icon' | 'variant'>> = (props) => (
  <ProgressModal {...props} icon={RefreshCw} variant="default" />
);

// Hook for managing progress modal state
export const useProgressModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Partial<ProgressModalProps>>({});

  const openModal = useCallback((modalConfig: Partial<ProgressModalProps>) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Clear config after animation completes
    setTimeout(() => setConfig({}), 200);
  }, []);

  const updateProgress = useCallback((updates: Partial<ProgressModalProps>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    isOpen,
    config,
    openModal,
    closeModal,
    updateProgress,
    ProgressModal: (props: Partial<ProgressModalProps>) => (
      <ProgressModal
        title="Progress"
        {...config}
        {...props}
        isOpen={isOpen}
        onClose={closeModal}
      />
    ),
  };
};

export default ProgressModal;