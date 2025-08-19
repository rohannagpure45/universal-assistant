'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LoadingSpinner, LinearProgress, CircularProgress } from './LoadingSpinner';
import { ProgressModal } from './ProgressModal';
import { cn } from '@/lib/utils';

// Screen reader announcements for progress updates
export const useProgressAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const announce = (message: string) => {
    setAnnouncements(prev => [...prev, message]);
    // Auto-clear after a delay
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 1000);
  };

  return { announcements, announce };
};

// Live region for screen reader announcements
interface ProgressAnnouncerProps {
  announcements: string[];
  className?: string;
}

export const ProgressAnnouncer: React.FC<ProgressAnnouncerProps> = ({ 
  announcements, 
  className 
}) => (
  <div
    className={cn('sr-only', className)}
    aria-live="polite"
    aria-atomic="true"
    role="status"
  >
    {announcements.map((message, index) => (
      <div key={index}>{message}</div>
    ))}
  </div>
);

// Enhanced accessible linear progress
interface AccessibleLinearProgressProps {
  progress: number;
  label: string;
  description?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
  onProgressChange?: (progress: number) => void;
  announceOnMilestones?: boolean;
  milestones?: number[]; // Array of percentages to announce at
}

export const AccessibleLinearProgress: React.FC<AccessibleLinearProgressProps> = ({
  progress,
  label,
  description,
  showPercentage = true,
  size = 'md',
  color = 'primary',
  className,
  onProgressChange,
  announceOnMilestones = true,
  milestones = [25, 50, 75, 100]
}) => {
  const { announce } = useProgressAnnouncements();
  const [lastAnnouncedMilestone, setLastAnnouncedMilestone] = useState<number>(-1);

  // Announce progress milestones
  useEffect(() => {
    if (announceOnMilestones) {
      const nextMilestone = milestones.find(m => 
        progress >= m && m > lastAnnouncedMilestone
      );
      
      if (nextMilestone !== undefined) {
        announce(`${label}: ${nextMilestone}% complete`);
        setLastAnnouncedMilestone(nextMilestone);
      }
    }
  }, [progress, milestones, lastAnnouncedMilestone, announceOnMilestones, label, announce]);

  // Notify parent of progress changes
  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  const progressId = `progress-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descriptionId = description ? `${progressId}-description` : undefined;

  return (
    <div className={cn('space-y-2', className)} role="group" aria-labelledby={progressId}>
      {/* Progress label and percentage */}
      <div className="flex justify-between items-center">
        <label 
          id={progressId}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
        </label>
        {showPercentage && (
          <span 
            className="text-sm text-neutral-600 dark:text-neutral-400"
            aria-label={`${Math.round(progress)} percent complete`}
          >
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Description */}
      {description && (
        <p 
          id={descriptionId}
          className="text-xs text-neutral-500 dark:text-neutral-400"
        >
          {description}
        </p>
      )}

      {/* Progress bar */}
      <LinearProgress
        progress={progress}
        size={size}
        color={color}
        label={label}
        showPercentage={false}
      />

      {/* Hidden status for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`${label}: ${Math.round(progress)}% complete`}
        {description && `. ${description}`}
      </div>
    </div>
  );
};

// Enhanced accessible circular progress
interface AccessibleCircularProgressProps {
  progress: number;
  label: string;
  description?: string;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showPercentage?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const AccessibleCircularProgress: React.FC<AccessibleCircularProgressProps> = ({
  progress,
  label,
  description,
  size = 60,
  strokeWidth = 4,
  color = 'primary',
  showPercentage = true,
  className,
  children
}) => {
  const progressId = `circular-progress-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descriptionId = description ? `${progressId}-description` : undefined;

  return (
    <div 
      className={cn('flex flex-col items-center space-y-2', className)}
      role="group"
      aria-labelledby={progressId}
      aria-describedby={descriptionId}
    >
      {/* Progress ring with accessible attributes */}
      <div className="relative">
        <CircularProgress
          progress={progress}
          size={size}
          strokeWidth={strokeWidth}
          color={color}
          showPercentage={showPercentage && !children}
          label={label}
        />
        
        {/* Custom content in center */}
        {children && (
          <div className="absolute inset-0 flex items-center justify-center">
            {children}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <div 
          id={progressId}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
        </div>
        
        {description && (
          <div 
            id={descriptionId}
            className="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
          >
            {description}
          </div>
        )}
      </div>

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`${label}: ${Math.round(progress)}% complete`}
        {description && `. ${description}`}
      </div>
    </div>
  );
};

// Enhanced accessible loading spinner
interface AccessibleLoadingSpinnerProps {
  label: string;
  description?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'white' | 'muted';
  className?: string;
  inline?: boolean;
  showLabel?: boolean;
}

export const AccessibleLoadingSpinner: React.FC<AccessibleLoadingSpinnerProps> = ({
  label,
  description,
  size = 'md',
  color = 'primary',
  className,
  inline = false,
  showLabel = false
}) => {
  const spinnerId = `spinner-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descriptionId = description ? `${spinnerId}-description` : undefined;

  return (
    <div 
      className={cn(
        'flex items-center',
        inline ? 'inline-flex space-x-2' : 'flex-col space-y-2',
        className
      )}
      role="status"
      aria-labelledby={spinnerId}
      aria-describedby={descriptionId}
      aria-live="polite"
    >
      <LoadingSpinner
        size={size}
        color={color}
        label={label}
        inline={inline}
      />
      
      {showLabel && (
        <div className="text-center">
          <div 
            id={spinnerId}
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </div>
          
          {description && (
            <div 
              id={descriptionId}
              className="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
            >
              {description}
            </div>
          )}
        </div>
      )}

      {/* Hidden label for screen readers */}
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Progress status manager for complex operations
interface ProgressStatus {
  id: string;
  label: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
  error?: string;
}

interface AccessibleProgressManagerProps {
  steps: ProgressStatus[];
  currentStep?: number;
  overallProgress?: number;
  title: string;
  description?: string;
  className?: string;
  onStepComplete?: (stepId: string) => void;
  onError?: (stepId: string, error: string) => void;
}

export const AccessibleProgressManager: React.FC<AccessibleProgressManagerProps> = ({
  steps,
  currentStep,
  overallProgress,
  title,
  description,
  className,
  onStepComplete,
  onError
}) => {
  const { announcements, announce } = useProgressAnnouncements();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Announce step completions and errors
  useEffect(() => {
    steps.forEach(step => {
      if (step.status === 'completed' && !completedSteps.has(step.id)) {
        announce(`Step completed: ${step.label}`);
        setCompletedSteps(prev => new Set(prev).add(step.id));
        onStepComplete?.(step.id);
      }
      
      if (step.status === 'error' && step.error) {
        announce(`Error in step ${step.label}: ${step.error}`);
        onError?.(step.id, step.error);
      }
    });
  }, [steps, completedSteps, announce, onStepComplete, onError]);

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;

  return (
    <div 
      className={cn('space-y-6', className)}
      role="region"
      aria-labelledby="progress-manager-title"
      aria-describedby="progress-manager-description"
    >
      {/* Title and overall progress */}
      <div className="space-y-4">
        <div>
          <h3 
            id="progress-manager-title"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {title}
          </h3>
          {description && (
            <p 
              id="progress-manager-description"
              className="text-sm text-neutral-600 dark:text-neutral-400 mt-1"
            >
              {description}
            </p>
          )}
        </div>

        {/* Overall progress */}
        {overallProgress !== undefined && (
          <AccessibleLinearProgress
            progress={overallProgress}
            label={`Overall progress: ${completedCount} of ${totalSteps} steps completed`}
            showPercentage
            announceOnMilestones={false}
          />
        )}
      </div>

      {/* Individual steps */}
      <div className="space-y-4" role="list" aria-label="Progress steps">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className={cn(
              'p-4 rounded-lg border transition-colors',
              step.status === 'completed' ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800' :
              step.status === 'error' ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800' :
              step.status === 'active' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' :
              'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
            )}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            role="listitem"
            aria-labelledby={`step-${step.id}-label`}
            aria-describedby={`step-${step.id}-description`}
          >
            <div className="flex items-start space-x-4">
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-1">
                {step.status === 'completed' ? (
                  <div 
                    className="w-6 h-6 rounded-full bg-success-600 flex items-center justify-center"
                    aria-label="Completed"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : step.status === 'error' ? (
                  <div 
                    className="w-6 h-6 rounded-full bg-danger-600 flex items-center justify-center"
                    aria-label="Error"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : step.status === 'active' ? (
                  <div className="w-6 h-6 flex items-center justify-center">
                    <LoadingSpinner size="sm" color="primary" label={`Processing ${step.label}`} />
                  </div>
                ) : (
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-neutral-300 dark:border-neutral-600"
                    aria-label="Pending"
                  />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div 
                  id={`step-${step.id}-label`}
                  className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                >
                  {step.label}
                </div>
                
                {step.description && (
                  <div 
                    id={`step-${step.id}-description`}
                    className="text-xs text-neutral-600 dark:text-neutral-400 mt-1"
                  >
                    {step.description}
                  </div>
                )}

                {step.error && (
                  <div className="text-xs text-danger-600 dark:text-danger-400 mt-2">
                    Error: {step.error}
                  </div>
                )}

                {/* Step progress bar */}
                {step.status === 'active' && step.progress > 0 && (
                  <div className="mt-2">
                    <AccessibleLinearProgress
                      progress={step.progress}
                      label={`${step.label} progress`}
                      size="sm"
                      showPercentage={false}
                      announceOnMilestones={false}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Screen reader status */}
            <div className="sr-only" aria-live="polite">
              {step.status === 'active' && `Currently processing: ${step.label}`}
              {step.status === 'completed' && `Completed: ${step.label}`}
              {step.status === 'error' && `Error in: ${step.label}. ${step.error}`}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Announcements for screen readers */}
      <ProgressAnnouncer announcements={announcements} />
    </div>
  );
};

// Export all accessible components
export {
  AccessibleLinearProgress as LinearProgressAccessible,
  AccessibleCircularProgress as CircularProgressAccessible,
  AccessibleLoadingSpinner as LoadingSpinnerAccessible,
  AccessibleProgressManager as ProgressManagerAccessible,
};