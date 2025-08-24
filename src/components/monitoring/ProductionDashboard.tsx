/**
 * ProductionDashboard - Real-time Production Monitoring Dashboard
 * 
 * Provides comprehensive monitoring interface for production system health,
 * performance metrics, error tracking, and system analytics.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { performanceDashboard, type PerformanceReport, type RealTimeMetrics } from '../../services/monitoring/PerformanceDashboard';
import { errorTracker, type ErrorStats } from '../../services/monitoring/ErrorTracker';
import logger from '../../services/logging/ProductionLogger';
import { Card } from '../ui/card';

interface DashboardState {
  isLoading: boolean;
  performanceReport: PerformanceReport | null;
  errorStats: ErrorStats | null;
  realTimeMetrics: RealTimeMetrics[];
  systemHealth: number;
  lastUpdate: number;
}

export const ProductionDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    isLoading: true,
    performanceReport: null,
    errorStats: null,
    realTimeMetrics: [],
    systemHealth: 0,
    lastUpdate: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      logger.debug('Fetching dashboard data', 'ProductionDashboard');
      
      const [performanceReport, errorStats, realTimeMetrics] = await Promise.all([
        performanceDashboard.getLatestReport() || performanceDashboard.generatePerformanceReport(),
        Promise.resolve(errorTracker.getStats()),
        Promise.resolve(performanceDashboard.getRealtimeMetrics(100))
      ]);

      setState({
        isLoading: false,
        performanceReport,
        errorStats,
        realTimeMetrics,
        systemHealth: errorStats.systemHealth,
        lastUpdate: Date.now()
      });

      logger.debug('Dashboard data updated', 'ProductionDashboard', {
        metadata: {
          systemHealth: errorStats.systemHealth,
          totalErrors: errorStats.totalErrors,
          performanceScore: performanceReport?.overall.score
        }
      });
    } catch (error) {
      logger.error('Failed to fetch dashboard data', 'ProductionDashboard', {
        error: error as Error
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Start/stop monitoring
  const toggleMonitoring = useCallback(() => {
    if (isMonitoring) {
      performanceDashboard.stopMonitoring();
      setIsMonitoring(false);
      logger.info('Production monitoring stopped', 'ProductionDashboard');
    } else {
      performanceDashboard.startMonitoring();
      setIsMonitoring(true);
      logger.info('Production monitoring started', 'ProductionDashboard');
    }
  }, [isMonitoring]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Health status colors
  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600 bg-green-100';
    if (health >= 70) return 'text-yellow-600 bg-yellow-100';
    if (health >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getHealthStatus = (health: number) => {
    if (health >= 90) return 'Excellent';
    if (health >= 70) return 'Good';
    if (health >= 50) return 'Fair';
    return 'Poor';
  };

  // Render system overview
  const renderSystemOverview = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          System Overview
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMonitoring}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isMonitoring 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
          >
            {isMonitoring ? 'Monitoring Active' : 'Start Monitoring'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(state.systemHealth)}`}>
            {getHealthStatus(state.systemHealth)}
          </div>
          <p className="text-2xl font-bold mt-2">{state.systemHealth}%</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">System Health</p>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {state.performanceReport?.overall.grade || 'N/A'}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Performance Grade</p>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {((state.errorStats?.recoveryRate ?? 0) * 100).toFixed(1)}%
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Recovery Rate</p>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date(state.lastUpdate).toLocaleString()}
      </div>
    </Card>
  );

  // Render error statistics
  const renderErrorStats = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Error Statistics
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold text-red-600">{state.errorStats?.totalErrors || 0}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Errors</p>
        </div>
        
        <div className="text-center">
          <p className="text-xl font-bold text-yellow-600">
            {((state.errorStats?.errorRate || 0) * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Error Rate</p>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-blue-600">
            {state.errorStats?.errorsBySeverity.critical || 0}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Critical</p>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-orange-600">
            {state.errorStats?.errorsBySeverity.high || 0}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">High Priority</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Errors:</h4>
        {state.errorStats?.recentErrors.slice(0, 3).map((error, index) => (
          <div key={index} className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-xs">
            <div className="flex justify-between items-start">
              <span className="font-medium">{error.category}</span>
              <span className="text-gray-500">{new Date(error.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 truncate">{error.message}</p>
          </div>
        )) || <p className="text-sm text-gray-500">No recent errors</p>}
      </div>
    </Card>
  );

  // Render performance metrics
  const renderPerformanceMetrics = () => (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Performance Metrics
      </h3>
      
      {state.performanceReport?.categories && (
        <div className="space-y-3">
          {Object.entries(state.performanceReport.categories).map(([category, data]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="capitalize font-medium">{category}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      data.score >= 80 ? 'bg-green-500' :
                      data.score >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${data.score}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {data.score.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.performanceReport?.recommendations.length && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recommendations:
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {state.performanceReport.recommendations.slice(0, 3).map((rec, index) => (
              <li key={index}>• {rec}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );

  // Render real-time metrics chart (simplified)
  const renderRealTimeChart = () => {
    const latestMetrics = state.realTimeMetrics.slice(-20); // Last 20 data points
    
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Real-time Metrics
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {latestMetrics.length > 0 && (() => {
            const latest = latestMetrics[latestMetrics.length - 1];
            return (
              <>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {latest.memory.usage.toFixed(0)}MB
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Memory Usage</p>
                </div>
                
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">
                    {latest.database.cacheHitRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cache Hit Rate</p>
                </div>
                
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">
                    {latest.network.latency.toFixed(0)}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Network Latency</p>
                </div>
                
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-600">
                    {latest.audio.latency.toFixed(0)}ms
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Audio Latency</p>
                </div>
              </>
            );
          })()}
        </div>

        <div className="text-xs text-gray-500 text-center">
          Monitoring {latestMetrics.length} data points over the last {Math.round(latestMetrics.length * 10 / 60)} minutes
        </div>
      </Card>
    );
  };

  // Loading state
  if (state.isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Production Monitoring Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system health and performance monitoring
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          
          <button
            onClick={fetchDashboardData}
            disabled={state.isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      {renderSystemOverview()}

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderErrorStats()}
        {renderPerformanceMetrics()}
      </div>

      {/* Real-time metrics */}
      {renderRealTimeChart()}

      {/* Quick actions */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Quick Actions
        </h3>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => errorTracker.cleanup()}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
          >
            Clear Old Errors
          </button>
          
          <button
            onClick={() => performanceDashboard.generatePerformanceReport()}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
          >
            Generate Report
          </button>
          
          <button
            onClick={() => {
              const data = JSON.stringify({
                timestamp: new Date().toISOString(),
                benchmarks: performanceDashboard.getBenchmarks(),
                realtimeMetrics: performanceDashboard.getRealtimeMetrics(50),
                reports: performanceDashboard.getAllReports()
              }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `performance-data-${Date.now()}.json`;
              a.click();
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Export Data
          </button>
        </div>
      </Card>
    </div>
  );
};

export default ProductionDashboard;