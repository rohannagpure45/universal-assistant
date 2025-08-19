'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'avatar';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animate = true,
}) => {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';
  
  const variantClasses = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded-sm',
    avatar: 'rounded-full',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  const shimmerVariants = {
    initial: { backgroundPosition: '-200% 0' },
    animate: {
      backgroundPosition: '200% 0',
      transition: {
        repeat: Infinity,
        duration: 2,
        ease: "linear" as const,
      },
    },
  };

  const Component = animate ? motion.div : 'div';
  const animationProps = animate ? {
    variants: shimmerVariants,
    initial: 'initial',
    animate: 'animate',
  } : {};

  if (variant === 'text' && lines > 1) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <Component
            key={index}
            className={cn(
              baseClasses,
              variantClasses.text,
              'h-4 bg-[length:400%_100%]'
            )}
            style={{
              ...style,
              width: index === lines - 1 ? '60%' : style?.width || '100%',
            }}
            {...animationProps}
          />
        ))}
      </div>
    );
  }

  return (
    <Component
      className={cn(
        baseClasses,
        variantClasses[variant],
        'bg-[length:400%_100%]',
        className
      )}
      style={style}
      {...animationProps}
    />
  );
};

// Enhanced skeleton variants for common use cases
export const SkeletonCard: React.FC<{ className?: string; animate?: boolean }> = ({ 
  className = '', 
  animate = true 
}) => (
  <motion.div 
    className={cn(
      'p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800',
      className
    )}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center space-x-4">
      <Skeleton variant="avatar" width={48} height={48} animate={animate} />
      <div className="flex-1 space-y-3">
        <Skeleton variant="text" height={16} animate={animate} />
        <Skeleton variant="text" height={12} width="70%" animate={animate} />
        <Skeleton variant="text" height={10} width="50%" animate={animate} />
      </div>
    </div>
  </motion.div>
);

export const SkeletonTable: React.FC<{ 
  rows?: number; 
  cols?: number; 
  className?: string;
  animate?: boolean;
}> = ({
  rows = 5,
  cols = 4,
  className = '',
  animate = true,
}) => (
  <motion.div 
    className={cn('space-y-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
  >
    {/* Header */}
    <div className="grid gap-4 pb-4 border-b border-gray-200 dark:border-gray-700" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, index) => (
        <Skeleton key={`header-${index}`} height={20} className="bg-gray-300 dark:bg-gray-600" animate={animate} />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <motion.div
        key={`row-${rowIndex}`}
        className="grid gap-4 py-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rowIndex * 0.05, duration: 0.3 }}
      >
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            height={16}
            width={colIndex === 0 ? '80%' : colIndex === cols - 1 ? '60%' : undefined}
            animate={animate}
          />
        ))}
      </motion.div>
    ))}
  </motion.div>
);

export const SkeletonChart: React.FC<{ 
  className?: string; 
  animate?: boolean;
  type?: 'bar' | 'line' | 'pie';
}> = ({ 
  className = '', 
  animate = true,
  type = 'bar'
}) => (
  <motion.div 
    className={cn(
      'p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800',
      className
    )}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex items-center justify-between mb-6">
      <Skeleton height={24} width="40%" animate={animate} />
      <div className="flex space-x-2">
        <Skeleton width={20} height={20} variant="circular" animate={animate} />
        <Skeleton width={20} height={20} variant="circular" animate={animate} />
      </div>
    </div>
    
    {type === 'bar' && (
      <div className="flex items-end space-x-3 h-40">
        {Array.from({ length: 8 }).map((_, index) => {
          const height = Math.floor(Math.random() * 120) + 40;
          return (
            <motion.div
              key={index}
              className="flex-1"
              initial={{ height: 0 }}
              animate={{ height }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Skeleton
                className="w-full rounded-t-md"
                height={height}
                animate={animate}
              />
            </motion.div>
          );
        })}
      </div>
    )}
    
    {type === 'line' && (
      <div className="relative h-40">
        <Skeleton height="100%" width="100%" animate={animate} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
        </div>
      </div>
    )}
    
    {type === 'pie' && (
      <div className="flex items-center justify-center h-40">
        <Skeleton variant="circular" width={120} height={120} animate={animate} />
      </div>
    )}
    
    {/* Legend */}
    <div className="flex flex-wrap gap-4 mt-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Skeleton width={12} height={12} variant="circular" animate={animate} />
          <Skeleton width={60} height={12} animate={animate} />
        </div>
      ))}
    </div>
  </motion.div>
);

// Dashboard-specific skeleton layouts
export const SkeletonDashboardCard: React.FC<{ 
  className?: string;
  showTrend?: boolean;
  animate?: boolean;
}> = ({ 
  className = '', 
  showTrend = false,
  animate = true 
}) => (
  <motion.div 
    className={cn(
      'p-6 bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700',
      className
    )}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton variant="text" width="60%" height={14} className="mb-3" animate={animate} />
        <Skeleton variant="text" width="40%" height={32} className="mb-2" animate={animate} />
        {showTrend && (
          <div className="flex items-center space-x-2">
            <Skeleton width={16} height={16} variant="circular" animate={animate} />
            <Skeleton width="50%" height={12} animate={animate} />
          </div>
        )}
      </div>
      <div className="ml-4">
        <Skeleton width={48} height={48} className="rounded-xl" animate={animate} />
      </div>
    </div>
  </motion.div>
);

export const SkeletonCostTracker: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div 
    className={cn('space-y-6', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton width={200} height={24} className="mb-2" />
        <Skeleton width={300} height={16} />
      </div>
      <div className="flex space-x-3">
        <Skeleton width={80} height={40} className="rounded-lg" />
        <Skeleton width={100} height={40} className="rounded-lg" />
      </div>
    </div>
    
    {/* Metric Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonDashboardCard key={index} showTrend={index < 2} />
      ))}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonChart type="bar" />
      <SkeletonChart type="pie" />
    </div>
  </motion.div>
);

// Meeting-specific skeleton layouts
export const SkeletonMeeting: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div 
    className={cn('space-y-6', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Header */}
    <div className="text-center space-y-4">
      <Skeleton width={300} height={32} className="mx-auto" />
      <Skeleton width={400} height={16} className="mx-auto" />
    </div>
    
    {/* Meeting Button */}
    <div className="flex justify-center">
      <Skeleton variant="circular" width={200} height={200} />
    </div>
    
    {/* Transcript Area */}
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Skeleton variant="circular" width={8} height={8} />
        <Skeleton width={120} height={20} />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Skeleton variant="circular" width={6} height={6} />
              <Skeleton width={80} height={14} />
              <Skeleton width={60} height={12} />
            </div>
            <Skeleton variant="text" lines={2} />
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

// Analytics page skeleton
export const SkeletonAnalytics: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div 
    className={cn('space-y-8', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <Skeleton width={180} height={28} className="mb-2" />
        <Skeleton width={280} height={16} />
      </div>
      <div className="flex space-x-3">
        <Skeleton width={120} height={40} className="rounded-lg" />
        <Skeleton width={100} height={40} className="rounded-lg" />
      </div>
    </div>
    
    {/* Key Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonDashboardCard key={index} showTrend />
      ))}
    </div>
    
    {/* Large Chart */}
    <SkeletonChart type="line" className="h-96" />
    
    {/* Data Table */}
    <SkeletonTable rows={8} cols={5} />
  </motion.div>
);

// Settings page skeleton
export const SkeletonSettings: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div 
    className={cn('space-y-6', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className="max-w-2xl">
      {/* Header */}
      <Skeleton width={140} height={28} className="mb-2" />
      <Skeleton width={320} height={16} className="mb-8" />
      
      {/* Settings Sections */}
      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="mb-8">
          <Skeleton width={180} height={20} className="mb-4" />
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton width="60%" height={16} className="mb-1" />
                  <Skeleton width="80%" height={12} />
                </div>
                <Skeleton width={48} height={24} className="rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

// List item skeleton for various lists
export const SkeletonListItem: React.FC<{ 
  className?: string;
  showAvatar?: boolean;
  showActions?: boolean;
}> = ({ 
  className = '',
  showAvatar = true,
  showActions = false
}) => (
  <motion.div 
    className={cn(
      'flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
      className
    )}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3 }}
  >
    {showAvatar && (
      <Skeleton variant="avatar" width={40} height={40} />
    )}
    <div className="flex-1 space-y-2">
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={12} />
    </div>
    {showActions && (
      <div className="flex space-x-2">
        <Skeleton width={32} height={32} className="rounded-lg" />
        <Skeleton width={32} height={32} className="rounded-lg" />
      </div>
    )}
  </motion.div>
);

// Form skeleton
export const SkeletonForm: React.FC<{ 
  className?: string;
  fields?: number;
}> = ({ 
  className = '',
  fields = 5
}) => (
  <motion.div 
    className={cn('space-y-6', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton width="30%" height={16} />
        <Skeleton width="100%" height={40} className="rounded-lg" />
      </div>
    ))}
    <div className="flex space-x-3 pt-4">
      <Skeleton width={100} height={40} className="rounded-lg" />
      <Skeleton width={80} height={40} className="rounded-lg" />
    </div>
  </motion.div>
);

// Real-time content skeleton with pulse animation
export const SkeletonRealtime: React.FC<{ 
  className?: string;
  items?: number;
}> = ({ 
  className = '',
  items = 3
}) => (
  <motion.div 
    className={cn('space-y-4', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    {Array.from({ length: items }).map((_, index) => (
      <motion.div
        key={index}
        className="p-4 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-blue-500 border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.3 }}
      >
        <div className="flex items-start space-x-3">
          <div className="relative">
            <Skeleton variant="circular" width={8} height={8} />
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-3">
              <Skeleton width={80} height={14} />
              <Skeleton width={60} height={12} />
            </div>
            <Skeleton variant="text" lines={Math.floor(Math.random() * 3) + 1} />
          </div>
        </div>
      </motion.div>
    ))}
  </motion.div>
);

// Navigation skeleton
export const SkeletonNavigation: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div 
    className={cn('space-y-2', className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    {Array.from({ length: 6 }).map((_, index) => (
      <motion.div
        key={index}
        className="flex items-center space-x-3 p-3 rounded-lg"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
      >
        <Skeleton width={20} height={20} />
        <Skeleton width={120} height={16} />
      </motion.div>
    ))}
  </motion.div>
);

// Utility function for creating skeleton loading states
export const createSkeletonArray = (count: number, component: React.ComponentType<any>) => 
  Array.from({ length: count }, (_, index) => React.createElement(component, { key: index }));

export default Skeleton;