import { useRef, useCallback, useEffect, useState } from 'react';

export interface AudioPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  error: string | null;
}

export interface AudioPlaybackControls {
  play: (url?: string) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  playAudioFromFirebase: (url: string) => Promise<void>;
}

export interface UseAudioPlaybackOptions {
  autoPlay?: boolean;
  loop?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  volume?: number;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export function useAudioPlayback(
  initialUrl?: string,
  options: UseAudioPlaybackOptions = {}
): [AudioPlaybackState, AudioPlaybackControls] {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  
  const [state, setState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isLoading: false,
    duration: 0,
    currentTime: 0,
    volume: options.volume ?? 1,
    error: null,
  });

  // Cleanup function
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    currentUrlRef.current = null;
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      error: null,
    }));
  }, []);

  // Setup audio element with event listeners
  const setupAudioElement = useCallback((url: string) => {
    // Clean up existing audio
    cleanup();

    const audio = new Audio();
    audioRef.current = audio;
    currentUrlRef.current = url;

    // Configure audio element
    audio.preload = options.preload || 'metadata';
    audio.loop = options.loop || false;
    audio.volume = options.volume ?? 1;

    // Event listeners
    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      options.onLoadStart?.();
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0,
        isLoading: false,
      }));
      options.onLoadEnd?.();
    };

    const handleTimeUpdate = () => {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      options.onEnded?.();
    };

    const handleError = () => {
      const errorMessage = `Audio playback failed: ${audio.error?.message || 'Unknown error'}`;
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: errorMessage,
      }));
      options.onError?.(errorMessage);
      console.error('Audio playback error:', audio.error);
    };

    const handleVolumeChange = () => {
      setState(prev => ({ ...prev, volume: audio.volume }));
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('volumechange', handleVolumeChange);

    // Set source
    audio.src = url;

    return audio;
  }, [cleanup, options]);

  // Play function
  const play = useCallback(async (url?: string) => {
    try {
      const targetUrl = url || currentUrlRef.current;
      if (!targetUrl) {
        throw new Error('No audio URL provided');
      }

      // Create new audio element if URL changed or doesn't exist
      if (!audioRef.current || currentUrlRef.current !== targetUrl) {
        setupAudioElement(targetUrl);
      }

      if (audioRef.current) {
        await audioRef.current.play();
      }
    } catch (error) {
      const errorMessage = `Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: errorMessage,
      }));
      options.onError?.(errorMessage);
      console.error('Play error:', error);
    }
  }, [setupAudioElement, options]);

  // Firebase-specific play function (enhanced version of original)
  const playAudioFromFirebase = useCallback(async (url: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await play(url);
    } catch (error) {
      const errorMessage = `Failed to play Firebase audio: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setState(prev => ({ ...prev, error: errorMessage }));
      options.onError?.(errorMessage);
      throw error;
    }
  }, [play, options]);

  // Pause function
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  // Stop function (enhanced from original)
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  // Set volume function
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  // Seek function
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      const clampedTime = Math.max(0, Math.min(audioRef.current.duration || 0, time));
      audioRef.current.currentTime = clampedTime;
      setState(prev => ({ ...prev, currentTime: clampedTime }));
    }
  }, []);

  // Initialize with initial URL
  useEffect(() => {
    if (initialUrl) {
      setupAudioElement(initialUrl);
      if (options.autoPlay) {
        play(initialUrl);
      }
    }

    // Cleanup on unmount
    return cleanup;
  }, [initialUrl, setupAudioElement, play, cleanup, options.autoPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const controls: AudioPlaybackControls = {
    play,
    pause,
    stop,
    setVolume,
    seek,
    playAudioFromFirebase,
  };

  return [state, controls];
}

export default useAudioPlayback;
