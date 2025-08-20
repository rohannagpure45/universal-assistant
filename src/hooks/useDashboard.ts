'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useCostSummary } from '@/stores/costStore';
import type { Meeting } from '@/types';

export interface DashboardStats {
  totalMeetings: number;
  activeMeetings: number;
  totalHours: number;
  participants: number;
}

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

  // Memoized dashboard stats calculation for performance
  const dashboardStats: DashboardStats = useMemo(() => ({
    totalMeetings: meetings.length,
    activeMeetings: isInMeeting ? 1 : 0,
    totalHours: meetings.reduce((total, meeting) => {
      if (meeting.endTime && meeting.startTime) {
        const duration = (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60 * 60);
        return total + duration;
      }
      return total;
    }, 0),
    participants: meetings.reduce((total, meeting) => total + meeting.participants.length, 0),
  }), [meetings, isInMeeting]);

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

  // Optimized data loading with proper cleanup
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (user?.uid) {
        try {
          setError(null);
          await loadRecentMeetings(user.uid, 10);
        } catch (error) {
          console.error('Failed to load recent meetings:', error);
          if (isMounted) {
            const errorMessage = 'Unable to load your recent meetings. Please refresh the page to try again.';
            setError(errorMessage);
            addNotification({
              type: 'error',
              title: 'Failed to Load Meetings',
              message: errorMessage,
              persistent: false,
            });
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
        setTimeout(() => {
          if (isMounted) setStatsReady(true);
        }, 200);
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.uid, loadRecentMeetings, addNotification]);

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
      setIsLoading(true);
      setError(null);
      setStatsReady(false);
      
      try {
        await loadRecentMeetings(user.uid, 10);
        setIsLoading(false);
        setTimeout(() => setStatsReady(true), 200);
      } catch (error) {
        console.error('Retry failed:', error);
        setError('Failed to reload dashboard data');
        setIsLoading(false);
      }
    }
  }, [user?.uid, loadRecentMeetings]);

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