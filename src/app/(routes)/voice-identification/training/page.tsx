'use client';

import React, { useState } from 'react';
import { PageErrorBoundary } from '@/components/error-boundaries/PageErrorBoundary';
import { MainLayout } from '@/components/layouts/MainLayout';
import { 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Users,
  Activity,
  Brain,
  Settings
} from 'lucide-react';

interface VoiceTrainingCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'in-progress' | 'completed';
  progress?: number;
  onStart: () => void;
}

const VoiceTrainingCard: React.FC<VoiceTrainingCardProps> = ({
  title,
  description,
  icon: Icon,
  status,
  progress = 0,
  onStart,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'in-progress':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'in-progress':
        return <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />;
      default:
        return <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className={`rounded-lg border p-6 transition-all duration-200 hover:shadow-md ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          status === 'completed' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : status === 'in-progress'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
        }`}>
          {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Not Started'}
        </span>
      </div>

      {status === 'in-progress' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span>Training Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={onStart}
        disabled={status === 'completed'}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
          status === 'completed'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {status === 'completed' ? 'Training Complete' : status === 'in-progress' ? 'Continue Training' : 'Start Training'}
      </button>
    </div>
  );
};

interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayback: () => void;
  onRetry: () => void;
  hasRecording: boolean;
  isPlaying: boolean;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onPlayback,
  onRetry,
  hasRecording,
  isPlaying,
}) => {
  return (
    <div className="flex items-center justify-center space-x-4">
      {!isRecording ? (
        <button
          onClick={onStartRecording}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <Mic className="w-5 h-5" />
          <span>Start Recording</span>
        </button>
      ) : (
        <button
          onClick={onStopRecording}
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <div className="w-3 h-3 bg-white rounded-sm" />
          <span>Stop Recording</span>
        </button>
      )}

      {hasRecording && (
        <>
          <button
            onClick={onPlayback}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={onRetry}
            className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
};

function VoiceTrainingPageContent() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTraining, setActiveTraining] = useState<string | null>(null);

  const trainingSteps = [
    {
      id: 'initial-sample',
      title: 'Initial Voice Sample',
      description: 'Record a 30-second sample for basic voice recognition',
      status: 'completed' as const,
      progress: 100,
    },
    {
      id: 'diverse-samples',
      title: 'Diverse Voice Samples',
      description: 'Record samples in different speaking styles and emotions',
      status: 'in-progress' as const,
      progress: 65,
    },
    {
      id: 'noisy-environment',
      title: 'Noisy Environment Training',
      description: 'Record samples with background noise for robust recognition',
      status: 'pending' as const,
      progress: 0,
    },
    {
      id: 'accent-variation',
      title: 'Accent Variation',
      description: 'Record samples with natural accent variations',
      status: 'pending' as const,
      progress: 0,
    },
  ];

  const handleStartRecording = () => {
    setIsRecording(true);
    setHasRecording(false);
    // Simulate recording for demo
    setTimeout(() => {
      setIsRecording(false);
      setHasRecording(true);
    }, 3000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setHasRecording(true);
  };

  const handlePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      // Simulate playback for demo
      setTimeout(() => setIsPlaying(false), 2000);
    }
  };

  const handleRetry = () => {
    setHasRecording(false);
    setIsPlaying(false);
  };

  const handleStartTraining = (trainingId: string) => {
    setActiveTraining(trainingId);
    // Simulate training process
    console.log(`Starting training for: ${trainingId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Voice Training
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Train the AI to recognize your voice patterns and speaking style
          </p>
        </div>

        {/* Training Progress Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Training Progress
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete all training steps for optimal voice recognition
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trainingSteps.map((step) => (
              <VoiceTrainingCard
                key={step.id}
                title={step.title}
                description={step.description}
                icon={Mic}
                status={step.status}
                progress={step.progress}
                onStart={() => handleStartTraining(step.id)}
              />
            ))}
          </div>
        </div>

        {/* Live Recording Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <Mic className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quick Voice Sample
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Record a quick sample to test current recognition accuracy
              </p>
            </div>
          </div>

          {/* Recording Status */}
          {isRecording && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-700 dark:text-red-400 font-medium">
                  Recording in progress... Speak clearly into your microphone
                </span>
              </div>
            </div>
          )}

          {/* Waveform Visualization Placeholder */}
          <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-8">
            <div className="flex items-center justify-center space-x-2">
              <Activity className="w-8 h-8 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {isRecording ? 'Audio waveform visualization' : 'Waveform will appear during recording'}
              </span>
            </div>
          </div>

          {/* Recording Controls */}
          <RecordingControls
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onPlayback={handlePlayback}
            onRetry={handleRetry}
            hasRecording={hasRecording}
            isPlaying={isPlaying}
          />
        </div>

        {/* Training Tips */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Training Tips
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Best practices for optimal voice recognition training
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recording Quality</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Use a quiet environment</li>
                <li>• Maintain consistent distance from microphone</li>
                <li>• Speak at normal conversation volume</li>
                <li>• Avoid background noise when possible</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Speaking Variations</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Include different emotional tones</li>
                <li>• Vary speaking speed naturally</li>
                <li>• Use both formal and casual language</li>
                <li>• Include questions and statements</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload Alternative */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upload Existing Audio
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload existing audio files for voice training
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Drag and drop audio files here, or click to browse
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Supported formats: MP3, WAV, M4A (max 10MB per file)
            </p>
            <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
              Choose Files
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

// Export with error boundary protection
export default function VoiceTrainingPage() {
  return (
    <PageErrorBoundary 
      pageName="Voice Training" 
      enableRetry={true}
      maxRetries={2}
    >
      <VoiceTrainingPageContent />
    </PageErrorBoundary>
  );
}