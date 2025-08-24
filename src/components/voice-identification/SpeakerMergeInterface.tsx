/**
 * Speaker Merge Interface
 * 
 * Interface for identifying and merging duplicate speaker profiles.
 * Provides side-by-side comparison, voice similarity analysis,
 * and conflict resolution tools for profile merging.
 * 
 * Features:
 * - Automated duplicate detection
 * - Side-by-side profile comparison
 * - Voice sample similarity scoring
 * - Merge conflict resolution
 * - Bulk merge operations
 * - Undo/rollback capabilities
 * 
 * @fileoverview Speaker profile merging interface
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Merge, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Search, 
  Filter, 
  ArrowRight, 
  Zap, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Info,
  Settings,
  History,
  Download
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { VoiceSamplePlayer } from './VoiceSamplePlayer';
import type { 
  EnhancedVoiceSample,
  ComparisonResult
} from '@/types/voice-identification';
import type { VoiceLibraryEntry } from '@/types/database';

// Duplicate detection result interface
interface DuplicateCandidate {
  id: string;
  profiles: VoiceLibraryEntry[];
  similarityScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  autoMergeable: boolean;
  conflictCount: number;
}

// Merge conflict interface
interface MergeConflict {
  field: string;
  primaryValue: any;
  secondaryValue: any;
  resolution: 'primary' | 'secondary' | 'custom';
  customValue?: any;
}

// Merge operation result
interface MergeResult {
  success: boolean;
  mergedProfileId?: string;
  conflicts: MergeConflict[];
  errors: string[];
  originalProfiles: VoiceLibraryEntry[];
}

// Merge history entry
interface MergeHistoryEntry {
  id: string;
  timestamp: Date;
  profileIds: string[];
  resultProfileId: string;
  conflicts: number;
  undoable: boolean;
  userInitiated: boolean;
}

export const SpeakerMergeInterface: React.FC = () => {
  // State management
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<DuplicateCandidate | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([]);
  const [mergeHistory, setMergeHistory] = useState<MergeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showAutoMergeableOnly, setShowAutoMergeableOnly] = useState(false);

  // Load duplicate candidates
  const scanForDuplicates = useCallback(async () => {
    try {
      setScanning(true);
      setError(null);
      
      // TODO: Implement actual duplicate detection algorithm
      // This would use acoustic similarity, metadata comparison, etc.
      const mockCandidates: DuplicateCandidate[] = [
        {
          id: '1',
          profiles: [
            {
              deepgramVoiceId: 'voice_001',
              userId: 'user_123',
              userName: 'David Kim',
              confirmed: true,
              confidence: 0.92,
              firstHeard: new Date('2024-01-15'),
              lastHeard: new Date('2024-02-20'),
              meetingsCount: 5,
              totalSpeakingTime: 1200,
              audioSamples: [],
              identificationHistory: []
            },
            {
              deepgramVoiceId: 'voice_002',
              userId: null,
              userName: 'John D.',
              confirmed: false,
              confidence: 0.78,
              firstHeard: new Date('2024-02-10'),
              lastHeard: new Date('2024-02-25'),
              meetingsCount: 3,
              totalSpeakingTime: 800,
              audioSamples: [],
              identificationHistory: []
            }
          ],
          similarityScore: 0.85,
          confidence: 'high',
          reasons: ['Similar voice characteristics', 'Name similarity', 'Meeting pattern overlap'],
          autoMergeable: false,
          conflictCount: 2
        },
        {
          id: '2',
          profiles: [
            {
              deepgramVoiceId: 'voice_003',
              userId: 'user_456',
              userName: 'Jane Smith',
              confirmed: true,
              confidence: 0.89,
              firstHeard: new Date('2024-01-20'),
              lastHeard: new Date('2024-02-28'),
              meetingsCount: 8,
              totalSpeakingTime: 2400,
              audioSamples: [],
              identificationHistory: []
            },
            {
              deepgramVoiceId: 'voice_004',
              userId: null,
              userName: null,
              confirmed: false,
              confidence: 0.72,
              firstHeard: new Date('2024-02-15'),
              lastHeard: new Date('2024-03-01'),
              meetingsCount: 2,
              totalSpeakingTime: 600,
              audioSamples: [],
              identificationHistory: []
            }
          ],
          similarityScore: 0.91,
          confidence: 'high',
          reasons: ['High acoustic similarity', 'Similar speaking patterns'],
          autoMergeable: true,
          conflictCount: 0
        }
      ];
      
      setDuplicateCandidates(mockCandidates);
      
    } catch (err) {
      console.error('Error scanning for duplicates:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for duplicates');
    } finally {
      setScanning(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    scanForDuplicates().finally(() => setLoading(false));
  }, [scanForDuplicates]);

  // Analyze voice similarity
  const analyzeVoiceSimilarity = useCallback(async (candidate: DuplicateCandidate) => {
    try {
      // TODO: Implement actual voice similarity analysis
      const mockComparison: ComparisonResult = {
        overallScore: candidate.similarityScore,
        acousticSimilarity: 0.88,
        rhythmSimilarity: 0.82,
        pitchSimilarity: 0.79,
        confidenceLevel: candidate.confidence,
        recommendation: candidate.similarityScore > 0.8 ? 'accept' : 
                      candidate.similarityScore > 0.6 ? 'uncertain' : 'reject',
        factors: [
          'Voice pitch patterns match closely',
          'Speaking rhythm is consistent',
          'Frequency characteristics align',
          candidate.similarityScore > 0.8 ? 'High confidence match' : 'Moderate similarity detected'
        ]
      };
      
      setComparisonResult(mockComparison);
      
      // Detect merge conflicts
      const conflicts = detectMergeConflicts(candidate.profiles);
      setMergeConflicts(conflicts);
      
    } catch (err) {
      console.error('Error analyzing voice similarity:', err);
      setError('Failed to analyze voice similarity');
    }
  }, []);

  // Detect merge conflicts between profiles
  const detectMergeConflicts = (profiles: VoiceLibraryEntry[]): MergeConflict[] => {
    if (profiles.length < 2) return [];
    
    const [primary, secondary] = profiles;
    const conflicts: MergeConflict[] = [];
    
    // Check for conflicting user IDs
    if (primary.userId && secondary.userId && primary.userId !== secondary.userId) {
      conflicts.push({
        field: 'userId',
        primaryValue: primary.userId,
        secondaryValue: secondary.userId,
        resolution: 'primary'
      });
    }
    
    // Check for conflicting names
    if (primary.userName && secondary.userName && primary.userName !== secondary.userName) {
      conflicts.push({
        field: 'userName',
        primaryValue: primary.userName,
        secondaryValue: secondary.userName,
        resolution: 'primary'
      });
    }
    
    // Check for conflicting confirmation status
    if (primary.confirmed !== secondary.confirmed) {
      conflicts.push({
        field: 'confirmed',
        primaryValue: primary.confirmed,
        secondaryValue: secondary.confirmed,
        resolution: primary.confirmed ? 'primary' : 'secondary'
      });
    }
    
    return conflicts;
  };

  // Perform merge operation
  const performMerge = async (candidate: DuplicateCandidate, conflicts: MergeConflict[]) => {
    try {
      setMerging(true);
      setError(null);
      
      // TODO: Implement actual merge operation
      const [primary, secondary] = candidate.profiles;
      
      // Resolve conflicts and create merged profile
      const mergedProfile: VoiceLibraryEntry = {
        ...primary,
        // Merge audio samples
        audioSamples: [...(primary.audioSamples || []), ...(secondary.audioSamples || [])],
        // Merge identification history
        identificationHistory: [...primary.identificationHistory, ...secondary.identificationHistory],
        // Update statistics
        meetingsCount: primary.meetingsCount + secondary.meetingsCount,
        totalSpeakingTime: primary.totalSpeakingTime + secondary.totalSpeakingTime,
        // Use latest activity date
        lastHeard: primary.lastHeard > secondary.lastHeard ? primary.lastHeard : secondary.lastHeard,
        // Use earliest creation date
        firstHeard: primary.firstHeard < secondary.firstHeard ? primary.firstHeard : secondary.firstHeard
      };
      
      // Apply conflict resolutions
      conflicts.forEach(conflict => {
        switch (conflict.resolution) {
          case 'primary':
            // Keep primary value (already set)
            break;
          case 'secondary':
            (mergedProfile as any)[conflict.field] = conflict.secondaryValue;
            break;
          case 'custom':
            (mergedProfile as any)[conflict.field] = conflict.customValue;
            break;
        }
      });
      
      // TODO: Save merged profile to database and remove original profiles
      console.log('Merged profile:', mergedProfile);
      
      // Add to merge history
      const historyEntry: MergeHistoryEntry = {
        id: Date.now().toString(),
        timestamp: new Date(),
        profileIds: candidate.profiles.map(p => p.deepgramVoiceId),
        resultProfileId: mergedProfile.deepgramVoiceId,
        conflicts: conflicts.length,
        undoable: true,
        userInitiated: true
      };
      
      setMergeHistory(prev => [historyEntry, ...prev]);
      
      // Remove candidate from list
      setDuplicateCandidates(prev => prev.filter(c => c.id !== candidate.id));
      setSelectedCandidate(null);
      setComparisonResult(null);
      setMergeConflicts([]);
      
    } catch (err) {
      console.error('Error performing merge:', err);
      setError(err instanceof Error ? err.message : 'Failed to merge profiles');
    } finally {
      setMerging(false);
    }
  };

  // Auto-merge candidates
  const performAutoMerge = async () => {
    const autoMergeableCandidates = duplicateCandidates.filter(c => c.autoMergeable);
    
    for (const candidate of autoMergeableCandidates) {
      await performMerge(candidate, []);
    }
  };

  // Filter candidates based on search and filters
  const filteredCandidates = useMemo(() => {
    let filtered = duplicateCandidates;
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(candidate =>
        candidate.profiles.some(profile =>
          profile.userName?.toLowerCase().includes(searchLower) ||
          profile.deepgramVoiceId.toLowerCase().includes(searchLower)
        )
      );
    }
    
    // Apply confidence filter
    if (confidenceFilter !== 'all') {
      filtered = filtered.filter(candidate => candidate.confidence === confidenceFilter);
    }
    
    // Apply auto-mergeable filter
    if (showAutoMergeableOnly) {
      filtered = filtered.filter(candidate => candidate.autoMergeable);
    }
    
    return filtered;
  }, [duplicateCandidates, searchTerm, confidenceFilter, showAutoMergeableOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Scanning for duplicate speakers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speaker Merge Interface</h1>
          <p className="text-muted-foreground">
            Identify and merge duplicate speaker profiles to maintain data consistency
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scanForDuplicates}
            disabled={scanning}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Scan for Duplicates'}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={performAutoMerge}
            disabled={!duplicateCandidates.some(c => c.autoMergeable)}
          >
            <Zap className="h-4 w-4 mr-2" />
            Auto-Merge ({duplicateCandidates.filter(c => c.autoMergeable).length})
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{duplicateCandidates.length}</div>
                <div className="text-sm text-muted-foreground">Duplicate Sets</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {duplicateCandidates.filter(c => c.autoMergeable).length}
                </div>
                <div className="text-sm text-muted-foreground">Auto-Mergeable</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">
                  {duplicateCandidates.reduce((sum, c) => sum + c.conflictCount, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Conflicts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{mergeHistory.length}</div>
                <div className="text-sm text-muted-foreground">Recent Merges</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="candidates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="candidates">Duplicate Candidates</TabsTrigger>
          <TabsTrigger value="compare">Compare & Merge</TabsTrigger>
          <TabsTrigger value="history">Merge History</TabsTrigger>
        </TabsList>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search duplicate candidates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={confidenceFilter} onValueChange={(value: any) => setConfidenceFilter(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Confidence</SelectItem>
                    <SelectItem value="high">High Confidence</SelectItem>
                    <SelectItem value="medium">Medium Confidence</SelectItem>
                    <SelectItem value="low">Low Confidence</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={showAutoMergeableOnly}
                    onCheckedChange={(checked) => setShowAutoMergeableOnly(checked === true)}
                  />
                  <label className="text-sm">Auto-mergeable only</label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Candidates List */}
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
              <Card key={candidate.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">
                          {candidate.profiles.map(p => p.userName || `Speaker ${p.deepgramVoiceId.substring(0, 8)}`).join(' & ')}
                        </h3>
                        <Badge variant={
                          candidate.confidence === 'high' ? 'default' :
                          candidate.confidence === 'medium' ? 'secondary' : 'outline'
                        }>
                          {candidate.confidence} confidence
                        </Badge>
                        {candidate.autoMergeable && (
                          <Badge variant="default" className="bg-green-600">
                            <Zap className="h-3 w-3 mr-1" />
                            Auto-mergeable
                          </Badge>
                        )}
                        {candidate.conflictCount > 0 && (
                          <Badge variant="destructive">
                            {candidate.conflictCount} conflicts
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Similarity: {(candidate.similarityScore * 100).toFixed(1)}%</span>
                        <span>Profiles: {candidate.profiles.length}</span>
                        <span>Total Meetings: {candidate.profiles.reduce((sum, p) => sum + p.meetingsCount, 0)}</span>
                      </div>
                      
                      <div className="mt-2">
                        <Progress value={candidate.similarityScore * 100} className="h-2" />
                      </div>
                      
                      <div className="mt-2 text-xs text-muted-foreground">
                        Reasons: {candidate.reasons.join(', ')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          analyzeVoiceSimilarity(candidate);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Compare
                      </Button>
                      
                      {candidate.autoMergeable && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => performMerge(candidate, [])}
                          disabled={merging}
                        >
                          <Merge className="h-4 w-4 mr-2" />
                          Auto-Merge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredCandidates.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <h3 className="text-lg font-medium mb-2">No Duplicates Found</h3>
                    <p className="text-muted-foreground">
                      All speaker profiles appear to be unique. Run a new scan to check for duplicates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Compare & Merge Tab */}
        <TabsContent value="compare">
          {selectedCandidate && comparisonResult ? (
            <div className="space-y-6">
              {/* Comparison Header */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Comparison</CardTitle>
                  <CardDescription>
                    Detailed comparison and merge options for selected profiles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Similarity Scores */}
                    <div>
                      <h4 className="font-medium mb-3">Similarity Analysis</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Overall Score</span>
                          <span className="text-sm font-medium">
                            {(comparisonResult.overallScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={comparisonResult.overallScore * 100} className="h-2" />
                        
                        <div className="flex justify-between">
                          <span className="text-sm">Acoustic</span>
                          <span className="text-sm font-medium">
                            {(comparisonResult.acousticSimilarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={comparisonResult.acousticSimilarity * 100} className="h-2" />
                        
                        <div className="flex justify-between">
                          <span className="text-sm">Rhythm</span>
                          <span className="text-sm font-medium">
                            {(comparisonResult.rhythmSimilarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={comparisonResult.rhythmSimilarity * 100} className="h-2" />
                        
                        <div className="flex justify-between">
                          <span className="text-sm">Pitch</span>
                          <span className="text-sm font-medium">
                            {(comparisonResult.pitchSimilarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={comparisonResult.pitchSimilarity * 100} className="h-2" />
                      </div>
                    </div>
                    
                    {/* Recommendation */}
                    <div>
                      <h4 className="font-medium mb-3">Recommendation</h4>
                      <div className="space-y-3">
                        <Badge variant={
                          comparisonResult.recommendation === 'accept' ? 'default' :
                          comparisonResult.recommendation === 'uncertain' ? 'secondary' : 'destructive'
                        } className="text-lg p-2">
                          {comparisonResult.recommendation === 'accept' ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Recommended
                            </>
                          ) : comparisonResult.recommendation === 'uncertain' ? (
                            <>
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Uncertain
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Not Recommended
                            </>
                          )}
                        </Badge>
                        
                        <div className="text-sm text-muted-foreground">
                          <strong>Analysis Factors:</strong>
                          <ul className="mt-2 space-y-1">
                            {comparisonResult.factors.map((factor, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-xs">•</span>
                                <span>{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Conflicts */}
                    <div>
                      <h4 className="font-medium mb-3">Merge Conflicts</h4>
                      {mergeConflicts.length > 0 ? (
                        <div className="space-y-3">
                          {mergeConflicts.map((conflict, index) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="font-medium text-sm capitalize mb-2">
                                {conflict.field}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`conflict-${index}`}
                                    checked={conflict.resolution === 'primary'}
                                    onChange={() => {
                                      const updated = [...mergeConflicts];
                                      updated[index].resolution = 'primary';
                                      setMergeConflicts(updated);
                                    }}
                                  />
                                  <span className="text-sm">
                                    Primary: {String(conflict.primaryValue)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`conflict-${index}`}
                                    checked={conflict.resolution === 'secondary'}
                                    onChange={() => {
                                      const updated = [...mergeConflicts];
                                      updated[index].resolution = 'secondary';
                                      setMergeConflicts(updated);
                                    }}
                                  />
                                  <span className="text-sm">
                                    Secondary: {String(conflict.secondaryValue)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                          <p className="text-sm text-muted-foreground">
                            No conflicts detected
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Side-by-side Profile Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedCandidate.profiles.map((profile, index) => (
                  <Card key={profile.deepgramVoiceId}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Avatar>
                          <AvatarFallback>
                            {(profile.userName || profile.deepgramVoiceId).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{profile.userName || 'Unknown Speaker'}</div>
                          <div className="text-sm text-muted-foreground">
                            {index === 0 ? 'Primary Profile' : 'Secondary Profile'}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Voice ID</div>
                          <div className="font-mono text-xs">
                            {profile.deepgramVoiceId.substring(0, 12)}...
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <Badge variant={profile.confirmed ? 'default' : 'secondary'}>
                            {profile.confirmed ? 'Confirmed' : 'Unconfirmed'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Confidence</div>
                          <div>{(profile.confidence * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Meetings</div>
                          <div>{profile.meetingsCount}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Speaking Time</div>
                          <div>{Math.round(profile.totalSpeakingTime / 60)}m</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Samples</div>
                          <div>{profile.audioSamples?.length || 0}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Last Heard</div>
                        <div className="text-sm">
                          {new Date(profile.lastHeard).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Merge Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Ready to merge?</h4>
                      <p className="text-sm text-muted-foreground">
                        This action will combine the profiles and cannot be easily undone.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedCandidate(null)}
                      >
                        Cancel
                      </Button>
                      
                      <Button
                        variant="primary"
                        onClick={() => performMerge(selectedCandidate, mergeConflicts)}
                        disabled={merging}
                      >
                        {merging ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Merging...
                          </>
                        ) : (
                          <>
                            <Merge className="h-4 w-4 mr-2" />
                            Merge Profiles
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Profiles Selected</h3>
                  <p className="text-muted-foreground">
                    Select duplicate candidates from the previous tab to compare and merge profiles.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Merge History</CardTitle>
              <CardDescription>
                Track of all profile merge operations performed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mergeHistory.length > 0 ? (
                <div className="space-y-4">
                  {mergeHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">
                          Merged {entry.profileIds.length} profiles
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.timestamp.toLocaleString()} • {entry.conflicts} conflicts resolved
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Result: {entry.resultProfileId.substring(0, 12)}...
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.userInitiated ? 'default' : 'secondary'}>
                          {entry.userInitiated ? 'Manual' : 'Auto'}
                        </Badge>
                        
                        {entry.undoable && (
                          <Button variant="outline" size="sm">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Undo
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Merge History</h3>
                  <p className="text-muted-foreground">
                    Merge operations will be tracked here for review and potential undo.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpeakerMergeInterface;