/**
 * Identification History View
 * 
 * Historical view of all voice identification decisions with undo/redo functionality,
 * confidence trends, accuracy metrics, search and filter capabilities, and
 * export functionality for identification data.
 * 
 * Features:
 * - Complete identification decision history
 * - Undo/redo functionality for incorrect identifications
 * - Confidence trends and accuracy metrics
 * - Advanced search and filtering
 * - Data export capabilities
 * - Performance analytics and insights
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  History,
  RotateCcw,
  Redo,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Eye,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AccessibleLinearProgress } from '../ui/AccessibleProgress';
import { NeedsIdentificationService } from '../../services/firebase/NeedsIdentificationService';
import { VoiceLibraryService } from '../../services/firebase/VoiceLibraryService';
import type { NeedsIdentification, VoiceLibraryEntry } from '../../types/database';

interface IdentificationHistoryViewProps {
  /** User ID for filtering history */
  userId?: string;
  /** Whether user has admin access */
  isAdmin?: boolean;
  /** Show detailed analytics */
  showAnalytics?: boolean;
  /** Enable export functionality */
  enableExport?: boolean;
  /** Custom CSS classes */
  className?: string;
}

interface HistoryEntry {
  id: string;
  requestId: string;
  speakerLabel: string;
  meetingTitle: string;
  meetingDate: Date;
  action: 'identified' | 'skipped' | 'undone';
  method: 'manual' | 'suggested' | 'matched';
  userId?: string;
  userName?: string;
  confidence: number;
  timestamp: Date;
  undoable: boolean;
  originalRequest?: NeedsIdentification;
}

interface HistoryStats {
  totalEntries: number;
  identifiedCount: number;
  skippedCount: number;
  undoneCount: number;
  averageConfidence: number;
  accuracyTrend: number;
  methodBreakdown: {
    manual: number;
    suggested: number;
    matched: number;
  };
  dailyActivity: Array<{
    date: Date;
    count: number;
    accuracy: number;
  }>;
}

interface FilterOptions {
  searchTerm: string;
  actionFilter: 'all' | 'identified' | 'skipped' | 'undone';
  methodFilter: 'all' | 'manual' | 'suggested' | 'matched';
  confidenceRange: [number, number];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  meetingFilter: string;
  userFilter: string;
}

type SortField = 'timestamp' | 'confidence' | 'meeting' | 'speaker' | 'method';
type SortOrder = 'asc' | 'desc';

/**
 * Identification History View Component
 */
export const IdentificationHistoryView: React.FC<IdentificationHistoryViewProps> = ({
  userId,
  isAdmin = false,
  showAnalytics = true,
  enableExport = true,
  className = ''
}) => {
  // State management
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<HistoryStats>({
    totalEntries: 0,
    identifiedCount: 0,
    skippedCount: 0,
    undoneCount: 0,
    averageConfidence: 0,
    accuracyTrend: 0,
    methodBreakdown: { manual: 0, suggested: 0, matched: 0 },
    dailyActivity: []
  });

  // Filter and sort state
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    actionFilter: 'all',
    methodFilter: 'all',
    confidenceRange: [0, 1],
    dateRange: { start: null, end: null },
    meetingFilter: '',
    userFilter: ''
  });
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Undo/redo state
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  /**
   * Load identification history
   */
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get resolved identification requests
      const resolvedRequests = await NeedsIdentificationService.getPendingRequests(100);
      
      // Simulate historical data (in production, this would come from a history collection)
      const mockHistory: HistoryEntry[] = [];
      
      // Add some mock historical entries
      for (let i = 0; i < 20; i++) {
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const actions: Array<'identified' | 'skipped'> = ['identified', 'identified', 'identified', 'skipped'];
        const methods: Array<'manual' | 'suggested' | 'matched'> = ['manual', 'suggested', 'matched'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const method = methods[Math.floor(Math.random() * methods.length)];
        
        mockHistory.push({
          id: `hist_${i}`,
          requestId: `req_${i}`,
          speakerLabel: `Speaker ${i + 1}`,
          meetingTitle: `Meeting ${Math.floor(i / 3) + 1}`,
          meetingDate: new Date(timestamp.getTime() - 24 * 60 * 60 * 1000),
          action,
          method,
          userId: action === 'identified' ? `user_${i}` : undefined,
          userName: action === 'identified' ? `User ${i + 1}` : undefined,
          confidence: action === 'identified' ? 0.6 + Math.random() * 0.4 : 0,
          timestamp,
          undoable: action === 'identified' && Math.random() > 0.3
        });
      }

      setHistoryEntries(mockHistory);
      
      // Calculate statistics
      const stats = calculateStats(mockHistory);
      setStats(stats);

    } catch (err) {
      console.error('Failed to load identification history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Calculate history statistics
   */
  const calculateStats = useCallback((entries: HistoryEntry[]): HistoryStats => {
    const identifiedEntries = entries.filter(e => e.action === 'identified');
    const skippedEntries = entries.filter(e => e.action === 'skipped');
    const undoneEntries = entries.filter(e => e.action === 'undone');

    const averageConfidence = identifiedEntries.length > 0 
      ? identifiedEntries.reduce((sum, entry) => sum + entry.confidence, 0) / identifiedEntries.length
      : 0;

    const methodBreakdown = {
      manual: entries.filter(e => e.method === 'manual').length,
      suggested: entries.filter(e => e.method === 'suggested').length,
      matched: entries.filter(e => e.method === 'matched').length
    };

    // Calculate daily activity (last 7 days)
    const dailyActivity: Array<{ date: Date; count: number; accuracy: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === date.getTime();
      });
      
      const identified = dayEntries.filter(e => e.action === 'identified').length;
      const total = dayEntries.length;
      const accuracy = total > 0 ? identified / total : 0;
      
      dailyActivity.push({
        date,
        count: total,
        accuracy
      });
    }

    return {
      totalEntries: entries.length,
      identifiedCount: identifiedEntries.length,
      skippedCount: skippedEntries.length,
      undoneCount: undoneEntries.length,
      averageConfidence,
      accuracyTrend: dailyActivity.length > 1 
        ? dailyActivity[dailyActivity.length - 1].accuracy - dailyActivity[0].accuracy
        : 0,
      methodBreakdown,
      dailyActivity
    };
  }, []);

  /**
   * Apply filters and sorting to history entries
   */
  const filteredAndSortedEntries = useMemo(() => {
    let filtered = historyEntries.filter(entry => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          entry.speakerLabel.toLowerCase().includes(searchLower) ||
          entry.meetingTitle.toLowerCase().includes(searchLower) ||
          (entry.userName && entry.userName.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Action filter
      if (filters.actionFilter !== 'all' && entry.action !== filters.actionFilter) {
        return false;
      }

      // Method filter
      if (filters.methodFilter !== 'all' && entry.method !== filters.methodFilter) {
        return false;
      }

      // Confidence range filter
      if (entry.confidence < filters.confidenceRange[0] || entry.confidence > filters.confidenceRange[1]) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start && entry.timestamp < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && entry.timestamp > filters.dateRange.end) {
        return false;
      }

      // Meeting filter
      if (filters.meetingFilter && !entry.meetingTitle.toLowerCase().includes(filters.meetingFilter.toLowerCase())) {
        return false;
      }

      // User filter
      if (filters.userFilter && (!entry.userName || !entry.userName.toLowerCase().includes(filters.userFilter.toLowerCase()))) {
        return false;
      }

      return true;
    });

    // Sort entries
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'meeting':
          aValue = a.meetingTitle;
          bValue = b.meetingTitle;
          break;
        case 'speaker':
          aValue = a.speakerLabel;
          bValue = b.speakerLabel;
          break;
        case 'method':
          aValue = a.method;
          bValue = b.method;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [historyEntries, filters, sortField, sortOrder]);

  /**
   * Handle undo identification
   */
  const handleUndo = useCallback(async (entry: HistoryEntry) => {
    if (!entry.undoable) return;

    try {
      // In production, this would call the service to undo the identification
      // For now, we'll just simulate the undo
      
      // Add to undo stack
      setUndoStack(prev => [...prev, entry]);
      
      // Update entry
      const updatedEntry: HistoryEntry = {
        ...entry,
        action: 'undone',
        timestamp: new Date(),
        undoable: false
      };

      setHistoryEntries(prev => 
        prev.map(e => e.id === entry.id ? updatedEntry : e)
      );

      // Clear redo stack
      setRedoStack([]);

    } catch (err) {
      console.error('Failed to undo identification:', err);
      setError(err instanceof Error ? err.message : 'Failed to undo identification');
    }
  }, []);

  /**
   * Handle redo identification
   */
  const handleRedo = useCallback(async () => {
    if (undoStack.length === 0) return;

    try {
      const lastUndo = undoStack[undoStack.length - 1];
      
      // In production, this would call the service to redo the identification
      
      // Remove from undo stack and add to redo stack
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastUndo]);

      // Restore original entry
      setHistoryEntries(prev => 
        prev.map(e => e.id === lastUndo.id ? lastUndo : e)
      );

    } catch (err) {
      console.error('Failed to redo identification:', err);
      setError(err instanceof Error ? err.message : 'Failed to redo identification');
    }
  }, [undoStack]);

  /**
   * Export history data
   */
  const handleExport = useCallback(() => {
    const exportData = filteredAndSortedEntries.map(entry => ({
      timestamp: entry.timestamp.toISOString(),
      speakerLabel: entry.speakerLabel,
      meetingTitle: entry.meetingTitle,
      meetingDate: entry.meetingDate.toISOString(),
      action: entry.action,
      method: entry.method,
      userName: entry.userName || '',
      confidence: entry.confidence
    }));

    const csvContent = [
      // Headers
      'Timestamp,Speaker Label,Meeting Title,Meeting Date,Action,Method,User Name,Confidence',
      // Data rows
      ...exportData.map(row => 
        `${row.timestamp},${row.speakerLabel},${row.meetingTitle},${row.meetingDate},${row.action},${row.method},${row.userName},${row.confidence}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice-identification-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAndSortedEntries]);

  /**
   * Get action badge styles
   */
  const getActionBadgeStyles = (action: string) => {
    switch (action) {
      case 'identified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'undone':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get method icon
   */
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'manual':
        return <User className="h-4 w-4" />;
      case 'suggested':
        return <BarChart3 className="h-4 w-4" />;
      case 'matched':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // Load initial data
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Identification History</span>
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            View and manage voice identification decisions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {undoStack.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              className="flex items-center space-x-2"
            >
              <Redo className="h-4 w-4" />
              <span>Redo</span>
            </Button>
          )}

          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Decisions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
              </div>
              <History className="h-6 w-6 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Identified</p>
                <p className="text-2xl font-bold text-green-600">{stats.identifiedCount}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalEntries > 0 ? Math.round((stats.identifiedCount / stats.totalEntries) * 100) : 0}% success rate
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(stats.averageConfidence * 100)}%
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Accuracy Trend</p>
                <p className={`text-2xl font-bold ${stats.accuracyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.accuracyTrend >= 0 ? '+' : ''}{Math.round(stats.accuracyTrend * 100)}%
                </p>
              </div>
              {stats.accuracyTrend >= 0 ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500" />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {showFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedEntries.length} of {historyEntries.length} entries
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    placeholder="Search speakers, meetings..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={filters.actionFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, actionFilter: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Actions</option>
                  <option value="identified">Identified</option>
                  <option value="skipped">Skipped</option>
                  <option value="undone">Undone</option>
                </select>
              </div>

              {/* Method Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <select
                  value={filters.methodFilter}
                  onChange={(e) => setFilters(prev => ({ ...prev, methodFilter: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Methods</option>
                  <option value="manual">Manual</option>
                  <option value="suggested">AI Suggested</option>
                  <option value="matched">Profile Matched</option>
                </select>
              </div>

              {/* Sort Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="timestamp">Date</option>
                  <option value="confidence">Confidence</option>
                  <option value="meeting">Meeting</option>
                  <option value="speaker">Speaker</option>
                  <option value="method">Method</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      )}

      {/* History Entries */}
      <div className="space-y-3">
        {filteredAndSortedEntries.length === 0 ? (
          <Card className="p-8 text-center">
            <History className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No History Found
            </h3>
            <p className="text-gray-600">
              No identification decisions match your current filters.
            </p>
          </Card>
        ) : (
          filteredAndSortedEntries.map((entry) => {
            const isExpanded = expandedEntry === entry.id;
            
            return (
              <Card 
                key={entry.id}
                className="p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {entry.speakerLabel}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getActionBadgeStyles(entry.action)}`}>
                        {entry.action}
                      </span>
                      <div className="flex items-center space-x-1 text-gray-500">
                        {getMethodIcon(entry.method)}
                        <span className="text-xs">{entry.method}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Meeting: {entry.meetingTitle}</span>
                      <span>•</span>
                      <span>{entry.timestamp.toLocaleDateString()}</span>
                      {entry.confidence > 0 && (
                        <>
                          <span>•</span>
                          <span>{Math.round(entry.confidence * 100)}% confidence</span>
                        </>
                      )}
                    </div>
                    
                    {entry.userName && (
                      <p className="text-sm text-gray-700 mt-1">
                        Identified as: <span className="font-medium">{entry.userName}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                      className="flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{isExpanded ? 'Hide' : 'Details'}</span>
                    </Button>
                    
                    {entry.undoable && entry.action === 'identified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUndo(entry)}
                        className="flex items-center space-x-2 text-orange-600 hover:text-orange-700"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Undo</span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Meeting Details</p>
                        <p className="text-gray-600">Date: {entry.meetingDate.toLocaleDateString()}</p>
                        <p className="text-gray-600">Time: {entry.meetingDate.toLocaleTimeString()}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-700">Identification Details</p>
                        <p className="text-gray-600">Method: {entry.method}</p>
                        <p className="text-gray-600">Timestamp: {entry.timestamp.toLocaleString()}</p>
                        {entry.confidence > 0 && (
                          <div className="mt-2">
                            <p className="text-gray-600 mb-1">Confidence: {Math.round(entry.confidence * 100)}%</p>
                            <AccessibleLinearProgress 
                              progress={entry.confidence * 100}
                              label={`Confidence: ${Math.round(entry.confidence * 100)}%`}
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {entry.originalRequest && (
                      <div>
                        <p className="font-medium text-gray-700 mb-2">Sample Transcripts</p>
                        <div className="space-y-2">
                          {entry.originalRequest.sampleTranscripts.slice(0, 2).map((sample, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-700 italic">
                                "{sample.text}"
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {sample.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Daily Activity Chart */}
      {showAnalytics && stats.dailyActivity.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity (Last 7 Days)</h3>
          <div className="space-y-3">
            {stats.dailyActivity.map((day, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-20 text-sm text-gray-600">
                  {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{day.count} decisions</span>
                    <span className="text-sm text-gray-600">{Math.round(day.accuracy * 100)}% identified</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max((day.count / Math.max(...stats.dailyActivity.map(d => d.count))) * 100, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default IdentificationHistoryView;