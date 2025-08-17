'use client';

import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { useMeetingStore } from '@/stores/meetingStore';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Users, 
  Calendar,
  Mic,
  Activity,
  Download,
  Filter,
  ChevronDown
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  className = '',
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              change.isPositive 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${!change.isPositive ? 'rotate-180' : ''}`} />
              <span>{Math.abs(change.value)}% {change.period}</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
};

interface ChartData {
  name: string;
  meetings: number;
  duration: number;
}

const SimpleBarChart: React.FC<{ data: ChartData[]; title: string }> = ({ data, title }) => {
  const maxValue = Math.max(...data.map(d => d.meetings));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        {title}
      </h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
              {item.name}
            </div>
            <div className="flex-1">
              <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                  style={{ width: `${(item.meetings / maxValue) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900 dark:text-white">
                  {item.meetings}
                </div>
              </div>
            </div>
            <div className="w-20 text-sm text-gray-500 dark:text-gray-400 text-right">
              {item.duration}h
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface MeetingListProps {
  meetings: Array<{
    id: string;
    title: string;
    date: string;
    duration: string;
    participants: number;
    type: string;
  }>;
}

const RecentMeetingsList: React.FC<MeetingListProps> = ({ meetings }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Meetings
        </h3>
        <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
          View All
        </button>
      </div>
      <div className="space-y-4">
        {meetings.map((meeting) => (
          <div key={meeting.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {meeting.title}
              </h4>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{meeting.date}</span>
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {meeting.duration}
                </span>
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {meeting.participants}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                {meeting.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FilterDropdown: React.FC<{
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <span>{label}: {options.find(opt => opt.value === value)?.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  value === option.value 
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function AnalyticsPage() {
  const { recentMeetings: meetings } = useMeetingStore();
  const [timeRange, setTimeRange] = useState('7d');
  const [meetingType, setMeetingType] = useState('all');

  // Mock data for demonstration
  const analyticsData = useMemo(() => {
    const totalMeetings = meetings.length || 24;
    const totalHours = 156.5;
    const averageDuration = totalHours / totalMeetings * 60; // in minutes
    const totalParticipants = 89;

    return {
      metrics: {
        totalMeetings,
        totalHours,
        averageDuration: Math.round(averageDuration),
        totalParticipants,
      },
      weeklyData: [
        { name: 'Mon', meetings: 4, duration: 3.5 },
        { name: 'Tue', meetings: 6, duration: 4.2 },
        { name: 'Wed', meetings: 3, duration: 2.8 },
        { name: 'Thu', meetings: 8, duration: 6.1 },
        { name: 'Fri', meetings: 5, duration: 4.0 },
        { name: 'Sat', meetings: 1, duration: 0.5 },
        { name: 'Sun', meetings: 2, duration: 1.2 },
      ],
      recentMeetings: [
        {
          id: '1',
          title: 'Weekly Team Sync',
          date: 'Today, 2:00 PM',
          duration: '45 min',
          participants: 8,
          type: 'Team',
        },
        {
          id: '2',
          title: 'Product Planning Session',
          date: 'Yesterday, 10:00 AM',
          duration: '1h 30min',
          participants: 6,
          type: 'Planning',
        },
        {
          id: '3',
          title: 'Client Presentation',
          date: 'Dec 12, 3:00 PM',
          duration: '1h',
          participants: 4,
          type: 'Client',
        },
        {
          id: '4',
          title: '1:1 Check-in',
          date: 'Dec 11, 11:00 AM',
          duration: '30 min',
          participants: 2,
          type: '1:1',
        },
        {
          id: '5',
          title: 'Sprint Retrospective',
          date: 'Dec 10, 4:00 PM',
          duration: '1h 15min',
          participants: 7,
          type: 'Retro',
        },
      ],
    };
  }, [meetings.length]);

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
  ];

  const meetingTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'team', label: 'Team Meetings' },
    { value: 'client', label: 'Client Meetings' },
    { value: 'planning', label: 'Planning Sessions' },
    { value: '1on1', label: '1:1 Meetings' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your meeting performance and trends
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <FilterDropdown
              label="Period"
              value={timeRange}
              options={timeRangeOptions}
              onChange={setTimeRange}
            />
            <FilterDropdown
              label="Type"
              value={meetingType}
              options={meetingTypeOptions}
              onChange={setMeetingType}
            />
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Meetings"
            value={analyticsData.metrics.totalMeetings}
            change={{ value: 15, isPositive: true, period: 'vs last week' }}
            icon={Calendar}
          />
          <MetricCard
            title="Total Hours"
            value={`${analyticsData.metrics.totalHours}h`}
            change={{ value: 8, isPositive: true, period: 'vs last week' }}
            icon={Clock}
          />
          <MetricCard
            title="Avg Duration"
            value={`${analyticsData.metrics.averageDuration}m`}
            change={{ value: 3, isPositive: false, period: 'vs last week' }}
            icon={Activity}
          />
          <MetricCard
            title="Participants"
            value={analyticsData.metrics.totalParticipants}
            change={{ value: 12, isPositive: true, period: 'vs last week' }}
            icon={Users}
          />
        </div>

        {/* Charts and Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <SimpleBarChart
            data={analyticsData.weeklyData}
            title="Weekly Meeting Activity"
          />

          {/* Meeting Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Meeting Types Distribution
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                  <span className="text-gray-900 dark:text-white">Team Meetings</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3" />
                  <span className="text-gray-900 dark:text-white">Client Meetings</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-3" />
                  <span className="text-gray-900 dark:text-white">Planning Sessions</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">20%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3" />
                  <span className="text-gray-900 dark:text-white">1:1 Meetings</span>
                </div>
                <span className="text-gray-600 dark:text-gray-400">10%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Meetings */}
        <RecentMeetingsList meetings={analyticsData.recentMeetings} />

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Insights
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Meeting frequency increased by 15%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    You've been more active this week
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Average meeting duration: 65 minutes
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    3% shorter than last week
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Peak collaboration day: Thursday
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Most meetings and participants
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recommendations
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Optimize Meeting Length
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Consider shorter meetings for better engagement
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-1">
                  Schedule Buffer Time
                </p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  Add 5-10 minutes between meetings
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-1">
                  Peak Performance Time
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-400">
                  Schedule important meetings between 10-11 AM
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}