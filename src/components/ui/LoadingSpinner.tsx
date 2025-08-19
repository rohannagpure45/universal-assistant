'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';

// Size variants for loading spinners
export const spinnerSizes = {
  xs: {
    container: 'w-3 h-3',
    icon: 'w-3 h-3',
    stroke: 'stroke-2',
  },
  sm: {
    container: 'w-4 h-4',
    icon: 'w-4 h-4',
    stroke: 'stroke-2',
  },
  md: {
    container: 'w-6 h-6',
    icon: 'w-6 h-6',
    stroke: 'stroke-2',
  },
  lg: {
    container: 'w-8 h-8',
    icon: 'w-8 h-8',
    stroke: 'stroke-2',
  },
  xl: {
    container: 'w-12 h-12',
    icon: 'w-12 h-12',
    stroke: 'stroke-1',
  },
  '2xl': {
    container: 'w-16 h-16',
    icon: 'w-16 h-16',
    stroke: 'stroke-1',
  },
} as const;

// Color variants for different states
export const spinnerColors = {
  primary: 'text-primary-600 dark:text-primary-400',
  secondary: 'text-neutral-600 dark:text-neutral-400',
  success: 'text-success-600 dark:text-success-400',
  warning: 'text-warning-600 dark:text-warning-400',
  danger: 'text-danger-600 dark:text-danger-400',
  white: 'text-white',
  muted: 'text-neutral-400 dark:text-neutral-500',
} as const;

// Spinner type variants
export const spinnerTypes = {
  default: Loader2,
  refresh: RefreshCw,
  pulse: CircleDot,
} as const;

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: keyof typeof spinnerSizes;
  
  /** Color variant */
  color?: keyof typeof spinnerColors;
  
  /** Type of spinner animation */
  type?: keyof typeof spinnerTypes;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Accessible label for screen readers */
  label?: string;
  
  /** Whether to show the spinner inline or as block */
  inline?: boolean;
  
  /** Custom animation duration */
  duration?: number;
  
  /** Whether to show a centered spinner with overlay */
  overlay?: boolean;
  
  /** Background color for overlay */
  overlayColor?: string;
}

/**
 * LoadingSpinner Component
 * 
 * A highly configurable loading spinner with multiple variants for size, color, and animation type.
 * Includes full accessibility support and responsive design.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  type = 'default',
  className,
  label = 'Loading',
  inline = false,
  duration = 1,
  overlay = false,
  overlayColor = 'bg-white/80 dark:bg-neutral-900/80',
}) => {
  const sizeConfig = spinnerSizes[size];
  const colorClass = spinnerColors[color];
  const IconComponent = spinnerTypes[type];

  const spinner = (
    <motion.div
      className={cn(
        sizeConfig.container,
        colorClass,
        inline ? 'inline-block' : 'block',
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
      }}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <IconComponent 
        className={cn(sizeConfig.icon, sizeConfig.stroke)} 
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </motion.div>
  );

  if (overlay) {
    return (
      <motion.div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          overlayColor,
          'backdrop-blur-sm'
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {spinner}
        </motion.div>
      </motion.div>
    );
  }

  return spinner;
};

// Specialized spinner components for common use cases
export const InlineSpinner: React.FC<Omit<LoadingSpinnerProps, 'inline'>> = (props) => (
  <LoadingSpinner {...props} inline />
);

export const ButtonSpinner: React.FC<Omit<LoadingSpinnerProps, 'size' | 'inline' | 'color'>> = (props) => (
  <LoadingSpinner {...props} size="sm" inline color="white" />
);

export const CardSpinner: React.FC<Omit<LoadingSpinnerProps, 'size'>> = (props) => (
  <LoadingSpinner {...props} size="lg" />
);

export const OverlaySpinner: React.FC<Omit<LoadingSpinnerProps, 'overlay'>> = (props) => (
  <LoadingSpinner {...props} overlay size="xl" />
);

// Pulsing dots loader for content loading
interface PulsingDotsProps {
  /** Size of dots */
  size?: 'sm' | 'md' | 'lg';
  
  /** Color variant */
  color?: keyof typeof spinnerColors;
  
  /** Number of dots */
  count?: number;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Accessible label */
  label?: string;
}

export const PulsingDots: React.FC<PulsingDotsProps> = ({
  size = 'md',
  color = 'primary',
  count = 3,
  className,
  label = 'Loading content',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const gapClasses = {
    sm: 'space-x-1',
    md: 'space-x-2',
    lg: 'space-x-3',
  };

  return (
    <div
      className={cn('flex items-center', gapClasses[size], className)}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className={cn(
            sizeClasses[size],
            'rounded-full',
            spinnerColors[color]
          )}
          style={{ backgroundColor: 'currentColor' }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
};

// Linear progress indicator
interface LinearProgressProps {
  /** Progress percentage (0-100) */
  progress?: number;
  
  /** Whether progress is indeterminate */
  indeterminate?: boolean;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Color variant */
  color?: keyof typeof spinnerColors;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Accessible label */
  label?: string;
  
  /** Whether to show percentage text */
  showPercentage?: boolean;
  
  /** Custom percentage formatter */
  formatPercentage?: (value: number) => string;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress = 0,
  indeterminate = false,
  size = 'md',
  color = 'primary',
  className,
  label = 'Progress',
  showPercentage = false,
  formatPercentage = (value) => `${Math.round(value)}%`,
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {showPercentage && !indeterminate && (
        <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400 mb-1">
          <span>{label}</span>
          <span>{formatPercentage(clampedProgress)}</span>
        </div>
      )}
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-label={label}
        aria-valuenow={indeterminate ? undefined : clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={indeterminate ? 'Loading' : formatPercentage(clampedProgress)}
      >
        {indeterminate ? (
          <motion.div
            className={cn(
              'absolute inset-y-0 w-1/3 rounded-full',
              spinnerColors[color]
            )}
            style={{ backgroundColor: 'currentColor' }}
            animate={{
              x: ['-100%', '400%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ) : (
          <motion.div
            className={cn(
              'h-full rounded-full',
              spinnerColors[color]
            )}
            style={{ backgroundColor: 'currentColor' }}
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        )}
      </div>
    </div>
  );
};

// Circular progress indicator
interface CircularProgressProps {
  /** Progress percentage (0-100) */
  progress?: number;
  
  /** Whether progress is indeterminate */
  indeterminate?: boolean;
  
  /** Size in pixels */
  size?: number;
  
  /** Stroke width */
  strokeWidth?: number;
  
  /** Color variant */
  color?: keyof typeof spinnerColors;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Accessible label */
  label?: string;
  
  /** Whether to show percentage in center */
  showPercentage?: boolean;
  
  /** Custom content to show in center */
  children?: React.ReactNode;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress = 0,
  indeterminate = false,
  size = 40,
  strokeWidth = 4,
  color = 'primary',
  className,
  label = 'Progress',
  showPercentage = false,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={indeterminate ? undefined : clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-neutral-200 dark:text-neutral-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={spinnerColors[color]}
          style={{
            strokeDasharray,
            strokeDashoffset: indeterminate ? undefined : strokeDashoffset,
          }}
          initial={indeterminate ? undefined : { strokeDashoffset: circumference }}
          animate={indeterminate ? { rotate: 360 } : { strokeDashoffset }}
          transition={indeterminate ? {
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          } : { duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Center content */}
      {(showPercentage || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Export types for external use
export type {
  LoadingSpinnerProps,
  PulsingDotsProps,
  LinearProgressProps,
  CircularProgressProps,
};