import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioPlayback } from './useAudioPlayback';

export interface QueuedAudioItem {
  id: string;
  url: string;
  title?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface AudioQueueState {
  queue: QueuedAudioItem[];
  currentItem: QueuedAudioItem | null;
  currentIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  totalItems: number;
}

export interface AudioQueueControls {
  addToQueue: (item: Omit<QueuedAudioItem, 'id'>) => string;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  playItem: (id: string) => void;
  skipTo: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  setShuffleMode: (enabled: boolean) => void;
}

export interface UseAudioQueueOptions {
  autoPlay?: boolean;
  repeatMode?: 'none' | 'one' | 'all';
  shuffleMode?: boolean;
  onItemStart?: (item: QueuedAudioItem) => void;
  onItemEnd?: (item: QueuedAudioItem) => void;
  onQueueEnd?: () => void;
}

export function useAudioQueue(
  options: UseAudioQueueOptions = {}
): [AudioQueueState, AudioQueueControls] {
  const [queue, setQueue] = useState<QueuedAudioItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [repeatMode, setRepeatModeState] = useState<'none' | 'one' | 'all'>(
    options.repeatMode || 'none'
  );
  const [shuffleMode, setShuffleModeState] = useState(options.shuffleMode || false);
  
  const shuffledIndicesRef = useRef<number[]>([]);
  const currentShuffleIndexRef = useRef(0);

  const currentItem = queue[currentIndex] || null;

  // Audio playback hook for current item
  const [audioState, audioControls] = useAudioPlayback(
    currentItem?.url,
    {
      autoPlay: options.autoPlay && currentIndex >= 0,
      onEnded: handleItemEnded,
      onLoadStart: () => options.onItemStart?.(currentItem!),
    }
  );

  // Generate shuffled indices
  const generateShuffledIndices = useCallback(() => {
    const indices = Array.from({ length: queue.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [queue.length]);

  // Handle item ended
  function handleItemEnded() {
    if (currentItem) {
      options.onItemEnd?.(currentItem);
    }

    if (repeatMode === 'one') {
      // Replay current item
      audioControls.play();
      return;
    }

    // Move to next item
    const hasNext = getNextIndex() !== -1;
    if (hasNext) {
      playNext();
    } else if (repeatMode === 'all' && queue.length > 0) {
      // Restart queue
      const firstIndex = shuffleMode ? shuffledIndicesRef.current[0] : 0;
      setCurrentIndex(firstIndex);
      if (shuffleMode) {
        currentShuffleIndexRef.current = 0;
      }
    } else {
      // Queue ended
      options.onQueueEnd?.();
    }
  }

  // Get next index based on shuffle/repeat mode
  const getNextIndex = useCallback((): number => {
    if (queue.length === 0) return -1;

    if (shuffleMode) {
      const nextShuffleIndex = currentShuffleIndexRef.current + 1;
      if (nextShuffleIndex < shuffledIndicesRef.current.length) {
        return shuffledIndicesRef.current[nextShuffleIndex];
      }
      return -1; // End of shuffled queue
    } else {
      const nextIndex = currentIndex + 1;
      return nextIndex < queue.length ? nextIndex : -1;
    }
  }, [queue.length, shuffleMode, currentIndex]);

  // Get previous index
  const getPreviousIndex = useCallback((): number => {
    if (queue.length === 0) return -1;

    if (shuffleMode) {
      const prevShuffleIndex = currentShuffleIndexRef.current - 1;
      if (prevShuffleIndex >= 0) {
        return shuffledIndicesRef.current[prevShuffleIndex];
      }
      return -1;
    } else {
      const prevIndex = currentIndex - 1;
      return prevIndex >= 0 ? prevIndex : -1;
    }
  }, [queue.length, shuffleMode, currentIndex]);

  // Add item to queue
  const addToQueue = useCallback((item: Omit<QueuedAudioItem, 'id'>): string => {
    const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem: QueuedAudioItem = { ...item, id };
    
    setQueue(prev => {
      const newQueue = [...prev, newItem];
      // Sort by priority if provided
      if (item.priority !== undefined) {
        newQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      }
      return newQueue;
    });

    return id;
  }, []);

  // Remove item from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(item => item.id !== id);
      const removedIndex = prev.findIndex(item => item.id === id);
      
      // Adjust current index if necessary
      if (removedIndex <= currentIndex && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
      
      return newQueue;
    });
  }, [currentIndex]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    audioControls.stop();
  }, [audioControls]);

  // Play next item
  const playNext = useCallback(() => {
    const nextIndex = getNextIndex();
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
      if (shuffleMode) {
        currentShuffleIndexRef.current += 1;
      }
    }
  }, [getNextIndex, shuffleMode]);

  // Play previous item
  const playPrevious = useCallback(() => {
    const prevIndex = getPreviousIndex();
    if (prevIndex !== -1) {
      setCurrentIndex(prevIndex);
      if (shuffleMode) {
        currentShuffleIndexRef.current -= 1;
      }
    }
  }, [getPreviousIndex, shuffleMode]);

  // Play specific item
  const playItem = useCallback((id: string) => {
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      setCurrentIndex(index);
      if (shuffleMode) {
        const shuffleIndex = shuffledIndicesRef.current.findIndex(i => i === index);
        currentShuffleIndexRef.current = shuffleIndex;
      }
    }
  }, [queue, shuffleMode]);

  // Skip to index
  const skipTo = useCallback((index: number) => {
    if (index >= 0 && index < queue.length) {
      setCurrentIndex(index);
      if (shuffleMode) {
        const shuffleIndex = shuffledIndicesRef.current.findIndex(i => i === index);
        currentShuffleIndexRef.current = shuffleIndex;
      }
    }
  }, [queue.length, shuffleMode]);

  // Reorder queue
  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setQueue(prev => {
      const newQueue = [...prev];
      const [movedItem] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedItem);
      
      // Adjust current index
      if (currentIndex === fromIndex) {
        setCurrentIndex(toIndex);
      } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
        setCurrentIndex(prev => prev - 1);
      } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
        setCurrentIndex(prev => prev + 1);
      }
      
      return newQueue;
    });
  }, [currentIndex]);

  // Set repeat mode
  const setRepeatMode = useCallback((mode: 'none' | 'one' | 'all') => {
    setRepeatModeState(mode);
  }, []);

  // Set shuffle mode
  const setShuffleMode = useCallback((enabled: boolean) => {
    setShuffleModeState(enabled);
    if (enabled && queue.length > 0) {
      shuffledIndicesRef.current = generateShuffledIndices();
      // Find current item in shuffle
      const currentShuffleIndex = shuffledIndicesRef.current.findIndex(i => i === currentIndex);
      currentShuffleIndexRef.current = currentShuffleIndex >= 0 ? currentShuffleIndex : 0;
    }
  }, [queue.length, currentIndex, generateShuffledIndices]);

  // Update shuffle indices when queue changes
  useEffect(() => {
    if (shuffleMode && queue.length > 0) {
      shuffledIndicesRef.current = generateShuffledIndices();
    }
  }, [queue.length, shuffleMode, generateShuffledIndices]);

  const state: AudioQueueState = {
    queue,
    currentItem,
    currentIndex,
    isPlaying: audioState.isPlaying,
    isLoading: audioState.isLoading,
    totalItems: queue.length,
  };

  const controls: AudioQueueControls = {
    addToQueue,
    removeFromQueue,
    clearQueue,
    playNext,
    playPrevious,
    playItem,
    skipTo,
    reorderQueue,
    setRepeatMode,
    setShuffleMode,
  };

  return [state, controls];
}

export default useAudioQueue;
