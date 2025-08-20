'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/Button';
import { 
  Calendar, 
  Clock, 
  Users, 
  Activity,
  DollarSign,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { CostTracker } from '@/components/dashboard/CostTracker';
import { MotionCard, MotionList, MotionCounter, fadeInUpVariants } from '@/components/ui/Motion';
import { SkeletonDashboardCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// Import modular components
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { RecentMeetingCard } from '@/components/dashboard/RecentMeetingCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MeetingControls } from '@/components/dashboard/MeetingControls';

// Import error boundary and hooks
import { DashboardErrorBoundary, withDashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary';
import { useDashboard } from '@/hooks/useDashboard';

// Today's schedule component for better organization
const TodaysSchedule = React.memo(() => {
  const scheduleItems = React.useMemo(() => [
    { time: '2:00 PM', title: 'Team Sync', color: 'from-primary-400 to-primary-600', bg: 'hover:bg-primary-50 dark:hover:bg-primary-900/20', text: 'group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400', pulse: true },
    { time: '4:30 PM', title: 'Client Call', color: 'from-success-400 to-emerald-500', bg: 'hover:bg-success-50 dark:hover:bg-success-900/20', text: 'group-hover/item:text-success-600 dark:group-hover/item:text-success-400' },
    { time: '6:00 PM', title: 'Planning Session', color: 'from-purple-400 to-pink-500', bg: 'hover:bg-purple-50 dark:hover:bg-purple-900/20', text: 'group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400' },
  ], []);

  return (
    <MotionCard className={cn(
      'group relative overflow-hidden',
      'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
      'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
      'p-6', // 8px grid: 24px padding
      'hover:bg-white/95 dark:hover:bg-neutral-800/95'
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-info-50/20 to-primary-50/20 dark:from-info-900/10 dark:to-primary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <h3 className="relative text-h3 text-neutral-900 dark:text-neutral-100 mb-6">
        Today's Schedule
      </h3>
      <MotionList className="relative space-y-4"> {/* 8px grid: 16px spacing */}
        {scheduleItems.map((item, index) => (
          <MotionCard
            key={item.title}
            className={cn(
              'group/item flex items-center gap-3 p-3 rounded-lg',
              'transition-all duration-200 cursor-pointer',
              item.bg
            )}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className={cn(
                'w-3 h-3 bg-gradient-to-r rounded-full flex-shrink-0',
                item.color,
                item.pulse && 'animate-pulse-soft'
              )}
              aria-hidden="true" 
            />
            <span className="text-body-sm font-medium text-contrast-accessible min-w-[60px]">
              {item.time}
            </span>
            <span className={cn(
              'text-body-sm font-semibold text-neutral-900 dark:text-neutral-100',
              'transition-colors duration-200',
              item.text
            )}>
              {item.title}
            </span>
          </MotionCard>
        ))}
      </MotionList>
    </MotionCard>
  );
});

TodaysSchedule.displayName = 'TodaysSchedule';

// Enhanced dashboard components with error boundaries
const EnhancedQuickActions = withDashboardErrorBoundary(QuickActions, 'Quick Actions');
const EnhancedMeetingControls = withDashboardErrorBoundary(MeetingControls, 'Meeting Controls');
const EnhancedCostTracker = withDashboardErrorBoundary(CostTracker, 'Cost Tracker');

// Error display component
const ErrorDisplay = React.memo<{ error: string; onRetry: () => void }>(({ error, onRetry }) => (
  <MotionCard className="border-2 border-dashed border-danger-200 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-900/20 rounded-xl p-6">
    <div className="text-center">
      <AlertCircle className="w-8 h-8 text-danger-600 dark:text-danger-400 mx-auto mb-3" />
      <h3 className="text-h4 text-danger-900 dark:text-danger-100 mb-2">
        Dashboard Error
      </h3>
      <p className="text-body-sm text-danger-700 dark:text-danger-300 mb-4">
        {error}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRetry}
        leftIcon={<RefreshCw className="w-4 h-4" />}
      >
        Retry
      </Button>
    </div>
  </MotionCard>
));

ErrorDisplay.displayName = 'ErrorDisplay';

// Performance-optimized dashboard page component
const DashboardPage = React.memo(() => {
  const {
    isLoading,
    statsReady,
    error,
    dashboardStats,
    recentMeetingsForDisplay,
    greetingText,
    user,
    isInMeeting,
    currentMeeting,
    isLoadingRecentMeetings,
    costSummary,
    handleMeetingClick,
    retryLoad,
    clearError,
  } = useDashboard();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <SkeletonDashboardCard className="h-8 w-48" />
              <SkeletonDashboardCard className="h-5 w-64" />
            </div>
            <SkeletonDashboardCard className="h-10 w-40" />
          </div>
          
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonDashboardCard key={i} showTrend />
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <SkeletonDashboardCard className="h-96" />
            </div>
            <div className="space-y-6">
              <SkeletonDashboardCard className="h-64" />
              <SkeletonDashboardCard className="h-48" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <DashboardErrorBoundary>
      <MainLayout>
        <MotionList className="space-y-6 lg:space-y-8"> {/* 8px grid: 24px and 32px spacing */}
          {/* Header with improved typography and spacing */}
          <MotionCard 
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 p-0 shadow-none border-0 bg-transparent"
            variants={fadeInUpVariants}
          >
            <div className="space-y-2"> {/* 8px grid: 8px spacing */}
              <h1 className="text-display-3xl text-neutral-900 dark:text-neutral-100">
                Dashboard
              </h1>
              <p className="text-body-base text-contrast-accessible">
                {greetingText}
              </p>
            </div>
            
            <AnimatePresence>
              {isInMeeting && currentMeeting && (
                <MotionCard 
                  className={cn(
                    'flex items-center gap-2 px-4 py-2',
                    'bg-gradient-to-r from-danger-100 to-danger-50',
                    'dark:from-danger-900/30 dark:to-danger-800/20',
                    'text-danger-700 dark:text-danger-400',
                    'rounded-full border border-danger-200/50 dark:border-danger-800/50',
                    'shadow-soft'
                  )}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Activity className="w-4 h-4 animate-pulse-soft flex-shrink-0" aria-hidden="true" />
                  <span className="text-label-base font-semibold">Meeting in Progress</span>
                </MotionCard>
              )}
            </AnimatePresence>
          </MotionCard>

          {/* Error Display */}
          {error && (
            <ErrorDisplay error={error} onRetry={retryLoad} />
          )}

          {/* Stats Cards with improved grid spacing */}
          <MotionList 
            className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" 
            stagger
          >
            <DashboardCard
              title="Total Meetings"
              value={statsReady ? dashboardStats.totalMeetings : 0}
              icon={Calendar}
              trend={statsReady ? { value: 12, isPositive: true } : undefined}
            />
            <DashboardCard
              title="Active Meetings"
              value={statsReady ? dashboardStats.activeMeetings : 0}
              icon={Activity}
              isActive={isInMeeting}
            />
            <DashboardCard
              title="Total Hours"
              value={statsReady ? `${dashboardStats.totalHours.toFixed(1)}h` : "0h"}
              icon={Clock}
              trend={statsReady ? { value: 8, isPositive: true } : undefined}
            />
            <DashboardCard
              title="Participants"
              value={statsReady ? dashboardStats.participants : 0}
              icon={Users}
              trend={statsReady ? { value: 15, isPositive: true } : undefined}
            />
          </MotionList>

          {/* Cost Summary Card */}
          <MotionCard className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-soft border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 relative overflow-hidden hover:bg-white/90 dark:hover:bg-gray-800/90">
            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-success-50/30 to-emerald-50/30 dark:from-success-900/10 dark:to-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Cost Summary
              </h3>
              <div className="p-2 sm:p-3 bg-gradient-to-br from-success-100 to-emerald-100 dark:from-success-900/30 dark:to-emerald-900/30 rounded-xl group-hover:scale-105 transition-transform duration-200 w-fit">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-success-600 dark:text-success-400" />
              </div>
            </div>
            
            <div className="relative grid grid-cols-2 gap-4 sm:gap-6">
              <div className="group/item space-y-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total Cost</p>
                <MotionCounter
                  value={costSummary.totalCost}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white group-hover/item:text-success-600 dark:group-hover/item:text-success-400 transition-colors duration-200"
                  formatter={(v) => `$${v.toFixed(3)}`}
                />
              </div>
              <div className="group/item space-y-2">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">API Calls</p>
                <MotionCounter
                  value={costSummary.totalCalls}
                  className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400 transition-colors duration-200"
                  formatter={(v) => v.toLocaleString()}
                />
              </div>
            </div>
            
            <AnimatePresence>
              {costSummary.activeBudgets > 0 && (
                <MotionCard 
                  className="relative mt-4 p-3 bg-gradient-to-r from-warning-50 to-orange-50 dark:from-warning-900/20 dark:to-orange-900/20 rounded-xl border border-warning-200/50 dark:border-warning-800/50"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-xs sm:text-sm font-medium text-warning-700 dark:text-warning-400">
                    {costSummary.activeBudgets} budget(s) need attention
                  </p>
                </MotionCard>
              )}
            </AnimatePresence>
          </MotionCard>

          {/* Main Content Grid with consistent spacing */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8"> {/* 8px grid: 24px and 32px spacing */}
            {/* Recent Meetings with improved styling */}
            <MotionCard className={cn(
              'xl:col-span-2',
              'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
              'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
              'p-6', // 8px grid: 24px padding
              'hover:bg-white/95 dark:hover:bg-neutral-800/95'
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-h2 text-neutral-900 dark:text-neutral-100">
                  Recent Meetings
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="hover:underline">View All</span>
                </Button>
              </div>
              <MotionList className="space-y-4"> {/* 8px grid: 16px spacing */}
                {recentMeetingsForDisplay.length === 0 && !isLoadingRecentMeetings ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h4 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">No Recent Meetings</h4>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Start your first meeting to see it here</p>
                  </div>
                ) : isLoadingRecentMeetings ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonDashboardCard key={i} className="h-24" />
                    ))}
                  </div>
                ) : (
                  recentMeetingsForDisplay.map((meeting, index) => (
                  <MotionCard
                    key={meeting.id}
                    variants={fadeInUpVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.1 }}
                    className="p-0 shadow-none border-0 bg-transparent"
                  >
                    <RecentMeetingCard 
                      meeting={meeting} 
                      onMeetingClick={handleMeetingClick}
                    />
                  </MotionCard>
                ))
              )}
              </MotionList>
            </MotionCard>

            {/* Sidebar with consistent spacing */}
            <div className="space-y-6"> {/* 8px grid: 24px spacing */}
              <EnhancedQuickActions />
              
              {/* Meeting Controls - only show when in meeting */}
              {isInMeeting && <EnhancedMeetingControls />}
              
              {/* Today's Schedule */}
              <TodaysSchedule />
            </div>
          </div>

          {/* Cost Tracking Section */}
          <MotionCard 
            className="p-0 shadow-none border-0 bg-transparent"
            variants={fadeInUpVariants}
          >
            <EnhancedCostTracker />
          </MotionCard>
        </MotionList>
      </MainLayout>
    </DashboardErrorBoundary>
  );
});

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;