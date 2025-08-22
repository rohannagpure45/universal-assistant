'use client';

import React, { Suspense } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { Button } from '@/components/ui/Button';
import { 
  Calendar, 
  Clock, 
  Users, 
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { SkeletonDashboardCard } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// Lazy load modular components to reduce bundle size
const DashboardCard = React.lazy(() => import('@/components/dashboard/DashboardCard').then(m => ({default: m.DashboardCard})));
const RecentMeetingCard = React.lazy(() => import('@/components/dashboard/RecentMeetingCard').then(m => ({default: m.RecentMeetingCard})));
const QuickActions = React.lazy(() => import('@/components/dashboard/QuickActions').then(m => ({default: m.QuickActions})));
const MeetingControls = React.lazy(() => import('@/components/dashboard/MeetingControls').then(m => ({default: m.MeetingControls})));

// Import error boundary and hooks
import { DashboardErrorBoundary, withDashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary';
import { useDashboard } from '@/hooks/useDashboard';
import { LoadingSpinner, PulsingDots } from '@/components/ui';


// Component loading fallback
const ComponentFallback = ({ name }: { name: string }) => (
  <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg h-32 flex items-center justify-center">
    <span className="text-sm text-gray-700 dark:text-gray-400">Loading {name}...</span>
  </div>
);

// Enhanced dashboard components with error boundaries
const EnhancedQuickActions = withDashboardErrorBoundary(React.memo(() => (
  <Suspense fallback={<ComponentFallback name="Quick Actions" />}>
    <QuickActions />
  </Suspense>
)), 'Quick Actions');

const EnhancedMeetingControls = withDashboardErrorBoundary(React.memo(() => (
  <Suspense fallback={<ComponentFallback name="Meeting Controls" />}>
    <MeetingControls />
  </Suspense>
)), 'Meeting Controls');

// Error display component
const ErrorDisplay = React.memo<{ error: string; onRetry: () => void }>(({ error, onRetry }) => (
  <div className="border-2 border-dashed border-danger-200 dark:border-danger-800 bg-danger-50/50 dark:bg-danger-900/20 rounded-xl p-6">
    <div className="text-center">
      <AlertCircle className="w-8 h-8 text-danger-600 dark:text-danger-400 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-danger-900 dark:text-danger-100 mb-2">
        Dashboard Error
      </h3>
      <p className="text-sm text-danger-700 dark:text-danger-300 mb-4">
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
  </div>
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
    isInMeeting,
    currentMeeting,
    isLoadingRecentMeetings,
    handleMeetingClick,
    retryLoad,
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
        <div className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Header with improved typography and spacing */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 p-0 shadow-none border-0 bg-transparent">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-700 dark:text-neutral-400">
                {greetingText}
              </p>
            </div>
            
            {isInMeeting && currentMeeting && (
              <div 
                className={cn(
                  'flex items-center gap-2 px-4 py-2',
                  'bg-gradient-to-r from-danger-100 to-danger-50',
                  'dark:from-danger-900/30 dark:to-danger-800/20',
                  'text-danger-700 dark:text-danger-400',
                  'rounded-full border border-danger-200/50 dark:border-danger-800/50',
                  'shadow-soft transition-all duration-300'
                )}
              >
                <Activity className="w-4 h-4 animate-pulse flex-shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold">Meeting in Progress</span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <ErrorDisplay error={error} onRetry={retryLoad} />
          )}

          {/* Stats Cards with improved grid spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            <Suspense fallback={<SkeletonDashboardCard showTrend />}>
              <DashboardCard
                title="Total Meetings"
                value={statsReady ? dashboardStats.totalMeetings : 0}
                icon={Calendar}
                isLoading={!statsReady}
              />
            </Suspense>
            <Suspense fallback={<SkeletonDashboardCard />}>
              <DashboardCard
                title="Active Meetings"
                value={statsReady ? dashboardStats.activeMeetings : 0}
                icon={Activity}
                isActive={isInMeeting}
                isLoading={!statsReady}
              />
            </Suspense>
            <Suspense fallback={<SkeletonDashboardCard showTrend />}>
              <DashboardCard
                title="Total Hours"
                value={statsReady ? `${dashboardStats.totalHours.toFixed(1)}h` : "0h"}
                icon={Clock}
                isLoading={!statsReady}
              />
            </Suspense>
            <Suspense fallback={<SkeletonDashboardCard showTrend />}>
              <DashboardCard
                title="Participants"
                value={statsReady ? dashboardStats.uniqueParticipants : 0}
                icon={Users}
                isLoading={!statsReady}
              />
            </Suspense>
          </div>

          {/* Main Content Grid with consistent spacing */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Recent Meetings with improved styling */}
            <div className={cn(
              'xl:col-span-2',
              'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
              'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
              'p-6 transition-all duration-200',
              'hover:bg-white/95 dark:hover:bg-neutral-800/95'
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  Recent Meetings
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  disabled={isLoadingRecentMeetings}
                >
                  {isLoadingRecentMeetings ? (
                    <>
                      <LoadingSpinner size="xs" color="primary" className="mr-2" />
                      Loading...
                    </>
                  ) : (
                    <span className="hover:underline">View All</span>
                  )}
                </Button>
              </div>
              <div className="space-y-4">
                {recentMeetingsForDisplay.length === 0 && !isLoadingRecentMeetings ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h4 className="text-lg font-medium text-gray-800 dark:text-gray-400 mb-2">No Recent Meetings</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-500">Start your first meeting to see it here</p>
                  </div>
                ) : isLoadingRecentMeetings ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <PulsingDots size="md" color="primary" />
                      <p className="text-sm text-gray-800 dark:text-gray-400 mt-2">Loading recent meetings...</p>
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonDashboardCard key={i} className="h-24" />
                    ))}
                  </div>
                ) : (
                  recentMeetingsForDisplay.map((meeting) => (
                    <Suspense key={meeting.id} fallback={<ComponentFallback name="Meeting Card" />}>
                      <RecentMeetingCard 
                        meeting={meeting} 
                        onMeetingClick={handleMeetingClick}
                      />
                    </Suspense>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar with consistent spacing */}
            <div className="space-y-4 sm:space-y-6">
              <EnhancedQuickActions />
              
              {/* Meeting Controls - only show when in meeting */}
              {isInMeeting && <EnhancedMeetingControls />}
            </div>
          </div>

        </div>
      </MainLayout>
    </DashboardErrorBoundary>
  );
});

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;