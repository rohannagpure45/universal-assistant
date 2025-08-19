# Progress Indicators System

A comprehensive set of progress indicators designed for the Universal Assistant application, providing excellent user feedback and accessibility support for long-running operations.

## Components Overview

### 1. Basic Progress Components

#### LoadingSpinner
```tsx
import { LoadingSpinner } from '@/components/ui';

// Basic spinner
<LoadingSpinner size="md" color="primary" label="Loading data" />

// Overlay spinner
<LoadingSpinner overlay size="xl" label="Processing request" />
```

#### LinearProgress
```tsx
import { LinearProgress } from '@/components/ui';

// Determinate progress
<LinearProgress 
  progress={75} 
  label="Uploading file" 
  showPercentage 
  size="lg" 
/>

// Indeterminate progress
<LinearProgress 
  indeterminate 
  label="Processing" 
  color="primary" 
/>
```

#### CircularProgress
```tsx
import { CircularProgress } from '@/components/ui';

<CircularProgress
  progress={60}
  size={80}
  showPercentage
  label="Download progress"
/>
```

### 2. Advanced Progress Components

#### ProgressModal
For complex multi-step operations:

```tsx
import { useProgressModal, ProgressStep } from '@/components/ui';

const ExampleComponent = () => {
  const progressModal = useProgressModal();

  const handleOperation = async () => {
    const steps: ProgressStep[] = [
      { id: 'step1', label: 'Preparing data', status: 'pending' },
      { id: 'step2', label: 'Processing', status: 'pending' },
      { id: 'step3', label: 'Finalizing', status: 'pending' }
    ];

    progressModal.openModal({
      title: 'Processing Request',
      description: 'Please wait while we process your request',
      steps,
      canCancel: true,
      onCancel: () => {
        // Handle cancellation
        progressModal.closeModal();
      }
    });

    // Update progress as operation proceeds
    progressModal.updateProgress({
      steps: steps.map((step, index) => 
        index === 0 ? { ...step, status: 'running' } : step
      ),
      currentStep: 0,
      progress: 25
    });
  };

  return (
    <>
      <button onClick={handleOperation}>Start Operation</button>
      <progressModal.ProgressModal />
    </>
  );
};
```

#### FileProgressModal
Specialized for file operations with pause/resume support:

```tsx
import { useFileProgress, FileOperationConfig } from '@/components/ui';

const FileUploadExample = () => {
  const fileProgress = useFileProgress();

  const handleFileUpload = async (files: File[]) => {
    const config: FileOperationConfig = {
      operation: 'upload',
      title: 'Uploading Files',
      description: 'Uploading selected files to the server',
      files: files.map(file => ({
        fileName: file.name,
        fileSize: file.size,
        processedBytes: 0,
        progress: 0,
        status: 'pending'
      })),
      allowCancel: true,
      allowPause: true,
      allowRetry: true
    };

    fileProgress.startOperation(config);

    // Update file progress during upload
    files.forEach(async (file, index) => {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        fileProgress.updateFileProgress(file.name, {
          progress: i,
          processedBytes: (file.size * i) / 100,
          status: i === 100 ? 'completed' : 'processing',
          speed: 1024 * 1024 // 1 MB/s example
        });
      }
    });
  };

  return (
    <>
      <input type="file" multiple onChange={(e) => 
        e.target.files && handleFileUpload(Array.from(e.target.files))
      } />
      {fileProgress.FileProgressModal}
    </>
  );
};
```

### 3. Accessible Progress Components

#### AccessibleLinearProgress
Enhanced with screen reader support and milestone announcements:

```tsx
import { AccessibleLinearProgress } from '@/components/ui';

<AccessibleLinearProgress
  progress={progress}
  label="Data processing"
  description="Processing user analytics data"
  announceOnMilestones={true}
  milestones={[25, 50, 75, 100]}
  onProgressChange={(progress) => {
    console.log(`Progress updated: ${progress}%`);
  }}
/>
```

#### AccessibleProgressManager
For complex multi-step operations with full accessibility:

```tsx
import { AccessibleProgressManager } from '@/components/ui';

const steps = [
  {
    id: 'validate',
    label: 'Validating input',
    progress: 100,
    status: 'completed' as const,
    description: 'Checking data format and integrity'
  },
  {
    id: 'process',
    label: 'Processing data',
    progress: 60,
    status: 'active' as const,
    description: 'Analyzing and transforming data'
  },
  {
    id: 'save',
    label: 'Saving results',
    progress: 0,
    status: 'pending' as const,
    description: 'Storing processed data'
  }
];

<AccessibleProgressManager
  steps={steps}
  title="Data Processing Pipeline"
  description="Processing your uploaded data file"
  overallProgress={53}
  onStepComplete={(stepId) => {
    console.log(`Step completed: ${stepId}`);
  }}
  onError={(stepId, error) => {
    console.error(`Error in step ${stepId}:`, error);
  }}
/>
```

### 4. Skeleton Loaders

#### Dashboard Skeleton
```tsx
import { SkeletonCostTracker, SkeletonDashboardCard } from '@/components/ui';

// Full cost tracker skeleton
<SkeletonCostTracker />

// Individual dashboard cards
<div className="grid grid-cols-4 gap-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <SkeletonDashboardCard key={i} showTrend={i < 2} />
  ))}
</div>
```

#### Page-specific Skeletons
```tsx
import { 
  SkeletonMeeting, 
  SkeletonAnalytics, 
  SkeletonSettings 
} from '@/components/ui';

// Meeting page loading
<SkeletonMeeting />

// Analytics page loading
<SkeletonAnalytics />

// Settings page loading
<SkeletonSettings />
```

#### Real-time Content Skeleton
```tsx
import { SkeletonRealtime } from '@/components/ui';

// For live transcript or real-time data
<SkeletonRealtime items={5} />
```

### 5. Button Loading States

Enhanced Button component with built-in loading support:

```tsx
import { Button } from '@/components/ui/Button';

// Basic loading button
<Button
  loading={isLoading}
  disabled={isLoading}
  onClick={handleSubmit}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>

// Button with custom loading text
<Button
  loading={isExporting}
  leftIcon={!isExporting ? <Download /> : undefined}
  variant="primary"
>
  {isExporting ? 'Exporting...' : 'Export Data'}
</Button>
```

## Implementation Examples

### 1. Cost Tracker Export (Implemented)
- Progress modal with 4-step process
- Real-time progress updates
- Error handling with retry functionality
- Cancellation support

### 2. Authentication Forms (Implemented)
- Linear progress bars during sign-in/sign-up
- Button loading states
- Prevention of multiple submissions
- Progressive feedback for multi-step auth

### 3. Meeting Creation (Implemented)
- Multi-step progress modal
- Microphone permission handling
- Audio setup progress
- Error recovery with retry options

### 4. Dashboard Loading (Implemented)
- Skeleton loaders for all components
- Smooth transitions from skeleton to content
- Responsive skeleton layouts

## Accessibility Features

### Screen Reader Support
- All progress indicators include proper ARIA labels
- Live regions for progress announcements
- Descriptive status updates
- Milestone announcements

### Keyboard Navigation
- Focus management during modal operations
- Accessible cancel/retry buttons
- Proper tab order

### Visual Accessibility
- High contrast color schemes
- Clear progress visualization
- Consistent loading states
- Responsive design

## Best Practices

### When to Use Each Component

1. **LoadingSpinner**: Simple loading states, button loading
2. **LinearProgress**: File uploads, data processing with known progress
3. **CircularProgress**: Compact spaces, dashboard widgets
4. **ProgressModal**: Multi-step operations, complex processes
5. **FileProgressModal**: File operations with progress tracking
6. **Skeleton Loaders**: Initial page loads, data fetching

### Performance Considerations

1. **Debounce Progress Updates**: Limit updates to ~60fps maximum
2. **Cleanup**: Always clean up progress modals and timers
3. **Memory**: Use efficient skeleton components for large lists
4. **Animations**: Respect user preferences for reduced motion

### Error Handling

1. **Graceful Degradation**: Provide fallback text for failed animations
2. **Retry Mechanisms**: Include retry options for failed operations
3. **Clear Error Messages**: Describe what went wrong and how to fix it
4. **Recovery**: Allow users to recover from errors without losing data

## Testing

### Accessibility Testing
```bash
# Test with screen readers
npm run test:a11y

# Test keyboard navigation
npm run test:keyboard

# Test with color blindness simulation
npm run test:colorblind
```

### Performance Testing
```bash
# Test animation performance
npm run test:performance

# Test memory usage with large datasets
npm run test:memory
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All components include fallbacks for older browsers and respect user accessibility preferences.