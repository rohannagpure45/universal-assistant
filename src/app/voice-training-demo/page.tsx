'use client';

import React, { useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';

// Lazy load voice identification components to reduce bundle size
const VoiceTrainingWizard = React.lazy(() => import('@/components/voice-identification').then(m => ({ default: m.VoiceTrainingWizard })));
const VoiceRecordingInterface = React.lazy(() => import('@/components/voice-identification').then(m => ({ default: m.VoiceRecordingInterface })));
const VoiceTrainingSampleManager = React.lazy(() => import('@/components/voice-identification').then(m => ({ default: m.VoiceTrainingSampleManager })));
const SpeakerProfileTraining = React.lazy(() => import('@/components/voice-identification').then(m => ({ default: m.SpeakerProfileTraining })));
const TrainingProgressDashboard = React.lazy(() => import('@/components/voice-identification').then(m => ({ default: m.TrainingProgressDashboard })));
import { 
  Users, 
  Mic, 
  FileAudio, 
  User, 
  BarChart,
  Wand2,
  ArrowRight,
  Play,
  Settings,
  Target
} from 'lucide-react';

type DemoMode = 'overview' | 'wizard' | 'recording' | 'samples' | 'profile' | 'dashboard';

interface DemoComponent {
  id: DemoMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  component: React.ComponentType<any>;
  category: 'training' | 'management' | 'analysis';
}

const DEMO_COMPONENTS: DemoComponent[] = [
  {
    id: 'wizard',
    title: 'Voice Training Wizard',
    description: 'Step-by-step guided voice profile creation with multiple training methods',
    icon: <Wand2 className="w-6 h-6" />,
    features: [
      'Multi-step wizard interface',
      'Speaker information collection', 
      'Training method selection',
      'Progress tracking',
      'Quality validation'
    ],
    component: VoiceTrainingWizard,
    category: 'training'
  },
  {
    id: 'recording',
    title: 'Voice Recording Interface',
    description: 'Live voice recording with real-time audio monitoring and quality feedback',
    icon: <Mic className="w-6 h-6" />,
    features: [
      'Real-time audio level monitoring',
      'Voice activity detection',
      'Quality assessment',
      'Guided prompts',
      'Multiple recording sessions'
    ],
    component: VoiceRecordingInterface,
    category: 'training'
  },
  {
    id: 'samples',
    title: 'Voice Sample Manager',
    description: 'Comprehensive management of voice training samples with quality analysis',
    icon: <FileAudio className="w-6 h-6" />,
    features: [
      'Sample quality assessment',
      'Bulk operations',
      'File upload support',
      'Search and filtering',
      'Sample optimization'
    ],
    component: VoiceTrainingSampleManager,
    category: 'management'
  },
  {
    id: 'profile',
    title: 'Speaker Profile Training',
    description: 'Complete speaker profile creation and editing with advanced analysis',
    icon: <User className="w-6 h-6" />,
    features: [
      'Profile information management',
      'Voice characteristics analysis',
      'Training progress tracking',
      'Settings configuration',
      'Export/import capabilities'
    ],
    component: SpeakerProfileTraining,
    category: 'management'
  },
  {
    id: 'dashboard',
    title: 'Training Progress Dashboard',
    description: 'Overview and analytics for all voice training progress and profiles',
    icon: <BarChart className="w-6 h-6" />,
    features: [
      'Training metrics overview',
      'Progress analytics',
      'Bulk profile operations',
      'Activity tracking',
      'Performance insights'
    ],
    component: TrainingProgressDashboard,
    category: 'analysis'
  }
];

export default function VoiceTrainingDemoPage() {
  const [activeDemo, setActiveDemo] = useState<DemoMode>('overview');
  const [demoData, setDemoData] = useState({
    speakerProfile: {
      deepgramVoiceId: 'demo_speaker_001',
      userName: 'Demo Speaker',
      userId: 'user_demo_001',
      samples: []
    }
  });

  const handleDemoAction = (action: string, data?: any) => {
    // Log demo actions only in development
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log(`Demo action: ${action}`, data);
    }
    // Handle demo interactions
  };

  const ActiveComponent = DEMO_COMPONENTS.find(c => c.id === activeDemo)?.component;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Voice Training Components Demo
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Explore the comprehensive voice training interface components for Phase 3. 
              These components provide a complete solution for training voice identification systems 
              with intuitive user experiences and powerful management capabilities.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeDemo === 'overview' ? (
          <div className="space-y-12">
            {/* Component Grid */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
                Available Components
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DEMO_COMPONENTS.map((component) => (
                  <motion.div
                    key={component.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="p-6 h-full cursor-pointer hover:shadow-lg transition-all">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600">
                          {component.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {component.title}
                          </h3>
                          <span className={`
                            inline-block px-2 py-1 rounded-full text-xs font-medium mt-1
                            ${component.category === 'training' 
                              ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                              : component.category === 'management'
                                ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                                : 'bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-300'
                            }
                          `}>
                            {component.category}
                          </span>
                        </div>
                      </div>

                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
                        {component.description}
                      </p>

                      <div className="space-y-2 mb-6">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Key Features:
                        </h4>
                        <ul className="space-y-1">
                          {component.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400">
                              <Target className="w-3 h-3 text-primary-500" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <PrimaryButton
                        onClick={() => setActiveDemo(component.id)}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        className="w-full"
                        size="sm"
                      >
                        Try {component.title}
                      </PrimaryButton>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Architecture Overview */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
                Architecture & Integration
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    Component Integration Flow
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-600">
                        <span className="text-sm font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Voice Training Wizard</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Guided setup and method selection</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center text-success-600">
                        <span className="text-sm font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Recording Interface</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Live recording with quality feedback</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center text-warning-600">
                        <span className="text-sm font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Sample Management</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Organize and optimize voice samples</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-info-100 dark:bg-info-900/30 rounded-full flex items-center justify-center text-info-600">
                        <span className="text-sm font-bold">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Profile Training</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Complete profile creation and analysis</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
                        <span className="text-sm font-bold">5</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Progress Dashboard</h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">Monitor and manage all profiles</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                    Technical Features
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Audio Processing</h4>
                      <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                        <li>• Real-time audio level monitoring</li>
                        <li>• Voice activity detection</li>
                        <li>• Quality assessment algorithms</li>
                        <li>• Audio format optimization</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">Data Management</h4>
                      <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                        <li>• Firebase Storage integration</li>
                        <li>• Automatic sample organization</li>
                        <li>• Metadata preservation</li>
                        <li>• Backup and export capabilities</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">User Experience</h4>
                      <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                        <li>• Responsive design patterns</li>
                        <li>• Accessibility compliance (WCAG)</li>
                        <li>• Progressive disclosure</li>
                        <li>• Error handling and recovery</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Usage Examples */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-6">
                Usage Examples
              </h2>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                  Implementation Examples
                </h3>
                
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-neutral-800 dark:text-neutral-200">
{`// Basic VoiceTrainingWizard usage
import { VoiceTrainingWizard } from '@/components/voice-identification';

<VoiceTrainingWizard
  onComplete={(session) => {
    console.log('Training completed:', session);
    // Handle completed training session
  }}
  onCancel={() => {
    console.log('Training cancelled');
    // Handle cancellation
  }}
  allowedMethods={['live-recording', 'file-upload']}
/>

// VoiceRecordingInterface with custom settings
<VoiceRecordingInterface
  speakerName="John Doe"
  guidedMode={true}
  minimumSessions={3}
  qualityThreshold={0.7}
  onRecordingComplete={(sessions) => {
    // Process completed recording sessions
    sessions.forEach(session => {
      console.log(\`Session quality: \${session.qualityMetrics.overallScore}\`);
    });
  }}
/>

// TrainingProgressDashboard integration
<TrainingProgressDashboard
  onCreateProfile={() => {
    // Navigate to profile creation
  }}
  onEditProfile={(profileId) => {
    // Navigate to profile editing
  }}
  refreshInterval={30000} // 30 seconds
/>`}
                  </pre>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Demo Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SecondaryButton
                  onClick={() => setActiveDemo('overview')}
                  leftIcon={<ArrowRight className="w-4 h-4 rotate-180" />}
                >
                  Back to Overview
                </SecondaryButton>
                
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {DEMO_COMPONENTS.find(c => c.id === activeDemo)?.title} Demo
                  </h1>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {DEMO_COMPONENTS.find(c => c.id === activeDemo)?.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {DEMO_COMPONENTS.map((component) => (
                  <Button
                    key={component.id}
                    size="sm"
                    variant={activeDemo === component.id ? 'primary' : 'outline'}
                    onClick={() => setActiveDemo(component.id)}
                    leftIcon={component.icon}
                  >
                    {component.title.split(' ')[0]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Demo Component */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg">
              {ActiveComponent && (
                <div className="p-6">
                  <div className="mb-4 p-3 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Settings className="w-4 h-4 text-info-600 mt-0.5" />
                      <div className="text-sm text-info-800 dark:text-info-200">
                        <strong>Demo Mode:</strong> This is a demonstration of the {DEMO_COMPONENTS.find(c => c.id === activeDemo)?.title} component. 
                        Some features may be simulated or have limited functionality in this demo environment.
                      </div>
                    </div>
                  </div>

                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-neutral-600 dark:text-neutral-400">Loading component...</span>
                    </div>
                  }>
                    <ActiveComponent
                      // Common demo props
                      onComplete={handleDemoAction}
                      onCancel={handleDemoAction}
                      onSave={handleDemoAction}
                      onUpdate={handleDemoAction}
                      
                      // Component-specific demo props
                      {...(activeDemo === 'recording' && {
                        speakerName: 'Demo User',
                        guidedMode: true,
                        minimumSessions: 2,
                        qualityThreshold: 0.6
                      })}
                      
                      {...(activeDemo === 'samples' && {
                        speakerProfile: demoData.speakerProfile,
                        allowBulkOperations: true,
                        allowFileUpload: true,
                        allowMeetingImport: true
                      })}
                      
                      {...(activeDemo === 'profile' && {
                        mode: 'create',
                        allowAdvancedOptions: true,
                        initialProfile: {
                          userName: 'Demo Speaker',
                          email: 'demo@example.com'
                        }
                      })}
                      
                      {...(activeDemo === 'dashboard' && {
                        onCreateProfile: () => handleDemoAction('create_profile'),
                        onEditProfile: (id: string) => handleDemoAction('edit_profile', { id }),
                        onViewProfile: (id: string) => handleDemoAction('view_profile', { id }),
                        refreshInterval: 0 // Disable auto-refresh in demo
                      })}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}