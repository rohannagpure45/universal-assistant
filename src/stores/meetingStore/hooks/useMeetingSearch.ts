/**
 * Meeting Search and History Management Hooks
 * 
 * Specialized hooks for meeting search, filtering, and history management.
 */

import { useMeetingStore } from '../../meetingStore';
import type { MeetingType } from '@/types';

/**
 * Hook for recent meetings management
 */
export const useRecentMeetings = () => {
  return useMeetingStore((state) => ({
    meetings: state.recentMeetings,
    isLoading: state.isLoadingRecentMeetings,
    loadRecentMeetings: state.loadRecentMeetings,
    refreshRecentMeetings: state.refreshRecentMeetings,
  }));
};

/**
 * Hook for meeting search and filtering
 */
export const useMeetingSearch = () => {
  return useMeetingStore((state) => ({
    // Search state
    searchTerm: state.searchTerm,
    selectedMeetingType: state.selectedMeetingType,
    dateRange: state.dateRange,
    
    // Search actions
    setSearchTerm: state.setSearchTerm,
    setMeetingTypeFilter: state.setMeetingTypeFilter,
    setDateRange: state.setDateRange,
    searchMeetings: state.searchMeetings,
  }));
};

/**
 * Hook for filtered meetings with computed results
 */
export const useFilteredMeetings = () => {
  return useMeetingStore((state) => {
    const { recentMeetings, searchTerm, selectedMeetingType, dateRange } = state;
    
    let filteredMeetings = [...recentMeetings];
    
    // Apply search term filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredMeetings = filteredMeetings.filter(meeting =>
        meeting.title.toLowerCase().includes(searchLower) ||
        meeting.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply meeting type filter
    if (selectedMeetingType) {
      filteredMeetings = filteredMeetings.filter(meeting => 
        meeting.type === selectedMeetingType
      );
    }
    
    // Apply date range filter
    if (dateRange.start || dateRange.end) {
      filteredMeetings = filteredMeetings.filter(meeting => {
        const meetingDate = meeting.startTime;
        
        if (dateRange.start && meetingDate < dateRange.start) {
          return false;
        }
        
        if (dateRange.end && meetingDate > dateRange.end) {
          return false;
        }
        
        return true;
      });
    }
    
    return {
      filteredMeetings,
      totalCount: recentMeetings.length,
      filteredCount: filteredMeetings.length,
      hasFilters: Boolean(searchTerm.trim() || selectedMeetingType || dateRange.start || dateRange.end),
    };
  });
};

/**
 * Hook for meeting search with advanced features
 */
export const useAdvancedMeetingSearch = () => {
  const store = useMeetingStore();
  
  return {
    searchByText: async (userId: string, searchTerm: string) => {
      return await store.searchMeetings(userId, searchTerm);
    },
    
    searchByDateRange: (startDate: Date, endDate: Date) => {
      return store.recentMeetings.filter(meeting => 
        meeting.startTime >= startDate && meeting.startTime <= endDate
      );
    },
    
    searchByType: (meetingType: MeetingType) => {
      return store.recentMeetings.filter(meeting => meeting.type === meetingType);
    },
    
    searchByParticipant: (participantName: string) => {
      return store.recentMeetings.filter(meeting =>
        meeting.participants.some(participant =>
          participant.userName.toLowerCase().includes(participantName.toLowerCase())
        )
      );
    },
    
    searchByKeywords: (keywords: string[]) => {
      return store.recentMeetings.filter(meeting =>
        keywords.some(keyword =>
          meeting.keywords.some(meetingKeyword =>
            meetingKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        )
      );
    },
    
    getMeetingsByDuration: (minDuration?: number, maxDuration?: number) => {
      return store.recentMeetings.filter(meeting => {
        if (!meeting.endTime) return false;
        
        const duration = meeting.endTime.getTime() - meeting.startTime.getTime();
        
        if (minDuration && duration < minDuration) return false;
        if (maxDuration && duration > maxDuration) return false;
        
        return true;
      });
    },
  };
};