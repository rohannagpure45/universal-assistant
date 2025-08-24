/**
 * Voice Library Demo Component
 * 
 * Comprehensive demonstration page showcasing the complete Voice Library
 * Management system. Integrates all components with mock data to demonstrate
 * functionality, responsive design, and accessibility features.
 * 
 * Features:
 * - Complete voice library management workflow
 * - Integration of all voice identification components
 * - Mock data for testing and demonstration
 * - Responsive design showcase
 * - Accessibility feature demonstrations
 * - Real-time updates simulation
 * 
 * @component
 * @example
 * ```tsx
 * <VoiceLibraryDemo userId="demo-user" />
 * ```
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Mic, 
  Play, 
  Settings, 
  RefreshCw,
  Download,
  Upload,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { VoiceLibraryLayout } from './VoiceLibraryLayout';
import { VoiceLibraryDashboard } from './VoiceLibraryDashboard';
import { SpeakerProfileCard } from './SpeakerProfileCard';
import { VoiceSamplePlayer } from './VoiceSamplePlayer';
import { VoiceProfileManager } from './VoiceProfileManager';
import { PostMeetingIdentification } from './PostMeetingIdentification';
import type { VoiceLibraryEntry } from '@/types/database';
import type { EnhancedVoiceProfile, VoiceSampleStorageMetadata } from '@/types/voice-identification';

/**
 * Props for the Voice Library Demo component
 */
interface VoiceLibraryDemoProps {
  /** Demo user ID */
  userId?: string;
  /** Whether to show tutorial overlays */
  showTutorial?: boolean;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Demo navigation items
 */
const DEMO_NAVIGATION = [
  { id: 'dashboard', label: 'Dashboard', icon: Users },
  { id: 'identification', label: 'Identification', icon: Mic },
  { id: 'samples', label: 'Voice Samples', icon: Play },
  { id: 'settings', label: 'Settings', icon: Settings }
];

/**
 * Mock voice library data for demonstration
 */
const MOCK_VOICE_PROFILES: VoiceLibraryEntry[] = [
  {
    deepgramVoiceId: 'voice_001_alexandra_chen',
    userId: 'user_001',
    userName: 'Alexandra Chen',
    confirmed: true,
    confidence: 0.95,
    firstHeard: new Date('2024-01-15'),
    lastHeard: new Date('2024-01-20'),
    meetingsCount: 12,
    totalSpeakingTime: 3600,
    audioSamples: [
      {
        url: '/audio/samples/alexandra_quarterly_review.webm',
        transcript: 'Thanks for organizing this meeting. I think we should focus on the quarterly targets and ensure our team is aligned on deliverables.',
        quality: 0.9,
        duration: 8.5,
        timestamp: new Date('2024-01-20T10:30:00')
      },
      {
        url: '/audio/samples/alexandra_budget_discussion.webm',
        transcript: 'I agree with the proposal, but we need to consider the budget constraints and timeline implications for Q2.',
        quality: 0.85,
        duration: 6.2,
        timestamp: new Date('2024-01-20T10:45:00')
      }
    ],
    identificationHistory: [
      {
        method: 'self',
        timestamp: new Date('2024-01-15T09:00:00'),
        meetingId: 'meeting_001',
        confidence: 1.0,
        details: 'Self-identified during team introduction'
      }
    ]
  },
  {
    deepgramVoiceId: 'voice_002_marcus_rodriguez',
    userId: 'user_002',
    userName: 'Marcus Rodriguez',
    confirmed: true,
    confidence: 0.88,
    firstHeard: new Date('2024-01-16'),
    lastHeard: new Date('2024-01-19'),
    meetingsCount: 8,
    totalSpeakingTime: 2400,
    audioSamples: [
      {
        url: '/audio/samples/marcus_market_analysis.webm',
        transcript: 'The market research data shows a positive trend for our product. Customer satisfaction scores have improved by 23% since last quarter.',
        quality: 0.92,
        duration: 7.1,
        timestamp: new Date('2024-01-19T14:15:00')
      }
    ],
    identificationHistory: [
      {
        method: 'mentioned',
        timestamp: new Date('2024-01-16T11:30:00'),
        meetingId: 'meeting_002',
        confidence: 0.88,
        details: 'Identified when Alexandra mentioned "Marcus"'
      }
    ]
  },
  {
    deepgramVoiceId: 'voice_003_priya_patel',
    userId: 'user_003',
    userName: 'Priya Patel',
    confirmed: true,
    confidence: 0.91,
    firstHeard: new Date('2024-01-14'),
    lastHeard: new Date('2024-01-21'),
    meetingsCount: 15,
    totalSpeakingTime: 4200,
    audioSamples: [
      {
        url: '/audio/samples/priya_technical_discussion.webm',
        transcript: 'The API performance metrics show we need to optimize the database queries. I recommend implementing caching for frequently accessed data.',
        quality: 0.94,
        duration: 9.2,
        timestamp: new Date('2024-01-21T11:15:00')
      }
    ],
    identificationHistory: [
      {
        method: 'pattern',
        timestamp: new Date('2024-01-14T14:00:00'),
        meetingId: 'meeting_003',
        confidence: 0.91,
        details: 'Auto-identified based on voice patterns'
      }
    ]
  },
  {
    deepgramVoiceId: 'voice_004_unknown_guest',
    userId: null,
    userName: null,
    confirmed: false,
    confidence: 0.45,
    firstHeard: new Date('2024-01-18'),
    lastHeard: new Date('2024-01-18'),
    meetingsCount: 1,
    totalSpeakingTime: 180,
    audioSamples: [
      {
        url: '/audio/samples/unknown_guest_question.webm',
        transcript: 'Could you repeat the last point about the implementation timeline? I want to make sure I understand the dependencies.',
        quality: 0.75,
        duration: 4.8,
        timestamp: new Date('2024-01-18T16:20:00')
      }
    ],
    identificationHistory: []
  }
];

/**
 * Mock voice sample for player demo
 */
const MOCK_VOICE_SAMPLE = {
  id: 'demo_sample_1',
  url: '/audio/samples/demo_voice_sample.webm',
  transcript: 'This is a demonstration of our voice identification system. The AI can recognize speakers with high accuracy and provide real-time transcription.',
  quality: 0.87,
  duration: 12.3,
  timestamp: new Date('2024-01-20T15:30:00'),
  confidence: 0.92,
  speakerId: 'alexandra_chen'
};

export const VoiceLibraryDemo: React.FC<VoiceLibraryDemoProps> = ({
  userId = 'demo-user',
  showTutorial = false,
  className = ''
}) => {
  // State management
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [profiles, setProfiles] = useState<VoiceLibraryEntry[]>(MOCK_VOICE_PROFILES);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<VoiceLibraryEntry | null>(null);
  const [internalShowTutorial, setShowTutorial] = useState(showTutorial);
  const [demoStats, setDemoStats] = useState({
    totalVoices: 3,
    confirmedVoices: 2,
    unconfirmedVoices: 1,
    recentlyActive: 2
  });

  /**
   * Handle profile updates
   */
  const handleProfileUpdate = useCallback((profileId: string, updates: Partial<VoiceLibraryEntry>) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.deepgramVoiceId === profileId 
          ? { ...profile, ...updates }
          : profile
      )
    );

    // Update stats
    const updatedProfiles = profiles.map(p => 
      p.deepgramVoiceId === profileId ? { ...p, ...updates } : p
    );
    const confirmed = updatedProfiles.filter(p => p.confirmed).length;
    setDemoStats(prev => ({
      ...prev,
      confirmedVoices: confirmed,
      unconfirmedVoices: prev.totalVoices - confirmed
    }));
  }, [profiles]);

  /**
   * Handle profile deletion
   */
  const handleProfileDelete = useCallback((profileId: string) => {
    setProfiles(prev => prev.filter(profile => profile.deepgramVoiceId !== profileId));
    
    setDemoStats(prev => ({
      totalVoices: prev.totalVoices - 1,
      confirmedVoices: Math.max(0, prev.confirmedVoices - 1),
      unconfirmedVoices: Math.max(0, prev.unconfirmedVoices - 1),
      recentlyActive: prev.recentlyActive
    }));
  }, []);

  /**
   * Generate navigation items with active states
   */
  const navigationItems = DEMO_NAVIGATION.map(item => ({
    ...item,
    onClick: () => setActiveView(item.id),
    active: activeView === item.id
  }));

  /**
   * Simulate real-time updates
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate occasional profile updates
      if (Math.random() < 0.1) { // 10% chance every 5 seconds
        const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
        if (randomProfile) {
          handleProfileUpdate(randomProfile.deepgramVoiceId, {
            lastHeard: new Date(),
            confidence: Math.min(1, randomProfile.confidence + (Math.random() * 0.1 - 0.05))
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [profiles, handleProfileUpdate]);

  /**
   * Render active view content
   */
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Demo Banner */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Voice Library Demo
                    </h3>
                    <p className="text-blue-800 text-sm mb-3">
                      This is a demonstration of the Voice Library Management system with mock data. 
                      Explore the features including speaker identification, voice sample management, 
                      and real-time updates.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => setShowTutorial(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Start Tutorial
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setShowProfileManager(true)}
                        className="border-blue-300"
                      >
                        Create Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Dashboard */}
            <VoiceLibraryDashboard
              userId={userId}
              onProfileUpdate={handleProfileUpdate}
              onProfileDelete={handleProfileDelete}
              isAdmin={true}
            />
          </div>
        );

      case 'identification':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Identification Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  This demonstrates the post-meeting voice identification workflow.
                  In a real application, this would show speakers that need to be identified
                  after meeting recordings.
                </p>
              </CardContent>
            </Card>

            <PostMeetingIdentification
              meetingId="demo-meeting"
              hostUserId={userId}
              participants={[
                {
                  uid: 'user_001',
                  email: 'john@example.com',
                  displayName: 'John Doe',
                  isAdmin: false,
                  primaryVoiceId: 'voice_001_john_doe',
                  preferences: {} as any,
                  createdAt: new Date(),
                  lastActive: new Date()
                }
              ]}
            />
          </div>
        );

      case 'samples':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Sample Player Demo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Interactive voice sample player with waveform visualization and metadata display.
                  Note: Audio playback is simulated in this demo.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VoiceSamplePlayer
                sample={MOCK_VOICE_SAMPLE}
                showWaveform={true}
                autoWaveform={true}
                compact={false}
                onPlayStateChange={(playing) => console.log('Playing:', playing)}
              />

              <VoiceSamplePlayer
                sample={{
                  ...MOCK_VOICE_SAMPLE,
                  id: 'demo_sample_2',
                  transcript: 'Compact player view with reduced controls.',
                  duration: 5.8,
                  quality: 0.75
                }}
                showWaveform={false}
                compact={true}
                showTranscript={false}
              />
            </div>

            {/* Profile Cards Demo */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Speaker Profile Cards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map(profile => (
                  <SpeakerProfileCard
                    key={profile.deepgramVoiceId}
                    profile={profile}
                    onUpdate={(updates) => handleProfileUpdate(profile.deepgramVoiceId, updates)}
                    onEdit={() => {
                      setSelectedProfile(profile);
                      setShowProfileManager(true);
                    }}
                    isAdmin={true}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Library Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Identification Settings</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-identify threshold:</span>
                      <span className="text-sm font-mono">70%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Max samples per profile:</span>
                      <span className="text-sm font-mono">5</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Real-time updates:</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Audio Processing</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Noise reduction:</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Audio normalization:</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Waveform generation:</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Accessibility Features</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Keyboard navigation:</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Screen reader support:</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High contrast mode:</span>
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Settings
                    </Button>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Settings
                    </Button>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div>View not found</div>;
    }
  };

  return (
    <div className={className}>
      <VoiceLibraryLayout
        showSidebar={true}
        showAccessibilityToolbar={true}
        pageTitle="Voice Library Demo"
        navigationItems={navigationItems}
      >
        {renderActiveView()}

        {/* Voice Profile Manager Modal */}
        {showProfileManager && (
          <VoiceProfileManager
            profile={selectedProfile}
            onSave={async (profileData) => {
              if (selectedProfile) {
                handleProfileUpdate(selectedProfile.deepgramVoiceId, profileData);
              } else {
                // Create new profile
                const newProfile: VoiceLibraryEntry = {
                  deepgramVoiceId: `voice_${Date.now()}`,
                  userId: null,
                  userName: null,
                  confirmed: false,
                  confidence: 0.5,
                  firstHeard: new Date(),
                  lastHeard: new Date(),
                  meetingsCount: 0,
                  totalSpeakingTime: 0,
                  audioSamples: [],
                  identificationHistory: [],
                  ...profileData
                };
                setProfiles(prev => [...prev, newProfile]);
                setDemoStats(prev => ({
                  ...prev,
                  totalVoices: prev.totalVoices + 1,
                  unconfirmedVoices: prev.unconfirmedVoices + 1
                }));
              }
              setShowProfileManager(false);
              setSelectedProfile(null);
            }}
            onCancel={() => {
              setShowProfileManager(false);
              setSelectedProfile(null);
            }}
          />
        )}
      </VoiceLibraryLayout>
    </div>
  );
};