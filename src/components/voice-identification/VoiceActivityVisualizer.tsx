'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Voice Activity Detection data
export interface VoiceActivityData {
  isActive: boolean;
  audioLevel: number; // 0-1 range
  frequency: number[]; // Frequency spectrum data
  timestamp: number;
  confidence: number; // VAD confidence 0-1
}

// Audio analysis configuration
export interface AudioAnalysisConfig {
  fftSize: number; // FFT size for frequency analysis (default: 512)
  smoothingTimeConstant: number; // Audio smoothing (default: 0.8)
  minDecibels: number; // Minimum decibel level (default: -90)
  maxDecibels: number; // Maximum decibel level (default: -10)
  voiceFrequencyRange: [number, number]; // Voice frequency range in Hz (default: [300, 3400])
  updateInterval: number; // Update interval in ms (default: 50)
}

// Visualization styles
export interface VisualizationStyle {
  waveformColor: string;
  activeColor: string;
  inactiveColor: string;
  backgroundColor: string;
  height: number;
  showFrequencyBars: boolean;
  showWaveform: boolean;
  showVolumeIndicator: boolean;
  animationDuration: number;
}

export interface VoiceActivityVisualizerProps {
  // Audio stream for analysis
  audioStream?: MediaStream;
  
  // Real-time voice activity data
  voiceActivityData?: VoiceActivityData;
  
  // Analysis configuration
  config?: Partial<AudioAnalysisConfig>;
  
  // Visual styling
  style?: Partial<VisualizationStyle>;
  
  // Event callbacks
  onVoiceActivityChange?: (isActive: boolean, level: number) => void;
  onSpeakerChange?: (speakerId: string | null) => void;
  onAudioLevelChange?: (level: number, frequencies: number[]) => void;
  
  // Component configuration
  showControls?: boolean;
  showDebugInfo?: boolean;
  enabled?: boolean;
  className?: string;
}

/**
 * VoiceActivityVisualizer - Real-time audio visualization with VAD
 * 
 * Features:
 * - Real-time waveform visualization
 * - Voice activity detection indicators
 * - Frequency spectrum analysis
 * - Speaker change detection
 * - Audio level monitoring
 * - Performance-optimized rendering
 */
export const VoiceActivityVisualizer: React.FC<VoiceActivityVisualizerProps> = ({
  audioStream,
  voiceActivityData,
  config: userConfig,
  style: userStyle,
  onVoiceActivityChange,
  onSpeakerChange,
  onAudioLevelChange,
  showControls = true,
  showDebugInfo = false,
  enabled = true,
  className,
}) => {
  // Canvas refs for visualization
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const frequencyCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Component state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    sampleRate: number;
    bufferSize: number;
    frequency: number;
    rmsLevel: number;
  } | null>(null);

  // Merge configuration with defaults
  const config = useMemo((): AudioAnalysisConfig => ({
    fftSize: 512,
    smoothingTimeConstant: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    voiceFrequencyRange: [300, 3400],
    updateInterval: 50,
    ...userConfig,
  }), [userConfig]);

  // Merge styles with defaults
  const style = useMemo((): VisualizationStyle => ({
    waveformColor: '#3b82f6',
    activeColor: '#22c55e',
    inactiveColor: '#6b7280',
    backgroundColor: '#f8fafc',
    height: 120,
    showFrequencyBars: true,
    showWaveform: true,
    showVolumeIndicator: true,
    animationDuration: 150,
    ...userStyle,
  }), [userStyle]);

  // Initialize audio analysis
  const initializeAudioAnalysis = useCallback(async () => {
    if (!audioStream || !enabled) return;

    try {
      // Create audio context
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();

      // Create analyser node
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = config.fftSize;
      analyser.smoothingTimeConstant = config.smoothingTimeConstant;
      analyser.minDecibels = config.minDecibels;
      analyser.maxDecibels = config.maxDecibels;
      analyserRef.current = analyser;

      // Create data arrays
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      frequencyDataRef.current = new Uint8Array(bufferLength);

      // Connect audio stream
      const source = audioContextRef.current.createMediaStreamSource(audioStream);
      source.connect(analyser);

      setIsAnalyzing(true);
      startAnalysis();

      console.log('[VoiceActivityVisualizer] Audio analysis initialized', {
        fftSize: config.fftSize,
        sampleRate: audioContextRef.current.sampleRate,
        bufferLength,
      });
    } catch (error) {
      console.error('[VoiceActivityVisualizer] Failed to initialize audio analysis:', error);
    }
  }, [audioStream, enabled, config]);

  // Start continuous analysis loop
  const startAnalysis = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !frequencyDataRef.current) return;

    const analyze = () => {
      if (!analyserRef.current || !dataArrayRef.current || !frequencyDataRef.current) return;

      // Get time domain data for waveform
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current as any);
      
      // Get frequency domain data for spectrum
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current as any);

      // Calculate audio levels and voice activity
      const audioLevel = calculateAudioLevel(dataArrayRef.current);
      const voiceLevel = calculateVoiceLevel(frequencyDataRef.current);
      const isActive = voiceLevel > 0.1; // Voice activity threshold

      // Update state
      setCurrentLevel(audioLevel);
      setIsVoiceActive(isActive);

      // Fire callbacks
      onVoiceActivityChange?.(isActive, audioLevel);
      onAudioLevelChange?.(audioLevel, Array.from(frequencyDataRef.current));

      // Update debug info
      if (showDebugInfo && audioContextRef.current) {
        setDebugInfo({
          sampleRate: audioContextRef.current.sampleRate,
          bufferSize: dataArrayRef.current.length,
          frequency: calculateDominantFrequency(frequencyDataRef.current, audioContextRef.current.sampleRate),
          rmsLevel: audioLevel,
        });
      }

      // Draw visualizations
      drawWaveform();
      drawFrequencyBars();

      // Continue analysis
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [onVoiceActivityChange, onAudioLevelChange, showDebugInfo]);

  // Calculate RMS audio level
  const calculateAudioLevel = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }, []);

  // Calculate voice-specific level from frequency data
  const calculateVoiceLevel = useCallback((frequencyData: Uint8Array): number => {
    if (!audioContextRef.current) return 0;

    const sampleRate = audioContextRef.current.sampleRate;
    const [minFreq, maxFreq] = config.voiceFrequencyRange;
    
    // Convert frequency range to bin indices
    const binSize = sampleRate / (config.fftSize * 2);
    const startBin = Math.floor(minFreq / binSize);
    const endBin = Math.floor(maxFreq / binSize);

    let sum = 0;
    let count = 0;
    for (let i = startBin; i < Math.min(endBin, frequencyData.length); i++) {
      sum += frequencyData[i];
      count++;
    }

    return count > 0 ? (sum / count) / 255 : 0;
  }, [config.voiceFrequencyRange, config.fftSize]);

  // Calculate dominant frequency
  const calculateDominantFrequency = useCallback((frequencyData: Uint8Array, sampleRate: number): number => {
    let maxValue = 0;
    let maxIndex = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }
    
    const binSize = sampleRate / (config.fftSize * 2);
    return maxIndex * binSize;
  }, [config.fftSize]);

  // Draw waveform visualization
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    const dataArray = dataArrayRef.current;
    if (!canvas || !dataArray || !style.showWaveform) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = isVoiceActive ? style.activeColor : style.waveformColor;
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = style.inactiveColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [isVoiceActive, style]);

  // Draw frequency bars
  const drawFrequencyBars = useCallback(() => {
    const canvas = frequencyCanvasRef.current;
    const frequencyData = frequencyDataRef.current;
    if (!canvas || !frequencyData || !style.showFrequencyBars) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw frequency bars
    const barWidth = width / frequencyData.length;
    const maxHeight = height - 20;

    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * maxHeight;
      const x = i * barWidth;
      const y = height - barHeight - 10;

      // Determine color based on voice frequency range
      let barColor = style.inactiveColor;
      if (audioContextRef.current) {
        const binSize = audioContextRef.current.sampleRate / (config.fftSize * 2);
        const frequency = i * binSize;
        const [minVoiceFreq, maxVoiceFreq] = config.voiceFrequencyRange;
        
        if (frequency >= minVoiceFreq && frequency <= maxVoiceFreq) {
          barColor = isVoiceActive ? style.activeColor : style.waveformColor;
        }
      }

      ctx.fillStyle = barColor;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Draw frequency labels
    ctx.fillStyle = style.inactiveColor;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    const labelCount = 5;
    for (let i = 0; i < labelCount; i++) {
      const x = (i / (labelCount - 1)) * width;
      const freqBin = Math.floor((i / (labelCount - 1)) * frequencyData.length);
      const frequency = audioContextRef.current ? 
        (freqBin * audioContextRef.current.sampleRate) / (config.fftSize * 2) : 0;
      
      ctx.fillText(`${Math.round(frequency)}Hz`, x, height - 2);
    }
  }, [isVoiceActive, style, config]);

  // Handle canvas resize
  const handleCanvasResize = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Canvas resize observer
  useEffect(() => {
    const waveformCanvas = waveformCanvasRef.current;
    const frequencyCanvas = frequencyCanvasRef.current;
    
    if (waveformCanvas) handleCanvasResize(waveformCanvas);
    if (frequencyCanvas) handleCanvasResize(frequencyCanvas);

    const resizeObserver = new ResizeObserver(() => {
      if (waveformCanvas) handleCanvasResize(waveformCanvas);
      if (frequencyCanvas) handleCanvasResize(frequencyCanvas);
    });

    if (waveformCanvas) resizeObserver.observe(waveformCanvas);
    if (frequencyCanvas) resizeObserver.observe(frequencyCanvas);

    return () => resizeObserver.disconnect();
  }, [handleCanvasResize]);

  // Initialize analysis when audio stream changes
  useEffect(() => {
    if (audioStream && enabled) {
      initializeAudioAnalysis();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsAnalyzing(false);
    };
  }, [audioStream, enabled, initializeAudioAnalysis]);

  // Control panel component
  const ControlPanel = () => {
    if (!showControls) return null;

    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-4">
          {/* Voice activity indicator */}
          <div className="flex items-center space-x-2">
            {isVoiceActive ? (
              <Mic className="h-4 w-4 text-green-500" />
            ) : (
              <MicOff className="h-4 w-4 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              {isVoiceActive ? 'Voice Active' : 'Silent'}
            </span>
          </div>

          {/* Audio level indicator */}
          {style.showVolumeIndicator && (
            <div className="flex items-center space-x-2">
              {currentLevel > 0.1 ? (
                <Volume2 className="h-4 w-4 text-blue-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1 bg-blue-500 rounded-full transition-all duration-100",
                      currentLevel > i * 0.2 ? "h-3 opacity-100" : "h-1 opacity-30"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Activity className={cn(
            "h-4 w-4",
            isAnalyzing ? "text-green-500 animate-pulse" : "text-gray-400"
          )} />
          <span className="text-sm text-gray-500">
            {isAnalyzing ? 'Analyzing' : 'Inactive'}
          </span>
        </div>
      </div>
    );
  };

  // Debug info panel
  const DebugPanel = () => {
    if (!showDebugInfo || !debugInfo) return null;

    return (
      <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono">
        <div className="grid grid-cols-2 gap-2">
          <div>Sample Rate: {debugInfo.sampleRate}Hz</div>
          <div>Buffer Size: {debugInfo.bufferSize}</div>
          <div>RMS Level: {debugInfo.rmsLevel.toFixed(3)}</div>
          <div>Dominant Freq: {Math.round(debugInfo.frequency)}Hz</div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <ControlPanel />
      
      <div className="relative" style={{ height: style.height }}>
        {/* Waveform canvas */}
        {style.showWaveform && (
          <canvas
            ref={waveformCanvasRef}
            className="absolute inset-0 w-full h-1/2 rounded-lg border"
            style={{ backgroundColor: style.backgroundColor }}
          />
        )}
        
        {/* Frequency bars canvas */}
        {style.showFrequencyBars && (
          <canvas
            ref={frequencyCanvasRef}
            className={cn(
              "absolute inset-0 w-full rounded-lg border",
              style.showWaveform ? "top-1/2 h-1/2" : "h-full"
            )}
            style={{ backgroundColor: style.backgroundColor }}
          />
        )}
      </div>

      <DebugPanel />
    </div>
  );
};

// Hook for managing voice activity data
export const useVoiceActivity = (audioStream?: MediaStream) => {
  const [voiceActivityData, setVoiceActivityData] = useState<VoiceActivityData | null>(null);
  
  const updateVoiceActivity = useCallback((isActive: boolean, level: number, frequencies?: number[]) => {
    setVoiceActivityData({
      isActive,
      audioLevel: level,
      frequency: frequencies || [],
      timestamp: Date.now(),
      confidence: isActive ? Math.min(level * 2, 1) : level,
    });
  }, []);
  
  const clearVoiceActivity = useCallback(() => {
    setVoiceActivityData(null);
  }, []);
  
  return {
    voiceActivityData,
    updateVoiceActivity,
    clearVoiceActivity,
  };
};

export default VoiceActivityVisualizer;