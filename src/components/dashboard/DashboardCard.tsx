'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { MotionCard, MotionCounter } from '@/components/ui/Motion';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  isActive?: boolean;
}

export const DashboardCard = React.memo<DashboardCardProps>(({
  title,
  value,
  icon: Icon,
  trend,
  className = '',
  isActive = false,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
  
  return (
    <MotionCard
      className={cn(
        'group relative overflow-hidden',
        // Enhanced styling using design system
        'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
        'rounded-xl shadow-soft',
        'border border-neutral-200/60 dark:border-neutral-700/60',
        'p-6', // 8px grid: 24px padding
        'transition-all duration-300 ease-out',
        // Improved hover states
        'hover:bg-white/95 dark:hover:bg-neutral-800/95',
        'hover:shadow-lg hover:border-primary-300/60 dark:hover:border-primary-600/60',
        'hover:-translate-y-1', // Subtle lift
        // Active meeting indicator
        isActive && 'ring-2 ring-danger-500/50 shadow-danger-200/20 dark:shadow-danger-800/20',
        className
      )}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Animated gradient overlay */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
        isActive 
          ? 'from-red-50/30 to-pink-50/30 dark:from-red-900/10 dark:to-pink-900/10'
          : 'from-blue-50/30 to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10'
      )} />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Title with improved typography */}
          <p className="text-label-base text-contrast-medium mb-3 truncate">
            {title}
          </p>
          
          {/* Value with enhanced styling */}
          <div className="mb-4"> {/* 8px grid: 16px margin */}
            {typeof value === 'string' && !isNaN(numericValue) ? (
              <MotionCounter 
                value={numericValue} 
                className="text-display-2xl text-neutral-900 dark:text-neutral-100 font-bold leading-tight"
                formatter={(v) => typeof value === 'string' && value.includes('h') ? `${v}h` : v.toString()}
              />
            ) : (
              <p className="text-display-2xl text-neutral-900 dark:text-neutral-100 font-bold leading-tight animate-fade-in">
                {value}
              </p>
            )}
          </div>
          
          {/* Trend with improved accessibility */}
          {trend && (
            <div className={cn(
              'flex items-center gap-1.5 text-body-xs font-medium transition-all duration-200',
              trend.isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
            )}>
              <TrendingUp 
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 flex-shrink-0',
                  !trend.isPositive && 'rotate-180'
                )} 
                aria-hidden="true"
              />
              <span>{Math.abs(trend.value)}% from last week</span>
            </div>
          )}
        </div>
        
        {/* Icon container with improved design system styling */}
        <div className={cn(
          'relative flex-shrink-0 ml-4', // 8px grid: 16px margin
          'p-4 rounded-xl', // 8px grid: 16px padding, 12px radius
          'transition-all duration-200 ease-out group-hover:scale-105',
          isActive
            ? 'bg-gradient-to-br from-danger-100 to-danger-50 dark:from-danger-900/30 dark:to-danger-800/20'
            : 'bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20'
        )}>
          <Icon className={cn(
            'w-6 h-6 transition-colors duration-200', // Consistent 24px icon size
            isActive
              ? 'text-danger-600 dark:text-danger-400 group-hover:text-danger-700 dark:group-hover:text-danger-300'
              : 'text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300'
          )} />
          
          {/* Enhanced glow effect with design system colors */}
          <div className={cn(
            'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300',
            isActive ? 'bg-danger-400' : 'bg-primary-400'
          )} />
        </div>
      </div>
      
      {/* Active meeting pulse indicator with improved positioning */}
      {isActive && (
        <div className="absolute top-4 right-4"> {/* 8px grid: 16px from edges */}
          <div className="relative">
            <div className="w-2 h-2 bg-danger-500 rounded-full animate-pulse-soft" />
            <div className="absolute inset-0 w-2 h-2 bg-danger-500 rounded-full animate-ping" />
          </div>
        </div>
      )}
    </MotionCard>
  );
});

DashboardCard.displayName = 'DashboardCard';