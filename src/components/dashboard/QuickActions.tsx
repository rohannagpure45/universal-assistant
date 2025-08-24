'use client';

import React from 'react';
import { Mic } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/Button';
import { MotionCard } from '@/components/ui/Motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface QuickActionsProps {
  className?: string;
}

export const QuickActions = React.memo<QuickActionsProps>(({ className }) => {
  const handleMeetingClick = () => {
    console.log('🎯 Meeting button clicked - navigating to /meeting');
  };

  return (
    <MotionCard className={cn(
      'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
      'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
      'p-6', // 8px grid: 24px padding
      'hover:bg-white/95 dark:hover:bg-neutral-800/95',
      className
    )}>
      <h3 className="text-h3 text-neutral-900 dark:text-neutral-100 mb-6">
        Quick Actions
      </h3>
      <Link href="/meeting" className="block" onClick={handleMeetingClick}>
        <PrimaryButton
          size="lg"
          fullWidth
          leftIcon={<Mic />}
          className="min-h-12 transition-transform hover:scale-[1.02] active:scale-[0.98]" // Enhanced interaction feedback
          aria-label="Start New Meeting"
        >
          Start New Meeting
        </PrimaryButton>
      </Link>
    </MotionCard>
  );
});

QuickActions.displayName = 'QuickActions';