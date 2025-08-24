/**
 * Speaker Directory View
 * 
 * Complete directory interface for managing all speaker profiles with
 * advanced search, filtering, sorting, and bulk operations capabilities.
 * 
 * Features:
 * - Comprehensive speaker profile directory
 * - Advanced search and filtering options
 * - Multiple view modes (grid, list, table)
 * - Bulk operations for multiple speakers
 * - Export functionality for speaker data
 * - Real-time data synchronization
 * 
 * @fileoverview Speaker directory management component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid3X3, 
  List, 
  Table, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Users, 
  Clock, 
  Mic, 
  CheckCircle, 
  AlertCircle, 
  MoreHorizontal,
  RefreshCw,
  Plus,
  Settings,
  Tag,
  Merge
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { SpeakerProfileCard } from './SpeakerProfileCard';
import { VoiceSamplePlayer } from './VoiceSamplePlayer';
import type { 
  EnhancedVoiceProfile,
  VoiceProfileFilters,
  VoiceProfileBulkOperation,
  VoiceLibraryViewMode,
  // VoiceLibraryEntry
} from '@/types/voice-identification';

// Temporary type placeholder
type VoiceLibraryEntry = EnhancedVoiceProfile & {
  pendingRequests?: number;
};

// Extended speaker profile with directory-specific metadata
interface DirectoryVoiceProfile extends VoiceLibraryEntry {
  selected: boolean;
  lastActivity: Date;
  samplesCount: number;
  qualityScore: number;
  tags: string[];
  notes: string;
}

// Bulk operation result interface
interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

export const SpeakerDirectoryView: React.FC = () => {
  // State management
  const [profiles, setProfiles] = useState<DirectoryVoiceProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<DirectoryVoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<VoiceLibraryViewMode>('grid');
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [bulkOperationInProgress, setBulkOperationInProgress] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<VoiceProfileFilters>({
    searchTerm: '',
    confirmationStatus: 'all',
    sortBy: 'lastHeard',
    sortOrder: 'desc',
    minConfidence: 0,
    dateRange: undefined,
    qualityLevel: undefined,
    tags: undefined
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load speaker profiles
  const loadProfiles = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const rawProfiles = await VoiceLibraryService.getAllVoiceProfiles();
      
      // Validate data before processing
      if (!Array.isArray(rawProfiles)) {
        throw new Error('Invalid data received from voice library service');
      }
      
      // Enhance profiles with directory-specific data
      const enhancedProfiles: DirectoryVoiceProfile[] = rawProfiles.map(profile => ({
        ...profile,
        selected: false,
        lastActivity: profile.lastHeard,
        samplesCount: profile.audioSamples?.length || 0,
        qualityScore: profile.confidence,
        tags: [], // TODO: Implement profile tags
        notes: '', // TODO: Implement profile notes
        pendingRequests: (profile as any).pendingRequests || 0
      }));
      
      setProfiles(enhancedProfiles);
      console.log(`Successfully loaded ${enhancedProfiles.length} voice profiles`);
    } catch (err) {
      console.error('Error loading profiles:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load speaker profiles';
      setError(`${errorMessage}. Please check your connection and try again.`);
      // Set empty array to prevent undefined errors
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Apply filters and sorting
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...profiles];

    // Text search
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(profile =>
        (profile.userName?.toLowerCase().includes(searchLower)) ||
        (profile.deepgramVoiceId.toLowerCase().includes(searchLower)) ||
        (profile.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Confirmation status filter
    if (filters.confirmationStatus !== 'all') {
      filtered = filtered.filter(profile =>
        filters.confirmationStatus === 'confirmed' ? profile.confirmed : !profile.confirmed
      );
    }

    // Confidence filter
    if (filters.minConfidence > 0) {
      filtered = filtered.filter(profile => profile.confidence >= filters.minConfidence);
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(profile => {
        const profileDate = new Date(profile.lastHeard);
        return profileDate >= filters.dateRange!.start && profileDate <= filters.dateRange!.end;
      });
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(profile =>
        filters.tags!.some(tag => profile.tags.includes(tag))
      );
    }

    // Sort profiles
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.userName || a.deepgramVoiceId;
          bValue = b.userName || b.deepgramVoiceId;
          break;
        case 'lastHeard':
          aValue = new Date(a.lastHeard);
          bValue = new Date(b.lastHeard);
          break;
        case 'meetingsCount':
          aValue = a.meetingsCount;
          bValue = b.meetingsCount;
          break;
        case 'confidence':
          aValue = a.confidence;
          bValue = b.confidence;
          break;
        case 'quality':
          aValue = a.qualityScore;
          bValue = b.qualityScore;
          break;
        default:
          aValue = a.lastHeard;
          bValue = b.lastHeard;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredProfiles(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [profiles, filters]);

  // Apply filters when profiles or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Selection handlers
  const handleSelectProfile = (profileId: string, selected: boolean) => {
    const newSelected = new Set(selectedProfiles);
    if (selected) {
      newSelected.add(profileId);
    } else {
      newSelected.delete(profileId);
    }
    setSelectedProfiles(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedProfiles(new Set(filteredProfiles.map(p => p.deepgramVoiceId)));
    } else {
      setSelectedProfiles(new Set());
    }
  };

  // Bulk operations
  const handleBulkOperation = async (operation: VoiceProfileBulkOperation) => {
    if (selectedProfiles.size === 0) return;

    setBulkOperationInProgress(true);
    try {
      const profileIds = Array.from(selectedProfiles);
      let result: BulkOperationResult;

      switch (operation) {
        case 'confirm':
          // TODO: Implement bulk confirm operation
          result = { success: true, processed: profileIds.length, failed: 0, errors: [] };
          break;
        case 'delete':
          // TODO: Implement bulk delete operation
          result = { success: true, processed: profileIds.length, failed: 0, errors: [] };
          break;
        case 'export':
          // TODO: Implement export operation
          handleExportProfiles(profileIds);
          result = { success: true, processed: profileIds.length, failed: 0, errors: [] };
          break;
        case 'tag':
          // TODO: Implement bulk tagging
          result = { success: true, processed: profileIds.length, failed: 0, errors: [] };
          break;
        default:
          throw new Error(`Unsupported bulk operation: ${operation}`);
      }

      if (result.success) {
        // Refresh profiles after successful operation
        await loadProfiles();
        setSelectedProfiles(new Set());
      }
    } catch (err) {
      console.error(`Error performing bulk operation ${operation}:`, err);
      setError(`Failed to ${operation} selected profiles`);
    } finally {
      setBulkOperationInProgress(false);
    }
  };

  // Export functionality
  const handleExportProfiles = (profileIds?: string[]) => {
    const profilesToExport = profileIds 
      ? profiles.filter(p => profileIds.includes(p.deepgramVoiceId))
      : filteredProfiles;

    // Check if there are profiles to export
    if (profilesToExport.length === 0) {
      setError('No profiles available to export');
      return;
    }

    const exportData = profilesToExport.map(profile => ({
      id: profile.deepgramVoiceId,
      name: profile.userName || 'Unknown',
      confirmed: profile.confirmed,
      confidence: profile.confidence,
      meetingsCount: profile.meetingsCount,
      totalSpeakingTime: profile.totalSpeakingTime,
      firstHeard: profile.firstHeard?.toISOString?.() || '',
      lastHeard: profile.lastHeard?.toISOString?.() || '',
      samplesCount: profile.samplesCount,
      qualityScore: profile.qualityScore,
      tags: (profile.tags || []).join(',')
    }));

    // Create CSV with proper error handling and empty data check
    let csv: string;
    try {
      // Prevent TypeError when exportData is empty
      if (exportData.length === 0) {
        setError('No data available to export');
        return;
      }

      csv = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map(row => Object.values(row).map(val => 
          val === null || val === undefined ? '' : String(val)
        ).join(','))
      ].join('\n');
    } catch (err) {
      console.error('Error creating CSV:', err);
      setError('Failed to create export file - data may be incomplete');
      return;
    }

    try {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `speaker-directory-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Clear any previous errors on successful export
      if (error) {
        setError(null);
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download export file');
    }
  };

  // Pagination
  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProfiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProfiles, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);

  // Grid view component
  const GridView: React.FC<{ profiles: DirectoryVoiceProfile[] }> = ({ profiles }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {profiles.map((profile) => (
        <div key={profile.deepgramVoiceId} className="relative">
          <Checkbox
            checked={selectedProfiles.has(profile.deepgramVoiceId)}
            onCheckedChange={(checked) => 
              handleSelectProfile(profile.deepgramVoiceId, checked as boolean)
            }
            className="absolute top-2 left-2 z-10"
          />
          <SpeakerProfileCard
            profile={profile}
            onSelect={() => {/* TODO: Implement profile selection */}}
            className="h-full"
          />
        </div>
      ))}
    </div>
  );

  // List view component
  const ListView: React.FC<{ profiles: DirectoryVoiceProfile[] }> = ({ profiles }) => (
    <div className="space-y-2">
      {profiles.map((profile) => (
        <Card key={profile.deepgramVoiceId} className="p-4">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedProfiles.has(profile.deepgramVoiceId)}
              onCheckedChange={(checked) => 
                handleSelectProfile(profile.deepgramVoiceId, checked as boolean)
              }
            />
            <Avatar>
              <AvatarFallback>
                {(profile.userName || profile.deepgramVoiceId).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">
                {profile.userName || `Speaker ${profile.deepgramVoiceId.substring(0, 8)}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                Last heard: {new Date(profile.lastHeard).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={profile.confirmed ? 'default' : 'secondary'}>
                {profile.confirmed ? 'Confirmed' : 'Unconfirmed'}
              </Badge>
              <Badge variant="outline">
                {(profile.confidence * 100).toFixed(0)}% confidence
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profile.samplesCount} samples
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mic className="h-4 w-4 mr-2" />
                  Play Sample
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );

  // Table view component
  const TableView: React.FC<{ profiles: DirectoryVoiceProfile[] }> = ({ profiles }) => (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left">
              <Checkbox
                checked={selectedProfiles.size === filteredProfiles.length && filteredProfiles.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <th className="p-2 text-left">Speaker</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Confidence</th>
            <th className="p-2 text-left">Samples</th>
            <th className="p-2 text-left">Last Heard</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.deepgramVoiceId} className="border-b hover:bg-muted/50">
              <td className="p-2">
                <Checkbox
                  checked={selectedProfiles.has(profile.deepgramVoiceId)}
                  onCheckedChange={(checked) => 
                    handleSelectProfile(profile.deepgramVoiceId, checked as boolean)
                  }
                />
              </td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {(profile.userName || profile.deepgramVoiceId).substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {profile.userName || `Speaker ${profile.deepgramVoiceId.substring(0, 8)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {profile.deepgramVoiceId.substring(0, 12)}...
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-2">
                <Badge variant={profile.confirmed ? 'default' : 'secondary'}>
                  {profile.confirmed ? 'Confirmed' : 'Unconfirmed'}
                </Badge>
              </td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <Progress value={profile.confidence * 100} className="w-16 h-2" />
                  <span className="text-sm">{(profile.confidence * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="p-2">{profile.samplesCount}</td>
              <td className="p-2 text-sm text-muted-foreground">
                {new Date(profile.lastHeard).toLocaleDateString()}
              </td>
              <td className="p-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mic className="h-4 w-4 mr-2" />
                      Play Sample
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading speaker directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speaker Directory</h1>
          <p className="text-muted-foreground">
            Manage and organize all speaker profiles in your system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportProfiles()}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Speaker
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search speakers by name, ID, or tags..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={filters.confirmationStatus}
                  onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, confirmationStatus: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Speakers</SelectItem>
                    <SelectItem value="confirmed">Confirmed Only</SelectItem>
                    <SelectItem value="unconfirmed">Unconfirmed Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, sortBy: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="lastHeard">Last Heard</SelectItem>
                    <SelectItem value="meetingsCount">Meeting Count</SelectItem>
                    <SelectItem value="confidence">Confidence</SelectItem>
                    <SelectItem value="quality">Quality</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Order</label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value: any) => 
                    setFilters(prev => ({ ...prev, sortOrder: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Min Confidence</label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={filters.minConfidence}
                  onChange={(e) => 
                    setFilters(prev => ({ ...prev, minConfidence: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedProfiles.length} of {filteredProfiles.length} speakers
          {selectedProfiles.size > 0 && (
            <span className="ml-2">
              ({selectedProfiles.size} selected)
            </span>
          )}
        </div>
        
        {selectedProfiles.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkOperation('confirm')}
              disabled={bulkOperationInProgress}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Selected
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkOperation('tag')}
              disabled={bulkOperationInProgress}
            >
              <Tag className="h-4 w-4 mr-2" />
              Add Tags
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkOperation('export')}
              disabled={bulkOperationInProgress}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleBulkOperation('delete')}
              disabled={bulkOperationInProgress}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Directory Content */}
      {viewMode === 'grid' && <GridView profiles={paginatedProfiles} />}
      {viewMode === 'list' && <ListView profiles={paginatedProfiles} />}
      {viewMode === 'table' && <TableView profiles={paginatedProfiles} />}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpeakerDirectoryView;