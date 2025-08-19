'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Download, 
  FileText, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  X,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { ProgressModal, ProgressStep, useProgressModal } from './ProgressModal';
import { LinearProgress, CircularProgress } from './LoadingSpinner';
import { Button } from './Button';
import { cn } from '@/lib/utils';

// File operation types
export type FileOperationType = 'upload' | 'download' | 'import' | 'export' | 'process';

// File progress data
export interface FileProgressData {
  fileName: string;
  fileSize: number;
  processedBytes: number;
  progress: number;
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  status: 'pending' | 'processing' | 'completed' | 'error' | 'paused' | 'cancelled';
  error?: string;
}

// File operation configuration
export interface FileOperationConfig {
  operation: FileOperationType;
  title: string;
  description?: string;
  files: FileProgressData[];
  allowCancel?: boolean;
  allowPause?: boolean;
  allowRetry?: boolean;
  maxConcurrent?: number;
  chunkSize?: number;
}

interface FileProgressModalProps {
  isOpen: boolean;
  config: FileOperationConfig;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onClose?: () => void;
  onComplete?: (results: FileProgressData[]) => void;
}

/**
 * FileProgressModal Component
 * 
 * A specialized progress modal for file operations with support for:
 * - Multiple file processing
 * - Pause/resume functionality
 * - Speed and time estimates
 * - Cancellation and retry
 * - Visual progress indicators
 */
export const FileProgressModal: React.FC<FileProgressModalProps> = ({
  isOpen,
  config,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onClose,
  onComplete,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Calculate overall progress
  const overallProgress = config.files.length > 0 
    ? config.files.reduce((sum, file) => sum + file.progress, 0) / config.files.length 
    : 0;

  const completedFiles = config.files.filter(f => f.status === 'completed').length;
  const errorFiles = config.files.filter(f => f.status === 'error').length;
  const processingFiles = config.files.filter(f => f.status === 'processing').length;
  const isComplete = completedFiles === config.files.length;
  const hasErrors = errorFiles > 0;

  // Calculate total speed and time remaining
  const totalSpeed = config.files
    .filter(f => f.status === 'processing' && f.speed)
    .reduce((sum, f) => sum + (f.speed || 0), 0);

  const avgTimeRemaining = config.files
    .filter(f => f.status === 'processing' && f.estimatedTimeRemaining)
    .reduce((sum, f, _, arr) => sum + (f.estimatedTimeRemaining || 0) / arr.length, 0);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const getOperationIcon = () => {
    switch (config.operation) {
      case 'upload': return Upload;
      case 'download': return Download;
      case 'import': return Database;
      case 'export': return FileText;
      default: return FileText;
    }
  };

  const getStatusIcon = (status: FileProgressData['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      case 'paused': return Pause;
      default: return null;
    }
  };

  const getStatusColor = (status: FileProgressData['status']) => {
    switch (status) {
      case 'completed': return 'text-success-600 dark:text-success-400';
      case 'error': return 'text-danger-600 dark:text-danger-400';
      case 'paused': return 'text-warning-600 dark:text-warning-400';
      case 'processing': return 'text-primary-600 dark:text-primary-400';
      default: return 'text-neutral-500 dark:text-neutral-400';
    }
  };

  const handleCancel = useCallback(() => {
    if (onCancel) {
      setIsCancelling(true);
      onCancel();
    }
  }, [onCancel]);

  const handlePauseResume = useCallback(() => {
    if (isPaused && onResume) {
      onResume();
      setIsPaused(false);
    } else if (!isPaused && onPause) {
      onPause();
      setIsPaused(true);
    }
  }, [isPaused, onPause, onResume]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Auto-complete callback
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete(config.files);
    }
  }, [isComplete, onComplete, config.files]);

  const IconComponent = getOperationIcon();

  return (
    <ProgressModal
      isOpen={isOpen}
      title={config.title}
      description={config.description}
      progress={overallProgress}
      isComplete={isComplete}
      hasError={hasErrors}
      canCancel={config.allowCancel && !isComplete}
      canClose={isComplete || hasErrors}
      icon={IconComponent}
      variant={hasErrors ? 'danger' : isComplete ? 'success' : 'default'}
      size="xl"
      onCancel={handleCancel}
      onClose={handleClose}
      onRetry={hasErrors ? handleRetry : undefined}
      actions={
        <div className="flex items-center space-x-3">
          {/* Pause/Resume Button */}
          {config.allowPause && !isComplete && !hasErrors && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePauseResume}
              disabled={isCancelling}
              leftIcon={isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            >
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
          )}

          {/* Retry Button */}
          {hasErrors && config.allowRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Retry Failed
            </Button>
          )}

          {/* Cancel Button */}
          {config.allowCancel && !isComplete && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              loading={isCancelling}
              disabled={isCancelling}
              leftIcon={!isCancelling ? <X className="w-4 h-4" /> : undefined}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}

          {/* Close Button */}
          {(isComplete || hasErrors) && (
            <Button
              variant={hasErrors ? 'danger' : 'success'}
              size="sm"
              onClick={handleClose}
            >
              {hasErrors ? 'Close' : 'Done'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Overall Progress Summary */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <CircularProgress
                progress={overallProgress}
                size={40}
                strokeWidth={3}
                color="primary"
                showPercentage
              />
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                  Overall Progress
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {completedFiles} of {config.files.length} files
                  {hasErrors && ` (${errorFiles} failed)`}
                </p>
              </div>
            </div>
            
            {/* Speed and Time Info */}
            {processingFiles > 0 && (
              <div className="text-right text-sm text-neutral-600 dark:text-neutral-400">
                {totalSpeed > 0 && (
                  <div>Speed: {formatSpeed(totalSpeed)}</div>
                )}
                {avgTimeRemaining > 0 && (
                  <div>Est. {formatTime(avgTimeRemaining)} remaining</div>
                )}
              </div>
            )}
          </div>
          
          <LinearProgress
            progress={overallProgress}
            size="lg"
            color="primary"
            showPercentage={false}
          />
        </div>

        {/* Individual File Progress */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
            File Progress
          </h4>
          
          {config.files.map((file, index) => {
            const StatusIcon = getStatusIcon(file.status);
            
            return (
              <motion.div
                key={index}
                className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {StatusIcon && (
                      <StatusIcon className={cn('w-4 h-4 flex-shrink-0', getStatusColor(file.status))} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatBytes(file.processedBytes)} / {formatBytes(file.fileSize)}
                        {file.speed && ` • ${formatSpeed(file.speed)}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right ml-3">
                    <span className={cn('text-sm font-medium', getStatusColor(file.status))}>
                      {file.status === 'completed' ? 'Complete' :
                       file.status === 'error' ? 'Error' :
                       file.status === 'paused' ? 'Paused' :
                       file.status === 'processing' ? `${Math.round(file.progress)}%` :
                       'Pending'}
                    </span>
                    {file.estimatedTimeRemaining && file.status === 'processing' && (
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatTime(file.estimatedTimeRemaining)} left
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar */}
                {file.status !== 'pending' && (
                  <LinearProgress
                    progress={file.progress}
                    size="sm"
                    color={
                      file.status === 'completed' ? 'success' :
                      file.status === 'error' ? 'danger' :
                      file.status === 'paused' ? 'warning' :
                      'primary'
                    }
                    showPercentage={false}
                  />
                )}
                
                {/* Error Message */}
                {file.error && (
                  <div className="mt-2 p-2 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded text-sm text-danger-700 dark:text-danger-400">
                    {file.error}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </ProgressModal>
  );
};

// Hook for managing file operations
export const useFileProgress = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<FileOperationConfig | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const startOperation = useCallback((operationConfig: FileOperationConfig) => {
    setConfig(operationConfig);
    setIsOpen(true);
    setIsPaused(false);
  }, []);

  const updateFileProgress = useCallback((fileName: string, updates: Partial<FileProgressData>) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map(file => 
          file.fileName === fileName ? { ...file, ...updates } : file
        )
      };
    });
  }, []);

  const updateAllFiles = useCallback((updates: Partial<FileProgressData>) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map(file => ({ ...file, ...updates }))
      };
    });
  }, []);

  const pauseOperation = useCallback(() => {
    setIsPaused(true);
    updateAllFiles({ status: 'paused' });
  }, [updateAllFiles]);

  const resumeOperation = useCallback(() => {
    setIsPaused(false);
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map(file => 
          file.status === 'paused' ? { ...file, status: 'processing' } : file
        )
      };
    });
  }, []);

  const cancelOperation = useCallback(() => {
    updateAllFiles({ status: 'cancelled' });
    setTimeout(() => {
      setIsOpen(false);
      setConfig(null);
    }, 1000);
  }, [updateAllFiles]);

  const retryOperation = useCallback(() => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map(file => 
          file.status === 'error' ? { 
            ...file, 
            status: 'pending', 
            progress: 0, 
            processedBytes: 0,
            error: undefined 
          } : file
        )
      };
    });
  }, []);

  const closeOperation = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
    setIsPaused(false);
  }, []);

  return {
    isOpen,
    config,
    isPaused,
    startOperation,
    updateFileProgress,
    updateAllFiles,
    pauseOperation,
    resumeOperation,
    cancelOperation,
    retryOperation,
    closeOperation,
    FileProgressModal: config ? (
      <FileProgressModal
        isOpen={isOpen}
        config={config}
        onPause={pauseOperation}
        onResume={resumeOperation}
        onCancel={cancelOperation}
        onRetry={retryOperation}
        onClose={closeOperation}
      />
    ) : null,
  };
};

export default FileProgressModal;