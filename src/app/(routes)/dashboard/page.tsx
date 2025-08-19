'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { Button, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { 
  Calendar, 
  Clock, 
  Users, 
  Mic, 
  BarChart3, 
  TrendingUp, 
  Activity,
  Plus,
  PlayCircle,
  PauseCircle,
  StopCircle,
  DollarSign
} from 'lucide-react';
import { MeetingType } from '@/types';
import { CostTracker } from '@/components/dashboard/CostTracker';
import { useCostSummary } from '@/stores/costStore';
import { MotionCard, MotionList, MotionCounter, fadeInUpVariants } from '@/components/ui/Motion';
import { SkeletonDashboardCard } from '@/components/ui/Skeleton';
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
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  className = '',
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const isActive = className.includes('ring-2');
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
};

interface RecentMeetingProps {
  meeting: {
    id: string;
    title: string;
    date: string;
    duration: string;
    participants: number;
    status: 'completed' | 'in-progress' | 'scheduled';
  };
}

const RecentMeetingCard: React.FC<RecentMeetingProps> = ({ meeting }) => {
  const statusConfig = {
    completed: {
      colors: 'bg-gradient-to-r from-success-100 to-success-50 text-success-800 dark:from-success-900/30 dark:to-success-800/20 dark:text-success-400',
      icon: <StopCircle className="w-4 h-4" aria-hidden="true" />,
    },
    'in-progress': {
      colors: 'bg-gradient-to-r from-primary-100 to-primary-50 text-primary-800 dark:from-primary-900/30 dark:to-primary-800/20 dark:text-primary-400',
      icon: <PlayCircle className="w-4 h-4 animate-pulse-soft" aria-hidden="true" />,
    },
    scheduled: {
      colors: 'bg-gradient-to-r from-neutral-100 to-neutral-50 text-neutral-800 dark:from-neutral-700/50 dark:to-neutral-600/30 dark:text-neutral-300',
      icon: <PauseCircle className="w-4 h-4" aria-hidden="true" />,
    },
  };

  const config = statusConfig[meeting.status];

  return (
    <MotionCard
      className={cn(
        'group relative overflow-hidden',
        // Design system styling
        'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
        'border border-neutral-200/60 dark:border-neutral-700/60',
        'rounded-xl shadow-soft',
        'p-5', // 8px grid: 20px padding
        'transition-all duration-300 ease-out',
        // Enhanced hover states
        'hover:bg-white/95 dark:hover:bg-neutral-800/95',
        'hover:shadow-md hover:border-neutral-300/60 dark:hover:border-neutral-600/60',
        'hover:-translate-y-0.5'
      )}
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Enhanced gradient overlay with design system colors */}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-50/20 to-primary-50/20 dark:from-neutral-800/20 dark:to-primary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Meeting title with improved typography */}
          <h4 className={cn(
            'text-h4 text-neutral-900 dark:text-neutral-100 truncate mb-3',
            'group-hover:text-primary-600 dark:group-hover:text-primary-400',
            'transition-colors duration-200'
          )}>
            {meeting.title}
          </h4>
          
          {/* Meeting metadata with better spacing and accessibility */}
          <div className="flex flex-wrap items-center gap-4 text-body-sm text-contrast-accessible">
            <div className="flex items-center gap-1.5 group-hover:text-contrast-medium transition-colors duration-200">
              <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span className="truncate" title={meeting.date}>{meeting.date}</span>
            </div>
            <div className="flex items-center gap-1.5 group-hover:text-contrast-medium transition-colors duration-200">
              <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span title={`Duration: ${meeting.duration}`}>{meeting.duration}</span>
            </div>
            <div className="flex items-center gap-1.5 group-hover:text-contrast-medium transition-colors duration-200">
              <Users className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span title={`${meeting.participants} participants`}>{meeting.participants}</span>
            </div>
          </div>
        </div>
        
        {/* Status badge with improved accessibility */}
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'text-label-sm font-medium shadow-soft',
          'group-hover:scale-105 transition-all duration-200 flex-shrink-0',
          config.colors
        )}>
          {config.icon}
          <span className="capitalize" aria-label={`Status: ${meeting.status.replace('-', ' ')}`}>
            <span className="hidden sm:inline">{meeting.status.replace('-', ' ')}</span>
            <span className="sm:hidden" aria-hidden="true">
              {meeting.status === 'in-progress' ? 'Live' : meeting.status === 'completed' ? 'Done' : 'Soon'}
            </span>
          </span>
        </div>
      </div>
    </MotionCard>
  );
};

const QuickActions: React.FC = () => {
  const { startMeeting } = useMeetingStore();
  const { addNotification } = useAppStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleStartMeeting = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      await startMeeting({
        id: '', // Will be generated by the service
        title: `Meeting ${new Date().toLocaleTimeString()}`,
        type: MeetingType.TEAM_STANDUP,
        status: 'active' as const,
        hostId: user?.uid || 'anonymous',
        createdBy: user?.uid || 'anonymous',
        participants: [],
        keywords: [],
        notes: [],
        appliedRules: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      addNotification({
        type: 'success',
        title: 'Meeting Started',
        message: 'Your meeting has been started successfully.',
        persistent: false,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to Start Meeting',
        message: 'There was an error starting your meeting. Please try again.',
        persistent: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    {
      id: 'start-meeting',
      label: 'Start New Meeting',
      icon: Mic,
      onClick: handleStartMeeting,
      primary: true,
      loading,
      gradientFrom: 'from-primary-500',
      gradientTo: 'to-primary-700',
      hoverFrom: 'hover:from-primary-600',
      hoverTo: 'hover:to-primary-800',
    },
    {
      id: 'schedule-meeting',
      label: 'Schedule Meeting',
      icon: Plus,
      onClick: () => console.log('Schedule meeting'),
      gradientFrom: 'from-secondary-100',
      gradientTo: 'to-primary-100',
      hoverFrom: 'hover:from-secondary-200',
      hoverTo: 'hover:to-primary-200',
    },
    {
      id: 'view-analytics',
      label: 'View Analytics',
      icon: BarChart3,
      onClick: () => console.log('View analytics'),
      gradientFrom: 'from-purple-100',
      gradientTo: 'to-pink-100',
      hoverFrom: 'hover:from-purple-200',
      hoverTo: 'hover:to-pink-200',
    },
  ];

  return (
    <MotionCard className={cn(
      'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
      'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
      'p-6', // 8px grid: 24px padding
      'hover:bg-white/95 dark:hover:bg-neutral-800/95'
    )}>
      <h3 className="text-h3 text-neutral-900 dark:text-neutral-100 mb-6">
        Quick Actions
      </h3>
      <MotionList className="space-y-4"> {/* 8px grid: 16px spacing */}
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          if (action.primary) {
            return (
              <PrimaryButton
                key={action.id}
                size="lg"
                fullWidth
                loading={action.loading}
                disabled={action.loading}
                leftIcon={<Icon />}
                onClick={action.onClick}
                className="min-h-12" // Ensure adequate touch target
              >
                {action.label}
              </PrimaryButton>
            );
          }
          
          return (
            <SecondaryButton
              key={action.id}
              size="lg"
              fullWidth
              leftIcon={<Icon />}
              onClick={action.onClick}
              className="min-h-12" // Ensure adequate touch target
            >
              {action.label}
            </SecondaryButton>
          );
        })}
      </MotionList>
    </MotionCard>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { recentMeetings: meetings, isInMeeting, currentMeeting } = useMeetingStore();
  const { addNotification } = useAppStore();
  const costSummary = useCostSummary();
  const [isLoading, setIsLoading] = useState(true);
  const [statsReady, setStatsReady] = useState(false);

  // Mock data for demonstration
  const dashboardStats = {
    totalMeetings: meetings.length || 12,
    activeMeetings: isInMeeting ? 1 : 0,
    totalHours: 48.5,
    participants: 156,
  };

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setStatsReady(true), 200);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const recentMeetings = [
    {
      id: '1',
      title: 'Weekly Team Sync',
      date: 'Today, 2:00 PM',
      duration: '45 min',
      participants: 8,
      status: 'completed' as const,
    },
    {
      id: '2',
      title: 'Product Planning',
      date: 'Yesterday, 10:00 AM',
      duration: '1h 30min',
      participants: 6,
      status: 'completed' as const,
    },
    {
      id: '3',
      title: 'Client Presentation',
      date: 'Tomorrow, 3:00 PM',
      duration: '1h',
      participants: 4,
      status: 'scheduled' as const,
    },
  ];

  useEffect(() => {
    // Add welcome notification after loading
    if (user && !isLoading) {
      const timer = setTimeout(() => {
        addNotification({
          type: 'info',
          title: 'Welcome back!',
          message: `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.displayName || user.email?.split('@')[0] || 'User'}`,
          persistent: false,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, addNotification, isLoading]);

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
              Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}
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
            className={isInMeeting ? "ring-2 ring-red-500/50" : ""}
          />
          <DashboardCard
            title="Total Hours"
            value={statsReady ? `${dashboardStats.totalHours}h` : "0h"}
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
              {recentMeetings.map((meeting, index) => (
                <MotionCard
                  key={meeting.id}
                  variants={fadeInUpVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: index * 0.1 }}
                  className="p-0 shadow-none border-0 bg-transparent"
                >
                  <RecentMeetingCard meeting={meeting} />
                </MotionCard>
              ))}
            </MotionList>
          </MotionCard>

          {/* Sidebar with consistent spacing */}
          <div className="space-y-6"> {/* 8px grid: 24px spacing */}
            <QuickActions />
            
            {/* Today's Schedule with improved styling */}
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
                {[
                  { time: '2:00 PM', title: 'Team Sync', color: 'from-primary-400 to-primary-600', bg: 'hover:bg-primary-50 dark:hover:bg-primary-900/20', text: 'group-hover/item:text-primary-600 dark:group-hover/item:text-primary-400', pulse: true },
                  { time: '4:30 PM', title: 'Client Call', color: 'from-success-400 to-emerald-500', bg: 'hover:bg-success-50 dark:hover:bg-success-900/20', text: 'group-hover/item:text-success-600 dark:group-hover/item:text-success-400' },
                  { time: '6:00 PM', title: 'Planning Session', color: 'from-purple-400 to-pink-500', bg: 'hover:bg-purple-50 dark:hover:bg-purple-900/20', text: 'group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400' },
                ].map((item, index) => (
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
          </div>
        </div>

        {/* Cost Tracking Section */}
        <MotionCard 
          className="p-0 shadow-none border-0 bg-transparent"
          variants={fadeInUpVariants}
        >
          <CostTracker />
        </MotionCard>
      </MotionList>
    </MainLayout>
  );
}