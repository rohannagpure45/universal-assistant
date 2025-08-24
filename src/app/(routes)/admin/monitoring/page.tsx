/**
 * Admin Monitoring Page - Production System Monitoring Interface
 * 
 * Comprehensive monitoring interface for administrators to view system health,
 * performance metrics, error tracking, and operational insights.
 */

'use client';

import React, { useState } from 'react';
import { PageErrorBoundary } from '@/components/ui/ProductionErrorBoundary';
import ProductionDashboard from '@/components/monitoring/ProductionDashboard';
import { Card } from '@/components/ui/card';
import logger from '@/services/logging/ProductionLogger';
import { errorTracker, type ErrorCategory, type ErrorSeverity } from '@/services/monitoring/ErrorTracker';

interface AdminMonitoringPageState {
  activeTab: 'overview' | 'errors' | 'performance' | 'logs' | 'health';
  isAdmin: boolean;
  loading: boolean;
}

const AdminMonitoringPage: React.FC = () => {
  const [state, setState] = useState<AdminMonitoringPageState>({
    activeTab: 'overview',
    isAdmin: true, // In real app, this would come from auth context
    loading: false
  });

  // Tab navigation
  const tabs = [
    { id: 'overview', name: 'System Overview', icon: '📊' },
    { id: 'errors', name: 'Error Tracking', icon: '🚨' },
    { id: 'performance', name: 'Performance', icon: '⚡' },
    { id: 'logs', name: 'System Logs', icon: '📝' },
    { id: 'health', name: 'Health Checks', icon: '🏥' }
  ] as const;

  const handleTabChange = (tabId: typeof state.activeTab) => {
    setState(prev => ({ ...prev, activeTab: tabId }));
    logger.logUserAction(`Switched to ${tabId} tab`, 'admin-user', 'AdminMonitoring');
  };

  // Export system data
  const handleExportData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const errorStats = errorTracker.getStats();
      const logStats = logger.getStats();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        errorStats,
        logStats,
        recentErrors: errorTracker.searchErrors({}).slice(0, 100),
        recentLogs: logger.getRecentLogs(100)
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      logger.logAudit('System data exported', 'monitoring', 'admin-user', 'AdminMonitoring', {
        metadata: { exportSize: blob.size }
      });
    } catch (error) {
      logger.logError(error as Error, 'AdminMonitoring', { action: 'export' });
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // Admin access check
  if (!state.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access the monitoring dashboard.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Go Back
          </button>
        </Card>
      </div>
    );
  }

  return (
    <PageErrorBoundary context="AdminMonitoring" showRetry={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  System Monitoring
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time production system monitoring and diagnostics
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Monitoring
                </div>
                
                <button
                  onClick={handleExportData}
                  disabled={state.loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {state.loading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Exporting...
                    </span>
                  ) : (
                    'Export Data'
                  )}
                </button>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    state.activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {state.activeTab === 'overview' && (
            <div>
              <ProductionDashboard />
            </div>
          )}
          
          {state.activeTab === 'errors' && (
            <div className="space-y-6">
              <ErrorTrackingPanel />
            </div>
          )}
          
          {state.activeTab === 'performance' && (
            <div className="space-y-6">
              <PerformanceAnalysisPanel />
            </div>
          )}
          
          {state.activeTab === 'logs' && (
            <div className="space-y-6">
              <SystemLogsPanel />
            </div>
          )}
          
          {state.activeTab === 'health' && (
            <div className="space-y-6">
              <HealthChecksPanel />
            </div>
          )}
        </div>
      </div>
    </PageErrorBoundary>
  );
};

// Error Tracking Panel Component
const ErrorTrackingPanel: React.FC = () => {
  const [errors, setErrors] = useState(errorTracker.searchErrors({}).slice(0, 50));
  const [filter, setFilter] = useState<{
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    recovered?: boolean;
  }>({});

  const applyFilter = () => {
    const filteredErrors = errorTracker.searchErrors(filter).slice(0, 50);
    setErrors(filteredErrors);
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <select
            value={filter.severity || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, severity: (e.target.value as ErrorSeverity) || undefined }))}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 dark:bg-gray-700"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <select
            value={filter.category || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, category: (e.target.value as ErrorCategory) || undefined }))}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 dark:bg-gray-700"
          >
            <option value="">All Categories</option>
            <option value="authentication">Authentication</option>
            <option value="network">Network</option>
            <option value="database">Database</option>
            <option value="audio">Audio</option>
            <option value="ui">UI</option>
            <option value="system">System</option>
          </select>
          
          <button
            onClick={applyFilter}
            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Apply Filter
          </button>
        </div>
      </Card>

      {/* Error List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Errors</h3>
        <div className="space-y-3">
          {errors.map((error) => (
            <div key={error.id} className="border border-gray-200 dark:border-gray-700 rounded p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {error.severity}
                    </span>
                    <span className="text-sm font-medium">{error.category}</span>
                    {error.recovered && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        Recovered
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{error.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {error.context} • {new Date(error.timestamp).toLocaleString()} • 
                    {error.occurrenceCount > 1 && ` ${error.occurrenceCount} occurrences`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Performance Analysis Panel Component
const PerformanceAnalysisPanel: React.FC = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Performance Analysis</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Detailed performance metrics and analysis tools coming soon...
      </p>
    </Card>
  );
};

// System Logs Panel Component
const SystemLogsPanel: React.FC = () => {
  const [logs] = useState(logger.getRecentLogs(100));
  const [logFilter, setLogFilter] = useState('');

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(logFilter.toLowerCase()) ||
    log.context.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <input
          type="text"
          placeholder="Filter logs..."
          value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700"
        />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">System Logs</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.map((log) => (
            <div key={log.id} className="text-xs font-mono p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-gray-500">{new Date(log.timestamp).toISOString()}</span>
              <span className={`ml-2 px-1 rounded ${
                log.level === 'error' ? 'bg-red-200 text-red-800' :
                log.level === 'warn' ? 'bg-yellow-200 text-yellow-800' :
                log.level === 'info' ? 'bg-blue-200 text-blue-800' :
                'bg-gray-200 text-gray-800'
              }`}>
                {log.level.toUpperCase()}
              </span>
              <span className="ml-2 font-medium">{log.context}</span>
              <span className="ml-2">{log.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Health Checks Panel Component
const HealthChecksPanel: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const performHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health?detailed=true');
      const data = await response.json();
      setHealthData(data);
    } catch (error) {
      logger.logError(error as Error, 'AdminMonitoring', { action: 'health-check' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    performHealthCheck();
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <button
          onClick={performHealthCheck}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded font-medium"
        >
          {loading ? 'Running Health Check...' : 'Run Health Check'}
        </button>
      </Card>

      {healthData && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Health Check Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Overall Status</h4>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                healthData.status === 'healthy' ? 'bg-green-100 text-green-800' :
                healthData.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {healthData.status.toUpperCase()}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">System Health Score</h4>
              <div className="text-2xl font-bold">
                {healthData.metrics?.performance?.systemHealth || 0}%
              </div>
            </div>
          </div>

          {healthData.services && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Service Status</h4>
              <div className="space-y-2">
                {Object.entries(healthData.services).map(([service, status]: [string, any]) => (
                  <div key={service} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="capitalize font-medium">{service}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      status.status === 'healthy' ? 'bg-green-100 text-green-800' :
                      status.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {status.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminMonitoringPage;