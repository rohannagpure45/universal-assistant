# UI Components Documentation

## Overview

The Universal Assistant UI component system is built with React 18, TypeScript, and Tailwind CSS, providing a comprehensive set of reusable, accessible, and performant components. The design system emphasizes voice identification workflows, real-time interactions, and professional meeting interfaces.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Core UI Components](#core-ui-components)
3. [Voice Identification Components](#voice-identification-components)
4. [Layout & Navigation](#layout--navigation)
5. [Form & Input Components](#form--input-components)
6. [Feedback & Status Components](#feedback--status-components)
7. [Data Display Components](#data-display-components)
8. [Accessibility Features](#accessibility-features)

## Component Architecture

### Design System Structure

```
UI Component System
├── Foundation Components (/src/components/ui/)
│   ├── Button.tsx                    # Primary button component
│   ├── Card.tsx                      # Container card component
│   ├── Input.tsx                     # Form input component
│   ├── Progress.tsx                  # Progress indicators
│   ├── Tabs.tsx                      # Tab navigation
│   ├── Select.tsx                    # Dropdown selection
│   └── Badge.tsx                     # Status badges
├── Layout Components (/src/components/layouts/)
│   ├── MainLayout.tsx                # Primary application layout
│   └── index.ts                      # Layout exports
├── Specialized Components (/src/components/voice-identification/)
│   ├── VoiceLibraryDashboard.tsx     # Voice library interface
│   ├── SpeakerProfileCard.tsx        # Speaker profile display
│   ├── VoiceRecordingInterface.tsx   # Audio recording UI
│   └── [20+ voice-specific components]
├── Domain Components
│   ├── /auth/                        # Authentication components
│   ├── /dashboard/                   # Dashboard components
│   ├── /meeting/                     # Meeting components
│   └── /universal-assistant/         # Assistant UI components
└── Utility Components
    ├── ErrorBoundary.tsx             # Error handling
    ├── LoadingSpinner.tsx            # Loading states
    └── Toast.tsx                     # Notification system
```

### Component Design Principles

```typescript
interface ComponentDesignPrinciples {
  accessibility: 'WCAG 2.1 AA compliance required';
  responsiveness: 'Mobile-first responsive design';
  performance: 'React.memo and lazy loading optimization';
  reusability: 'Generic props with specialized variants';
  consistency: 'Unified design tokens and styling';
  testing: 'Unit tests and accessibility testing';
}

// Example component structure
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  testId?: string;
}
```

## Core UI Components

### Button Component

```typescript
// /src/components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  };
  
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-8 text-lg',
    xl: 'h-14 px-10 text-xl'
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
      {icon && iconPosition === 'left' && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {icon && iconPosition === 'right' && !loading && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  );
};
```

### Card Component

```typescript
// /src/components/ui/Card.tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  loading?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  interactive = false,
  loading = false,
  header,
  footer,
  className,
  children,
  ...props
}, ref) => {
  const baseClasses = 'rounded-lg bg-card text-card-foreground';
  
  const variantClasses = {
    default: 'shadow-sm border',
    outlined: 'border-2',
    elevated: 'shadow-lg border',
    flat: ''
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };
  
  const interactiveClasses = interactive 
    ? 'transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer'
    : '';
  
  return (
    <div
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        interactiveClasses,
        loading && 'animate-pulse',
        className
      )}
      {...props}
    >
      {header && (
        <div className="mb-4 pb-4 border-b border-border">
          {header}
        </div>
      )}
      
      {loading ? (
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
      ) : (
        children
      )}
      
      {footer && (
        <div className="mt-4 pt-4 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
});
```

### Progress Component

```typescript
// /src/components/ui/Progress.tsx
interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className,
  ...props
}, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };
  
  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };
  
  return (
    <div className="w-full space-y-2">
      {(showLabel || label) && (
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">{label || 'Progress'}</span>
          <span className="text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
      )}
      
      <div
        ref={ref}
        className={cn(
          'w-full bg-secondary rounded-full overflow-hidden',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-in-out',
            variantClasses[variant],
            animated && 'animate-pulse',
            striped && 'bg-gradient-to-r from-current to-current bg-[length:1rem_1rem] animate-[stripe_1s_linear_infinite]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});
```

## Voice Identification Components

### Speaker Profile Card

```typescript
// /src/components/voice-identification/SpeakerProfileCard.tsx
interface SpeakerProfileCardProps {
  profile: EnhancedVoiceProfile;
  onSelect?: (profile: EnhancedVoiceProfile) => void;
  onEdit?: (profile: EnhancedVoiceProfile) => void;
  onDelete?: (profile: EnhancedVoiceProfile) => void;
  selected?: boolean;
  compact?: boolean;
  showActions?: boolean;
  showMetrics?: boolean;
}

export const SpeakerProfileCard: React.FC<SpeakerProfileCardProps> = ({
  profile,
  onSelect,
  onEdit,
  onDelete,
  selected = false,
  compact = false,
  showActions = true,
  showMetrics = true
}) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getQualityIndicator = (quality: number): string => {
    if (quality >= 0.8) return '🟢';
    if (quality >= 0.6) return '🟡';
    return '🔴';
  };
  
  return (
    <Card
      variant={selected ? 'outlined' : 'default'}
      interactive={!!onSelect}
      className={cn(
        'transition-all duration-200',
        selected && 'ring-2 ring-primary ring-opacity-50',
        compact ? 'p-4' : 'p-6',
        onSelect && 'hover:shadow-md cursor-pointer'
      )}
      onClick={() => onSelect?.(profile)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
              {profile.userName?.charAt(0)?.toUpperCase() || profile.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
          
          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {profile.userName || profile.name || 'Unknown Speaker'}
            </h3>
            
            {profile.email && (
              <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            )}
            
            {!compact && (
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span>
                  <Users className="inline w-4 h-4 mr-1" />
                  {profile.meetingsCount || 0} meetings
                </span>
                <span>
                  <Clock className="inline w-4 h-4 mr-1" />
                  {formatDuration(profile.totalSpeakingTime || 0)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Quality & Confidence Indicators */}
        <div className="flex flex-col items-end space-y-2">
          {showMetrics && (
            <>
              <Badge
                variant={profile.confirmed ? 'success' : 'warning'}
                className={cn(
                  'text-xs font-medium',
                  getConfidenceColor(profile.confidence || 0)
                )}
              >
                {Math.round((profile.confidence || 0) * 100)}% confidence
              </Badge>
              
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-1">{getQualityIndicator(profile.profileQuality?.overallScore || 0)}</span>
                <span>Quality: {Math.round((profile.profileQuality?.overallScore || 0) * 100)}%</span>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Voice Samples Summary */}
      {!compact && profile.samplesMetadata && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.samplesMetadata.count}
              </div>
              <div className="text-xs text-gray-500">Samples</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatDuration(profile.samplesMetadata.totalDuration)}
              </div>
              <div className="text-xs text-gray-500">Total Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(profile.samplesMetadata.averageQuality * 100)}%
              </div>
              <div className="text-xs text-gray-500">Avg Quality</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pending Requests Indicator */}
      {profile.pendingRequests > 0 && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
            <span className="text-sm text-amber-800">
              {profile.pendingRequests} pending identification{profile.pendingRequests !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(profile);
              }}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(profile);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
```

### Voice Recording Interface

```typescript
// /src/components/voice-identification/VoiceRecordingInterface.tsx
interface VoiceRecordingInterfaceProps {
  onRecordingComplete: (recording: VoiceRecording) => void;
  onRecordingError: (error: string) => void;
  targetDuration?: number;
  prompt?: string;
  showRealTimeFeedback?: boolean;
  autoStop?: boolean;
}

export const VoiceRecordingInterface: React.FC<VoiceRecordingInterfaceProps> = ({
  onRecordingComplete,
  onRecordingError,
  targetDuration = 10000, // 10 seconds default
  prompt,
  showRealTimeFeedback = true,
  autoStop = true
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [qualityMetrics, setQualityMetrics] = useState<RealtimeQualityMetrics | null>(null);
  
  const {
    startRecording,
    stopRecording,
    isRecording,
    recordingBlob,
    error
  } = useAudioRecording({
    sampleRate: 16000,
    channels: 1,
    onDataAvailable: handleAudioData,
    onError: handleRecordingError
  });
  
  const handleStartRecording = async () => {
    try {
      setRecordingState('recording');
      setDuration(0);
      await startRecording();
      
      if (autoStop && targetDuration > 0) {
        setTimeout(() => {
          handleStopRecording();
        }, targetDuration);
      }
    } catch (err) {
      setRecordingState('idle');
      onRecordingError(err.message);
    }
  };
  
  const handleStopRecording = async () => {
    try {
      setRecordingState('processing');
      const blob = await stopRecording();
      
      if (blob) {
        const recording: VoiceRecording = {
          id: nanoid(),
          audioBlob: blob,
          duration: duration,
          timestamp: new Date(),
          qualityMetrics: qualityMetrics,
          prompt: prompt
        };
        
        onRecordingComplete(recording);
      }
    } catch (err) {
      onRecordingError(err.message);
    } finally {
      setRecordingState('idle');
    }
  };
  
  const handleAudioData = (audioData: Float32Array) => {
    // Update audio level for visualization
    const level = calculateRMSLevel(audioData);
    setAudioLevel(level);
    
    // Analyze quality metrics if enabled
    if (showRealTimeFeedback) {
      const metrics = analyzeRealtimeQuality(audioData);
      setQualityMetrics(metrics);
    }
  };
  
  return (
    <Card className="p-6">
      {/* Recording Prompt */}
      {prompt && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Recording Prompt</h4>
              <p className="text-blue-800">{prompt}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-6">
        {/* Main Record Button */}
        <div className="relative">
          <Button
            size="xl"
            variant={recordingState === 'recording' ? 'destructive' : 'primary'}
            className={cn(
              'w-24 h-24 rounded-full text-white font-bold text-lg transition-all duration-200',
              recordingState === 'recording' && 'animate-pulse'
            )}
            onClick={recordingState === 'recording' ? handleStopRecording : handleStartRecording}
            disabled={recordingState === 'processing'}
          >
            {recordingState === 'idle' && <Mic className="w-8 h-8" />}
            {recordingState === 'recording' && <Square className="w-6 h-6" />}
            {recordingState === 'processing' && <LoadingSpinner className="w-6 h-6" />}
          </Button>
          
          {/* Audio Level Ring */}
          {recordingState === 'recording' && (
            <div
              className="absolute inset-0 rounded-full border-4 border-primary transition-all duration-100"
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
                opacity: 0.6
              }}
            />
          )}
        </div>
        
        {/* Recording Status */}
        <div className="text-center">
          {recordingState === 'idle' && (
            <p className="text-gray-600">Click to start recording</p>
          )}
          
          {recordingState === 'recording' && (
            <div className="space-y-2">
              <p className="text-red-600 font-medium">Recording...</p>
              <p className="text-sm text-gray-500">
                {formatDuration(duration)} / {formatDuration(targetDuration)}
              </p>
              {targetDuration > 0 && (
                <Progress
                  value={duration}
                  max={targetDuration}
                  variant="error"
                  className="w-48"
                />
              )}
            </div>
          )}
          
          {recordingState === 'processing' && (
            <p className="text-blue-600 font-medium">Processing recording...</p>
          )}
        </div>
        
        {/* Real-time Quality Feedback */}
        {showRealTimeFeedback && qualityMetrics && recordingState === 'recording' && (
          <div className="w-full max-w-md">
            <h4 className="font-medium text-gray-900 mb-3">Recording Quality</h4>
            
            <div className="space-y-3">
              {/* Volume Level */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Volume Level</span>
                  <Badge
                    variant={qualityMetrics.optimalVolume ? 'success' : 'warning'}
                    className="text-xs"
                  >
                    {qualityMetrics.optimalVolume ? 'Good' : 'Adjust'}
                  </Badge>
                </div>
                <Progress
                  value={qualityMetrics.volumeLevel * 100}
                  variant={qualityMetrics.optimalVolume ? 'success' : 'warning'}
                  size="sm"
                />
              </div>
              
              {/* Background Noise */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Background Noise</span>
                  <Badge
                    variant={qualityMetrics.noiseLevel < 0.1 ? 'success' : 'error'}
                    className="text-xs"
                  >
                    {qualityMetrics.noiseLevel < 0.1 ? 'Low' : 'High'}
                  </Badge>
                </div>
                <Progress
                  value={qualityMetrics.noiseLevel * 100}
                  variant={qualityMetrics.noiseLevel < 0.1 ? 'success' : 'error'}
                  size="sm"
                />
              </div>
              
              {/* Overall Quality */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Overall Quality</span>
                  <Badge
                    variant={qualityMetrics.qualityScore > 0.7 ? 'success' : 'warning'}
                    className="text-xs"
                  >
                    {Math.round(qualityMetrics.qualityScore * 100)}%
                  </Badge>
                </div>
                <Progress
                  value={qualityMetrics.qualityScore * 100}
                  variant={qualityMetrics.qualityScore > 0.7 ? 'success' : 'warning'}
                  size="sm"
                />
              </div>
            </div>
            
            {/* Quality Recommendations */}
            <div className="mt-4">
              {!qualityMetrics.speechDetected && (
                <div className="flex items-center text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Start speaking - no voice detected
                </div>
              )}
              
              {qualityMetrics.noiseLevel > 0.1 && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Reduce background noise
                </div>
              )}
              
              {!qualityMetrics.optimalVolume && (
                <div className="flex items-center text-yellow-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {qualityMetrics.volumeLevel < 0.1 ? 'Speak louder' : 'Speak softer'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center text-red-800">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </Card>
  );
};
```

### Live Speaker Indicator

```typescript
// /src/components/voice-identification/LiveSpeakerIndicator.tsx
interface LiveSpeakerIndicatorProps {
  currentSpeaker?: {
    id: string;
    name: string;
    confidence: number;
  };
  isActive?: boolean;
  showConfidence?: boolean;
  showWaveform?: boolean;
  compact?: boolean;
  className?: string;
}

export const LiveSpeakerIndicator: React.FC<LiveSpeakerIndicatorProps> = ({
  currentSpeaker,
  isActive = false,
  showConfidence = true,
  showWaveform = true,
  compact = false,
  className
}) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };
  
  return (
    <Card
      variant="flat"
      padding={compact ? 'sm' : 'md'}
      className={cn(
        'transition-all duration-300',
        isActive ? 'ring-2 ring-blue-500 ring-opacity-75' : '',
        className
      )}
    >
      <div className="flex items-center space-x-3">
        {/* Speaker Avatar */}
        <div className="relative">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold',
            isActive ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-400'
          )}>
            {currentSpeaker?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          
          {/* Activity Indicator */}
          {isActive && (
            <div className="absolute -bottom-1 -right-1">
              <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
            </div>
          )}
        </div>
        
        {/* Speaker Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className={cn(
              'font-medium truncate',
              isActive ? 'text-gray-900' : 'text-gray-500'
            )}>
              {currentSpeaker?.name || 'No active speaker'}
            </h3>
            
            {/* Speaking Indicator */}
            {isActive && (
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1s'
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-blue-600 font-medium">Speaking</span>
              </div>
            )}
          </div>
          
          {/* Confidence Indicator */}
          {showConfidence && currentSpeaker && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  getConfidenceColor(currentSpeaker.confidence)
                )} />
                <span className="text-xs text-gray-500">
                  {getConfidenceText(currentSpeaker.confidence)} confidence
                </span>
              </div>
              
              <span className="text-xs text-gray-400">
                ({Math.round(currentSpeaker.confidence * 100)}%)
              </span>
            </div>
          )}
        </div>
        
        {/* Waveform Visualization */}
        {showWaveform && isActive && !compact && (
          <div className="flex items-center space-x-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-blue-500 rounded-full animate-bounce"
                style={{
                  height: `${Math.random() * 16 + 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
```

## Layout & Navigation

### Main Layout Component

```typescript
// /src/components/layouts/MainLayout.tsx
interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  sidebarContent?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  showSidebar = true,
  showHeader = true,
  sidebarContent,
  headerActions
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Mobile Sidebar Overlay */}
          <div
            className={cn(
              'fixed inset-0 z-40 lg:hidden',
              sidebarOpen ? 'block' : 'hidden'
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <div className="absolute inset-0 bg-gray-600 opacity-75" />
          </div>
          
          {/* Sidebar */}
          <div className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}>
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <h1 className="text-lg font-semibold text-gray-900">
                  Universal Assistant
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-2">
                <NavigationItem
                  href="/dashboard"
                  icon={<Home className="w-5 h-5" />}
                  label="Dashboard"
                />
                <NavigationItem
                  href="/meeting"
                  icon={<Mic className="w-5 h-5" />}
                  label="Meeting"
                />
                <NavigationItem
                  href="/voice-library"
                  icon={<Users className="w-5 h-5" />}
                  label="Voice Library"
                />
                <NavigationItem
                  href="/settings"
                  icon={<Settings className="w-5 h-5" />}
                  label="Settings"
                />
              </nav>
              
              {/* Custom Sidebar Content */}
              {sidebarContent && (
                <div className="px-4 py-4 border-t border-gray-200">
                  {sidebarContent}
                </div>
              )}
              
              {/* User Profile */}
              <div className="px-4 py-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    {user?.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.displayName || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {showHeader && (
          <header className="bg-white shadow-sm border-b border-gray-200 h-16">
            <div className="flex items-center justify-between h-full px-4 lg:px-6">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                {showSidebar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                )}
                
                {/* Page Title */}
                {title && (
                  <h1 className="text-xl font-semibold text-gray-900">
                    {title}
                  </h1>
                )}
              </div>
              
              {/* Header Actions */}
              {headerActions && (
                <div className="flex items-center space-x-2">
                  {headerActions}
                </div>
              )}
            </div>
          </header>
        )}
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
```

## Form & Input Components

### Enhanced Input Component

```typescript
// /src/components/ui/Input.tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  loading = false,
  success = false,
  className,
  ...props
}, ref) => {
  const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {loading ? <LoadingSpinner className="w-4 h-4" /> : icon}
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm transition-colors',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'placeholder-gray-400',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            success && 'border-green-500 focus:ring-green-500 focus:border-green-500',
            props.disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
            className
          )}
          {...props}
        />
        
        {/* Right Icon */}
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {loading ? <LoadingSpinner className="w-4 h-4" /> : icon}
          </div>
        )}
        
        {/* Success/Error Icons */}
        {(success || error) && !icon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {success && <CheckCircle className="w-4 h-4 text-green-500" />}
            {error && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
        )}
      </div>
      
      {/* Helper Text / Error Message */}
      {(error || helperText) && (
        <div className={cn(
          'text-sm',
          error ? 'text-red-600' : 'text-gray-500'
        )}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});
```

## Accessibility Features

### Accessibility Implementation

```typescript
// Accessibility utilities and hooks
export const useAccessibility = () => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    // Check for high contrast preference
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(contrastQuery.matches);
    
    // Detect screen reader usage
    setScreenReader(window.navigator.userAgent.includes('NVDA') || 
                   window.navigator.userAgent.includes('JAWS') ||
                   window.speechSynthesis !== undefined);
  }, []);
  
  return {
    reducedMotion,
    highContrast,
    screenReader,
    // ARIA helpers
    announceToScreenReader: (message: string) => {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    },
    
    // Focus management
    trapFocus: (element: HTMLElement) => {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      element.addEventListener('keydown', handleTabKey);
      return () => element.removeEventListener('keydown', handleTabKey);
    }
  };
};

// Accessible component wrapper
export const AccessibleComponent: React.FC<{
  children: React.ReactNode;
  role?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}> = ({ children, role, ariaLabel, ariaDescribedBy }) => {
  const { screenReader, announceToScreenReader } = useAccessibility();
  
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn(
        'focus-visible:outline-2 focus-visible:outline-blue-500',
        screenReader && 'sr-focus-visible'
      )}
    >
      {children}
    </div>
  );
};
```

### WCAG 2.1 AA Compliance Features

```typescript
// Color contrast utilities
export const colorContrast = {
  // Ensure minimum 4.5:1 contrast ratio for normal text
  // Ensure minimum 3:1 contrast ratio for large text
  validateContrast: (foreground: string, background: string): boolean => {
    const contrast = calculateContrastRatio(foreground, background);
    return contrast >= 4.5;
  },
  
  // High contrast mode support
  highContrastColors: {
    primary: '#0000FF',      // Blue
    secondary: '#000000',    // Black
    success: '#008000',      // Green
    warning: '#FFD700',      // Gold
    error: '#FF0000',        // Red
    text: '#000000',         // Black text
    background: '#FFFFFF'    // White background
  }
};

// Keyboard navigation support
export const keyboardNavigation = {
  // Handle arrow key navigation for lists and grids
  handleArrowKeys: (e: KeyboardEvent, items: HTMLElement[]) => {
    const currentIndex = items.findIndex(item => item === document.activeElement);
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
    }
    
    if (nextIndex !== currentIndex) {
      e.preventDefault();
      items[nextIndex].focus();
    }
  },
  
  // Skip links for keyboard users
  SkipLink: ({ href, children }: { href: string; children: string }) => (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
    >
      {children}
    </a>
  )
};
```

---

*Last Updated: 2025-01-21*
*UI Component Library Version: 3.0.0*
*Accessibility Compliance: WCAG 2.1 AA*
*Component Count: 40+ specialized components*