'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useCostSummary } from '@/stores/costStore';
import { DashboardService } from '@/services/firebase/DashboardService';
import type { Meeting } from '@/types';
import type { DashboardStats } from '@/services/firebase/DashboardService';

// DashboardStats interface moved to DashboardService
// Re-export for backwards compatibility
export type { DashboardStats } from '@/services/firebase/DashboardService';

export interface DisplayMeeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
  status: 'completed' | 'in-progress' | 'scheduled';
}

export interface DashboardState {
  isLoading: boolean;
  statsReady: boolean;
  error: string | null;
  dashboardStats: DashboardStats;
  recentMeetingsForDisplay: DisplayMeeting[];
  greetingText: string;
}

/**
 * Custom hook for managing dashboard state and data
 * Provides optimized, memoized dashboard data and actions
 */
export const useDashboard = () => {
  const { user } = useAuthStore();
  const { 
    recentMeetings: meetings, 
    isInMeeting, 
    currentMeeting, 
    loadRecentMeetings, 
    isLoadingRecentMeetings,
    meetingError 
  } = useMeetingStore();
  const { addNotification } = useAppStore();
  const costSummary = useCostSummary();
  
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [statsReady, setStatsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStatsData, setDashboardStatsData] = useState<DashboardStats>({
    totalMeetings: 0,
    activeMeetings: 0,
    totalHours: 0,
    uniqueParticipants: 0
  });

  // Use real dashboard stats from DashboardService
  const dashboardStats: DashboardStats = useMemo(() => {
    // If we have real stats, use them. Otherwise show loading/empty state
    if (statsReady) {
      return dashboardStatsData;
    }
    
    // Show empty stats while loading
    return {
      totalMeetings: 0,
      activeMeetings: isInMeeting ? 1 : 0, // Still show current meeting if in progress
      totalHours: 0,
      uniqueParticipants: 0
    };
  }, [dashboardStatsData, statsReady, isInMeeting]);

  // Memoized conversion of meetings to display format
  const recentMeetingsForDisplay: DisplayMeeting[] = useMemo(() => {
    return meetings.slice(0, 3).map((meeting) => {
      const startTime = new Date(meeting.startTime || meeting.createdAt);
      const endTime = meeting.endTime ? new Date(meeting.endTime) : null;
      
      // Calculate duration
      let duration = 'Unknown';
      if (endTime) {
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        if (durationMinutes < 60) {
          duration = `${durationMinutes} min`;
        } else {
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          duration = minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
        }
      }

      // Format date
      const now = new Date();
      const isToday = startTime.toDateString() === now.toDateString();
      const isYesterday = startTime.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
      
      let date: string;
      if (isToday) {
        date = `Today, ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (isYesterday) {
        date = `Yesterday, ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        date = startTime.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }

      return {
        id: meeting.meetingId,
        title: meeting.title,
        date,
        duration,
        participants: meeting.participants.length,
        status: (meeting.status === 'active' ? 'in-progress' : 'completed') as 'completed' | 'in-progress' | 'scheduled',
      };
    });
  }, [meetings]);

  // Memoized greeting text
  const greetingText = useMemo(() => {
    return `Welcome back, ${user?.displayName || user?.email?.split('@')[0] || 'User'}`;
  }, [user?.displayName, user?.email]);

  // Load dashboard data and recent meetings
  const loadDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    setError(null);
    setStatsReady(false);
    
    try {
      // Load dashboard stats and recent meetings in parallel
      const [statsResult, meetingsResult] = await Promise.allSettled([
        DashboardService.getDashboardStats(user.uid),
        loadRecentMeetings(user.uid, 10)
      ]);
      
      // Handle dashboard stats result
      if (statsResult.status === 'fulfilled') {
        setDashboardStatsData(statsResult.value);
      } else {
        console.error('Failed to load dashboard stats:', statsResult.reason);
        throw new Error('Failed to load dashboard statistics');
      }
      
      // Handle recent meetings result
      if (meetingsResult.status === 'rejected') {
        console.error('Failed to load recent meetings:', meetingsResult.reason);
        // Don't throw here - we can still show stats without recent meetings
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to load dashboard data. Please refresh the page to try again.';
      setError(errorMessage);
      addNotification({
        type: 'error',
        title: 'Failed to Load Dashboard',
        message: errorMessage,
        persistent: false,
      });
    } finally {
      setIsLoading(false);
      // Short delay to show loading state transition
      setTimeout(() => setStatsReady(true), 200);
    }
  }, [user?.uid, loadRecentMeetings, addNotification]);

  // Initial data loading
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle meeting errors from store
  useEffect(() => {
    if (meetingError) {
      setError(meetingError.message);
      addNotification({
        type: 'error',
        title: 'Meeting Error',
        message: meetingError.message,
        persistent: false,
      });
    }
  }, [meetingError, addNotification]);

  // Welcome notification
  const showWelcomeNotification = useCallback(() => {
    if (user && !isLoading && !error) {
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
  }, [user, isLoading, error, addNotification]);

  useEffect(() => {
    const cleanup = showWelcomeNotification();
    return cleanup;
  }, [showWelcomeNotification]);

  // Callback for meeting card clicks
  const handleMeetingClick = useCallback((meetingId: string) => {
    addNotification({
      type: 'info',
      title: 'Meeting Details',
      message: `Opening details for meeting ${meetingId}`,
      persistent: false,
    });
    // TODO: Navigate to meeting details - implement navigation logic here
  }, [addNotification]);

  // Retry function for error recovery
  const retryLoad = useCallback(async () => {
    if (user?.uid) {
      await loadDashboardData();
    }
  }, [loadDashboardData]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const state: DashboardState = {
    isLoading,
    statsReady,
    error,
    dashboardStats,
    recentMeetingsForDisplay,
    greetingText,
  };

  return {
    // State
    ...state,
    
    // Meeting state
    user,
    isInMeeting,
    currentMeeting,
    isLoadingRecentMeetings,
    costSummary,
    
    // Actions
    handleMeetingClick,
    retryLoad,
    clearError,
    addNotification,
  };
};

/**
 * Hook for dashboard error handling
 */
export const useDashboardError = () => {
  const [error, setError] = useState<Error | null>(null);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback((error: Error) => {
    console.error('Dashboard Error:', error);
    setError(error);
    setHasError(true);
    
    // Report to monitoring service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setHasError(false);
  }, []);

  const retry = useCallback(() => {
    clearError();
    window.location.reload();
  }, [clearError]);

  return {
    error,
    hasError,
    handleError,
    clearError,
    retry,
  };
};