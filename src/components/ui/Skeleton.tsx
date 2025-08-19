import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 shimmer';
  
  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded-sm',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses.text} h-4`}
            style={{
              ...style,
              width: index === lines - 1 ? '60%' : style?.width || '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Skeleton variants for common use cases
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="text" height={16} className="mb-2" />
        <Skeleton variant="text" height={12} width="60%" />
      </div>
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({
  rows = 5,
  cols = 4,
  className = '',
}) => (
  <div className={`space-y-4 ${className}`}>
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, index) => (
        <Skeleton key={`header-${index}`} height={20} />
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={`row-${rowIndex}`}
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton
            key={`cell-${rowIndex}-${colIndex}`}
            height={16}
            width={colIndex === 0 ? '80%' : undefined}
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
    <Skeleton height={20} className="mb-4" width="40%" />
    <div className="flex items-end space-x-2 h-32">
      {Array.from({ length: 7 }).map((_, index) => (
        <Skeleton
          key={index}
          className="flex-1"
          height={Math.random() * 80 + 20}
        />
      ))}
    </div>
  </div>
);

export default Skeleton;