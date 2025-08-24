/**
 * Voice Sample Player Component
 * 
 * Audio playback component with waveform visualization, sample quality indicators,
 * and metadata display. Provides interactive audio controls with visual feedback
 * for voice sample analysis and identification.
 * 
 * Features:
 * - Audio playback with play/pause controls
 * - Waveform visualization using Web Audio API
 * - Progress indicator and seeking
 * - Quality indicators and confidence scores
 * - Metadata display (duration, quality, confidence)
 * - Loading states and error handling
 * - Accessibility support with keyboard controls
 * 
 * @component
 * @example
 * ```tsx
 * <VoiceSamplePlayer 
 *   sample={{
 *     url: 'https://...',
 *     transcript: 'Hello world',
 *     quality: 0.9,
 *     duration: 5.5
 *   }}
 *   autoWaveform={true}
 *   onPlayStateChange={(playing) => console.log('Playing:', playing)}
 * />
 * ```
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { VoiceSample } from '@/types/voice-identification';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Download,
  Clock,
  Mic,
  Activity,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

/**
 * Voice sample data interface
 */
// Note: Using unified VoiceSample interface from types

/**
 * Props for the Voice Sample Player component
 */
interface VoiceSamplePlayerProps {
  /** Voice sample data to play */
  sample: VoiceSample;
  /** Whether to show waveform visualization */
  showWaveform?: boolean;
  /** Whether to automatically generate waveform */
  autoWaveform?: boolean;
  /** Whether to use compact layout */
  compact?: boolean;
  /** Whether to show download button */
  showDownload?: boolean;
  /** Whether to show transcript */
  showTranscript?: boolean;
  /** Callback fired when play state changes */
  onPlayStateChange?: (playing: boolean) => void;
  /** Callback fired when playback position changes */
  onPositionChange?: (position: number) => void;
  /** Callback fired when playback ends */
  onEnded?: () => void;
  /** Custom CSS class name */
  className?: string;
}

/**
 * Waveform visualization data
 */
interface WaveformData {
  peaks: number[];
  duration: number;
}

/**
 * Quality level configurations
 */
const QUALITY_LEVELS = {
  excellent: { threshold: 0.9, color: '#10b981', label: 'Excellent' },
  good: { threshold: 0.7, color: '#3b82f6', label: 'Good' },
  fair: { threshold: 0.5, color: '#f59e0b', label: 'Fair' },
  poor: { threshold: 0, color: '#ef4444', label: 'Poor' }
} as const;

export const VoiceSamplePlayer: React.FC<VoiceSamplePlayerProps> = ({
  sample,
  showWaveform = true,
  autoWaveform = true,
  compact = false,
  showDownload = true,
  showTranscript = true,
  onPlayStateChange,
  onPositionChange,
  onEnded,
  className = ''
}) => {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(sample.duration);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Waveform state
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [generatingWaveform, setGeneratingWaveform] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  /**
   * Get quality level for the sample
   */
  const qualityLevel = useMemo(() => {
    const score = sample.quality;
    
    if (score >= QUALITY_LEVELS.excellent.threshold) return QUALITY_LEVELS.excellent;
    if (score >= QUALITY_LEVELS.good.threshold) return QUALITY_LEVELS.good;
    if (score >= QUALITY_LEVELS.fair.threshold) return QUALITY_LEVELS.fair;
    return QUALITY_LEVELS.poor;
  }, [sample.quality]);

  /**
   * Format time duration for display
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Format percentage for display
   */
  const formatPercentage = useCallback((value: number): string => {
    return `${Math.round(value * 100)}%`;
  }, []);

  /**
   * Generate waveform data from audio buffer
   */
  const generateWaveform = useCallback(async (audioBuffer: AudioBuffer): Promise<WaveformData> => {
    const channelData = audioBuffer.getChannelData(0);
    const samples = audioBuffer.length;
    const blockSize = Math.floor(samples / 200); // Generate ~200 data points
    const peaks: number[] = [];

    for (let i = 0; i < 200; i++) {
      const start = blockSize * i;
      const end = start + blockSize;
      let max = 0;

      for (let j = start; j < end; j++) {
        const sample = Math.abs(channelData[j]);
        if (sample > max) {
          max = sample;
        }
      }

      peaks.push(max);
    }

    return {
      peaks,
      duration: audioBuffer.duration
    };
  }, []);

  /**
   * Load and analyze audio file
   */
  const loadAudio = useCallback(async () => {
    if (!autoWaveform || !showWaveform) return;

    try {
      setGeneratingWaveform(true);
      
      // Fetch audio file
      const response = await fetch(sample.url);
      if (!response.ok) throw new Error('Failed to fetch audio file');
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Decode audio data
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Generate waveform data
      const waveform = await generateWaveform(audioBuffer);
      setWaveformData(waveform);
      
      // Clean up audio context
      await audioContext.close();
    } catch (err) {
      console.error('Failed to generate waveform:', err);
      setError('Failed to load audio waveform');
    } finally {
      setGeneratingWaveform(false);
    }
  }, [sample.url, autoWaveform, showWaveform, generateWaveform]);

  /**
   * Draw waveform on canvas
   */
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const { peaks } = waveformData;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate dimensions
    const barWidth = width / peaks.length;
    const progressWidth = (currentTime / duration) * width;

    // Draw waveform bars
    peaks.forEach((peak, i) => {
      const barHeight = peak * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Use different colors for played vs unplayed portions
      ctx.fillStyle = x < progressWidth ? qualityLevel.color : '#e5e7eb';
      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
    });

    // Draw progress indicator
    ctx.strokeStyle = qualityLevel.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressWidth, 0);
    ctx.lineTo(progressWidth, height);
    ctx.stroke();
  }, [waveformData, currentTime, duration, qualityLevel.color]);

  /**
   * Handle play/pause toggle
   */
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
        setError('Failed to play audio file');
      });
    }
  }, [isPlaying]);

  /**
   * Handle seeking on waveform click
   */
  const handleWaveformClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickProgress = x / canvas.width;
    const seekTime = clickProgress * duration;

    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    onPositionChange?.(seekTime);
  }, [duration, onPositionChange]);

  /**
   * Handle volume change
   */
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!audioRef.current) return;
    
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  }, []);

  /**
   * Handle mute toggle
   */
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    
    setMuted(!muted);
    audioRef.current.muted = !muted;
  }, [muted]);

  /**
   * Handle audio download
   */
  const downloadAudio = useCallback(() => {
    const link = document.createElement('a');
    link.href = sample.url;
    link.download = `voice-sample-${sample.timestamp.getTime()}.webm`;
    link.click();
  }, [sample.url, sample.timestamp]);

  /**
   * Update progress animation
   */
  const updateProgress = useCallback(() => {
    if (audioRef.current && isPlaying) {
      setCurrentTime(audioRef.current.currentTime);
      onPositionChange?.(audioRef.current.currentTime);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, onPositionChange]);

  // Load audio and generate waveform on mount
  useEffect(() => {
    loadAudio();
  }, [loadAudio]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
      updateProgress();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlayStateChange?.(false);
      onEnded?.();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setLoading(false);
    };

    const handleLoadStart = () => {
      setLoading(true);
      setError(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateProgress, onPlayStateChange, onEnded]);

  // Draw waveform when data or progress changes
  useEffect(() => {
    if (showWaveform) {
      drawWaveform();
    }
  }, [showWaveform, drawWaveform]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      {/* Audio element */}
      <audio
        ref={audioRef}
        src={sample.url}
        preload="metadata"
        aria-label={`Audio sample: ${sample.transcript}`}
      />

      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Voice Sample</h3>
            <div 
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${qualityLevel.color}20`,
                color: qualityLevel.color 
              }}
            >
              {qualityLevel.label} Quality
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showDownload && (
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadAudio}
                className="flex items-center gap-2"
                aria-label="Download audio sample"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 mb-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Waveform Visualization */}
      {showWaveform && (
        <div className="mb-4">
          <div className="relative bg-gray-50 rounded-lg p-2">
            {generatingWaveform ? (
              <div className="flex items-center justify-center h-20">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-gray-600">Analyzing audio...</span>
              </div>
            ) : waveformData ? (
              <canvas
                ref={canvasRef}
                width={400}
                height={80}
                className="w-full h-20 cursor-pointer"
                onClick={handleWaveformClick}
                aria-label="Audio waveform, click to seek"
                role="slider"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    const step = duration / 20; // 5% steps
                    const newTime = e.key === 'ArrowLeft' 
                      ? Math.max(0, currentTime - step)
                      : Math.min(duration, currentTime + step);
                    if (audioRef.current) {
                      audioRef.current.currentTime = newTime;
                    }
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-20 text-gray-400">
                <Activity className="h-6 w-6 mr-2" />
                <span className="text-sm">Waveform not available</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {/* Play/Pause Button */}
        <Button
          onClick={togglePlayPause}
          disabled={loading}
          className="flex items-center gap-2"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {compact ? '' : (isPlaying ? 'Pause' : 'Play')}
        </Button>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm text-gray-600 font-mono">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-100"
              style={{
                width: `${(currentTime / duration) * 100}%`,
                backgroundColor: qualityLevel.color
              }}
            />
          </div>
          <span className="text-sm text-gray-600 font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Controls */}
        {!compact && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={muted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16"
              aria-label="Volume control"
            />
          </div>
        )}
      </div>

      {/* Sample Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Clock className="h-4 w-4 text-gray-600" />
          <div>
            <div className="text-sm font-medium">{formatTime(sample.duration)}</div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <BarChart3 className="h-4 w-4 text-gray-600" />
          <div>
            <div className="text-sm font-medium">{formatPercentage(sample.quality)}</div>
            <div className="text-xs text-gray-500">Quality</div>
          </div>
        </div>
        
        {sample.confidence && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-sm font-medium">{formatPercentage(sample.confidence)}</div>
              <div className="text-xs text-gray-500">Confidence</div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Activity className="h-4 w-4 text-gray-600" />
          <div>
            <div className="text-sm font-medium">{new Date(sample.timestamp).toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">Recorded</div>
          </div>
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && sample.transcript && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Transcript
          </h4>
          <p className="text-sm text-gray-800 italic">
            "{sample.transcript}"
          </p>
        </div>
      )}
    </div>
  );
};