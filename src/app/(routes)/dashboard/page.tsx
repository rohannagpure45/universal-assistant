'use client';

import React, { useEffect } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
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
  
  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-4 sm:p-6 card-hover overflow-hidden ${className}`}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className={`text-fluid-2xl font-bold text-gray-900 dark:text-white transition-all duration-700 ${isVisible ? 'animate-counter' : 'opacity-0'}`}>
            {value}
          </p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm transition-colors duration-200 ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 transition-transform duration-200 group-hover:scale-110 ${
                !trend.isPositive ? 'rotate-180' : ''
              }`} />
              <span className="font-medium">{Math.abs(trend.value)}% from last week</span>
            </div>
          )}
        </div>
        <div className="relative p-3 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl group-hover:scale-105 transition-transform duration-200">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200" />
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-xl bg-blue-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
        </div>
      </div>
      
      {/* Active meeting special indicator */}
      {className.includes('ring-2') && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-red-500 rounded-full pulse-soft" />
        </div>
      )}
    </div>
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
  const statusColors = {
    completed: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-green-400',
    'in-progress': 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-blue-400',
    scheduled: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 dark:from-gray-700 dark:to-slate-700 dark:text-gray-300',
  };

  const statusIcons = {
    completed: <StopCircle className="w-4 h-4" />,
    'in-progress': <PlayCircle className="w-4 h-4 pulse-soft" />,
    scheduled: <PauseCircle className="w-4 h-4" />,
  };

  return (
    <div className="group p-4 border border-gray-200 dark:border-gray-700 rounded-xl card-hover bg-white dark:bg-gray-800 relative overflow-hidden">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            {meeting.title}
          </h4>
          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
              <Calendar className="w-4 h-4 mr-1.5" />
              {meeting.date}
            </div>
            <div className="flex items-center group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
              <Clock className="w-4 h-4 mr-1.5" />
              {meeting.duration}
            </div>
            <div className="flex items-center group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
              <Users className="w-4 h-4 mr-1.5" />
              {meeting.participants}
            </div>
          </div>
        </div>
        <div className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-soft group-hover:scale-105 transition-transform duration-200 ${statusColors[meeting.status]}`}>
          {statusIcons[meeting.status]}
          <span className="ml-1.5 capitalize">{meeting.status.replace('-', ' ')}</span>
        </div>
      </div>
    </div>
  );
};

const QuickActions: React.FC = () => {
  const { startMeeting } = useMeetingStore();
  const { addNotification } = useAppStore();
  const { user } = useAuthStore();

  const handleStartMeeting = async () => {
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
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 card-hover">
      <h3 className="text-fluid-lg font-semibold text-gray-900 dark:text-white mb-6">
        Quick Actions
      </h3>
      <div className="space-y-4">
        <button
          onClick={handleStartMeeting}
          className="group w-full flex items-center justify-center px-4 py-3 min-h-[52px] bg-gradient-primary text-white rounded-xl shadow-glow button-press hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Start a new meeting session"
        >
          <Mic className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-semibold">Start New Meeting</span>
        </button>
        <button className="group w-full flex items-center justify-center px-4 py-3 min-h-[52px] border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl button-press hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <Plus className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-medium">Schedule Meeting</span>
        </button>
        <button className="group w-full flex items-center justify-center px-4 py-3 min-h-[52px] border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl button-press hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <BarChart3 className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
          <span className="font-medium">View Analytics</span>
        </button>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { recentMeetings: meetings, isInMeeting, currentMeeting } = useMeetingStore();
  const { addNotification } = useAppStore();
  const costSummary = useCostSummary();

  // Mock data for demonstration
  const dashboardStats = {
    totalMeetings: meetings.length || 12,
    activeMeetings: isInMeeting ? 1 : 0,
    totalHours: 48.5,
    participants: 156,
  };

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
    // Add welcome notification
    if (user) {
      addNotification({
        type: 'info',
        title: 'Welcome back!',
        message: `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${user.displayName || user.email?.split('@')[0] || 'User'}`,
        persistent: false,
      });
    }
  }, [user, addNotification]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </p>
          </div>
          {isInMeeting && currentMeeting && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="font-medium">Meeting in Progress</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <DashboardCard
            title="Total Meetings"
            value={dashboardStats.totalMeetings}
            icon={Calendar}
            trend={{ value: 12, isPositive: true }}
          />
          <DashboardCard
            title="Active Meetings"
            value={dashboardStats.activeMeetings}
            icon={Activity}
            className={isInMeeting ? "ring-2 ring-red-500" : ""}
          />
          <DashboardCard
            title="Total Hours"
            value={`${dashboardStats.totalHours}h`}
            icon={Clock}
            trend={{ value: 8, isPositive: true }}
          />
          <DashboardCard
            title="Participants"
            value={dashboardStats.participants}
            icon={Users}
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        {/* Cost Summary Card */}
        <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 card-hover relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 to-emerald-50/30 dark:from-green-900/10 dark:to-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative flex items-center justify-between mb-6">
            <h3 className="text-fluid-lg font-semibold text-gray-900 dark:text-white">
              Cost Summary
            </h3>
            <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <div className="relative grid grid-cols-2 gap-6">
            <div className="group/item">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Cost</p>
              <p className="text-fluid-xl font-bold text-gray-900 dark:text-white group-hover/item:text-green-600 dark:group-hover/item:text-green-400 transition-colors duration-200">
                ${costSummary.totalCost.toFixed(3)}
              </p>
            </div>
            <div className="group/item">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">API Calls</p>
              <p className="text-fluid-xl font-bold text-gray-900 dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors duration-200">
                {costSummary.totalCalls.toLocaleString()}
              </p>
            </div>
          </div>
          
          {costSummary.activeBudgets > 0 && (
            <div className="relative mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                {costSummary.activeBudgets} budget(s) need attention
              </p>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Meetings */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 card-hover">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-fluid-lg font-semibold text-gray-900 dark:text-white">
                Recent Meetings
              </h3>
              <button className="group text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200">
                <span className="group-hover:underline">View All</span>
              </button>
            </div>
            <div className="space-y-4">
              {recentMeetings.map((meeting) => (
                <RecentMeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <QuickActions />
            
            {/* Today's Schedule */}
            <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 card-hover relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-900/10 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <h3 className="relative text-fluid-lg font-semibold text-gray-900 dark:text-white mb-6">
                Today's Schedule
              </h3>
              <div className="relative space-y-4">
                <div className="group/item flex items-center space-x-4 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full pulse-soft" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[60px]">2:00 PM</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors duration-200">Team Sync</span>
                </div>
                <div className="group/item flex items-center space-x-4 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[60px]">4:30 PM</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover/item:text-green-600 dark:group-hover/item:text-green-400 transition-colors duration-200">Client Call</span>
                </div>
                <div className="group/item flex items-center space-x-4 p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors duration-200">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[60px]">6:00 PM</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover/item:text-purple-600 dark:group-hover/item:text-purple-400 transition-colors duration-200">Planning Session</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Tracking Section */}
        <div className="space-y-6">
          <CostTracker />
        </div>
      </div>
    </MainLayout>
  );
}