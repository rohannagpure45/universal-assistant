/**
 * Post-Meeting Identification Dashboard
 * 
 * Main dashboard for managing post-meeting voice identification workflows.
 * Provides an overview of unidentified speakers, recent meetings requiring
 * identification, progress tracking, and quick access to identification tools.
 * 
 * Features:
 * - Meeting list with unidentified speaker counts
 * - Progress tracking and statistics
 * - Bulk operations for multiple meetings
 * - Quick identification shortcuts
 * - Real-time updates and notifications
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Calendar,
  Clock, 
  Users, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  Filter,
  RefreshCw,
  Play,
  User,
  Search,
  Settings
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useVoiceLibrary } from '../../hooks/useVoiceLibrary';
import { NeedsIdentificationService } from '../../services/firebase/NeedsIdentificationService';
import type { Meeting } from '../../types/index';
import type { NeedsIdentification } from '../../types/database';
import type { EnhancedVoiceProfile } from '../../types/voice-identification';

interface PostMeetingIdentificationDashboardProps {
  /** Current user ID */
  userId?: string;
  /** Whether user has admin access */
  isAdmin?: boolean;
  /** Callback when meeting is selected for identification */
  onMeetingSelect?: (meetingId: string) => void;
  /** Callback when identification workflow is opened */
  onStartIdentification?: (requests: NeedsIdentification[]) => void;
  /** Custom CSS classes */
  className?: string;
}

interface MeetingWithPending {
  meeting: Meeting;
  pendingCount: number;
  pendingRequests: NeedsIdentification[];
  lastActivity: Date;
}

interface DashboardStats {
  totalMeetings: number;
  meetingsWithPending: number;
  totalPendingRequests: number;
  averageRequestsPerMeeting: number;
  recentlyProcessed: number;
  identificationRate: number;
}

/**
 * Post-Meeting Identification Dashboard Component
 */
export const PostMeetingIdentificationDashboard: React.FC<PostMeetingIdentificationDashboardProps> = ({
  userId,
  isAdmin = false,
  onMeetingSelect,
  onStartIdentification,
  className = ''
}) => {
  // State management
  const [meetingsWithPending, setMeetingsWithPending] = useState<MeetingWithPending[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMeetings: 0,
    meetingsWithPending: 0,
    totalPendingRequests: 0,
    averageRequestsPerMeeting: 0,
    recentlyProcessed: 0,
    identificationRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeetings, setSelectedMeetings] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Voice library hook for additional data
  const { voiceProfiles, stats: voiceStats, refreshData: refreshVoiceData } = useVoiceLibrary({
    userId: isAdmin ? undefined : userId,
    realtime: true,
    includeUnconfirmed: true
  });

  /**
   * Load meetings with pending identification requests
   */
  const loadMeetingsWithPending = useCallback(async () => {
    try {
      setError(null);
      
      // Get all pending requests
      const pendingRequests = await NeedsIdentificationService.getPendingRequests(50);
      
      if (pendingRequests.length === 0) {
        setMeetingsWithPending([]);
        setDashboardStats({
          totalMeetings: 0,
          meetingsWithPending: 0,
          totalPendingRequests: 0,
          averageRequestsPerMeeting: 0,
          recentlyProcessed: 0,
          identificationRate: 100
        });
        return;
      }

      // Group by meeting
      const meetingGroups = new Map<string, NeedsIdentification[]>();
      pendingRequests.forEach(request => {
        const existing = meetingGroups.get(request.meetingId) || [];
        existing.push(request);
        meetingGroups.set(request.meetingId, existing);
      });

      // Create meeting objects with pending data
      const meetingsWithPendingData: MeetingWithPending[] = Array.from(meetingGroups.entries()).map(
        ([meetingId, requests]) => {
          const firstRequest = requests[0];
          
          // Create a meeting object from the request data
          const meeting: Meeting = {
            id: meetingId,
            meetingId,
            meetingTypeId: firstRequest.meetingTypeId,
            hostId: firstRequest.hostId,
            participantIds: [firstRequest.hostId],
            createdBy: firstRequest.hostId,
            title: firstRequest.meetingTitle,
            type: 'general' as any,
            participants: [],
            transcript: [],
            notes: [],
            keywords: [],
            appliedRules: [],
            startTime: firstRequest.meetingDate,
            status: 'ended',
            createdAt: firstRequest.meetingDate,
            updatedAt: new Date()
          };

          return {
            meeting,
            pendingCount: requests.length,
            pendingRequests: requests,
            lastActivity: new Date(Math.max(...requests.map(r => r.createdAt.getTime())))
          };
        }
      );

      // Sort by priority (number of pending requests, then by recency)
      meetingsWithPendingData.sort((a, b) => {
        if (a.pendingCount !== b.pendingCount) {
          return b.pendingCount - a.pendingCount;
        }
        return b.lastActivity.getTime() - a.lastActivity.getTime();
      });

      setMeetingsWithPending(meetingsWithPendingData);

      // Calculate dashboard statistics
      const stats: DashboardStats = {
        totalMeetings: meetingsWithPendingData.length,
        meetingsWithPending: meetingsWithPendingData.length,
        totalPendingRequests: pendingRequests.length,
        averageRequestsPerMeeting: meetingsWithPendingData.length > 0 
          ? Math.round((pendingRequests.length / meetingsWithPendingData.length) * 10) / 10
          : 0,
        recentlyProcessed: 0, // Would need additional data to calculate
        identificationRate: 0 // Would need additional data to calculate
      };

      setDashboardStats(stats);
    } catch (err) {
      console.error('Failed to load meetings with pending identifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meetings data');
    }
  }, []);

  /**
   * Refresh all dashboard data
   */
  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadMeetingsWithPending(),
        refreshVoiceData()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [loadMeetingsWithPending, refreshVoiceData]);

  /**
   * Get priority level for a meeting based on pending count and age
   */
  const getMeetingPriority = useCallback((meeting: MeetingWithPending): 'high' | 'medium' | 'low' => {
    const hoursOld = (Date.now() - meeting.lastActivity.getTime()) / (1000 * 60 * 60);
    const pendingCount = meeting.pendingCount;

    if (pendingCount >= 5 || hoursOld > 48) return 'high';
    if (pendingCount >= 3 || hoursOld > 24) return 'medium';
    return 'low';
  }, []);

  /**
   * Filter meetings based on current filters
   */
  const filteredMeetings = meetingsWithPending.filter(meeting => {
    // Status filter
    if (filterStatus !== 'all') {
      const priority = getMeetingPriority(meeting);
      if (priority !== filterStatus) return false;
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesTitle = meeting.meeting.title.toLowerCase().includes(searchLower);
      const matchesSpeakers = meeting.pendingRequests.some(req => 
        req.speakerLabel.toLowerCase().includes(searchLower)
      );
      if (!matchesTitle && !matchesSpeakers) return false;
    }

    return true;
  });

  /**
   * Handle meeting selection
   */
  const handleMeetingSelect = useCallback((meeting: MeetingWithPending) => {
    if (onMeetingSelect) {
      onMeetingSelect(meeting.meeting.id);
    }
  }, [onMeetingSelect]);

  /**
   * Handle bulk identification start
   */
  const handleBulkIdentification = useCallback(() => {
    const selectedRequests = meetingsWithPending
      .filter(meeting => selectedMeetings.has(meeting.meeting.id))
      .flatMap(meeting => meeting.pendingRequests);
    
    if (onStartIdentification && selectedRequests.length > 0) {
      onStartIdentification(selectedRequests);
    }
  }, [selectedMeetings, meetingsWithPending, onStartIdentification]);

  /**
   * Toggle meeting selection
   */
  const toggleMeetingSelection = useCallback((meetingId: string) => {
    setSelectedMeetings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId);
      } else {
        newSet.add(meetingId);
      }
      return newSet;
    });
  }, []);

  // Initialize data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await loadMeetingsWithPending();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadMeetingsWithPending]);

  /**
   * Get priority badge styles
   */
  const getPriorityBadgeStyles = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Format time ago
   */
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Post-Meeting Voice Identification
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Identify unknown speakers from recent meetings
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          
          {selectedMeetings.size > 0 && (
            <Button
              onClick={handleBulkIdentification}
              className="flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Identify Selected ({selectedMeetings.size})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Meetings</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalMeetings}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Meetings requiring identification
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardStats.totalPendingRequests}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Unknown speakers to identify
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Voice Profiles</p>
              <p className="text-3xl font-bold text-gray-900">{voiceStats.confirmed}</p>
            </div>
            <User className="h-8 w-8 text-green-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {voiceStats.unconfirmed} unconfirmed
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg per Meeting</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardStats.averageRequestsPerMeeting}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Speakers per meeting
          </p>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search meetings or speakers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All Caught Up!
            </h3>
            <p className="text-gray-600">
              No meetings require voice identification at the moment.
            </p>
          </Card>
        ) : (
          filteredMeetings.map((meeting) => {
            const priority = getMeetingPriority(meeting);
            const isSelected = selectedMeetings.has(meeting.meeting.id);
            
            return (
              <Card 
                key={meeting.meeting.id}
                className={`p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleMeetingSelect(meeting)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMeetingSelection(meeting.meeting.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {meeting.meeting.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadgeStyles(priority)}`}>
                          {priority} priority
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{meeting.meeting.startTime.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTimeAgo(meeting.lastActivity)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{meeting.pendingCount} unknown speaker{meeting.pendingCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 font-medium">Unknown Speakers:</p>
                      <div className="flex flex-wrap gap-2">
                        {meeting.pendingRequests.slice(0, 4).map((request, index) => (
                          <span 
                            key={request.id}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                          >
                            {request.speakerLabel}
                          </span>
                        ))}
                        {meeting.pendingRequests.length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-600 rounded-md text-xs">
                            +{meeting.pendingRequests.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMeetingSelect(meeting);
                    }}
                    className="ml-4 flex items-center space-x-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Identify</span>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PostMeetingIdentificationDashboard;