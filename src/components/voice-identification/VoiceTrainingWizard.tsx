'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  User, 
  Mic, 
  Upload, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Volume2,
  FileAudio,
  Settings,
  PlayCircle,
  StopCircle,
  RefreshCw
} from 'lucide-react';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { ClientStorageService } from '@/services/firebase/ClientStorageService';
import { AudioManager } from '@/services/universal-assistant/AudioManager';
import type { VoiceLibraryEntry } from '@/types/database';
import { VoiceSample } from '@/types/voice-identification';

// Training methods
export type TrainingMethod = 'live-recording' | 'file-upload' | 'meeting-samples' | 'guided-prompts';

// Training step interface
interface TrainingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<TrainingStepProps>;
  isOptional?: boolean;
  estimatedTime?: string;
}

// Props for training step components
interface TrainingStepProps {
  onComplete: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  stepData?: any;
  speakerInfo?: SpeakerInfo;
}

// Speaker information interface
interface SpeakerInfo {
  name: string;
  userId?: string;
  email?: string;
  expectedVoiceCharacteristics?: string;
  preferredTrainingMethod?: TrainingMethod;
}

// Training session data
interface TrainingSession {
  sessionId: string;
  speakerInfo: SpeakerInfo;
  currentStepIndex: number;
  completedSteps: Record<string, any>;
  samples: VoiceSample[];
  qualityScore: number;
  startedAt: Date;
  estimatedCompletion?: Date;
}

// Note: Using unified VoiceSample interface from types

// Props for the main wizard component
interface VoiceTrainingWizardProps {
  onComplete?: (session: TrainingSession) => void;
  onCancel?: () => void;
  initialSpeakerInfo?: Partial<SpeakerInfo>;
  allowedMethods?: TrainingMethod[];
  className?: string;
}

// Training steps configuration
const TRAINING_STEPS: TrainingStep[] = [
  {
    id: 'speaker-info',
    title: 'Speaker Information',
    description: 'Basic information about the speaker',
    icon: <User className="w-5 h-5" />,
    component: SpeakerInfoStep,
    estimatedTime: '2 min'
  },
  {
    id: 'method-selection',
    title: 'Training Method',
    description: 'Choose how to provide voice samples',
    icon: <Settings className="w-5 h-5" />,
    component: MethodSelectionStep,
    estimatedTime: '1 min'
  },
  {
    id: 'voice-recording',
    title: 'Voice Recording',
    description: 'Record voice samples for training',
    icon: <Mic className="w-5 h-5" />,
    component: VoiceRecordingStep,
    estimatedTime: '5-10 min'
  },
  {
    id: 'quality-validation',
    title: 'Quality Check',
    description: 'Validate and optimize samples',
    icon: <CheckCircle className="w-5 h-5" />,
    component: QualityValidationStep,
    estimatedTime: '3 min'
  },
  {
    id: 'profile-creation',
    title: 'Profile Creation',
    description: 'Create and save voice profile',
    icon: <FileAudio className="w-5 h-5" />,
    component: ProfileCreationStep,
    estimatedTime: '2 min'
  }
];

/**
 * VoiceTrainingWizard - Step-by-step voice training interface
 */
export const VoiceTrainingWizard: React.FC<VoiceTrainingWizardProps> = ({
  onComplete,
  onCancel,
  initialSpeakerInfo,
  allowedMethods = ['live-recording', 'file-upload', 'meeting-samples', 'guided-prompts'],
  className
}) => {
  // State management
  const [session, setSession] = useState<TrainingSession>(() => ({
    sessionId: `training_${Date.now()}`,
    speakerInfo: {
      name: initialSpeakerInfo?.name || '',
      userId: initialSpeakerInfo?.userId,
      email: initialSpeakerInfo?.email,
      ...initialSpeakerInfo
    },
    currentStepIndex: 0,
    completedSteps: {},
    samples: [],
    qualityScore: 0,
    startedAt: new Date()
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Audio manager reference
  const audioManagerRef = useRef<AudioManager | null>(null);

  // Initialize audio manager
  useEffect(() => {
    audioManagerRef.current = new AudioManager({
      enableInputGating: false,
      enableConcurrentProcessing: false,
      chunkInterval: 100,
      audioQuality: {
        sampleRate: 16000,
        audioBitsPerSecond: 128000
      }
    });

    return () => {
      audioManagerRef.current?.cleanup?.();
    };
  }, []);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (session.currentStepIndex < TRAINING_STEPS.length - 1) {
      setSession(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1
      }));
    }
  }, [session.currentStepIndex]);

  const handlePrevious = useCallback(() => {
    if (session.currentStepIndex > 0) {
      setSession(prev => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1
      }));
    }
  }, [session.currentStepIndex]);

  const handleStepComplete = useCallback((stepData: any) => {
    const currentStep = TRAINING_STEPS[session.currentStepIndex];
    
    setSession(prev => ({
      ...prev,
      completedSteps: {
        ...prev.completedSteps,
        [currentStep.id]: stepData
      }
    }));
  }, [session.currentStepIndex]);

  // Complete training session
  const handleComplete = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate final quality score
      const avgQuality = session.samples.reduce((sum, sample) => sum + sample.quality, 0) / 
                        Math.max(session.samples.length, 1);

      const completedSession = {
        ...session,
        qualityScore: avgQuality,
        estimatedCompletion: new Date()
      };

      setSession(completedSession);
      onComplete?.(completedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete training session');
    } finally {
      setIsLoading(false);
    }
  }, [session, onComplete]);

  // Cancel with confirmation
  const handleCancel = useCallback(() => {
    if (session.samples.length > 0 || Object.keys(session.completedSteps).length > 0) {
      setShowConfirmCancel(true);
    } else {
      onCancel?.();
    }
  }, [session, onCancel]);

  const confirmCancel = useCallback(() => {
    // Clean up any recordings
    session.samples.forEach(sample => {
      if (sample.url && sample.url.startsWith('blob:')) {
        URL.revokeObjectURL(sample.url);
      }
    });
    
    setShowConfirmCancel(false);
    onCancel?.();
  }, [session.samples, onCancel]);

  // Current step
  const currentStep = TRAINING_STEPS[session.currentStepIndex];
  const CurrentStepComponent = currentStep.component;

  // Progress calculation
  const progress = ((session.currentStepIndex) / TRAINING_STEPS.length) * 100;
  const isLastStep = session.currentStepIndex === TRAINING_STEPS.length - 1;

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Voice Training Wizard
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Train a new voice profile for speaker identification
            </p>
          </div>
          
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-neutral-500 hover:text-neutral-700"
          >
            Cancel
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
          <motion.div
            className="bg-primary-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Steps indicator */}
        <div className="flex justify-between mt-4">
          {TRAINING_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-2 ${
                index <= session.currentStepIndex 
                  ? 'text-primary-600' 
                  : 'text-neutral-400'
              }`}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${index < session.currentStepIndex 
                  ? 'bg-primary-600 text-white' 
                  : index === session.currentStepIndex
                    ? 'border-2 border-primary-600 bg-white dark:bg-neutral-800'
                    : 'border-2 border-neutral-300 bg-white dark:bg-neutral-800'
                }
              `}>
                {index < session.currentStepIndex ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step.icon
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{step.title}</p>
                {step.estimatedTime && (
                  <p className="text-xs opacity-60">{step.estimatedTime}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <Card className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
              <p className="text-danger-800 dark:text-danger-200">{error}</p>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                {currentStep.title}
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400">
                {currentStep.description}
              </p>
            </div>

            <CurrentStepComponent
              onComplete={handleStepComplete}
              onNext={handleNext}
              onPrevious={handlePrevious}
              stepData={session.completedSteps[currentStep.id]}
              speakerInfo={session.speakerInfo}
            />
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showConfirmCancel && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmCancel(false)}
          >
            <motion.div
              className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-warning-600" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Cancel Training?
                </h3>
              </div>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                You have made progress on this training session. Are you sure you want to cancel? 
                All current progress will be lost.
              </p>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmCancel(false)}
                  className="flex-1"
                >
                  Continue Training
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmCancel}
                  className="flex-1"
                >
                  Cancel Training
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual step components (simplified implementations)
function SpeakerInfoStep({ onComplete, onNext, stepData, speakerInfo }: TrainingStepProps) {
  const [formData, setFormData] = useState({
    name: stepData?.name || speakerInfo?.name || '',
    email: stepData?.email || speakerInfo?.email || '',
    expectedVoiceCharacteristics: stepData?.expectedVoiceCharacteristics || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Speaker Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg 
                   bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                   focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          placeholder="Enter the speaker's name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Email (Optional)
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg 
                   bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                   focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          placeholder="speaker@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Voice Characteristics (Optional)
        </label>
        <textarea
          value={formData.expectedVoiceCharacteristics}
          onChange={(e) => setFormData(prev => ({ ...prev, expectedVoiceCharacteristics: e.target.value }))}
          className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg 
                   bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                   focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          rows={3}
          placeholder="e.g., Deep voice, slight accent, speaks quickly..."
        />
      </div>

      <div className="flex justify-end">
        <PrimaryButton
          type="submit"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          disabled={!formData.name.trim()}
        >
          Continue
        </PrimaryButton>
      </div>
    </form>
  );
}

function MethodSelectionStep({ onComplete, onNext, onPrevious, stepData }: TrainingStepProps) {
  const [selectedMethod, setSelectedMethod] = useState<TrainingMethod>(
    stepData?.method || 'live-recording'
  );

  const methods = [
    {
      id: 'live-recording' as TrainingMethod,
      title: 'Live Recording',
      description: 'Record voice samples directly in your browser',
      icon: <Mic className="w-6 h-6" />,
      pros: ['High quality', 'Immediate feedback', 'Guided prompts'],
      cons: ['Requires microphone', 'Takes more time'],
      estimatedTime: '5-10 minutes'
    },
    {
      id: 'file-upload' as TrainingMethod,
      title: 'File Upload',
      description: 'Upload existing audio files',
      icon: <Upload className="w-6 h-6" />,
      pros: ['Use existing recordings', 'Fast setup'],
      cons: ['Quality depends on files', 'Limited guidance'],
      estimatedTime: '2-5 minutes'
    },
    {
      id: 'meeting-samples' as TrainingMethod,
      title: 'From Meetings',
      description: 'Use samples from previous meetings',
      icon: <MessageSquare className="w-6 h-6" />,
      pros: ['No additional recording', 'Natural speech patterns'],
      cons: ['Limited availability', 'Variable quality'],
      estimatedTime: '1-3 minutes'
    }
  ];

  const handleContinue = () => {
    onComplete({ method: selectedMethod });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {methods.map((method) => (
          <motion.div
            key={method.id}
            className={`
              p-4 border-2 rounded-lg cursor-pointer transition-all
              ${selectedMethod === method.id
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }
            `}
            onClick={() => setSelectedMethod(method.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-start space-x-4">
              <div className={`
                p-2 rounded-lg 
                ${selectedMethod === method.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                }
              `}>
                {method.icon}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {method.title}
                  </h3>
                  <span className="text-sm text-neutral-500">
                    {method.estimatedTime}
                  </span>
                </div>

                <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                  {method.description}
                </p>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <h4 className="text-sm font-medium text-success-700 dark:text-success-400 mb-1">
                      Advantages
                    </h4>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      {method.pros.map((pro, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3 text-success-600" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-warning-700 dark:text-warning-400 mb-1">
                      Considerations
                    </h4>
                    <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      {method.cons.map((con, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <AlertTriangle className="w-3 h-3 text-warning-600" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${selectedMethod === method.id
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-neutral-300 dark:border-neutral-600'
                }
              `}>
                {selectedMethod === method.id && (
                  <CheckCircle className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between">
        <SecondaryButton
          onClick={onPrevious}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Previous
        </SecondaryButton>

        <PrimaryButton
          onClick={handleContinue}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Continue with {methods.find(m => m.id === selectedMethod)?.title}
        </PrimaryButton>
      </div>
    </div>
  );
}

// Placeholder implementations for remaining steps
function VoiceRecordingStep({ onComplete, onNext, onPrevious }: TrainingStepProps) {
  return (
    <div className="text-center py-12">
      <Mic className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        Voice Recording Step
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        Implementation coming in next component...
      </p>
      
      <div className="flex justify-between">
        <SecondaryButton onClick={onPrevious}>Previous</SecondaryButton>
        <PrimaryButton onClick={() => { onComplete({}); onNext(); }}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

function QualityValidationStep({ onComplete, onNext, onPrevious }: TrainingStepProps) {
  return (
    <div className="text-center py-12">
      <CheckCircle className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        Quality Validation Step
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        Implementation coming in subsequent components...
      </p>
      
      <div className="flex justify-between">
        <SecondaryButton onClick={onPrevious}>Previous</SecondaryButton>
        <PrimaryButton onClick={() => { onComplete({}); onNext(); }}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

function ProfileCreationStep({ onComplete, onNext, onPrevious }: TrainingStepProps) {
  return (
    <div className="text-center py-12">
      <FileAudio className="w-16 h-16 mx-auto text-neutral-400 mb-4" />
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
        Profile Creation Step
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6">
        Implementation coming in subsequent components...
      </p>
      
      <div className="flex justify-between">
        <SecondaryButton onClick={onPrevious}>Previous</SecondaryButton>
        <PrimaryButton onClick={() => { onComplete({}); onNext(); }}>Complete Training</PrimaryButton>
      </div>
    </div>
  );
}

export default VoiceTrainingWizard;