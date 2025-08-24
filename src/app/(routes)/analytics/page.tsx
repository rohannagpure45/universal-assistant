'use client';

import React from 'react';
import { MainLayout } from '@/components/layouts/MainLayout';
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  Clock, 
  Activity,
  Calendar,
  MessageSquare,
  Brain
} from 'lucide-react';

interface AnalyticsCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
}) => {
  const changeColor = changeType === 'positive' 
    ? 'text-green-600 dark:text-green-400' 
    : changeType === 'negative' 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-gray-600 dark:text-gray-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          <p className={`text-sm mt-1 ${changeColor}`}>
            {change}
          </p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
  subtext?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, subtext }) => {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {subtext && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {subtext}
          </p>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
};

export default function AnalyticsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your meeting performance and engagement metrics
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard
            title="Total Meetings"
            value="24"
            change="+12% from last month"
            changeType="positive"
            icon={Calendar}
          />
          <AnalyticsCard
            title="Meeting Hours"
            value="48.5h"
            change="+8% from last month"
            changeType="positive"
            icon={Clock}
          />
          <AnalyticsCard
            title="Participants"
            value="156"
            change="+23% from last month"
            changeType="positive"
            icon={Users}
          />
          <AnalyticsCard
            title="AI Responses"
            value="342"
            change="+15% from last month"
            changeType="positive"
            icon={Brain}
          />
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting Frequency Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <BarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Meeting Frequency
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Meetings per week over the last month
                </p>
              </div>
            </div>
            
            {/* Placeholder for chart - in a real app, this would be a chart component */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <BarChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  Chart visualization would appear here
                </p>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Engagement Metrics
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Key performance indicators
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <MetricRow
                label="Average Meeting Duration"
                value="2h 15m"
                subtext="Optimal range: 1-3 hours"
              />
              <MetricRow
                label="Speaker Identification Accuracy"
                value="94.2%"
                subtext="AI confidence level"
              />
              <MetricRow
                label="Transcription Accuracy"
                value="97.8%"
                subtext="Word recognition rate"
              />
              <MetricRow
                label="Response Relevance"
                value="92.1%"
                subtext="AI response quality"
              />
              <MetricRow
                label="Active Speakers per Meeting"
                value="6.5"
                subtext="Average participants"
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Latest meetings and transcriptions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Quarterly Review Meeting
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  2 hours ago • 8 participants • 1.5h duration
                </p>
              </div>
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                Completed
              </span>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  AI Training Session
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Yesterday • 12 participants • 2.2h duration
                </p>
              </div>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                Processed
              </span>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Product Strategy Discussion
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  2 days ago • 5 participants • 45m duration
                </p>
              </div>
              <span className="text-xs bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">
                Archived
              </span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}