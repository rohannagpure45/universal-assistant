'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  Settings, 
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Clock,
  Users,
  HelpCircle,
  Sparkles,
  Play,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { useCostTracking } from '@/hooks/useCostTracking';
import { CostPeriod, CostGranularity, AIModel } from '@/types';

interface CostMetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  loading?: boolean;
  isPrimary?: boolean;
  tooltip?: string;
}

const CostMetricCard: React.FC<CostMetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  className = '',
  loading = false,
  isPrimary = false,
  tooltip,
}) => {
  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-2"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${isPrimary ? 'p-8' : 'p-6'} ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-1">
            <p className={`${isPrimary ? 'text-base' : 'text-sm'} font-medium text-gray-600 dark:text-gray-400`}>
              {title}
            </p>
            {tooltip && (
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                    {tooltip}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className={`${isPrimary ? 'text-3xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white mt-1`}>
            {value}
          </p>
          {trend && (
            <div className={`flex items-center mt-2 ${isPrimary ? 'text-base' : 'text-sm'} ${
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className={`${isPrimary ? 'w-5 h-5' : 'w-4 h-4'} mr-1`} />
              ) : (
                <TrendingDown className={`${isPrimary ? 'w-5 h-5' : 'w-4 h-4'} mr-1`} />
              )}
              <span className="font-medium">{Math.abs(trend.value)}% from last period</span>
            </div>
          )}
        </div>
        <div className={`${isPrimary ? 'p-4' : 'p-3'} bg-blue-50 dark:bg-blue-900/20 rounded-lg`}>
          <Icon className={`${isPrimary ? 'w-8 h-8' : 'w-6 h-6'} text-blue-600 dark:text-blue-400`} />
        </div>
      </div>
    </div>
  );
};

interface BudgetProgressProps {
  budget: {
    id: string;
    name: string;
    limit: number;
    currentUsage: number;
    period: string;
  };
  status: {
    percentage: number;
    remaining: number;
    status: 'safe' | 'warning' | 'danger';
  };
}

const BudgetProgress: React.FC<BudgetProgressProps> = ({ budget, status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'danger': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'danger': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">{budget.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{budget.period} budget</p>
        </div>
        <div className="flex items-center space-x-1">
          {status.status !== 'safe' && (
            <AlertTriangle className={`w-4 h-4 ${getStatusTextColor(status.status)}`} />
          )}
          <span className={`text-sm font-medium ${getStatusTextColor(status.status)}`}>
            {status.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            ${budget.currentUsage.toFixed(2)} / ${budget.limit.toFixed(2)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            ${status.remaining.toFixed(2)} remaining
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(status.status)}`}
            style={{ width: `${Math.min(status.percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface CostBreakdownProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  title: string;
}

const CostBreakdown: React.FC<CostBreakdownProps> = ({ data, title }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${item.value.toFixed(3)}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {item.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface CostHistoryProps {
  data: Array<{
    period: string;
    totalCost: number;
    calls: number;
  }>;
  selectedPeriod: CostPeriod;
}

const CostHistory: React.FC<CostHistoryProps> = ({ data, selectedPeriod }) => {
  const maxCost = Math.max(...data.map(d => d.totalCost));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Cost History ({selectedPeriod})
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-4 h-4" />
          <span>Last {data.length} {selectedPeriod}s</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {data.slice(-10).map((item, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="w-20 text-xs text-gray-500 dark:text-gray-400">
              {item.period}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ${item.totalCost.toFixed(3)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.calls} calls
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${maxCost > 0 ? (item.totalCost / maxCost) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Empty State Component
interface EmptyStateProps {
  onStartMeeting?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onStartMeeting }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          Start Tracking Your AI Costs
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          Your cost dashboard is ready! Once you start using AI services through meetings or API calls, 
          you'll see detailed analytics, cost breakdowns, and usage trends here.
        </p>
        
        {/* Sample metrics preview */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">$0.045</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Avg cost/call</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">2.3k</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tokens/dollar</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">15ms</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Response time</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">97%</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Success rate</div>
          </div>
        </div>
        
        {/* Action */}
        <div className="space-y-3">
          {onStartMeeting && (
            <button
              onClick={onStartMeeting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Your First Meeting
            </button>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span>Or explore the </span>
            <a href="/meeting" className="text-blue-600 dark:text-blue-400 hover:underline">
              Meeting page
            </a>
            <span> to get started</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CostTracker: React.FC = () => {
  const {
    analytics,
    metrics,
    budgets,
    loading,
    error,
    selectedPeriod,
    selectedGranularity,
    filterModel,
    filterService,
    setSelectedPeriod,
    setSelectedGranularity,
    setFilterModel,
    setFilterService,
    clearFilters,
    exportData,
    refreshData,
    summary,
    getBudgetStatus
  } = useCostTracking();

  const [showFilters, setShowFilters] = useState(false);
  const [showBudgets, setShowBudgets] = useState(true);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('csv');
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Calculate if filters are active
  useEffect(() => {
    const isFiltered = filterModel !== 'all' || 
                      filterService !== 'all' || 
                      selectedPeriod !== 'day' || 
                      selectedGranularity !== 'global';
    setHasActiveFilters(isFiltered);
  }, [filterModel, filterService, selectedPeriod, selectedGranularity]);

  const handleExport = () => {
    try {
      const data = exportData(exportFormat);
      const blob = new Blob([data], { 
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost-data-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Generate chart data for cost breakdown
  const modelBreakdownData = analytics?.topModels.map((model, index) => ({
    name: model.model,
    value: model.usage.totalCost,
    percentage: model.percentage,
    color: `hsl(${(index * 137.508) % 360}, 70%, 50%)`
  })) || [];

  const serviceBreakdownData = metrics?.costByService ? 
    Object.entries(metrics.costByService).map(([service, breakdown], index) => ({
      name: service,
      value: breakdown.totalCost,
      percentage: (breakdown.totalCost / (metrics?.totalCost || 1)) * 100,
      color: `hsl(${(index * 137.508) % 360}, 70%, 50%)`
    })) : [];

  const historyData = analytics?.dailyUsage.map(day => ({
    period: day.period,
    totalCost: day.usage.totalCost,
    calls: day.usage.totalAPICalls
  })) || [];

  // Calculate efficiency metrics
  const efficiency = analytics?.efficiency;
  const costTrend = analytics?.costTrends;
  
  // Check if we have any usage data
  const hasUsageData = summary.totalCalls > 0 || summary.totalCost > 0;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-medium">Cost Tracking Error</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={refreshData}
            className="ml-auto p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cost Tracking
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor your AI service usage and costs
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative flex items-center px-3 py-2 text-sm border rounded-lg transition-colors ${
              hasActiveFilters 
                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                {[filterModel !== 'all', filterService !== 'all', selectedPeriod !== 'day', selectedGranularity !== 'global'].filter(Boolean).length}
              </span>
            )}
          </button>
          
          <div className="flex items-center">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-l-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors text-sm border border-blue-600"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
          
          <div className="group relative">
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                Refresh data
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as CostPeriod)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="hour">Hour</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Granularity
              </label>
              <select
                value={selectedGranularity}
                onChange={(e) => setSelectedGranularity(e.target.value as CostGranularity)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="global">Global</option>
                <option value="user">User</option>
                <option value="meeting">Meeting</option>
                <option value="session">Session</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value as AIModel | 'all')}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Models</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Services</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="deepgram">Deepgram</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            {hasActiveFilters && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Active filters: </span>
                {[
                  filterModel !== 'all' && `Model: ${filterModel}`,
                  filterService !== 'all' && `Service: ${filterService}`,
                  selectedPeriod !== 'day' && `Period: ${selectedPeriod}`,
                  selectedGranularity !== 'global' && `Scope: ${selectedGranularity}`
                ].filter(Boolean).join(', ')}
              </div>
            )}
            <button
              onClick={clearFilters}
              className={`text-sm transition-colors ${
                hasActiveFilters 
                  ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards or Empty State */}
      {!hasUsageData && !loading ? (
        <EmptyState onStartMeeting={() => window.location.href = '/meeting'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CostMetricCard
            title="Total Cost"
            value={`$${summary.totalCost.toFixed(3)}`}
            icon={DollarSign}
            trend={costTrend ? {
              value: costTrend.percentage,
              isPositive: costTrend.direction === 'up'
            } : undefined}
            isPrimary={true}
            loading={loading}
          />
          
          <CostMetricCard
            title="API Calls"
            value={summary.totalCalls.toLocaleString()}
            icon={Activity}
            loading={loading}
          />
          
          <CostMetricCard
            title="Avg Cost/Call"
            value={`$${(summary.totalCost / Math.max(summary.totalCalls, 1)).toFixed(4)}`}
            icon={Target}
            loading={loading}
          />
          
          <CostMetricCard
            title="Efficiency"
            value={efficiency ? `${Math.round(efficiency.averageTokensPerDollar)}t/$` : '-'}
            icon={Zap}
            tooltip="Average tokens generated per dollar spent - higher is more efficient"
            loading={loading}
          />
        </div>
      )}

      {/* Budget Alerts */}
      {hasUsageData && budgets.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Status
            </h3>
            <button
              onClick={() => setShowBudgets(!showBudgets)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showBudgets ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          
          {showBudgets && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map((budget) => {
                const status = getBudgetStatus(budget.id);
                return status ? (
                  <BudgetProgress
                    key={budget.id}
                    budget={budget}
                    status={status}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* Cost Breakdown and History */}
      {hasUsageData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modelBreakdownData.length > 0 && (
            <CostBreakdown
              title="Cost by Model"
              data={modelBreakdownData}
            />
          )}
          
          {serviceBreakdownData.length > 0 && (
            <CostBreakdown
              title="Cost by Service"
              data={serviceBreakdownData}
            />
          )}
        </div>
      )}

      {/* Cost History */}
      {hasUsageData && historyData.length > 0 && (
        <CostHistory
          data={historyData}
          selectedPeriod={selectedPeriod}
        />
      )}

      {/* Status Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Last updated: {summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString() : 'Never'}
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            Tracking: {summary.isTracking ? 'Active' : 'Paused'}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>Retention: 90 days</span>
          <button className="text-blue-600 dark:text-blue-400 hover:underline">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CostTracker;