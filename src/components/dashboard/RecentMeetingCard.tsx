'use client';

import React from 'react';
import { Calendar, Clock, Users, PlayCircle, StopCircle, PauseCircle } from 'lucide-react';
import { MotionCard } from '@/components/ui/Motion';
import { cn } from '@/lib/utils';

interface RecentMeetingProps {
  meeting: {
    id: string;
    title: string;
    date: string;
    duration: string;
    participants: number;
    status: 'completed' | 'in-progress' | 'scheduled';
  };
  onMeetingClick?: (meetingId: string) => void;
}

export const RecentMeetingCard = React.memo<RecentMeetingProps>(({ 
  meeting, 
  onMeetingClick 
}) => {
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

  const handleClick = React.useCallback(() => {
    onMeetingClick?.(meeting.id);
  }, [meeting.id, onMeetingClick]);

  return (
    <MotionCard
      className={cn(
        'group relative overflow-hidden cursor-pointer',
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
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`View details for ${meeting.title}`}
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
});

RecentMeetingCard.displayName = 'RecentMeetingCard';