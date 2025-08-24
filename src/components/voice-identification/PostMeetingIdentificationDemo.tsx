/**
 * Post-Meeting Identification Demo
 * 
 * Demo component that showcases the post-meeting voice identification
 * components with sample data and integration testing.
 * 
 * Features:
 * - Sample data generation for testing
 * - Component integration demonstration
 * - Interactive workflow testing
 * - Service integration validation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play,
  Users,
  History,
  Settings,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/Button';
import { PostMeetingIdentificationDashboard } from './PostMeetingIdentificationDashboard';
import { UnidentifiedSpeakersPanel } from './UnidentifiedSpeakersPanel';
import { SpeakerIdentificationWorkflow } from './SpeakerIdentificationWorkflow';
import { VoiceMatchingInterface } from './VoiceMatchingInterface';
import { IdentificationHistoryView } from './IdentificationHistoryView';
import type { NeedsIdentification } from '../../types/database';
import type { IdentificationResult } from '../../types/voice-identification';

interface PostMeetingIdentificationDemoProps {
  /** Custom CSS classes */
  className?: string;
}

type DemoView = 'dashboard' | 'speakers' | 'workflow' | 'matching' | 'history';

/**
 * Generate sample identification requests for testing
 */
const generateSampleRequests = (): NeedsIdentification[] => {
  const sampleRequests: NeedsIdentification[] = [];
  
  const meetings = [
    'Daily Standup',
    'Product Review',
    'Team Retrospective',
    'Client Presentation',
    'Planning Meeting'
  ];

  const speakers = [
    'Unknown Speaker 1',
    'Unknown Speaker 2', 
    'Unknown Speaker 3',
    'Unidentified Participant',
    'Speaker A',
    'Guest Speaker'
  ];

  for (let i = 0; i < 8; i++) {
    const meetingTitle = meetings[Math.floor(Math.random() * meetings.length)];
    const speakerLabel = speakers[Math.floor(Math.random() * speakers.length)];
    const createdDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    sampleRequests.push({
      id: `demo_req_${i}`,
      meetingId: `demo_meeting_${Math.floor(i / 2)}`,
      meetingTitle: `${meetingTitle} - ${createdDate.toLocaleDateString()}`,
      meetingDate: createdDate,
      meetingTypeId: 'demo_type',
      hostId: 'demo_host',
      deepgramVoiceId: `dg_voice_${i}`,
      voiceId: `dg_voice_${i}`,
      speakerLabel,
      sampleTranscripts: [
        {
          text: `This is a sample transcript from ${speakerLabel}. The speaker discussed project timelines and deliverables.`,
          timestamp: new Date(createdDate.getTime() + Math.random() * 60 * 60 * 1000)
        },
        {
          text: `Another sample where ${speakerLabel} mentioned budget considerations and resource allocation.`,
          timestamp: new Date(createdDate.getTime() + Math.random() * 60 * 60 * 1000)
        }
      ],
      audioUrl: `/demo/voice-samples/sample_${i}.webm`,
      suggestedMatches: Math.random() > 0.5 ? [
        {
          userId: `user_${Math.floor(Math.random() * 5)}`,
          userName: `User ${Math.floor(Math.random() * 5) + 1}`,
          confidence: 0.6 + Math.random() * 0.3,
          reason: 'Voice pattern similarity detected'
        }
      ] : [],
      status: 'pending',
      createdAt: createdDate
    });
  }

  return sampleRequests;
};

/**
 * Post-Meeting Identification Demo Component
 */
export const PostMeetingIdentificationDemo: React.FC<PostMeetingIdentificationDemoProps> = ({
  className = ''
}) => {
  // State management
  const [currentView, setCurrentView] = useState<DemoView>('dashboard');
  const [sampleRequests, setSampleRequests] = useState<NeedsIdentification[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<NeedsIdentification[]>([]);
  const [workflowActive, setWorkflowActive] = useState(false);
  const [completedResults, setCompletedResults] = useState<IdentificationResult[]>([]);

  // Initialize sample data
  useEffect(() => {
    const requests = generateSampleRequests();
    setSampleRequests(requests);
  }, []);

  /**
   * Handle meeting selection from dashboard
   */
  const handleMeetingSelect = (meetingId: string) => {
    const meetingRequests = sampleRequests.filter(req => req.meetingId === meetingId);
    setSelectedRequests(meetingRequests);
    setCurrentView('speakers');
  };

  /**
   * Handle workflow start from dashboard (receives NeedsIdentification[])
   */
  const handleStartIdentification = (requests: NeedsIdentification[]) => {
    setSelectedRequests(requests);
    setWorkflowActive(true);
    setCurrentView('workflow');
  };

  /**
   * Handle workflow start from speakers panel (receives string[])
   */
  const handleStartWorkflow = (requestIds: string[]) => {
    const requests = sampleRequests.filter(req => requestIds.includes(req.id!));
    setSelectedRequests(requests);
    setWorkflowActive(true);
    setCurrentView('workflow');
  };

  /**
   * Handle identification completion
   */
  const handleIdentificationComplete = (results: IdentificationResult[]) => {
    setCompletedResults(prev => [...prev, ...results]);
    setWorkflowActive(false);
    
    // Remove completed requests from pending list
    const completedRequestIds = new Set(results.map(r => r.requestId));
    setSampleRequests(prev => 
      prev.filter(req => !completedRequestIds.has(req.id!))
    );
    
    setCurrentView('history');
  };

  /**
   * Handle speaker identification
   */
  const handleSpeakerIdentified = (requestId: string, userId: string, userName: string) => {
    // Remove identified request
    setSampleRequests(prev => prev.filter(req => req.id !== requestId));
    
    // Add to completed results
    const result: IdentificationResult = {
      requestId,
      action: 'identified',
      userId,
      userName,
      confidence: 0.8,
      method: 'manual'
    };
    setCompletedResults(prev => [...prev, result]);
  };

  /**
   * Generate fresh sample data
   */
  const handleRefreshData = () => {
    const requests = generateSampleRequests();
    setSampleRequests(requests);
    setCompletedResults([]);
    setSelectedRequests([]);
    setWorkflowActive(false);
    setCurrentView('dashboard');
  };

  /**
   * Get view title
   */
  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'speakers': return 'Unidentified Speakers';
      case 'workflow': return 'Identification Workflow';
      case 'matching': return 'Voice Matching';
      case 'history': return 'Identification History';
      default: return 'Demo';
    }
  };

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${className}`}>
      {/* Demo Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Post-Meeting Voice Identification Demo
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Interactive demonstration of Phase 3 voice identification components
            </p>
          </div>
          
          <Button
            onClick={handleRefreshData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reset Demo</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setCurrentView('dashboard')}
            variant={currentView === 'dashboard' ? 'primary' : 'outline'}
            size="sm"
            className="flex items-center space-x-2"
          >
            <Zap className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          
          <Button
            onClick={() => setCurrentView('speakers')}
            variant={currentView === 'speakers' ? 'primary' : 'outline'}
            size="sm"
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Speakers ({sampleRequests.length})</span>
          </Button>
          
          <Button
            onClick={() => selectedRequests.length > 0 && setCurrentView('workflow')}
            variant={currentView === 'workflow' ? 'primary' : 'outline'}
            size="sm"
            disabled={selectedRequests.length === 0}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>Workflow</span>
          </Button>
          
          <Button
            onClick={() => setCurrentView('matching')}
            variant={currentView === 'matching' ? 'primary' : 'outline'}
            size="sm"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Matching</span>
          </Button>
          
          <Button
            onClick={() => setCurrentView('history')}
            variant={currentView === 'history' ? 'primary' : 'outline'}
            size="sm"
            className="flex items-center space-x-2"
          >
            <History className="h-4 w-4" />
            <span>History ({completedResults.length})</span>
          </Button>
        </div>

        {/* Demo Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{sampleRequests.length}</p>
            <p className="text-sm text-gray-600">Pending Requests</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{completedResults.length}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{selectedRequests.length}</p>
            <p className="text-sm text-gray-600">Selected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {Math.round((completedResults.length / (completedResults.length + sampleRequests.length)) * 100) || 0}%
            </p>
            <p className="text-sm text-gray-600">Success Rate</p>
          </div>
        </div>
      </Card>

      {/* Current View */}
      <div className="min-h-96">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{getViewTitle()}</h2>
        </div>

        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <PostMeetingIdentificationDashboard
            userId="demo_user"
            isAdmin={true}
            onMeetingSelect={handleMeetingSelect}
            onStartIdentification={handleStartIdentification}
          />
        )}

        {/* Speakers View */}
        {currentView === 'speakers' && (
          <UnidentifiedSpeakersPanel
            identificationRequests={sampleRequests}
            showClustering={true}
            enableBulkOperations={true}
            onSpeakerIdentified={handleSpeakerIdentified}
            onStartWorkflow={handleStartWorkflow}
          />
        )}

        {/* Workflow View */}
        {currentView === 'workflow' && selectedRequests.length > 0 && (
          <SpeakerIdentificationWorkflow
            identificationRequests={selectedRequests}
            showVoiceComparison={true}
            autoSuggestionThreshold={0.7}
            onIdentificationComplete={handleIdentificationComplete}
            onCancel={() => {
              setWorkflowActive(false);
              setCurrentView('speakers');
            }}
          />
        )}

        {/* Matching View */}
        {currentView === 'matching' && sampleRequests.length > 0 && (
          <VoiceMatchingInterface
            currentRequest={sampleRequests[0]}
            availableProfiles={[]} // Would be populated with real profiles
            showWaveform={true}
            onAcceptMatch={(profile, confidence) => {
              console.log('Match accepted:', profile, confidence);
            }}
            onRejectMatch={(profile) => {
              console.log('Match rejected:', profile);
            }}
          />
        )}

        {/* History View */}
        {currentView === 'history' && (
          <IdentificationHistoryView
            userId="demo_user"
            isAdmin={true}
            showAnalytics={true}
            enableExport={true}
          />
        )}

        {/* Empty State */}
        {currentView === 'workflow' && selectedRequests.length === 0 && (
          <Card className="p-12 text-center">
            <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Workflow Active
            </h3>
            <p className="text-gray-600 mb-4">
              Select speakers from the dashboard or speakers panel to start the identification workflow.
            </p>
            <Button onClick={() => setCurrentView('speakers')}>
              View Unidentified Speakers
            </Button>
          </Card>
        )}
      </div>

      {/* Demo Information */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Demo Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">Features Demonstrated:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Post-meeting identification dashboard</li>
              <li>Unidentified speakers management</li>
              <li>Step-by-step identification workflow</li>
              <li>Voice comparison and matching</li>
              <li>Identification history tracking</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Integration Points:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>NeedsIdentificationService integration</li>
              <li>VoiceLibraryService connection</li>
              <li>ClientStorageService for voice samples</li>
              <li>Real-time data updates</li>
              <li>Comprehensive type safety</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PostMeetingIdentificationDemo;