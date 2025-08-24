'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Users,
  TrendingUp,
  Target,
  BarChart,
  PieChart,
  Activity,
  Clock,
  Star,
  CheckCircle,
  AlertTriangle,
  Zap,
  Layers,
  Brain,
  Mic,
  FileAudio,
  Settings,
  Filter,
  Download,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Trash2,
  Award,
  Calendar,
  Volume2,
  Database,
  TrendingDown,
  AlertCircle,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import type { VoiceLibraryEntry } from '@/types/database';

// Dashboard metrics interfaces
interface DashboardMetrics {
  totalProfiles: number;
  activeProfiles: number;
  totalSamples: number;
  averageQuality: number;
  trainingCompletionRate: number;
  identificationAccuracy: number;
  weeklyProgress: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'profile_created' | 'training_completed' | 'sample_added' | 'quality_improved' | 'milestone_reached';
  profileId: string;
  profileName: string;
  timestamp: Date;
  details: string;
  metadata?: any;
}

// Training progress summary
interface TrainingProgressSummary {
  profileId: string;
  profileName: string;
  status: 'draft' | 'training' | 'active' | 'needs_attention';
  samplesCount: number;
  qualityScore: number;
  completeness: number;
  lastActivity: Date;
  milestones: {
    completed: number;
    total: number;
  };
  recommendations: string[];
  priority: 'high' | 'medium' | 'low';
}

// Bulk operation types
type BulkOperation = 'activate' | 'archive' | 'delete' | 'export' | 'retrain';

// Filter and sort options
interface FilterOptions {
  status?: string[];
  priority?: string[];
  qualityRange?: [number, number];
  completenessRange?: [number, number];
  dateRange?: [Date, Date];
  searchTerm?: string;
}

interface SortOptions {
  field: 'name' | 'status' | 'quality' | 'completeness' | 'lastActivity' | 'priority';
  order: 'asc' | 'desc';
}

// Props interface
interface TrainingProgressDashboardProps {
  onCreateProfile?: () => void;
  onEditProfile?: (profileId: string) => void;
  onViewProfile?: (profileId: string) => void;
  onDeleteProfile?: (profileId: string) => void;
  onBulkOperation?: (operation: BulkOperation, profileIds: string[]) => void;
  refreshInterval?: number;
  className?: string;
}

/**
 * TrainingProgressDashboard - Overview of all training progress
 */
export const TrainingProgressDashboard: React.FC<TrainingProgressDashboardProps> = ({
  onCreateProfile,
  onEditProfile,
  onViewProfile,
  onDeleteProfile,
  onBulkOperation,
  refreshInterval = 30000, // 30 seconds
  className
}) => {
  // State management
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [profiles, setProfiles] = useState<TrainingProgressSummary[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'lastActivity', order: 'desc' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadDashboardData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(loadDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all voice profiles
      const voiceEntries = await loadAllVoiceProfiles();
      
      // Calculate metrics
      const calculatedMetrics = calculateDashboardMetrics(voiceEntries);
      setMetrics(calculatedMetrics);

      // Convert to training progress summaries
      const profileSummaries = voiceEntries.map(entry => 
        createTrainingProgressSummary(entry)
      );
      setProfiles(profileSummaries);

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Dashboard data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllVoiceProfiles = async (): Promise<VoiceLibraryEntry[]> => {
    // In a real implementation, this would load all profiles
    // For now, we'll simulate loading confirmed and unconfirmed voices
    try {
      const [confirmedVoices, unconfirmedVoices] = await Promise.all([
        // VoiceLibraryService doesn't have a "get all" method, so we'll simulate
        Promise.resolve([]) as Promise<VoiceLibraryEntry[]>,
        VoiceLibraryService.getUnconfirmedVoices(50)
      ]);

      return [...confirmedVoices, ...unconfirmedVoices];
    } catch (err) {
      console.error('Error loading voice profiles:', err);
      return [];
    }
  };

  const calculateDashboardMetrics = (entries: VoiceLibraryEntry[]): DashboardMetrics => {
    const totalProfiles = entries.length;
    const activeProfiles = entries.filter(e => e.confirmed).length;
    const totalSamples = entries.reduce((sum, e) => sum + e.audioSamples.length, 0);
    
    const averageQuality = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
      : 0;

    const trainingCompletionRate = totalProfiles > 0 
      ? (activeProfiles / totalProfiles) 
      : 0;

    // Generate recent activity
    const recentActivity: ActivityItem[] = entries
      .flatMap(entry => 
        entry.identificationHistory.map(history => ({
          id: `activity_${entry.deepgramVoiceId}_${history.timestamp.getTime()}`,
          type: 'sample_added' as const,
          profileId: entry.deepgramVoiceId,
          profileName: entry.userName || 'Unknown Speaker',
          timestamp: history.timestamp,
          details: history.details,
          metadata: { method: history.method, confidence: history.confidence }
        }))
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalProfiles,
      activeProfiles,
      totalSamples,
      averageQuality,
      trainingCompletionRate,
      identificationAccuracy: averageQuality, // Simplified
      weeklyProgress: 0.15, // Simulated 15% weekly improvement
      recentActivity
    };
  };

  const createTrainingProgressSummary = (entry: VoiceLibraryEntry): TrainingProgressSummary => {
    const samplesCount = entry.audioSamples.length;
    const qualityScore = entry.confidence;
    const completeness = Math.min(samplesCount / 5, 1); // Target: 5 samples
    
    // Determine status
    let status: TrainingProgressSummary['status'] = 'draft';
    if (entry.confirmed) {
      status = 'active';
    } else if (samplesCount > 0) {
      status = qualityScore < 0.5 ? 'needs_attention' : 'training';
    }

    // Determine priority
    let priority: TrainingProgressSummary['priority'] = 'low';
    if (!entry.confirmed && samplesCount > 0) {
      priority = qualityScore < 0.5 ? 'high' : 'medium';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (samplesCount < 3) {
      recommendations.push('Add more voice samples');
    }
    if (qualityScore < 0.7) {
      recommendations.push('Improve recording quality');
    }
    if (!entry.confirmed && samplesCount >= 3) {
      recommendations.push('Ready for voice identification');
    }

    return {
      profileId: entry.deepgramVoiceId,
      profileName: entry.userName || 'Unknown Speaker',
      status,
      samplesCount,
      qualityScore,
      completeness,
      lastActivity: entry.lastHeard,
      milestones: {
        completed: Math.min(Math.floor(completeness * 5), 5),
        total: 5
      },
      recommendations,
      priority
    };
  };

  // Filter and sort profiles
  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = profiles.filter(profile => {
      // Apply filters
      if (filters.status?.length && !filters.status.includes(profile.status)) {
        return false;
      }
      if (filters.priority?.length && !filters.priority.includes(profile.priority)) {
        return false;
      }
      if (filters.qualityRange) {
        const [min, max] = filters.qualityRange;
        if (profile.qualityScore < min || profile.qualityScore > max) {
          return false;
        }
      }
      if (filters.completenessRange) {
        const [min, max] = filters.completenessRange;
        if (profile.completeness < min || profile.completeness > max) {
          return false;
        }
      }
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return profile.profileName.toLowerCase().includes(searchLower);
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      const { field, order } = sortOptions;
      let aVal, bVal;

      switch (field) {
        case 'name':
          aVal = a.profileName.toLowerCase();
          bVal = b.profileName.toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'quality':
          aVal = a.qualityScore;
          bVal = b.qualityScore;
          break;
        case 'completeness':
          aVal = a.completeness;
          bVal = b.completeness;
          break;
        case 'lastActivity':
          aVal = a.lastActivity.getTime();
          bVal = b.lastActivity.getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority];
          bVal = priorityOrder[b.priority];
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [profiles, filters, sortOptions]);

  const handleSelectProfile = useCallback((profileId: string, selected: boolean) => {
    const newSelection = new Set(selectedProfiles);
    if (selected) {
      newSelection.add(profileId);
    } else {
      newSelection.delete(profileId);
    }
    setSelectedProfiles(newSelection);
  }, [selectedProfiles]);

  const handleSelectAll = useCallback(() => {
    if (selectedProfiles.size === filteredAndSortedProfiles.length) {
      setSelectedProfiles(new Set());
    } else {
      setSelectedProfiles(new Set(filteredAndSortedProfiles.map(p => p.profileId)));
    }
  }, [selectedProfiles, filteredAndSortedProfiles]);

  const handleBulkAction = useCallback((operation: BulkOperation) => {
    if (selectedProfiles.size === 0) return;
    
    onBulkOperation?.(operation, Array.from(selectedProfiles));
    setSelectedProfiles(new Set());
    setShowBulkActions(false);
  }, [selectedProfiles, onBulkOperation]);

  const toggleCardExpansion = useCallback((profileId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(profileId)) {
      newExpanded.delete(profileId);
    } else {
      newExpanded.add(profileId);
    }
    setExpandedCards(newExpanded);
  }, [expandedCards]);

  if (isLoading && !metrics) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Voice Training Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Monitor and manage voice identification training progress
          </p>
          <p className="text-sm text-neutral-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <SecondaryButton
            onClick={loadDashboardData}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            disabled={isLoading}
          >
            Refresh
          </SecondaryButton>

          {onCreateProfile && (
            <PrimaryButton
              onClick={onCreateProfile}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Profile
            </PrimaryButton>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="p-4 border-danger-200 bg-danger-50 dark:bg-danger-900/20">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
            <p className="text-danger-800 dark:text-danger-200">{error}</p>
          </div>
        </Card>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Profiles"
            value={metrics.totalProfiles}
            icon={<Users className="w-6 h-6" />}
            trend={metrics.totalProfiles > 0 ? 'up' : 'neutral'}
            color="primary"
          />
          
          <MetricCard
            title="Active Profiles"
            value={metrics.activeProfiles}
            subtitle={`${Math.round(metrics.trainingCompletionRate * 100)}% completion rate`}
            icon={<CheckCircle className="w-6 h-6" />}
            trend={metrics.trainingCompletionRate > 0.5 ? 'up' : 'down'}
            color="success"
          />
          
          <MetricCard
            title="Average Quality"
            value={`${Math.round(metrics.averageQuality * 100)}%`}
            icon={<Star className="w-6 h-6" />}
            trend={metrics.averageQuality >= 0.7 ? 'up' : 'down'}
            color="warning"
          />
          
          <MetricCard
            title="Total Samples"
            value={metrics.totalSamples}
            subtitle={`Weekly growth: +${Math.round(metrics.weeklyProgress * 100)}%`}
            icon={<FileAudio className="w-6 h-6" />}
            trend="up"
            color="info"
          />
        </div>
      )}

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Left side: Search and filters */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search profiles..."
                className="pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                         bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                         focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="w-4 h-4" />}
              rightIcon={showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            >
              Filters
            </Button>

            <select
              value={`${sortOptions.field}-${sortOptions.order}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortOptions({ field: field as SortOptions['field'], order: order as SortOptions['order'] });
              }}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                       bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                       focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            >
              <option value="lastActivity-desc">Latest Activity</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="quality-desc">Best Quality</option>
              <option value="completeness-desc">Most Complete</option>
              <option value="priority-desc">High Priority</option>
            </select>
          </div>

          {/* Right side: View controls and bulk actions */}
          <div className="flex items-center space-x-3">
            {selectedProfiles.size > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBulkActions(!showBulkActions)}
                leftIcon={<Settings className="w-4 h-4" />}
              >
                Bulk Actions ({selectedProfiles.size})
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              leftIcon={viewMode === 'grid' ? <BarChart className="w-4 h-4" /> : <PieChart className="w-4 h-4" />}
            >
              {viewMode === 'grid' ? 'List' : 'Grid'}
            </Button>
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Status
                  </label>
                  <select
                    multiple
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                             bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                             focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                      setFilters(prev => ({ ...prev, status: selected }));
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="training">Training</option>
                    <option value="active">Active</option>
                    <option value="needs_attention">Needs Attention</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Priority
                  </label>
                  <select
                    multiple
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg
                             bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                             focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                      setFilters(prev => ({ ...prev, priority: selected }));
                    }}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Min Quality (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={(filters.qualityRange?.[0] ?? 0) * 100}
                    onChange={(e) => {
                      const min = parseInt(e.target.value) / 100;
                      setFilters(prev => ({ 
                        ...prev, 
                        qualityRange: [min, prev.qualityRange?.[1] ?? 1] 
                      }));
                    }}
                    className="w-full"
                  />
                  <div className="text-sm text-neutral-500 mt-1">
                    {Math.round((filters.qualityRange?.[0] ?? 0) * 100)}%
                  </div>
                </div>

                <div>
                  <Button
                    variant="outline"
                    onClick={() => setFilters({})}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk actions panel */}
        <AnimatePresence>
          {showBulkActions && selectedProfiles.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg overflow-hidden"
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('activate')}
                  leftIcon={<CheckCircle className="w-3 h-3" />}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('archive')}
                  leftIcon={<Archive className="w-3 h-3" />}
                >
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('retrain')}
                  leftIcon={<RefreshCw className="w-3 h-3" />}
                >
                  Retrain
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('export')}
                  leftIcon={<Download className="w-3 h-3" />}
                >
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleBulkAction('delete')}
                  leftIcon={<Trash2 className="w-3 h-3" />}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Profiles display */}
      {filteredAndSortedProfiles.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            No voice profiles found
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {profiles.length === 0 
              ? 'Create your first voice profile to get started.'
              : 'No profiles match your current filters.'
            }
          </p>
          {onCreateProfile && (
            <PrimaryButton
              onClick={onCreateProfile}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Voice Profile
            </PrimaryButton>
          )}
        </Card>
      ) : (
        <>
          {/* Bulk selection header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedProfiles.size === filteredAndSortedProfiles.length}
                onChange={handleSelectAll}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedProfiles.size > 0 
                  ? `${selectedProfiles.size} of ${filteredAndSortedProfiles.length} selected`
                  : `${filteredAndSortedProfiles.length} profiles`
                }
              </span>
            </div>
          </div>

          {/* Profiles grid/list */}
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
          }>
            {filteredAndSortedProfiles.map((profile) => (
              <ProfileCard
                key={profile.profileId}
                profile={profile}
                viewMode={viewMode}
                isSelected={selectedProfiles.has(profile.profileId)}
                isExpanded={expandedCards.has(profile.profileId)}
                onSelect={(selected) => handleSelectProfile(profile.profileId, selected)}
                onExpand={() => toggleCardExpansion(profile.profileId)}
                onView={() => onViewProfile?.(profile.profileId)}
                onEdit={() => onEditProfile?.(profile.profileId)}
                onDelete={() => onDeleteProfile?.(profile.profileId)}
              />
            ))}
          </div>
        </>
      )}

      {/* Recent Activity */}
      {metrics?.recentActivity && metrics.recentActivity.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Recent Activity
          </h3>
          
          <div className="space-y-3">
            {metrics.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">
                    <span className="font-medium">{activity.profileName}</span> - {activity.details}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {activity.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// Metric card component
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
  color = 'primary'
}) => {
  const colorClasses = {
    primary: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30',
    success: 'text-success-600 bg-success-100 dark:bg-success-900/30',
    warning: 'text-warning-600 bg-warning-100 dark:bg-warning-900/30',
    danger: 'text-danger-600 bg-danger-100 dark:bg-danger-900/30',
    info: 'text-info-600 bg-info-100 dark:bg-info-900/30'
  };

  const trendIcons = {
    up: <TrendingUp className="w-3 h-3 text-success-600" />,
    down: <TrendingDown className="w-3 h-3 text-danger-600" />,
    neutral: null
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            {title}
          </p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {value}
            </p>
            {trendIcons[trend]}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

// Profile card component
interface ProfileCardProps {
  profile: TrainingProgressSummary;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (selected: boolean) => void;
  onExpand: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  viewMode,
  isSelected,
  isExpanded,
  onSelect,
  onExpand,
  onView,
  onEdit,
  onDelete
}) => {
  const statusConfig = {
    draft: { color: 'neutral', icon: <Edit className="w-4 h-4" />, label: 'Draft' },
    training: { color: 'warning', icon: <Activity className="w-4 h-4" />, label: 'Training' },
    active: { color: 'success', icon: <CheckCircle className="w-4 h-4" />, label: 'Active' },
    needs_attention: { color: 'danger', icon: <AlertTriangle className="w-4 h-4" />, label: 'Needs Attention' }
  };

  const priorityConfig = {
    high: { color: 'danger', label: 'High Priority' },
    medium: { color: 'warning', label: 'Medium Priority' },
    low: { color: 'success', label: 'Low Priority' }
  };

  const status = statusConfig[profile.status];
  const priority = priorityConfig[profile.priority];

  return (
    <Card className={`
      p-4 transition-all cursor-pointer
      ${isSelected ? 'ring-2 ring-primary-600 border-primary-600' : ''}
      ${viewMode === 'list' ? 'hover:shadow-md' : ''}
    `}>
      <div className={viewMode === 'list' ? 'flex items-center space-x-4' : 'space-y-3'}>
        {/* Selection and basic info */}
        <div className={viewMode === 'list' ? 'flex items-center space-x-3' : 'flex justify-between items-start'}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          
          <div className={viewMode === 'list' ? 'flex-1' : ''}>
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
                {profile.profileName}
              </h3>
              
              <span className={`
                inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium
                ${status.color === 'success' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                  status.color === 'warning' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                  status.color === 'danger' ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300' :
                  'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                }
              `}>
                {status.icon}
                <span>{status.label}</span>
              </span>

              {profile.priority === 'high' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  High Priority
                </span>
              )}
            </div>

            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {profile.samplesCount} samples • {Math.round(profile.qualityScore * 100)}% quality • {Math.round(profile.completeness * 100)}% complete
            </div>

            <div className="text-xs text-neutral-500 mt-1">
              Last activity: {profile.lastActivity.toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Progress indicators */}
        <div className={viewMode === 'list' ? 'w-48' : 'w-full'}>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                <span>Quality</span>
                <span>{Math.round(profile.qualityScore * 100)}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    profile.qualityScore >= 0.8 ? 'bg-success-600' :
                    profile.qualityScore >= 0.6 ? 'bg-warning-600' :
                    'bg-danger-600'
                  }`}
                  style={{ width: `${profile.qualityScore * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                <span>Completeness</span>
                <span>{Math.round(profile.completeness * 100)}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${profile.completeness * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`
          flex items-center space-x-2
          ${viewMode === 'list' ? '' : 'justify-end'}
        `}>
          <Button
            size="sm"
            variant="outline"
            onClick={onView}
            leftIcon={<Eye className="w-3 h-3" />}
          >
            View
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            leftIcon={<Edit className="w-3 h-3" />}
          >
            Edit
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onExpand}
            leftIcon={isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          >
            {isExpanded ? 'Less' : 'More'}
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700"
          >
            <div className="space-y-3">
              {/* Milestones */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Progress Milestones ({profile.milestones.completed}/{profile.milestones.total})
                </h4>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                  <div 
                    className="bg-success-600 h-2 rounded-full"
                    style={{ width: `${(profile.milestones.completed / profile.milestones.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Recommendations */}
              {profile.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Recommendations
                  </h4>
                  <div className="space-y-1">
                    {profile.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Target className="w-3 h-3 text-primary-600 mt-0.5" />
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

// Archive icon component (since we don't have it in the imports)
const Archive: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-2 14H5L3 4z" />
  </svg>
);

export default TrainingProgressDashboard;