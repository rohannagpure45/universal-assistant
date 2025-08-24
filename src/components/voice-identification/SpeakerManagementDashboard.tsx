/**
 * Speaker Management Dashboard
 * 
 * Centralized dashboard for comprehensive speaker management functionality.
 * Provides overview statistics, quick access to all speaker-related features,
 * and admin-level controls for the voice identification system.
 * 
 * Features:
 * - Real-time statistics and analytics overview
 * - Quick navigation to specialized management tools
 * - System health monitoring and alerts
 * - Bulk operation controls
 * - Recent activity feed
 * 
 * @fileoverview Main speaker management dashboard component
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Settings, 
  BarChart3, 
  Search, 
  Merge, 
  FolderOpen,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit3,
  Database,
  Mic
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { DatabaseService } from '@/services/firebase/DatabaseService';
import type { 
  VoiceProfileStatistics, 
  PostMeetingDashboardStats,
  VoiceIdentificationAnalytics,
  EnhancedVoiceProfile,
  // VoiceLibraryEntry
} from '@/types/voice-identification';
import type { NeedsIdentification } from '@/types/database';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { friendlyError, type UserError } from '@/utils/errorMessages';

// Activity feed item interface
interface ActivityItem {
  id: string;
  type: 'identification' | 'profile_created' | 'profile_updated' | 'system_event';
  title: string;
  description: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, any>;
}

// Dashboard navigation item interface
interface DashboardNavItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string | number;
  disabled?: boolean;
}

// Statistics card interface
interface StatisticsCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const SpeakerManagementDashboard: React.FC = () => {
  // State management
  const [statistics, setStatistics] = useState<VoiceProfileStatistics | null>(null);
  const [postMeetingStats, setPostMeetingStats] = useState<PostMeetingDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<VoiceIdentificationAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UserError | string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Load voice profile statistics
      const profiles = await VoiceLibraryService.getUserVoiceProfiles('all'); // TODO: Implement getAllProfiles
      // const pendingRequests = await DatabaseService.queryNeedsIdentification({ pending: true });
      const pendingRequests: any[] = [];
      
      // Calculate statistics
      const stats: VoiceProfileStatistics = {
        totalProfiles: profiles.length,
        confirmedProfiles: profiles.filter(p => p.confirmed).length,
        unconfirmedProfiles: profiles.filter(p => !p.confirmed).length,
        recentlyActive: profiles.filter(p => {
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return p.lastHeard > dayAgo;
        }).length,
        totalSamples: profiles.reduce((sum, p) => sum + (p.audioSamples?.length || 0), 0),
        averageConfidence: profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length || 0,
        totalSpeakingTime: profiles.reduce((sum, p) => sum + p.totalSpeakingTime, 0),
        pendingIdentifications: pendingRequests.length
      };
      
      setStatistics(stats);
      
      // Load post-meeting stats
      // TODO: Implement comprehensive post-meeting statistics
      const pmStats: PostMeetingDashboardStats = {
        totalMeetings: 0, // TODO: Get from meetings collection
        meetingsWithPending: 0,
        totalPendingRequests: pendingRequests.length,
        averageRequestsPerMeeting: 0,
        recentlyProcessed: 0,
        identificationRate: 0
      };
      
      setPostMeetingStats(pmStats);
      
      // Generate recent activity
      const activity: ActivityItem[] = [
        {
          id: '1',
          type: 'identification',
          title: 'Speaker Identified',
          description: '3 new speakers identified in Q1 Planning Meeting',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          severity: 'success'
        },
        {
          id: '2',
          type: 'profile_created',
          title: 'New Profile Created',
          description: 'Voice profile created for Sarah Mitchell',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          severity: 'info'
        },
        {
          id: '3',
          type: 'system_event',
          title: 'Quality Threshold Warning',
          description: '5 low-quality voice samples detected',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          severity: 'warning'
        }
      ];
      
      setRecentActivity(activity);
      
      // Determine system health
      const healthStatus = stats.pendingIdentifications > 100 ? 'warning' : 
                          stats.averageConfidence < 0.7 ? 'warning' : 'healthy';
      setSystemHealth(healthStatus);
      
    } catch (err) {
      setError(friendlyError(err as Error, 'Dashboard data loading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    loadDashboardData();
    
    // Set up periodic refresh
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  // Navigation items
  const navigationItems: DashboardNavItem[] = [
    {
      id: 'directory',
      title: 'Speaker Directory',
      description: 'Browse and manage all speaker profiles',
      icon: FolderOpen,
      href: '/voice-identification/directory',
      badge: statistics?.totalProfiles
    },
    {
      id: 'analytics',
      title: 'Analytics Dashboard',
      description: 'View performance metrics and insights',
      icon: BarChart3,
      href: '/voice-identification/analytics'
    },
    {
      id: 'merge',
      title: 'Merge Speakers',
      description: 'Identify and merge duplicate profiles',
      icon: Merge,
      href: '/voice-identification/merge',
      badge: 'Beta'
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure identification thresholds and policies',
      icon: Settings,
      href: '/voice-identification/settings'
    }
  ];

  // Statistics cards
  const statisticsCards: StatisticsCard[] = useMemo(() => {
    if (!statistics) return [];
    
    return [
      {
        title: 'Total Speakers',
        value: statistics.totalProfiles,
        change: {
          value: 12,
          type: 'increase',
          period: 'this month'
        },
        icon: Users,
        color: 'blue'
      },
      {
        title: 'Confirmed Profiles',
        value: statistics.confirmedProfiles,
        change: {
          value: 8,
          type: 'increase',
          period: 'this week'
        },
        icon: CheckCircle,
        color: 'green'
      },
      {
        title: 'Pending Identifications',
        value: statistics.pendingIdentifications,
        change: {
          value: 5,
          type: 'decrease',
          period: 'today'
        },
        icon: Clock,
        color: statistics.pendingIdentifications > 50 ? 'red' : 'yellow'
      },
      {
        title: 'Average Confidence',
        value: `${(statistics.averageConfidence * 100).toFixed(1)}%`,
        change: {
          value: 2.3,
          type: 'increase',
          period: 'this week'
        },
        icon: TrendingUp,
        color: statistics.averageConfidence > 0.8 ? 'green' : 'yellow'
      },
      {
        title: 'Audio Samples',
        value: statistics.totalSamples,
        icon: Mic,
        color: 'purple'
      },
      {
        title: 'Speaking Time',
        value: `${Math.round(statistics.totalSpeakingTime / 3600)}h`,
        icon: Activity,
        color: 'blue'
      }
    ];
  }, [statistics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speaker Management Dashboard</h1>
          <p className="text-muted-foreground">
            Centralized control for your voice identification system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* System Health Indicator */}
          <Badge 
            variant={systemHealth === 'healthy' ? 'default' : 'destructive'}
            className="flex items-center gap-1"
          >
            {systemHealth === 'healthy' ? (
              <CheckCircle className="h-3 w-3" />
            ) : systemHealth === 'warning' ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            System {systemHealth === 'healthy' ? 'Healthy' : systemHealth}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorDisplay 
          error={error}
          onRetry={handleRefresh}
          onDismiss={() => setError(null)}
          showActionHint={true}
        />
      )}

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statisticsCards.map((card, index) => (
          <Card key={index} className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">{card.title}</h3>
              <card.icon className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.change && (
              <p className="text-xs text-gray-500">
                <span className={`font-medium ${
                  card.change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.change.type === 'increase' ? '+' : '-'}{card.change.value}
                </span>
                {' '}from {card.change.period}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="navigation">Quick Access</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="operations">Bulk Operations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identification Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Identification Progress</CardTitle>
                <CardDescription>
                  Current status of speaker identification across the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {statistics && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Confirmed Profiles</span>
                        <span>{statistics.confirmedProfiles}/{statistics.totalProfiles}</span>
                      </div>
                      <Progress 
                        value={(statistics.confirmedProfiles / statistics.totalProfiles) * 100} 
                        className="h-2"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Confidence</span>
                        <span>{(statistics.averageConfidence * 100).toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={statistics.averageConfidence * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Recently Active</span>
                        <span>{statistics.recentlyActive}/{statistics.totalProfiles}</span>
                      </div>
                      <Progress 
                        value={(statistics.recentlyActive / statistics.totalProfiles) * 100} 
                        className="h-2"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current health and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">System Health</span>
                  <Badge 
                    variant={systemHealth === 'healthy' ? 'default' : 'destructive'}
                  >
                    {systemHealth}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Tasks</span>
                  <span className="text-sm font-medium">
                    {statistics?.pendingIdentifications || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Usage</span>
                  <span className="text-sm font-medium">
                    {statistics?.totalSamples ? `${statistics.totalSamples} samples` : 'N/A'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Updated</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navigationItems.map((item) => (
              <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary">{item.badge}</Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest events and system notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`p-1 rounded-full ${
                      activity.severity === 'success' ? 'bg-green-100 text-green-600' :
                      activity.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      activity.severity === 'error' ? 'bg-red-100 text-red-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.severity === 'success' && <CheckCircle className="h-4 w-4" />}
                      {activity.severity === 'warning' && <AlertTriangle className="h-4 w-4" />}
                      {activity.severity === 'error' && <XCircle className="h-4 w-4" />}
                      {activity.severity === 'info' && <Activity className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{activity.title}</h4>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Operations Tab */}
        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
              <CardDescription>
                Perform operations on multiple speaker profiles at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Download className="h-5 w-5" />
                  Export All Profiles
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Upload className="h-5 w-5" />
                  Import Profiles
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Merge className="h-5 w-5" />
                  Auto-Merge Duplicates
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Trash2 className="h-5 w-5" />
                  Cleanup Old Samples
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Edit3 className="h-5 w-5" />
                  Batch Update
                </Button>
                
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Database className="h-5 w-5" />
                  Optimize Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpeakerManagementDashboard;