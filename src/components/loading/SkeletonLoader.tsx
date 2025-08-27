import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  count = 1,
  animate = true
}: SkeletonProps) {
  const baseClasses = cn(
    'bg-gray-200',
    animate && 'animate-pulse',
    className
  );

  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'card':
        return 'rounded-lg p-4 space-y-3';
      case 'text':
      default:
        return 'rounded h-4 my-2';
    }
  };

  const variantClasses = cn(baseClasses, getVariantStyles());

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'card' ? '200px' : '16px')
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={variantClasses}
            style={style}
            role="status"
            aria-label="Loading"
          >
            <span className="sr-only">Loading...</span>
          </div>
        ))}
      </>
    );
  }

  return (
    <div
      className={variantClasses}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Specific skeleton components for common patterns

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="75%" />
        <Skeleton variant="text" width="80%" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rectangular" width={80} height={32} />
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <Skeleton variant="text" />
        </td>
      ))}
    </tr>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 border-b border-gray-100">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="40%" height={12} />
      </div>
      <Skeleton variant="rectangular" width={60} height={24} />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton variant="text" width={100} height={14} />
        <Skeleton variant="rectangular" width="100%" height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width={120} height={14} />
        <Skeleton variant="rectangular" width="100%" height={40} />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width={80} height={14} />
        <Skeleton variant="rectangular" width="100%" height={100} />
      </div>
      <div className="flex gap-3">
        <Skeleton variant="rectangular" width={100} height={40} />
        <Skeleton variant="rectangular" width={100} height={40} />
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={120} height={20} />
          </div>
          <nav className="flex items-center space-x-6">
            <Skeleton variant="text" width={60} height={16} />
            <Skeleton variant="text" width={60} height={16} />
            <Skeleton variant="text" width={60} height={16} />
            <Skeleton variant="rectangular" width={100} height={36} />
          </nav>
        </div>
      </div>
    </header>
  );
}

// Dashboard-specific skeleton
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderSkeleton />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <Skeleton variant="text" width="60%" height={14} />
              <Skeleton variant="text" width="40%" height={28} />
            </div>
          ))}
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <Skeleton variant="text" width="50%" height={20} />
              <div className="mt-4 space-y-3">
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}