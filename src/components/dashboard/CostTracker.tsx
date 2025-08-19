'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Download, 
  Settings, 
  Calendar,
  BarChart3,
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
  Play
} from 'lucide-react';
import { useCostTracking } from '@/hooks/useCostTracking';
import { CostPeriod, CostGranularity, AIModel } from '@/types';
import { MotionCard, MotionList, MotionCounter, fadeInUpVariants } from '@/components/ui/Motion';
import { BarChart, LineChart, PieChart, ProgressRing } from '@/components/ui/Charts';
import { cn } from '@/lib/utils';

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
      <MotionCard className={cn(
        'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
        'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
        'p-6', // 8px grid: 24px padding
        className
      )}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-24"></div>
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-16"></div>
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20"></div>
            </div>
            <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-xl"></div>
          </div>
        </div>
      </MotionCard>
    );
  }

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) || 0 : value;

  return (
    <MotionCard 
      className={cn(
        // Design system styling
        'bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm',
        'rounded-xl shadow-soft border border-neutral-200/60 dark:border-neutral-700/60',
        'hover:bg-white/95 dark:hover:bg-neutral-800/95',
        'transition-all duration-300 ease-out',
        // Responsive padding using 8px grid
        isPrimary ? 'p-6 lg:p-8' : 'p-6', // 24px and 32px
        className
      )}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <p className={cn(
              'font-medium text-contrast-medium truncate',
              isPrimary ? 'text-label-lg' : 'text-label-base'
            )}>
              {title}
            </p>
            {tooltip && (
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-contrast-accessible hover:text-contrast-medium cursor-help transition-colors" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-neutral-900 dark:bg-neutral-700 text-white text-body-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                    {tooltip}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-700" />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-4"> {/* 8px grid: 16px spacing */}
            <MotionCounter
              value={numericValue}
              className={cn(
                'font-bold text-neutral-900 dark:text-neutral-100',
                isPrimary ? 'text-display-2xl' : 'text-display-xl'
              )}
              formatter={() => value.toString()}
            />
          </div>
          
          {trend && (
            <div className={cn(
              'flex items-center gap-1.5 transition-colors duration-200',
              isPrimary ? 'text-body-sm' : 'text-body-xs',
              trend.isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
            )}>
              {trend.isPositive ? (
                <TrendingUp className={cn('flex-shrink-0', isPrimary ? 'w-5 h-5' : 'w-4 h-4')} aria-hidden="true" />
              ) : (
                <TrendingDown className={cn('flex-shrink-0', isPrimary ? 'w-5 h-5' : 'w-4 h-4')} aria-hidden="true" />
              )}
              <span className="font-medium">{Math.abs(trend.value)}% from last period</span>
            </div>
          )}
        </div>
        
        <div className={cn(
          'bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20',
          'rounded-xl transition-transform duration-200 hover:scale-105 flex-shrink-0 ml-4',
          isPrimary ? 'p-4' : 'p-3'
        )}>
          <Icon className={cn(
            'text-primary-600 dark:text-primary-400',
            isPrimary ? 'w-8 h-8' : 'w-6 h-6'
          )} />
        </div>
      </div>
    </MotionCard>
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
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'danger': return 'text-danger-600 dark:text-danger-400';
      case 'warning': return 'text-warning-600 dark:text-warning-400';
      default: return 'text-success-600 dark:text-success-400';
    }
  };

  return (
    <MotionCard className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-5 hover:bg-white/90 dark:hover:bg-gray-800/90">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">{budget.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize mt-1">{budget.period} budget</p>
        </div>
        
        <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
          <ProgressRing
            percentage={Math.min(status.percentage, 100)}
            size={60}
            strokeWidth={6}
            color={getStatusColor(status.status)}
            showLabel={false}
          />
          <div className="text-right">
            {status.status !== 'safe' && (
              <AlertTriangle className={cn('w-4 h-4 mb-1', getStatusTextColor(status.status))} />
            )}
            <div className={cn('text-sm font-semibold', getStatusTextColor(status.status))}>
              {status.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">Used</span>
            <MotionCounter
              value={budget.currentUsage}
              className="font-semibold text-gray-900 dark:text-white"
              formatter={(v) => `$${v.toFixed(2)}`}
            />
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400 block">Remaining</span>
            <MotionCounter
              value={status.remaining}
              className={cn('font-semibold', getStatusTextColor(status.status))}
              formatter={(v) => `$${v.toFixed(2)}`}
            />
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Limit: <span className="font-medium">${budget.limit.toFixed(2)}</span>
        </div>
      </div>
    </MotionCard>
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
  const [showChart, setShowChart] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowChart(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  const hasData = data && data.length > 0;
  
  return (
    <MotionCard className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-soft border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-gray-800/90">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          <PieChart className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">{data.length} items</span>
        </div>
      </div>
      
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <PieChart className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No data available yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Start using AI services to see cost breakdown
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart */}
          <div className="flex justify-center">
            <PieChart 
              data={data.map(item => ({ ...item, label: item.name }))} 
              size={160}
              innerRadius={50}
              animate={showChart}
              showPercentages
            />
          </div>
          
          {/* Legend with enhanced styling */}
          <MotionList className="space-y-3">
            {data.map((item, index) => (
              <motion.div
                key={index}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-200 cursor-pointer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 2 }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <MotionCounter
                    value={item.value}
                    className="text-sm font-semibold text-gray-900 dark:text-white"
                    formatter={(v) => `$${v.toFixed(3)}`}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </MotionList>
        </div>
      )}
    </MotionCard>
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
  const [showChart, setShowChart] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowChart(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const hasData = data && data.length > 0;
  const chartData = hasData ? data.slice(-10).map(item => ({
    label: item.period,
    value: item.totalCost,
    color: `hsl(220, 70%, ${50 + (Math.random() * 20)}%)`
  })) : [];
  
  const lineChartData = hasData ? data.slice(-10).map(item => ({
    x: item.period,
    y: item.totalCost
  })) : [];
  
  return (
    <MotionCard className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-soft border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-gray-800/90">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
          Cost History ({selectedPeriod})
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <BarChart3 className="w-4 h-4" />
          <span>Last {data.length} {selectedPeriod}s</span>
        </div>
      </div>
      
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No cost history available
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Cost data will appear here as you use AI services
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Line Chart */}
          <div className="h-48">
            <LineChart 
              data={lineChartData}
              height={192}
              color="#3b82f6"
              animate={showChart}
            />
          </div>
          
          {/* Bar Chart */}
          <div className="h-32">
            <BarChart 
              data={chartData}
              height={128}
              showValues
              animate={showChart}
            />
          </div>
          
          {/* Detailed breakdown */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Detailed Breakdown</h4>
            <MotionList className="space-y-3 max-h-48 overflow-y-auto">
              {data.slice(-10).reverse().map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-all duration-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[4rem]">
                      {item.period}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        ${item.totalCost.toFixed(3)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.calls.toLocaleString()} calls
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    ${(item.totalCost / Math.max(item.calls, 1)).toFixed(4)}/call
                  </div>
                </motion.div>
              ))}
            </MotionList>
          </div>
        </div>
      )}
    </MotionCard>
  );
};

// Enhanced Empty State Component
interface EmptyStateProps {
  onStartMeeting?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onStartMeeting }) => {
  return (
    <MotionCard className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-soft border border-gray-200/50 dark:border-gray-700/50 p-6 sm:p-8 text-center">
      <div className="max-w-lg mx-auto">
        {/* Animated Icon */}
        <motion.div
          className="mx-auto w-20 h-20 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-glow"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: 'backOut' }}
        >
          <Sparkles className="w-10 h-10 text-white" />
        </motion.div>
        
        {/* Title */}
        <motion.h3 
          className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Start Tracking Your AI Costs
        </motion.h3>
        
        {/* Description */}
        <motion.p 
          className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed text-sm sm:text-base"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Your cost dashboard is ready! Once you start using AI services through meetings or API calls, 
          you'll see detailed analytics, cost breakdowns, and usage trends here.
        </motion.p>
        
        {/* Sample metrics preview with animations */}
        <motion.div 
          className="grid grid-cols-2 gap-4 mb-8 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50/50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[
            { value: '$0.045', label: 'Avg cost/call' },
            { value: '2.3k', label: 'Tokens/dollar' },
            { value: '15ms', label: 'Response time' },
            { value: '97%', label: 'Success rate' },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              className="text-center p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
            >
              <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Actions */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {onStartMeeting && (
            <MotionCard
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-semibold rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-200 cursor-pointer"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartMeeting}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Your First Meeting
            </MotionCard>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span>Or explore the </span>
            <motion.a 
              href="/meeting" 
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Meeting page
            </motion.a>
            <span> to get started</span>
          </p>
        </motion.div>
      </div>
    </MotionCard>
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
    <motion.div 
      className="space-y-6 lg:space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div 
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={fadeInUpVariants}
        initial="initial"
        animate="animate"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Cost Tracking
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
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
      </motion.div>

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
      <AnimatePresence mode="wait">
        {!hasUsageData && !loading ? (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState onStartMeeting={() => window.location.href = '/meeting'} />
          </motion.div>
        ) : (
          <motion.div
            key="metric-cards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MotionList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
            </MotionList>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Alerts */}
      <AnimatePresence>
        {hasUsageData && budgets.length > 0 && (
          <MotionCard 
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-soft border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 hover:bg-white/90 dark:hover:bg-gray-800/90"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Budget Status
              </h3>
              <MotionCard
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                onClick={() => setShowBudgets(!showBudgets)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: showBudgets ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </motion.div>
              </MotionCard>
            </div>
            
            <AnimatePresence>
              {showBudgets && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <MotionList className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {budgets.map((budget, index) => {
                      const status = getBudgetStatus(budget.id);
                      return status ? (
                        <motion.div
                          key={budget.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <BudgetProgress
                            budget={budget}
                            status={status}
                          />
                        </motion.div>
                      ) : null;
                    })}
                  </MotionList>
                </motion.div>
              )}
            </AnimatePresence>
          </MotionCard>
        )}
      </AnimatePresence>

      {/* Cost Breakdown and History */}
      <AnimatePresence>
        {hasUsageData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <MotionList className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
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
            </MotionList>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cost History */}
      <AnimatePresence>
        {hasUsageData && historyData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <CostHistory
              data={historyData}
              selectedPeriod={selectedPeriod}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Status Footer */}
      <motion.div 
        className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2 text-primary-500" />
              <span>Last updated: </span>
              <span className="font-medium ml-1">
                {summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString() : 'Never'}
              </span>
            </div>
            <div className="flex items-center">
              <div className={cn(
                'w-2 h-2 rounded-full mr-2 transition-colors',
                summary.isTracking ? 'bg-success-500 animate-pulse-soft' : 'bg-gray-400'
              )} />
              <span className="text-gray-600 dark:text-gray-400">Tracking: </span>
              <span className={cn(
                'font-medium ml-1',
                summary.isTracking ? 'text-success-600 dark:text-success-400' : 'text-gray-500 dark:text-gray-400'
              )}>
                {summary.isTracking ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-gray-500 dark:text-gray-400">Retention: 90 days</span>
            <MotionCard
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ExternalLink className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </MotionCard>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CostTracker;