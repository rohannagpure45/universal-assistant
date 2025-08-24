import { db } from '@/lib/firebase/client';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import type { Meeting, User } from '@/types';

// Dashboard statistics interface
export interface DashboardStats {
  totalMeetings: number;
  activeMeetings: number;
  totalHours: number;
  uniqueParticipants: number;
}

// Cache for dashboard queries (2 minutes)
const dashboardCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Utility functions for caching
const getCachedResult = (key: string): any | null => {
  const cached = dashboardCache.get(key);
  if (!cached) return null;
  
  if (Date.now() > cached.timestamp + cached.ttl) {
    dashboardCache.delete(key);
    return null;
  }
  
  return cached.data;
};

const setCachedResult = (key: string, data: any): void => {
  dashboardCache.set(key, {
    data: JSON.parse(JSON.stringify(data)), // Deep clone
    timestamp: Date.now(),
    ttl: CACHE_TTL
  });
};

// Utility to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    if (value && typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        // Firestore Timestamp
        converted[key] = value.toDate();
      } else if (value.seconds && value.nanoseconds !== undefined) {
        // Firestore Timestamp-like object
        converted[key] = new Timestamp(value.seconds, value.nanoseconds).toDate();
      } else if (Array.isArray(value)) {
        // Handle arrays recursively
        converted[key] = value.map(convertTimestamps);
      } else if (typeof value === 'object') {
        // Handle nested objects recursively
        converted[key] = convertTimestamps(value);
      }
    }
  });
  
  return converted;
};

export class DashboardService {
  /**
   * Get comprehensive dashboard statistics for a user
   */
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    const cacheKey = `dashboard-stats:${userId}`;
    
    // Check cache first
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Check if user is admin to determine query scope
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() as User : null;
      const isAdmin = userData?.isAdmin || false;

      let meetings: Meeting[] = [];
      
      if (isAdmin) {
        // Admin users can see all meetings
        const meetingQuery = query(
          collection(db, 'meetings'),
          orderBy('startTime', 'desc'),
          limit(1000) // Reasonable limit for dashboard calculations
        );
        
        const snapshot = await getDocs(meetingQuery);
        meetings = snapshot.docs.map(doc => 
          convertTimestamps({ meetingId: doc.id, ...doc.data() })
        ) as Meeting[];
      } else {
        // Regular users see only meetings they participated in
        const meetingQuery = query(
          collection(db, 'meetings'),
          where('participantIds', 'array-contains', userId),
          orderBy('startTime', 'desc'),
          limit(500) // Reasonable limit for regular users
        );
        
        const snapshot = await getDocs(meetingQuery);
        meetings = snapshot.docs.map(doc => 
          convertTimestamps({ meetingId: doc.id, ...doc.data() })
        ) as Meeting[];
      }

      // Calculate statistics
      const stats = this.calculateStats(meetings);
      
      // Cache the results
      setCachedResult(cacheKey, stats);
      
      return stats;
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw new Error('Unable to load dashboard statistics');
    }
  }

  /**
   * Get user meetings with basic filtering
   */
  static async getUserMeetings(
    userId: string, 
    limit: number = 10
  ): Promise<Meeting[]> {
    const cacheKey = `user-meetings:${userId}:${limit}`;
    
    // Check cache first
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const meetingQuery = query(
        collection(db, 'meetings'),
        where('participantIds', 'array-contains', userId),
        orderBy('startTime', 'desc'),
        limit(limit)
      );
      
      const snapshot = await getDocs(meetingQuery);
      const meetings = snapshot.docs.map(doc => 
        convertTimestamps({ meetingId: doc.id, ...doc.data() })
      ) as Meeting[];
      
      // Cache the results
      setCachedResult(cacheKey, meetings);
      
      return meetings;
    } catch (error) {
      console.error('Failed to get user meetings:', error);
      throw new Error('Unable to load recent meetings');
    }
  }

  /**
   * Calculate dashboard statistics from meetings array
   */
  private static calculateStats(meetings: Meeting[]): DashboardStats {
    // Total meetings
    const totalMeetings = meetings.length;

    // Active meetings (status = 'active')
    const activeMeetings = meetings.filter(meeting => 
      meeting.status === 'active'
    ).length;

    // Total hours - calculate from startTime and endTime
    const totalHours = meetings.reduce((total, meeting) => {
      if (meeting.endTime && meeting.startTime) {
        const startTime = meeting.startTime instanceof Date 
          ? meeting.startTime 
          : new Date(meeting.startTime);
        const endTime = meeting.endTime instanceof Date 
          ? meeting.endTime 
          : new Date(meeting.endTime);
        
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        return total + Math.max(0, durationHours); // Ensure non-negative
      }
      return total;
    }, 0);

    // Unique participants - count unique user IDs from participantIds arrays
    const allParticipantIds = new Set<string>();
    meetings.forEach(meeting => {
      if (meeting.participantIds && Array.isArray(meeting.participantIds)) {
        meeting.participantIds.forEach(id => allParticipantIds.add(id));
      }
      // Also include hostId if it exists
      if (meeting.hostId) {
        allParticipantIds.add(meeting.hostId);
      }
      // Fallback to participants array if participantIds is not available
      if ((!meeting.participantIds || meeting.participantIds.length === 0) && meeting.participants) {
        meeting.participants.forEach(participant => {
          if (participant.userId) {
            allParticipantIds.add(participant.userId);
          }
        });
      }
    });

    const uniqueParticipants = allParticipantIds.size;

    return {
      totalMeetings,
      activeMeetings,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      uniqueParticipants
    };
  }

  /**
   * Clear dashboard cache for a specific user
   */
  static clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    dashboardCache.forEach((_, key) => {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => dashboardCache.delete(key));
  }

  /**
   * Clear all dashboard cache
   */
  static clearAllCache(): void {
    dashboardCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: dashboardCache.size,
      keys: Array.from(dashboardCache.keys())
    };
  }
}